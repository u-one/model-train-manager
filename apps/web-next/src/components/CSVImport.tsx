'use client'

import { useState } from 'react'
import CSVPreview from './CSVPreview'

interface ImportResult {
  totalRows: number
  successCount: number
  linkedCount?: number      // 製品リンク数（保有車両インポートのみ）
  independentCount?: number // 独立車両数（保有車両インポートのみ）
  errorCount: number
  errors: string[]
}

interface CSVImportProps {
  title: string
  endpoint: string
  onSuccess?: () => void
  enableChunkedUpload?: boolean  // チャンクアップロード有効化フラグ
  chunkSize?: number             // チャンクサイズ（デフォルト30）
}

export default function CSVImport({
  title,
  endpoint,
  onSuccess,
  enableChunkedUpload = false,
  chunkSize = 30
}: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState<string>('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [skippedRows, setSkippedRows] = useState<number[]>([])

  // チャンクアップロード用の進捗状態
  const [uploadProgress, setUploadProgress] = useState<{
    current: number
    total: number
    percentage: number
  } | null>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('CSVファイルを選択してください')
        return
      }

      try {
        const content = await selectedFile.text()
        setFile(selectedFile)
        setCsvContent(content)
        setError(null)
        setResult(null)
        setParseErrors([])
        setSkippedRows([])
      } catch {
        setError('ファイルの読み込みに失敗しました')
      }
    }
  }

  // CSVを行単位で分割する関数
  const splitCSVIntoChunks = (content: string, size: number): string[] => {
    const lines = content.split('\n')
    const header = lines[0]
    const dataLines = lines.slice(1).filter(line => line.trim())

    const chunks: string[] = []
    for (let i = 0; i < dataLines.length; i += size) {
      const chunkLines = dataLines.slice(i, i + size)
      const chunkCSV = [header, ...chunkLines].join('\n')
      chunks.push(chunkCSV)
    }

    return chunks
  }

  // チャンクアップロード処理
  const handleChunkedImport = async () => {
    if (!csvContent) {
      setError('CSVデータが読み込まれていません')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)
    setUploadProgress(null)

    try {
      const chunks = splitCSVIntoChunks(csvContent, chunkSize)
      console.log(`CSVを${chunks.length}個のチャンクに分割しました（各${chunkSize}行）`)

      const aggregatedResult: ImportResult = {
        totalRows: 0,
        successCount: 0,
        linkedCount: 0,
        independentCount: 0,
        errorCount: 0,
        errors: []
      }

      // チャンクを順次アップロード
      for (let i = 0; i < chunks.length; i++) {
        setUploadProgress({
          current: i + 1,
          total: chunks.length,
          percentage: Math.round(((i + 1) / chunks.length) * 100)
        })

        const chunkBlob = new Blob([chunks[i]], { type: 'text/csv' })
        const chunkFile = new File([chunkBlob], `chunk_${i + 1}.csv`, { type: 'text/csv' })

        const formData = new FormData()
        formData.append('file', chunkFile)

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          // エラーがあっても続行（部分的な成功を許容）
          console.error(`チャンク ${i + 1} でエラー:`, data.error)
          if (data.details) {
            aggregatedResult.errors.push(...data.details.map((e: string) => `[チャンク${i + 1}] ${e}`))
          } else {
            aggregatedResult.errors.push(`[チャンク${i + 1}] ${data.error || 'インポート失敗'}`)
          }
          aggregatedResult.errorCount += chunkSize // 推定エラー数
          continue
        }

        // 結果を集計
        const chunkResult = data.results
        aggregatedResult.totalRows += chunkResult.totalRows || 0
        aggregatedResult.successCount += chunkResult.successCount || 0
        aggregatedResult.linkedCount = (aggregatedResult.linkedCount || 0) + (chunkResult.linkedCount || 0)
        aggregatedResult.independentCount = (aggregatedResult.independentCount || 0) + (chunkResult.independentCount || 0)
        aggregatedResult.errorCount += chunkResult.errorCount || 0
        if (chunkResult.errors && chunkResult.errors.length > 0) {
          aggregatedResult.errors.push(...chunkResult.errors.map((e: string) => `[チャンク${i + 1}] ${e}`))
        }

        console.log(`チャンク ${i + 1}/${chunks.length} 完了`)
      }

      setResult(aggregatedResult)
      setUploadProgress(null)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました')
      console.error('Chunked import error:', err)
      setUploadProgress(null)
    } finally {
      setImporting(false)
    }
  }

  // 通常のインポート処理
  const handleNormalImport = async () => {
    if (!file) {
      setError('ファイルを選択してください')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'インポートに失敗しました')
        if (data.details) {
          setParseErrors(data.details)
          setSkippedRows(data.skippedRows || [])
          console.error('Import details:', data.details)
        }
        return
      }

      setResult(data.results)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました')
      console.error('Import error:', err)
    } finally {
      setImporting(false)
    }
  }

  const handleImport = () => {
    if (enableChunkedUpload) {
      return handleChunkedImport()
    } else {
      return handleNormalImport()
    }
  }

  const handleReset = () => {
    setFile(null)
    setCsvContent('')
    setResult(null)
    setError(null)
    setParseErrors([])
    setSkippedRows([])
    const input = document.getElementById('csv-file-input') as HTMLInputElement
    if (input) {
      input.value = ''
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="csv-file-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            CSVファイルを選択
          </label>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <div className="mt-1">
              <p className="text-sm text-gray-600">
                選択されたファイル: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
              {csvContent && (
                <div className="mt-2">
                  <CSVPreview csvContent={csvContent} errors={[]} skippedRows={[]} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'インポート中...' : 'インポート実行'}
          </button>
          <button
            onClick={handleReset}
            disabled={importing}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            リセット
          </button>
        </div>

        {/* 進捗バー */}
        {uploadProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                アップロード中: {uploadProgress.current} / {uploadProgress.total} チャンク
              </span>
              <span className="text-sm font-medium text-blue-900">
                {uploadProgress.percentage}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.percentage}%` }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-blue-700">
              ※ 各チャンクを順次アップロードしています。しばらくお待ちください。
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 w-full">
                <h3 className="text-sm font-medium text-red-800">エラー</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                {csvContent && parseErrors.length > 0 && (
                  <CSVPreview csvContent={csvContent} errors={parseErrors} skippedRows={skippedRows} />
                )}
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">インポート完了</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>総行数: {result.totalRows}行</p>
                  <p className="font-medium">✅ 成功: {result.successCount}行</p>
                  {(result.linkedCount !== undefined || result.independentCount !== undefined) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {result.linkedCount !== undefined && result.linkedCount > 0 && (
                        <p className="text-xs">📦 製品リンク: {result.linkedCount}件</p>
                      )}
                      {result.independentCount !== undefined && result.independentCount > 0 && (
                        <p className="text-xs">📝 独立車両: {result.independentCount}件</p>
                      )}
                    </div>
                  )}
                  {result.errorCount > 0 && (
                    <>
                      <p className="mt-2 font-medium">❌ エラー: {result.errorCount}行</p>
                      <div className="mt-2">
                        <details className="cursor-pointer">
                          <summary className="font-medium">エラー詳細</summary>
                          <ul className="mt-1 list-disc list-inside">
                            {result.errors.map((error, index) => (
                              <li key={index} className="text-xs">{error}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    </>
                  )}
                  {result.independentCount !== undefined && result.independentCount > 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800">
                        ⚠️ 注意: {result.independentCount}件が独立車両として登録されました。<br />
                        保有車両一覧から製品情報を作成できます。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
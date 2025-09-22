'use client'

import { useState } from 'react'
import { parseCSV } from '@/lib/csv-parser'

interface CSVPreviewProps {
  csvContent: string
  errors: string[]
  skippedRows: number[]
}


export default function CSVPreview({ csvContent, errors, skippedRows }: CSVPreviewProps) {
  const [showPreview, setShowPreview] = useState(false)

  if (!showPreview) {
    return (
      <button
        onClick={() => setShowPreview(true)}
        className="text-blue-600 hover:text-blue-800 text-sm underline"
      >
        CSVプレビューを表示
      </button>
    )
  }

  const rows = parseCSV(csvContent)

  // エラー情報を行ごとにマッピング
  const rowErrors = new Map<number, string[]>()
  errors.forEach(error => {
    const match = error.match(/行 (\d+):(.+)/)
    if (match) {
      const rowNum = parseInt(match[1])
      const message = match[2].trim()
      if (!rowErrors.has(rowNum)) {
        rowErrors.set(rowNum, [])
      }
      rowErrors.get(rowNum)!.push(message)
    }
  })

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium text-gray-900">CSVプレビュー</h4>
        <button
          onClick={() => setShowPreview(false)}
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          閉じる
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-700 border-r">行</th>
                {rows[0]?.map((_, colIndex) => (
                  <th key={colIndex} className="px-2 py-1 text-left font-medium text-gray-700 border-r">
                    {colIndex + 1}
                  </th>
                ))}
                <th className="px-2 py-1 text-left font-medium text-gray-700">エラー</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const rowNum = rowIndex + 1
                const hasError = rowErrors.has(rowNum) || skippedRows.includes(rowNum)
                const rowErrorMessages = rowErrors.get(rowNum) || []

                return (
                  <tr
                    key={rowIndex}
                    className={`${hasError ? 'bg-red-50' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                  >
                    <td className={`px-2 py-1 border-r font-medium ${hasError ? 'text-red-700' : 'text-gray-600'}`}>
                      {rowNum}
                    </td>
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-2 py-1 border-r max-w-32 truncate"
                        title={cell || '(空)'}
                      >
                        {cell || <span className="text-gray-400 italic">(空)</span>}
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      {rowErrorMessages.length > 0 && (
                        <div className="text-red-600 text-xs">
                          {rowErrorMessages.map((msg, index) => (
                            <div key={index} className="mb-1">
                              {msg}
                            </div>
                          ))}
                        </div>
                      )}
                      {skippedRows.includes(rowNum) && rowErrorMessages.length === 0 && (
                        <div className="text-orange-600 text-xs">スキップされた行</div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-600">
        <p>総行数: {rows.length}行</p>
        {errors.length > 0 && <p className="text-red-600">エラー行: {errors.length}件</p>}
        {skippedRows.length > 0 && <p className="text-orange-600">スキップ行: {skippedRows.length}件</p>}
      </div>
    </div>
  )
}
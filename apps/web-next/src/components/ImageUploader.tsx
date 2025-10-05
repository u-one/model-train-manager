'use client'

import { useState, useCallback } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'

interface ImageUploaderProps {
  /** エンティティタイプ */
  entityType: 'owned-vehicle' | 'product'
  /** エンティティID */
  entityId: string
  /** 既存画像URL配列 */
  currentImages?: string[]
  /** 複数選択可否 */
  multiple?: boolean
  /** 最大ファイル数 */
  maxFiles?: number
  /** アップロード完了コールバック */
  onUploadComplete?: (urls: string[]) => void
  /** 削除コールバック */
  onDelete?: (url: string) => void
}

export default function ImageUploader({
  entityType,
  entityId,
  currentImages = [],
  multiple = true,
  maxFiles = 10,
  onUploadComplete,
  onDelete
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const uploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setError(null)
    setUploading(true)

    try {
      const filesToUpload = Array.from(files).slice(0, multiple ? maxFiles - currentImages.length : 1)
      const uploadedUrls: string[] = []

      for (const file of filesToUpload) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('entityType', entityType)
        formData.append('entityId', entityId)

        const response = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'アップロードに失敗しました')
        }

        const result = await response.json()
        uploadedUrls.push(result.url)
      }

      if (onUploadComplete) {
        onUploadComplete(uploadedUrls)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }, [entityType, entityId, multiple, maxFiles, currentImages.length, onUploadComplete])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(e.target.files)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    uploadFiles(e.dataTransfer.files)
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDelete = async (url: string) => {
    if (!confirm('この画像を削除しますか？')) return

    try {
      // URLからキーを抽出（Vercel Blobの場合はURL全体を使用）
      const response = await fetch(`/api/images/${encodeURIComponent(url)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      if (onDelete) {
        onDelete(url)
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const canUploadMore = multiple ? currentImages.length < maxFiles : currentImages.length === 0

  return (
    <div className="space-y-4">
      {/* アップロードエリア */}
      {canUploadMore && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple={multiple}
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {dragActive
              ? 'ファイルをドロップしてアップロード'
              : 'クリックまたはドラッグ&ドロップで画像をアップロード'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            JPEG, PNG, WebP, GIF (最大5MB)
          </p>
          {multiple && (
            <p className="mt-1 text-xs text-gray-500">
              残り {maxFiles - currentImages.length} 枚アップロード可能
            </p>
          )}
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* アップロード中 */}
      {uploading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">アップロード中...</p>
        </div>
      )}

      {/* 画像プレビュー */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentImages.map((url, index) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`画像 ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => handleDelete(url)}
                className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

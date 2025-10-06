'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageGalleryProps {
  /** 画像URL配列 */
  images: string[]
  /** 編集モード */
  editable?: boolean
  /** 削除コールバック */
  onDelete?: (url: string) => void
}

export default function ImageGallery({
  images,
  editable = false,
  onDelete
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (images.length === 0) {
    return null
  }

  const handleImageClick = (index: number) => {
    setSelectedIndex(index)
  }

  const handleClose = () => {
    setSelectedIndex(null)
  }

  const handlePrevious = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex - 1 + images.length) % images.length)
  }

  const handleNext = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex + 1) % images.length)
  }

  const handleDelete = async (url: string) => {
    if (!confirm('この画像を削除しますか？')) return
    if (onDelete) {
      onDelete(url)
    }
    if (selectedIndex !== null) {
      setSelectedIndex(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return

    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'ArrowLeft') {
      handlePrevious()
    } else if (e.key === 'ArrowRight') {
      handleNext()
    }
  }

  return (
    <>
      {/* 画像グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((url, index) => (
          <div key={url} className="relative group cursor-pointer">
            <img
              src={url}
              alt={`画像 ${index + 1}`}
              className="w-full h-64 object-contain bg-gray-100 rounded-lg hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(index)}
            />
            {editable && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(url)
                }}
                className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* モーダル（拡大表示） */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={handleClose}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* 閉じるボタン */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {/* 前へボタン */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrevious()
              }}
              className="absolute left-4 text-white hover:text-gray-300 z-10"
            >
              <ChevronLeft className="h-12 w-12" />
            </button>
          )}

          {/* 画像 */}
          <div
            className="max-w-7xl max-h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedIndex]}
              alt={`画像 ${selectedIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain mx-auto"
            />
            <div className="text-center mt-4">
              <p className="text-white text-sm">
                {selectedIndex + 1} / {images.length}
              </p>
            </div>
          </div>

          {/* 次へボタン */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              className="absolute right-4 text-white hover:text-gray-300 z-10"
            >
              <ChevronRight className="h-12 w-12" />
            </button>
          )}
        </div>
      )}
    </>
  )
}

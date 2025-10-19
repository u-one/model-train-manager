interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex justify-center mt-8">
      <div className="flex items-center space-x-1">
        {/* 最初のページ */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          ««
        </button>

        {/* 前のページ */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>

        {/* ページ番号ボタン */}
        {(() => {
          const pageButtons = []

          // 表示するページ番号の範囲を計算
          const startPage = Math.max(1, currentPage - 2)
          const endPage = Math.min(totalPages, currentPage + 2)

          // 最初のページを常に表示
          if (startPage > 1) {
            pageButtons.push(
              <button
                key={1}
                onClick={() => onPageChange(1)}
                className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                1
              </button>
            )
            if (startPage > 2) {
              pageButtons.push(
                <span key="ellipsis-start" className="px-2 text-gray-500">...</span>
              )
            }
          }

          // 中間のページ番号
          for (let i = startPage; i <= endPage; i++) {
            pageButtons.push(
              <button
                key={i}
                onClick={() => onPageChange(i)}
                className={`px-3 py-2 border rounded text-sm transition-colors ${
                  i === currentPage
                    ? 'bg-blue-600 text-white border-blue-600 font-medium'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                {i}
              </button>
            )
          }

          // 最後のページを常に表示
          if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
              pageButtons.push(
                <span key="ellipsis-end" className="px-2 text-gray-500">...</span>
              )
            }
            pageButtons.push(
              <button
                key={totalPages}
                onClick={() => onPageChange(totalPages)}
                className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                {totalPages}
              </button>
            )
          }

          return pageButtons
        })()}

        {/* 次のページ */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          ›
        </button>

        {/* 最後のページ */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          »»
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string | React.ReactNode
  confirmText: string
  confirmPlaceholder?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  confirmButtonText?: string
  cancelButtonText?: string
  isProcessing?: boolean
  processingText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  confirmPlaceholder,
  onConfirm,
  onCancel,
  confirmButtonText = '実行',
  cancelButtonText = 'キャンセル',
  isProcessing = false,
  processingText = '処理中...',
  variant = 'danger'
}: ConfirmModalProps) {
  const [inputText, setInputText] = useState('')

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (inputText !== confirmText) {
      alert(`「${confirmText}」と入力してください`)
      return
    }
    await onConfirm()
  }

  const handleCancel = () => {
    setInputText('')
    onCancel()
  }

  const variantStyles = {
    danger: {
      title: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
      focusRing: 'focus:ring-red-500 focus:border-red-500'
    },
    warning: {
      title: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700',
      focusRing: 'focus:ring-orange-500 focus:border-orange-500'
    },
    info: {
      title: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
      focusRing: 'focus:ring-blue-500 focus:border-blue-500'
    }
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className={`text-xl font-bold mb-4 ${styles.title}`}>
          {title}
        </h2>

        <div className="mb-4 space-y-2">
          {typeof message === 'string' ? (
            <p className="text-gray-700">{message}</p>
          ) : (
            message
          )}
        </div>

        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            続行するには、下のボックスに「<span className="font-mono font-bold">{confirmText}</span>」と入力してください。
          </p>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={confirmPlaceholder || confirmText}
            className={`w-full border border-gray-300 rounded px-3 py-2 ${styles.focusRing}`}
            disabled={isProcessing}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={isProcessing}
          >
            {cancelButtonText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={inputText !== confirmText || isProcessing}
            className={`px-4 py-2 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
          >
            {isProcessing ? processingText : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}

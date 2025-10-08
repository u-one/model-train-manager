'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getCategoryLabel, getCategoryColor } from '@/constants/tags'

interface Tag {
  id: number
  name: string
  category: string
  description?: string
}

interface TagCategory {
  category: string
  count: number
}

interface BulkTagEditDialogProps {
  selectedProductIds: number[]
  onClose: () => void
  onComplete: () => void
}

type EditMode = 'add' | 'replace' | 'remove'

export default function BulkTagEditDialog({
  selectedProductIds,
  onClose,
  onComplete
}: BulkTagEditDialogProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [categories, setCategories] = useState<TagCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [mode, setMode] = useState<EditMode>('add')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/tags?limit=1000')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setTags(data.tags || [])
      setCategories(data.categories || [])

      // デフォルトで全カテゴリを展開
      if (data.categories && data.categories.length > 0) {
        setExpandedCategories(new Set(data.categories.map((c: TagCategory) => c.category)))
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
      setTags([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleTagToggle = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId))
    } else {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getTagsByCategory = (category: string) => {
    return tags.filter(tag => tag.category === category)
  }

  const handleApply = async () => {
    if (selectedTags.length === 0) {
      alert('タグを選択してください')
      return
    }

    const confirmMessage =
      mode === 'add'
        ? `${selectedProductIds.length}件の製品に${selectedTags.length}個のタグを追加します。よろしいですか？`
        : mode === 'replace'
        ? `${selectedProductIds.length}件の製品のタグを${selectedTags.length}個のタグで上書きします。既存のタグは削除されます。よろしいですか？`
        : `${selectedProductIds.length}件の製品から${selectedTags.length}個のタグを削除します。よろしいですか？`

    if (!confirm(confirmMessage)) {
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/products/bulk-update-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productIds: selectedProductIds,
          mode,
          tagIds: selectedTags
        })
      })

      const result = await response.json()

      if (response.ok) {
        const modeLabel = mode === 'add' ? '追加' : mode === 'replace' ? '上書き' : '削除'
        alert(`${result.updatedCount}件の製品のタグを${modeLabel}しました`)
        onComplete()
        onClose()
      } else {
        alert(`エラー: ${result.error}`)
      }
    } catch (error) {
      console.error('Bulk tag update error:', error)
      alert('タグ更新中にエラーが発生しました')
    } finally {
      setProcessing(false)
    }
  }

  const getModeDescription = () => {
    switch (mode) {
      case 'add':
        return '既存のタグを保持したまま、選択したタグを追加します'
      case 'replace':
        return '既存のタグを全て削除し、選択したタグのみに設定します'
      case 'remove':
        return '選択したタグのみを削除します（他のタグは保持）'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            一括タグ編集 ({selectedProductIds.length}件)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-4 space-y-6">
          {/* モード選択 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">編集モード</h3>
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="mode"
                  value="add"
                  checked={mode === 'add'}
                  onChange={(e) => setMode(e.target.value as EditMode)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">追加</div>
                  <div className="text-sm text-gray-600">既存のタグを保持したまま、選択したタグを追加します</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={(e) => setMode(e.target.value as EditMode)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">上書き</div>
                  <div className="text-sm text-gray-600">既存のタグを全て削除し、選択したタグのみに設定します</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="mode"
                  value="remove"
                  checked={mode === 'remove'}
                  onChange={(e) => setMode(e.target.value as EditMode)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">削除</div>
                  <div className="text-sm text-gray-600">選択したタグのみを削除します（他のタグは保持）</div>
                </div>
              </label>
            </div>
          </div>

          {/* タグ選択 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">タグ選択</h3>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  クリア ({selectedTags.length})
                </button>
              )}
            </div>

            {/* 選択中のタグ表示 */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 p-3 bg-gray-50 border border-gray-200 rounded mb-3">
                {tags.filter(tag => selectedTags.includes(tag.id)).map(tag => (
                  <span
                    key={tag.id}
                    className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${getCategoryColor(tag.category)}`}
                  >
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className="hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* カテゴリ別タグ選択 */}
            {loading ? (
              <div className="p-4 border border-gray-300 rounded-md bg-gray-50">
                <p className="text-sm text-gray-500">タグを読み込み中...</p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-md divide-y divide-gray-200">
                {categories.map((categoryInfo) => {
                  const categoryTags = getTagsByCategory(categoryInfo.category)
                  const isExpanded = expandedCategories.has(categoryInfo.category)
                  const selectedCount = categoryTags.filter(tag => selectedTags.includes(tag.id)).length

                  return (
                    <div key={categoryInfo.category}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(categoryInfo.category)}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {getCategoryLabel(categoryInfo.category)}
                          </span>
                          {selectedCount > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                              {selectedCount}選択中
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${
                            isExpanded ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-4 py-2 bg-gray-50 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {categoryTags.map(tag => (
                            <label
                              key={tag.id}
                              className="flex items-center space-x-2 py-1 px-2 hover:bg-white rounded cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTags.includes(tag.id)}
                                onChange={() => handleTagToggle(tag.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-gray-700">{tag.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* プレビュー */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="text-sm font-medium text-blue-900 mb-2">適用内容</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 対象製品: {selectedProductIds.length}件</li>
              <li>• 選択タグ: {selectedTags.length}個</li>
              <li>• モード: {mode === 'add' ? '追加' : mode === 'replace' ? '上書き' : '削除'}</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">{getModeDescription()}</p>
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            disabled={processing || selectedTags.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? '処理中...' : `${selectedProductIds.length}件に適用`}
          </button>
        </div>
      </div>
    </div>
  )
}

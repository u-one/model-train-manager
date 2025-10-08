'use client'

import { useState, useEffect } from 'react'

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

interface TagFilterProps {
  selectedTags: number[]
  operator: 'AND' | 'OR'
  noTagsCategories: string[]
  onTagsChange: (tags: number[]) => void
  onOperatorChange: (operator: 'AND' | 'OR') => void
  onNoTagsCategoriesChange: (categories: string[]) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  vehicle_type: '車種',
  company: '運営会社',
  feature: '特徴・仕様',
  era: '時代・塗装'
}

export default function TagFilter({
  selectedTags,
  operator,
  noTagsCategories,
  onTagsChange,
  onOperatorChange,
  onNoTagsCategoriesChange
}: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [categories, setCategories] = useState<TagCategory[]>([])
  const [loading, setLoading] = useState(true)
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
    // 該当タグのカテゴリを取得
    const tag = tags.find(t => t.id === tagId)
    if (tag && noTagsCategories.includes(tag.category)) {
      // そのカテゴリの「なし」が選択されている場合は解除
      onNoTagsCategoriesChange(noTagsCategories.filter(cat => cat !== tag.category))
    }

    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId))
    } else {
      onTagsChange([...selectedTags, tagId])
    }
  }

  const handleClearAll = () => {
    onTagsChange([])
    onNoTagsCategoriesChange([])
  }

  const handleCategoryNoTagsToggle = (category: string) => {
    if (noTagsCategories.includes(category)) {
      // 該当カテゴリの「なし」を解除
      onNoTagsCategoriesChange(noTagsCategories.filter(cat => cat !== category))
    } else {
      // 該当カテゴリの「なし」を追加し、該当カテゴリのタグ選択を解除
      onNoTagsCategoriesChange([...noTagsCategories, category])
      const categoryTagIds = tags.filter(tag => tag.category === category).map(tag => tag.id)
      onTagsChange(selectedTags.filter(tagId => !categoryTagIds.includes(tagId)))
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

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-sm text-gray-500">タグを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">タグで絞り込み</h3>
        <div className="flex items-center space-x-2">
          {/* AND/OR切り替え */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
            <button
              onClick={() => onOperatorChange('OR')}
              className={`px-3 py-1 text-xs rounded ${
                operator === 'OR'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              OR
            </button>
            <button
              onClick={() => onOperatorChange('AND')}
              className={`px-3 py-1 text-xs rounded ${
                operator === 'AND'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              AND
            </button>
          </div>

          {/* クリアボタン */}
          {(selectedTags.length > 0 || noTagsCategories.length > 0) && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              クリア ({selectedTags.length + noTagsCategories.length})
            </button>
          )}
        </div>
      </div>

      {/* カテゴリ別タグ一覧 */}
      <div className="space-y-3">
        {categories.map((categoryInfo) => {
          const categoryTags = getTagsByCategory(categoryInfo.category)
          const isExpanded = expandedCategories.has(categoryInfo.category)
          const selectedCount = categoryTags.filter(tag => selectedTags.includes(tag.id)).length
          const hasNoTagsSelected = noTagsCategories.includes(categoryInfo.category)
          const isDisabled = hasNoTagsSelected

          return (
            <div key={categoryInfo.category} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
              <button
                onClick={() => toggleCategory(categoryInfo.category)}
                className="w-full flex items-center justify-between text-left py-2 hover:bg-gray-50 rounded px-2"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {CATEGORY_LABELS[categoryInfo.category] || categoryInfo.category}
                  </span>
                  {hasNoTagsSelected && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">
                      なし
                    </span>
                  )}
                  {selectedCount > 0 && !hasNoTagsSelected && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                      {selectedCount}
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
                <div className="mt-2 space-y-1 px-2">
                  {/* カテゴリ別「なし」オプション */}
                  <label className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-100 mb-2 pb-2">
                    <input
                      type="checkbox"
                      checked={hasNoTagsSelected}
                      onChange={() => handleCategoryNoTagsToggle(categoryInfo.category)}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 font-medium">なし</span>
                    <span className="text-xs text-gray-500">
                      （{CATEGORY_LABELS[categoryInfo.category]}が未設定の製品）
                    </span>
                  </label>

                  {/* タグ一覧 */}
                  <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
                    {categoryTags.map(tag => (
                      <label
                        key={tag.id}
                        className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.id)}
                          onChange={() => handleTagToggle(tag.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ヘルプテキスト */}
      {noTagsCategories.length > 0 && (
        <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            選択カテゴリでタグが未設定の製品のみを表示中
          </p>
        </div>
      )}
      {noTagsCategories.length === 0 && selectedTags.length > 1 && (
        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-800">
            {operator === 'OR'
              ? '選択したタグのいずれかに一致する製品を表示'
              : '選択したタグすべてに一致する製品を表示'}
          </p>
        </div>
      )}
    </div>
  )
}

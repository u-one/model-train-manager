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

interface ProductFormTagSelectorProps {
  selectedTags: number[]
  onTagsChange: (tags: number[]) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  vehicle_type: '車種',
  company: '運営会社',
  feature: '特徴・仕様',
  era: '時代・塗装'
}

const TAG_CATEGORY_COLORS: Record<string, string> = {
  vehicle_type: 'bg-blue-100 text-blue-800',
  company: 'bg-green-100 text-green-800',
  feature: 'bg-purple-100 text-purple-800',
  era: 'bg-orange-100 text-orange-800'
}

export default function ProductFormTagSelector({
  selectedTags,
  onTagsChange
}: ProductFormTagSelectorProps) {
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
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId))
    } else {
      onTagsChange([...selectedTags, tagId])
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
      <div className="p-4 border border-gray-300 rounded-md bg-gray-50">
        <p className="text-sm text-gray-500">タグを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">タグ</h3>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={() => onTagsChange([])}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            クリア ({selectedTags.length})
          </button>
        )}
      </div>

      {/* 選択中のタグ表示 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-200 rounded">
          {tags.filter(tag => selectedTags.includes(tag.id)).map(tag => (
            <span
              key={tag.id}
              className={`text-xs px-2 py-1 rounded flex items-center space-x-1 ${TAG_CATEGORY_COLORS[tag.category] || 'bg-gray-100 text-gray-800'}`}
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
                    {CATEGORY_LABELS[categoryInfo.category] || categoryInfo.category}
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
                <div className="px-4 py-2 bg-gray-50 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
    </div>
  )
}

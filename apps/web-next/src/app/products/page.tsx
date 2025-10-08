'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ProductCard from '@/components/ProductCard'
import ProductListItem from '@/components/ProductListItem'
import ViewModeToggle from '@/components/ViewModeToggle'
import TagFilter from '@/components/TagFilter'
import BulkTagEditDialog from '@/components/BulkTagEditDialog'
import { useViewMode } from '@/hooks/useViewMode'
import { Tags } from 'lucide-react'

interface Tag {
  id: number
  name: string
  category: string
}

interface ProductTag {
  tag: Tag
}

interface Product {
  id: number
  brand: string
  productCode: string | null
  name: string
  type: string
  priceIncludingTax: number | null
  imageUrls: string[]
  _count?: { ownedVehicles: number }
  productTags?: ProductTag[]
}

interface ProductsResponse {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ProductsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [type, setType] = useState('')
  const [showSetSingle, setShowSetSingle] = useState(false) // セット単品デフォルト非表示
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [tagOperator, setTagOperator] = useState<'AND' | 'OR'>('OR')
  const [noTagsCategories, setNoTagsCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<ProductsResponse['pagination'] | null>(null)
  const { viewMode, setViewMode } = useViewMode()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (brand) params.append('brand', brand)
      if (type) params.append('type', type)
      if (!showSetSingle) params.append('excludeSetSingle', 'true') // セット単品除外
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','))
        params.append('tag_operator', tagOperator)
      }
      if (noTagsCategories.length > 0) {
        params.append('no_tags_categories', noTagsCategories.join(','))
      }
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)
      params.append('page', page.toString())
      params.append('limit', '100')

      const response = await fetch(`/api/products?${params}`)
      const data: ProductsResponse = await response.json()


      setProducts(data.products)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }, [search, brand, type, showSetSingle, selectedTags, tagOperator, noTagsCategories, sortBy, sortOrder, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])


  const handleProductClick = (productId: number) => {
    router.push(`/products/${productId}`)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map(p => p.id)))
    }
  }

  const handleSelectProduct = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkTagComplete = () => {
    setSelectedIds(new Set())
    fetchProducts()
  }

  const hasActiveFilters = search || brand || type || showSetSingle || selectedTags.length > 0 || noTagsCategories.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* モバイル用フィルタボタン */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4">
        <button
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
          </svg>
          フィルタ {hasActiveFilters && <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">●</span>}
        </button>
      </div>

      <div className="flex">
        {/* サイドバー（フィルタ） */}
        <aside className={`
          w-72 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto
          lg:block
          ${isMobileFilterOpen ? 'block' : 'hidden'}
          lg:relative absolute top-0 left-0 h-full z-10 lg:z-auto
        `}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">検索・フィルタ</h3>

        {/* 検索ボックス */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="製品名、メーカー、品番で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* メーカーフィルタ */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">メーカー</div>
          <div className="space-y-2">
            {['KATO', 'TOMIX', 'マイクロエース', 'グリーンマックス', 'モデモ'].map((b) => (
              <label key={b} className="flex items-center text-sm">
                <input
                  type="radio"
                  name="brand"
                  checked={brand === b}
                  onChange={() => setBrand(brand === b ? '' : b)}
                  className="mr-2"
                />
                {b}
              </label>
            ))}
          </div>
        </div>

        {/* 種別フィルタ */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">種別</div>
          <div className="space-y-2">
            {['セット', '単品', 'セット単品'].map((t) => (
              <label key={t} className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={type === t || (t === 'セット単品' && showSetSingle)}
                  onChange={() => {
                    if (t === 'セット単品') {
                      setShowSetSingle(!showSetSingle)
                    } else {
                      setType(type === t ? '' : t)
                    }
                  }}
                  className="mr-2"
                />
                {t}
              </label>
            ))}
          </div>
        </div>

        {/* タグフィルタ */}
        <div className="mb-6">
          <TagFilter
            selectedTags={selectedTags}
            operator={tagOperator}
            noTagsCategories={noTagsCategories}
            onTagsChange={setSelectedTags}
            onOperatorChange={setTagOperator}
            onNoTagsCategoriesChange={setNoTagsCategories}
          />
        </div>

        {/* フィルタリセット */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch('')
              setBrand('')
              setType('')
              setShowSetSingle(false)
              setSelectedTags([])
              setNoTagsCategories([])
              setPage(1)
            }}
            className="w-full px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            フィルタをクリア
          </button>
        )}

        {/* モバイル用閉じるボタン */}
        <div className="lg:hidden mt-6">
          <button
            onClick={() => setIsMobileFilterOpen(false)}
            className="w-full px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            フィルタを閉じる
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 p-3 lg:p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">製品一覧</h1>
              {pagination && (
                <div className="text-sm text-gray-600 mt-1">
                  {pagination.total}件中 {(page - 1) * pagination.limit + 1}-{Math.min(page * pagination.limit, pagination.total)}件を表示
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* ソート選択 */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700 whitespace-nowrap">並び順:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 sm:flex-none"
                >
                  <option value="createdAt">登録順</option>
                  <option value="name">名称</option>
                  <option value="brandCode">メーカー＋品番</option>
                  <option value="category">分類順</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  title={sortOrder === 'asc' ? '昇順' : '降順'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 表示形式切り替え */}
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />

                {/* ログイン時のボタン群 */}
                {session && (
                  <>
                    <button
                      onClick={() => router.push('/products/new')}
                      className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 whitespace-nowrap"
                    >
                      製品追加
                    </button>
                    <button
                      onClick={() => router.push('/import')}
                      className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 whitespace-nowrap"
                    >
                      CSVインポート
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 一括操作ツールバー */}
        {session && products.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === products.length && products.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  全選択 ({selectedIds.size > 0 ? `${selectedIds.size}件選択中` : ''})
                </span>
              </label>
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowBulkTagDialog(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Tags className="w-4 h-4" />
                <span>一括タグ編集</span>
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">製品が見つかりませんでした</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center hover:bg-gray-50 transition-colors"
                      >
                        {session && (
                          <div className="pl-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={(e) => handleSelectProduct(product.id, e)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </div>
                        )}
                        <div className="flex-1 cursor-pointer" onClick={() => handleProductClick(product.id)}>
                          <ProductListItem
                            product={product}
                            onClick={() => {}}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500">製品が見つかりませんでした</p>
                  </div>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="relative">
                      {session && (
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={(e) => handleSelectProduct(product.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded shadow-sm"
                          />
                        </div>
                      )}
                      <ProductCard
                        product={product}
                        onClick={() => handleProductClick(product.id)}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ページネーション */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    ‹
                  </button>
                  <span className="px-4 py-2 text-gray-900 font-medium">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 一括タグ編集ダイアログ */}
      {showBulkTagDialog && (
        <BulkTagEditDialog
          selectedProductIds={Array.from(selectedIds)}
          onClose={() => setShowBulkTagDialog(false)}
          onComplete={handleBulkTagComplete}
        />
      )}
      </div>
    </div>
  )
}
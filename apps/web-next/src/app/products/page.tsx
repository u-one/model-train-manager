'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ProductCard from '@/components/ProductCard'
import ProductListItem from '@/components/ProductListItem'
import ViewModeToggle from '@/components/ViewModeToggle'
import ItemsContainer from '@/components/ItemsContainer'
import TagFilter from '@/components/TagFilter'
import { useViewMode } from '@/hooks/useViewMode'
import { useAdmin } from '@/hooks/useAdmin'

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
  imageUrl: string | null
  _count: { ownedVehicles: number }
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
  const { isAdmin } = useAdmin()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [type, setType] = useState('')
  const [showSetSingle, setShowSetSingle] = useState(false) // セット単品デフォルト非表示
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [tagOperator, setTagOperator] = useState<'AND' | 'OR'>('OR')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<ProductsResponse['pagination'] | null>(null)
  const { viewMode, setViewMode } = useViewMode()

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
  }, [search, brand, type, showSetSingle, selectedTags, tagOperator, page])

  useEffect(() => {
    fetchProducts()
  }, [search, brand, type, showSetSingle, selectedTags, tagOperator, page, fetchProducts])


  const handleProductClick = (productId: number) => {
    router.push(`/products/${productId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">製品一覧</h1>
        <div className="flex items-center space-x-4">
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          {session && (
            <div className="flex space-x-2">
              <button
                onClick={() => router.push('/products/new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                製品追加
              </button>
              <button
                onClick={() => router.push('/import')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                CSVインポート
              </button>
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  管理
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* フィルター */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* タグフィルタ */}
        <div className="lg:col-span-1">
          <TagFilter
            selectedTags={selectedTags}
            operator={tagOperator}
            onTagsChange={setSelectedTags}
            onOperatorChange={setTagOperator}
          />
        </div>

        {/* 既存のフィルター */}
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow">
          <div className="space-y-4">
            {/* 検索とメインフィルタ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
              <input
                type="text"
                placeholder="製品名・品番で検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">メーカー</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全メーカー</option>
                <option value="KATO">KATO</option>
                <option value="TOMIX">TOMIX</option>
                <option value="マイクロエース">マイクロエース</option>
                <option value="グリーンマックス">グリーンマックス</option>
                <option value="モデモ">モデモ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">種別</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全種別</option>
                <option value="単品">単品</option>
                <option value="セット">セット</option>
                <option value="セット単品">セット単品</option>
              </select>
            </div>
          </div>

          {/* 表示オプションとリセット */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showSetSingle}
                  onChange={(e) => setShowSetSingle(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">セット単品を表示</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              {/* アクティブフィルタ表示 */}
              {(search || brand || type || showSetSingle || selectedTags.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="whitespace-nowrap">フィルタ適用中:</span>
                  {search && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">検索: {search}</span>}
                  {brand && <span className="bg-green-100 text-green-800 px-2 py-1 rounded whitespace-nowrap">メーカー: {brand}</span>}
                  {type && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded whitespace-nowrap">種別: {type}</span>}
                  {showSetSingle && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded whitespace-nowrap">セット単品表示</span>}
                  {selectedTags.length > 0 && <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded whitespace-nowrap">タグ: {selectedTags.length}件 ({tagOperator})</span>}
                </div>
              )}

              {/* リセットボタン */}
              {(search || brand || type || showSetSingle || selectedTags.length > 0) && (
                <button
                  onClick={() => {
                    setSearch('')
                    setBrand('')
                    setType('')
                    setShowSetSingle(false)
                    setSelectedTags([])
                    setPage(1)
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  リセット
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : (
        <>
          <ItemsContainer
            items={products}
            viewMode={viewMode}
            renderGridItem={(product) => (
              <ProductCard
                product={product}
                onClick={() => handleProductClick(product.id)}
              />
            )}
            renderListItem={(product) => (
              <ProductListItem
                product={product}
                onClick={() => handleProductClick(product.id)}
              />
            )}
            emptyState={
              <div className="text-center py-12">
                <p className="text-gray-500">製品が見つかりませんでした</p>
              </div>
            }
          />


          {/* ページネーション */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  前へ
                </button>
                <span className="px-4 py-2 text-gray-900 font-medium bg-gray-50 rounded-md border">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ProductCard from '@/components/ProductCard'
import ProductListItem from '@/components/ProductListItem'
import ViewModeToggle from '@/components/ViewModeToggle'
import ItemsContainer from '@/components/ItemsContainer'
import { useViewMode } from '@/hooks/useViewMode'

interface Product {
  id: number
  brand: string
  productCode: string | null
  name: string
  type: string
  priceIncludingTax: number | null
  imageUrl: string | null
  _count: { ownedVehicles: number }
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
      params.append('page', page.toString())
      params.append('limit', '20')

      const response = await fetch(`/api/products?${params}`)
      const data: ProductsResponse = await response.json()


      setProducts(data.products)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }, [search, brand, type, page])

  useEffect(() => {
    fetchProducts()
  }, [search, brand, type, page, fetchProducts])


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
            </div>
          )}
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="製品名・品番で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">全メーカー</option>
            <option value="KATO">KATO</option>
            <option value="TOMIX">TOMIX</option>
            <option value="マイクロエース">マイクロエース</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">全タイプ</option>
            <option value="SINGLE">単品</option>
            <option value="SET">セット</option>
            <option value="SET_SINGLE">セット単品</option>
          </select>
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
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  前へ
                </button>
                <span className="px-3 py-2">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
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
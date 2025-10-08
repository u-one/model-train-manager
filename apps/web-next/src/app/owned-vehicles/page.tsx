'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OwnedVehicleCard from '@/components/OwnedVehicleCard'
import OwnedVehicleListItem from '@/components/OwnedVehicleListItem'
import ViewModeToggle from '@/components/ViewModeToggle'
import ItemsContainer from '@/components/ItemsContainer'
import AuthGuard from '@/components/AuthGuard'
import TagFilter from '@/components/TagFilter'
import { useViewMode } from '@/hooks/useViewMode'

interface OwnedVehicle {
  id: number
  managementId: string
  currentStatus: string
  storageCondition: string
  purchaseDate: string | null
  purchasePriceIncludingTax: number | null
  notes: string | null
  imageUrls: string[]
  product?: {
    id: number
    name: string
    brand: string
    productCode: string | null
    type: string
    productTags?: {
      tag: {
        id: number
        name: string
        category: string
      }
    }[]
  } | null
  independentVehicle?: {
    name: string
    brand: string | null
    vehicleType: string | null
  } | null
}

interface OwnedVehiclesResponse {
  ownedVehicles: OwnedVehicle[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function OwnedVehiclesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [vehicles, setVehicles] = useState<OwnedVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [independentFilter, setIndependentFilter] = useState('')
  const [brand, setBrand] = useState('')
  const [type, setType] = useState('')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [tagOperator, setTagOperator] = useState<'AND' | 'OR'>('OR')
  const [noTagsCategories, setNoTagsCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('purchaseDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<OwnedVehiclesResponse['pagination'] | null>(null)
  const { viewMode, setViewMode } = useViewMode()
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  const fetchVehicles = useCallback(async () => {
    if (status === 'loading') return
    if (!session) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (conditionFilter) params.append('condition', conditionFilter)
      if (independentFilter) params.append('isIndependent', independentFilter)
      if (brand) params.append('brand', brand)
      if (type) params.append('type', type)
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','))
        params.append('tag_operator', tagOperator)
      }
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)
      params.append('page', page.toString())
      params.append('limit', '100')

      const response = await fetch(`/api/owned-vehicles?${params}`)

      if (response.status === 401) {
        console.error('Unauthorized access')
        return
      }

      if (response.ok) {
        const data: OwnedVehiclesResponse = await response.json()
        let sortedVehicles = data.ownedVehicles || []

        // クライアント側でソート（名称と分類順）
        if (sortBy === 'name') {
          sortedVehicles = [...sortedVehicles].sort((a, b) => {
            const nameA = (a.product?.name || a.independentVehicle?.name || '').toLowerCase()
            const nameB = (b.product?.name || b.independentVehicle?.name || '').toLowerCase()
            return sortOrder === 'asc'
              ? nameA.localeCompare(nameB)
              : nameB.localeCompare(nameA)
          })
        } else if (sortBy === 'category') {
          sortedVehicles = [...sortedVehicles].sort((a, b) => {
            // 分類順：タイプ → メーカー → 品番
            const typeA = a.product?.type || a.independentVehicle?.vehicleType || ''
            const typeB = b.product?.type || b.independentVehicle?.vehicleType || ''
            const brandA = a.product?.brand || a.independentVehicle?.brand || ''
            const brandB = b.product?.brand || b.independentVehicle?.brand || ''
            const codeA = a.product?.productCode || ''
            const codeB = b.product?.productCode || ''

            if (typeA !== typeB) {
              return sortOrder === 'asc'
                ? typeA.localeCompare(typeB)
                : typeB.localeCompare(typeA)
            }
            if (brandA !== brandB) {
              return sortOrder === 'asc'
                ? brandA.localeCompare(brandB)
                : brandB.localeCompare(brandA)
            }
            return sortOrder === 'asc'
              ? codeA.localeCompare(codeB)
              : codeB.localeCompare(codeA)
          })
        }

        setVehicles(sortedVehicles)
        setPagination(data.pagination)
      } else {
        console.error('API Error:', response.status, response.statusText)
        setVehicles([])
        setPagination(null)
      }
    } catch (error) {
      console.error('Failed to fetch owned vehicles:', error)
      setVehicles([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, conditionFilter, independentFilter, brand, type, selectedTags, tagOperator, noTagsCategories, sortBy, sortOrder, page, session, status])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  // フィルタリセット
  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setConditionFilter('')
    setIndependentFilter('')
    setBrand('')
    setType('')
    setSelectedTags([])
    setNoTagsCategories([])
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter || conditionFilter || independentFilter || brand || type || selectedTags.length > 0 || noTagsCategories.length > 0

  const handleVehicleClick = (vehicleId: number) => {
    router.push(`/owned-vehicles/${vehicleId}`)
  }

  return (
    <AuthGuard requireAuth={true}>
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
            placeholder="管理ID・車両名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* ステータスフィルタ */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">ステータス</div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">すべて</option>
            <option value="NORMAL">正常</option>
            <option value="NEEDS_REPAIR">要修理</option>
            <option value="BROKEN">故障中</option>
          </select>
        </div>

        {/* 保管状態フィルタ */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">保管状態</div>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">すべて</option>
            <option value="WITH_CASE">ケースあり</option>
            <option value="WITHOUT_CASE">ケースなし</option>
          </select>
        </div>

        {/* 車両タイプフィルタ */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">車両タイプ</div>
          <select
            value={independentFilter}
            onChange={(e) => setIndependentFilter(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">すべて</option>
            <option value="true">独立車両のみ</option>
            <option value="false">製品リンク済みのみ</option>
          </select>
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
                  checked={type === t}
                  onChange={() => setType(type === t ? '' : t)}
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
            onClick={handleResetFilters}
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
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">保有車両</h1>
              {pagination && (
                <div className="text-sm text-gray-600 mt-1">
                  {pagination.total}両中 {(page - 1) * pagination.limit + 1}-{Math.min(page * pagination.limit, pagination.total)}両を表示
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
                  <option value="purchaseDate">購入日</option>
                  <option value="name">名称</option>
                  <option value="managementId">管理ID</option>
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

                {/* ボタン群 */}
                <button
                  onClick={() => router.push('/owned-vehicles/new')}
                  className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 whitespace-nowrap"
                >
                  車両追加
                </button>
                <button
                  onClick={() => router.push('/import')}
                  className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 whitespace-nowrap"
                >
                  CSVインポート
                </button>
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
              items={vehicles}
              viewMode={viewMode}
              renderGridItem={(vehicle) => (
                <OwnedVehicleCard
                  vehicle={vehicle}
                  onClick={() => handleVehicleClick(vehicle.id)}
                />
              )}
              renderListItem={(vehicle) => (
                <OwnedVehicleListItem
                  vehicle={vehicle}
                  onClick={() => handleVehicleClick(vehicle.id)}
                />
              )}
              emptyState={
                <div className="text-center py-12">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">保有車両がありません</h3>
                  <p className="mt-1 text-sm text-gray-500">最初の車両を追加してください</p>
                  <div className="mt-6">
                    <button
                      onClick={() => router.push('/owned-vehicles/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      車両追加
                    </button>
                  </div>
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
      </div>
    </div>
    </AuthGuard>
  )
}
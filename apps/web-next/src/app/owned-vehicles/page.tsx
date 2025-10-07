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
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<OwnedVehiclesResponse['pagination'] | null>(null)
  const { viewMode, setViewMode } = useViewMode()

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
      params.append('page', page.toString())
      params.append('limit', '100')

      const response = await fetch(`/api/owned-vehicles?${params}`)

      if (response.status === 401) {
        console.error('Unauthorized access')
        return
      }

      if (response.ok) {
        const data: OwnedVehiclesResponse = await response.json()
        setVehicles(data.ownedVehicles || [])
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
  }, [search, statusFilter, conditionFilter, independentFilter, brand, type, selectedTags, tagOperator, page, session, status])

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
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter || conditionFilter || independentFilter || brand || type || selectedTags.length > 0

  const handleVehicleClick = (vehicleId: number) => {
    router.push(`/owned-vehicles/${vehicleId}`)
  }

  return (
    <AuthGuard requireAuth={true}>
    <div className="flex min-h-screen bg-gray-50">
      {/* サイドバー（フィルタ） */}
      <aside className="w-72 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
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
            onTagsChange={setSelectedTags}
            onOperatorChange={setTagOperator}
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
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 p-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">保有車両</h1>
            {pagination && (
              <div className="text-sm text-gray-600 mt-1">
                {pagination.total}両中 {(page - 1) * pagination.limit + 1}-{Math.min(page * pagination.limit, pagination.total)}両を表示
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <button
              onClick={() => router.push('/owned-vehicles/new')}
              className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
            >
              車両追加
            </button>
            <button
              onClick={() => router.push('/import')}
              className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
            >
              CSVインポート
            </button>
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
    </AuthGuard>
  )
}
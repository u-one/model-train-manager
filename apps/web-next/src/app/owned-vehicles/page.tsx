'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OwnedVehicleCard from '@/components/OwnedVehicleCard'
import AuthGuard from '@/components/AuthGuard'

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
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<OwnedVehiclesResponse['pagination'] | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchVehicles = useCallback(async () => {
    if (status === 'loading') return
    if (!session) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (conditionFilter) params.append('condition', conditionFilter)
      params.append('page', page.toString())

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
  }, [search, statusFilter, conditionFilter, page, session, status])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  const handleVehicleClick = (vehicleId: number) => {
    router.push(`/owned-vehicles/${vehicleId}`)
  }

  return (
    <AuthGuard requireAuth={true}>
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">保有車両</h1>
        <div className="flex items-center space-x-4">
          {/* 表示モード切り替え */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              グリッド
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              一覧
            </button>
          </div>
          <button
            onClick={() => router.push('/owned-vehicles/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            車両追加
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="管理ID・車両名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">全ステータス</option>
            <option value="NORMAL">正常</option>
            <option value="NEEDS_REPAIR">要修理</option>
            <option value="BROKEN">故障中</option>
          </select>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">全保管状態</option>
            <option value="WITH_CASE">ケースあり</option>
            <option value="WITHOUT_CASE">ケースなし</option>
          </select>
          <div className="text-sm text-gray-600 flex items-center">
            合計: {pagination?.total || 0}台
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
          {viewMode === 'grid' ? (
            // グリッド表示
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vehicles.map((vehicle) => (
                <OwnedVehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onClick={() => handleVehicleClick(vehicle.id)}
                />
              ))}
            </div>
          ) : (
            // リスト表示
            <div className="space-y-4">
              {vehicles.map((vehicle) => {
                const vehicleName = vehicle.product?.name || vehicle.independentVehicle?.name || '名称未設定'
                const brand = vehicle.product?.brand || vehicle.independentVehicle?.brand || '不明'
                const productCode = vehicle.product?.productCode

                const statusLabels: Record<string, string> = {
                  NORMAL: '正常',
                  NEEDS_REPAIR: '要修理',
                  BROKEN: '故障中'
                }

                const statusColors: Record<string, string> = {
                  NORMAL: 'bg-green-100 text-green-800',
                  NEEDS_REPAIR: 'bg-yellow-100 text-yellow-800',
                  BROKEN: 'bg-red-100 text-red-800'
                }

                const conditionLabels: Record<string, string> = {
                  WITH_CASE: 'ケースあり',
                  WITHOUT_CASE: 'ケースなし'
                }

                return (
                  <div
                    key={vehicle.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-4"
                    onClick={() => handleVehicleClick(vehicle.id)}
                  >
                    <div className="flex items-center space-x-4">
                      {vehicle.imageUrls.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vehicle.imageUrls[0]}
                          alt={vehicleName}
                          className="w-20 h-20 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 text-xs">画像なし</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-gray-900">{vehicle.managementId}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[vehicle.currentStatus] || 'bg-gray-100 text-gray-800'}`}>
                              {statusLabels[vehicle.currentStatus] || vehicle.currentStatus}
                            </span>
                          </div>
                          {vehicle.purchasePriceIncludingTax && (
                            <span className="text-lg font-semibold text-gray-900 ml-4">
                              ¥{vehicle.purchasePriceIncludingTax.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 truncate mt-1">{vehicleName}</h3>
                        <div className="mt-1 flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span className="font-medium">{brand}</span>
                            {productCode && (
                              <span>{productCode}</span>
                            )}
                            <span>{conditionLabels[vehicle.storageCondition] || vehicle.storageCondition}</span>
                          </div>
                          {vehicle.purchaseDate && (
                            <span>購入: {new Date(vehicle.purchaseDate).toLocaleDateString('ja-JP')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {vehicles.length === 0 && (
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
          )}

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
    </AuthGuard>
  )
}
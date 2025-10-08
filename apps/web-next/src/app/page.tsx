'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/hooks/useAdmin'

interface PublicStats {
  totalProducts: number
  recentProducts: Array<{
    id: number
    name: string
    brand: string
    productCode: string | null
    type: string
    createdAt: string
    productTags: Array<{
      tag: {
        id: number
        name: string
        category: string
      }
    }>
  }>
  popularTags: Array<{
    id: number
    name: string
    category: string
    _count: {
      productTags: number
    }
  }>
}

interface UserStats {
  totalOwnedVehicles: number
  ownedVehiclesByStatus: Array<{
    currentStatus: string
    _count: number
  }>
  recentOwnedVehicles: Array<{
    id: number
    managementId: string
    currentStatus: string
    product?: {
      id: number
      name: string
      brand: string
      productCode: string | null
    }
    independentVehicle?: {
      name: string
      brand: string | null
    }
  }>
  recentActivity: number
}

const STATUS_LABELS: Record<string, string> = {
  EXCELLENT: '優良',
  GOOD: '良好',
  FAIR: '普通',
  POOR: '要注意',
  BROKEN: '故障',
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const { isAdmin } = useAdmin()
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicStats()
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (session) {
      fetchUserStats()
    } else {
      setLoading(false)
    }
  }, [session, status])

  const fetchPublicStats = async () => {
    try {
      const response = await fetch('/api/stats/public')
      if (response.ok) {
        const data = await response.json()
        setPublicStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch public stats:', error)
    }
  }

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/stats/user')
      if (response.ok) {
        const data = await response.json()
        setUserStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* サイト説明 */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm leading-relaxed">
            Nゲージ鉄道模型の製品情報を検索・閲覧できるデータベースです。<br />
            メーカー、品番、タグによる詳細検索が可能。ログインすると保有車両の記録・管理、
            購入履歴、状態管理などの機能が利用できます。
          </p>
        </div>

        {/* メインナビゲーション */}
        <div className="mb-8">
          <div className="flex gap-3">
            <Link
              href="/products"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
            >
              製品一覧
            </Link>
            <Link
              href={session ? "/owned-vehicles" : "/auth/signin"}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                session
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              保有車両管理
              {!session && <span className="text-xs ml-1">(要ログイン)</span>}
            </Link>
          </div>
        </div>

        {/* ユーザー統計（ログイン時のみ） */}
        {session && userStats && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              あなたの保有車両統計
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">保有車両数</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {userStats.totalOwnedVehicles}両
                </div>
                <div className="text-sm text-gray-600">
                  最近7日間の活動: {userStats.recentActivity}件
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">状態別内訳</h3>
                <div className="space-y-2">
                  {userStats.ownedVehiclesByStatus.map((status) => (
                    <div key={status.currentStatus} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {STATUS_LABELS[status.currentStatus] || status.currentStatus}
                      </span>
                      <span className="font-medium">{status._count}両</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h3>
                <div className="space-y-3">
                  <Link
                    href="/owned-vehicles/new"
                    className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                  >
                    車両を追加
                  </Link>
                  <Link
                    href="/import"
                    className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded hover:bg-green-700 transition-colors"
                  >
                    CSVインポート
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="block w-full bg-purple-600 text-white text-center py-2 px-4 rounded hover:bg-purple-700 transition-colors"
                    >
                      管理画面
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側: 製品統計とタグ一覧 */}
          {publicStats && (
            <div className="space-y-6">
              {/* 製品統計 */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">製品統計</h3>
                </div>
                <div className="p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {publicStats.totalProducts.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">製品登録数</div>
                  </div>
                </div>
              </div>

              {/* タグ一覧 */}
              {publicStats.popularTags.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">タグ一覧</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {publicStats.popularTags.map((tag) => (
                        <Link
                          key={tag.id}
                          href={`/products?tags=${tag.id}`}
                          className="flex justify-between items-center hover:bg-gray-50 p-2 rounded transition-colors"
                        >
                          <span className="text-gray-800">{tag.name}</span>
                          <span className="text-gray-500 text-sm">
                            {tag._count.productTags}件
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 右側: 最近登録 */}
          {publicStats && publicStats.recentProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">最近登録</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {publicStats.recentProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="block hover:bg-gray-50 p-3 rounded-lg transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            {product.brand} {product.productCode}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {product.productTags.slice(0, 3).map((pt) => (
                              <span
                                key={pt.tag.id}
                                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                              >
                                {pt.tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 ml-4">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 最近の保有車両（ログイン時のみ） */}
        {session && userStats && userStats.recentOwnedVehicles.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">最近の保有車両</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {userStats.recentOwnedVehicles.map((vehicle) => (
                  <Link
                    key={vehicle.id}
                    href={`/owned-vehicles/${vehicle.id}`}
                    className="block hover:bg-gray-50 p-3 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {vehicle.product?.name || vehicle.independentVehicle?.name || '名称未設定'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {vehicle.product?.brand || vehicle.independentVehicle?.brand || '(独立記録)'}
                          {vehicle.product?.productCode && ` ${vehicle.product.productCode}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          管理ID: {vehicle.managementId || '未設定'} |
                          状態: {STATUS_LABELS[vehicle.currentStatus] || vehicle.currentStatus}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/owned-vehicles"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  すべての保有車両を見る →
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
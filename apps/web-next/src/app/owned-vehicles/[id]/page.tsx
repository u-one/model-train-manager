'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import ImageGallery from '@/components/ImageGallery'

interface OwnedVehicle {
  id: number
  managementId: string
  productId: number | null
  currentStatus: string
  storageCondition: string
  purchaseDate: string | null
  purchasePriceExcludingTax: number | null
  purchasePriceIncludingTax: number | null
  purchaseStore: string | null
  purchaseCondition: string | null
  maintenanceNotes: string | null
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
    productCode: string | null
    vehicleType: string | null
    description: string | null
  } | null
  maintenanceRecords: MaintenanceRecord[]
  componentOwnedVehicles?: Array<{
    id: number
    managementId: string
    product: {
      id: number
      name: string
      brand: string
    }
  }>
}

interface MaintenanceRecord {
  id: number
  maintenanceDate: string
  content: string
  createdAt: string
}

const statusLabels: Record<string, string> = {
  NORMAL: '正常',
  NEEDS_REPAIR: '要修理',
  BROKEN: '故障中'
}

const conditionLabels: Record<string, string> = {
  WITH_CASE: 'ケースあり',
  WITHOUT_CASE: 'ケースなし'
}

const purchaseConditionLabels: Record<string, string> = {
  NEW: '新品',
  USED: '中古'
}

export default function OwnedVehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [vehicle, setVehicle] = useState<OwnedVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchVehicle = async () => {
      if (status === 'loading') return
      if (!session) {
        router.push('/auth/signin')
        return
      }

      try {
        const response = await fetch(`/api/owned-vehicles/${resolvedParams.id}`)

        if (response.status === 401) {
          router.push('/auth/signin')
          return
        }

        if (response.status === 404) {
          router.push('/owned-vehicles')
          return
        }

        if (response.ok) {
          const data = await response.json()
          setVehicle(data)
        } else {
          router.push('/owned-vehicles')
        }
      } catch (error) {
        console.error('Failed to fetch vehicle:', error)
        router.push('/owned-vehicles')
      } finally {
        setLoading(false)
      }
    }

    fetchVehicle()
  }, [resolvedParams.id, session, status, router])

  const handleDelete = async () => {
    if (!confirm(`保有車両「${vehicle?.managementId}」を削除してもよろしいですか？\n\nこの操作は取り消せません。整備記録も一緒に削除されます。`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/owned-vehicles/${resolvedParams.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/owned-vehicles')
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete owned vehicle:', error)
      alert('削除中にエラーが発生しました')
    } finally {
      setIsDeleting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  if (!session || !vehicle) {
    return null
  }

  const vehicleName = vehicle.product?.name || vehicle.independentVehicle?.name || '名称未設定'
  const brand = vehicle.product?.brand || vehicle.independentVehicle?.brand || '不明'

  return (
    <AuthGuard requireAuth={true}>
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← 戻る
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vehicle.managementId}</h1>
            <p className="text-lg text-gray-600 mt-1">{vehicleName}</p>
            {vehicle.independentVehicle && (
              <p className="text-sm text-orange-600 mt-1">⚠️ 独立記録車両（製品情報なし）</p>
            )}
          </div>
          <div className="flex space-x-2">
            {vehicle.independentVehicle && (
              <button
                onClick={() => router.push(`/products/new?fromIndependent=${vehicle.id}`)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
              >
                <span>この情報で製品を作成</span>
              </button>
            )}
            <button
              onClick={() => router.push(`/owned-vehicles/${vehicle.id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              編集
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? '削除中...' : '削除'}
            </button>
          </div>
        </div>
      </div>

      {/* 独立車両の警告メッセージ */}
      {vehicle.independentVehicle && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">この車両は独立記録されています</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>CSVインポート時に製品情報が見つからなかったため、独立車両として登録されています。</p>
                <p className="mt-1">「この情報で製品を作成」ボタンから製品情報を作成すると、他のユーザーとも製品情報を共有できます。</p>
              </div>
              {vehicle.independentVehicle.description && (
                <div className="mt-2">
                  <p className="text-xs text-yellow-600">{vehicle.independentVehicle.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 画像 */}
        <div className="lg:col-span-1">
          {vehicle.imageUrls.length > 0 ? (
            <ImageGallery images={vehicle.imageUrls} />
          ) : (
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">画像なし</span>
            </div>
          )}
        </div>

        {/* 車両情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {vehicle.independentVehicle ? '車両情報（独立記録）' : '基本情報'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {vehicle.product && (
                <div className="col-span-2">
                  <span className="text-gray-600">製品情報:</span>
                  <Link
                    href={`/products/${vehicle.product.id}`}
                    className="ml-2 text-blue-600 hover:text-blue-800 font-medium underline"
                  >
                    製品ページを表示 →
                  </Link>
                </div>
              )}
              <div>
                <span className="text-gray-600">ブランド:</span>
                <span className="ml-2 font-medium">{brand}</span>
              </div>
              {(vehicle.product?.productCode || vehicle.independentVehicle?.productCode) && (
                <div>
                  <span className="text-gray-600">品番:</span>
                  <span className="ml-2 font-medium">
                    {vehicle.product?.productCode || vehicle.independentVehicle?.productCode}
                  </span>
                </div>
              )}
              {vehicle.independentVehicle?.vehicleType && (
                <div>
                  <span className="text-gray-600">形式:</span>
                  <span className="ml-2 font-medium">{vehicle.independentVehicle.vehicleType}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">現在の状態:</span>
                <span className="ml-2 font-medium">{statusLabels[vehicle.currentStatus] || vehicle.currentStatus}</span>
              </div>
              <div>
                <span className="text-gray-600">保管状態:</span>
                <span className="ml-2 font-medium">{conditionLabels[vehicle.storageCondition] || vehicle.storageCondition}</span>
              </div>
            </div>
          </div>

          {/* セット構成車両 */}
          {vehicle.componentOwnedVehicles && vehicle.componentOwnedVehicles.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">セット構成車両</h2>
              <div className="text-sm text-gray-600 mb-4">
                このセットに含まれる {vehicle.componentOwnedVehicles.length} 両の車両
              </div>
              <div className="space-y-3">
                {vehicle.componentOwnedVehicles.map((componentVehicle) => (
                  <Link
                    key={componentVehicle.id}
                    href={`/owned-vehicles/${componentVehicle.id}`}
                    className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{componentVehicle.product.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {componentVehicle.product.brand}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        管理ID: {componentVehicle.managementId || '未設定'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 購入情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">購入情報</h2>
            <div className="grid grid-cols-2 gap-4">
              {vehicle.purchaseDate && (
                <div>
                  <span className="text-gray-600">購入日:</span>
                  <span className="ml-2 font-medium">{new Date(vehicle.purchaseDate).toLocaleDateString('ja-JP')}</span>
                </div>
              )}
              {vehicle.purchaseCondition && (
                <div>
                  <span className="text-gray-600">購入時状態:</span>
                  <span className="ml-2 font-medium">{purchaseConditionLabels[vehicle.purchaseCondition] || vehicle.purchaseCondition}</span>
                </div>
              )}
              {vehicle.purchasePriceIncludingTax && (
                <div>
                  <span className="text-gray-600">購入価格:</span>
                  <span className="ml-2 font-medium">¥{vehicle.purchasePriceIncludingTax.toLocaleString()}</span>
                </div>
              )}
              {vehicle.purchaseStore && (
                <div>
                  <span className="text-gray-600">購入店:</span>
                  <span className="ml-2 font-medium">{vehicle.purchaseStore}</span>
                </div>
              )}
            </div>
          </div>

          {/* メモ */}
          {(vehicle.notes || vehicle.maintenanceNotes) && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">メモ</h2>
              {vehicle.notes && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">一般メモ:</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{vehicle.notes}</p>
                </div>
              )}
              {vehicle.maintenanceNotes && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">整備メモ:</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{vehicle.maintenanceNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* 整備記録 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">整備記録</h2>
              <button
                onClick={() => router.push(`/owned-vehicles/${vehicle.id}/maintenance/new`)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                記録追加
              </button>
            </div>

            {vehicle.maintenanceRecords.length > 0 ? (
              <div className="space-y-4">
                {vehicle.maintenanceRecords.map((record) => (
                  <div key={record.id} className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {new Date(record.maintenanceDate).toLocaleDateString('ja-JP')}
                        </p>
                        <p className="text-gray-700 mt-1">{record.content}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(record.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">整備記録がありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}
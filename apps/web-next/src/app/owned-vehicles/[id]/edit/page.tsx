'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AuthGuard from '@/components/AuthGuard'
import { ownedVehicleFormSchema, type OwnedVehicleFormData } from '@/lib/validations/owned-vehicle'

interface Product {
  id: number
  name: string
  brand: string
  productCode: string | null
  type: string
}

interface OwnedVehicle {
  id: number
  managementId: string
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
    vehicleType: string | null
    description: string | null
  } | null
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

export default function EditOwnedVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vehicle, setVehicle] = useState<OwnedVehicle | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const form = useForm({
    resolver: zodResolver(ownedVehicleFormSchema),
    defaultValues: {
      managementId: '',
      vehicleType: 'PRODUCT' as const,
      productId: undefined,
      independentVehicle: {
        name: '',
        brand: '',
        vehicleType: '',
        description: ''
      },
      currentStatus: 'NORMAL' as const,
      storageCondition: 'WITH_CASE' as const,
      purchaseDate: '',
      purchasePriceExcludingTax: undefined,
      purchasePriceIncludingTax: undefined,
      purchaseStore: '',
      purchaseCondition: undefined,
      notes: '',
      maintenanceNotes: ''
    }
  })

  const vehicleType = form.watch('vehicleType')

  // 保有車両データと製品一覧を取得
  useEffect(() => {
    const fetchData = async () => {
      if (status === 'loading') return
      if (!session) {
        router.push('/auth/signin')
        return
      }

      try {
        // 保有車両データ取得
        const vehicleResponse = await fetch(`/api/owned-vehicles/${resolvedParams.id}`)
        if (vehicleResponse.status === 401) {
          router.push('/auth/signin')
          return
        }
        if (vehicleResponse.status === 404) {
          router.push('/owned-vehicles')
          return
        }
        if (!vehicleResponse.ok) {
          router.push('/owned-vehicles')
          return
        }

        const vehicleData = await vehicleResponse.json()
        setVehicle(vehicleData)
        setImageUrls(vehicleData.imageUrls || [])

        // 製品一覧取得
        const productsResponse = await fetch('/api/products?limit=1000')
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          setProducts(productsData.products || [])
        }

        // フォームの初期値を設定
        const vehicleTypeValue = vehicleData.product ? 'PRODUCT' : 'INDEPENDENT'
        form.reset({
          managementId: vehicleData.managementId,
          vehicleType: vehicleTypeValue,
          productId: vehicleData.product?.id || undefined,
          independentVehicle: vehicleData.independentVehicle ? {
            name: vehicleData.independentVehicle.name || '',
            brand: vehicleData.independentVehicle.brand || '',
            vehicleType: vehicleData.independentVehicle.vehicleType || '',
            description: vehicleData.independentVehicle.description || ''
          } : {
            name: '',
            brand: '',
            vehicleType: '',
            description: ''
          },
          currentStatus: vehicleData.currentStatus,
          storageCondition: vehicleData.storageCondition,
          purchaseDate: vehicleData.purchaseDate ? vehicleData.purchaseDate.split('T')[0] : '',
          purchasePriceExcludingTax: vehicleData.purchasePriceExcludingTax || undefined,
          purchasePriceIncludingTax: vehicleData.purchasePriceIncludingTax || undefined,
          purchaseStore: vehicleData.purchaseStore || '',
          purchaseCondition: vehicleData.purchaseCondition || undefined,
          notes: vehicleData.notes || '',
          maintenanceNotes: vehicleData.maintenanceNotes || ''
        })

      } catch (error) {
        console.error('Failed to fetch data:', error)
        router.push('/owned-vehicles')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.id, session, status, router, form])

  const onSubmit = async (data: OwnedVehicleFormData) => {
    setIsSubmitting(true)
    try {
      // データを整形
      const cleanedData = {
        ...data,
        purchaseDate: data.purchaseDate === '' ? undefined : data.purchaseDate,
        purchasePriceExcludingTax: data.purchasePriceExcludingTax === '' ? undefined : Number(data.purchasePriceExcludingTax),
        purchasePriceIncludingTax: data.purchasePriceIncludingTax === '' ? undefined : Number(data.purchasePriceIncludingTax),
        purchaseStore: data.purchaseStore === '' ? undefined : data.purchaseStore,
        notes: data.notes === '' ? undefined : data.notes,
        maintenanceNotes: data.maintenanceNotes === '' ? undefined : data.maintenanceNotes,
        imageUrls: imageUrls.filter(url => url.trim() !== ''),
        // 車両タイプに応じて不要なデータを削除
        productId: data.vehicleType === 'PRODUCT' ? data.productId : undefined,
        independentVehicle: data.vehicleType === 'INDEPENDENT' ? data.independentVehicle : undefined
      }

      const response = await fetch(`/api/owned-vehicles/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      })

      if (response.ok) {
        router.push(`/owned-vehicles/${resolvedParams.id}`)
      } else {
        const error = await response.json()
        console.error('Failed to update owned vehicle:', error)
        alert('保有車両の更新に失敗しました')
      }
    } catch (error) {
      console.error('Error updating owned vehicle:', error)
      alert('保有車両の更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addImageUrl = () => {
    setImageUrls([...imageUrls, ''])
  }

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  const updateImageUrl = (index: number, value: string) => {
    const newImageUrls = [...imageUrls]
    newImageUrls[index] = value
    setImageUrls(newImageUrls)
  }

  if (status === 'loading' || loading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </AuthGuard>
    )
  }

  if (!session || !vehicle) {
    return null
  }

  const vehicleName = vehicle.product?.name || vehicle.independentVehicle?.name || '名称未設定'

  return (
    <AuthGuard requireAuth={true}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← 戻る
            </button>
            <h1 className="text-3xl font-bold text-gray-900">保有車両編集</h1>
            <p className="text-gray-600 mt-2">{vehicle.managementId} - {vehicleName}を編集します</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* 基本情報 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    管理ID *
                  </label>
                  <input
                    type="text"
                    {...form.register('managementId')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="例: MY-001"
                  />
                  {form.formState.errors.managementId && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.managementId.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    車両タイプ *
                  </label>
                  <select
                    {...form.register('vehicleType')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="PRODUCT">製品から選択</option>
                    <option value="INDEPENDENT">独立記録</option>
                  </select>
                  {form.formState.errors.vehicleType && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.vehicleType.message}</p>
                  )}
                </div>

                {vehicleType === 'PRODUCT' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      製品選択 *
                    </label>
                    <select
                      {...form.register('productId', { valueAsNumber: true })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">製品を選択してください</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.brand} - {product.name} {product.productCode && `(${product.productCode})`}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.productId && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.productId.message}</p>
                    )}
                  </div>
                )}

                {vehicleType === 'INDEPENDENT' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        車両名 *
                      </label>
                      <input
                        type="text"
                        {...form.register('independentVehicle.name')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="例: 289系電車（こうのとり）"
                      />
                      {form.formState.errors.independentVehicle?.name && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.independentVehicle.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        ブランド
                      </label>
                      <input
                        type="text"
                        {...form.register('independentVehicle.brand')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="例: KATO"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        形式
                      </label>
                      <input
                        type="text"
                        {...form.register('independentVehicle.vehicleType')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="例: 289-0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        説明
                      </label>
                      <textarea
                        {...form.register('independentVehicle.description')}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="車両の詳細説明"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 状態情報 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">状態情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    現在の状態 *
                  </label>
                  <select
                    {...form.register('currentStatus')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {form.formState.errors.currentStatus && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.currentStatus.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    保管状態 *
                  </label>
                  <select
                    {...form.register('storageCondition')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {Object.entries(conditionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {form.formState.errors.storageCondition && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.storageCondition.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 購入情報 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">購入情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    購入日
                  </label>
                  <input
                    type="date"
                    {...form.register('purchaseDate')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    購入時状態
                  </label>
                  <select
                    {...form.register('purchaseCondition')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">選択してください</option>
                    {Object.entries(purchaseConditionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    購入価格（税抜）（円）
                  </label>
                  <input
                    type="number"
                    {...form.register('purchasePriceExcludingTax', { valueAsNumber: true })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="例: 15000"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    購入価格（税込）（円）
                  </label>
                  <input
                    type="number"
                    {...form.register('purchasePriceIncludingTax', { valueAsNumber: true })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="例: 16500"
                    min="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    購入店
                  </label>
                  <input
                    type="text"
                    {...form.register('purchaseStore')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="例: ヨドバシカメラ"
                  />
                </div>
              </div>
            </div>

            {/* メモ */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">メモ</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    一般メモ
                  </label>
                  <textarea
                    {...form.register('notes')}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="一般的なメモを入力してください"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    整備メモ
                  </label>
                  <textarea
                    {...form.register('maintenanceNotes')}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="整備に関するメモを入力してください"
                  />
                </div>
              </div>
            </div>

            {/* 画像URL */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">画像URL</h2>
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  画像URL追加
                </button>
              </div>

              {imageUrls.length === 0 ? (
                <p className="text-gray-500 text-center py-4">画像URLを追加してください</p>
              ) : (
                <div className="space-y-3">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateImageUrl(index, e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImageUrl(index)}
                        className="text-red-600 hover:text-red-800 px-3 py-2"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 送信ボタン */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '更新中...' : '保有車両を更新'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}
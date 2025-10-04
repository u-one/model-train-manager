'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AuthGuard from '@/components/AuthGuard'
import { Input, Select } from '@/components/ui'
import { ownedVehicleFormSchema, defaultOwnedVehicleValues, type OwnedVehicleFormData } from '@/lib/validations/owned-vehicle'

interface Product {
  id: number
  name: string
  brand: string
  productCode: string | null
  type: string
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

export default function NewOwnedVehiclePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  const form = useForm({
    resolver: zodResolver(ownedVehicleFormSchema),
    defaultValues: defaultOwnedVehicleValues
  })

  const [imageUrls, setImageUrls] = useState<string[]>([])

  const vehicleType = form.watch('vehicleType')

  // 製品一覧を取得
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=1000')
        if (response.ok) {
          const data = await response.json()
          setProducts(data.products || [])
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [])

  const onSubmit = async (data: OwnedVehicleFormData) => {
    setIsSubmitting(true)
    try {
      // データを整形
      const cleanedData = {
        ...data,
        purchaseDate: data.purchaseDate === '' ? undefined : data.purchaseDate,
        purchasePriceExcludingTax: isNaN(data.purchasePriceExcludingTax as number) ? undefined : data.purchasePriceExcludingTax,
        purchasePriceIncludingTax: isNaN(data.purchasePriceIncludingTax as number) ? undefined : data.purchasePriceIncludingTax,
        purchaseStore: data.purchaseStore === '' ? undefined : data.purchaseStore,
        purchaseCondition: data.purchaseCondition === '' ? undefined : data.purchaseCondition,
        notes: data.notes === '' ? undefined : data.notes,
        maintenanceNotes: data.maintenanceNotes === '' ? undefined : data.maintenanceNotes,
        imageUrls: imageUrls.filter(url => url.trim() !== ''),
        // 車両タイプに応じて不要なデータを削除
        productId: data.vehicleType === 'PRODUCT' ? data.productId : undefined,
        productBrand: data.vehicleType === 'PRODUCT' ? data.productBrand : undefined,
        productCode: data.vehicleType === 'PRODUCT' ? data.productCode : undefined,
        independentVehicle: data.vehicleType === 'INDEPENDENT' ? data.independentVehicle : undefined
      }

      const response = await fetch('/api/owned-vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      })

      if (response.ok) {
        const newVehicle = await response.json()
        router.push(`/owned-vehicles/${newVehicle.id}`)
      } else {
        const error = await response.json()
        console.error('Failed to create owned vehicle:', error)
        alert('保有車両の作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating owned vehicle:', error)
      alert('保有車両の作成に失敗しました')
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

  if (loadingProducts) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </AuthGuard>
    )
  }

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
            <h1 className="text-3xl font-bold text-gray-900">保有車両追加</h1>
            <p className="text-gray-600 mt-2">新しい保有車両情報を登録します</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* デバッグ情報 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-100 p-4 rounded">
                <h3 className="font-bold">Debug Info:</h3>
                <p>Form Valid: {form.formState.isValid ? 'Yes' : 'No'}</p>
                <p>Is Submitting: {isSubmitting ? 'Yes' : 'No'}</p>
                {Object.keys(form.formState.errors).length > 0 && (
                  <div>
                    <p>Errors: {Object.keys(form.formState.errors).join(', ')}</p>
                  </div>
                )}
              </div>
            )}
            {/* 基本情報 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="管理ID"
                    {...form.register('managementId')}
                    placeholder="例: MY-001（省略可）"
                    error={form.formState.errors.managementId?.message}
                  />
                </div>

                <div className="md:col-span-2">
                  <Select
                    label="車両タイプ"
                    required
                    {...form.register('vehicleType')}
                    options={[
                      { value: "PRODUCT", label: "製品から選択" },
                      { value: "INDEPENDENT", label: "独立記録" }
                    ]}
                    error={form.formState.errors.vehicleType?.message}
                  />
                </div>

                {vehicleType === 'PRODUCT' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        メーカー *
                      </label>
                      <input
                        type="text"
                        {...form.register('productBrand')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        placeholder="例: KATO"
                        list="brand-suggestions"
                      />
                      <datalist id="brand-suggestions">
                        {[...new Set(products.map(p => p.brand))].map((brand) => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </datalist>
                      {form.formState.errors.productBrand && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.productBrand.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        品番 *
                      </label>
                      <input
                        type="text"
                        {...form.register('productCode')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        placeholder="例: 10-1603"
                        list="code-suggestions"
                      />
                      <datalist id="code-suggestions">
                        {products.filter(p => p.productCode).map((product) => (
                          <option key={product.id} value={product.productCode!}>{product.productCode}</option>
                        ))}
                      </datalist>
                      {form.formState.errors.productCode && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.productCode.message}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        製品選択（従来方式）
                      </label>
                      <select
                        {...form.register('productId', { valueAsNumber: true })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                      >
                        <option value="">製品を選択してください（オプション）</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.brand} - {product.name} {product.productCode && `(${product.productCode})`}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        上のメーカー・品番での指定が優先されます
                      </p>
                    </div>
                  </>
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
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        placeholder="例: 289系電車（こうのとり）"
                      />
                      {(form.formState.errors.independentVehicle?.name || (vehicleType === 'INDEPENDENT' && form.formState.errors.vehicleType)) && (
                        <p className="text-red-500 text-sm mt-1">
                          {form.formState.errors.independentVehicle?.name?.message || '車両名は必須です'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        ブランド
                      </label>
                      <input
                        type="text"
                        {...form.register('independentVehicle.brand')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    購入時状態
                  </label>
                  <select
                    {...form.register('purchaseCondition')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                {isSubmitting ? '作成中...' : '保有車両を作成'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}
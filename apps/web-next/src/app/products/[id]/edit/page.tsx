'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Select } from '@/components/ui'
import ProductFormTagSelector from '@/components/ProductFormTagSelector'
import ImageUploader from '@/components/ImageUploader'
import { productFormSchema, type ProductFormData } from '@/lib/validations/product'
import { PRODUCT_TYPES, PRODUCT_TYPE_SINGLE, PRODUCT_TYPE_SET_SINGLE } from '@/constants/productTypes'


interface Product {
  id: number
  brand: string
  productCode: string | null
  parentCode: string | null
  name: string
  type: string
  releaseYear: number | null
  priceExcludingTax: number | null
  priceIncludingTax: number | null
  description: string | null
  imageUrls: string[]
  realVehicles: RealVehicle[]
}

interface RealVehicle {
  id: number
  vehicleType: string | null
  company: string | null
  manufacturingYear: string | null
  operationLine: string | null
  notes: string | null
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      brand: '',
      productCode: '',
      name: '',
      type: PRODUCT_TYPE_SINGLE,
      releaseYear: undefined,
      priceExcludingTax: undefined,
      priceIncludingTax: undefined,
      description: '',
      imageUrls: [],
      realVehicles: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'realVehicles'
  })

  // セット単品の場合、価格フィールドを無効化
  const productType = form.watch('type')
  const isSetSingle = productType === PRODUCT_TYPE_SET_SINGLE

  // 製品データを取得
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${resolvedParams.id}`)
        if (response.ok) {
          const productData = await response.json()
          setProduct(productData)

          // 既存のタグと画像を読み込み
          const tagsResponse = await fetch(`/api/products/${resolvedParams.id}/tags`)
          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json()
            setSelectedTags(tagsData.tags.map((tag: { id: number }) => tag.id))
          }

          setImageUrls(productData.imageUrls || [])

          // フォームの初期値を設定
          form.reset({
            brand: productData.brand,
            productCode: productData.productCode || '',
            parentCode: productData.parentCode || '',
            name: productData.name,
            type: productData.type,
            releaseYear: productData.releaseYear || undefined,
            priceExcludingTax: productData.priceExcludingTax || undefined,
            priceIncludingTax: productData.priceIncludingTax || undefined,
            description: productData.description || '',
            imageUrls: productData.imageUrls || [],
            realVehicles: productData.realVehicles.map((rv: RealVehicle) => ({
              vehicleType: rv.vehicleType || '',
              company: rv.company || '',
              manufacturingYear: rv.manufacturingYear || '',
              operationLine: rv.operationLine || '',
              notes: rv.notes || ''
            }))
          })
        } else {
          router.push('/products')
        }
      } catch (error) {
        console.error('Failed to fetch product:', error)
        router.push('/products')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [resolvedParams.id, form, router])

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    try {
      // 空文字列を undefined に変換
      const cleanedData = {
        ...data,
        releaseYear: isNaN(data.releaseYear as number) ? undefined : data.releaseYear,
        priceExcludingTax: isNaN(data.priceExcludingTax as number) ? undefined : data.priceExcludingTax,
        priceIncludingTax: isNaN(data.priceIncludingTax as number) ? undefined : data.priceIncludingTax,
        imageUrls: imageUrls,
        realVehicles: data.realVehicles?.filter(rv =>
          rv.vehicleType || rv.company || rv.manufacturingYear || rv.operationLine || rv.notes
        )
      }

      const response = await fetch(`/api/products/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      })

      if (response.ok) {
        // タグを更新
        try {
          await fetch(`/api/products/${resolvedParams.id}/tags`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tagIds: selectedTags })
          })
        } catch (tagError) {
          console.error('Failed to update tags:', tagError)
          // タグ更新失敗でも製品更新は成功したので続行
        }

        router.push(`/products/${resolvedParams.id}`)
      } else {
        const error = await response.json()
        console.error('Failed to update product:', error)
        alert('製品の更新に失敗しました')
      }
    } catch (error) {
      console.error('Error updating product:', error)
      alert('製品の更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addRealVehicle = () => {
    append({
      vehicleType: '',
      company: '',
      manufacturingYear: '',
      operationLine: '',
      notes: ''
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  if (!product) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">製品編集</h1>
          <p className="text-gray-600 mt-2">{product.name}を編集します</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* 基本情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="メーカー"
                required
                {...form.register('brand')}
                options={[
                  { value: "", label: "選択してください" },
                  { value: "KATO", label: "KATO" },
                  { value: "TOMIX", label: "TOMIX" },
                  { value: "マイクロエース", label: "マイクロエース" },
                  { value: "グリーンマックス", label: "グリーンマックス" },
                  { value: "その他", label: "その他" }
                ]}
                error={form.formState.errors.brand?.message}
              />

              <Input
                label="品番"
                {...form.register('productCode')}
                placeholder="例: 10-1234"
                error={form.formState.errors.productCode?.message}
              />

              {/* セット単品の場合のみ親品番を表示 */}
              {form.watch('type') === PRODUCT_TYPE_SET_SINGLE && (
                <Input
                  label="親セット品番"
                  {...form.register('parentCode')}
                  placeholder="例: 10-1000（セット品番）"
                  error={form.formState.errors.parentCode?.message}
                />
              )}

              <div className={form.watch('type') === PRODUCT_TYPE_SET_SINGLE ? "md:col-span-1" : "md:col-span-2"}>
                <Input
                  label="製品名"
                  required
                  {...form.register('name')}
                  placeholder="例: JR 289系電車（こうのとり）基本セット"
                  error={form.formState.errors.name?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  タイプ *
                </label>
                <select
                  {...form.register('type')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  {PRODUCT_TYPES.map((t) => (
                    <option value={t.value}>{t.label}</option>
                  ))}
                </select>
                {form.formState.errors.type && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  発売年
                </label>
                <input
                  type="number"
                  {...form.register('releaseYear', { valueAsNumber: true })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  placeholder="例: 2024"
                  min="1900"
                  max="2030"
                />
              </div>
            </div>
          </div>

          {/* 価格情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">価格情報</h2>
            {isSetSingle && (
              <p className="text-sm text-orange-600 mb-3">
                ℹ️ セット単品の価格は親セットに含まれるため、入力不要です
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  税抜価格（円）
                </label>
                <input
                  type="number"
                  {...form.register('priceExcludingTax', { valueAsNumber: true })}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 ${
                    isSetSingle
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'text-gray-900'
                  }`}
                  placeholder={isSetSingle ? '親セット価格に含まれます' : '例: 15000'}
                  min="0"
                  disabled={isSetSingle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  税込価格（円）
                </label>
                <input
                  type="number"
                  {...form.register('priceIncludingTax', { valueAsNumber: true })}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 ${
                    isSetSingle
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'text-gray-900'
                  }`}
                  placeholder={isSetSingle ? '親セット価格に含まれます' : '例: 16500'}
                  min="0"
                  disabled={isSetSingle}
                />
              </div>
            </div>
          </div>

          {/* 商品情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">商品情報</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  製品画像
                </label>
                <ImageUploader
                  entityType="product"
                  entityId={resolvedParams.id}
                  currentImages={imageUrls}
                  onUploadComplete={(urls) => setImageUrls([...imageUrls, ...urls])}
                  onDelete={(url) => setImageUrls(imageUrls.filter(u => u !== url))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  説明
                </label>
                <textarea
                  {...form.register('description')}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  placeholder="製品の詳細説明を入力してください"
                />
              </div>
            </div>
          </div>

          {/* 実車情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">実車情報</h2>
              <button
                type="button"
                onClick={addRealVehicle}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                実車情報追加
              </button>
            </div>

            {fields.length === 0 ? (
              <p className="text-gray-500 text-center py-4">実車情報を追加してください</p>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">実車情報 {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        削除
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        {...form.register(`realVehicles.${index}.vehicleType`)}
                        placeholder="形式（例: 289-0）"
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <input
                        {...form.register(`realVehicles.${index}.company`)}
                        placeholder="会社（例: JR西日本）"
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <input
                        {...form.register(`realVehicles.${index}.manufacturingYear`)}
                        placeholder="製造年"
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <input
                        {...form.register(`realVehicles.${index}.operationLine`)}
                        placeholder="運用路線"
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <textarea
                        {...form.register(`realVehicles.${index}.notes`)}
                        placeholder="備考"
                        rows={2}
                        className="md:col-span-2 border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* タグ選択 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <ProductFormTagSelector
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
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
              {isSubmitting ? '更新中...' : '製品を更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
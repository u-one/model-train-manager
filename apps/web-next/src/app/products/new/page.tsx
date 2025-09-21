'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, TextArea, Select } from '@/components/ui'
import { productFormSchema, defaultProductValues, type ProductFormData } from '@/lib/validations/product'

export default function NewProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductValues
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'realVehicles'
  })

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    try {
      // 空文字列を undefined に変換
      const cleanedData = {
        ...data,
        releaseYear: data.releaseYear === '' ? undefined : Number(data.releaseYear),
        priceExcludingTax: data.priceExcludingTax === '' ? undefined : Number(data.priceExcludingTax),
        priceIncludingTax: data.priceIncludingTax === '' ? undefined : Number(data.priceIncludingTax),
        imageUrl: data.imageUrl === '' ? undefined : data.imageUrl,
        realVehicles: data.realVehicles?.filter(rv =>
          rv.vehicleType || rv.company || rv.manufacturingYear || rv.operationLine || rv.notes
        )
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      })

      if (response.ok) {
        const newProduct = await response.json()
        router.push(`/products/${newProduct.id}`)
      } else {
        const error = await response.json()
        console.error('Failed to create product:', error)
        alert('製品の作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      alert('製品の作成に失敗しました')
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
          <h1 className="text-3xl font-bold text-gray-900">製品追加</h1>
          <p className="text-gray-600 mt-2">新しい製品情報を登録します</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* 基本情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  メーカー *
                </label>
                <select
                  {...form.register('brand')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">選択してください</option>
                  <option value="KATO">KATO</option>
                  <option value="TOMIX">TOMIX</option>
                  <option value="マイクロエース">マイクロエース</option>
                  <option value="グリーンマックス">グリーンマックス</option>
                  <option value="その他">その他</option>
                </select>
                {form.formState.errors.brand && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.brand.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  品番
                </label>
                <input
                  type="text"
                  {...form.register('productCode')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  placeholder="例: 10-1234"
                />
              </div>

              {/* セット単品の場合のみ親品番を表示 */}
              {form.watch('type') === 'SET_SINGLE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    親セット品番
                  </label>
                  <input
                    type="text"
                    {...form.register('parentCode')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                    placeholder="例: 10-1000（セット品番）"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    この構成車両が属するセット商品の品番を入力してください
                  </p>
                </div>
              )}

              <div className={form.watch('type') === 'SET_SINGLE' ? "md:col-span-1" : "md:col-span-2"}>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  製品名 *
                </label>
                <input
                  type="text"
                  {...form.register('name')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  placeholder="例: JR 289系電車（こうのとり）基本セット"
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  タイプ *
                </label>
                <select
                  {...form.register('type')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="SINGLE">単品</option>
                  <option value="SET">セット</option>
                  <option value="SET_SINGLE">セット単品</option>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  税抜価格（円）
                </label>
                <input
                  type="number"
                  {...form.register('priceExcludingTax', { valueAsNumber: true })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  placeholder="例: 15000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  税込価格（円）
                </label>
                <input
                  type="number"
                  {...form.register('priceIncludingTax', { valueAsNumber: true })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  placeholder="例: 16500"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* 商品情報 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">商品情報</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  画像URL
                </label>
                <input
                  type="url"
                  {...form.register('imageUrl')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  placeholder="https://example.com/image.jpg"
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
              {isSubmitting ? '作成中...' : '製品を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
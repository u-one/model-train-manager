'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ProductFormFields from '@/components/products/ProductFormFields'
import { defaultProductValues, productFormSchema, type ProductFormData } from '@/lib/validations/product'
import { productFormToApiInput } from '@/lib/forms/product'
import { getApiErrorMessage } from '@/lib/forms/api-error'
import { PRODUCT_TYPE_VALUES } from '@/constants/productTypes'

function NewProductForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fromIndependentId, setFromIndependentId] = useState<number | null>(null)
  const [parentSetProductId, setParentSetProductId] = useState<number | null>(null)
  const [autoLink, setAutoLink] = useState(true)
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const form = useForm<ProductFormData>({ resolver: zodResolver(productFormSchema), defaultValues: defaultProductValues })
  const { setValue } = form

  useEffect(() => {
    const type = searchParams.get('type')
    const parentCode = searchParams.get('parentCode')
    const parentSetId = Number(searchParams.get('parentSetId'))
    const brand = searchParams.get('brand')
    const independentId = Number(searchParams.get('fromIndependent'))
    const productType = PRODUCT_TYPE_VALUES.find(value => value === type)
    if (productType) setValue('type', productType)
    if (parentCode) setValue('parentCode', parentCode)
    if (brand) setValue('brand', brand)
    if (Number.isInteger(parentSetId) && parentSetId > 0) setParentSetProductId(parentSetId)

    if (Number.isInteger(independentId) && independentId > 0) {
      setFromIndependentId(independentId)
      void fetch(`/api/owned-vehicles/${independentId}`)
        .then(async response => response.ok ? response.json() : null)
        .then(vehicle => {
          if (!vehicle?.independentVehicle) return
          const source = vehicle.independentVehicle
          if (source.brand) setValue('brand', source.brand)
          if (source.productCode) setValue('productCode', source.productCode)
          if (source.name) setValue('name', source.name)
          if (source.description) setValue('description', source.description)
        })
        .catch(error => console.error('Failed to fetch independent vehicle:', error))
    }
  }, [searchParams, setValue])

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    try {
      const body = productFormToApiInput(data, {
        imageUrls,
        tagIds: selectedTags,
        linkOwnedVehicleId: fromIndependentId && autoLink ? fromIndependentId : undefined,
        setProductIds: parentSetProductId ? [parentSetProductId] : undefined
      })
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!response.ok) {
        alert(await getApiErrorMessage(response, '製品の作成に失敗しました'))
        return
      }
      const product = await response.json()
      router.push(fromIndependentId && autoLink ? `/owned-vehicles/${fromIndependentId}` : `/products/${product.id}`)
    } catch (error) {
      console.error('Product create failed:', error)
      alert('製品の作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <button type="button" onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-4">← 戻る</button>
          <h1 className="text-3xl font-bold text-gray-900">製品追加</h1>
          <p className="text-gray-600 mt-2">新しい製品情報を登録します</p>
        </header>
        {fromIndependentId && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <h2 className="text-sm font-medium text-blue-800">独立車両から製品情報を作成</h2>
            <p className="mt-2 text-sm text-blue-700">車両情報をフォームに自動入力しました。必要に応じて編集してください。</p>
          </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <ProductFormFields
            form={form}
            imageUrls={imageUrls}
            onImageUrlsChange={setImageUrls}
            productId={null}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
          {fromIndependentId && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={autoLink} onChange={event => setAutoLink(event.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <span className="text-sm text-gray-900">作成後、この保有車両と自動リンク</span>
              </label>
              <p className="text-xs text-gray-600 mt-2 ml-6">製品と保有車両の紐付けも同じ保存処理で行います。</p>
            </div>
          )}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">キャンセル</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? '作成中...' : '製品を作成'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewProductPage() {
  return <Suspense fallback={<div className="container mx-auto px-4 py-8">読み込み中...</div>}><NewProductForm /></Suspense>
}

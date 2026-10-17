'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ProductFormFields from '@/components/products/ProductFormFields'
import { productFormSchema, type ProductFormData } from '@/lib/validations/product'
import type { ProductApiOutput } from '@/lib/contracts/api'
import { productFormToApiInput } from '@/lib/forms/product'
import { getApiErrorMessage } from '@/lib/forms/api-error'
import { defaultProductValues } from '@/lib/validations/product'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<ProductApiOutput | null>(null)
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const form = useForm<ProductFormData>({ resolver: zodResolver(productFormSchema), defaultValues: defaultProductValues })

  useEffect(() => {
    let cancelled = false
    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/${id}`)
        if (!response.ok) {
          router.push('/products')
          return
        }
        const data: ProductApiOutput = await response.json()
        if (cancelled) return
        setProduct(data)
        setImageUrls(data.imageUrls ?? [])
        setSelectedTags(data.productTags?.map(productTag => productTag.tagId) ?? [])
        form.reset({
          brand: data.brand,
          productCode: data.productCode ?? '',
          parentCode: data.parentCode ?? '',
          name: data.name,
          type: data.type,
          releaseYear: data.releaseYear ?? undefined,
          priceExcludingTax: data.priceExcludingTax ?? undefined,
          priceIncludingTax: data.priceIncludingTax ?? undefined,
          description: data.description ?? '',
          imageUrls: data.imageUrls ?? [],
          realVehicles: (data.realVehicles ?? []).map(vehicle => ({
            vehicleType: vehicle.vehicleType ?? '',
            company: vehicle.company ?? '',
            manufacturingYear: vehicle.manufacturingYear ?? '',
            operationLine: vehicle.operationLine ?? '',
            notes: vehicle.notes ?? ''
          }))
        })
      } catch (error) {
        console.error('Failed to fetch product:', error)
        router.push('/products')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadProduct()
    return () => { cancelled = true }
  }, [form, id, router])

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productFormToApiInput(data, { imageUrls, tagIds: selectedTags }))
      })
      if (!response.ok) {
        alert(await getApiErrorMessage(response, '製品の更新に失敗しました'))
        return
      }
      router.push(`/products/${id}`)
    } catch (error) {
      console.error('Product update failed:', error)
      alert('製品の更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="container mx-auto px-4 py-8"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" /></div>
  if (!product) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <button type="button" onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-4">← 戻る</button>
          <h1 className="text-3xl font-bold text-gray-900">製品編集</h1>
          <p className="text-gray-600 mt-2">{product.name}を編集します</p>
        </header>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <ProductFormFields form={form} imageUrls={imageUrls} onImageUrlsChange={setImageUrls} productId={id} selectedTags={selectedTags} onTagsChange={setSelectedTags} />
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">キャンセル</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? '更新中...' : '製品を更新'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

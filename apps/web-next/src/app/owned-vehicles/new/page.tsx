'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AuthGuard from '@/components/AuthGuard'
import OwnedVehicleFormFields, { type VehicleProductOption } from '@/components/owned-vehicles/OwnedVehicleFormFields'
import { defaultOwnedVehicleValues, ownedVehicleFormSchema, type OwnedVehicleFormData } from '@/lib/validations/owned-vehicle'
import { ownedVehicleFormToApiInput } from '@/lib/forms/owned-vehicle'
import { getApiErrorMessage } from '@/lib/forms/api-error'

export default function NewOwnedVehiclePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<VehicleProductOption[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [createdVehicleId, setCreatedVehicleId] = useState<number | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const form = useForm<OwnedVehicleFormData>({ resolver: zodResolver(ownedVehicleFormSchema), defaultValues: defaultOwnedVehicleValues })

  useEffect(() => {
    let cancelled = false
    fetch('/api/products?limit=1000')
      .then(async response => response.ok ? response.json() : { products: [] })
      .then(data => { if (!cancelled) setProducts(data.products ?? []) })
      .catch(error => console.error('Failed to fetch products:', error))
      .finally(() => { if (!cancelled) setLoadingProducts(false) })
    return () => { cancelled = true }
  }, [])

  const onSubmit = async (data: OwnedVehicleFormData) => {
    if (createdVehicleId) return
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/owned-vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownedVehicleFormToApiInput(data, imageUrls))
      })
      if (!response.ok) {
        alert(await getApiErrorMessage(response, '保有車両の作成に失敗しました'))
        return
      }
      const vehicle = await response.json()
      setCreatedVehicleId(vehicle.id)
    } catch (error) {
      console.error('Owned vehicle create failed:', error)
      alert('保有車両の作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingProducts) return <AuthGuard requireAuth><div className="container mx-auto px-4 py-8"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" /></div></AuthGuard>

  return (
    <AuthGuard requireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6">
            <button type="button" onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-4">← 戻る</button>
            <h1 className="text-3xl font-bold text-gray-900">保有車両追加</h1>
            <p className="text-gray-600 mt-2">新しい保有車両情報を登録します</p>
          </header>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <OwnedVehicleFormFields form={form} products={products} imageUrls={imageUrls} onImageUrlsChange={setImageUrls} vehicleId={createdVehicleId?.toString()} allowProductCodeMatch />
            {createdVehicleId ? (
              <div className="flex justify-end"><button type="button" onClick={() => router.push(`/owned-vehicles/${createdVehicleId}`)} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">保有車両の詳細へ</button></div>
            ) : (
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">キャンセル</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? '作成中...' : '保有車両を作成'}</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}

'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AuthGuard from '@/components/AuthGuard'
import OwnedVehicleFormFields, { type VehicleProductOption } from '@/components/owned-vehicles/OwnedVehicleFormFields'
import { ownedVehicleFormSchema, type OwnedVehicleFormData } from '@/lib/validations/owned-vehicle'
import type { OwnedVehicleApiOutput } from '@/lib/contracts/api'
import { ownedVehicleFormToApiInput } from '@/lib/forms/owned-vehicle'
import { getApiErrorMessage } from '@/lib/forms/api-error'

export default function EditOwnedVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vehicle, setVehicle] = useState<OwnedVehicleApiOutput | null>(null)
  const [products, setProducts] = useState<VehicleProductOption[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const form = useForm<OwnedVehicleFormData>({
    resolver: zodResolver(ownedVehicleFormSchema),
    defaultValues: {
      managementId: '', vehicleType: 'PRODUCT', productId: undefined, productBrand: '', productCode: '',
      independentVehicle: { name: '', brand: '', vehicleType: '', description: '' },
      currentStatus: 'NORMAL', storageCondition: 'WITH_CASE', purchaseDate: '',
      purchasePriceExcludingTax: undefined, purchasePriceIncludingTax: undefined,
      purchaseStore: '', purchaseCondition: undefined, notes: '', maintenanceNotes: ''
    }
  })
  const { reset } = form

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    let cancelled = false
    async function loadData() {
      try {
        const [vehicleResponse, productsResponse] = await Promise.all([
          fetch(`/api/owned-vehicles/${id}`),
          fetch('/api/products?limit=1000')
        ])
        if (vehicleResponse.status === 401) { router.push('/auth/signin'); return }
        if (vehicleResponse.status === 404 || !vehicleResponse.ok) { router.push('/owned-vehicles'); return }
        const [vehicleData, productsData] = await Promise.all([
          vehicleResponse.json() as Promise<OwnedVehicleApiOutput>,
          productsResponse.ok ? productsResponse.json() : Promise.resolve({ products: [] })
        ])
        if (cancelled) return
        setVehicle(vehicleData)
        setImageUrls(vehicleData.imageUrls ?? [])
        setProducts(productsData.products ?? [])
        reset({
          managementId: vehicleData.managementId,
          vehicleType: vehicleData.product ? 'PRODUCT' : 'INDEPENDENT',
          productId: vehicleData.productId ?? vehicleData.product?.id ?? undefined,
          productBrand: '',
          productCode: '',
          independentVehicle: vehicleData.independentVehicle ? {
            name: vehicleData.independentVehicle.name,
            brand: vehicleData.independentVehicle.brand ?? '',
            vehicleType: vehicleData.independentVehicle.vehicleType ?? '',
            description: vehicleData.independentVehicle.description ?? ''
          } : { name: '', brand: '', vehicleType: '', description: '' },
          currentStatus: vehicleData.currentStatus,
          storageCondition: vehicleData.storageCondition,
          purchaseDate: vehicleData.purchaseDate?.slice(0, 10) ?? '',
          purchasePriceExcludingTax: vehicleData.purchasePriceExcludingTax ?? undefined,
          purchasePriceIncludingTax: vehicleData.purchasePriceIncludingTax ?? undefined,
          purchaseStore: vehicleData.purchaseStore ?? '',
          purchaseCondition: vehicleData.purchaseCondition ?? undefined,
          notes: vehicleData.notes ?? '',
          maintenanceNotes: vehicleData.maintenanceNotes ?? ''
        })
      } catch (error) {
        console.error('Failed to fetch owned vehicle:', error)
        router.push('/owned-vehicles')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadData()
    return () => { cancelled = true }
  }, [id, reset, router, session, status])

  const onSubmit = async (data: OwnedVehicleFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/owned-vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownedVehicleFormToApiInput(data, imageUrls))
      })
      if (!response.ok) {
        alert(await getApiErrorMessage(response, '保有車両の更新に失敗しました'))
        return
      }
      router.push(`/owned-vehicles/${id}`)
    } catch (error) {
      console.error('Owned vehicle update failed:', error)
      alert('保有車両の更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || loading) return <AuthGuard requireAuth><div className="container mx-auto px-4 py-8"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" /></div></AuthGuard>
  if (!session || !vehicle) return null
  const vehicleName = vehicle.product?.name || vehicle.independentVehicle?.name || '名称未設定'

  return (
    <AuthGuard requireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6">
            <button type="button" onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-4">← 戻る</button>
            <h1 className="text-3xl font-bold text-gray-900">保有車両編集</h1>
            <p className="text-gray-600 mt-2">{vehicle.managementId} - {vehicleName}を編集します</p>
          </header>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <OwnedVehicleFormFields form={form} products={products} imageUrls={imageUrls} onImageUrlsChange={setImageUrls} vehicleId={id} />
            <div className="flex justify-end space-x-4">
              <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">キャンセル</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? '更新中...' : '保有車両を更新'}</button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}

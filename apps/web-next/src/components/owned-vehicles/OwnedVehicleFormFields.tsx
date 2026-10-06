'use client'

import type { UseFormReturn } from 'react-hook-form'
import ImageUploader from '@/components/ImageUploader'
import type { OwnedVehicleFormData } from '@/lib/validations/owned-vehicle'

export interface VehicleProductOption {
  id: number
  name: string
  brand: string
  productCode: string | null
  type: string
}

interface OwnedVehicleFormFieldsProps {
  form: UseFormReturn<OwnedVehicleFormData>
  products: VehicleProductOption[]
  imageUrls: string[]
  onImageUrlsChange: (update: (current: string[]) => string[]) => void
  vehicleId?: string | null
  allowProductCodeMatch?: boolean
}

const statusLabels = { NORMAL: '正常', NEEDS_REPAIR: '要修理', BROKEN: '故障中' }
const storageLabels = { WITH_CASE: 'ケースあり', WITHOUT_CASE: 'ケースなし' }
const purchaseConditionLabels = { NEW: '新品', USED: '中古' }

export default function OwnedVehicleFormFields({
  form,
  products,
  imageUrls,
  onImageUrlsChange,
  vehicleId,
  allowProductCodeMatch = false
}: OwnedVehicleFormFieldsProps) {
  const vehicleType = form.watch('vehicleType')
  return (
    <>
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="management-id" className="block text-sm font-medium text-gray-900 mb-1">管理ID</label>
            <input id="management-id" {...form.register('managementId')} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="例: MY-001（省略可）" />
            {form.formState.errors.managementId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.managementId.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label htmlFor="vehicle-type" className="block text-sm font-medium text-gray-900 mb-1">車両タイプ *</label>
            <select id="vehicle-type" {...form.register('vehicleType')} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="PRODUCT">製品から選択</option><option value="INDEPENDENT">独立記録</option>
            </select>
            {form.formState.errors.vehicleType && <p className="text-red-500 text-sm mt-1">{form.formState.errors.vehicleType.message}</p>}
          </div>
          {vehicleType === 'PRODUCT' && (
            <>
              {allowProductCodeMatch && <>
                <div>
                  <label htmlFor="product-brand" className="block text-sm font-medium text-gray-900 mb-1">メーカー</label>
                  <input id="product-brand" {...form.register('productBrand')} list="vehicle-product-brands" className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="メーカー名" />
                  <datalist id="vehicle-product-brands">{[...new Set(products.map(product => product.brand))].map(brand => <option key={brand} value={brand} />)}</datalist>
                </div>
                <div>
                  <label htmlFor="product-code" className="block text-sm font-medium text-gray-900 mb-1">品番</label>
                  <input id="product-code" {...form.register('productCode')} list="vehicle-product-codes" className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="品番" />
                  <datalist id="vehicle-product-codes">{products.filter(product => product.productCode).map(product => <option key={product.id} value={product.productCode ?? ''}>{product.brand} {product.name}</option>)}</datalist>
                </div>
              </>}
              <div className="md:col-span-2">
                <label htmlFor="product-id" className="block text-sm font-medium text-gray-900 mb-1">製品選択 *</label>
                <select id="product-id" {...form.register('productId', { valueAsNumber: true })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">製品を選択してください</option>
                  {products.map(product => <option key={product.id} value={product.id}>{product.brand} - {product.name} {product.productCode && `(${product.productCode})`}</option>)}
                </select>
                {form.formState.errors.productId && <p className="text-red-500 text-sm mt-1">{form.formState.errors.productId.message}</p>}
                {allowProductCodeMatch && <p className="text-sm text-gray-500 mt-1">メーカー・品番を両方入力した場合は製品IDより優先します。</p>}
              </div>
            </>
          )}
          {vehicleType === 'INDEPENDENT' && <>
            <div className="md:col-span-2">
              <label htmlFor="independent-name" className="block text-sm font-medium text-gray-900 mb-1">車両名 *</label>
              <input id="independent-name" {...form.register('independentVehicle.name')} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="例: 289系電車（こうのとり）" />
              {form.formState.errors.independentVehicle?.name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.independentVehicle.name.message}</p>}
            </div>
            <div>
              <label htmlFor="independent-brand" className="block text-sm font-medium text-gray-900 mb-1">ブランド</label>
              <input id="independent-brand" {...form.register('independentVehicle.brand')} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="例: KATO" />
            </div>
            <div>
              <label htmlFor="independent-type" className="block text-sm font-medium text-gray-900 mb-1">形式</label>
              <input id="independent-type" {...form.register('independentVehicle.vehicleType')} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="例: 289-0" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="independent-description" className="block text-sm font-medium text-gray-900 mb-1">説明</label>
              <textarea id="independent-description" {...form.register('independentVehicle.description')} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="車両の詳細説明" />
            </div>
          </>}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">状態情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="current-status" className="block text-sm font-medium text-gray-900 mb-1">現在の状態 *</label>
            <select id="current-status" {...form.register('currentStatus')} className="w-full border border-gray-300 rounded-md px-3 py-2">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            {form.formState.errors.currentStatus && <p className="text-red-500 text-sm mt-1">{form.formState.errors.currentStatus.message}</p>}
          </div>
          <div><label htmlFor="storage-condition" className="block text-sm font-medium text-gray-900 mb-1">保管状態 *</label>
            <select id="storage-condition" {...form.register('storageCondition')} className="w-full border border-gray-300 rounded-md px-3 py-2">{Object.entries(storageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            {form.formState.errors.storageCondition && <p className="text-red-500 text-sm mt-1">{form.formState.errors.storageCondition.message}</p>}
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">購入情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="purchase-date" className="block text-sm font-medium text-gray-900 mb-1">購入日</label><input id="purchase-date" type="date" {...form.register('purchaseDate')} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
          <div><label htmlFor="purchase-condition" className="block text-sm font-medium text-gray-900 mb-1">購入時状態</label>
            <select id="purchase-condition" {...form.register('purchaseCondition')} className="w-full border border-gray-300 rounded-md px-3 py-2"><option value="">選択してください</option>{Object.entries(purchaseConditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </div>
          <div><label htmlFor="purchase-price-ex-tax" className="block text-sm font-medium text-gray-900 mb-1">購入価格（税抜）（円）</label><input id="purchase-price-ex-tax" type="number" {...form.register('purchasePriceExcludingTax', { valueAsNumber: true })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="例: 15000" min="0" step="1" /></div>
          <div><label htmlFor="purchase-price-in-tax" className="block text-sm font-medium text-gray-900 mb-1">購入価格（税込）（円）</label><input id="purchase-price-in-tax" type="number" {...form.register('purchasePriceIncludingTax', { valueAsNumber: true })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="例: 16500" min="0" step="1" /></div>
          <div className="md:col-span-2"><label htmlFor="purchase-store" className="block text-sm font-medium text-gray-900 mb-1">購入店</label><input id="purchase-store" {...form.register('purchaseStore')} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="例: ヨドバシカメラ" /></div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">メモ</h2>
        <div className="space-y-4">
          <div><label htmlFor="vehicle-notes" className="block text-sm font-medium text-gray-900 mb-1">一般メモ</label><textarea id="vehicle-notes" {...form.register('notes')} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="一般的なメモを入力してください" /></div>
          <div><label htmlFor="maintenance-notes" className="block text-sm font-medium text-gray-900 mb-1">整備メモ</label><textarea id="maintenance-notes" {...form.register('maintenanceNotes')} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="整備に関するメモを入力してください" /></div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">車両画像</h2>
        {vehicleId ? <ImageUploader entityType="owned-vehicle" entityId={vehicleId} currentImages={imageUrls} onUploadComplete={urls => onImageUrlsChange(current => [...new Set([...current, ...urls])])} onDelete={url => onImageUrlsChange(current => current.filter(item => item !== url))} /> : <p className="text-sm text-gray-500">ℹ️ 保有車両を作成後に画像をアップロードできます</p>}
      </section>
    </>
  )
}

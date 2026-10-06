'use client'

import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import ImageUploader from '@/components/ImageUploader'
import ProductFormTagSelector from '@/components/ProductFormTagSelector'
import type { ProductFormData } from '@/lib/validations/product'

interface ProductFormFieldsProps {
  form: UseFormReturn<ProductFormData>
  imageUrls: string[]
  onImageUrlsChange: (update: (current: string[]) => string[]) => void
  productId?: string | null
  selectedTags: number[]
  onTagsChange: (tagIds: number[]) => void
}

const brands = ['KATO', 'TOMIX', 'マイクロエース', 'グリーンマックス', 'その他']

export default function ProductFormFields({
  form,
  imageUrls,
  onImageUrlsChange,
  productId,
  selectedTags,
  onTagsChange
}: ProductFormFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'realVehicles' })
  const isSetSingle = form.watch('type') === 'SET_SINGLE'

  return (
    <>
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="product-brand">メーカー *</label>
            <select id="product-brand" {...form.register('brand')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900">
              <option value="">選択してください</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
            {form.formState.errors.brand && <p className="text-red-500 text-sm mt-1">{form.formState.errors.brand.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="product-code">品番</label>
            <input id="product-code" {...form.register('productCode')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900" placeholder="例: 10-1234" />
          </div>
          {isSetSingle && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="parent-code">親セット品番</label>
              <input id="parent-code" {...form.register('parentCode')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900" placeholder="例: 10-1000（セット品番）" />
              <p className="text-sm text-gray-600 mt-1">構成先のセット品番です。複数セットに所属させる場合はAPIからセットIDを指定できます。</p>
            </div>
          )}
          <div className={isSetSingle ? 'md:col-span-1' : 'md:col-span-2'}>
            <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="product-name">製品名 *</label>
            <input id="product-name" {...form.register('name')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900" placeholder="例: JR 289系電車（こうのとり）基本セット" />
            {form.formState.errors.name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="product-type">タイプ *</label>
            <select id="product-type" {...form.register('type')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900">
              <option value="SINGLE">単品</option><option value="SET">セット</option><option value="SET_SINGLE">セット単品</option>
            </select>
            {form.formState.errors.type && <p className="text-red-500 text-sm mt-1">{form.formState.errors.type.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="release-year">発売年</label>
            <input id="release-year" type="number" {...form.register('releaseYear', { valueAsNumber: true })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900" placeholder="例: 2024" min="1900" max="2030" step="1" />
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">価格情報</h2>
        {isSetSingle && <p className="text-sm text-orange-600 mb-3">ℹ️ セット単品の価格は親セットに含まれるため、入力不要です</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['priceExcludingTax', 'priceIncludingTax'] as const).map((field, index) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor={field}>{index === 0 ? '税抜価格（円）' : '税込価格（円）'}</label>
              <input id={field} type="number" {...form.register(field, { valueAsNumber: true })} className={`w-full border border-gray-300 rounded-md px-3 py-2 ${isSetSingle ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'text-gray-900'}`} placeholder={isSetSingle ? '親セット価格に含まれます' : index === 0 ? '例: 15000' : '例: 16500'} min="0" step="1" disabled={isSetSingle} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">商品情報</h2>
        <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="product-description">説明</label>
        <textarea id="product-description" {...form.register('description')} rows={4} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900" placeholder="製品の詳細説明を入力してください" />
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">製品画像</label>
          {productId ? (
            <ImageUploader entityType="product" entityId={productId} currentImages={imageUrls} onUploadComplete={urls => onImageUrlsChange(current => [...new Set([...current, ...urls])])} onDelete={url => onImageUrlsChange(current => current.filter(item => item !== url))} />
          ) : <p className="text-sm text-gray-500">ℹ️ 製品を作成後に画像をアップロードできます</p>}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">実車情報</h2>
          <button type="button" onClick={() => append({ vehicleType: '', company: '', manufacturingYear: '', operationLine: '', notes: '' })} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">実車情報追加</button>
        </div>
        {fields.length === 0 ? <p className="text-gray-500 text-center py-4">実車情報を追加してください</p> : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <fieldset key={field.id} className="border rounded-lg p-4">
                <legend className="sr-only">実車情報 {index + 1}</legend>
                <div className="flex justify-between items-center mb-3"><h3 className="font-medium">実車情報 {index + 1}</h3><button type="button" onClick={() => remove(index)} className="text-red-600 hover:text-red-800 text-sm">削除</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input aria-label={`実車情報 ${index + 1} 形式`} {...form.register(`realVehicles.${index}.vehicleType`)} placeholder="形式（例: 289-0）" className="border border-gray-300 rounded px-3 py-2" />
                  <input aria-label={`実車情報 ${index + 1} 会社`} {...form.register(`realVehicles.${index}.company`)} placeholder="会社（例: JR西日本）" className="border border-gray-300 rounded px-3 py-2" />
                  <input aria-label={`実車情報 ${index + 1} 製造年`} {...form.register(`realVehicles.${index}.manufacturingYear`)} placeholder="製造年" className="border border-gray-300 rounded px-3 py-2" />
                  <input aria-label={`実車情報 ${index + 1} 運用路線`} {...form.register(`realVehicles.${index}.operationLine`)} placeholder="運用路線" className="border border-gray-300 rounded px-3 py-2" />
                  <textarea aria-label={`実車情報 ${index + 1} 備考`} {...form.register(`realVehicles.${index}.notes`)} placeholder="備考" rows={2} className="md:col-span-2 border border-gray-300 rounded px-3 py-2" />
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <ProductFormTagSelector selectedTags={selectedTags} onTagsChange={onTagsChange} />
      </section>
    </>
  )
}

import type { ProductFormData } from '@/lib/validations/product'

export function productFormToApiInput(
  data: ProductFormData,
  options: { imageUrls: string[]; tagIds: number[]; linkOwnedVehicleId?: number; setProductIds?: number[] }
) {
  const realVehicles = (data.realVehicles ?? [])
    .filter(vehicle => Object.values(vehicle).some(value => Boolean(value?.trim())))
    .map(vehicle => ({
      vehicleType: vehicle.vehicleType?.trim() || null,
      company: vehicle.company?.trim() || null,
      manufacturingYear: vehicle.manufacturingYear?.trim() || null,
      operationLine: vehicle.operationLine?.trim() || null,
      notes: vehicle.notes?.trim() || null
    }))

  return {
    brand: data.brand.trim(),
    productCode: data.productCode?.trim() || null,
    parentCode: data.parentCode?.trim() || null,
    name: data.name.trim(),
    type: data.type,
    releaseYear: Number.isInteger(data.releaseYear) ? data.releaseYear : null,
    priceExcludingTax: Number.isInteger(data.priceExcludingTax) ? data.priceExcludingTax : null,
    priceIncludingTax: Number.isInteger(data.priceIncludingTax) ? data.priceIncludingTax : null,
    description: data.description?.trim() || null,
    imageUrls: [...options.imageUrls],
    realVehicles,
    tagIds: [...new Set(options.tagIds)],
    ...(options.linkOwnedVehicleId ? { linkOwnedVehicleId: options.linkOwnedVehicleId } : {}),
    ...(options.setProductIds ? { setProductIds: [...new Set(options.setProductIds)] } : {})
  }
}

import type { OwnedVehicleFormData } from '@/lib/validations/owned-vehicle'

export function ownedVehicleFormToApiInput(data: OwnedVehicleFormData, imageUrls: string[]) {
  const isProduct = data.vehicleType === 'PRODUCT'
  return {
    managementId: data.managementId?.trim() ?? '',
    vehicleType: data.vehicleType,
    ...(isProduct ? {
      productId: Number.isInteger(data.productId) ? data.productId : undefined,
      productBrand: data.productBrand?.trim() || undefined,
      productCode: data.productCode?.trim() || undefined
    } : {
      independentVehicle: {
        name: data.independentVehicle?.name?.trim() ?? '',
        brand: data.independentVehicle?.brand?.trim() || null,
        productCode: null,
        vehicleType: data.independentVehicle?.vehicleType?.trim() || null,
        description: data.independentVehicle?.description?.trim() || null
      }
    }),
    currentStatus: data.currentStatus,
    storageCondition: data.storageCondition,
    purchaseDate: data.purchaseDate || null,
    purchasePriceExcludingTax: Number.isInteger(data.purchasePriceExcludingTax) ? data.purchasePriceExcludingTax : null,
    purchasePriceIncludingTax: Number.isInteger(data.purchasePriceIncludingTax) ? data.purchasePriceIncludingTax : null,
    purchaseStore: data.purchaseStore?.trim() || null,
    purchaseCondition: data.purchaseCondition || null,
    notes: data.notes?.trim() || null,
    maintenanceNotes: data.maintenanceNotes?.trim() || null,
    imageUrls: imageUrls.filter(url => url.trim() !== '')
  }
}

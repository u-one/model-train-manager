import type { ProductApiOutput, OwnedVehicleApiOutput, TagApiOutput } from '@/lib/contracts/api'

export type Tag = Pick<TagApiOutput, 'id' | 'name' | 'category'>
export type ProductTag = { tag: Tag }
export type OwnedVehicleProduct = Omit<Pick<ProductApiOutput, 'id' | 'name' | 'brand' | 'productCode' | 'type' | 'productTags'>, 'productTags'> & {
  productTags?: ProductTag[]
}
export type Product = Pick<ProductApiOutput, 'id' | 'brand' | 'productCode' | 'name' | 'type' | 'priceIncludingTax' | 'imageUrls'> &
  Partial<Pick<ProductApiOutput, '_count'>> & { productTags?: ProductTag[] }
export type OwnedVehicle = Pick<OwnedVehicleApiOutput, 'id' | 'managementId' | 'currentStatus' | 'storageCondition' | 'purchaseDate' | 'purchasePriceIncludingTax' | 'notes' | 'imageUrls'> & {
  product?: OwnedVehicleProduct | null
  independentVehicle?: Pick<NonNullable<OwnedVehicleApiOutput['independentVehicle']>, 'name' | 'brand' | 'vehicleType'> | null
}

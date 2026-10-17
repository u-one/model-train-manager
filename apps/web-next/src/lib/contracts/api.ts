export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export interface ApiErrorResponse {
  error: string
  code: ApiErrorCode
  details?: unknown
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type Jsonify<T> = T extends Date ? string
  : T extends (infer U)[] ? Jsonify<U>[]
  : T extends object ? { [K in keyof T]: Jsonify<T[K]> }
  : T

export interface PaginationApiOutput {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface TagApiOutput {
  id: number
  name: string
  category: string
  description?: string | null
}

export interface AdminTagApiOutput extends TagApiOutput {
  createdAt: string
  updatedAt: string
  _count?: { productTags: number }
}

export interface TagListApiOutput {
  tags: TagApiOutput[]
  total: number
  categories: Array<{ category: string; count: number }>
}

export interface RealVehicleApiOutput {
  id: number
  productId: number
  vehicleType: string | null
  company: string | null
  manufacturingYear: string | null
  operationLine: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ProductApiOutput {
  id: number
  brand: string
  productCode: string | null
  parentCode: string | null
  type: 'SINGLE' | 'SET' | 'SET_SINGLE'
  name: string
  releaseYear: number | null
  priceExcludingTax: number | null
  priceIncludingTax: number | null
  janCode: string | null
  description: string | null
  tags: string[]
  vehicleCount: number
  url: string | null
  icon: string | null
  createdByUserId: number | null
  createdAt: string
  updatedAt: string
  imageUrls: string[]
  realVehicles?: RealVehicleApiOutput[]
  productTags?: Array<{ productId: number; tagId: number; createdAt: string; tag: TagApiOutput }>
  _count?: { ownedVehicles: number }
  createdByUser?: { id: number; name: string | null } | null
  ownedVehicles?: Array<Pick<OwnedVehicleApiOutput, 'id' | 'userId' | 'managementId' | 'currentStatus' | 'storageCondition'> & { user?: { id: number; name: string | null } }>
}

export interface OwnedVehicleApiOutput {
  id: number
  userId: number
  managementId: string
  productId: number | null
  parentSetOwnedVehicleId?: number | null
  purchaseDate: string | null
  purchasePriceExcludingTax: number | null
  purchasePriceIncludingTax: number | null
  purchaseStore: string | null
  purchaseCondition: 'NEW' | 'USED' | null
  currentStatus: 'NORMAL' | 'NEEDS_REPAIR' | 'BROKEN'
  storageCondition: 'WITH_CASE' | 'WITHOUT_CASE'
  maintenanceNotes: string | null
  notes: string | null
  imageUrls: string[]
  createdAt: string
  updatedAt: string
  product?: ProductApiOutput | null
  independentVehicle?: {
    id: number
    ownedVehicleId: number
    brand: string | null
    productCode: string | null
    name: string
    vehicleType: string | null
    description: string | null
    createdAt: string
    updatedAt: string
  } | null
  maintenanceRecords?: Array<{
    id: number
    ownedVehicleId: number
    maintenanceDate: string
    content: string
    createdAt: string
    updatedAt: string
  }>
  componentOwnedVehicles?: Array<Pick<OwnedVehicleApiOutput, 'id' | 'managementId'> & { product: Pick<ProductApiOutput, 'id' | 'name' | 'brand'> | null }>
}

export interface ProductListApiOutput {
  products: ProductApiOutput[]
  pagination: PaginationApiOutput
}

export type ProductDetailApiOutput = ProductApiOutput & {
  realVehicles: RealVehicleApiOutput[]
  ownedVehicles: NonNullable<ProductApiOutput['ownedVehicles']>
  productTags: NonNullable<ProductApiOutput['productTags']>
}

export interface OwnedVehicleListApiOutput {
  ownedVehicles: OwnedVehicleApiOutput[]
  pagination: PaginationApiOutput
}

export interface AdminOwnedVehicleListApiOutput {
  ownedVehicles: AdminOwnedVehicleApiOutput[]
  pagination: PaginationApiOutput
}

export type OwnedVehicleDetailApiOutput = OwnedVehicleApiOutput & {
  maintenanceRecords: NonNullable<OwnedVehicleApiOutput['maintenanceRecords']>
}

export type AdminOwnedVehicleApiOutput = Omit<OwnedVehicleApiOutput, 'product'> & {
  user: { name: string | null; email: string | null }
  product: Pick<ProductApiOutput, 'brand' | 'productCode' | 'name' | 'type'> | null
}

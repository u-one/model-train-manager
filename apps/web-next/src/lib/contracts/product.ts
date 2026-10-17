import { z } from 'zod'
import { PRODUCT_TYPE_VALUES } from '@/constants/productTypes'

const optionalText = z.string().trim().max(5000).nullable().optional()
const optionalInteger = z.number().int().min(0).nullable().optional()

export const realVehicleInputSchema = z.object({
  vehicleType: optionalText,
  company: optionalText,
  manufacturingYear: z.string().trim().max(50).nullable().optional(),
  operationLine: z.string().trim().max(100).nullable().optional(),
  notes: optionalText
}).strict()

export const productInputSchema = z.object({
  brand: z.string().trim().min(1).max(100),
  productCode: z.string().trim().max(100).nullable().optional(),
  parentCode: z.string().trim().max(100).nullable().optional(),
  type: z.enum(PRODUCT_TYPE_VALUES),
  name: z.string().trim().min(1).max(500),
  releaseYear: z.number().int().min(1800).max(2200).nullable().optional(),
  priceExcludingTax: optionalInteger,
  priceIncludingTax: optionalInteger,
  janCode: z.string().trim().max(50).nullable().optional(),
  description: optionalText,
  vehicleCount: z.number().int().min(1).max(10000).optional(),
  url: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(100).nullable().optional(),
  imageUrls: z.array(z.string().trim().min(1).max(2048)).max(100).optional(),
  realVehicles: z.array(realVehicleInputSchema).max(100).optional(),
  tagIds: z.array(z.number().int().positive()).max(100).optional(),
  setProductIds: z.array(z.number().int().positive()).max(100).optional(),
  linkOwnedVehicleId: z.number().int().positive().optional()
}).strict()

export type ProductInput = z.infer<typeof productInputSchema>

export function productInputToCreateData(input: ProductInput) {
  return {
    brand: input.brand,
    productCode: input.productCode || null,
    parentCode: input.parentCode || null,
    type: input.type,
    name: input.name,
    releaseYear: input.releaseYear ?? null,
    priceExcludingTax: input.priceExcludingTax ?? null,
    priceIncludingTax: input.priceIncludingTax ?? null,
    janCode: input.janCode || null,
    description: input.description || null,
    vehicleCount: input.vehicleCount ?? 1,
    url: input.url || null,
    icon: input.icon || null,
    imageUrls: input.imageUrls ?? []
  }
}

export function productInputToUpdateData(input: ProductInput) {
  return productInputToCreateData(input)
}

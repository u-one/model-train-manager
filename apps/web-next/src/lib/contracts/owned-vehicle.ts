import { z } from 'zod'

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, '日付は YYYY-MM-DD 形式で入力してください')

const optionalText = z.string().trim().max(5000).nullable().optional()
const optionalPrice = z.number().int().min(0).nullable().optional()

export const independentVehicleInputSchema = z.object({
  name: z.string().trim().min(1).max(500),
  brand: z.string().trim().max(100).nullable().optional(),
  productCode: z.string().trim().max(100).nullable().optional(),
  vehicleType: z.string().trim().max(100).nullable().optional(),
  description: optionalText
}).strict()

export const ownedVehicleInputSchema = z.object({
  managementId: z.string().trim().max(100).optional(),
  vehicleType: z.enum(['PRODUCT', 'INDEPENDENT']),
  productId: z.number().int().positive().nullable().optional(),
  productBrand: z.string().trim().min(1).max(100).optional(),
  productCode: z.string().trim().min(1).max(100).optional(),
  independentVehicle: independentVehicleInputSchema.optional(),
  currentStatus: z.enum(['NORMAL', 'NEEDS_REPAIR', 'BROKEN']),
  storageCondition: z.enum(['WITH_CASE', 'WITHOUT_CASE']),
  purchaseDate: dateOnly.nullable().optional(),
  purchasePriceExcludingTax: optionalPrice,
  purchasePriceIncludingTax: optionalPrice,
  purchaseStore: z.string().trim().max(200).nullable().optional(),
  purchaseCondition: z.enum(['NEW', 'USED']).nullable().optional(),
  notes: optionalText,
  maintenanceNotes: optionalText,
  imageUrls: z.array(z.string().trim().min(1).max(2048)).max(100).optional()
}).strict().superRefine((data, context) => {
  if (data.vehicleType === 'PRODUCT' && !data.productId && !(data.productBrand && data.productCode)) {
    context.addIssue({ code: 'custom', path: ['productId'], message: '製品IDまたはメーカー・品番が必要です' })
  }
  if (data.vehicleType === 'INDEPENDENT' && !data.independentVehicle) {
    context.addIssue({ code: 'custom', path: ['independentVehicle'], message: '独立車両情報が必要です' })
  }
})

export type OwnedVehicleInput = z.infer<typeof ownedVehicleInputSchema>

export function ownedVehicleInputToData(input: OwnedVehicleInput, userId: number) {
  return {
    userId,
    managementId: input.managementId ?? '',
    productId: input.vehicleType === 'PRODUCT' ? input.productId ?? null : null,
    purchaseDate: input.purchaseDate ? new Date(`${input.purchaseDate}T00:00:00.000Z`) : null,
    purchasePriceExcludingTax: input.purchasePriceExcludingTax ?? null,
    purchasePriceIncludingTax: input.purchasePriceIncludingTax ?? null,
    purchaseStore: input.purchaseStore || null,
    purchaseCondition: input.purchaseCondition ?? null,
    currentStatus: input.currentStatus,
    storageCondition: input.storageCondition,
    maintenanceNotes: input.maintenanceNotes || null,
    notes: input.notes || null,
    imageUrls: input.imageUrls ?? []
  }
}

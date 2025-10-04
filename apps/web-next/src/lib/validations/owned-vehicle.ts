import { z } from 'zod'

export const ownedVehicleFormSchema = z.object({
  // 管理情報
  managementId: z.string().optional().default(''),

  // 車両選択（製品IDまたは独立車両情報）
  vehicleType: z.enum(['PRODUCT', 'INDEPENDENT'], {
    message: '車両タイプを選択してください'
  }),
  productId: z.number().optional(),
  productBrand: z.string().optional(),
  productCode: z.string().optional(),

  // 独立車両情報（車両タイプがINDEPENDENTの場合のみ）
  independentVehicle: z.object({
    name: z.string().optional(),
    brand: z.string().optional(),
    vehicleType: z.string().optional(),
    description: z.string().optional()
  }).optional(),

  // 状態情報
  currentStatus: z.enum(['NORMAL', 'NEEDS_REPAIR', 'BROKEN'], {
    message: '現在の状態を選択してください'
  }),
  storageCondition: z.enum(['WITH_CASE', 'WITHOUT_CASE'], {
    message: '保管状態を選択してください'
  }),

  // 購入情報
  purchaseDate: z.string().optional(),
  purchasePriceExcludingTax: z.number().min(0, '価格は0以上で入力してください').optional().or(z.nan()),
  purchasePriceIncludingTax: z.number().min(0, '価格は0以上で入力してください').optional().or(z.nan()),
  purchaseStore: z.string().optional(),
  purchaseCondition: z.enum(['NEW', 'USED']).optional().or(z.literal('')),

  // メモ
  notes: z.string().optional(),
  maintenanceNotes: z.string().optional()
}).refine((data) => {
  // 製品選択時はproductIdまたは（productBrand + productCode）が必須
  if (data.vehicleType === 'PRODUCT') {
    const hasProductId = data.productId !== undefined && data.productId !== null
    const hasBrandAndCode = data.productBrand?.trim() && data.productCode?.trim()
    return hasProductId || hasBrandAndCode
  }
  // 独立車両選択時は車両名が必須
  if (data.vehicleType === 'INDEPENDENT') {
    return data.independentVehicle?.name && data.independentVehicle.name.trim().length > 0
  }
  return true
}, {
  message: "製品選択時は製品ID、またはメーカー・品番を入力してください。独立記録時は車両名を入力してください",
  path: ["vehicleType"]
})

export type OwnedVehicleFormData = z.infer<typeof ownedVehicleFormSchema>

// 初期値
export const defaultOwnedVehicleValues = {
  managementId: '',
  vehicleType: 'PRODUCT' as const,
  productId: undefined,
  productBrand: '',
  productCode: '',
  independentVehicle: {
    name: '',
    brand: '',
    vehicleType: '',
    description: ''
  },
  currentStatus: 'NORMAL' as const,
  storageCondition: 'WITH_CASE' as const,
  purchaseDate: '',
  purchasePriceExcludingTax: undefined,
  purchasePriceIncludingTax: undefined,
  purchaseStore: '',
  purchaseCondition: undefined,
  notes: '',
  maintenanceNotes: ''
}
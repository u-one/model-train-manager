import { z } from 'zod'

export const ownedVehicleFormSchema = z.object({
  // 管理情報
  managementId: z.string().min(1, '管理IDは必須です'),

  // 車両選択（製品IDまたは独立車両情報）
  vehicleType: z.enum(['PRODUCT', 'INDEPENDENT'], {
    message: '車両タイプを選択してください'
  }),
  productId: z.number().optional(),

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
  purchasePriceExcludingTax: z.union([z.number().min(0, '価格は0以上で入力してください'), z.string().length(0)]).optional(),
  purchasePriceIncludingTax: z.union([z.number().min(0, '価格は0以上で入力してください'), z.string().length(0)]).optional(),
  purchaseStore: z.string().optional(),
  purchaseCondition: z.enum(['NEW', 'USED']).optional(),

  // メモ
  notes: z.string().optional(),
  maintenanceNotes: z.string().optional()
}).refine((data) => {
  // 製品選択時はproductIdが必須
  if (data.vehicleType === 'PRODUCT') {
    return data.productId !== undefined && data.productId !== null
  }
  // 独立車両選択時は車両名が必須
  if (data.vehicleType === 'INDEPENDENT') {
    return data.independentVehicle?.name && data.independentVehicle.name.trim().length > 0
  }
  return true
}, {
  message: "製品選択時は製品を選択し、独立記録時は車両名を入力してください",
  path: ["vehicleType"]
})

export type OwnedVehicleFormData = z.infer<typeof ownedVehicleFormSchema>

// 初期値
export const defaultOwnedVehicleValues = {
  managementId: '',
  vehicleType: 'PRODUCT' as const,
  productId: undefined,
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
import { z } from 'zod'
import { PRODUCT_TYPE_VALUES, PRODUCT_TYPE_SINGLE } from '@/constants/productTypes'  

export const productFormSchema = z.object({
  // 基本情報
  brand: z.string().min(1, 'メーカーは必須です'),
  productCode: z.string().optional(),
  parentCode: z.string().optional(),
  name: z.string().min(1, '製品名は必須です'),
  type: z.enum(PRODUCT_TYPE_VALUES, {
    message: 'タイプを選択してください'
  }),
  releaseYear: z.number().int().min(1900).max(2030).optional().or(z.nan()),

  // 価格情報
  priceExcludingTax: z.number().int().min(0, '価格は0以上の整数で入力してください').optional().or(z.nan()),
  priceIncludingTax: z.number().int().min(0, '価格は0以上の整数で入力してください').optional().or(z.nan()),

  // 商品情報
  description: z.string().optional(),
  imageUrls: z.array(z.string().trim().min(1).max(2048)).optional(),

  // 実車情報
  realVehicles: z.array(z.object({
    vehicleType: z.string().optional(),
    company: z.string().optional(),
    manufacturingYear: z.string().optional(),
    operationLine: z.string().optional(),
    notes: z.string().optional()
  })).optional()
})

export type ProductFormData = z.infer<typeof productFormSchema>

// 初期値
export const defaultProductValues: Partial<ProductFormData> = {
  brand: '',
  productCode: '',
  parentCode: '',
  name: '',
  type: PRODUCT_TYPE_SINGLE,
  releaseYear: undefined,
  priceExcludingTax: undefined,
  priceIncludingTax: undefined,
  description: '',
  imageUrls: [],
  realVehicles: []
}

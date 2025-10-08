/**
 * 製品種別
 */

export const PRODUCT_TYPE_SINGLE = 'SINGLE'
export const PRODUCT_TYPE_SET = 'SET'
export const PRODUCT_TYPE_SET_SINGLE = 'SET_SINGLE'

export const PRODUCT_TYPES = [
  { value: PRODUCT_TYPE_SINGLE, label: '単品' },
  { value: PRODUCT_TYPE_SET, label: 'セット' },
  { value: PRODUCT_TYPE_SET_SINGLE, label: 'セット単品' }
]

export const PRODUCT_TYPE_VALUES = PRODUCT_TYPES.map((t) => t.value)
export const PRODUCT_TYPE_LABELS = PRODUCT_TYPES.map((t) => t.label)

/**
 * 製品種別からラベルを取得
 */
export function getProductTypeLabel(type: string): string {
  return PRODUCT_TYPES.find(t => t.value === type)?.label || type
}

/**
 * 製品種別カラー定義
 */
export const PRODUCT_TYPE_COLORS: Record<string, string> = {
  SINGLE: 'bg-blue-100 text-blue-700',
  SET: 'bg-red-100 text-red-700',
  SET_SINGLE: 'bg-yellow-100 text-yellow-700'
}

/**
 * 製品種別からカラークラスを取得
 */
export function getProductTypeColor(type: string): string {
  return PRODUCT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'
}

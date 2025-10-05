/**
 * タグカテゴリ定数
 * タグシステムで使用するカテゴリの定義
 */

export const TAG_CATEGORIES = [
  { value: 'vehicle_type', label: '車種' },
  { value: 'company', label: '運営会社' },
  { value: 'product_feature', label: '商品特徴' },
  { value: 'vehicle_spec', label: '車両仕様' },
  { value: 'era', label: '時代・塗装' }
] as const

export type TagCategoryValue = typeof TAG_CATEGORIES[number]['value']

/**
 * カテゴリ別カラー定義
 * 製品カード、リスト、詳細画面でのタグバッジ表示に使用
 */
export const TAG_CATEGORY_COLORS: Record<string, string> = {
  vehicle_type: 'bg-blue-100 text-blue-800',
  company: 'bg-green-100 text-green-800',
  product_feature: 'bg-purple-100 text-purple-800',
  vehicle_spec: 'bg-indigo-100 text-indigo-800',
  era: 'bg-orange-100 text-orange-800'
}

/**
 * カテゴリ値からラベルを取得
 */
export function getCategoryLabel(category: string): string {
  return TAG_CATEGORIES.find(c => c.value === category)?.label || category
}

/**
 * カテゴリ値からカラークラスを取得
 */
export function getCategoryColor(category: string): string {
  return TAG_CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800'
}

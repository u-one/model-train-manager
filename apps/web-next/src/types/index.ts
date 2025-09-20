// ユーザー型定義
export interface User {
  id: string
  email: string
  name: string
  image?: string
  created_at: Date
  updated_at: Date
}

// 製品型定義
export interface Product {
  id: number
  brand: string
  product_code?: string
  parent_code?: string
  type: '単品' | 'セット' | 'セット単品'
  name: string
  release_year?: number
  price_excluding_tax?: number
  price_including_tax?: number
  jan_code?: string
  description?: string
  tags?: string[]
  vehicle_count: number
  image_url?: string
  url?: string
  icon?: string
  created_by_user_id?: number
  created_at: Date
  updated_at: Date
}

// 保有車両型定義
export interface OwnedVehicle {
  id: number
  user_id: number
  management_id: string
  product_id?: number
  is_independent: boolean

  // 購入情報
  purchase_date?: Date
  purchase_price_excluding_tax?: number
  purchase_price_including_tax?: number
  purchase_store?: string
  purchase_condition?: '新品' | '中古'

  // 現在の状態
  current_status: '正常' | '要修理' | '故障中' | '軽改造' | '重改造'
  storage_condition: 'ケースあり' | 'ケースなし'

  // その他
  maintenance_notes?: string
  notes?: string
  image_urls?: string[]

  created_at: Date
  updated_at: Date
}

// 独立記録車両型定義
export interface IndependentVehicle {
  id: number
  owned_vehicle_id: number
  brand?: string
  product_code?: string
  name: string
  vehicle_type?: string
  description?: string
  created_at: Date
  updated_at: Date
}

// 整備記録型定義
export interface MaintenanceRecord {
  id: number
  owned_vehicle_id: number
  maintenance_date: Date
  content: string
  created_at: Date
  updated_at: Date
}
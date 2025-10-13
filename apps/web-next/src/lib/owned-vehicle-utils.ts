import { prisma } from './prisma'
import type { VehicleStatus, StorageCondition } from '@prisma/client'

/**
 * セット製品の構成車両を自動登録する（Prisma版）
 * @param productId 登録された保有車両の製品ID
 * @param userId ユーザーID
 * @param setName セット名（メモ用）
 * @param managementId セットの管理ID（メモ用）
 * @param currentStatus 構成車両の状態
 * @param storageCondition 構成車両の保管状態
 * @param purchaseDate 構成車両の購入日
 */
export async function autoRegisterSetComponents(
  productId: number,
  userId: number,
  setName: string,
  managementId: string,
  currentStatus: string,
  storageCondition: string,
  purchaseDate: Date | null
) {
  // 製品情報を取得
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { type: true, productCode: true }
  })

  // セット製品でない、または品番がない場合は何もしない
  if (!product || product.type !== 'SET' || !product.productCode) {
    return []
  }

  // parentCodeがセットのproductCodeと一致する製品を取得
  const componentProducts = await prisma.product.findMany({
    where: {
      parentCode: product.productCode,
      type: 'SET_SINGLE'
    }
  })

  const componentOwnedVehicles = []
  for (const component of componentProducts) {
    const componentOwnedVehicle = await prisma.ownedVehicle.create({
      data: {
        userId: userId,
        productId: component.id,
        managementId: '', // 空文字列を許容
        currentStatus: (currentStatus || 'NORMAL') as VehicleStatus,
        storageCondition: (storageCondition || 'WITH_CASE') as StorageCondition,
        purchaseDate: purchaseDate || null,
        purchasePriceIncludingTax: null, // セット単品は個別価格なし
        notes: `セット「${setName}」(管理ID: ${managementId})の構成車両`
      },
      include: {
        product: true
      }
    })

    componentOwnedVehicles.push(componentOwnedVehicle)
  }

  return componentOwnedVehicles
}

/**
 * セット製品の構成車両を自動登録する（Supabase版）
 * @param supabase Supabaseクライアント
 * @param productId 登録された保有車両の製品ID
 * @param userId ユーザーID
 * @param setName セット名（メモ用）
 * @param managementId セットの管理ID（メモ用）
 * @param currentStatus 構成車両の状態
 * @param storageCondition 構成車両の保管状態
 * @param purchaseDate 構成車両の購入日
 */
export async function autoRegisterSetComponentsWithSupabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  productId: number,
  userId: number,
  setName: string,
  managementId: string,
  currentStatus: string,
  storageCondition: string,
  purchaseDate: string | null
) {
  // 製品情報を取得
  const { data: product } = await supabase
    .from('products')
    .select('type, product_code')
    .eq('id', productId)
    .single()

  // セット製品でない、または品番がない場合は何もしない
  if (!product || product.type !== 'SET' || !product.product_code) {
    return []
  }

  // parentCodeがセットのproduct_codeと一致する製品を取得
  const { data: componentProducts } = await supabase
    .from('products')
    .select('id, name, brand')
    .eq('parent_code', product.product_code)
    .eq('type', 'SET_SINGLE')

  if (!componentProducts || componentProducts.length === 0) {
    return []
  }

  const now = new Date().toISOString()
  const componentOwnedVehicles = []

  for (const component of componentProducts) {
    const { data: componentOwnedVehicle, error } = await supabase
      .from('owned_vehicles')
      .insert({
        user_id: userId,
        product_id: component.id,
        management_id: '', // 空文字列
        current_status: currentStatus,
        storage_condition: storageCondition,
        purchase_date: purchaseDate,
        purchase_price_including_tax: null,
        notes: `セット「${setName}」(管理ID: ${managementId})の構成車両`,
        image_urls: [],
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`セット構成車両登録エラー (${component.name}):`, error)
    } else {
      componentOwnedVehicles.push(componentOwnedVehicle)
    }
  }

  return componentOwnedVehicles
}

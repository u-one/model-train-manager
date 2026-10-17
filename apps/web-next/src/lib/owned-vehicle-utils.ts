import { prisma } from './prisma'
import type { Prisma, PrismaClient, StorageCondition, VehicleStatus } from '@prisma/client'

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
  parentOwnedVehicleId: number,
  setName: string,
  managementId: string,
  currentStatus: VehicleStatus,
  storageCondition: StorageCondition,
  purchaseDate: Date | null,
  client: PrismaClient | Prisma.TransactionClient = prisma
) {
  // 製品情報を取得
  const product = await client.product.findUnique({
    where: { id: productId },
    select: {
      type: true,
      brand: true,
      productCode: true,
      setComponents: { select: { componentProductId: true } }
    }
  })

  // セット製品でない場合は何もしない。ID関係は品番がないセットにも使える。
  if (!product || product.type !== 'SET') {
    return []
  }

  const matchingSetCount = product.productCode ? await client.product.count({
    where: {
      type: 'SET',
      brand: { equals: product.brand, mode: 'insensitive' },
      productCode: { equals: product.productCode, mode: 'insensitive' }
    }
  }) : 0
  const legacyComponents = product.productCode && matchingSetCount === 1
    ? await client.product.findMany({
        where: {
          type: 'SET_SINGLE',
          brand: { equals: product.brand, mode: 'insensitive' },
          parentCode: { equals: product.productCode, mode: 'insensitive' }
        },
        select: { id: true }
      })
    : []
  const componentIds = [...new Set([
    ...product.setComponents.map(component => component.componentProductId),
    ...legacyComponents.map(component => component.id)
  ])]
  if (componentIds.length === 0) return []
  const componentProducts = await client.product.findMany({ where: { id: { in: componentIds } } })

  const componentOwnedVehicles = []
  for (const component of componentProducts) {
    const componentOwnedVehicle = await client.ownedVehicle.create({
      data: {
        userId: userId,
        productId: component.id,
        parentSetOwnedVehicleId: parentOwnedVehicleId,
        managementId: '', // 空文字列を許容
        currentStatus,
        storageCondition,
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

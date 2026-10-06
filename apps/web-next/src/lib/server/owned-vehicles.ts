import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ownedVehicleInputToData, type OwnedVehicleInput } from '@/lib/contracts/owned-vehicle'
import { ApiError } from '@/lib/server/api-errors'
import { autoRegisterSetComponents } from '@/lib/owned-vehicle-utils'

export async function resolveProductId(
  client: Prisma.TransactionClient,
  input: OwnedVehicleInput
): Promise<number | null> {
  if (input.vehicleType !== 'PRODUCT') return null
  if (input.productBrand && input.productCode) {
    const products = await client.product.findMany({
      where: {
        brand: { equals: input.productBrand, mode: 'insensitive' },
        productCode: { equals: input.productCode, mode: 'insensitive' }
      },
      select: { id: true },
      take: 2
    })
    if (products.length === 0) throw new ApiError('一致する製品が見つかりません', 404, 'NOT_FOUND')
    if (products.length > 1) throw new ApiError('一致する製品が複数あります。製品一覧から選択してください', 409, 'CONFLICT')
    return products[0].id
  }
  if (!input.productId) throw new ApiError('製品IDまたはメーカー・品番が必要です', 400, 'VALIDATION_ERROR')
  const product = await client.product.findUnique({ where: { id: input.productId }, select: { id: true } })
  if (!product) throw new ApiError('製品が見つかりません', 404, 'NOT_FOUND')
  return product.id
}

const ownedVehicleInclude = {
  product: { include: { realVehicles: true, productTags: { include: { tag: true } } } },
  independentVehicle: true,
  maintenanceRecords: { orderBy: { maintenanceDate: 'desc' as const } }
} as const

export async function createOwnedVehicle(input: OwnedVehicleInput, userId: number) {
  return prisma.$transaction(tx => createOwnedVehicleInTransaction(tx, input, userId))
}

export async function createOwnedVehicleInTransaction(
  tx: Prisma.TransactionClient,
  input: OwnedVehicleInput,
  userId: number
) {
  const productId = await resolveProductId(tx, input)
  const vehicle = await tx.ownedVehicle.create({
    data: {
      ...ownedVehicleInputToData(input, userId),
      productId,
      ...(input.vehicleType === 'INDEPENDENT' && input.independentVehicle
        ? { independentVehicle: { create: input.independentVehicle } }
        : {})
    },
    include: ownedVehicleInclude
  })

  const components = productId ? await autoRegisterSetComponents(
    productId,
    userId,
    vehicle.id,
    vehicle.product?.name ?? '',
    vehicle.managementId,
    vehicle.currentStatus,
    vehicle.storageCondition,
    vehicle.purchaseDate,
    tx
  ) : []

  return { vehicle, componentOwnedVehicles: components }
}

export async function updateOwnedVehicle(vehicleId: number, input: OwnedVehicleInput, userId: number) {
  return prisma.$transaction(async tx => {
    const existing = await tx.ownedVehicle.findFirst({
      where: { id: vehicleId, userId },
      include: { independentVehicle: true }
    })
    if (!existing) throw new ApiError('保有車両が見つかりません', 404, 'NOT_FOUND')

    const productId = await resolveProductId(tx, input)
    const independentVehicle = input.vehicleType === 'INDEPENDENT' ? input.independentVehicle : undefined
    const mapped = ownedVehicleInputToData(input, userId)
    const data: Prisma.OwnedVehicleUncheckedUpdateInput = {
      managementId: mapped.managementId,
      productId,
      purchaseDate: mapped.purchaseDate,
      purchasePriceExcludingTax: mapped.purchasePriceExcludingTax,
      purchasePriceIncludingTax: mapped.purchasePriceIncludingTax,
      purchaseStore: mapped.purchaseStore,
      purchaseCondition: mapped.purchaseCondition,
      currentStatus: mapped.currentStatus,
      storageCondition: mapped.storageCondition,
      maintenanceNotes: mapped.maintenanceNotes,
      notes: mapped.notes,
      imageUrls: mapped.imageUrls
    }

    await tx.ownedVehicle.update({ where: { id: vehicleId }, data })
    if (independentVehicle) {
      await tx.independentVehicle.upsert({
        where: { ownedVehicleId: vehicleId },
        create: { ...independentVehicle, ownedVehicle: { connect: { id: vehicleId } } },
        update: independentVehicle
      })
    } else {
      await tx.independentVehicle.deleteMany({ where: { ownedVehicleId: vehicleId } })
    }
    return tx.ownedVehicle.findUniqueOrThrow({ where: { id: vehicleId }, include: ownedVehicleInclude })
  })
}

import 'server-only'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api-errors'

export async function deleteOwnedVehiclesForUser(userId: number) {
  return prisma.$transaction(async tx => {
    const maintenance = await tx.maintenanceRecord.deleteMany({ where: { ownedVehicle: { userId } } })
    const vehicles = await tx.ownedVehicle.deleteMany({ where: { userId } })
    return { deletedCount: vehicles.count, deletedMaintenanceRecords: maintenance.count }
  })
}

export async function deleteAllOwnedVehicles() {
  return prisma.$transaction(async tx => {
    const maintenance = await tx.maintenanceRecord.deleteMany({})
    const vehicles = await tx.ownedVehicle.deleteMany({})
    return { deletedCount: vehicles.count, deletedMaintenanceRecords: maintenance.count }
  })
}

export async function deleteAllProductData() {
  return prisma.$transaction(async tx => {
    const maintenance = await tx.maintenanceRecord.deleteMany({})
    const vehicles = await tx.ownedVehicle.deleteMany({})
    const realVehicles = await tx.realVehicle.deleteMany({})
    const products = await tx.product.deleteMany({})
    return {
      deletedCount: products.count,
      deletedOwnedVehicles: vehicles.count,
      deletedMaintenanceRecords: maintenance.count,
      deletedRealVehicles: realVehicles.count
    }
  })
}

export async function deleteProductsByIds(productIds: number[]) {
  return prisma.$transaction(async tx => {
    const relatedCount = await tx.ownedVehicle.count({ where: { productId: { in: productIds } } })
    if (relatedCount > 0) {
      throw new ApiError(`削除対象の製品に関連する保有車両が${relatedCount}件あります`, 409, 'CONFLICT')
    }
    await tx.realVehicle.deleteMany({ where: { productId: { in: productIds } } })
    const result = await tx.product.deleteMany({ where: { id: { in: productIds } } })
    return { deletedCount: result.count }
  })
}

export async function deleteOwnedVehiclesByIds(ownedVehicleIds: number[]) {
  return prisma.$transaction(async tx => {
    await tx.maintenanceRecord.deleteMany({ where: { ownedVehicleId: { in: ownedVehicleIds } } })
    const result = await tx.ownedVehicle.deleteMany({ where: { id: { in: ownedVehicleIds } } })
    return { deletedCount: result.count }
  })
}

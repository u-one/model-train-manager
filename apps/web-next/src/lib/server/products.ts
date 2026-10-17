import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { productInputToCreateData, productInputToUpdateData, type ProductInput } from '@/lib/contracts/product'
import { ApiError } from '@/lib/server/api-errors'

async function createProductRecord(
  tx: Prisma.TransactionClient,
  input: ProductInput,
  userId: number
) {
  const product = await tx.product.create({
    data: {
      ...productInputToCreateData(input),
      createdByUserId: userId,
      realVehicles: { create: input.realVehicles ?? [] },
      ...(input.tagIds ? { productTags: { create: tagWrites(input.tagIds) } } : {})
    },
    include: productResponseInclude
  })
  await synchronizeSetMembership(tx, product.id, input)
  return product
}

async function synchronizeSetMembership(tx: Prisma.TransactionClient, productId: number, input: ProductInput) {
  await tx.productSetComponent.deleteMany({ where: { componentProductId: productId } })
  if (input.type !== 'SET_SINGLE') return
  if (input.setProductIds) {
    const sets = await tx.product.findMany({
      where: { id: { in: input.setProductIds }, type: 'SET' },
      select: { id: true }
    })
    if (sets.length !== new Set(input.setProductIds).size) {
      throw new ApiError('指定された親製品がセットではありません', 400, 'VALIDATION_ERROR')
    }
    if (sets.length > 0) {
      await tx.productSetComponent.createMany({
        data: sets.map(set => ({ setProductId: set.id, componentProductId: productId })),
        skipDuplicates: true
      })
    }
    return
  }
  if (!input.parentCode) return
  const matchingSets = await tx.product.findMany({
    where: {
      type: 'SET',
      brand: { equals: input.brand, mode: 'insensitive' },
      productCode: { equals: input.parentCode, mode: 'insensitive' }
    },
    select: { id: true },
    take: 2
  })
  if (matchingSets.length > 1) {
    throw new ApiError('親品番に一致するセットが複数あります', 409, 'CONFLICT')
  }
  if (matchingSets.length === 1) {
    await tx.productSetComponent.create({
      data: { setProductId: matchingSets[0].id, componentProductId: productId }
    })
  }
}

const productResponseInclude = {
  realVehicles: true,
  productTags: { include: { tag: true } },
  _count: { select: { ownedVehicles: true } }
} as const

function tagWrites(tagIds: number[]) {
  return tagIds.map(tagId => ({ tag: { connect: { id: tagId } } }))
}

export async function createProduct(input: ProductInput, userId: number) {
  return prisma.$transaction(async tx => {
    const product = await createProductRecord(tx, input, userId)

    if (input.linkOwnedVehicleId) {
      const ownedVehicle = await tx.ownedVehicle.findFirst({
        where: { id: input.linkOwnedVehicleId, userId },
        select: { id: true }
      })
      if (!ownedVehicle) throw new ApiError('保有車両が見つかりません', 404, 'NOT_FOUND')
      await tx.independentVehicle.deleteMany({ where: { ownedVehicleId: ownedVehicle.id } })
      await tx.ownedVehicle.update({ where: { id: ownedVehicle.id }, data: { productId: product.id } })
    }

    return product
  })
}

export async function createImportedProduct(input: ProductInput, userId: number) {
  return prisma.$transaction(async tx => {
    const duplicateFilter = input.productCode === null || input.productCode === undefined
      ? { productCode: null }
      : { productCode: { equals: input.productCode, mode: 'insensitive' as const } }
    const duplicates = await tx.product.findMany({
      where: {
        brand: { equals: input.brand, mode: 'insensitive' },
        ...duplicateFilter
      },
      select: { id: true },
      take: 2
    })
    if (duplicates.length > 0) {
      throw new ApiError('同じメーカー・品番の製品が既にあります', 409, 'CONFLICT')
    }
    return createProductRecord(tx, input, userId)
  })
}

export async function updateProduct(productId: number, input: ProductInput) {
  return prisma.$transaction(async tx => {
    const existing = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, type: true, parentCode: true }
    })
    if (!existing) throw new ApiError('製品が見つかりません', 404, 'NOT_FOUND')

    const product = await tx.product.update({
      where: { id: productId },
      data: {
        ...productInputToUpdateData(input),
        realVehicles: {
          deleteMany: {},
          create: input.realVehicles ?? []
        },
        ...(input.tagIds === undefined ? {} : {
          productTags: {
            deleteMany: {},
            create: tagWrites(input.tagIds)
          }
        })
      },
      include: productResponseInclude
    })
    if (existing.type !== input.type || existing.parentCode !== (input.parentCode || null) || input.setProductIds !== undefined) {
      await synchronizeSetMembership(tx, product.id, input)
    }
    return product
  })
}

export async function linkProductToOwnedVehicle(productId: number, ownedVehicleId: number, userId: number) {
  return prisma.$transaction(async tx => {
    const [product, ownedVehicle] = await Promise.all([
      tx.product.findUnique({ where: { id: productId }, select: { id: true } }),
      tx.ownedVehicle.findFirst({
        where: { id: ownedVehicleId, userId },
        select: { id: true }
      })
    ])
    if (!product || !ownedVehicle) throw new ApiError('製品または保有車両が見つかりません', 404, 'NOT_FOUND')
    await tx.independentVehicle.deleteMany({ where: { ownedVehicleId } })
    return tx.ownedVehicle.update({ where: { id: ownedVehicleId }, data: { productId } })
  })
}

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

export interface IndependentConversionSkip {
  ownedVehicleId: number
  reason: string
}

export interface IndependentConversionResult {
  createdProductCount: number
  linkedExistingProductCount: number
  convertedVehicleCount: number
  skipped: IndependentConversionSkip[]
}

// 独立車両をメーカー+品番(大文字小文字無視)でまとめ、製品を作成または既存製品へ紐付ける。グループ単位でトランザクションを分け、失敗したグループはスキップとして返す。
export async function convertIndependentVehiclesToProducts(
  ownedVehicleIds: number[],
  userId: number
): Promise<IndependentConversionResult> {
  const vehicles = await prisma.ownedVehicle.findMany({
    where: { id: { in: ownedVehicleIds }, userId },
    include: { independentVehicle: true },
    orderBy: { id: 'asc' }
  })
  if (vehicles.length !== ownedVehicleIds.length) {
    throw new ApiError('一部の保有車両が見つかりません', 404, 'NOT_FOUND')
  }

  const result: IndependentConversionResult = {
    createdProductCount: 0,
    linkedExistingProductCount: 0,
    convertedVehicleCount: 0,
    skipped: []
  }
  const groups = new Map<string, typeof vehicles>()
  for (const vehicle of vehicles) {
    const independent = vehicle.independentVehicle
    if (!independent) {
      result.skipped.push({ ownedVehicleId: vehicle.id, reason: '独立車両ではありません' })
      continue
    }
    const brand = independent.brand?.trim()
    const productCode = independent.productCode?.trim()
    if (!brand || !productCode) {
      result.skipped.push({ ownedVehicleId: vehicle.id, reason: 'メーカーまたは品番が未設定です' })
      continue
    }
    const key = `${brand.toLowerCase()}:${productCode.toLowerCase()}`
    groups.set(key, [...(groups.get(key) ?? []), vehicle])
  }

  for (const group of groups.values()) {
    const first = group[0].independentVehicle!
    const brand = first.brand!.trim()
    const productCode = first.productCode!.trim()
    try {
      const outcome = await prisma.$transaction(async tx => {
        const existing = await tx.product.findMany({
          where: {
            brand: { equals: brand, mode: 'insensitive' },
            productCode: { equals: productCode, mode: 'insensitive' }
          },
          select: { id: true },
          take: 2
        })
        if (existing.length > 1) {
          throw new ApiError('同じメーカー・品番の製品が複数あります', 409, 'CONFLICT')
        }
        let productId: number
        let created = false
        if (existing.length === 1) {
          productId = existing[0].id
        } else {
          const product = await createProductRecord(tx, {
            brand,
            productCode,
            type: 'SINGLE',
            name: first.name,
            description: first.description,
            realVehicles: first.vehicleType ? [{ vehicleType: first.vehicleType }] : []
          }, userId)
          productId = product.id
          created = true
        }
        const ids = group.map(vehicle => vehicle.id)
        await tx.independentVehicle.deleteMany({ where: { ownedVehicleId: { in: ids } } })
        await tx.ownedVehicle.updateMany({ where: { id: { in: ids } }, data: { productId } })
        return created
      })
      if (outcome) result.createdProductCount++
      else result.linkedExistingProductCount++
      result.convertedVehicleCount += group.length
    } catch (error) {
      const reason = error instanceof ApiError ? error.message : '変換に失敗しました'
      if (!(error instanceof ApiError)) console.error('Independent vehicle conversion error:', error)
      for (const vehicle of group) result.skipped.push({ ownedVehicleId: vehicle.id, reason })
    }
  }

  return result
}

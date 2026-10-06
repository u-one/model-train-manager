import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { PRODUCT_TYPE_SET, PRODUCT_TYPE_SET_SINGLE, PRODUCT_TYPE_SINGLE } from '@/constants/productTypes'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

// 製品が所属するセット一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = Number(resolvedParams.id)
    if (!Number.isSafeInteger(productId) || productId < 1) return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')

    // 指定された製品情報を取得
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brand: true, productCode: true, type: true, parentCode: true }
    })

    if (!product) {
      return apiErrorJson('製品が見つかりません', 404, 'NOT_FOUND')
    }

    const membershipWhere: Prisma.ProductSetComponentWhereInput | null = product.type === PRODUCT_TYPE_SET_SINGLE
      ? { componentProductId: productId }
        : product.type === PRODUCT_TYPE_SINGLE && product.productCode
        ? { componentProduct: { is: {
            type: PRODUCT_TYPE_SET_SINGLE,
            brand: { equals: product.brand, mode: 'insensitive' as const },
            productCode: product.productCode
          } } }
        : null
    const memberships = membershipWhere ? await prisma.productSetComponent.findMany({
      where: membershipWhere,
      include: { setProduct: { include: { realVehicles: true, _count: { select: { ownedVehicles: true } } } } }
    }) : []
    const parentsById = new Map(memberships.map(membership => [membership.setProduct.id, membership.setProduct]))

    // 移行前または親を一意に特定できなかった旧データは、旧 parentCode でも表示する。
    const legacyComponentCodes = product.type === PRODUCT_TYPE_SET_SINGLE && product.parentCode
      ? [product.parentCode]
      : product.type === PRODUCT_TYPE_SINGLE && product.productCode
        ? (await prisma.product.findMany({
            where: {
              type: PRODUCT_TYPE_SET_SINGLE,
              brand: { equals: product.brand, mode: 'insensitive' },
              productCode: product.productCode,
              parentCode: { not: null }
            },
            select: { parentCode: true }
          })).map(component => component.parentCode).filter((code): code is string => Boolean(code))
        : []
    const legacyCodes = [...new Set(legacyComponentCodes)]
    if (legacyCodes.length > 0) {
      const legacySets = await prisma.product.findMany({
        where: {
          type: PRODUCT_TYPE_SET,
          brand: { equals: product.brand, mode: 'insensitive' },
          productCode: { in: legacyCodes }
        },
        include: { realVehicles: true, _count: { select: { ownedVehicles: true } } }
      })
      for (const parentSet of legacySets) parentsById.set(parentSet.id, parentSet)
    }

    const parentSets = [...parentsById.values()]

    return NextResponse.json({ parentSets })
  } catch (error) {
    return apiErrorResponse(error, '所属セットを取得できませんでした')
  }
}

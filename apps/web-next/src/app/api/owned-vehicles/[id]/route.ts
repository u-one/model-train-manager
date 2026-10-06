import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { ownedVehicleInputSchema } from '@/lib/contracts/owned-vehicle'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { linkProductToOwnedVehicle } from '@/lib/server/products'
import { updateOwnedVehicle } from '@/lib/server/owned-vehicles'
import { apiJson, apiJsonAs } from '@/lib/server/api-json'
import { z } from 'zod'
import type { OwnedVehicleDetailApiOutput } from '@/lib/contracts/api'
import type { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

const linkProductSchema = z.object({ productId: z.number().int().positive() }).strict()

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const user = auth.user

    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('保有車両IDが不正です', 400, 'VALIDATION_ERROR')

    const ownedVehicle = await prisma.ownedVehicle.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        product: {
          include: {
            realVehicles: true
          }
        },
        independentVehicle: true,
        maintenanceRecords: {
          orderBy: { maintenanceDate: 'desc' }
        }
      }
    })

    if (!ownedVehicle) {
      return apiErrorJson('保有車両が見つかりません', 404, 'NOT_FOUND')
    }

    let componentOwnedVehicles: Prisma.OwnedVehicleGetPayload<{ include: { product: true } }>[] = []
    if (ownedVehicle.product?.type === 'SET') {
      const legacyComponentProducts = ownedVehicle.product.productCode
        ? await prisma.product.findMany({
            where: {
              type: 'SET_SINGLE',
              brand: { equals: ownedVehicle.product.brand, mode: 'insensitive' },
              parentCode: { equals: ownedVehicle.product.productCode, mode: 'insensitive' }
            },
            select: { id: true }
          })
        : []
      const legacyProductIds = legacyComponentProducts.map(product => product.id)
      const legacyMarker = `セット「${ownedVehicle.product.name}」(管理ID: ${ownedVehicle.managementId})`
      componentOwnedVehicles = await prisma.ownedVehicle.findMany({
        where: {
          userId: user.id,
          OR: [
            { parentSetOwnedVehicleId: ownedVehicle.id },
            ...(legacyProductIds.length ? [{
              parentSetOwnedVehicleId: null,
              productId: { in: legacyProductIds },
              notes: { contains: legacyMarker }
            }] : [])
          ]
        },
        include: { product: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
      })
    }

    return apiJsonAs<OwnedVehicleDetailApiOutput>()({
      ...ownedVehicle,
      componentOwnedVehicles
    })
  } catch (error) {
    return apiErrorResponse(error, '保有車両を取得できませんでした')
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const user = auth.user

    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('保有車両IDが不正です', 400, 'VALIDATION_ERROR')
    const parsed = ownedVehicleInputSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '入力値を確認してください')
    const updatedVehicle = await updateOwnedVehicle(id, parsed.data, user.id)
    return apiJson(updatedVehicle)
  } catch (error) {
    return apiErrorResponse(error, '保有車両を更新できませんでした')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const user = auth.user

    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('保有車両IDが不正です', 400, 'VALIDATION_ERROR')

    const deleteResult = await prisma.ownedVehicle.deleteMany({
      where: {
        id,
        userId: user.id
      }
    })

    if (deleteResult.count === 0) {
      return apiErrorJson('保有車両が見つかりません', 404, 'NOT_FOUND')
    }

    return NextResponse.json({ message: 'Owned vehicle deleted successfully' })
  } catch (error) {
    return apiErrorResponse(error, '保有車両を削除できませんでした')
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    if (!auth.user) return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('保有車両IDが不正です', 400, 'VALIDATION_ERROR')
    const parsed = linkProductSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '製品IDを確認してください')
    const result = await linkProductToOwnedVehicle(parsed.data.productId, id, auth.user.id)
    return apiJson(result)
  } catch (error) {
    return apiErrorResponse(error, '製品を紐付けられませんでした')
  }
}

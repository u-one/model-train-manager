import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import {
  authorizeImageEntity,
  imageUrlBelongsToEntity,
  type ImageEntityType
} from '@/lib/server/image-auth'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { getAuthContext } from '@/lib/server/auth'

interface RouteParams {
  params: Promise<{ key: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params

    if (!key) {
      return apiErrorJson('画像キーが指定されていません', 400, 'VALIDATION_ERROR')
    }

    const candidates = new Set([key])
    try {
      candidates.add(decodeURIComponent(key))
    } catch {
      // すでにデコード済みの値はそのまま照合する
    }

    const entityType = request.nextUrl.searchParams.get('entityType')
    const entityId = request.nextUrl.searchParams.get('entityId')
    let imageToDelete: string | undefined

    if (entityType && entityId) {
      const access = await authorizeImageEntity(entityType, entityId)
      if (!access.ok) {
        return apiErrorJson(access.error, access.status, access.code)
      }
      imageToDelete = [...candidates].find(candidate => imageUrlBelongsToEntity(candidate, access))
    } else {
      const auth = await getAuthContext()
      if (!auth.session?.user?.email) {
        return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
      }
      if (!auth.user) {
        return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
      }
      // 旧クライアント向けに、DBに登録済みの画像URLから対象を特定する。
      const urls = [...candidates]
      const [products, ownedVehicles] = await Promise.all([
        prisma.product.findMany({
          where: { imageUrls: { hasSome: urls } },
          select: { id: true }
        }),
        prisma.ownedVehicle.findMany({
          where: { imageUrls: { hasSome: urls } },
          select: { id: true }
        })
      ])

      const entities: Array<{ type: ImageEntityType; id: number }> = [
        ...products.map(product => ({ type: 'product' as const, id: product.id })),
        ...ownedVehicles.map(vehicle => ({ type: 'owned-vehicle' as const, id: vehicle.id }))
      ]
      if (entities.length === 0) {
        return apiErrorJson('画像が見つかりません', 404, 'NOT_FOUND')
      }

      for (const entity of entities) {
        const access = await authorizeImageEntity(entity.type, String(entity.id))
        if (!access.ok) {
          return apiErrorJson(access.error, access.status, access.code)
        }
        imageToDelete ??= [...candidates].find(candidate => imageUrlBelongsToEntity(candidate, access))
      }
    }

    if (!imageToDelete) {
      return apiErrorJson('画像が対象データに登録されていません', 404, 'NOT_FOUND')
    }

    // ストレージから削除
    const storage = getStorage()
    await storage.delete(imageToDelete)

    return NextResponse.json({
      message: 'Image deleted successfully'
    })

  } catch (error) {
    return apiErrorResponse(error, '画像の削除に失敗しました')
  }
}

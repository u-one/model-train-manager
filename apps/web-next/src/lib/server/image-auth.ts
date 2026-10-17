import 'server-only'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'

export type ImageEntityType = 'product' | 'owned-vehicle'

export type ImageEntityAccess =
  | {
      ok: true
      entityType: ImageEntityType
      entityId: number
      imageUrls: string[]
    }
  | {
      ok: false
      status: 400 | 401 | 403 | 404
      code: 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
      error: string
    }

export async function authorizeImageEntity(
  entityTypeValue: string | null,
  entityIdValue: string | null
): Promise<ImageEntityAccess> {
  const auth = await getAuthContext()
  if (!auth.session?.user?.email) {
    return { ok: false, status: 401, code: 'UNAUTHENTICATED', error: 'ログインが必要です' }
  }
  if (!auth.user) {
    return { ok: false, status: 404, code: 'NOT_FOUND', error: 'ユーザーが見つかりません' }
  }

  if (entityTypeValue !== 'product' && entityTypeValue !== 'owned-vehicle') {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', error: 'エンティティ種別が不正です' }
  }

  if (!entityIdValue || !/^\d+$/.test(entityIdValue)) {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', error: 'エンティティIDが不正です' }
  }

  const entityId = Number(entityIdValue)
  if (!Number.isSafeInteger(entityId) || entityId < 1) {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', error: 'エンティティIDが不正です' }
  }

  if (entityTypeValue === 'product') {
    const product = await prisma.product.findUnique({
      where: { id: entityId },
      select: { createdByUserId: true, imageUrls: true }
    })
    if (!product) {
      return { ok: false, status: 404, code: 'NOT_FOUND', error: '製品が見つかりません' }
    }
    if (product.createdByUserId !== auth.user.id && !auth.isAdmin) {
      return { ok: false, status: 403, code: 'FORBIDDEN', error: 'この製品の画像を変更する権限がありません' }
    }
    return { ok: true, entityType: entityTypeValue, entityId, imageUrls: product.imageUrls }
  }

  const ownedVehicle = await prisma.ownedVehicle.findUnique({
    where: { id: entityId },
    select: { userId: true, imageUrls: true }
  })
  if (!ownedVehicle) {
    return { ok: false, status: 404, code: 'NOT_FOUND', error: '保有車両が見つかりません' }
  }
  if (ownedVehicle.userId !== auth.user.id) {
    return { ok: false, status: 403, code: 'FORBIDDEN', error: 'この保有車両の画像を変更する権限がありません' }
  }

  return { ok: true, entityType: entityTypeValue, entityId, imageUrls: ownedVehicle.imageUrls }
}

export function imageUrlBelongsToEntity(
  imageUrl: string,
  entity: Extract<ImageEntityAccess, { ok: true }>
): boolean {
  if (entity.imageUrls.includes(imageUrl)) {
    return true
  }

  let pathname: string
  try {
    pathname = new URL(imageUrl, 'http://local').pathname.replace(/^\/+/, '')
  } catch {
    return false
  }

  const folder = entity.entityType === 'product' ? 'products' : 'owned-vehicles'
  const entityPath = `${folder}/${entity.entityId}/`
  return pathname.startsWith(entityPath) || pathname.startsWith(`uploads/${entityPath}`)
}

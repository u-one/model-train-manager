import { Session } from 'next-auth'
import { Prisma } from '@prisma/client'

/**
 * 製品詳細取得時の include 句を構築する。
 * ログイン中のユーザーセッションがある場合は ownedVehicles をユーザーID でフィルタする。
 */
export function buildProductDetailInclude(session: Session | null) {
  const parsed = session ? parseInt(session.user.id) : NaN
  const userId = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : -1

  return {
    realVehicles: true,
    ownedVehicles: {
      where: { userId }
    },
    createdByUser: { select: { id: true, name: true } },
    productTags: { include: { tag: true } }
  } as const satisfies Prisma.ProductInclude
}

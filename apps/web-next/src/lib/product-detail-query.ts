import { Session } from 'next-auth'
import { Prisma } from '@prisma/client'

/**
 * 製品詳細取得時の include 句を構築する。
 * ログイン中のユーザーセッションがある場合は ownedVehicles をユーザーID でフィルタする。
 */
export function buildProductDetailInclude(session: Session | null): Prisma.ProductInclude {
  const userId = session ? parseInt(session.user.id) : null

  return {
    realVehicles: true,
    ownedVehicles: userId
      ? {
          where: { userId },
          include: {
            user: { select: { id: true, name: true } },
          },
        }
      : false,
    createdByUser: { select: { id: true, name: true } },
    productTags: {
      include: {
        tag: true,
      },
    },
  }
}

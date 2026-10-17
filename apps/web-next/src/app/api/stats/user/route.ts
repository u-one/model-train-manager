import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { ProductType } from '@prisma/client'

export async function GET() {
  try {
    const auth = await getAuthContext()

    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const user = auth.user

    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // ユーザー統計情報を並行して取得
    const [
      totalOwnedVehicles,
      ownedVehiclesByStatus,
      recentOwnedVehicles,
      recentActivity
    ] = await Promise.all([
      // 総保有車両数
      prisma.ownedVehicle.count({
        where: { 
          userId: user.id,
          product: {
            OR: [
              {type: ProductType.SET_SINGLE}, {type: ProductType.SINGLE}
            ]
          }
         }
      }),
      // ステータス別保有車両数
      prisma.ownedVehicle.groupBy({
        by: ['currentStatus'],
        where: { userId: user.id },
        _count: true
      }),
      // 最近追加された保有車両（5件）
      prisma.ownedVehicle.findMany({
        where: { userId: user.id },
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              productCode: true
            }
          },
          independentVehicle: {
            select: {
              name: true,
              brand: true
            }
          }
        }
      }),
      // 最近の活動（7日間の追加・更新）
      prisma.ownedVehicle.count({
        where: {
          userId: user.id,
          OR: [
            {
              createdAt: {
                gte: sevenDaysAgo
              }
            },
            {
              updatedAt: {
                gte: sevenDaysAgo
              }
            }
          ]
        }
      })
    ])

    return NextResponse.json({
      totalOwnedVehicles,
      ownedVehiclesByStatus,
      recentOwnedVehicles,
      recentActivity
    })
  } catch (error) {
    return apiErrorResponse(error, 'ユーザー統計を取得できませんでした')
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductType } from '@prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
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
    console.error('User stats error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
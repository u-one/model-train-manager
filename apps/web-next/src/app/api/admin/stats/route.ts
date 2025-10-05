import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 管理者権限チェック
    await requireAdmin()

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // 統計情報を並行して取得
    const [
      totalProducts,
      totalOwnedVehicles,
      totalUsers,
      recentProductImports,
      recentOwnedVehicleImports,
      activeUsers,
      totalTags,
      taggedProducts
    ] = await Promise.all([
      prisma.product.count(),
      prisma.ownedVehicle.count(),
      prisma.user.count(),
      // 最近7日間の製品追加数
      prisma.product.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      }),
      // 最近7日間の保有車両追加数
      prisma.ownedVehicle.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      }),
      // アクティブユーザー数（保有車両がある）
      prisma.user.count({
        where: {
          ownedVehicles: {
            some: {}
          }
        }
      }),
      // 総タグ数
      prisma.tag.count(),
      // タグ付き製品数
      prisma.product.count({
        where: {
          productTags: {
            some: {}
          }
        }
      })
    ])

    const recentImports = recentProductImports + recentOwnedVehicleImports

    return NextResponse.json({
      totalProducts,
      totalOwnedVehicles,
      totalUsers,
      recentImports,
      activeUsers,
      totalTags,
      taggedProducts
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
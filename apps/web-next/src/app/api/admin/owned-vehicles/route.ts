import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    // 管理者権限チェック
    await requireAdmin()

    const { ownedVehicleIds } = await request.json()

    if (!Array.isArray(ownedVehicleIds) || ownedVehicleIds.length === 0) {
      return NextResponse.json(
        { error: '削除する保有車両IDが指定されていません' },
        { status: 400 }
      )
    }

    // トランザクション内で一括削除を実行
    const result = await prisma.$transaction(async (tx) => {
      // 関連データを削除（整備記録）
      await tx.maintenanceRecord.deleteMany({
        where: {
          ownedVehicleId: {
            in: ownedVehicleIds
          }
        }
      })

      // 保有車両を削除
      const deletedOwnedVehicles = await tx.ownedVehicle.deleteMany({
        where: {
          id: {
            in: ownedVehicleIds
          }
        }
      })

      return {
        deletedCount: deletedOwnedVehicles.count
      }
    })

    console.log(`Admin deleted ${result.deletedCount} owned vehicles:`, ownedVehicleIds)

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount}件の保有車両を削除しました`
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: '管理者権限が必要です' },
          { status: 403 }
        )
      }

      console.error('Owned vehicle bulk delete error:', error)
      return NextResponse.json(
        {
          error: 'データ削除エラーが発生しました',
          details: error.message
        },
        { status: 500 }
      )
    }

    console.error('Unknown owned vehicle bulk delete error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
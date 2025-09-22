import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    // 管理者権限チェック
    await requireAdmin()

    const { productIds } = await request.json()

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '削除する製品IDが指定されていません' },
        { status: 400 }
      )
    }

    // トランザクション内で一括削除を実行
    const result = await prisma.$transaction(async (tx) => {
      // 関連する保有車両の確認
      const relatedOwnedVehicles = await tx.ownedVehicle.count({
        where: {
          productId: {
            in: productIds
          }
        }
      })

      // 保有車両が存在する場合は警告
      if (relatedOwnedVehicles > 0) {
        throw new Error(`削除対象の製品に関連する保有車両が${relatedOwnedVehicles}件存在します`)
      }

      // 関連データを削除（実車情報）
      await tx.realVehicle.deleteMany({
        where: {
          productId: {
            in: productIds
          }
        }
      })

      // 製品を削除
      const deletedProducts = await tx.product.deleteMany({
        where: {
          id: {
            in: productIds
          }
        }
      })

      return {
        deletedCount: deletedProducts.count
      }
    })

    console.log(`Admin deleted ${result.deletedCount} products:`, productIds)

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount}件の製品を削除しました`
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: '管理者権限が必要です' },
          { status: 403 }
        )
      }

      console.error('Product bulk delete error:', error)
      return NextResponse.json(
        {
          error: 'データ削除エラーが発生しました',
          details: error.message
        },
        { status: 500 }
      )
    }

    console.error('Unknown product bulk delete error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
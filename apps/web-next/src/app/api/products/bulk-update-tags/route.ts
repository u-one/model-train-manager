import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 製品一括タグ更新API
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { productIds, mode, tagIds } = data

    // バリデーション
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: '製品IDが指定されていません' },
        { status: 400 }
      )
    }

    if (!mode || !['add', 'replace', 'remove'].includes(mode)) {
      return NextResponse.json(
        { error: 'モードが不正です（add/replace/remove）' },
        { status: 400 }
      )
    }

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: 'タグIDが指定されていません' },
        { status: 400 }
      )
    }

    // 製品の存在確認
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      select: {
        id: true
      }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: '一部の製品が見つかりません' },
        { status: 404 }
      )
    }

    // タグの存在確認
    const tags = await prisma.tag.findMany({
      where: {
        id: {
          in: tagIds
        }
      },
      select: {
        id: true
      }
    })

    if (tags.length !== tagIds.length) {
      return NextResponse.json(
        { error: '一部のタグが見つかりません' },
        { status: 404 }
      )
    }

    let updatedCount = 0
    const errors: string[] = []

    // トランザクション処理
    await prisma.$transaction(async (tx) => {
      for (const productId of productIds) {
        try {
          if (mode === 'replace') {
            // 上書きモード: 既存タグを削除してから新規追加
            await tx.productTag.deleteMany({
              where: { productId }
            })

            await tx.productTag.createMany({
              data: tagIds.map(tagId => ({
                productId,
                tagId
              })),
              skipDuplicates: true
            })
          } else if (mode === 'add') {
            // 追加モード: 既存タグを保持して新規追加
            await tx.productTag.createMany({
              data: tagIds.map(tagId => ({
                productId,
                tagId
              })),
              skipDuplicates: true
            })
          } else if (mode === 'remove') {
            // 削除モード: 指定タグのみ削除
            await tx.productTag.deleteMany({
              where: {
                productId,
                tagId: {
                  in: tagIds
                }
              }
            })
          }

          updatedCount++
        } catch (error) {
          console.error(`製品ID ${productId} の更新エラー:`, error)
          errors.push(`製品ID ${productId} の更新に失敗しました`)
        }
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount,
      totalRequested: productIds.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Bulk tag update error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

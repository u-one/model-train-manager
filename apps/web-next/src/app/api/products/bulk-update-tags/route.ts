import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { z } from 'zod'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

// 製品一括タグ更新API
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const parsed = z.object({
      productIds: z.array(z.number().int().positive()).min(1).max(1000).refine(ids => new Set(ids).size === ids.length),
      mode: z.enum(['add', 'replace', 'remove']),
      tagIds: z.array(z.number().int().positive()).min(1).max(100).refine(ids => new Set(ids).size === ids.length)
    }).strict().safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '一括タグ更新の入力値を確認してください')
    const { productIds, mode, tagIds } = parsed.data

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
      return apiErrorJson('一部の製品が見つかりません', 404, 'NOT_FOUND')
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
      return apiErrorJson('一部のタグが見つかりません', 404, 'NOT_FOUND')
    }

    await prisma.$transaction(async tx => {
      if (mode === 'replace') {
        await tx.productTag.deleteMany({ where: { productId: { in: productIds } } })
      }
      if (mode === 'replace' || mode === 'add') {
        await tx.productTag.createMany({
          data: productIds.flatMap(productId => tagIds.map(tagId => ({ productId, tagId }))),
          skipDuplicates: true
        })
      }
      if (mode === 'remove') {
        await tx.productTag.deleteMany({ where: { productId: { in: productIds }, tagId: { in: tagIds } } })
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount: productIds.length,
      totalRequested: productIds.length
    })
  } catch (error) {
    return apiErrorResponse(error, '製品タグを一括更新できませんでした')
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { z } from 'zod'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// 製品のタグ一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productTags: {
          include: {
            tag: true
          },
          orderBy: {
            tag: {
              category: 'asc'
            }
          }
        }
      }
    })

    if (!product) {
      return apiErrorJson('製品が見つかりません', 404, 'NOT_FOUND')
    }

    const tags = product.productTags.map((pt: { tag: unknown }) => pt.tag)

    return NextResponse.json({ tags })
  } catch (error) {
    return apiErrorResponse(error, '製品タグを取得できませんでした')
  }
}

// 製品のタグ更新（一括置き換え）
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')
    const inputSchema = z.object({ tagIds: z.array(z.number().int().positive()).max(100).refine(ids => new Set(ids).size === ids.length) }).strict()
    const parsed = inputSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, 'タグIDを確認してください')
    const { tagIds } = parsed.data

    // 製品が存在するか確認
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return apiErrorJson('製品が見つかりません', 404, 'NOT_FOUND')
    }

    // トランザクションで既存タグを削除して新しいタグを追加
    await prisma.$transaction(async (tx) => {
      // 既存のタグをすべて削除
      await tx.productTag.deleteMany({
        where: { productId: id }
      })

      // 新しいタグを追加
      if (tagIds.length > 0) {
        await tx.productTag.createMany({
          data: tagIds.map(tagId => ({
            productId: id,
            tagId
          })),
          skipDuplicates: true
        })
      }
    })

    // 更新後のタグを取得
    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        productTags: {
          include: {
            tag: true
          }
        }
      }
    })

    const tags = updatedProduct?.productTags.map((pt: { tag: unknown }) => pt.tag) || []

    return NextResponse.json({ tags })
  } catch (error) {
    return apiErrorResponse(error, '製品タグを更新できませんでした')
  }
}

// 製品にタグを追加
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')
    const inputSchema = z.object({ tagId: z.number().int().positive() }).strict()
    const parsed = inputSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, 'タグIDを確認してください')
    const { tagId } = parsed.data

    // 製品が存在するか確認
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return apiErrorJson('製品が見つかりません', 404, 'NOT_FOUND')
    }

    // タグが存在するか確認
    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    })

    if (!tag) {
      return apiErrorJson('タグが見つかりません', 404, 'NOT_FOUND')
    }

    // タグを追加
    await prisma.productTag.create({
      data: {
        productId: id,
        tagId
      }
    })

    return NextResponse.json({ message: 'Tag added successfully' }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, '製品タグを追加できませんでした')
  }
}

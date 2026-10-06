import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { tagUpdateSchema } from '@/lib/contracts/tag'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// タグ取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('タグIDが不正です', 400, 'VALIDATION_ERROR')

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productTags: true }
        }
      }
    })

    if (!tag) {
      return apiErrorJson('タグが見つかりません', 404, 'NOT_FOUND')
    }

    return NextResponse.json(tag)
  } catch (error) {
    return apiErrorResponse(error, 'タグを取得できませんでした')
  }
}

// タグ更新（管理者のみ）
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    // 管理者チェック
    if (!auth.isAdmin) {
      return apiErrorJson('管理者権限が必要です', 403, 'FORBIDDEN')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('タグIDが不正です', 400, 'VALIDATION_ERROR')
    const parsed = tagUpdateSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, 'タグの入力値を確認してください')
    const data = parsed.data

    // タグを更新
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(data.name === undefined ? {} : { name: data.name }),
        ...(data.category === undefined ? {} : { category: data.category }),
        ...(data.description === undefined ? {} : { description: data.description })
      }
    })

    return NextResponse.json(tag)
  } catch (error) {
    return apiErrorResponse(error, 'タグを更新できませんでした')
  }
}

// タグ削除（管理者のみ）
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    // 管理者チェック
    if (!auth.isAdmin) {
      return apiErrorJson('管理者権限が必要です', 403, 'FORBIDDEN')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('タグIDが不正です', 400, 'VALIDATION_ERROR')

    // タグを削除（CASCADE設定により、product_tagsも自動削除される）
    const result = await prisma.tag.deleteMany({ where: { id } })
    if (result.count === 0) return apiErrorJson('タグが見つかりません', 404, 'NOT_FOUND')

    return NextResponse.json({ message: 'Tag deleted successfully' })
  } catch (error) {
    return apiErrorResponse(error, 'タグを削除できませんでした')
  }
}

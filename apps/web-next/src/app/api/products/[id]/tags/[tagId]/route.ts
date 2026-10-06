import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

type RouteParams = {
  params: Promise<{
    id: string
    tagId: string
  }>
}

// 製品からタグを削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const { id: idStr, tagId: tagIdStr } = await params
    const productId = Number(idStr)
    const tagId = Number(tagIdStr)
    if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isSafeInteger(tagId) || tagId < 1) {
      return apiErrorJson('製品IDまたはタグIDが不正です', 400, 'VALIDATION_ERROR')
    }

    // タグを削除
    const result = await prisma.productTag.deleteMany({ where: { productId, tagId } })
    if (result.count === 0) return apiErrorJson('製品にこのタグは設定されていません', 404, 'NOT_FOUND')

    return NextResponse.json({ message: 'Tag removed successfully' })
  } catch (error) {
    return apiErrorResponse(error, '製品タグを解除できませんでした')
  }
}

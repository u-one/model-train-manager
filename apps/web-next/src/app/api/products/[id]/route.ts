import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, getAuthSession } from '@/lib/server/auth'
import { buildProductDetailInclude } from '@/lib/product-detail-query'
import { productInputSchema } from '@/lib/contracts/product'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { updateProduct } from '@/lib/server/products'
import { apiJson, apiJsonAs } from '@/lib/server/api-json'
import type { ProductDetailApiOutput } from '@/lib/contracts/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) {
      return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')
    }
    const session = await getAuthSession()

    const product = await prisma.product.findUnique({
      where: { id },
      include: buildProductDetailInclude(session),
    })

    if (!product) {
      return apiErrorJson('製品が見つかりません', 404, 'NOT_FOUND')
    }

    return apiJsonAs<ProductDetailApiOutput>()(product)
  } catch (error) {
    return apiErrorResponse(error, '製品詳細を取得できませんでした')
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, user } = await getAuthContext()
    if (!session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }
    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')
    const parsed = productInputSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '入力値を確認してください')
    const product = await updateProduct(id, parsed.data)

    return apiJson(product)
  } catch (error) {
    return apiErrorResponse(error, '製品を更新できませんでした')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, isAdmin } = await getAuthContext()
    if (!session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }
    if (!isAdmin) {
      return apiErrorJson('管理者権限が必要です', 403, 'FORBIDDEN')
    }

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')

    const result = await prisma.product.deleteMany({ where: { id } })
    if (result.count === 0) return apiErrorJson('製品が見つかりません', 404, 'NOT_FOUND')

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    return apiErrorResponse(error, '製品を削除できませんでした')
  }
}

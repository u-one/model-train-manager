import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { z } from 'zod'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }
    if (!auth.user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const parsed = z.object({ brand: z.string().trim().min(1).max(100), productCode: z.string().trim().min(1).max(100) }).strict().safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, 'メーカーと品番を確認してください')
    const { brand, productCode } = parsed.data

    // 大文字小文字を無視した完全一致の候補件数で判定する。
    const products = await prisma.product.findMany({
      where: {
        brand: {
          equals: brand,
          mode: 'insensitive'
        },
        productCode: {
          equals: productCode,
          mode: 'insensitive'
        }
      },
      include: { realVehicles: true },
      take: 2
    })

    if (products.length === 0) {
      return apiErrorJson('マッチする製品が見つかりません', 404, 'NOT_FOUND', {
        suggestion: '新しい製品として登録するか、メーカー・品番を確認してください'
      })
    }
    if (products.length > 1) return apiErrorJson('一致する製品が複数あります', 409, 'CONFLICT')

    return NextResponse.json({ product: products[0] })
  } catch (error) {
    return apiErrorResponse(error, '製品を照合できませんでした')
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext } from '@/lib/server/auth'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { convertIndependentVehiclesToProducts } from '@/lib/server/products'

// 独立車両の一括製品変換API
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }
    if (!auth.user) return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')

    const parsed = z.object({
      ownedVehicleIds: z.array(z.number().int().positive()).min(1).max(200).refine(ids => new Set(ids).size === ids.length)
    }).strict().safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '一括変換の入力値を確認してください')

    const results = await convertIndependentVehiclesToProducts(parsed.data.ownedVehicleIds, auth.user.id)
    return NextResponse.json({ success: true, results })
  } catch (error) {
    return apiErrorResponse(error, '独立車両を製品に変換できませんでした')
  }
}

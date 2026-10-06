import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/server/auth'
import { deleteAllProductData } from '@/lib/server/data-management'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

export async function DELETE() {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    if (!auth.isAdmin) {
      return apiErrorJson('管理者権限が必要です', 403, 'FORBIDDEN')
    }

    const result = await deleteAllProductData()

    return NextResponse.json({
      ...result,
      message: 'All products and related data deleted successfully'
    })
  } catch (error) {
    return apiErrorResponse(error, '製品データを一括削除できませんでした')
  }
}

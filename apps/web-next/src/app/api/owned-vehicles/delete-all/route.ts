import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/server/auth'
import { deleteOwnedVehiclesForUser } from '@/lib/server/data-management'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

export async function DELETE() {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const user = auth.user

    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const result = await deleteOwnedVehiclesForUser(user.id)

    return NextResponse.json({
      ...result,
      message: 'All your owned vehicles and related maintenance records deleted successfully'
    })
  } catch (error) {
    return apiErrorResponse(error, '保有車両を一括削除できませんでした')
  }
}

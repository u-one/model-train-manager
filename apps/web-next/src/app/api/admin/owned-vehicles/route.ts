import { NextRequest, NextResponse } from 'next/server'
import { AuthorizationError, requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'
import { apiErrorResponse } from '@/lib/server/api-errors'
import { deleteOwnedVehiclesByIds } from '@/lib/server/data-management'

export async function DELETE(request: NextRequest) {
  try {
    // 管理者権限チェック
    await requireAdmin()

    const parsed = z.object({ ownedVehicleIds: z.array(z.number().int().positive()).min(1).max(1000).refine(ids => new Set(ids).size === ids.length) }).strict().safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '削除する保有車両IDを確認してください')
    const { ownedVehicleIds } = parsed.data
    const result = await deleteOwnedVehiclesByIds(ownedVehicleIds)

    console.log(`Admin deleted ${result.deletedCount} owned vehicles:`, ownedVehicleIds)

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount}件の保有車両を削除しました`
    })

  } catch (error) {
    if (error instanceof AuthorizationError) return apiErrorResponse(error, '管理者権限が必要です')
    return apiErrorResponse(error, '保有車両を一括削除できませんでした')
  }
}

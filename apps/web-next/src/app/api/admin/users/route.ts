import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { apiErrorResponse } from '@/lib/server/api-errors'

export async function GET() {
  try {
    // 管理者権限チェック
    await requireAdmin()

    // ユーザー一覧を保有車両数と共に取得
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            ownedVehicles: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      users
    })
  } catch (error) {
    return apiErrorResponse(error, 'ユーザー一覧を取得できませんでした')
  }
}

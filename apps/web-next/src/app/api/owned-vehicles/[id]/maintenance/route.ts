import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { maintenanceRecordInputSchema } from '@/lib/contracts/maintenance-record'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { apiJson } from '@/lib/server/api-json'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    if (!auth.user) return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')

    const { id: idStr } = await params
    const id = Number(idStr)
    if (!Number.isSafeInteger(id) || id < 1) return apiErrorJson('保有車両IDが不正です', 400, 'VALIDATION_ERROR')

    const parsed = maintenanceRecordInputSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '入力値を確認してください')

    const ownedVehicle = await prisma.ownedVehicle.findFirst({
      where: { id, userId: auth.user.id },
      select: { id: true }
    })
    if (!ownedVehicle) return apiErrorJson('保有車両が見つかりません', 404, 'NOT_FOUND')

    const record = await prisma.maintenanceRecord.create({
      data: {
        ownedVehicleId: ownedVehicle.id,
        maintenanceDate: new Date(`${parsed.data.maintenanceDate}T00:00:00.000Z`),
        content: parsed.data.content
      }
    })
    return apiJson(record, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, '整備記録を追加できませんでした')
  }
}

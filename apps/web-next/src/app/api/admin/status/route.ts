import { NextResponse } from 'next/server'
import { getAdminStatus } from '@/lib/admin-auth'
import { apiErrorResponse } from '@/lib/server/api-errors'

export async function GET() {
  try {
    const status = await getAdminStatus()
    return NextResponse.json(status)
  } catch (error) {
    return apiErrorResponse(error, '管理者状態を確認できませんでした')
  }
}

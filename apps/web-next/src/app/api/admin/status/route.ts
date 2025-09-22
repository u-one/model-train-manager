import { NextResponse } from 'next/server'
import { getAdminStatus } from '@/lib/admin-auth'

export async function GET() {
  try {
    const status = await getAdminStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Admin status check error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
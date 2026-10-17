import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiErrorResponse } from '@/lib/server/api-errors'

export async function GET() {
  try {
    // データベース接続テスト
    await prisma.$connect()

    // テーブル存在確認（簡単なクエリ）
    const userCount = await prisma.user.count()
    const productCount = await prisma.product.count()

    return NextResponse.json({
      success: true,
      message: 'データベース接続成功',
      data: {
        userCount,
        productCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return apiErrorResponse(error, 'データベース接続を確認できませんでした')
  } finally {
    await prisma.$disconnect()
  }
}

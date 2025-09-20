import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    console.error('Database connection error:', error)
    return NextResponse.json({
      success: false,
      message: 'データベース接続エラー',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
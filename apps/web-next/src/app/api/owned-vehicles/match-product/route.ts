import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brand, productCode } = await request.json()

    if (!brand || !productCode) {
      return NextResponse.json(
        { error: 'メーカーと品番は必須です' },
        { status: 400 }
      )
    }

    // メーカーと品番で製品を検索
    const product = await prisma.product.findFirst({
      where: {
        brand: {
          equals: brand,
          mode: 'insensitive'
        },
        productCode: {
          equals: productCode,
          mode: 'insensitive'
        }
      },
      include: {
        realVehicles: true
      }
    })

    if (!product) {
      return NextResponse.json(
        {
          error: 'マッチする製品が見つかりません',
          suggestion: '新しい製品として登録するか、メーカー・品番を確認してください'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Product matching error:', error)
    return NextResponse.json(
      { error: '製品マッチング処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}
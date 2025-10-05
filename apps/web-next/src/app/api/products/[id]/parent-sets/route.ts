import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 製品が所属するセット一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)

    // 指定された製品情報を取得
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { productCode: true, type: true, parentCode: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const parentSets: Array<{
      id: number
      brand: string
      productCode: string | null
      name: string
      type: string
      releaseYear: number | null
      priceExcludingTax: number | null
      priceIncludingTax: number | null
      description: string | null
      imageUrls: string[]
      realVehicles: Array<{
        id: number
        vehicleType: string | null
        company: string | null
        manufacturingYear: string | null
        operationLine: string | null
        notes: string | null
      }>
      _count: { ownedVehicles: number }
    }> = []

    // パターン1: SET_SINGLEタイプで、parentCodeが設定されている場合
    if (product.type === 'SET_SINGLE' && product.parentCode) {
      const parentSet = await prisma.product.findFirst({
        where: {
          productCode: product.parentCode,
          type: 'SET'
        },
        include: {
          realVehicles: true,
          _count: { select: { ownedVehicles: true } }
        }
      })

      if (parentSet) {
        parentSets.push(parentSet)
      }
    }

    // パターン2: 単品製品が複数のセットで使用されている場合
    // この場合は、この製品のproductCodeをparentCodeとして持つSET_SINGLEを探し、
    // さらにそのparentCodeでセットを特定する
    if (product.type === 'SINGLE') {
      const usageInSets = await prisma.product.findMany({
        where: {
          productCode: product.productCode,
          type: 'SET_SINGLE',
          parentCode: { not: null }
        },
        select: { parentCode: true }
      })

      const setProductCodes = [...new Set(usageInSets.map(item => item.parentCode).filter(Boolean))] as string[]

      if (setProductCodes.length > 0) {
        const sets = await prisma.product.findMany({
          where: {
            productCode: { in: setProductCodes },
            type: 'SET'
          },
          include: {
            realVehicles: true,
            _count: { select: { ownedVehicles: true } }
          }
        })

        parentSets.push(...sets)
      }
    }

    return NextResponse.json({ parentSets })
  } catch (error) {
    console.error('Parent sets fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch parent sets' }, { status: 500 })
  }
}
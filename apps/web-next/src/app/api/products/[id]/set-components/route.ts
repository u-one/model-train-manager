import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PRODUCT_TYPE_SET, PRODUCT_TYPE_SET_SINGLE } from '@/constants/productTypes'

// セットの構成車両一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)

    // 指定された製品がセットかどうか確認
    const setProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { productCode: true, type: true }
    })

    if (!setProduct || setProduct.type !== PRODUCT_TYPE_SET) {
      return NextResponse.json({ error: 'Product is not a set' }, { status: 400 })
    }

    // セットの構成車両を取得（parentCodeで関連付け）
    const components = await prisma.product.findMany({
      where: {
        parentCode: setProduct.productCode,
        type: PRODUCT_TYPE_SET_SINGLE
      },
      include: {
        realVehicles: true,
        _count: { select: { ownedVehicles: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ components })
  } catch (error) {
    console.error('Set components fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch set components' }, { status: 500 })
  }
}

// セット構成車両の追加・更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)
    const { componentData } = await request.json()

    // 指定された製品がセットかどうか確認
    const setProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { productCode: true, type: true }
    })

    if (!setProduct || setProduct.type !== PRODUCT_TYPE_SET) {
      return NextResponse.json({ error: 'Product is not a set' }, { status: 400 })
    }

    // 構成車両を作成（parentCodeを設定）
    const component = await prisma.product.create({
      data: {
        ...componentData,
        type: PRODUCT_TYPE_SET_SINGLE,
        parentCode: setProduct.productCode
      },
      include: {
        realVehicles: true,
        _count: { select: { ownedVehicles: true } }
      }
    })

    return NextResponse.json(component, { status: 201 })
  } catch (error) {
    console.error('Set component create error:', error)
    return NextResponse.json({ error: 'Failed to create set component' }, { status: 500 })
  }
}
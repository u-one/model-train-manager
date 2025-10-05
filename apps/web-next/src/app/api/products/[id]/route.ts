import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const session = await getServerSession(authOptions)

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        realVehicles: true,
        ownedVehicles: session ? {
          where: {
            userId: parseInt(session.user.id)
          },
          include: {
            user: { select: { id: true, name: true } }
          }
        } : false,
        createdByUser: { select: { id: true, name: true } },
        productTags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const data = await request.json()
    const { realVehicles, ...productData } = data

    // 既存の実車情報を削除してから新しい情報を作成
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...productData,
        realVehicles: {
          deleteMany: {}, // 既存の実車情報を全て削除
          create: realVehicles || [] // 新しい実車情報を作成
        }
      },
      include: {
        realVehicles: true,
        _count: { select: { ownedVehicles: true } }
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Product delete error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
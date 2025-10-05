import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// 製品のタグ一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productTags: {
          include: {
            tag: true
          },
          orderBy: {
            tag: {
              category: 'asc'
            }
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const tags = product.productTags.map((pt: { tag: unknown }) => pt.tag)

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Product tags fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch product tags' }, { status: 500 })
  }
}

// 製品のタグ更新（一括置き換え）
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr)
    const data = await request.json()
    const { tagIds } = data as { tagIds: number[] }

    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ error: 'tagIds must be an array' }, { status: 400 })
    }

    // 製品が存在するか確認
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // トランザクションで既存タグを削除して新しいタグを追加
    await prisma.$transaction(async (tx) => {
      // 既存のタグをすべて削除
      await tx.productTag.deleteMany({
        where: { productId: id }
      })

      // 新しいタグを追加
      if (tagIds.length > 0) {
        await tx.productTag.createMany({
          data: tagIds.map(tagId => ({
            productId: id,
            tagId
          })),
          skipDuplicates: true
        })
      }
    })

    // 更新後のタグを取得
    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        productTags: {
          include: {
            tag: true
          }
        }
      }
    })

    const tags = updatedProduct?.productTags.map((pt: { tag: unknown }) => pt.tag) || []

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Product tags update error:', error)
    return NextResponse.json({ error: 'Failed to update product tags' }, { status: 500 })
  }
}

// 製品にタグを追加
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr)
    const data = await request.json()
    const { tagId } = data

    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
    }

    // 製品が存在するか確認
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // タグが存在するか確認
    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // タグを追加
    await prisma.productTag.create({
      data: {
        productId: id,
        tagId
      }
    })

    return NextResponse.json({ message: 'Tag added successfully' }, { status: 201 })
  } catch (error) {
    console.error('Product tag addition error:', error)

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Tag already exists for this product' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Failed to add tag to product' }, { status: 500 })
  }
}

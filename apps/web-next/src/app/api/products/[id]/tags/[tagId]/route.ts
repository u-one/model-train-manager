import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    id: string
    tagId: string
  }>
}

// 製品からタグを削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idStr, tagId: tagIdStr } = await params
    const productId = parseInt(idStr)
    const tagId = parseInt(tagIdStr)

    // タグを削除
    await prisma.productTag.delete({
      where: {
        productId_tagId: {
          productId,
          tagId
        }
      }
    })

    return NextResponse.json({ message: 'Tag removed successfully' })
  } catch (error) {
    console.error('Product tag deletion error:', error)

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Tag not found for this product' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to remove tag from product' }, { status: 500 })
  }
}

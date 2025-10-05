import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// タグ取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productTags: true }
        }
      }
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Tag fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 })
  }
}

// タグ更新（管理者のみ）
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者チェック
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr)
    const data = await request.json()

    const { name, category, description } = data

    // タグを更新
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(description !== undefined && { description })
      }
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Tag update error:', error)

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
  }
}

// タグ削除（管理者のみ）
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者チェック
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr)

    // タグを削除（CASCADE設定により、product_tagsも自動削除される）
    await prisma.tag.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Tag deleted successfully' })
  } catch (error) {
    console.error('Tag deletion error:', error)

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// タグ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // フィルタ条件
    const where = category ? { category } : {}

    // タグ一覧を取得
    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ],
        take: limit,
        skip: offset
      }),
      prisma.tag.count({ where })
    ])

    // カテゴリ一覧を取得
    const categories = await prisma.tag.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    })

    return NextResponse.json({
      tags,
      total,
      categories: categories.map((c: { category: string; _count: { category: number } }) => ({
        category: c.category,
        count: c._count.category
      }))
    })
  } catch (error) {
    console.error('Tags fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

// タグ作成（管理者のみ）
export async function POST(request: NextRequest) {
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

    const data = await request.json()
    const { name, category, description } = data

    // バリデーション
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    // タグを作成
    const tag = await prisma.tag.create({
      data: {
        name,
        category,
        description
      }
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Tag creation error:', error)

    // 重複エラーのチェック
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}

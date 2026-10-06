import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { tagInputSchema } from '@/lib/contracts/tag'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { apiJsonAs } from '@/lib/server/api-json'
import type { TagListApiOutput } from '@/lib/contracts/api'
import { z } from 'zod'

const tagListQuerySchema = z.object({
  category: z.string().trim().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).max(1000000).default(0)
})

// タグ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = tagListQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) return apiErrorResponse(parsed.error, 'タグ一覧の検索条件を確認してください')
    const { category, limit, offset } = parsed.data

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

    return apiJsonAs<TagListApiOutput>()({
      tags,
      total,
      categories: categories.map((c: { category: string; _count: { category: number } }) => ({
        category: c.category,
        count: c._count.category
      }))
    })
  } catch (error) {
    return apiErrorResponse(error, 'タグ一覧を取得できませんでした')
  }
}

// タグ作成（管理者のみ）
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    // 管理者チェック
    if (!auth.isAdmin) {
      return apiErrorJson('管理者権限が必要です', 403, 'FORBIDDEN')
    }

    const parsed = tagInputSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, 'タグの入力値を確認してください')
    const { name, category, description } = parsed.data

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
    return apiErrorResponse(error, 'タグを作成できませんでした')
  }
}

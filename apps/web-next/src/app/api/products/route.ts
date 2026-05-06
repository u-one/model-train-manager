import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { Prisma, ProductType } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PRODUCT_TYPE_SET_SINGLE } from '@/constants/productTypes'

// カンマ区切りの数値リストを number[] に変換するカスタム型
const commaNumberList = z.string()
  .optional()
  .transform(s => s ? s.split(',').map(Number).filter(n => Number.isInteger(n) && n > 0) : [])

const querySchema = z.object({
  brand:              z.string().optional(),
  type:               z.enum(['SINGLE', 'SET', 'SET_SINGLE'] as const).optional(),
  search:             z.string().optional(),
  excludeSetSingle:   z.string().optional().transform(v => v === 'true'),
  sortBy:             z.enum(['createdAt', 'name', 'brandCode', 'category']).default('createdAt'),
  sortOrder:          z.enum(['asc', 'desc']).default('asc'),
  page:               z.coerce.number().int().min(1).default(1),
  limit:              z.coerce.number().int().min(1).default(100),
  tags:               commaNumberList,
  tag_operator:       z.enum(['AND', 'OR']).default('OR'),
  exclude_tags:       commaNumberList,
  no_tags_categories: z.string().optional().transform(s => s ? s.split(',') : []),
})

type QueryParams = z.infer<typeof querySchema>

function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  return querySchema.parse(Object.fromEntries(searchParams))
}

function buildWhereClause(params: QueryParams): Prisma.ProductWhereInput {
  const { brand, type, search, excludeSetSingle, tags, tag_operator, exclude_tags, no_tags_categories } = params
  const where: Prisma.ProductWhereInput = {}

  if (brand) where.brand = brand

  // type フィルタの処理
  if (type) {
    where.type = type
  } else if (excludeSetSingle) {
    // typeが指定されていない場合のみexcludeSetSingleを適用
    where.type = { not: PRODUCT_TYPE_SET_SINGLE }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { productCode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }

  // カテゴリ別「なし」条件とタグフィルタを組み合わせる
  const tagConditions: Prisma.ProductWhereInput[] = []

  // 通常のタグフィルタ
  if (tags.length > 0) {
    if (tag_operator === 'AND') {
      // AND検索: 各タグを個別のsome条件にすることで全タグ一致をDBで解決
      tagConditions.push(
        ...tags.map((tagId: number) => ({
          productTags: { some: { tagId } }
        }))
      )
    } else {
      // OR検索: 指定されたタグのいずれかを持つ製品
      tagConditions.push({
        productTags: {
          some: {
            tagId: { in: tags }
          }
        }
      })
    }
  }

  // カテゴリ別「なし」条件
  if (no_tags_categories.length > 0) {
    for (const category of no_tags_categories) {
      tagConditions.push({
        NOT: {
          productTags: {
            some: {
              tag: {
                category: category
              }
            }
          }
        }
      })
    }
  }

  // 除外タグの処理
  if (exclude_tags.length > 0) {
    tagConditions.push({
      NOT: {
        productTags: {
          some: {
            tagId: { in: exclude_tags }
          }
        }
      }
    })
  }

  // 条件を統合
  if (tagConditions.length > 0) {
    where.AND = tagConditions
  }

  return where
}

function buildOrderBy(sortBy: string, sortOrder: Prisma.SortOrder): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'createdAt':
      // 登録順
      return { createdAt: sortOrder }
    case 'name':
      // 名称
      return { name: sortOrder }
    case 'brandCode':
      // メーカー＋品番
      return [
        { brand: sortOrder },
        { productCode: sortOrder }
      ]
    case 'category':
      // 分類順（タイプ→メーカー→品番）
      return [
        { type: sortOrder },
        { brand: sortOrder },
        { productCode: sortOrder }
      ]
    default:
      return { createdAt: 'asc' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const params = parseQueryParams(searchParams)
    const { page, limit } = params
    const offset = (page - 1) * limit

    // ログインユーザーを取得
    let currentUserId = null
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      currentUserId = user?.id
    }

    const where = buildWhereClause(params)
    const orderBy = buildOrderBy(params.sortBy, params.sortOrder)

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          realVehicles: true,
          productTags: {
            include: {
              tag: true
            }
          },
          _count: currentUserId ? {
            select: {
              ownedVehicles: {
                where: { userId: currentUserId }
              }
            }
          } : undefined
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const data = await request.json()
    const { realVehicles, ...productData } = data

    // ユーザー情報を取得（認証がない場合はnull）
    let createdByUserId = null
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      createdByUserId = user?.id || null
    }

    const product = await prisma.product.create({
      data: {
        ...productData,
        createdByUserId,
        realVehicles: realVehicles ? {
          create: realVehicles
        } : undefined
      },
      include: {
        realVehicles: true,
        _count: { select: { ownedVehicles: true } }
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Product create error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
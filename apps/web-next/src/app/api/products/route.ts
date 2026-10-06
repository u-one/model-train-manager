import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { parseQueryParams, buildWhereClause, buildOrderBy } from '@/lib/products-query'
import { productInputSchema } from '@/lib/contracts/product'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { createProduct } from '@/lib/server/products'
import { apiJson, apiJsonAs } from '@/lib/server/api-json'
import type { ProductListApiOutput } from '@/lib/contracts/api'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    const { searchParams } = new URL(request.url)
    const params = parseQueryParams(searchParams)
    const { page, limit } = params
    const offset = (page - 1) * limit

    // ログインユーザーを取得
    const currentUserId = auth.session?.user?.email ? auth.user?.id : null

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

    return apiJsonAs<ProductListApiOutput>()({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return apiErrorResponse(error, '製品一覧を取得できませんでした')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, user } = await getAuthContext()
    if (!session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }
    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const parsed = productInputSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '入力値を確認してください')
    const product = await createProduct(parsed.data, user.id)

    return apiJson(product, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, '製品を作成できませんでした')
  }
}

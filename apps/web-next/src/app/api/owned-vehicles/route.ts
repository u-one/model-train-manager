import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminUser } from '@/lib/admin-auth'
import { getAuthContext } from '@/lib/server/auth'
import { parseOwnedVehicleQuery, buildUserWhereClause, buildAdminWhereClause, buildOrderBy, sortOwnedVehicleRows } from '@/lib/owned-vehicles-query'
import { ownedVehicleInputSchema } from '@/lib/contracts/owned-vehicle'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { createOwnedVehicle } from '@/lib/server/owned-vehicles'
import { apiJson, apiJsonAs } from '@/lib/server/api-json'
import type { AdminOwnedVehicleListApiOutput, OwnedVehicleListApiOutput } from '@/lib/contracts/api'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const { searchParams } = new URL(request.url)
    const query = parseOwnedVehicleQuery(searchParams)
    const includeUserAndProduct = searchParams.get('includeUserAndProduct') === 'true'
    const isAdmin = await isAdminUser(auth)

    // 管理者または特別なリクエストでない場合は、通常のユーザー処理
    if (!isAdmin || !includeUserAndProduct) {
      // ユーザーは認証時に自動作成されるため、必ず存在するはず
      const user = auth.user

      if (!user) {
        return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
      }

      const { page, limit } = query
      const offset = (page - 1) * limit
      const where = buildUserWhereClause(user.id, query)
      const orderBy = buildOrderBy(query.sortBy, query.sortOrder)

      const include = {
        product: { include: { realVehicles: true, productTags: { include: { tag: true } } } },
        independentVehicle: true,
        maintenanceRecords: { orderBy: { maintenanceDate: 'desc' as const }, take: 3 }
      } as const
      const displaySort = ['name', 'productCode', 'category'].includes(query.sortBy)
      const [rows, total] = await Promise.all([
        prisma.ownedVehicle.findMany({
          where,
          include,
          orderBy: displaySort ? { id: 'asc' } : orderBy,
          ...(displaySort ? {} : { skip: offset, take: limit })
        }),
        prisma.ownedVehicle.count({ where })
      ])
      const ownedVehicles = displaySort
        ? sortOwnedVehicleRows(rows, query.sortBy, query.sortOrder).slice(offset, offset + limit)
        : rows

      return apiJsonAs<OwnedVehicleListApiOutput>()({
        ownedVehicles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    }

    // 管理者の場合：すべての保有車両をユーザーと製品情報付きで取得
    const adminPage = query.page
    const adminLimit = query.limit
    const adminSearch = query.search
    const adminOffset = (adminPage - 1) * adminLimit

    const adminWhere = buildAdminWhereClause(adminSearch)

    const [ownedVehicles, adminTotal] = await Promise.all([
      prisma.ownedVehicle.findMany({
        where: adminWhere,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          product: {
            select: {
              brand: true,
              productCode: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: adminOffset,
        take: adminLimit
      }),
      prisma.ownedVehicle.count({ where: adminWhere })
    ])

    return apiJsonAs<AdminOwnedVehicleListApiOutput>()({
      ownedVehicles,
      pagination: {
        page: adminPage,
        limit: adminLimit,
        total: adminTotal,
        totalPages: Math.ceil(adminTotal / adminLimit)
      }
    })
  } catch (error) {
    return apiErrorResponse(error, '保有車両一覧を取得できませんでした')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }

    const user = auth.user

    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const parsed = ownedVehicleInputSchema.safeParse(await request.json())
    if (!parsed.success) return apiErrorResponse(parsed.error, '入力値を確認してください')
    const { vehicle, componentOwnedVehicles } = await createOwnedVehicle(parsed.data, user.id)
    return apiJson(componentOwnedVehicles.length ? { ...vehicle, componentOwnedVehicles } : vehicle, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, '保有車両を作成できませんでした')
  }
}

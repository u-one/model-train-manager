import { Prisma } from '@prisma/client'

/**
 * 通常ユーザー向けの WHERE 条件を組み立てる
 */
export function buildUserWhereClause(
  userId: number,
  params: {
    status?: string | null
    condition?: string | null
    isIndependent?: string | null
    brand?: string | null
    type?: string | null
    tags?: string | null
    tagOperator?: string
    search?: string | null
  }
): Prisma.OwnedVehicleWhereInput {
  const { status, condition, isIndependent, brand, type, tags, tagOperator = 'OR', search } = params
  const where: Prisma.OwnedVehicleWhereInput = { userId }

  if (status) where.currentStatus = status as Prisma.EnumVehicleStatusFilter
  if (condition) where.storageCondition = condition as Prisma.EnumStorageConditionFilter

  if (isIndependent === 'true') {
    where.independentVehicle = { isNot: null }
  } else if (isIndependent === 'false') {
    where.independentVehicle = null
  }

  // メーカーフィルタ（製品または独立車両のメーカー）
  if (brand) {
    where.OR = [
      { product: { brand } },
      { independentVehicle: { brand } }
    ]
  }

  // 種別フィルタ（製品の種別のみ）
  if (type) {
    where.product = { type: type as Prisma.EnumProductTypeFilter }
  }

  // タグフィルタ（製品のタグ）
  if (tags) {
    const tagIds = tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    if (tagIds.length > 0) {
      if (tagOperator === 'AND') {
        // AND: すべてのタグを持つ製品
        where.product = {
          ...(where.product as object),
          productTags: {
            every: {
              tagId: { in: tagIds }
            }
          }
        }
      } else {
        // OR: いずれかのタグを持つ製品
        where.product = {
          ...(where.product as object),
          productTags: {
            some: {
              tagId: { in: tagIds }
            }
          }
        }
      }
    }
  }

  if (search) {
    where.OR = [
      { managementId: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { productCode: { contains: search, mode: 'insensitive' } } },
      { independentVehicle: { name: { contains: search, mode: 'insensitive' } } },
      { independentVehicle: { brand: { contains: search, mode: 'insensitive' } } },
      { notes: { contains: search, mode: 'insensitive' } }
    ]
  }

  return where
}

/**
 * 管理者向けの WHERE 条件を組み立てる
 */
export function buildAdminWhereClause(
  search?: string | null
): Prisma.OwnedVehicleWhereInput {
  const where: Prisma.OwnedVehicleWhereInput = {}

  if (search) {
    where.OR = [
      { managementId: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { brand: { contains: search, mode: 'insensitive' } } },
      { product: { productCode: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { notes: { contains: search, mode: 'insensitive' } }
    ]
  }

  return where
}

/**
 * ソート条件を組み立てる
 */
export function buildOrderBy(
  sortBy: string,
  sortOrder: string
): Prisma.OwnedVehicleOrderByWithRelationInput | Prisma.OwnedVehicleOrderByWithRelationInput[] {
  const order = sortOrder as Prisma.SortOrder

  switch (sortBy) {
    case 'purchaseDate':
      // 購入日でソート（nullを最古として扱う）
      return [
        {
          purchaseDate: {
            sort: order,
            nulls: order === 'asc' ? 'first' : 'last'
          }
        }
      ]
    case 'managementId':
      return { managementId: order }
    case 'createdAt':
      return { createdAt: order }
    case 'name':
    case 'productCode':
    case 'category':
      // これらは複数テーブルの条件付きソートのため、フロントエンドでソート
      return { createdAt: order }
    default:
      return { createdAt: 'desc' }
  }
}

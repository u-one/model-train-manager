import { Prisma } from '@prisma/client'
import { z } from 'zod'

const commaNumberList = z.string().optional().transform(value => {
  if (!value) return []
  return value.split(',').map(item => Number(item.trim()))
}).pipe(z.array(z.number().int().positive()).max(100))

const categoryList = z.string().optional().transform(value => {
  if (!value) return []
  return value.split(',').map(item => item.trim()).filter(Boolean)
}).pipe(z.array(z.string().min(1).max(30)).max(20))

export const ownedVehicleQuerySchema = z.object({
  status: z.enum(['NORMAL', 'NEEDS_REPAIR', 'BROKEN']).optional(),
  condition: z.enum(['WITH_CASE', 'WITHOUT_CASE']).optional(),
  isIndependent: z.enum(['true', 'false']).optional(),
  brand: z.string().trim().max(100).optional(),
  type: z.enum(['SINGLE', 'SET', 'SET_SINGLE']).optional(),
  tags: commaNumberList,
  tag_operator: z.enum(['AND', 'OR']).default('OR'),
  exclude_tags: commaNumberList,
  no_tags_categories: categoryList,
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(['purchaseDate', 'managementId', 'createdAt', 'name', 'productCode', 'category']).default('purchaseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100)
})

export type OwnedVehicleQuery = z.infer<typeof ownedVehicleQuerySchema>

export function parseOwnedVehicleQuery(searchParams: URLSearchParams): OwnedVehicleQuery {
  return ownedVehicleQuerySchema.parse(Object.fromEntries(searchParams))
}

export function buildUserWhereClause(userId: number, params: OwnedVehicleQuery): Prisma.OwnedVehicleWhereInput {
  const conditions: Prisma.OwnedVehicleWhereInput[] = []
  if (params.status) conditions.push({ currentStatus: params.status })
  if (params.condition) conditions.push({ storageCondition: params.condition })
  if (params.isIndependent === 'true') conditions.push({ productId: null })
  if (params.isIndependent === 'false') conditions.push({ productId: { not: null } })

  if (params.brand) {
    const brandFilter = { contains: params.brand, mode: 'insensitive' as const }
    conditions.push({ OR: [
      { product: { is: { brand: brandFilter } } },
      { independentVehicle: { is: { brand: brandFilter } } }
    ] })
  }
  if (params.type) conditions.push({ product: { is: { type: params.type } } })

  if (params.tags.length > 0) {
    if (params.tag_operator === 'AND') {
      conditions.push(...params.tags.map(tagId => ({ product: { is: { productTags: { some: { tagId } } } } })))
    } else {
      conditions.push({ product: { is: { productTags: { some: { tagId: { in: params.tags } } } } } })
    }
  }
  if (params.exclude_tags.length > 0) {
    conditions.push({ NOT: { product: { is: { productTags: { some: { tagId: { in: params.exclude_tags } } } } } } })
  }
  for (const category of params.no_tags_categories) {
    conditions.push({ OR: [
      { productId: null },
      { product: { is: { productTags: { none: { tag: { category } } } } } }
    ] })
  }

  if (params.search) {
    const contains = { contains: params.search, mode: 'insensitive' as const }
    conditions.push({ OR: [
      { managementId: contains },
      { notes: contains },
      { product: { is: { name: contains } } },
      { product: { is: { productCode: contains } } },
      { independentVehicle: { is: { name: contains } } },
      { independentVehicle: { is: { brand: contains } } }
    ] })
  }

  return { userId, ...(conditions.length ? { AND: conditions } : {}) }
}

export function buildAdminWhereClause(search?: string): Prisma.OwnedVehicleWhereInput {
  if (!search) return {}
  const contains = { contains: search, mode: 'insensitive' as const }
  return { OR: [
    { managementId: contains },
    { product: { is: { name: contains } } },
    { product: { is: { brand: contains } } },
    { product: { is: { productCode: contains } } },
    { user: { name: contains } },
    { user: { email: contains } },
    { notes: contains }
  ] }
}

export function buildOrderBy(sortBy: OwnedVehicleQuery['sortBy'], sortOrder: Prisma.SortOrder): Prisma.OwnedVehicleOrderByWithRelationInput[] {
  const id = { id: 'asc' as const }
  switch (sortBy) {
    case 'purchaseDate':
      return [{ purchaseDate: { sort: sortOrder, nulls: sortOrder === 'asc' ? 'first' : 'last' } }, id]
    case 'managementId': return [{ managementId: sortOrder }, id]
    case 'createdAt': return [{ createdAt: sortOrder }, id]
    case 'name': return [{ product: { name: sortOrder } }, { independentVehicle: { name: sortOrder } }, id]
    case 'productCode': return [{ product: { productCode: sortOrder } }, { independentVehicle: { productCode: sortOrder } }, id]
    case 'category': return [{ product: { type: sortOrder } }, { independentVehicle: { name: sortOrder } }, id]
  }
}

export function sortOwnedVehicleRows<T extends {
  id: number
  product: { name: string; brand: string; productCode: string | null; type: string } | null
  independentVehicle: { name: string; brand: string | null; productCode: string | null; vehicleType: string | null } | null
}>(rows: T[], sortBy: OwnedVehicleQuery['sortBy'], sortOrder: Prisma.SortOrder): T[] {
  if (!['name', 'productCode', 'category'].includes(sortBy)) return rows
  const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' })
  const valueFor = (row: T) => {
    const name = row.product?.name ?? row.independentVehicle?.name ?? ''
    const brand = row.product?.brand ?? row.independentVehicle?.brand ?? ''
    const productCode = row.product?.productCode ?? row.independentVehicle?.productCode ?? ''
    const category = row.product?.type ?? row.independentVehicle?.vehicleType ?? ''
    if (sortBy === 'name') return [name]
    if (sortBy === 'productCode') return [brand, productCode]
    return [category, brand, productCode]
  }
  return [...rows].sort((left, right) => {
    const leftValues = valueFor(left)
    const rightValues = valueFor(right)
    for (let index = 0; index < leftValues.length; index++) {
      const compared = collator.compare(leftValues[index], rightValues[index])
      if (compared !== 0) return sortOrder === 'asc' ? compared : -compared
    }
    return left.id - right.id
  })
}

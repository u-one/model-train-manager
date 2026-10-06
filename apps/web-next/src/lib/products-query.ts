import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { PRODUCT_TYPE_SET_SINGLE } from '@/constants/productTypes'

const commaNumberList = z.string().optional().transform(value => {
  if (!value) return []
  return value.split(',').map(item => Number(item.trim()))
}).pipe(z.array(z.number().int().positive()).max(100))

const categoryList = z.string().optional().transform(value => {
  if (!value) return []
  return value.split(',').map(item => item.trim()).filter(Boolean)
}).pipe(z.array(z.string().min(1).max(30)).max(20))

export const querySchema = z.object({
  brand: z.string().trim().max(100).optional(),
  type: z.enum(['SINGLE', 'SET', 'SET_SINGLE']).optional(),
  search: z.string().trim().max(200).optional(),
  excludeSetSingle: z.enum(['true', 'false']).optional().transform(value => value === 'true'),
  sortBy: z.enum(['createdAt', 'name', 'brandCode', 'category']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  tags: commaNumberList,
  tag_operator: z.enum(['AND', 'OR']).default('OR'),
  exclude_tags: commaNumberList,
  no_tags_categories: categoryList
})

export type QueryParams = z.infer<typeof querySchema>

export function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  return querySchema.parse(Object.fromEntries(searchParams))
}

export function buildWhereClause(params: QueryParams): Prisma.ProductWhereInput {
  const conditions: Prisma.ProductWhereInput[] = []
  if (params.brand) conditions.push({ brand: { equals: params.brand, mode: 'insensitive' } })

  if (params.type) conditions.push({ type: params.type })
  else if (params.excludeSetSingle) conditions.push({ type: { not: PRODUCT_TYPE_SET_SINGLE } })

  if (params.search) {
    conditions.push({ OR: [
      { name: { contains: params.search, mode: 'insensitive' } },
      { productCode: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } }
    ] })
  }

  if (params.tags.length > 0) {
    if (params.tag_operator === 'AND') {
      conditions.push(...params.tags.map(tagId => ({ productTags: { some: { tagId } } })))
    } else {
      conditions.push({ productTags: { some: { tagId: { in: params.tags } } } })
    }
  }

  if (params.exclude_tags.length > 0) {
    conditions.push({ NOT: { productTags: { some: { tagId: { in: params.exclude_tags } } } } })
  }

  for (const category of params.no_tags_categories) {
    conditions.push({ NOT: { productTags: { some: { tag: { category } } } } })
  }

  return conditions.length ? { AND: conditions } : {}
}

export function buildOrderBy(sortBy: QueryParams['sortBy'], sortOrder: Prisma.SortOrder): Prisma.ProductOrderByWithRelationInput[] {
  const tieBreaker = { id: 'asc' as const }
  switch (sortBy) {
    case 'createdAt': return [{ createdAt: sortOrder }, tieBreaker]
    case 'name': return [{ name: sortOrder }, tieBreaker]
    case 'brandCode': return [{ brand: sortOrder }, { productCode: sortOrder }, tieBreaker]
    case 'category': return [{ type: sortOrder }, { brand: sortOrder }, { productCode: sortOrder }, tieBreaker]
  }
}

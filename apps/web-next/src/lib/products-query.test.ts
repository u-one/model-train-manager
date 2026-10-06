import { describe, expect, it } from 'vitest'

import { buildWhereClause, parseQueryParams } from './products-query'

describe('products-query', () => {
  it('AND検索、タグAND、除外タグ、カテゴリなしを同時に組み立てる', () => {
    const params = parseQueryParams(new URLSearchParams({
      brand: 'KATO',
      search: 'E233',
      tags: '1,2',
      tag_operator: 'AND',
      exclude_tags: '3',
      no_tags_categories: '通勤型'
    }))

    const where = buildWhereClause(params)

    expect(where.AND).toEqual(expect.arrayContaining([
      { brand: { equals: 'KATO', mode: 'insensitive' } },
      { OR: expect.arrayContaining([
        { name: { contains: 'E233', mode: 'insensitive' } },
        { productCode: { contains: 'E233', mode: 'insensitive' } },
        { description: { contains: 'E233', mode: 'insensitive' } }
      ]) },
      { productTags: { some: { tagId: 1 } } },
      { productTags: { some: { tagId: 2 } } },
      { NOT: { productTags: { some: { tagId: { in: [3] } } } } },
      { NOT: { productTags: { some: { tag: { category: '通勤型' } } } } }
    ]))
  })

  it('ページ・タグの不正値を拒否し、同値の一覧をIDで安定化する', () => {
    expect(() => parseQueryParams(new URLSearchParams({ page: '0' }))).toThrow()
    expect(() => parseQueryParams(new URLSearchParams({ tags: '1,x' }))).toThrow()

    const params = parseQueryParams(new URLSearchParams({ sortBy: 'name', sortOrder: 'asc' }))
    expect(buildWhereClause(params)).toEqual({})
  })
})

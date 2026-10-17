import { describe, expect, it } from 'vitest'

import {
  buildOrderBy,
  buildUserWhereClause,
  parseOwnedVehicleQuery,
  sortOwnedVehicleRows
} from './owned-vehicles-query'

describe('owned-vehicles-query', () => {
  it('メーカー・検索・タグ条件をANDで組み合わせ、なしカテゴリに独立車両を含める', () => {
    const params = parseOwnedVehicleQuery(new URLSearchParams({
      brand: 'KATO',
      search: 'E233',
      tags: '1,2',
      tag_operator: 'AND',
      no_tags_categories: '通勤型'
    }))

    const where = buildUserWhereClause(7, params)

    expect(where.userId).toBe(7)
    expect(where.AND).toEqual(expect.arrayContaining([
      { OR: expect.arrayContaining([
        { product: { is: { brand: { contains: 'KATO', mode: 'insensitive' } } } },
        { independentVehicle: { is: { brand: { contains: 'KATO', mode: 'insensitive' } } } }
      ]) },
      { product: { is: { productTags: { some: { tagId: 1 } } } } },
      { product: { is: { productTags: { some: { tagId: 2 } } } } },
      { OR: [
        { productId: null },
        { product: { is: { productTags: { none: { tag: { category: '通勤型' } } } } } }
      ] }
    ]))
  })

  it('製品と独立車両をまとめた表示値で全件ソートしてからページを切れる', () => {
    const rows = [
      { id: 8, product: { name: '列車10', brand: 'KATO', productCode: '10-10', type: 'SINGLE' }, independentVehicle: null },
      { id: 3, product: null, independentVehicle: { name: '列車2', brand: 'KATO', productCode: '10-2', vehicleType: '電車' } },
      { id: 2, product: null, independentVehicle: { name: '列車2', brand: 'KATO', productCode: '10-2', vehicleType: '電車' } }
    ]

    const sorted = sortOwnedVehicleRows(rows, 'name', 'asc')

    expect(sorted.map(row => row.id)).toEqual([2, 3, 8])
    expect(sorted.slice(0, 2).map(row => row.id)).toEqual([2, 3])
    expect(sorted.slice(2, 4).map(row => row.id)).toEqual([8])
    expect(buildOrderBy('purchaseDate', 'desc')).toEqual([
      { purchaseDate: { sort: 'desc', nulls: 'last' } },
      { id: 'asc' }
    ])
  })

  it('ページ範囲とenum値を検証する', () => {
    expect(() => parseOwnedVehicleQuery(new URLSearchParams({ page: '0' }))).toThrow()
    expect(() => parseOwnedVehicleQuery(new URLSearchParams({ status: 'INVALID' }))).toThrow()
  })
})

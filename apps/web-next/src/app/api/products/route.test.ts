import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const { mockFindMany, mockCount, mockUserFindUnique } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockUserFindUnique: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: mockFindMany,
      count: mockCount,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}))

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/products')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString())
}

const mockProduct = (overrides = {}) => ({
  id: 1,
  name: 'Test Product',
  brand: 'KATO',
  productCode: '10-001',
  type: 'EC',
  productTags: [],
  realVehicles: [],
  ...overrides,
})

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
  })

  // --- レスポンス形式 ---

  it('製品一覧とページネーションを返す', async () => {
    const products = [mockProduct()]
    mockFindMany.mockResolvedValue(products)
    mockCount.mockResolvedValue(1)

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.products).toEqual(products)
    expect(data.pagination).toEqual({ page: 1, limit: 100, total: 1, totalPages: 1 })
  })

  it('デフォルトは page=1, limit=100', async () => {
    await GET(makeRequest())

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 })
    )
  })

  it('page/limit パラメータが反映される', async () => {
    mockCount.mockResolvedValue(50)
    await GET(makeRequest({ page: '2', limit: '10' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    )
  })

  it('totalPages が正しく計算される', async () => {
    mockCount.mockResolvedValue(25)

    const res = await GET(makeRequest({ limit: '10' }))
    const data = await res.json()

    expect(data.pagination.totalPages).toBe(3)
  })

  // --- WHERE 条件 ---

  it('brand フィルタが適用される', async () => {
    await GET(makeRequest({ brand: 'KATO' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ brand: 'KATO' }),
      })
    )
  })

  it('type フィルタが適用される', async () => {
    await GET(makeRequest({ type: 'EC' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'EC' }),
      })
    )
  })

  it('excludeSetSingle=true で SET_SINGLE が除外される', async () => {
    await GET(makeRequest({ excludeSetSingle: 'true' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: { not: 'SET_SINGLE' } }),
      })
    )
  })

  it('type が指定された場合 excludeSetSingle は無視される', async () => {
    await GET(makeRequest({ type: 'EC', excludeSetSingle: 'true' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'EC' }),
      })
    )
  })

  it('search パラメータで OR 検索が行われる', async () => {
    await GET(makeRequest({ search: 'E231' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'E231', mode: 'insensitive' } },
            { productCode: { contains: 'E231', mode: 'insensitive' } },
            { description: { contains: 'E231', mode: 'insensitive' } },
          ],
        }),
      })
    )
  })

  // --- タグフィルタ ---

  it('tags=OR でいずれかのタグを持つ製品が取得される', async () => {
    await GET(makeRequest({ tags: '1,2', tag_operator: 'OR' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { productTags: { some: { tagId: { in: [1, 2] } } } },
          ]),
        }),
      })
    )
  })

  it('tags=AND でアプリ側フィルタが動作する', async () => {
    const products = [
      mockProduct({ id: 1, productTags: [{ tagId: 1 }, { tagId: 2 }] }),
      mockProduct({ id: 2, productTags: [{ tagId: 1 }] }),
    ]
    mockFindMany.mockResolvedValue(products)
    mockCount.mockResolvedValue(2)

    const res = await GET(makeRequest({ tags: '1,2', tag_operator: 'AND' }))
    const data = await res.json()

    // 両タグを持つ製品のみ返る
    expect(data.products).toHaveLength(1)
    expect(data.products[0].id).toBe(1)
  })

  it('exclude_tags で指定タグを持つ製品が除外される', async () => {
    await GET(makeRequest({ exclude_tags: '5' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { NOT: { productTags: { some: { tagId: { in: [5] } } } } },
          ]),
        }),
      })
    )
  })

  it('no_tags_categories でカテゴリ未設定の製品が絞り込まれる', async () => {
    await GET(makeRequest({ no_tags_categories: 'vehicle_type' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { NOT: { productTags: { some: { tag: { category: 'vehicle_type' } } } } },
          ]),
        }),
      })
    )
  })

  // --- ソート ---

  it('sortBy=createdAt でソートされる', async () => {
    await GET(makeRequest({ sortBy: 'createdAt', sortOrder: 'desc' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    )
  })

  it('sortBy=name でソートされる', async () => {
    await GET(makeRequest({ sortBy: 'name', sortOrder: 'asc' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } })
    )
  })

  it('sortBy=brandCode でメーカー+品番の複合ソートになる', async () => {
    await GET(makeRequest({ sortBy: 'brandCode', sortOrder: 'asc' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ brand: 'asc' }, { productCode: 'asc' }],
      })
    )
  })

  it('sortBy=category でタイプ→メーカー→品番の複合ソートになる', async () => {
    await GET(makeRequest({ sortBy: 'category', sortOrder: 'asc' }))

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ type: 'asc' }, { brand: 'asc' }, { productCode: 'asc' }],
      })
    )
  })

  // --- ログインユーザー ---

  it('ログイン中は _count.ownedVehicles がユーザーID でフィルタされる', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'test@example.com' },
      expires: '',
    })
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user-123' })

    await GET(makeRequest())

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: {
            select: {
              ownedVehicles: { where: { userId: 'user-123' } },
            },
          },
        }),
      })
    )
  })

  it('未ログインは _count が含まれない', async () => {
    await GET(makeRequest())

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ _count: undefined }),
      })
    )
  })

  // --- エラーハンドリング ---

  it('DB エラー時に 500 を返す', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB error'))

    const res = await GET(makeRequest())

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Failed to fetch products')
  })
})

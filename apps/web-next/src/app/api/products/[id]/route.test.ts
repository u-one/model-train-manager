import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from './route'

// --- モック定義 ---

const { mockFindUnique, mockDeleteMany, mockUpdateProduct, mockGetAuthContext, mockGetAuthSession } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockUpdateProduct: vi.fn(),
  mockGetAuthContext: vi.fn(),
  mockGetAuthSession: vi.fn(),
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
      findUnique: mockFindUnique,
      deleteMany: mockDeleteMany,
    },
  },
}))

vi.mock('@/lib/server/auth', () => ({
  getAuthContext: mockGetAuthContext,
  getAuthSession: mockGetAuthSession,
}))

vi.mock('@/lib/server/products', () => ({
  updateProduct: mockUpdateProduct,
}))

// --- ヘルパー ---

function makeRequest(method: string, body?: unknown): NextRequest {
  const url = 'http://localhost/api/products/1'
  if (body) {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  return new NextRequest(url, { method })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

const mockProductFull = {
  id: 1,
  name: 'テスト製品',
  brand: 'KATO',
  productCode: '10-001',
  type: 'SINGLE',
  realVehicles: [],
  ownedVehicles: [],
  createdByUser: { id: 1, name: 'test' },
  productTags: [],
}

// ==============================
// GET /api/products/[id]
// ==============================

describe('GET /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthSession.mockResolvedValue(null)
    mockGetAuthContext.mockResolvedValue({ session: null, user: null, isAdmin: false })
  })

  it('製品が存在する場合 200 と製品データを返す', async () => {
    mockFindUnique.mockResolvedValueOnce(mockProductFull)

    const res = await GET(makeRequest('GET'), makeParams('1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual(mockProductFull)
  })

  it('製品が存在しない場合 404 を返す', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    const res = await GET(makeRequest('GET'), makeParams('1'))
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data).toMatchObject({ error: '製品が見つかりません', code: 'NOT_FOUND' })
  })

  it('不正な id (NaN) の場合 400 を返す', async () => {
    const res = await GET(makeRequest('GET'), makeParams('abc'))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data).toMatchObject({ error: '製品IDが不正です', code: 'VALIDATION_ERROR' })
    // findUnique は呼ばれない
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('DB エラー時に 500 を返す', async () => {
    mockFindUnique.mockRejectedValueOnce(new Error('DB error'))

    const res = await GET(makeRequest('GET'), makeParams('1'))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data).toMatchObject({ error: '製品詳細を取得できませんでした', code: 'INTERNAL_ERROR' })
  })

  it('未ログイン時は ownedVehicles が含まれない', async () => {
    mockFindUnique.mockResolvedValueOnce(mockProductFull)

    await GET(makeRequest('GET'), makeParams('1'))

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          ownedVehicles: { where: { userId: -1 } },
        }),
      })
    )
  })

  it('ログイン中は ownedVehicles がユーザーID でフィルタされる', async () => {
    mockGetAuthSession.mockResolvedValueOnce({
      user: { id: '42', email: 'test@example.com', name: 'test' },
      expires: '',
    })
    mockFindUnique.mockResolvedValueOnce(mockProductFull)

    await GET(makeRequest('GET'), makeParams('1'))

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          ownedVehicles: { where: { userId: 42 } },
        }),
      })
    )
  })

  it('where.id に正しい整数が渡される', async () => {
    mockFindUnique.mockResolvedValueOnce(mockProductFull)

    await GET(makeRequest('GET'), makeParams('7'))

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 } })
    )
  })
})

// ==============================
// PUT /api/products/[id]
// ==============================

describe('PUT /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthContext.mockResolvedValue({
      session: { user: { email: 'test@example.com' } },
      user: { id: 1, email: 'test@example.com' },
      isAdmin: true,
    })
  })

  it('製品が正常に更新され 200 を返す', async () => {
    const updatedProduct = { id: 1, name: '更新済み', realVehicles: [], _count: { ownedVehicles: 0 } }
    mockUpdateProduct.mockResolvedValueOnce(updatedProduct)

    const res = await PUT(
      makeRequest('PUT', { brand: 'KATO', productCode: '10-001', type: 'SINGLE', name: '更新済み', realVehicles: [] }),
      makeParams('1')
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual(updatedProduct)
  })

  it('realVehicles を含む入力を更新サービスへ渡す', async () => {
    mockUpdateProduct.mockResolvedValueOnce({ id: 1, name: 'test', realVehicles: [], _count: { ownedVehicles: 0 } })

    await PUT(
      makeRequest('PUT', { brand: 'KATO', productCode: '10-001', type: 'SINGLE', name: 'test', realVehicles: [{ vehicleType: 'EC' }] }),
      makeParams('1')
    )

    expect(mockUpdateProduct).toHaveBeenCalledWith(1, expect.objectContaining({ realVehicles: [{ vehicleType: 'EC' }] }))
  })

  it('realVehicles 未指定の入力を更新サービスへ渡す', async () => {
    mockUpdateProduct.mockResolvedValueOnce({ id: 1, name: 'test', realVehicles: [], _count: { ownedVehicles: 0 } })

    await PUT(
      makeRequest('PUT', { brand: 'KATO', productCode: '10-001', type: 'SINGLE', name: 'test' }),
      makeParams('1')
    )

    expect(mockUpdateProduct).toHaveBeenCalledWith(1, expect.not.objectContaining({ realVehicles: expect.anything() }))
  })

  it('DB エラー時に 500 を返す', async () => {
    mockUpdateProduct.mockRejectedValueOnce(new Error('DB error'))

    const res = await PUT(
      makeRequest('PUT', { brand: 'KATO', productCode: '10-001', type: 'SINGLE', name: 'fail' }),
      makeParams('1')
    )
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data).toMatchObject({ error: '製品を更新できませんでした', code: 'INTERNAL_ERROR' })
  })
})

// ==============================
// DELETE /api/products/[id]
// ==============================

describe('DELETE /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthContext.mockResolvedValue({
      session: { user: { email: 'admin@example.com' } },
      user: { id: 1, email: 'admin@example.com' },
      isAdmin: true,
    })
  })

  it('製品が削除され 200 とメッセージを返す', async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 1 })

    const res = await DELETE(makeRequest('DELETE'), makeParams('1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Product deleted successfully')
  })

  it('正しい id で delete が呼ばれる', async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 1 })

    await DELETE(makeRequest('DELETE'), makeParams('5'))

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: 5 } })
  })

  it('DB エラー時に 500 を返す', async () => {
    mockDeleteMany.mockRejectedValueOnce(new Error('DB error'))

    const res = await DELETE(makeRequest('DELETE'), makeParams('1'))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data).toMatchObject({ error: '製品を削除できませんでした', code: 'INTERNAL_ERROR' })
  })
})

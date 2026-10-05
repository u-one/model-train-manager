import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from './route'

// --- モック定義 ---

const { mockFindUnique, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
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
      update: mockUpdate,
      delete: mockDelete,
    },
  },
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
    expect(data.error).toBe('Product not found')
  })

  it('不正な id (NaN) の場合 400 を返す', async () => {
    const res = await GET(makeRequest('GET'), makeParams('abc'))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid product id')
    // findUnique は呼ばれない
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('DB エラー時に 500 を返す', async () => {
    mockFindUnique.mockRejectedValueOnce(new Error('DB error'))

    const res = await GET(makeRequest('GET'), makeParams('1'))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to fetch product')
  })

  it('未ログイン時は ownedVehicles が含まれない', async () => {
    mockFindUnique.mockResolvedValueOnce(mockProductFull)

    await GET(makeRequest('GET'), makeParams('1'))

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          ownedVehicles: false,
        }),
      })
    )
  })

  it('ログイン中は ownedVehicles がユーザーID でフィルタされる', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: '42', email: 'test@example.com', name: 'test' },
      expires: '',
    })
    mockFindUnique.mockResolvedValueOnce(mockProductFull)

    await GET(makeRequest('GET'), makeParams('1'))

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          ownedVehicles: {
            where: { userId: 42 },
            include: { user: { select: { id: true, name: true } } },
          },
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
  })

  it('製品が正常に更新され 200 を返す', async () => {
    const updatedProduct = { id: 1, name: '更新済み', realVehicles: [], _count: { ownedVehicles: 0 } }
    mockUpdate.mockResolvedValueOnce(updatedProduct)

    const res = await PUT(
      makeRequest('PUT', { name: '更新済み', realVehicles: [] }),
      makeParams('1')
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual(updatedProduct)
  })

  it('realVehicles が deleteMany+create で更新される', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 1, name: 'test', realVehicles: [], _count: { ownedVehicles: 0 } })

    await PUT(
      makeRequest('PUT', { name: 'test', realVehicles: [{ vehicleType: 'EC' }] }),
      makeParams('1')
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          realVehicles: {
            deleteMany: {},
            create: [{ vehicleType: 'EC' }],
          },
        }),
      })
    )
  })

  it('realVehicles が未指定の場合は空配列として扱われる', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 1, name: 'test', realVehicles: [], _count: { ownedVehicles: 0 } })

    await PUT(
      makeRequest('PUT', { name: 'test' }),
      makeParams('1')
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          realVehicles: {
            deleteMany: {},
            create: [],
          },
        }),
      })
    )
  })

  it('DB エラー時に 500 を返す', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('DB error'))

    const res = await PUT(
      makeRequest('PUT', { name: 'fail' }),
      makeParams('1')
    )
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to update product')
  })
})

// ==============================
// DELETE /api/products/[id]
// ==============================

describe('DELETE /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('製品が削除され 200 とメッセージを返す', async () => {
    mockDelete.mockResolvedValueOnce({})

    const res = await DELETE(makeRequest('DELETE'), makeParams('1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Product deleted successfully')
  })

  it('正しい id で delete が呼ばれる', async () => {
    mockDelete.mockResolvedValueOnce({})

    await DELETE(makeRequest('DELETE'), makeParams('5'))

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 5 } })
  })

  it('DB エラー時に 500 を返す', async () => {
    mockDelete.mockRejectedValueOnce(new Error('DB error'))

    const res = await DELETE(makeRequest('DELETE'), makeParams('1'))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to delete product')
  })
})

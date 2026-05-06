import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

// --- ホイストされたモック関数 ---
const {
  mockOwnedVehicleFindMany,
  mockOwnedVehicleCount,
  mockOwnedVehicleCreate,
  mockUserFindUnique,
  mockProductFindFirst,
  mockGetServerSession,
  mockIsAdminUser,
  mockAutoRegisterSetComponents,
} = vi.hoisted(() => ({
  mockOwnedVehicleFindMany: vi.fn(),
  mockOwnedVehicleCount: vi.fn(),
  mockOwnedVehicleCreate: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockProductFindFirst: vi.fn(),
  mockGetServerSession: vi.fn(),
  mockIsAdminUser: vi.fn(),
  mockAutoRegisterSetComponents: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ownedVehicle: {
      findMany: mockOwnedVehicleFindMany,
      count: mockOwnedVehicleCount,
      create: mockOwnedVehicleCreate,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
    product: {
      findFirst: mockProductFindFirst,
    },
  },
}))

vi.mock('@/lib/admin-auth', () => ({
  isAdminUser: mockIsAdminUser,
}))

vi.mock('@/lib/owned-vehicle-utils', () => ({
  autoRegisterSetComponents: mockAutoRegisterSetComponents,
}))

// --- ヘルパー ---

function makeRequest(params: Record<string, string> = {}, method = 'GET') {
  const url = new URL('http://localhost/api/owned-vehicles')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), { method })
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/owned-vehicles', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const mockUser = { id: 1, email: 'user@example.com', name: 'Test User' }
const mockSession = { user: { email: 'user@example.com' }, expires: '' }

const mockOwnedVehicle = (overrides = {}) => ({
  id: 1,
  userId: 1,
  managementId: 'M001',
  productId: 10,
  purchaseDate: null,
  currentStatus: 'NORMAL',
  storageCondition: 'WITH_CASE',
  notes: null,
  product: null,
  independentVehicle: null,
  maintenanceRecords: [],
  ...overrides,
})

// --- テスト ---

describe('GET /api/owned-vehicles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
    mockIsAdminUser.mockResolvedValue(false)
    mockUserFindUnique.mockResolvedValue(mockUser)
    mockOwnedVehicleFindMany.mockResolvedValue([])
    mockOwnedVehicleCount.mockResolvedValue(0)
  })

  // --- 認証 ---

  it('未認証時に 401 を返す', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('ユーザーが見つからない場合に 404 を返す', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('User not found')
  })

  // --- レスポンス形式 ---

  it('保有車両一覧とページネーションを返す', async () => {
    const vehicles = [mockOwnedVehicle()]
    mockOwnedVehicleFindMany.mockResolvedValue(vehicles)
    mockOwnedVehicleCount.mockResolvedValue(1)

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ownedVehicles).toEqual(vehicles)
    expect(data.pagination).toEqual({ page: 1, limit: 100, total: 1, totalPages: 1 })
  })

  it('デフォルトは page=1, limit=100', async () => {
    await GET(makeRequest())

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 })
    )
  })

  it('page/limit パラメータが反映される', async () => {
    mockOwnedVehicleCount.mockResolvedValue(50)
    await GET(makeRequest({ page: '2', limit: '10' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    )
  })

  it('totalPages が正しく計算される', async () => {
    mockOwnedVehicleCount.mockResolvedValue(25)

    const res = await GET(makeRequest({ limit: '10' }))
    const data = await res.json()

    expect(data.pagination.totalPages).toBe(3)
  })

  // --- WHERE 条件 ---

  it('userId で絞り込まれる', async () => {
    await GET(makeRequest())

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: mockUser.id }),
      })
    )
  })

  it('status フィルタが適用される', async () => {
    await GET(makeRequest({ status: 'NORMAL' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ currentStatus: 'NORMAL' }),
      })
    )
  })

  it('condition フィルタが適用される', async () => {
    await GET(makeRequest({ condition: 'WITH_CASE' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storageCondition: 'WITH_CASE' }),
      })
    )
  })

  it('isIndependent=true で独立車両のみに絞り込む', async () => {
    await GET(makeRequest({ isIndependent: 'true' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          independentVehicle: { isNot: null },
        }),
      })
    )
  })

  it('isIndependent=false で製品リンク済みのみに絞り込む', async () => {
    await GET(makeRequest({ isIndependent: 'false' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          independentVehicle: null,
        }),
      })
    )
  })

  it('brand フィルタが OR 条件で適用される', async () => {
    await GET(makeRequest({ brand: 'KATO' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { product: { brand: 'KATO' } },
            { independentVehicle: { brand: 'KATO' } },
          ]),
        }),
      })
    )
  })

  it('type フィルタが製品に適用される', async () => {
    await GET(makeRequest({ type: 'EC' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          product: expect.objectContaining({ type: 'EC' }),
        }),
      })
    )
  })

  it('search で OR 検索が行われる', async () => {
    await GET(makeRequest({ search: 'E231' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { managementId: { contains: 'E231', mode: 'insensitive' } },
            { product: { name: { contains: 'E231', mode: 'insensitive' } } },
            { notes: { contains: 'E231', mode: 'insensitive' } },
          ]),
        }),
      })
    )
  })

  // --- タグフィルタ ---

  it('tags=OR でいずれかのタグを持つ製品が取得される', async () => {
    await GET(makeRequest({ tags: '1,2', tag_operator: 'OR' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          product: expect.objectContaining({
            productTags: { some: { tagId: { in: [1, 2] } } },
          }),
        }),
      })
    )
  })

  it('tags=AND ですべてのタグを個別のsome条件で持つ製品が取得される（products-queryと同じ方式）', async () => {
    await GET(makeRequest({ tags: '1,2', tag_operator: 'AND' }))

    // AND検索: 各タグを個別のsome条件にすることで全タグ一致をDBで解決（everyは不正確）
    const call = mockOwnedVehicleFindMany.mock.calls[0][0]
    // where.AND が配列で各タグの some 条件を含む
    expect(call.where.AND).toBeDefined()
    expect(call.where.AND).toEqual(
      expect.arrayContaining([
        { product: expect.objectContaining({ productTags: { some: { tagId: 1 } } }) },
        { product: expect.objectContaining({ productTags: { some: { tagId: 2 } } }) },
      ])
    )
  })

  // --- ソート ---

  it('デフォルトは purchaseDate 降順（nullは最後）', async () => {
    await GET(makeRequest())

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ purchaseDate: { sort: 'desc', nulls: 'last' } }],
      })
    )
  })

  it('sortBy=managementId でソートされる', async () => {
    await GET(makeRequest({ sortBy: 'managementId', sortOrder: 'asc' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { managementId: 'asc' } })
    )
  })

  it('sortBy=createdAt でソートされる', async () => {
    await GET(makeRequest({ sortBy: 'createdAt', sortOrder: 'asc' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } })
    )
  })

  // --- 管理者モード ---

  it('管理者かつ includeUserAndProduct=true で全ユーザーの車両を返す', async () => {
    mockIsAdminUser.mockResolvedValue(true)
    mockOwnedVehicleFindMany.mockResolvedValue([mockOwnedVehicle()])
    mockOwnedVehicleCount.mockResolvedValue(1)

    const res = await GET(makeRequest({ includeUserAndProduct: 'true' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    // 管理者モードでは userId フィルタなし
    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ userId: mockUser.id }),
      })
    )
    expect(data.pagination).toBeDefined()
  })

  it('管理者でも includeUserAndProduct=false なら通常モード', async () => {
    mockIsAdminUser.mockResolvedValue(true)
    await GET(makeRequest({ includeUserAndProduct: 'false' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: mockUser.id }),
      })
    )
  })

  it('管理者モードで search が適用される', async () => {
    mockIsAdminUser.mockResolvedValue(true)
    await GET(makeRequest({ includeUserAndProduct: 'true', search: 'kato' }))

    expect(mockOwnedVehicleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { managementId: { contains: 'kato', mode: 'insensitive' } },
          ]),
        }),
      })
    )
  })

  // --- エラーハンドリング ---

  it('DB エラー時に 500 を返す', async () => {
    mockOwnedVehicleFindMany.mockRejectedValueOnce(new Error('DB error'))

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Failed to fetch owned vehicles')
  })
})

describe('POST /api/owned-vehicles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
    mockUserFindUnique.mockResolvedValue(mockUser)
    mockAutoRegisterSetComponents.mockResolvedValue([])
  })

  // --- 認証 ---

  it('未認証時に 401 を返す', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(401)
  })

  it('ユーザーが見つからない場合に 404 を返す', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(404)
  })

  // --- 独立車両作成 ---

  it('vehicleType=INDEPENDENT で独立車両が作成される', async () => {
    const createdVehicle = mockOwnedVehicle({ productId: null })
    mockOwnedVehicleCreate.mockResolvedValue(createdVehicle)

    const body = {
      vehicleType: 'INDEPENDENT',
      managementId: 'M001',
      currentStatus: 'NORMAL',
      storageCondition: 'WITH_CASE',
      independentVehicle: { name: 'E231系', brand: 'KATO' },
    }
    const res = await POST(makePostRequest(body))

    expect(res.status).toBe(201)
    expect(mockOwnedVehicleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          independentVehicle: { create: { name: 'E231系', brand: 'KATO' } },
        }),
      })
    )
  })

  // --- 製品車両作成 ---

  it('vehicleType=PRODUCT で製品IDが指定された場合に作成される', async () => {
    const createdVehicle = mockOwnedVehicle()
    mockOwnedVehicleCreate.mockResolvedValue(createdVehicle)

    const body = {
      vehicleType: 'PRODUCT',
      managementId: 'M001',
      productId: 10,
      currentStatus: 'NORMAL',
      storageCondition: 'WITH_CASE',
    }
    const res = await POST(makePostRequest(body))

    expect(res.status).toBe(201)
  })

  it('vehicleType=PRODUCT でメーカー・品番指定時は製品検索する', async () => {
    const mockProduct = { id: 99, name: 'Test', brand: 'KATO', productCode: '10-001' }
    mockProductFindFirst.mockResolvedValue(mockProduct)
    const createdVehicle = mockOwnedVehicle({ productId: 99 })
    mockOwnedVehicleCreate.mockResolvedValue(createdVehicle)

    const body = {
      vehicleType: 'PRODUCT',
      managementId: 'M001',
      productBrand: 'KATO',
      productCode: '10-001',
      currentStatus: 'NORMAL',
      storageCondition: 'WITH_CASE',
    }
    const res = await POST(makePostRequest(body))

    expect(res.status).toBe(201)
    expect(mockProductFindFirst).toHaveBeenCalled()
    expect(mockOwnedVehicleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: 99 }),
      })
    )
  })

  it('vehicleType=PRODUCT でメーカー・品番検索が失敗した場合に 400 を返す', async () => {
    mockProductFindFirst.mockResolvedValue(null)

    const body = {
      vehicleType: 'PRODUCT',
      productBrand: 'UNKNOWN',
      productCode: '99-999',
    }
    const res = await POST(makePostRequest(body))
    expect(res.status).toBe(400)
  })

  it('vehicleType=PRODUCT で製品ID・メーカー品番が未指定の場合に 400 を返す', async () => {
    const body = {
      vehicleType: 'PRODUCT',
      managementId: 'M001',
    }
    const res = await POST(makePostRequest(body))
    expect(res.status).toBe(400)
  })

  // --- 日付バリデーション ---

  it('不正な日付フォーマットで 400 を返す', async () => {
    const body = {
      vehicleType: 'PRODUCT',
      managementId: 'M001',
      productId: 10,
      purchaseDate: 'invalid-date',
    }
    const res = await POST(makePostRequest(body))
    expect(res.status).toBe(400)
  })

  // --- セット構成車両の自動登録 ---

  it('セット製品登録時に構成車両が自動登録される', async () => {
    const createdVehicle = mockOwnedVehicle({ productId: 10 })
    mockOwnedVehicleCreate.mockResolvedValue(createdVehicle)
    const componentVehicles = [mockOwnedVehicle({ id: 2, productId: 11 })]
    mockAutoRegisterSetComponents.mockResolvedValue(componentVehicles)

    const body = {
      vehicleType: 'PRODUCT',
      managementId: 'M001',
      productId: 10,
      currentStatus: 'NORMAL',
      storageCondition: 'WITH_CASE',
    }
    const res = await POST(makePostRequest(body))
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.componentOwnedVehicles).toHaveLength(1)
    expect(mockAutoRegisterSetComponents).toHaveBeenCalled()
  })

  it('構成車両がない場合は componentOwnedVehicles なしで返す', async () => {
    const createdVehicle = mockOwnedVehicle()
    mockOwnedVehicleCreate.mockResolvedValue(createdVehicle)
    mockAutoRegisterSetComponents.mockResolvedValue([])

    const body = {
      vehicleType: 'PRODUCT',
      managementId: 'M001',
      productId: 10,
    }
    const res = await POST(makePostRequest(body))
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.componentOwnedVehicles).toBeUndefined()
  })

  // --- エラーハンドリング ---

  it('DB エラー時に 500 を返す', async () => {
    mockOwnedVehicleCreate.mockRejectedValueOnce(new Error('DB error'))

    const body = {
      vehicleType: 'PRODUCT',
      managementId: 'M001',
      productId: 10,
    }
    const res = await POST(makePostRequest(body))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Failed to create owned vehicle')
  })
})

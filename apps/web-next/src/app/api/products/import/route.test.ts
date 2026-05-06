import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

const {
  mockProductFindMany,
  mockProductCreate,
  mockRealVehicleCreate,
} = vi.hoisted(() => {
  const mockProductFindMany = vi.fn<() => Promise<{ brand: string; productCode: string | null }[]>>(() => Promise.resolve([]))
  const mockProductCreate = vi.fn<() => Promise<{ id: number }>>(() => Promise.resolve({ id: 1 }))
  const mockRealVehicleCreate = vi.fn<() => Promise<{ id: number }>>(() => Promise.resolve({ id: 1 }))
  return { mockProductFindMany, mockProductCreate, mockRealVehicleCreate }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: mockProductFindMany,
      create: mockProductCreate,
    },
    realVehicle: {
      create: mockRealVehicleCreate,
    },
  }
}))

const defaultUser = { user: { id: '1', email: 'test@example.com' } }

function makeEmptyRequest() {
  return new NextRequest('http://localhost/api/products/import', {
    method: 'POST',
    body: new FormData()
  })
}

function makeNotCsvFileRequest() {
  const file = new File(['not a csv'], 'test.txt', { type: 'text/plain' })
  const formData = new FormData()
  formData.append('file', file)
  return new NextRequest('http://localhost/api/products/import', {
    method: 'POST',
    body: formData
  })
}

// ブランド,品番,親品番,種別,商品名,税抜,税込,発売日,URL,詳細,タグ
const correctCsv = [
  '1,2,3,4,5,6,7,8,9,10,11',
  'ブランド,品番,親品番,種別,商品名,税抜,税込,発売日,URL,詳細,タグ',
  'KATO,10-001,10-000,set,E233系 中央線,12000,13200,2024/05,https://example.com/item,説明<BR>続き,通勤型<BR/>中央線',
].join('\n')

function makeCsvFileRequest(csv: string = correctCsv) {
  const file = new File([csv], 'products.csv', { type: 'text/csv' })
  const formData = new FormData()
  formData.append('file', file)
  return new NextRequest('http://localhost/api/products/import', {
    method: 'POST',
    body: formData
  })
}

describe('POST /api/products/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProductFindMany.mockResolvedValue([])
    mockProductCreate.mockResolvedValue({ id: 1 })
    mockRealVehicleCreate.mockResolvedValue({ id: 1 })
  })

  it('認証されていない場合は 401 を返す', async () => {
    const { POST } = await import('./route')
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const res = await POST(makeEmptyRequest())
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('CSVファイルがない場合は 400 を返す', async () => {
    const { POST } = await import('./route')
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(defaultUser as never)

    const res = await POST(makeEmptyRequest())
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('ファイルが選択されていません')
  })

  it('CSVファイルでない場合は 400 を返す', async () => {
    const { POST } = await import('./route')
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(defaultUser as never)

    const res = await POST(makeNotCsvFileRequest())
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('CSVファイルを選択してください')
  })

  it('CSVファイルの内容が不正な場合は 400 を返す', async () => {
    const { POST } = await import('./route')
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(defaultUser as never)

    const invalidCsv = [
      '1,2,3',
      'ブランド,品番',
      'KATO',
    ].join('\n')

    const res = await POST(makeCsvFileRequest(invalidCsv))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('CSVファイルの解析でエラーが発生しました')
    expect(data.details).toEqual(['最低限必要な列数が不足しています。期待値: 5列以上, 実際: 2列'])
    expect(data.skippedRows).toEqual([])
  })

  it('CSVファイルの内容が正しい場合は 200 を返す', async () => {
    const { POST } = await import('./route')
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(defaultUser as never)

    const res = await POST(makeCsvFileRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results.totalRows).toBe(1)
    expect(data.results.successCount).toBe(1)
    expect(data.results.errorCount).toBe(0)
    expect(data.results.errors).toEqual([])
  })

  it('すでに存在する製品はスキップされる', async () => {
    const { POST } = await import('./route')
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(defaultUser as never)

    mockProductFindMany.mockResolvedValueOnce([{ brand: 'KATO', productCode: '10-001' }])

    const res = await POST(makeCsvFileRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results.totalRows).toBe(1)
    expect(data.results.successCount).toBe(0)
    expect(data.results.errorCount).toBe(1)
    expect(data.results.errors).toEqual(['行 2: "KATO 10-001" は既に存在します'])
  })

  it('製品登録エラーが発生した場合はスキップされる', async () => {
    const { POST } = await import('./route')
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(defaultUser as never)

    mockProductCreate.mockRejectedValueOnce(new Error('test'))

    const res = await POST(makeCsvFileRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results.totalRows).toBe(1)
    expect(data.results.successCount).toBe(0)
    expect(data.results.errorCount).toBe(1)
    expect(data.results.errors).toEqual(['行 2: 予期しないエラー - test'])
  })

  it('実車情報登録エラーが発生した場合はスキップされる', async () => {
    const { POST } = await import('./route')
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(defaultUser as never)

    mockRealVehicleCreate.mockRejectedValueOnce(new Error('test'))

    const res = await POST(makeCsvFileRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results.totalRows).toBe(1)
    expect(data.results.successCount).toBe(0)
    expect(data.results.errorCount).toBe(1)
    expect(data.results.errors).toEqual(['行 2: 予期しないエラー - test'])
  })
})

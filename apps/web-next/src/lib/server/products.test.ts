import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '@/lib/server/api-errors'
import { convertIndependentVehiclesToProducts } from './products'

const m = vi.hoisted(() => ({
  ownedFindMany: vi.fn(),
  ownedUpdateMany: vi.fn(),
  independentDeleteMany: vi.fn(),
  productFindMany: vi.fn(),
  productCreate: vi.fn(),
  setComponentDeleteMany: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/prisma', () => {
  const tx = {
    product: { findMany: m.productFindMany, create: m.productCreate },
    ownedVehicle: { updateMany: m.ownedUpdateMany },
    independentVehicle: { deleteMany: m.independentDeleteMany },
    productSetComponent: { deleteMany: m.setComponentDeleteMany },
  }
  return {
    prisma: {
      ownedVehicle: { findMany: m.ownedFindMany },
      $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    },
  }
})

function vehicle(id: number, independent: Record<string, unknown> | null) {
  return {
    id,
    independentVehicle: independent && { name: `車両${id}`, vehicleType: null, description: null, ...independent },
  }
}

describe('convertIndependentVehiclesToProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.productCreate.mockResolvedValue({ id: 900 })
    m.setComponentDeleteMany.mockResolvedValue({})
  })

  it('メーカー+品番(大小無視)が同じ独立車両を1製品にまとめる', async () => {
    m.ownedFindMany.mockResolvedValue([
      vehicle(1, { brand: 'KATO', productCode: '10-001' }),
      vehicle(2, { brand: 'kato', productCode: '10-001' }),
    ])
    m.productFindMany.mockResolvedValue([])

    const result = await convertIndependentVehiclesToProducts([1, 2], 7)

    expect(m.productCreate).toHaveBeenCalledTimes(1)
    expect(m.ownedUpdateMany).toHaveBeenCalledWith({ where: { id: { in: [1, 2] } }, data: { productId: 900 } })
    expect(m.independentDeleteMany).toHaveBeenCalledWith({ where: { ownedVehicleId: { in: [1, 2] } } })
    expect(result).toEqual({ createdProductCount: 1, linkedExistingProductCount: 0, convertedVehicleCount: 2, skipped: [] })
  })

  it('既存製品が1件ならそれに紐付け、新規作成しない', async () => {
    m.ownedFindMany.mockResolvedValue([vehicle(1, { brand: 'KATO', productCode: '10-001' })])
    m.productFindMany.mockResolvedValue([{ id: 55 }])

    const result = await convertIndependentVehiclesToProducts([1], 7)

    expect(m.productCreate).not.toHaveBeenCalled()
    expect(m.ownedUpdateMany).toHaveBeenCalledWith({ where: { id: { in: [1] } }, data: { productId: 55 } })
    expect(result.linkedExistingProductCount).toBe(1)
  })

  it('既存製品が複数ならスキップして理由を返す', async () => {
    m.ownedFindMany.mockResolvedValue([vehicle(1, { brand: 'KATO', productCode: '10-001' })])
    m.productFindMany.mockResolvedValue([{ id: 55 }, { id: 56 }])

    const result = await convertIndependentVehiclesToProducts([1], 7)

    expect(m.ownedUpdateMany).not.toHaveBeenCalled()
    expect(result.convertedVehicleCount).toBe(0)
    expect(result.skipped).toEqual([{ ownedVehicleId: 1, reason: '同じメーカー・品番の製品が複数あります' }])
  })

  it('独立車両でない・メーカー/品番が未設定の車両はスキップする', async () => {
    m.ownedFindMany.mockResolvedValue([
      vehicle(1, null),
      vehicle(2, { brand: 'KATO', productCode: null }),
    ])

    const result = await convertIndependentVehiclesToProducts([1, 2], 7)

    expect(m.productCreate).not.toHaveBeenCalled()
    expect(result.skipped.map(s => s.ownedVehicleId)).toEqual([1, 2])
  })

  it('他ユーザーの車両など一部が見つからなければ404', async () => {
    m.ownedFindMany.mockResolvedValue([vehicle(1, { brand: 'KATO', productCode: 'A' })])

    await expect(convertIndependentVehiclesToProducts([1, 2], 7)).rejects.toBeInstanceOf(ApiError)
    expect(m.ownedFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [1, 2] }, userId: 7 } }))
  })
})

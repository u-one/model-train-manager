import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findVehicle: vi.fn(), create: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ownedVehicle: { findFirst: mocks.findVehicle },
    maintenanceRecord: { create: mocks.create }
  }
}))
vi.mock('@/lib/server/auth', () => ({ getAuthContext: mocks.auth }))

function post(body: unknown, id = '1') {
  return POST(new NextRequest(`http://localhost/api/owned-vehicles/${id}/maintenance`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }), { params: Promise.resolve({ id }) })
}

describe('整備記録の追加', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue({ session: { user: { email: 'owner@example.com' } }, user: { id: 2 } })
    mocks.findVehicle.mockResolvedValue({ id: 1 })
    mocks.create.mockResolvedValue({ id: 10, ownedVehicleId: 1, maintenanceDate: new Date('2026-10-17'), content: '注油' })
  })

  it('自分の車両に整備記録を追加する', async () => {
    const response = await post({ maintenanceDate: '2026-10-17', content: ' 注油 ' })
    expect(response.status).toBe(201)
    expect(mocks.findVehicle).toHaveBeenCalledWith({ where: { id: 1, userId: 2 }, select: { id: true } })
    expect(mocks.create).toHaveBeenCalledWith({
      data: { ownedVehicleId: 1, maintenanceDate: new Date('2026-10-17T00:00:00.000Z'), content: '注油' }
    })
  })

  it('未認証を拒否する', async () => {
    mocks.auth.mockResolvedValue({ session: null, user: null })
    expect((await post({ maintenanceDate: '2026-10-17', content: '注油' })).status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('他人の車両を拒否する', async () => {
    mocks.findVehicle.mockResolvedValue(null)
    expect((await post({ maintenanceDate: '2026-10-17', content: '注油' })).status).toBe(404)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('空の内容と不正な日付を拒否する', async () => {
    expect((await post({ maintenanceDate: '2026-10-17', content: '  ' })).status).toBe(400)
    expect((await post({ maintenanceDate: '2026-02-30', content: '注油' })).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})

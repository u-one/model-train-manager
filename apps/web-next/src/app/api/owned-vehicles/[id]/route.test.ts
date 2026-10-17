import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), save: vi.fn(), link: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/server/auth', () => ({ getAuthContext: mocks.auth }))
vi.mock('@/lib/server/products', () => ({ linkProductToOwnedVehicle: mocks.link }))
vi.mock('@/lib/server/owned-vehicles', () => ({ updateOwnedVehicle: vi.fn(), updateOwnedVehicleImageUrls: mocks.save }))
vi.mock('@/lib/server/image-auth', () => ({
  authorizeImageEntity: mocks.access,
  imageUrlBelongsToEntity: (url: string) => url.startsWith('/uploads/owned-vehicles/1/')
}))

function patch(body: unknown) {
  return PATCH(new NextRequest('http://localhost/api/owned-vehicles/1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }), { params: Promise.resolve({ id: '1' }) })
}

describe('保有車両の画像更新', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue({ session: { user: { email: 'owner@example.com' } }, user: { id: 2 } })
    mocks.access.mockResolvedValue({ ok: true, entityType: 'owned-vehicle', entityId: 1, imageUrls: [] })
    mocks.save.mockResolvedValue({ imageUrls: [] })
  })

  it('画像を全削除した空配列を保存する', async () => {
    expect((await patch({ imageUrls: [] })).status).toBe(200)
    expect(mocks.save).toHaveBeenCalledWith(1, [], 2)
  })

  it('未認証の更新を拒否する', async () => {
    mocks.auth.mockResolvedValue({ session: null, user: null })
    expect((await patch({ imageUrls: [] })).status).toBe(401)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('他人の車両の更新を拒否する', async () => {
    mocks.access.mockResolvedValue({ ok: false, status: 403, code: 'FORBIDDEN', error: '権限がありません' })
    expect((await patch({ imageUrls: [] })).status).toBe(403)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('別車両の画像URLを拒否する', async () => {
    expect((await patch({ imageUrls: ['/uploads/owned-vehicles/9/image.png'] })).status).toBe(400)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('保存の非同期エラーをJSON応答に変換する', async () => {
    mocks.save.mockRejectedValue(new Error('DB unavailable'))
    const response = await patch({ imageUrls: [] })
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: '保有車両を更新できませんでした' })
  })

  it('既存の製品紐付けを維持する', async () => {
    mocks.link.mockResolvedValue({ id: 1 })
    expect((await patch({ productId: 3 })).status).toBe(200)
    expect(mocks.link).toHaveBeenCalledWith(3, 1, 2)
  })
})

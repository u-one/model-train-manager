import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ImageUploader from './ImageUploader'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('画像削除で親フォームを送信せず、削除完了を通知する', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
  const deleted = vi.fn()
  const url = '/uploads/owned-vehicles/1/check.png'
  render(<form onSubmit={submit}><ImageUploader entityType="owned-vehicle" entityId="1" currentImages={[url]} onDelete={deleted} /></form>)

  fireEvent.click(screen.getByRole('button', { name: '画像 1 を削除' }))

  await waitFor(() => expect(deleted).toHaveBeenCalledWith(url))
  expect(submit).not.toHaveBeenCalled()
})

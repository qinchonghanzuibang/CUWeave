import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
const getProductUser = vi.fn()

vi.mock('./auth', () => ({ auth: { api: { getSession } } }))
vi.mock('@cuweave/db', () => ({ getProductUser }))

describe('server session validation', () => {
  beforeEach(() => {
    getSession.mockReset()
    getProductUser.mockReset()
  })

  it('treats invalid or expired library sessions as unauthenticated', async () => {
    getSession.mockResolvedValue(null)
    const { getViewer } = await import('./session')
    await expect(getViewer(new Headers())).resolves.toBeNull()
    expect(getProductUser).not.toHaveBeenCalled()
  })

  it('rejects a deactivated database user even if a cookie resolves', async () => {
    getSession.mockResolvedValue({ user: { id: 'deactivated' } })
    getProductUser.mockResolvedValue({
      id: 'deactivated',
      status: 'deactivated',
    })
    const { getViewer } = await import('./session')
    await expect(getViewer(new Headers())).resolves.toBeNull()
  })
})

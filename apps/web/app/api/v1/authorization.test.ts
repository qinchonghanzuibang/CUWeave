import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/session', () => {
  class AuthenticationError extends Error {
    constructor(
      public readonly status: 401 | 403,
      message: string
    ) {
      super(message)
    }
  }
  return {
    AuthenticationError,
    requireViewer: vi.fn(() =>
      Promise.reject(new AuthenticationError(401, 'Sign in is required.'))
    ),
    requireModerator: vi.fn(() =>
      Promise.reject(
        new AuthenticationError(403, 'Moderator access is required.')
      )
    ),
  }
})

describe('authenticated route boundaries', () => {
  it('rejects anonymous private schedule access', async () => {
    const { GET } = await import('./schedules/route')
    const response = await GET(new Request('http://localhost/api/v1/schedules'))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Sign in is required.',
    })
  })

  it('rejects non-moderators from the report queue', async () => {
    const { GET } = await import('./moderation/reports/route')
    const response = await GET(
      new Request('http://localhost/api/v1/moderation/reports')
    )
    expect(response.status).toBe(403)
  })
})

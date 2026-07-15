import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkDatabaseReadiness = vi.fn<() => Promise<boolean>>()

vi.mock('@cuweave/db', () => ({ checkDatabaseReadiness }))

describe('GET /api/v1/health', () => {
  beforeEach(() => {
    checkDatabaseReadiness.mockReset()
  })

  it('returns 200 when the database is ready', async () => {
    checkDatabaseReadiness.mockResolvedValue(true)
    const { GET } = await import('./route')
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({
      version: 'v1',
      status: 'ready',
      checks: { liveness: 'ok', database: 'ready' },
    })
  })

  it('returns a sanitized 503 response when the database is unavailable', async () => {
    checkDatabaseReadiness.mockResolvedValue(false)
    const { GET } = await import('./route')
    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(503)
    expect(body).toBe(
      JSON.stringify({
        version: 'v1',
        status: 'degraded',
        checks: { liveness: 'ok', database: 'unavailable' },
      })
    )
    expect(body).not.toMatch(/password|postgresql|stack|localhost|error/i)
  })
})

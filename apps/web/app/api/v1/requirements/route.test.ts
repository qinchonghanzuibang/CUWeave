import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireViewer: vi.fn().mockResolvedValue({ id: 'test-user' }),
  saveRequirementSelection: vi.fn(),
}))

vi.mock('@cuweave/db', () => ({
  saveRequirementSelection: mocks.saveRequirementSelection,
}))
vi.mock('../../../../lib/session', () => ({
  requireViewer: mocks.requireViewer,
}))

describe('requirements API feature boundary', () => {
  afterEach(() => {
    delete process.env.FEATURE_REQUIREMENTS_ENABLED
  })

  it('returns 404 before authentication or requirement data is accessed', async () => {
    const { GET, POST } = await import('./route')
    expect(GET().status).toBe(404)
    const response = await POST(
      new Request('http://localhost/api/v1/requirements', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Not found.' })
    expect(mocks.requireViewer).not.toHaveBeenCalled()
    expect(mocks.saveRequirementSelection).not.toHaveBeenCalled()
  })

  it('restores the endpoint in an explicitly enabled isolated environment', async () => {
    process.env.FEATURE_REQUIREMENTS_ENABLED = 'true'
    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost/api/v1/requirements', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )
    expect(response.status).toBe(400)
  })
})

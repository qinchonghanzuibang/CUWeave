import { describe, expect, it } from 'vitest'

import { createHealthResponse } from './health'

describe('createHealthResponse', () => {
  it('reports a ready application when the database is ready', () => {
    expect(createHealthResponse(true)).toEqual({
      version: 'v1',
      status: 'ready',
      checks: { liveness: 'ok', database: 'ready' },
    })
  })

  it('reports degradation without exposing an error', () => {
    expect(createHealthResponse(false)).toEqual({
      version: 'v1',
      status: 'degraded',
      checks: { liveness: 'ok', database: 'unavailable' },
    })
  })
})

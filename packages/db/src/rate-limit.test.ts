import { describe, expect, it } from 'vitest'

import { hashRateLimitKey } from './rate-limit'

describe('privacy-conscious rate-limit keys', () => {
  it('is deterministic without retaining the raw identifier', () => {
    const secret = 'test-secret-that-is-at-least-32-characters'
    const first = hashRateLimitKey('203.0.113.10', secret)
    expect(first).toBe(hashRateLimitKey('203.0.113.10', secret))
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(first).not.toContain('203.0.113.10')
  })

  it('rejects weak hashing secrets', () => {
    expect(() => hashRateLimitKey('key', 'short')).toThrow()
  })
})

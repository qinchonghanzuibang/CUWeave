import { afterEach, describe, expect, it } from 'vitest'

import { clientIdentifier } from './rate-limit'

describe('proxy-aware client identifiers', () => {
  afterEach(() => delete process.env.TRUST_PROXY_HEADERS)

  it('does not trust forwarded addresses by default', () => {
    const request = new Request('https://cuweave.example', {
      headers: { 'x-forwarded-for': '203.0.113.5' },
    })
    expect(clientIdentifier(request)).toBe('untrusted-client')
  })

  it('uses only the first forwarded address after explicit opt-in', () => {
    process.env.TRUST_PROXY_HEADERS = 'true'
    const request = new Request('https://cuweave.example', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    })
    expect(clientIdentifier(request)).toBe('203.0.113.5')
  })
})

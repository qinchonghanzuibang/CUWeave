import { describe, expect, it } from 'vitest'

import { redactLogFields } from './server-log'

describe('structured log redaction', () => {
  it('redacts identity, network, and secret-bearing fields', () => {
    expect(
      redactLogFields({
        requestId: 'request-safe',
        email: 'student@example.test',
        magicToken: 'secret',
        ipAddress: '203.0.113.5',
      })
    ).toEqual({
      requestId: 'request-safe',
      email: '[redacted]',
      magicToken: '[redacted]',
      ipAddress: '[redacted]',
    })
  })
})

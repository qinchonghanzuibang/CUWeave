import { describe, expect, it } from 'vitest'

import { parseDatabaseUrl } from './config'

describe('parseDatabaseUrl', () => {
  it('accepts a PostgreSQL URL', () => {
    const value = 'postgresql://user:password@127.0.0.1:5432/database'
    expect(parseDatabaseUrl(value)).toBe(value)
  })

  it.each([
    undefined,
    '',
    'not-a-url',
    'https://example.com/database',
    'postgresql://localhost',
  ])('rejects an unsafe or malformed value: %s', (value) => {
    expect(() => parseDatabaseUrl(value)).toThrow('DATABASE_URL')
  })
})

import { afterEach, describe, expect, it } from 'vitest'

import {
  databasePoolSize,
  databaseTlsEnabled,
  getMigrationDatabaseUrl,
  parseDatabaseUrl,
} from './config'

afterEach(() => {
  delete process.env.DATABASE_URL
  delete process.env.DATABASE_MIGRATION_URL
  delete process.env.DATABASE_SSL
  delete process.env.DATABASE_POOL_MAX
})

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

describe('managed PostgreSQL configuration', () => {
  it('prefers the direct migration URL without exposing it to Web clients', () => {
    process.env.DATABASE_URL = 'postgresql://app:secret@db.test/app'
    process.env.DATABASE_MIGRATION_URL =
      'postgresql://migration:secret@direct.test/app'
    expect(getMigrationDatabaseUrl()).toBe(process.env.DATABASE_MIGRATION_URL)
  })

  it('validates bounded pools and explicit TLS switches', () => {
    process.env.DATABASE_POOL_MAX = '20'
    process.env.DATABASE_SSL = 'true'
    expect(databasePoolSize()).toBe(20)
    expect(databaseTlsEnabled()).toBe(true)
    process.env.DATABASE_POOL_MAX = '21'
    expect(() => databasePoolSize()).toThrow('DATABASE_POOL_MAX')
    process.env.DATABASE_SSL = 'sometimes'
    expect(() => databaseTlsEnabled()).toThrow('DATABASE_SSL')
  })
})

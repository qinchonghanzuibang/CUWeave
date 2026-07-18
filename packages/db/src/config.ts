const ALLOWED_PROTOCOLS = new Set(['postgres:', 'postgresql:'])

export function parseDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error('DATABASE_URL is required')
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL')
  }

  if (
    !ALLOWED_PROTOCOLS.has(parsed.protocol) ||
    !parsed.hostname ||
    !parsed.pathname.slice(1)
  ) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL')
  }

  return value
}

export function getDatabaseUrl(): string {
  return parseDatabaseUrl(process.env.DATABASE_URL)
}

export function getMigrationDatabaseUrl(): string {
  return parseDatabaseUrl(
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL
  )
}

export function databaseTlsEnabled(): boolean {
  const value = process.env.DATABASE_SSL
  if (value === undefined) return process.env.NODE_ENV === 'production'
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error('DATABASE_SSL must be true or false.')
}

export function databasePoolSize(): number {
  const value = Number(process.env.DATABASE_POOL_MAX ?? '5')
  if (!Number.isInteger(value) || value < 1 || value > 20)
    throw new Error('DATABASE_POOL_MAX must be an integer from 1 to 20.')
  return value
}

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

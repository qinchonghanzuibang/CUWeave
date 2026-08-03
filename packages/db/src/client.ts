import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { databasePoolSize, databaseTlsEnabled, getDatabaseUrl } from './config'

interface DatabaseConnection {
  db: ReturnType<typeof drizzle>
  pool: Pool
}

const globalDatabase = globalThis as typeof globalThis & {
  cuweaveDatabase?: DatabaseConnection
}

function createConnection(): DatabaseConnection {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: databasePoolSize(),
    query_timeout: 5_000,
    ssl: databaseTlsEnabled() ? { rejectUnauthorized: true } : false,
  })

  return { db: drizzle(pool), pool }
}

export function getDatabaseConnection(): DatabaseConnection {
  globalDatabase.cuweaveDatabase ??= createConnection()
  return globalDatabase.cuweaveDatabase
}

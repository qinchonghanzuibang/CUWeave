import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { getDatabaseUrl } from './config'

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
    connectionTimeoutMillis: 1_500,
    idleTimeoutMillis: 10_000,
    max: 5,
    query_timeout: 2_000,
  })

  return { db: drizzle(pool), pool }
}

export function getDatabaseConnection(): DatabaseConnection {
  globalDatabase.cuweaveDatabase ??= createConnection()
  return globalDatabase.cuweaveDatabase
}

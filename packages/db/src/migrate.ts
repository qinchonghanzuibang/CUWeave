import 'dotenv/config'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { databaseTlsEnabled, getMigrationDatabaseUrl } from './config'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(currentDirectory, '../drizzle')
const pool = new Pool({
  connectionString: getMigrationDatabaseUrl(),
  max: 1,
  ssl: databaseTlsEnabled() ? { rejectUnauthorized: true } : false,
})
const db = drizzle(pool)

try {
  await migrate(db, { migrationsFolder })
  console.log('Database migrations applied successfully.')
} finally {
  await pool.end()
}

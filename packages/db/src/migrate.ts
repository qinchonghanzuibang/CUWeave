import 'dotenv/config'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { getDatabaseConnection } from './client'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(currentDirectory, '../drizzle')
const { db, pool } = getDatabaseConnection()

try {
  await migrate(db, { migrationsFolder })
  console.log('Database migrations applied successfully.')
} finally {
  await pool.end()
}

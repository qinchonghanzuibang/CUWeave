import 'dotenv/config'

import { sql } from 'drizzle-orm'

import { getDatabaseConnection } from './client'
import { checkDatabaseReadiness } from './readiness'

const ready = await checkDatabaseReadiness()
if (!ready) {
  throw new Error('Database readiness validation failed')
}

const { db, pool } = getDatabaseConnection()
try {
  const result = await db.execute<{ exists: boolean }>(sql`
    select to_regclass('public.system_metadata') is not null as exists
  `)

  if (result.rows[0]?.exists !== true) {
    throw new Error('system_metadata migration is not present')
  }

  console.log('Database migration and readiness validation succeeded.')
} finally {
  await pool.end()
}

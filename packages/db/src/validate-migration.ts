import 'dotenv/config'

import { sql } from 'drizzle-orm'

import { getDatabaseConnection } from './client'
import { checkDatabaseReadiness } from './readiness'

const ready = await checkDatabaseReadiness()
if (!ready) {
  throw new Error('Database readiness validation failed')
}

const expectedTables = [
  'system_metadata',
  'source_snapshot',
  'import_run',
  'course',
  'course_catalog_version',
  'course_offering',
  'section',
  'meeting',
  'instructor',
  'section_instructor',
] as const

const { db, pool } = getDatabaseConnection()
try {
  const result = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (${sql.join(
        expectedTables.map((table) => sql`${table}`),
        sql`, `
      )})
  `)

  const migratedTables = new Set(result.rows.map((row) => row.table_name))
  const missingTables = expectedTables.filter(
    (table) => !migratedTables.has(table)
  )
  if (missingTables.length > 0) {
    throw new Error(
      `Required migrations are not present: ${missingTables.join(', ')}`
    )
  }

  console.log('Database migration and readiness validation succeeded.')
} finally {
  await pool.end()
}

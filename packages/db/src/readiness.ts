import { sql } from 'drizzle-orm'

import { getDatabaseConnection } from './client'

export async function checkDatabaseReadiness(): Promise<boolean> {
  try {
    const { db } = getDatabaseConnection()
    const result = await db.execute<{ value: string }>(sql`
      select value from system_metadata where key = 'schema_version'
    `)
    return result.rows[0]?.value === '0004_requirements_launch'
  } catch {
    return false
  }
}

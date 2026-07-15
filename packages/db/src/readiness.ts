import { sql } from 'drizzle-orm'

import { getDatabaseConnection } from './client'

export async function checkDatabaseReadiness(): Promise<boolean> {
  try {
    const { db } = getDatabaseConnection()
    await db.execute(sql`select 1`)
    return true
  } catch {
    return false
  }
}

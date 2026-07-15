import { checkDatabaseReadiness } from '@cuweave/db'
import { createHealthResponse, type HealthResponse } from '@cuweave/domain'

export async function getHealthStatus(): Promise<HealthResponse> {
  const databaseReady = await checkDatabaseReadiness()
  return createHealthResponse(databaseReady)
}

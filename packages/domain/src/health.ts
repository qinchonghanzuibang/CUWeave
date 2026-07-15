export type LivenessStatus = 'ok'
export type DatabaseReadinessStatus = 'ready' | 'unavailable'
export type HealthStatus = 'ready' | 'degraded'

export interface HealthResponse {
  version: 'v1'
  status: HealthStatus
  checks: {
    liveness: LivenessStatus
    database: DatabaseReadinessStatus
  }
}

export function createHealthResponse(databaseReady: boolean): HealthResponse {
  return {
    version: 'v1',
    status: databaseReady ? 'ready' : 'degraded',
    checks: {
      liveness: 'ok',
      database: databaseReady ? 'ready' : 'unavailable',
    },
  }
}

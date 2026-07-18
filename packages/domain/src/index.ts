export { createHealthResponse } from './health'
export type {
  DatabaseReadinessStatus,
  HealthResponse,
  HealthStatus,
  LivenessStatus,
} from './health'

export interface NormalizedCourseSearch {
  compactCode: string
  titleTokens: string[]
}

/**
 * Normalizes user-entered course search without changing stored catalog data.
 * Code separators are removed, while title words remain separate AND tokens.
 */
export function normalizeCourseSearch(value: string): NormalizedCourseSearch {
  const normalized = value.normalize('NFKC').trim().toLocaleLowerCase('en')
  const titleTokens = normalized.split(/[^a-z0-9]+/).filter(Boolean)
  return {
    compactCode: titleTokens.join(''),
    titleTokens: [...new Set(titleTokens)],
  }
}

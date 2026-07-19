export interface FeatureEnvironment {
  [key: string]: string | undefined
  FEATURE_REQUIREMENTS_ENABLED?: string
}

export function requirementsEnabled(
  environment: FeatureEnvironment = process.env
): boolean {
  return environment.FEATURE_REQUIREMENTS_ENABLED === 'true'
}

export type PreviewAuthMode = 'disabled' | 'isolated'

function exactHttpOrigin(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('BETTER_AUTH_URL must be an absolute HTTP(S) URL.')
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.origin !== value ||
    value.includes('*')
  )
    throw new Error('BETTER_AUTH_URL must be an exact origin without a path.')
  if (
    process.env.NODE_ENV === 'production' &&
    url.protocol !== 'https:' &&
    !['127.0.0.1', 'localhost'].includes(url.hostname)
  )
    throw new Error('BETTER_AUTH_URL must use HTTPS in production.')
  return url.origin
}

export function authBaseUrl(): string {
  const configured = process.env.BETTER_AUTH_URL
  if (!configured && process.env.NODE_ENV === 'production')
    throw new Error('BETTER_AUTH_URL is required in production.')
  return exactHttpOrigin(configured ?? 'http://127.0.0.1:3000')
}

export function authTrustedOrigins(): string[] {
  const base = authBaseUrl()
  const configured = (process.env.AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(exactHttpOrigin)
  return [...new Set([base, ...configured])]
}

export function previewAuthMode(): PreviewAuthMode {
  if (process.env.VERCEL_ENV !== 'preview') return 'isolated'
  return process.env.AUTH_PREVIEW_MODE === 'isolated' &&
    process.env.PREVIEW_DATABASE_ISOLATED === 'true'
    ? 'isolated'
    : 'disabled'
}

export function isAuthenticationAvailable(): boolean {
  return previewAuthMode() !== 'disabled'
}

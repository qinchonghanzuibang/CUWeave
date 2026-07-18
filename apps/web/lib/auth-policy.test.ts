import { afterEach, describe, expect, it } from 'vitest'

import { authTrustedOrigins, isAuthenticationAvailable } from './auth-policy'

afterEach(() => {
  delete process.env.BETTER_AUTH_URL
  delete process.env.AUTH_TRUSTED_ORIGINS
  delete process.env.VERCEL_ENV
  delete process.env.AUTH_PREVIEW_MODE
  delete process.env.PREVIEW_DATABASE_ISOLATED
})

describe('authentication deployment policy', () => {
  it('accepts only exact configured origins', () => {
    process.env.BETTER_AUTH_URL = 'https://cuweave.example'
    process.env.AUTH_TRUSTED_ORIGINS = 'https://staging.cuweave.example'
    expect(authTrustedOrigins()).toEqual([
      'https://cuweave.example',
      'https://staging.cuweave.example',
    ])
    process.env.AUTH_TRUSTED_ORIGINS = 'https://*.vercel.app'
    expect(() => authTrustedOrigins()).toThrow('exact origin')
  })

  it('disables arbitrary Preview authentication unless isolation is explicit', () => {
    process.env.VERCEL_ENV = 'preview'
    expect(isAuthenticationAvailable()).toBe(false)
    process.env.AUTH_PREVIEW_MODE = 'isolated'
    expect(isAuthenticationAvailable()).toBe(false)
    process.env.PREVIEW_DATABASE_ISOLATED = 'true'
    expect(isAuthenticationAvailable()).toBe(true)
  })
})

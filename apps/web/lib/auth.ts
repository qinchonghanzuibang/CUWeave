import { getDatabaseConnection } from '@cuweave/db'
import * as schema from '@cuweave/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins'

import { authBaseUrl, authTrustedOrigins } from './auth-policy'
import { sendProductionMagicLink } from './magic-link-email'

interface DevelopmentLink {
  url: string
  createdAt: number
}

const globalAuthState = globalThis as typeof globalThis & {
  cuweaveDevelopmentLinks?: Map<string, DevelopmentLink>
}

const developmentLinks = (globalAuthState.cuweaveDevelopmentLinks ??= new Map<
  string,
  DevelopmentLink
>())

export function isDevelopmentAuthEnabled(): boolean {
  return (
    process.env.AUTH_DEV_MODE === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
}

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET
  if (secret && secret.length >= 32) return secret
  if (isDevelopmentAuthEnabled())
    return 'cuweave-development-only-secret-change-me'
  throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.')
}

async function sendMagicLink(email: string, url: string): Promise<void> {
  if (isDevelopmentAuthEnabled()) {
    developmentLinks.set(email.toLowerCase(), { url, createdAt: Date.now() })
    return
  }

  await sendProductionMagicLink(email, url)
}

export function takeDevelopmentMagicLink(email: string): string | null {
  if (!isDevelopmentAuthEnabled()) return null
  const key = email.toLowerCase()
  const entry = developmentLinks.get(key)
  developmentLinks.delete(key)
  if (!entry || Date.now() - entry.createdAt > 10 * 60 * 1000) return null
  return entry.url
}

export const auth = betterAuth({
  appName: 'CUWeave',
  baseURL: authBaseUrl(),
  secret: authSecret(),
  database: drizzleAdapter(getDatabaseConnection().db, {
    provider: 'pg',
    schema,
  }),
  trustedOrigins: authTrustedOrigins(),
  trustedProxyHeaders: process.env.TRUST_PROXY_HEADERS === 'true',
  advanced: {
    cookiePrefix: 'cuweave',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
        input: false,
      },
      verifiedCuhkEmail: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 10 * 60,
      storeToken: 'hashed',
      sendMagicLink: async ({ email, url }) => sendMagicLink(email, url),
    }),
    nextCookies(),
  ],
})

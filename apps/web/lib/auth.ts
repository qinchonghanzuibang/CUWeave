import { getDatabaseConnection } from '@cuweave/db'
import * as schema from '@cuweave/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins'
import nodemailer from 'nodemailer'

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

function baseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3000'
}

async function sendMagicLink(email: string, url: string): Promise<void> {
  if (isDevelopmentAuthEnabled()) {
    developmentLinks.set(email.toLowerCase(), { url, createdAt: Date.now() })
    return
  }

  const smtpUrl = process.env.AUTH_SMTP_URL
  const from = process.env.AUTH_EMAIL_FROM
  if (!smtpUrl || !from)
    throw new Error(
      'AUTH_SMTP_URL and AUTH_EMAIL_FROM are required outside development mode.'
    )
  const transporter = nodemailer.createTransport(smtpUrl)
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Sign in to CUWeave',
    text: `Use this single-use link to sign in to CUWeave:\n\n${url}\n\nIf you did not request it, ignore this message.`,
  })
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
  baseURL: baseUrl(),
  secret: authSecret(),
  database: drizzleAdapter(getDatabaseConnection().db, {
    provider: 'pg',
    schema,
  }),
  trustedOrigins: [baseUrl()],
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

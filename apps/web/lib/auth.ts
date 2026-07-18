import { getDatabaseConnection } from '@cuweave/db'
import * as schema from '@cuweave/db/schema'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { emailOTP } from 'better-auth/plugins'

import { authBaseUrl, authTrustedOrigins } from './auth-policy'
import { sendProductionOtp } from './otp-email'
import { OTP_POLICY } from './otp-policy'
import { normalizeStudentEmail } from './student-email'

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

async function sendOtp(email: string, otp: string): Promise<void> {
  if (isDevelopmentAuthEnabled()) return
  await sendProductionOtp(email, otp)
}

function configuredTestOtp(): string | undefined {
  const value = process.env.AUTH_TEST_OTP
  return isDevelopmentAuthEnabled() && value && /^\d{6}$/.test(value)
    ? value
    : undefined
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
  hooks: {
    // Better Auth requires middleware callbacks to return a Promise.
    // eslint-disable-next-line @typescript-eslint/require-await
    before: createAuthMiddleware(async (context) => {
      if (
        !['/email-otp/send-verification-otp', '/sign-in/email-otp'].includes(
          context.path
        )
      )
        return
      const body = context.body as unknown
      const record =
        typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>)
          : null
      const email =
        typeof record?.email === 'string'
          ? normalizeStudentEmail(record.email)
          : null
      if (!email)
        throw new APIError('BAD_REQUEST', {
          message: 'Unable to process sign-in.',
        })
      if (record) record.email = email
    }),
  },
  advanced: {
    cookiePrefix: 'cuweave',
    useSecureCookies: process.env.NODE_ENV === 'production',
    ipAddress: { disableIpTracking: true },
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
  databaseHooks: {
    user: {
      create: {
        // Better Auth requires database hook callbacks to return a Promise.
        // eslint-disable-next-line @typescript-eslint/require-await
        before: async (user) => {
          const email = normalizeStudentEmail(user.email)
          if (!email) return false
          return { data: { ...user, email, verifiedCuhkEmail: true } }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: OTP_POLICY.length,
      expiresIn: OTP_POLICY.expiresInSeconds,
      allowedAttempts: OTP_POLICY.allowedAttempts,
      storeOTP: OTP_POLICY.storage,
      resendStrategy: OTP_POLICY.resendStrategy,
      rateLimit: { window: 60, max: 3 },
      ...(configuredTestOtp()
        ? { generateOTP: () => configuredTestOtp() as string }
        : {}),
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== 'sign-in') throw new Error('Unsupported OTP purpose.')
        await sendOtp(email, otp)
      },
    }),
    nextCookies(),
  ],
})

export async function requestSignInOtp(
  email: string,
  headers: Headers
): Promise<void> {
  const response = await callAuthEndpoint(
    '/api/auth/email-otp/send-verification-otp',
    { email, type: 'sign-in' },
    headers
  )
  if (!response.ok) throw new Error('OTP request failed.')
}

export async function verifySignInOtp(
  email: string,
  otp: string,
  headers: Headers
): Promise<Headers> {
  const response = await callAuthEndpoint(
    '/api/auth/sign-in/email-otp',
    { email, otp, name: email.split('@')[0] || 'CUWeave student' },
    headers
  )
  if (!response.ok) throw new Error('OTP verification failed.')
  return response.headers
}

async function callAuthEndpoint(
  path: string,
  body: Record<string, string>,
  incomingHeaders: Headers
): Promise<Response> {
  const headers = new Headers(incomingHeaders)
  headers.set('content-type', 'application/json')
  return auth.handler(
    new Request(new URL(path, authBaseUrl()), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  )
}

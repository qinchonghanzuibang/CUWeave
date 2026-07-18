import { consumeRateLimit } from '@cuweave/db'
import { NextResponse } from 'next/server'

export const rateLimitPolicies = {
  otpRequest: { scope: 'otp-request', limit: 5, windowSeconds: 15 * 60 },
  otpVerify: { scope: 'otp-verify', limit: 10, windowSeconds: 15 * 60 },
  reviewWrite: { scope: 'review-write', limit: 12, windowSeconds: 60 * 60 },
  vote: { scope: 'review-vote', limit: 60, windowSeconds: 60 * 60 },
  report: { scope: 'review-report', limit: 8, windowSeconds: 60 * 60 },
  scheduleShare: { scope: 'schedule-share', limit: 20, windowSeconds: 60 * 60 },
  publicShare: { scope: 'public-share', limit: 120, windowSeconds: 60 * 60 },
  publicSearch: { scope: 'public-search', limit: 120, windowSeconds: 60 * 60 },
} as const

function hashingSecret(): string {
  const value = process.env.RATE_LIMIT_HASH_SECRET
  if (value && value.length >= 32) return value
  if (process.env.NODE_ENV !== 'production')
    return 'cuweave-local-rate-limit-secret-only'
  throw new Error('RATE_LIMIT_HASH_SECRET must contain at least 32 characters.')
}

export function clientIdentifier(request: Request): string {
  if (process.env.TRUST_PROXY_HEADERS !== 'true') return 'untrusted-client'
  const forwarded = request.headers.get('x-forwarded-for')
  const candidate = forwarded?.split(',')[0]?.trim()
  return candidate && candidate.length <= 64 ? candidate : 'unknown-client'
}

export async function enforceRateLimit(
  request: Request,
  policy: (typeof rateLimitPolicies)[keyof typeof rateLimitPolicies],
  authenticatedId?: string
): Promise<NextResponse | null> {
  const decision = await consumeRateLimit({
    ...policy,
    identifier: authenticatedId
      ? `user:${authenticatedId}`
      : `ip:${clientIdentifier(request)}`,
    secret: hashingSecret(),
  })
  if (decision.allowed) return null
  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      code: 'rate_limited',
    },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(decision.retryAfterSeconds),
      },
    }
  )
}

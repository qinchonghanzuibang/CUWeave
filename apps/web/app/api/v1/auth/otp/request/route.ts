import { NextResponse } from 'next/server'
import { requestSignInOtp } from '../../../../../../lib/auth'
import { isAuthenticationAvailable } from '../../../../../../lib/auth-policy'
import {
  enforceRateLimit,
  rateLimitPolicies,
} from '../../../../../../lib/rate-limit'
import { normalizeStudentEmail } from '../../../../../../lib/student-email'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const generic = { status: 'verification-code-sent' }
  try {
    if (!isAuthenticationAvailable())
      return NextResponse.json(
        { error: 'Authentication email is unavailable.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    const limited = await enforceRateLimit(
      request,
      rateLimitPolicies.otpRequest
    )
    if (limited) return limited
    const body = (await request.json()) as { email?: unknown }
    const email =
      typeof body.email === 'string' ? normalizeStudentEmail(body.email) : null
    if (!email)
      return NextResponse.json(
        { error: 'Use your @link.cuhk.edu.hk student email address.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    await requestSignInOtp(email, request.headers)
    return NextResponse.json(generic, {
      status: 202,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      { error: 'Authentication email is unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

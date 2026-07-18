import { NextResponse } from 'next/server'
import { verifySignInOtp } from '../../../../../../lib/auth'
import {
  enforceRateLimit,
  rateLimitPolicies,
} from '../../../../../../lib/rate-limit'
import { normalizeStudentEmail } from '../../../../../../lib/student-email'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, rateLimitPolicies.otpVerify)
    if (limited) return limited
    const body = (await request.json()) as { email?: unknown; otp?: unknown }
    const email =
      typeof body.email === 'string' ? normalizeStudentEmail(body.email) : null
    const otp =
      typeof body.otp === 'string' && /^\d{6}$/.test(body.otp) ? body.otp : null
    if (!email || !otp)
      return NextResponse.json(
        { error: 'The code is invalid or expired.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    const headers = await verifySignInOtp(email, otp, request.headers)
    const response = NextResponse.json(
      { status: 'signed-in' },
      { headers: { 'Cache-Control': 'no-store' } }
    )
    const cookie = headers.get('set-cookie')
    if (cookie) response.headers.set('set-cookie', cookie)
    return response
  } catch {
    return NextResponse.json(
      { error: 'The code is invalid or expired.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

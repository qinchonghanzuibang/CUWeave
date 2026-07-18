import {
  auth,
  isDevelopmentAuthEnabled,
  takeDevelopmentMagicLink,
} from '../../../../../lib/auth'
import { NextResponse } from 'next/server'
import {
  enforceRateLimit,
  rateLimitPolicies,
} from '../../../../../lib/rate-limit'
import { isAuthenticationAvailable } from '../../../../../lib/auth-policy'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (!isAuthenticationAvailable())
      return NextResponse.json(
        { error: 'Sign-in is disabled for this Preview deployment.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    const body = (await request.json()) as {
      email?: unknown
      callbackURL?: unknown
    }
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 }
      )
    const limited = await enforceRateLimit(request, rateLimitPolicies.magicLink)
    if (limited) return limited
    const callbackURL =
      typeof body.callbackURL === 'string' && body.callbackURL.startsWith('/')
        ? body.callbackURL
        : '/profile'
    await auth.api.signInMagicLink({
      body: {
        email,
        name: email.split('@')[0] || 'CUWeave user',
        callbackURL,
        errorCallbackURL: '/sign-in?error=invalid-link',
      },
      headers: request.headers,
    })
    const developmentUrl = isDevelopmentAuthEnabled()
      ? takeDevelopmentMagicLink(email)
      : null
    return NextResponse.json(
      developmentUrl
        ? { status: 'development-link-ready', developmentUrl }
        : { status: 'email-sent' },
      { status: 202, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json(
      { error: 'A sign-in link could not be prepared.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

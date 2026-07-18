import { getSharedSchedule } from '@cuweave/db'
import { NextResponse } from 'next/server'
import {
  enforceRateLimit,
  rateLimitPolicies,
} from '../../../../../lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const limited = await enforceRateLimit(
      request,
      rateLimitPolicies.publicShare
    )
    if (limited) return limited
    const schedule = await getSharedSchedule(token)
    return schedule
      ? NextResponse.json(
          { schedule },
          { headers: { 'Cache-Control': 'no-store' } }
        )
      : NextResponse.json(
          { error: 'Shared schedule not found.' },
          { status: 404 }
        )
  } catch {
    return NextResponse.json(
      { error: 'Shared schedule is unavailable.' },
      { status: 503 }
    )
  }
}

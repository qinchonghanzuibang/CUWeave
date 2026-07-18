import { createScheduleShare, revokeScheduleShare } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../../../lib/api-response'
import { requireViewer } from '../../../../../../lib/session'
import {
  enforceRateLimit,
  rateLimitPolicies,
} from '../../../../../../lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const viewer = await requireViewer(request.headers)
    const limited = await enforceRateLimit(
      request,
      rateLimitPolicies.scheduleShare,
      viewer.id
    )
    if (limited) return limited
    const { scheduleId } = await params
    const { token } = await createScheduleShare(viewer.id, scheduleId)
    return NextResponse.json({ sharePath: `/share/${token}` })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const viewer = await requireViewer(request.headers)
    const { scheduleId } = await params
    await revokeScheduleShare(viewer.id, scheduleId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}

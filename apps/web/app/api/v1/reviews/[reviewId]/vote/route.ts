import { setReviewVote } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../../../lib/api-response'
import { requireViewer } from '../../../../../../lib/session'
import {
  enforceRateLimit,
  rateLimitPolicies,
} from '../../../../../../lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const viewer = await requireViewer(request.headers)
    const limited = await enforceRateLimit(
      request,
      rateLimitPolicies.vote,
      viewer.id
    )
    if (limited) return limited
    const { reviewId } = await params
    const body = (await request.json()) as { value?: unknown }
    if (body.value !== 'helpful' && body.value !== 'not_helpful')
      return NextResponse.json({ error: 'Vote is invalid.' }, { status: 400 })
    await setReviewVote(viewer.id, reviewId, body.value)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const viewer = await requireViewer(request.headers)
    const { reviewId } = await params
    await setReviewVote(viewer.id, reviewId, null)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}

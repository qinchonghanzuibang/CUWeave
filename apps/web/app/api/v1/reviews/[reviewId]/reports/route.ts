import { reportReview } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../../../lib/api-response'
import { requireViewer } from '../../../../../../lib/session'
import {
  enforceRateLimit,
  rateLimitPolicies,
} from '../../../../../../lib/rate-limit'

export const dynamic = 'force-dynamic'

const categories = [
  'spam',
  'harassment',
  'privacy',
  'incorrect',
  'other',
] as const

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const viewer = await requireViewer(request.headers)
    const limited = await enforceRateLimit(
      request,
      rateLimitPolicies.report,
      viewer.id
    )
    if (limited) return limited
    const { reviewId } = await params
    const body = (await request.json()) as {
      category?: unknown
      explanation?: unknown
    }
    const category = categories.find((value) => value === body.category)
    if (!category)
      return NextResponse.json(
        { error: 'Report category is invalid.' },
        { status: 400 }
      )
    await reportReview(
      viewer.id,
      reviewId,
      category,
      typeof body.explanation === 'string' ? body.explanation : ''
    )
    return NextResponse.json({ status: 'reported' }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}

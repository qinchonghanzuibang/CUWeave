import { deleteReview, updateReview } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../../lib/api-response'
import { parseReviewInput } from '../../../../../lib/review-input'
import { requireViewer } from '../../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const viewer = await requireViewer(request.headers)
    const { reviewId } = await params
    const body = (await request.json()) as Record<string, unknown>
    await updateReview(viewer.id, reviewId, parseReviewInput(body))
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
    await deleteReview(viewer.id, reviewId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}

import { createReview, listCourseReviews } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../lib/api-response'
import { parseReviewInput } from '../../../../lib/review-input'
import { getViewer, requireViewer } from '../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const viewer = await getViewer(request.headers)
    const filters: {
      academicYear?: string
      termKey?: string
      instructorId?: string
    } = {}
    const year = url.searchParams.get('year')
    const term = url.searchParams.get('term')
    const instructor = url.searchParams.get('instructor')
    if (year) filters.academicYear = year
    if (term) filters.termKey = term
    if (instructor) filters.instructorId = instructor
    const result = await listCourseReviews(
      url.searchParams.get('course') ?? '',
      filters,
      viewer?.id
    )
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer(request.headers)
    const body = (await request.json()) as Record<string, unknown>
    const review = await createReview(viewer.id, parseReviewInput(body))
    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}

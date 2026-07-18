import { resolveReport } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../../../lib/api-response'
import { requireModerator } from '../../../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const moderator = await requireModerator(request.headers)
    const { reportId } = await params
    const body = (await request.json()) as {
      resolution?: unknown
      notes?: unknown
      hideReview?: unknown
    }
    if (body.resolution !== 'resolved' && body.resolution !== 'dismissed')
      return NextResponse.json(
        { error: 'Resolution is invalid.' },
        { status: 400 }
      )
    await resolveReport(
      moderator.id,
      reportId,
      body.resolution,
      typeof body.notes === 'string' ? body.notes : '',
      body.hideReview === true
    )
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}

import { duplicateSavedSchedule } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../../../lib/api-response'
import { requireViewer } from '../../../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const viewer = await requireViewer(request.headers)
    const { scheduleId } = await params
    const schedule = await duplicateSavedSchedule(viewer.id, scheduleId)
    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}

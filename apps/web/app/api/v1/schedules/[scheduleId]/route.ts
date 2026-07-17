import { deleteSavedSchedule, updateSavedSchedule } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../../lib/api-response'
import { requireViewer } from '../../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const viewer = await requireViewer(request.headers)
    const { scheduleId } = await params
    const body = (await request.json()) as {
      version?: unknown
      name?: unknown
      sectionIds?: unknown
    }
    const values: { name?: string; sectionIds?: string[] } = {}
    if (typeof body.name === 'string') values.name = body.name
    if (Array.isArray(body.sectionIds))
      values.sectionIds = body.sectionIds.filter(
        (value): value is string => typeof value === 'string'
      )
    const schedule = await updateSavedSchedule(
      viewer.id,
      scheduleId,
      typeof body.version === 'number' ? body.version : 0,
      values
    )
    return NextResponse.json({ schedule })
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
    await deleteSavedSchedule(viewer.id, scheduleId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}

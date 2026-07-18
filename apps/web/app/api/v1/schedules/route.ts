import { createSavedSchedule, listSavedSchedules } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../lib/api-response'
import { requireViewer } from '../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const viewer = await requireViewer(request.headers)
    return NextResponse.json(
      { schedules: await listSavedSchedules(viewer.id) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer(request.headers)
    const body = (await request.json()) as {
      name?: unknown
      sectionIds?: unknown
    }
    const schedule = await createSavedSchedule(
      viewer.id,
      typeof body.name === 'string' ? body.name : '',
      Array.isArray(body.sectionIds)
        ? body.sectionIds.filter(
            (value): value is string => typeof value === 'string'
          )
        : []
    )
    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}

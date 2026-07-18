import { saveRequirementSelection } from '@cuweave/db'
import type { RequirementCourse } from '@cuweave/requirements'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../lib/api-response'
import { requireViewer } from '../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer(request.headers)
    const body = (await request.json()) as {
      programmeId?: unknown
      requirementSetId?: unknown
      entryYear?: unknown
      courses?: unknown
    }
    if (
      typeof body.programmeId !== 'string' ||
      typeof body.requirementSetId !== 'string' ||
      !Number.isInteger(body.entryYear) ||
      !Array.isArray(body.courses)
    )
      return NextResponse.json(
        { error: 'Requirement plan is invalid.' },
        { status: 400 }
      )
    const courses = body.courses
      .filter((course): course is RequirementCourse => {
        if (!course || typeof course !== 'object') return false
        const item = course as Record<string, unknown>
        return (
          typeof item.code === 'string' &&
          typeof item.units === 'string' &&
          (item.planningStatus === 'planned' ||
            item.planningStatus === 'completed') &&
          (item.approvalStatus === 'approved' ||
            item.approvalStatus === 'unknown' ||
            item.approvalStatus === 'rejected') &&
          Array.isArray(item.categories)
        )
      })
      .slice(0, 100)
    await saveRequirementSelection(viewer.id, {
      programmeId: body.programmeId,
      requirementSetId: body.requirementSetId,
      entryYear: body.entryYear as number,
      courses,
    })
    return NextResponse.json(
      { status: 'saved' },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return apiError(error)
  }
}

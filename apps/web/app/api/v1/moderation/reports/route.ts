import { listModerationReports } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../../lib/api-response'
import { requireModerator } from '../../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireModerator(request.headers)
    return NextResponse.json(
      { reports: await listModerationReports() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return apiError(error)
  }
}

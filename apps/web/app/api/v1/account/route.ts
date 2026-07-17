import { deactivateAccount } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../lib/api-response'
import { requireViewer } from '../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const viewer = await requireViewer(request.headers)
    return NextResponse.json(
      { user: viewer },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const viewer = await requireViewer(request.headers)
    await deactivateAccount(viewer.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}

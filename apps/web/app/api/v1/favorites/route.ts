import { listFavorites, setFavorite } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { apiError } from '../../../../lib/api-response'
import { requireViewer } from '../../../../lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const viewer = await requireViewer(request.headers)
    return NextResponse.json(
      { favorites: await listFavorites(viewer.id) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return apiError(error)
  }
}

async function mutate(request: Request, favorite: boolean) {
  try {
    const viewer = await requireViewer(request.headers)
    const body = (await request.json()) as { courseId?: unknown }
    await setFavorite(
      viewer.id,
      typeof body.courseId === 'string' ? body.courseId : '',
      favorite
    )
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  return mutate(request, true)
}

export async function DELETE(request: Request) {
  return mutate(request, false)
}

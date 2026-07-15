import { getSectionsByIds } from '@cuweave/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams
    .getAll('id')
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 50)
  try {
    const sections = await getSectionsByIds(ids)
    return NextResponse.json(
      { sections },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json(
      { error: 'course_data_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

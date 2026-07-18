import { listModerationReports } from '@cuweave/db'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { getViewer } from '../../lib/session'
import { ModerationQueue } from './moderation-queue'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ModerationPage() {
  const viewer = await getViewer()
  if (!viewer) redirect('/sign-in')
  if (viewer.role === 'user') notFound()
  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Moderator workspace</span>
      <h1 className="page-title mt-4 !text-[clamp(2.5rem,7vw,4.5rem)]">
        Resolve reports with context.
      </h1>
      <p className="page-lead mt-4">
        Keep public reviews useful without exposing anonymous authors. Every
        resolution stores the moderator, notes, state, and timestamp.
      </p>
      <ModerationQueue initial={await listModerationReports()} />
    </main>
  )
}

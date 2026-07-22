import { listSavedSchedules } from '@cuweave/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

import { requirementsEnabled } from '../../lib/features'
import { getViewer } from '../../lib/session'
import { ScheduleLibrary } from './schedule-library'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function SchedulesPage() {
  const viewer = await getViewer()
  if (!viewer) redirect('/sign-in')
  return (
    <main className="page-shell py-9 sm:py-12">
      <span className="eyebrow">Private cloud library</span>
      <h1 className="page-title mt-4">Schedules that travel with you.</h1>
      <p className="page-lead mt-4">
        Create named versions, move the anonymous planner into your account, and
        issue revocable read-only links.
      </p>
      <ScheduleLibrary initial={await listSavedSchedules(viewer.id)} />
      {requirementsEnabled() ? (
        <aside className="status-banner status-info mt-7 p-4">
          Courses in your saved schedules can be included in the{' '}
          <Link className="text-link" href="/requirements">
            requirement checker
          </Link>
          . Inclusion does not imply that a Division has approved the course.
        </aside>
      ) : null}
    </main>
  )
}

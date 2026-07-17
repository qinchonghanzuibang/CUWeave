import { listSavedSchedules } from '@cuweave/db'
import { redirect } from 'next/navigation'

import { getViewer } from '../../lib/session'
import { ScheduleLibrary } from './schedule-library'

export const dynamic = 'force-dynamic'

export default async function SchedulesPage() {
  const viewer = await getViewer()
  if (!viewer) redirect('/sign-in')
  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Private cloud library</span>
      <h1 className="page-title mt-4 !text-[clamp(2.5rem,7vw,4.5rem)]">
        Schedules that travel with you.
      </h1>
      <p className="page-lead mt-4">
        Create named versions, move the anonymous planner into your account, and
        issue revocable read-only links.
      </p>
      <ScheduleLibrary initial={await listSavedSchedules(viewer.id)} />
    </main>
  )
}

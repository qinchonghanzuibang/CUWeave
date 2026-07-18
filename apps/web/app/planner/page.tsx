import { listSavedSchedules } from '@cuweave/db'
import type { Metadata } from 'next'

import { getViewer } from '../../lib/session'
import { PlannerClient } from './planner-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Local planner · CUWeave',
  description:
    'Compare course sections locally while preserving uncertain teaching dates.',
}

export default async function PlannerPage() {
  const viewer = await getViewer()
  const schedules = viewer ? await listSavedSchedules(viewer.id) : []
  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Local-first planner</span>
      <h1 className="page-title mt-4 !text-[clamp(2.5rem,7vw,4.5rem)]">
        Weave a workable week.
      </h1>
      <p className="page-lead mt-4">
        Anonymous choices stay in this browser. Sign in when you want named
        cloud copies and private synchronization. Missing teaching dates are
        still shown as uncertainty, never as a safe gap.
      </p>
      <PlannerClient signedIn={Boolean(viewer)} schedules={schedules} />
    </main>
  )
}

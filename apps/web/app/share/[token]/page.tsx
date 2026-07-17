import { getSectionsByIds, getSharedSchedule } from '@cuweave/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SharedSchedulePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const schedule = await getSharedSchedule(token).catch(() => null)
  if (!schedule) notFound()
  const sections = await getSectionsByIds(schedule.sectionIds)
  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Read-only share</span>
      <h1 className="page-title mt-4 !text-[clamp(2.5rem,7vw,4.5rem)]">
        {schedule.name}
      </h1>
      <p className="page-lead mt-4">
        This revocable link contains timetable information only. It does not
        expose the owner’s identity or account.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <article className="panel p-5" key={section.id}>
            <p className="font-black text-emerald-800">{section.courseCode}</p>
            <h2 className="mt-1 text-xl font-black">{section.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{section.termName}</p>
            <div className="mt-4 space-y-2">
              {section.meetings.map((meeting) => (
                <div
                  className="rounded-xl bg-slate-50 p-3 text-sm"
                  key={meeting.id}
                >
                  <p className="font-bold">{meeting.timeRaw}</p>
                  <p className="mt-1 text-slate-600">{meeting.locationRaw}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <aside className="mt-8 rounded-2xl border border-amber-900/15 bg-amber-50 p-5 text-sm text-amber-950">
        Planning aid only. Verify all enrollment details in CUSIS.
      </aside>
      <Link className="button-primary mt-6" href="/planner">
        Build your own schedule
      </Link>
    </main>
  )
}

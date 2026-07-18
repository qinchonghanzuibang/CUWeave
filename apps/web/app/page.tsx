import { listFavorites, listSavedSchedules } from '@cuweave/db'
import Link from 'next/link'

import { getHealthStatus } from '../lib/status'
import { getViewer } from '../lib/session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function StatusBadge({
  ready,
  children,
}: {
  ready: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
        ready
          ? 'bg-emerald-100 text-emerald-900'
          : 'bg-amber-100 text-amber-950'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${ready ? 'bg-emerald-600' : 'bg-amber-600'}`}
      />
      {children}
    </span>
  )
}

export default async function Home() {
  const health = await getHealthStatus()
  const databaseReady = health.checks.database === 'ready'
  const viewer = await getViewer()
  const [favorites, schedules] =
    viewer && databaseReady
      ? await Promise.all([
          listFavorites(viewer.id),
          listSavedSchedules(viewer.id),
        ])
      : [[], []]
  const featureCards: Array<{
    number: string
    title: string
    copy: string
    href: string
  }> = [
    {
      number: '01',
      title: 'Explore',
      copy: 'Search imported courses and inspect current sections, instructors, and provenance.',
      href: '/courses',
    },
    {
      number: '02',
      title: 'Plan',
      copy: 'Build locally first, with confirmed conflicts separated from uncertain teaching dates.',
      href: '/planner',
    },
    {
      number: '03',
      title: 'Remember',
      copy: viewer
        ? `${favorites.length} favorites and ${schedules.length} cloud schedules in your workspace.`
        : 'Sign in by email to keep favorites and multiple named schedules.',
      href: viewer ? '/profile' : '/sign-in',
    },
    {
      number: '04',
      title: 'Review',
      copy: 'Read and contribute structured, offering-specific ratings without scraping other communities.',
      href: '/courses',
    },
  ]
  return (
    <main className="page-shell flex min-h-[calc(100vh-73px)] flex-col py-8 sm:py-12">
      <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
        <div>
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-800">
            CUWeave Public Beta
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-emerald-950 sm:text-7xl">
            One calmer place to shape your CUHK term.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
            Explore pinned course data, compare community context, catch
            timetable uncertainty, and keep private schedules together—without
            giving us your OnePass credentials or student records.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="button-primary !px-5 !py-3" href="/courses">
              Explore courses
            </Link>
            <Link className="button-secondary !px-5 !py-3" href="/planner">
              Open planner
            </Link>
            {!viewer ? (
              <Link className="button-secondary !px-5 !py-3" href="/sign-in">
                Save your work
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="panel p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-emerald-950">
            System status
          </h2>
          <dl className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-emerald-950/10 pb-5">
              <dt className="text-slate-600">Application</dt>
              <dd>
                <StatusBadge ready>Live</StatusBadge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Database</dt>
              <dd>
                <StatusBadge ready={databaseReady}>
                  {databaseReady ? 'Ready' : 'Unavailable'}
                </StatusBadge>
              </dd>
            </div>
          </dl>
          <p className="mt-7 text-sm leading-6 text-slate-600">
            Course data comes from explicitly pinned local snapshots. Database
            checks and course queries run only when requested.
          </p>
        </aside>
      </section>

      <section className="grid gap-4 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        {featureCards.map((card) => (
          <Link
            className="panel group p-5 transition hover:-translate-y-1"
            href={card.href}
            key={card.number}
          >
            <span className="text-xs font-black text-emerald-700">
              {card.number}
            </span>
            <h2 className="mt-8 text-xl font-black">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.copy}</p>
          </Link>
        ))}
      </section>

      <footer className="grid gap-3 border-t border-emerald-950/15 py-6 text-sm leading-6 text-slate-600 sm:grid-cols-2">
        <p>
          CUWeave is unofficial and is not affiliated with or endorsed by CUHK.
        </p>
        <p className="sm:text-right">
          Always verify final enrollment details in CUSIS before making academic
          decisions.
        </p>
      </footer>
    </main>
  )
}

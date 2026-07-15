import Link from 'next/link'

import { getHealthStatus } from '../lib/status'

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
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
        <div>
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-800">
            Fast-track Milestone 1
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-emerald-950 sm:text-7xl">
            Academic planning, thoughtfully woven together.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
            CUWeave is an open-source, student-led project building a unified
            academic planning experience for students at The Chinese University
            of Hong Kong.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-emerald-900 px-5 py-3 font-bold text-white"
              href="/courses"
            >
              Explore courses
            </Link>
            <Link
              className="rounded-full border border-emerald-900/20 bg-white/60 px-5 py-3 font-bold"
              href="/planner"
            >
              Open planner
            </Link>
          </div>
        </div>

        <aside className="rounded-3xl border border-emerald-950/15 bg-white/65 p-6 shadow-[0_24px_80px_-42px_rgba(20,79,59,0.55)] backdrop-blur sm:p-8">
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

      <footer className="grid gap-3 border-t border-emerald-950/15 pt-6 text-sm leading-6 text-slate-600 sm:grid-cols-2">
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

import { listFavorites, listSavedSchedules } from '@cuweave/db'
import Link from 'next/link'
import type { Metadata } from 'next'

import { getHealthStatus } from '../lib/status'
import { getViewer } from '../lib/session'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = {
  title: { absolute: 'CUWeave · CUHK course planning, woven together' },
  description:
    'Explore pinned CUHK course data, plan schedules, and keep academic uncertainty visible.',
}

function StatusBadge({
  ready,
  children,
}: {
  ready: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm font-medium ${
        ready ? 'text-[var(--success)]' : 'text-[var(--warning)]'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-700' : 'bg-amber-700'}`}
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
    <main className="page-shell py-8 sm:py-10">
      <section className="grid items-center gap-8 py-8 lg:grid-cols-[1.35fr_0.65fr] lg:py-12">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            CUWeave course planning
          </p>
          <h1 className="hero-title">
            One calmer place to shape your CUHK term.
          </h1>
          <p className="mt-5 max-w-[39rem] text-base leading-7 text-[var(--text-secondary)] sm:text-[1.05rem]">
            Explore pinned course data, compare community context, catch
            timetable uncertainty, and keep private schedules together—without
            giving us your OnePass credentials or student records.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link className="button-primary" href="/courses">
              Explore courses
            </Link>
            <Link className="button-secondary" href="/planner">
              Open planner
            </Link>
            {!viewer ? (
              <Link className="button-ghost" href="/sign-in">
                Save your work
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="panel p-5 sm:p-6">
          <h2 className="section-title !text-[1.55rem]">System status</h2>
          <dl className="mt-4 space-y-3.5">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-3.5">
              <dt className="text-sm text-[var(--text-secondary)]">
                Application
              </dt>
              <dd>
                <StatusBadge ready>Live</StatusBadge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-[var(--text-secondary)]">Database</dt>
              <dd>
                <StatusBadge ready={databaseReady}>
                  {databaseReady ? 'Ready' : 'Unavailable'}
                </StatusBadge>
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
            Course data comes from explicitly pinned local snapshots. Database
            checks and course queries run only when requested.
          </p>
        </aside>
      </section>

      <section className="grid gap-3 pb-10 sm:grid-cols-2 lg:grid-cols-4">
        {featureCards.map((card) => (
          <Link
            className="panel group p-5 transition-colors hover:border-[rgb(111_45_108/35%)]"
            href={card.href}
            key={card.number}
          >
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {card.number}
            </span>
            <h2 className="mt-6 font-display text-[1.45rem] font-medium">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {card.copy}
            </p>
          </Link>
        ))}
      </section>

      <footer className="grid gap-3 border-t border-[var(--border)] py-6 text-sm leading-6 text-[var(--text-secondary)] sm:grid-cols-2">
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

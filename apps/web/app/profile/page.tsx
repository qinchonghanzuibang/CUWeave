import { listFavorites, listSavedSchedules } from '@cuweave/db'
import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { requirementsEnabled } from '../../lib/features'
import { getViewer } from '../../lib/session'
import { AccountActions } from './account-actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ProfilePage() {
  const viewer = await getViewer()
  if (!viewer) redirect('/sign-in')
  const [favorites, schedules] = await Promise.all([
    listFavorites(viewer.id),
    listSavedSchedules(viewer.id),
  ])
  return (
    <main className="page-shell py-9 sm:py-12">
      <span className="eyebrow">Your private workspace</span>
      <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Welcome, {viewer.name}.</h1>
          <p className="page-lead mt-4">
            {viewer.email} · {viewer.role}
          </p>
        </div>
        <Link className="button-primary" href="/schedules">
          Manage schedules
        </Link>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Favorites
              </p>
              <h2 className="mt-1 font-display text-2xl font-medium">
                Courses to revisit
              </h2>
            </div>
            <Link className="button-secondary" href="/courses">
              Browse
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {favorites.length ? (
              favorites.map((favorite) => (
                <Link
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 hover:border-[rgb(111_45_108/35%)]"
                  href={`/courses/${favorite.code}`}
                  key={favorite.id}
                >
                  <p className="font-semibold text-[var(--accent)]">
                    {favorite.code}
                  </p>
                  <p className="mt-1 text-sm font-bold">{favorite.title}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {favorite.academicYear}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                Favorite a course from its detail page and it will appear here.
              </p>
            )}
          </div>
        </section>

        <section className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Cloud schedules
          </p>
          <p className="mt-2 font-display text-4xl font-medium">
            {schedules.length}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Named timetables protected by your account session.
          </p>
          <Link className="button-secondary mt-5" href="/schedules">
            Open schedule library
          </Link>
        </section>

        {requirementsEnabled() ? (
          <section className="panel p-6 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Programme planning
            </p>
            <h2 className="mt-2 font-display text-2xl font-medium">
              Check requirements with sources attached.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Combine favorites, saved schedules, and manual completed courses.
              Draft or approval-dependent rules remain visibly uncertain.
            </p>
            <Link className="button-primary mt-5" href="/requirements">
              Open requirement checker
            </Link>
          </section>
        ) : null}
      </div>

      <section className="mt-8 rounded-xl border border-red-900/15 bg-[var(--surface)] p-5">
        <h2 className="font-semibold text-red-950">Account controls</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-red-900/75">
          Deactivation revokes sessions and removes sign-in account records.
          Reviews remain without exposing a deleted account identity.
        </p>
        <div className="mt-4">
          <AccountActions />
        </div>
      </section>
    </main>
  )
}

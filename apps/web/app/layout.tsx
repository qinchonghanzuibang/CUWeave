import type { Metadata } from 'next'
import Link from 'next/link'

import { getRepositoryUrl } from '../lib/repository-url'
import { getViewer } from '../lib/session'
import './globals.css'
import { SignOutButton } from './user-menu'

export const metadata: Metadata = {
  title: 'CUWeave',
  description:
    'An unofficial, student-led academic planning platform for CUHK students.',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const repositoryUrl = getRepositoryUrl()
  const viewer = await getViewer()
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[rgb(250_249_245/88%)] backdrop-blur-xl">
          <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <Link
              className="flex items-center gap-2 text-xl font-black tracking-tight text-emerald-950"
              href="/"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-900 text-sm text-white">
                CW
              </span>
              CUWeave{' '}
              <span className="hidden text-xs font-bold uppercase tracking-widest text-emerald-700 sm:inline">
                Beta
              </span>
            </Link>
            <div className="flex flex-1 items-center justify-end gap-1 overflow-x-auto text-sm font-semibold text-slate-700">
              <Link className="nav-link" href="/">
                Home
              </Link>
              <Link className="nav-link" href="/courses">
                Courses
              </Link>
              <Link className="nav-link" href="/planner">
                Planner
              </Link>
              {viewer ? (
                <>
                  <Link className="nav-link" href="/schedules">
                    Schedules
                  </Link>
                  <Link className="nav-link" href="/profile">
                    Profile
                  </Link>
                  {viewer.role !== 'user' ? (
                    <Link className="nav-link" href="/moderation">
                      Moderate
                    </Link>
                  ) : null}
                  <SignOutButton />
                </>
              ) : (
                <Link
                  className="button-primary whitespace-nowrap !px-4 !py-2"
                  href="/sign-in"
                >
                  Sign in
                </Link>
              )}
              {repositoryUrl ? (
                <a
                  className="nav-link hidden lg:inline-flex"
                  href={repositoryUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  GitHub
                </a>
              ) : null}
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}

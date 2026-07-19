import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { EB_Garamond, Inter } from 'next/font/google'

import { getRepositoryUrl } from '../lib/repository-url'
import { getViewer } from '../lib/session'
import './globals.css'
import { SignOutButton } from './user-menu'

const displayFont = EB_Garamond({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

const sansFont = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'),
  title: 'CUWeave',
  description:
    'An unofficial, student-led academic planning platform for CUHK students.',
  openGraph: {
    title: 'CUWeave',
    description: 'Explore CUHK courses and plan with explicit uncertainty.',
    type: 'website',
  },
}

export const viewport: Viewport = { themeColor: '#750F6D' }

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const repositoryUrl = getRepositoryUrl()
  const viewer = await getViewer()
  return (
    <html className={`${displayFont.variable} ${sansFont.variable}`} lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[rgb(247_246_242/92%)] backdrop-blur-lg">
          <nav className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-8">
            <Link
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text-primary)]"
              href="/"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-[var(--accent)] text-xs font-semibold text-white">
                CW
              </span>
              CUWeave{' '}
              <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] sm:inline">
                Beta
              </span>
            </Link>
            <div className="flex w-full min-w-0 flex-none flex-wrap items-center justify-start gap-0.5 sm:w-auto sm:flex-1 sm:justify-end">
              <Link className="nav-link" href="/">
                Home
              </Link>
              <Link className="nav-link" href="/courses">
                Courses
              </Link>
              <Link className="nav-link" href="/planner">
                Planner
              </Link>
              <Link className="nav-link" href="/requirements">
                Requirements
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
                  {viewer.role === 'admin' ? (
                    <Link className="nav-link" href="/admin/requirements">
                      Requirement admin
                    </Link>
                  ) : null}
                  <SignOutButton />
                </>
              ) : (
                <Link
                  className="button-primary whitespace-nowrap"
                  href="/sign-in"
                >
                  Sign in
                </Link>
              )}
              {repositoryUrl ? (
                <a
                  className="nav-link !hidden lg:!inline-flex"
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
        <footer className="mt-14 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <div className="page-shell flex flex-col justify-between gap-5 py-7 text-sm text-[var(--text-secondary)] sm:flex-row">
            <p>CUWeave is unofficial. Verify final details in CUSIS.</p>
            <nav
              className="flex flex-wrap gap-x-5 gap-y-2"
              aria-label="Policies"
            >
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/community-guidelines">Community</Link>
              <Link href="/moderation-policy">Moderation</Link>
              <Link href="/data-status">Data status</Link>
              <Link href="/feedback">Feedback</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  )
}

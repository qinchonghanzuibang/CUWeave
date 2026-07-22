import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { EB_Garamond, Inter } from 'next/font/google'

import { requirementsEnabled } from '../lib/features'
import { getRepositoryUrl } from '../lib/repository-url'
import { getViewer } from '../lib/session'
import './globals.css'
import { AppHeader } from './app-header'

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
  title: { default: 'CUWeave', template: '%s · CUWeave' },
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
        <AppHeader
          requirementsAvailable={requirementsEnabled()}
          viewer={viewer ? { role: viewer.role } : null}
        />
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
              {repositoryUrl ? (
                <a href={repositoryUrl} rel="noreferrer" target="_blank">
                  GitHub
                </a>
              ) : null}
            </nav>
          </div>
        </footer>
      </body>
    </html>
  )
}

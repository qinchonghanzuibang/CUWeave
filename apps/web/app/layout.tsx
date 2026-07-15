import type { Metadata } from 'next'
import Link from 'next/link'

import { getRepositoryUrl } from '../lib/repository-url'
import './globals.css'

export const metadata: Metadata = {
  title: 'CUWeave',
  description:
    'An unofficial, student-led academic planning platform for CUHK students.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const repositoryUrl = getRepositoryUrl()
  return (
    <html lang="en">
      <body>
        <header className="border-b border-emerald-950/15 bg-white/55 backdrop-blur">
          <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link
              className="text-xl font-black tracking-tight text-emerald-950"
              href="/"
            >
              CUWeave
            </Link>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
              <Link
                className="rounded-full px-3 py-2 hover:bg-emerald-950/5"
                href="/"
              >
                Home
              </Link>
              <Link
                className="rounded-full px-3 py-2 hover:bg-emerald-950/5"
                href="/courses"
              >
                Courses
              </Link>
              <Link
                className="rounded-full px-3 py-2 hover:bg-emerald-950/5"
                href="/planner"
              >
                Planner
              </Link>
              {repositoryUrl ? (
                <a
                  className="rounded-full px-3 py-2 hover:bg-emerald-950/5"
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

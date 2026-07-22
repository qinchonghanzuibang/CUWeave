import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feedback',
  description:
    'Report a bug, suggest a feature, request a data correction, or contact moderation.',
}

const entries = [
  ['Bug report', 'Something in CUWeave is not working as expected.', 'bug'],
  [
    'Feature suggestion',
    'Share a focused improvement for the student experience.',
    'enhancement',
  ],
  [
    'Data correction',
    'Flag academic information that may be incomplete, stale, or incorrect.',
    'data',
  ],
  [
    'Moderation or contact',
    'Ask about community content or reach project maintainers.',
    'moderation',
  ],
] as const

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>
}) {
  const filters = await searchParams
  const repo = process.env.GITHUB_REPOSITORY_URL?.replace(/\/$/, '')
  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Help improve CUWeave</span>
      <h1 className="page-title mt-3">Feedback</h1>
      <p className="page-lead mt-4">
        Use a public GitHub issue when possible. Never include your SID,
        transcript, OnePass credentials, OTP, or private schedule content.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {entries.map(([title, copy, label]) => {
          const params = new URLSearchParams({
            title:
              filters.course && label === 'data'
                ? `[Data correction] ${filters.course}`
                : `[${title}] `,
            labels: label,
            body:
              filters.course && label === 'data'
                ? `Course: ${filters.course}\n\nCUSIS-verified correction:\n\nSource or context:\n`
                : '',
          })
          return (
            <article className="panel p-5 sm:p-6" key={title}>
              <h2 className="font-display text-xl font-medium text-[var(--text-primary)]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              {repo ? (
                <a
                  className="button-secondary mt-5"
                  href={`${repo}/issues/new?${params}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open GitHub issue
                </a>
              ) : (
                <p className="status-banner status-warning mt-5">
                  Issue submission is unavailable because no repository URL is
                  configured.
                </p>
              )}
            </article>
          )
        })}
      </div>
      <p className="mt-8 text-sm text-slate-600">
        Academic corrections are reviewed against source provenance.{' '}
        <strong>CUSIS remains authoritative.</strong>
      </p>
      <Link className="text-link mt-5 inline-flex" href="/privacy">
        Review the privacy policy
      </Link>
    </main>
  )
}

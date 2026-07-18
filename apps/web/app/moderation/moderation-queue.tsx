'use client'

import type { ModerationReport } from '@cuweave/db'
import { useState } from 'react'

export function ModerationQueue({ initial }: { initial: ModerationReport[] }) {
  const [reports, setReports] = useState(initial)
  const [message, setMessage] = useState('')

  async function refresh() {
    const response = await fetch('/api/v1/moderation/reports', {
      cache: 'no-store',
    })
    const data = (await response.json()) as { reports?: ModerationReport[] }
    if (response.ok) setReports(data.reports ?? [])
  }

  async function resolve(
    report: ModerationReport,
    resolution: 'resolved' | 'dismissed',
    hideReview: boolean
  ) {
    const notes = prompt('Internal resolution notes') ?? ''
    const response = await fetch(`/api/v1/moderation/reports/${report.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, notes, hideReview }),
    })
    setMessage(
      response.ok
        ? 'Report resolved with an audit timestamp.'
        : 'Resolution failed.'
    )
    await refresh()
  }

  return (
    <div className="mt-8 space-y-4">
      {message ? (
        <p
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {reports.map((report) => (
        <article className="panel p-5" key={report.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-black text-emerald-800">{report.courseCode}</p>
              <h2 className="mt-1 text-xl font-black capitalize">
                {report.category} report
              </h2>
            </div>
            <span className="eyebrow">{report.status}</span>
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-4 leading-7">
            {report.reviewBody}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            <strong>Reporter context:</strong>{' '}
            {report.explanation || 'No explanation supplied.'}
          </p>
          {report.status === 'open' ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="button-danger"
                onClick={() => void resolve(report, 'resolved', true)}
                type="button"
              >
                Hide review & resolve
              </button>
              <button
                className="button-secondary"
                onClick={() => void resolve(report, 'resolved', false)}
                type="button"
              >
                Resolve, keep visible
              </button>
              <button
                className="button-secondary"
                onClick={() => void resolve(report, 'dismissed', false)}
                type="button"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </article>
      ))}
      {!reports.length ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-slate-600">
          No reports are waiting.
        </div>
      ) : null}
    </div>
  )
}

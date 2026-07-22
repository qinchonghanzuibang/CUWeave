import { getCatalogCoverage } from '@cuweave/db'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = {
  title: 'Data status',
  description: 'Coverage and provenance for the CUWeave academic catalog.',
}

export default async function DataStatusPage() {
  let coverage: Awaited<ReturnType<typeof getCatalogCoverage>> = null
  let unavailable = false
  try {
    coverage = await getCatalogCoverage()
  } catch {
    unavailable = true
  }
  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Catalog provenance</span>
      <h1 className="page-title mt-3">Data status</h1>
      <p className="page-lead mt-3">
        A direct account of what CUWeave has imported—without claiming more
        coverage than the database proves.
      </p>
      {unavailable ? (
        <Notice title="Database unavailable">
          Coverage cannot be checked right now. Try again later.
        </Notice>
      ) : !coverage ? (
        <Notice title="Data not imported">
          No catalog import has been activated.
        </Notice>
      ) : (
        <section className="panel mt-8 p-6">
          <div
            className={`status-banner ${coverage.status === 'complete' ? 'status-success' : 'status-warning'}`}
          >
            {coverage.status === 'complete'
              ? 'Complete manifest coverage'
              : 'Partial catalog coverage'}
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Academic year" value={coverage.academicYear} />
            <Metric
              label="Subjects"
              value={`${coverage.importedSubjectCount} / ${coverage.expectedSubjectCount}`}
            />
            <Metric
              label="Courses"
              value={coverage.courseCount.toLocaleString()}
            />
            <Metric
              label="Offerings"
              value={coverage.offeringCount.toLocaleString()}
            />
            <Metric
              label="Sections"
              value={coverage.sectionCount.toLocaleString()}
            />
            <Metric
              label="Instructor displays"
              value={coverage.instructorCount.toLocaleString()}
            />
          </dl>
          <p className="mt-6 text-sm text-slate-600">
            Last successful import:{' '}
            {new Date(coverage.importedAt).toLocaleString('en-HK')} · upstream
            revision <code>{coverage.upstreamRevision.slice(0, 12)}</code> ·{' '}
            {coverage.warningCount.toLocaleString()} explicit source warnings.
          </p>
        </section>
      )}
      <p className="mt-8 rounded-xl border border-gold/40 bg-gold-pale p-4 text-sm text-slate-800">
        <strong>CUSIS remains authoritative.</strong> Always verify enrollment
        availability, times, venues, teaching dates, and final course details in
        CUSIS.
      </p>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-medium text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  )
}
function Notice({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="status-banner status-warning mt-8">
      <strong>{title}.</strong> {children}
    </section>
  )
}

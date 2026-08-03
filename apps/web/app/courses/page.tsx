import {
  getCatalogCoverage,
  listCourseSubjects,
  searchCourses,
} from '@cuweave/db'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = {
  title: 'Course explorer',
  description:
    'Search the imported 2026–27 CUHK course catalog with provenance and bounded results.',
}

const terms = [
  ['term-1', 'Term 1'],
  ['term-2', 'Term 2'],
  ['term-3', 'Term 3'],
  ['term-4', 'Term 4'],
  ['summer-session', 'Summer'],
  ['academic-year', 'Academic year'],
] as const

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    subject?: string
    term?: string
    page?: string
  }>
}) {
  const filters = await searchParams
  let result: Awaited<ReturnType<typeof searchCourses>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 24,
    totalPages: 0,
  }
  let subjects: string[] = []
  let coverage: Awaited<ReturnType<typeof getCatalogCoverage>> = null
  let unavailable = false
  try {
    ;[result, subjects, coverage] = await Promise.all([
      searchCourses({
        query: filters.q ?? '',
        subject: filters.subject ?? '',
        term: filters.term ?? '',
        page: Number.parseInt(filters.page ?? '1', 10) || 1,
      }),
      listCourseSubjects(),
      getCatalogCoverage(),
    ])
  } catch {
    unavailable = true
  }

  return (
    <main className="page-shell py-9 sm:py-12">
      <span className="eyebrow">Course explorer</span>
      <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="page-title">Find your next course.</h1>
          <p className="page-lead mt-3">
            Search the imported catalog by code or title, then inspect real
            sections and meetings.
          </p>
        </div>
        <Link className="text-link" href="/planner">
          View local planner
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <Link className="text-link" href="/data-status">
          Catalog coverage
        </Link>
        {coverage ? (
          <span>
            {coverage.importedSubjectCount}/{coverage.expectedSubjectCount}{' '}
            subjects · {coverage.status}
          </span>
        ) : (
          <span>No catalog coverage report is available.</span>
        )}
      </div>

      <form
        className="panel mt-8 grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem_auto]"
        method="get"
      >
        <input
          aria-label="Search courses"
          className="field"
          defaultValue={filters.q}
          name="q"
          placeholder="Course code or title"
        />
        <select
          aria-label="Subject"
          className="field"
          defaultValue={filters.subject ?? ''}
          name="subject"
        >
          <option value="">All subjects</option>
          {subjects.map((subject) => (
            <option key={subject}>{subject}</option>
          ))}
        </select>
        <select
          aria-label="Term"
          className="field"
          defaultValue={filters.term ?? ''}
          name="term"
        >
          <option value="">All terms</option>
          {terms.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="button-primary" type="submit">
          Search
        </button>
      </form>

      {unavailable ? (
        <div className="status-banner status-warning mt-8 p-5">
          <strong>Course data is unavailable.</strong> PostgreSQL could not be
          reached; no placeholder results are shown.
        </div>
      ) : result.items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-9 text-center text-[var(--text-secondary)]">
          {coverage
            ? 'No imported courses match these filters.'
            : 'Course data has not been imported yet.'}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {result.items.map((course) => (
            <Link
              className="panel group p-5 transition-colors hover:border-[rgb(111_45_108/35%)]"
              href={`/courses/${course.code}`}
              key={course.code}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--accent)]">
                    {course.code}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                    {course.title}
                  </h2>
                </div>
                <span className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  {course.credits} units
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <span className="rounded-md bg-slate-100 px-2.5 py-1">
                  {course.academicYear}
                </span>
                {course.terms.map((term) => (
                  <span
                    className="rounded-md bg-slate-100 px-2.5 py-1"
                    key={term}
                  >
                    {term}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                {course.sourceName} · imported{' '}
                {new Date(course.importedAt).toLocaleString('en-HK')}
              </p>
            </Link>
          ))}
        </div>
      )}
      {result.totalPages > 1 && (
        <nav
          aria-label="Course results pages"
          className="mt-8 flex items-center justify-between gap-4"
        >
          <PageLink
            disabled={result.page <= 1}
            filters={filters}
            page={result.page - 1}
          >
            Previous
          </PageLink>
          <span className="text-sm text-slate-600">
            Page {result.page} of {result.totalPages} · {result.total} courses
          </span>
          <PageLink
            disabled={result.page >= result.totalPages}
            filters={filters}
            page={result.page + 1}
          >
            Next
          </PageLink>
        </nav>
      )}
    </main>
  )
}

function PageLink({
  children,
  disabled,
  filters,
  page,
}: {
  children: React.ReactNode
  disabled: boolean
  filters: Record<string, string | undefined>
  page: number
}) {
  if (disabled)
    return (
      <span className="button-secondary opacity-50" aria-disabled="true">
        {children}
      </span>
    )
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters))
    if (value && key !== 'page') params.set(key, value)
  params.set('page', String(page))
  return (
    <Link className="button-secondary" href={`/courses?${params}`}>
      {children}
    </Link>
  )
}

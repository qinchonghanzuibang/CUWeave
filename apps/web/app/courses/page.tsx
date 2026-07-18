import { searchCourses } from '@cuweave/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const subjects = ['IERG', 'ENGG']
const terms = [
  ['term-1', 'Term 1'],
  ['term-2', 'Term 2'],
  ['summer-session', 'Summer'],
] as const

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; term?: string }>
}) {
  const filters = await searchParams
  let courses: Awaited<ReturnType<typeof searchCourses>> = []
  let unavailable = false
  try {
    courses = await searchCourses({
      query: filters.q ?? '',
      subject: filters.subject ?? '',
      term: filters.term ?? '',
    })
  } catch {
    unavailable = true
  }

  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Course explorer</span>
      <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="page-title !text-[clamp(2.5rem,7vw,4.5rem)]">
            Find your next course.
          </h1>
          <p className="page-lead mt-3">
            Search the imported catalog by code or title, then inspect real
            sections and meetings.
          </p>
        </div>
        <Link
          className="font-bold text-emerald-800 underline underline-offset-4"
          href="/planner"
        >
          View local planner
        </Link>
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
        <button className="button-primary !rounded-xl" type="submit">
          Search
        </button>
      </form>

      {unavailable ? (
        <div className="mt-8 rounded-2xl border border-amber-900/20 bg-amber-50 p-6 text-amber-950">
          <strong>Course data is unavailable.</strong> PostgreSQL could not be
          reached; no placeholder results are shown.
        </div>
      ) : courses.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-emerald-950/25 p-10 text-center text-slate-600">
          No imported courses match these filters.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <Link
              className="panel group p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              href={`/courses/${course.code}`}
              key={course.code}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-emerald-900">{course.code}</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {course.title}
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-900">
                  {course.credits} units
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {course.academicYear}
                </span>
                {course.terms.map((term) => (
                  <span
                    className="rounded-full bg-slate-100 px-3 py-1"
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
    </main>
  )
}

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
    <main className="mx-auto min-h-[calc(100vh-73px)] w-full max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-800">
        Course explorer
      </p>
      <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">
            Find your next course.
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
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
        className="mt-8 grid gap-3 rounded-3xl border border-emerald-950/15 bg-white/65 p-4 shadow-sm md:grid-cols-[1fr_12rem_12rem_auto]"
        method="get"
      >
        <input
          aria-label="Search courses"
          className="rounded-xl border border-emerald-950/20 bg-white px-4 py-3 outline-none focus:border-emerald-700"
          defaultValue={filters.q}
          name="q"
          placeholder="Course code or title"
        />
        <select
          aria-label="Subject"
          className="rounded-xl border border-emerald-950/20 bg-white px-4 py-3"
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
          className="rounded-xl border border-emerald-950/20 bg-white px-4 py-3"
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
        <button
          className="rounded-xl bg-emerald-900 px-5 py-3 font-bold text-white"
          type="submit"
        >
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
              className="group rounded-2xl border border-emerald-950/15 bg-white/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

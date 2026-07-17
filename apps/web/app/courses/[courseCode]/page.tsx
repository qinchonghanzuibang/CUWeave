import {
  getCourseDetail,
  getCourseReviewOptions,
  listCourseReviews,
  listFavorites,
} from '@cuweave/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AddSectionButton } from './add-section-button'
import { FavoriteButton } from './favorite-button'
import { ReviewHub } from './review-hub'
import { getViewer } from '../../../lib/session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseCode: string }>
}) {
  const { courseCode } = await params
  let course
  try {
    course = await getCourseDetail(courseCode)
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <div className="rounded-2xl border border-amber-900/20 bg-amber-50 p-6 text-amber-950">
          Course data is unavailable because PostgreSQL could not be reached.
        </div>
      </main>
    )
  }
  if (!course) notFound()
  const viewer = await getViewer()
  const [reviewOptions, reviewData, favorites] = await Promise.all([
    getCourseReviewOptions(course.code),
    listCourseReviews(course.code, {}, viewer?.id),
    viewer ? listFavorites(viewer.id) : Promise.resolve([]),
  ])

  return (
    <main className="page-shell py-10 sm:py-14">
      <Link className="text-sm font-bold text-emerald-800" href="/courses">
        ← Back to courses
      </Link>
      <div className="panel mt-6 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-black text-emerald-800">{course.code}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-emerald-950">
              {course.title}
            </h1>
            {course.academicCareer ? (
              <p className="mt-3 text-slate-600">{course.academicCareer}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className="w-fit rounded-full bg-emerald-100 px-4 py-2 font-bold text-emerald-900">
              {course.credits} units
            </span>
            <FavoriteButton
              courseId={course.id}
              initial={favorites.some((favorite) => favorite.id === course.id)}
              signedIn={Boolean(viewer)}
            />
          </div>
        </div>
        <div className="mt-7 grid gap-3 border-t border-emerald-950/10 pt-5 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            <strong className="text-slate-900">Source:</strong>{' '}
            {course.sourceName}
          </p>
          <p>
            <strong className="text-slate-900">Imported:</strong>{' '}
            {new Date(course.importedAt).toLocaleString('en-HK')}
          </p>
          <p className="break-all sm:col-span-2">
            <strong className="text-slate-900">Revision:</strong>{' '}
            {course.sourceRevision}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-2xl font-black text-emerald-950">
          Sections · {course.academicYear}
        </h2>
        <div className="mt-4 space-y-4">
          {course.sections.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-slate-600">
              No active sections are available.
            </p>
          ) : (
            course.sections.map((section) => (
              <article
                className="rounded-2xl border border-emerald-950/15 bg-white/65 p-5"
                key={section.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      {section.termName}
                    </p>
                    <h3 className="mt-1 text-lg font-black">{section.label}</h3>
                  </div>
                  <AddSectionButton sectionId={section.id} />
                </div>
                <div className="mt-4 space-y-3">
                  {section.meetings.length === 0 ? (
                    <p className="text-sm text-amber-800">
                      No scheduled meeting details.
                    </p>
                  ) : (
                    section.meetings.map((meeting) => (
                      <div
                        className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"
                        key={meeting.id}
                      >
                        <p>
                          <strong>Time:</strong> {meeting.timeRaw}
                        </p>
                        <p>
                          <strong>Location:</strong> {meeting.locationRaw}
                        </p>
                        <p>
                          <strong>Teaching dates:</strong>{' '}
                          {meeting.teachingDatesRaw}
                        </p>
                        <p>
                          <strong>Instructor:</strong>{' '}
                          {meeting.instructorDisplayRaw}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <ReviewHub
        courseCode={course.code}
        initialAggregate={reviewData.aggregate}
        initialReviews={reviewData.reviews}
        offerings={reviewOptions.offerings}
        signedIn={Boolean(viewer)}
      />
      <aside className="mt-8 rounded-2xl border border-amber-900/15 bg-amber-50/70 p-5 text-sm leading-6 text-amber-950">
        CUWeave is an unofficial planning aid. Always verify final enrollment
        details in CUSIS.
      </aside>
    </main>
  )
}

'use client'

import type {
  PublicReview,
  RatingDimension,
  ReviewAggregate,
} from '@cuweave/db'
import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'

interface OfferingOption {
  id: string
  academicYear: string
  termKey: string
  termName: string
  instructors: Array<{ id: string; display: string }>
}

const ratingDimensions = [
  'overall',
  'teaching',
  'workload',
  'difficulty',
  'grading',
  'usefulness',
] as const satisfies readonly RatingDimension[]

const labels: Record<RatingDimension, string> = {
  overall: 'Overall',
  teaching: 'Teaching',
  workload: 'Workload',
  difficulty: 'Difficulty',
  grading: 'Grading',
  usefulness: 'Usefulness',
}

const defaultRatings = Object.fromEntries(
  ratingDimensions.map((dimension) => [dimension, 3])
) as Record<RatingDimension, number>

export function ReviewHub({
  courseCode,
  offerings,
  initialReviews,
  initialAggregate,
  signedIn,
}: {
  courseCode: string
  offerings: OfferingOption[]
  initialReviews: PublicReview[]
  initialAggregate: ReviewAggregate
  signedIn: boolean
}) {
  const [reviews, setReviews] = useState(initialReviews)
  const [aggregate, setAggregate] = useState(initialAggregate)
  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? '')
  const [instructorId, setInstructorId] = useState('')
  const [ratings, setRatings] = useState(defaultRatings)
  const [body, setBody] = useState('')
  const [assessmentSummary, setAssessmentSummary] = useState('')
  const [attendanceRequirement, setAttendanceRequirement] = useState('unknown')
  const [recommendation, setRecommendation] = useState('yes')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [editingId, setEditingId] = useState('')
  const [message, setMessage] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')
  const [instructorFilter, setInstructorFilter] = useState('')

  const selectedOffering = offerings.find(
    (offering) => offering.id === offeringId
  )
  const allInstructors = useMemo(() => {
    const map = new Map<string, string>()
    for (const offering of offerings)
      for (const instructor of offering.instructors)
        map.set(instructor.id, instructor.display)
    return [...map].map(([id, display]) => ({ id, display }))
  }, [offerings])

  async function refresh() {
    const query = new URLSearchParams({ course: courseCode })
    if (yearFilter) query.set('year', yearFilter)
    if (termFilter) query.set('term', termFilter)
    if (instructorFilter) query.set('instructor', instructorFilter)
    const response = await fetch(`/api/v1/reviews?${query}`, {
      cache: 'no-store',
    })
    const data = (await response.json()) as {
      reviews?: PublicReview[]
      aggregate?: ReviewAggregate
    }
    if (response.ok) {
      setReviews(data.reviews ?? [])
      setAggregate(data.aggregate ?? { count: 0, averages: {} })
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const response = await fetch(
      editingId ? `/api/v1/reviews/${editingId}` : '/api/v1/reviews',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offeringId,
          instructorId: instructorId || null,
          isAnonymous,
          recommendation:
            recommendation === 'yes'
              ? true
              : recommendation === 'no'
                ? false
                : null,
          attendanceRequirement,
          assessmentSummary,
          body,
          ratings,
        }),
      }
    )
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    setMessage(
      response.ok
        ? editingId
          ? 'Review updated.'
          : 'Review published.'
        : (data.error ?? 'Review could not be saved.')
    )
    if (response.ok) {
      setEditingId('')
      setBody('')
      setAssessmentSummary('')
      await refresh()
    }
  }

  function edit(review: PublicReview) {
    setEditingId(review.id)
    setOfferingId(review.offeringId)
    setInstructorId(review.instructorId ?? '')
    setRatings(review.ratings)
    setBody(review.body)
    setAssessmentSummary(review.assessmentSummary)
    setAttendanceRequirement(review.attendanceRequirement)
    setRecommendation(
      review.recommendation === null
        ? 'unknown'
        : review.recommendation
          ? 'yes'
          : 'no'
    )
    setIsAnonymous(review.isAnonymous)
    document
      .getElementById('review-composer')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  async function remove(id: string) {
    if (!confirm('Delete this review?')) return
    const response = await fetch(`/api/v1/reviews/${id}`, { method: 'DELETE' })
    setMessage(response.ok ? 'Review deleted.' : 'Review could not be deleted.')
    if (response.ok) await refresh()
  }

  async function vote(id: string, value: 'helpful' | 'not_helpful') {
    const response = await fetch(`/api/v1/reviews/${id}/vote`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    if (response.ok) await refresh()
  }

  async function report(id: string) {
    const explanation = prompt('Briefly explain the issue (optional)') ?? ''
    const response = await fetch(`/api/v1/reviews/${id}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'incorrect', explanation }),
    })
    const data = (await response.json()) as { error?: string }
    setMessage(
      response.ok
        ? 'Review reported for moderator review.'
        : data.error === 'You already reported this review.'
          ? 'You already reported this review.'
          : 'Report could not be submitted.'
    )
  }

  return (
    <section className="mt-12 border-t border-purple-950/10 pt-10" id="reviews">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow">Community context</span>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Ratings grounded in exact offerings.
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Every review names its year, term, and optional instructor.
            Aggregates include only visible reviews under the active filters.
          </p>
        </div>
        <p className="metric">
          <strong className="block text-3xl">{aggregate.count}</strong>
          <span className="text-sm text-slate-600">contributing reviews</span>
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ratingDimensions.map((dimension) => (
          <div
            className="rounded-2xl border border-purple-950/10 bg-white/65 p-4"
            key={dimension}
          >
            <p className="text-xs font-bold text-slate-500">
              {labels[dimension]}
            </p>
            <p className="mt-1 text-2xl font-black">
              {aggregate.averages[dimension]?.toFixed(1) ?? '—'}
            </p>
            <p className="text-xs text-slate-500">out of 5</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <label>
          <span className="field-label">Academic year</span>
          <select
            className="field mt-2"
            onChange={(event) => setYearFilter(event.target.value)}
            value={yearFilter}
          >
            <option value="">All years</option>
            {[...new Set(offerings.map((value) => value.academicYear))].map(
              (year) => (
                <option key={year}>{year}</option>
              )
            )}
          </select>
        </label>
        <label>
          <span className="field-label">Term</span>
          <select
            className="field mt-2"
            onChange={(event) => setTermFilter(event.target.value)}
            value={termFilter}
          >
            <option value="">All terms</option>
            {[...new Set(offerings.map((value) => value.termKey))].map(
              (term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              )
            )}
          </select>
        </label>
        <label>
          <span className="field-label">Instructor</span>
          <select
            className="field mt-2"
            onChange={(event) => setInstructorFilter(event.target.value)}
            value={instructorFilter}
          >
            <option value="">All instructors</option>
            {allInstructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.display}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        className="button-secondary mt-3"
        onClick={() => void refresh()}
        type="button"
      >
        Apply review filters
      </button>

      <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div id="review-composer">
          {signedIn ? (
            <form
              className="panel sticky top-24 p-5"
              onSubmit={(event) => void submit(event)}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-black">
                  {editingId ? 'Edit your review' : 'Share structured context'}
                </h3>
                {editingId ? (
                  <button
                    className="text-sm font-bold text-slate-600"
                    onClick={() => setEditingId('')}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              <label className="mt-4 block">
                <span className="field-label">Offering</span>
                <select
                  className="field mt-2"
                  onChange={(event) => {
                    setOfferingId(event.target.value)
                    setInstructorId('')
                  }}
                  required
                  value={offeringId}
                >
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.academicYear} · {offering.termName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block">
                <span className="field-label">Instructor (optional)</span>
                <select
                  className="field mt-2"
                  onChange={(event) => setInstructorId(event.target.value)}
                  value={instructorId}
                >
                  <option value="">Course-level review</option>
                  {selectedOffering?.instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.display}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ratingDimensions.map((dimension) => (
                  <label key={dimension}>
                    <span className="field-label">{labels[dimension]}</span>
                    <select
                      className="field mt-2"
                      onChange={(event) =>
                        setRatings((current) => ({
                          ...current,
                          [dimension]: Number(event.target.value),
                        }))
                      }
                      value={ratings[dimension]}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="field-label">Recommend?</span>
                  <select
                    className="field mt-2"
                    onChange={(event) => setRecommendation(event.target.value)}
                    value={recommendation}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unknown">Not sure</option>
                  </select>
                </label>
                <label>
                  <span className="field-label">Attendance</span>
                  <select
                    className="field mt-2"
                    onChange={(event) =>
                      setAttendanceRequirement(event.target.value)
                    }
                    value={attendanceRequirement}
                  >
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
              </div>
              <label className="mt-4 block">
                <span className="field-label">Assessment summary</span>
                <textarea
                  className="field mt-2 min-h-20"
                  maxLength={1000}
                  onChange={(event) => setAssessmentSummary(event.target.value)}
                  value={assessmentSummary}
                />
              </label>
              <label className="mt-4 block">
                <span className="field-label">Written review</span>
                <textarea
                  className="field mt-2 min-h-32"
                  maxLength={4000}
                  minLength={20}
                  onChange={(event) => setBody(event.target.value)}
                  required
                  value={body}
                />
              </label>
              <label className="mt-4 flex items-start gap-3 text-sm">
                <input
                  checked={isAnonymous}
                  className="mt-1"
                  onChange={(event) => setIsAnonymous(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  Display publicly as anonymous. CUWeave still keeps authorship
                  privately for editing and moderation.
                </span>
              </label>
              <button className="button-primary mt-5 w-full" type="submit">
                {editingId ? 'Save review changes' : 'Publish review'}
              </button>
            </form>
          ) : (
            <div className="panel p-6">
              <h3 className="text-xl font-black">Add your perspective</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sign in to submit one structured review for an offering and
                instructor scope.
              </p>
              <Link className="button-primary mt-5" href="/sign-in">
                Sign in to review
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {message ? (
            <p
              className="rounded-xl bg-purple-50 p-3 text-sm text-purple-950"
              role="status"
            >
              {message}
            </p>
          ) : null}
          {reviews.map((review) => (
            <article className="panel p-5" key={review.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">{review.authorLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {review.academicYear} · {review.termName}
                    {review.instructorDisplay
                      ? ` · ${review.instructorDisplay}`
                      : ' · course-level'}
                  </p>
                </div>
                <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-black text-purple-900">
                  {review.ratings.overall}/5 overall
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
                {review.body}
              </p>
              {review.assessmentSummary ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                  <strong>Assessment:</strong> {review.assessmentSummary}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                {ratingDimensions
                  .filter((dimension) => dimension !== 'overall')
                  .map((dimension) => (
                    <span
                      className="rounded-full border px-2 py-1"
                      key={dimension}
                    >
                      {labels[dimension]} {review.ratings[dimension]}
                    </span>
                  ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {signedIn ? (
                  <>
                    <button
                      className="button-secondary"
                      onClick={() => void vote(review.id, 'helpful')}
                      type="button"
                    >
                      Helpful · {review.helpful}
                    </button>
                    <button
                      className="button-secondary"
                      onClick={() => void vote(review.id, 'not_helpful')}
                      type="button"
                    >
                      Not helpful · {review.notHelpful}
                    </button>
                    <button
                      className="button-secondary"
                      onClick={() => void report(review.id)}
                      type="button"
                    >
                      Report
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">
                    {review.helpful} helpful votes
                  </span>
                )}
                {review.ownedByViewer ? (
                  <>
                    <button
                      className="button-secondary"
                      onClick={() => edit(review)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button-danger"
                      onClick={() => void remove(review.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
          {!reviews.length ? (
            <div className="rounded-3xl border border-dashed border-purple-950/20 p-10 text-center">
              <h3 className="text-xl font-black">
                No reviews under these filters.
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Be the first to add offering-specific context.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

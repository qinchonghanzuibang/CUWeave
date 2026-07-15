'use client'

import type { CourseSection } from '@cuweave/db'
import {
  findConflicts,
  parseSchedule,
  parseTeachingDates,
  sectionCompatibility,
  serializeSchedule,
  STORAGE_KEY,
  type PlannerSection,
} from '@cuweave/planner'
import Link from 'next/link'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

type LoadedSection = CourseSection & { courseCode: string }

const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function toMinutes(value: string | null): number | null {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes)
    ? (hours ?? 0) * 60 + (minutes ?? 0)
    : null
}

function asPlannerSection(section: LoadedSection): PlannerSection {
  return {
    id: section.id,
    courseCode: section.courseCode,
    label: section.label,
    termKey: section.termKey,
    meetings: section.meetings.map((meeting) => ({
      id: meeting.id,
      weekday: meeting.weekday,
      startMinutes: toMinutes(meeting.startTime),
      endMinutes: toMinutes(meeting.endTime),
      teachingDates: parseTeachingDates(meeting.teachingDatesRaw),
      rawTime: meeting.timeRaw,
    })),
  }
}

export function PlannerClient() {
  const [sections, setSections] = useState<LoadedSection[]>([])
  const [unavailable, setUnavailable] = useState(false)
  const stored = useSyncExternalStore(
    (notify) => {
      window.addEventListener('storage', notify)
      window.addEventListener('cuweave:planner-changed', notify)
      return () => {
        window.removeEventListener('storage', notify)
        window.removeEventListener('cuweave:planner-changed', notify)
      }
    },
    () => window.localStorage.getItem(STORAGE_KEY) ?? '',
    () => ''
  )
  const sectionIds = useMemo(() => parseSchedule(stored).sectionIds, [stored])

  useEffect(() => {
    if (sectionIds.length === 0) {
      return
    }
    const query = sectionIds
      .map((id) => `id=${encodeURIComponent(id)}`)
      .join('&')
    void fetch(`/api/v1/planner/sections?${query}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('unavailable')
        const data = (await response.json()) as { sections: LoadedSection[] }
        setSections(data.sections)
        setUnavailable(false)
      })
      .catch(() => {
        setSections([])
        setUnavailable(true)
      })
  }, [sectionIds])

  function store(ids: string[]) {
    window.localStorage.setItem(STORAGE_KEY, serializeSchedule(ids))
    window.dispatchEvent(new Event('cuweave:planner-changed'))
  }

  const visibleSections = useMemo(
    () => (sectionIds.length === 0 ? [] : sections),
    [sectionIds.length, sections]
  )
  const plannerSections = useMemo(
    () => visibleSections.map(asPlannerSection),
    [visibleSections]
  )
  const conflicts = useMemo(
    () => findConflicts(plannerSections),
    [plannerSections]
  )
  const compatibilityWarnings = useMemo(() => {
    const warnings: string[] = []
    for (let first = 0; first < plannerSections.length; first += 1) {
      for (
        let second = first + 1;
        second < plannerSections.length;
        second += 1
      ) {
        const a = plannerSections[first]
        const b = plannerSections[second]
        if (!a || !b) continue
        const result = sectionCompatibility(a, b)
        if (result.status !== 'compatible')
          warnings.push(
            `${a.courseCode} ${a.label} + ${b.label}: ${result.status} section pairing (${result.ruleId}).`
          )
      }
    }
    return warnings.sort()
  }, [plannerSections])

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-950/15 bg-white/65 p-4">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{sectionIds.length}</strong>{' '}
          selected sections · saved locally
        </p>
        <div className="flex gap-2">
          <Link
            className="rounded-full border border-emerald-900/20 px-4 py-2 text-sm font-bold"
            href="/courses"
          >
            Add courses
          </Link>
          <button
            className="rounded-full border border-red-900/20 px-4 py-2 text-sm font-bold text-red-800"
            onClick={() => store([])}
            type="button"
          >
            Clear schedule
          </button>
        </div>
      </div>

      {unavailable && sectionIds.length > 0 ? (
        <div className="rounded-2xl border border-amber-900/20 bg-amber-50 p-5 text-amber-950">
          Selected section IDs are safe, but course details are unavailable
          while PostgreSQL is offline.
        </div>
      ) : null}
      {sectionIds.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-emerald-950/25 p-12 text-center">
          <h2 className="text-2xl font-black">Your week is open.</h2>
          <p className="mt-2 text-slate-600">
            Open a course and add a section to begin.
          </p>
        </div>
      ) : null}

      {conflicts.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2">
          {conflicts.map((conflict, index) => (
            <div
              className={`rounded-2xl border p-4 text-sm ${conflict.kind === 'confirmed' ? 'border-red-800/20 bg-red-50 text-red-950' : 'border-amber-800/20 bg-amber-50 text-amber-950'}`}
              key={`${conflict.message}-${index}`}
            >
              <strong className="capitalize">{conflict.kind} conflict</strong>
              <p className="mt-1">{conflict.message}</p>
            </div>
          ))}
        </section>
      ) : null}
      {compatibilityWarnings.length > 0 ? (
        <section className="rounded-2xl border border-sky-900/15 bg-sky-50 p-4 text-sm text-sky-950">
          <strong>Section compatibility needs review</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {compatibilityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {visibleSections.length > 0 ? (
        <div className="overflow-x-auto rounded-3xl border border-emerald-950/15 bg-white/70 p-4">
          <div className="grid min-w-[900px] grid-cols-7 gap-3">
            {weekdays.map((day, index) => (
              <section className="rounded-2xl bg-slate-50 p-3" key={day}>
                <h2 className="text-center text-sm font-black text-emerald-900">
                  {day.slice(0, 3)}
                </h2>
                <div className="mt-3 space-y-2">
                  {visibleSections.flatMap((section) =>
                    section.meetings
                      .filter((meeting) => meeting.weekday === index + 1)
                      .map((meeting) => (
                        <article
                          className="rounded-xl bg-emerald-900 p-3 text-xs text-white shadow-sm"
                          key={meeting.id}
                        >
                          <p className="font-black">{section.courseCode}</p>
                          <p className="mt-1 opacity-90">{section.label}</p>
                          <p className="mt-2 font-semibold">
                            {meeting.timeRaw}
                          </p>
                          <p className="mt-1 opacity-80">
                            {meeting.locationRaw}
                          </p>
                        </article>
                      ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {visibleSections.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2">
          {visibleSections.map((section) => (
            <article
              className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-950/15 bg-white/65 p-4"
              key={section.id}
            >
              <div>
                <p className="font-black text-emerald-900">
                  {section.courseCode}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {section.label} · {section.termName}
                </p>
                {section.meetings.some(
                  (meeting) => meeting.timeStatus === 'unknown'
                ) ? (
                  <p className="mt-2 text-xs font-bold text-amber-800">
                    Contains TBA or unscheduled meeting details
                  </p>
                ) : null}
              </div>
              <button
                className="text-sm font-bold text-red-800"
                onClick={() =>
                  store(sectionIds.filter((id) => id !== section.id))
                }
                type="button"
              >
                Remove
              </button>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  )
}

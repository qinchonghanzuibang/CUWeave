'use client'

import type { CourseSection, SavedScheduleRecord } from '@cuweave/db'
import {
  ACTIVE_TERM_STORAGE_KEY,
  deduplicatePlannerSections,
  findConflicts,
  groupSectionsByAcademicTerm,
  parseSchedule,
  parseTeachingDates,
  resolveActiveAcademicTerm,
  sectionCompatibility,
  serializeSchedule,
  STORAGE_KEY,
  wallClockMinutes,
  type PlannerSection,
} from '@cuweave/planner'
import Link from 'next/link'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

type LoadedSection = CourseSection & { courseCode: string }
const CLOUD_SCHEDULE_KEY = 'cuweave:cloud-schedule-id'

const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function asPlannerSection(section: LoadedSection): PlannerSection {
  return {
    id: section.id,
    courseCode: section.courseCode,
    label: section.label,
    academicYear: section.academicYear,
    termKey: section.termKey,
    termName: section.termName,
    meetings: section.meetings.map((meeting) => ({
      id: meeting.id,
      weekday: meeting.weekday,
      startMinutes: wallClockMinutes(meeting.startTime),
      endMinutes: wallClockMinutes(meeting.endTime),
      teachingDates: parseTeachingDates(meeting.teachingDatesRaw),
      rawTime: meeting.timeRaw,
      locationRaw: meeting.locationRaw,
    })),
  }
}

export function PlannerClient({
  signedIn,
  schedules,
}: {
  signedIn: boolean
  schedules: SavedScheduleRecord[]
}) {
  const [sections, setSections] = useState<LoadedSection[]>([])
  const [unavailable, setUnavailable] = useState(false)
  const [cloudMessage, setCloudMessage] = useState('')
  const [cloudSchedules, setCloudSchedules] = useState(schedules)
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
  const selectedCloudId = useSyncExternalStore(
    (notify) => {
      window.addEventListener('storage', notify)
      window.addEventListener('cuweave:cloud-schedule-changed', notify)
      return () => {
        window.removeEventListener('storage', notify)
        window.removeEventListener('cuweave:cloud-schedule-changed', notify)
      }
    },
    () => window.localStorage.getItem(CLOUD_SCHEDULE_KEY) ?? '',
    () => ''
  )
  const sectionIds = useMemo(() => parseSchedule(stored).sectionIds, [stored])
  const storedActiveTerm = useSyncExternalStore(
    (notify) => {
      window.addEventListener('storage', notify)
      window.addEventListener('cuweave:planner-term-changed', notify)
      return () => {
        window.removeEventListener('storage', notify)
        window.removeEventListener('cuweave:planner-term-changed', notify)
      }
    },
    () => window.localStorage.getItem(ACTIVE_TERM_STORAGE_KEY) ?? '',
    () => ''
  )
  const selectedCloudSchedule = cloudSchedules.find(
    (schedule) => schedule.id === selectedCloudId
  )

  useEffect(() => {
    if (sectionIds.length === 0) return
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

  function selectAcademicTerm(id: string) {
    window.localStorage.setItem(ACTIVE_TERM_STORAGE_KEY, id)
    window.dispatchEvent(new Event('cuweave:planner-term-changed'))
  }

  function selectCloudSchedule(id: string) {
    if (id) localStorage.setItem(CLOUD_SCHEDULE_KEY, id)
    else localStorage.removeItem(CLOUD_SCHEDULE_KEY)
    window.dispatchEvent(new Event('cuweave:cloud-schedule-changed'))
  }

  async function saveCloudCopy() {
    const response = await fetch('/api/v1/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Planner ${new Date().toLocaleDateString('en-HK')}`,
        sectionIds,
      }),
    })
    const data = (await response.json().catch(() => ({}))) as {
      error?: string
      schedule?: SavedScheduleRecord
    }
    if (response.ok && data.schedule) {
      const saved = data.schedule
      setCloudSchedules((current) => [saved, ...current])
      selectCloudSchedule(saved.id)
    }
    setCloudMessage(
      response.ok
        ? 'Saved as a new cloud schedule. Open Schedules to rename or share it.'
        : (data.error ?? 'Cloud save failed.')
    )
  }

  async function updateCloudSchedule() {
    const selected = selectedCloudSchedule
    if (!selected) {
      await saveCloudCopy()
      return
    }
    const response = await fetch(`/api/v1/schedules/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: selected.version, sectionIds }),
    })
    const data = (await response.json().catch(() => ({}))) as {
      error?: string
      schedule?: SavedScheduleRecord
    }
    if (response.ok && data.schedule) {
      const updated = data.schedule
      setCloudSchedules((current) =>
        current.map((schedule) =>
          schedule.id === updated.id ? updated : schedule
        )
      )
    }
    setCloudMessage(
      response.ok
        ? `Updated ${selected.name} with optimistic conflict protection.`
        : (data.error ?? 'Cloud update failed.')
    )
  }

  const selectedSections = useMemo(() => {
    const selected = new Set(sectionIds)
    return sections.filter((section) => selected.has(section.id))
  }, [sectionIds, sections])
  const plannerSections = useMemo(
    () => deduplicatePlannerSections(selectedSections.map(asPlannerSection)),
    [selectedSections]
  )
  const termGroups = useMemo(
    () => groupSectionsByAcademicTerm(plannerSections),
    [plannerSections]
  )
  const activeTerm = resolveActiveAcademicTerm(
    storedActiveTerm || null,
    termGroups
  )
  const activeGroup = termGroups.find((group) => group.id === activeTerm)
  const visibleSections = useMemo(
    () => activeGroup?.sections ?? [],
    [activeGroup]
  )

  const conflicts = useMemo(
    () => findConflicts(visibleSections),
    [visibleSections]
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-950/15 bg-white/65 p-4">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{sectionIds.length}</strong>{' '}
          selected sections ·{' '}
          <strong className="text-slate-900">{visibleSections.length}</strong>{' '}
          visible in {activeGroup?.label ?? 'the active term'} · saved locally{' '}
          {signedIn ? `· ${cloudSchedules.length} cloud schedules` : ''}
        </p>
        <div className="flex gap-2">
          <Link
            className="rounded-full border border-purple-900/20 px-4 py-2 text-sm font-bold"
            href="/courses"
          >
            Add courses
          </Link>
          {signedIn ? (
            <>
              {cloudSchedules.length ? (
                <select
                  aria-label="Cloud schedule target"
                  className="field !w-auto !py-2"
                  onChange={(event) => selectCloudSchedule(event.target.value)}
                  value={selectedCloudSchedule?.id ?? ''}
                >
                  <option value="">New cloud copy</option>
                  {cloudSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                className="button-primary"
                onClick={() => void updateCloudSchedule()}
                type="button"
              >
                {selectedCloudSchedule
                  ? 'Update cloud schedule'
                  : 'Save cloud copy'}
              </button>
            </>
          ) : (
            <Link className="button-primary" href="/sign-in">
              Sign in to sync
            </Link>
          )}
          <button
            className="rounded-full border border-red-900/20 px-4 py-2 text-sm font-bold text-red-800"
            onClick={() => store([])}
            type="button"
          >
            Clear schedule
          </button>
        </div>
      </div>

      {cloudMessage ? (
        <p
          className="rounded-xl bg-purple-50 p-3 text-sm text-purple-950"
          role="status"
        >
          {cloudMessage}
        </p>
      ) : null}

      {unavailable && sectionIds.length > 0 ? (
        <div className="rounded-2xl border border-amber-900/20 bg-amber-50 p-5 text-amber-950">
          Selected section IDs are safe, but course details are unavailable
          while PostgreSQL is offline.
        </div>
      ) : null}
      {sectionIds.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-purple-950/25 p-12 text-center">
          <h2 className="text-2xl font-black">Your week is open.</h2>
          <p className="mt-2 text-slate-600">
            Open a course and add a section to begin.
          </p>
        </div>
      ) : null}

      {termGroups.length > 0 ? (
        <section aria-label="Academic term" className="space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist">
            {termGroups.map((group) => (
              <button
                aria-selected={group.id === activeTerm}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${group.id === activeTerm ? 'border-purple-900 bg-purple-900 text-white' : 'border-purple-900/20 bg-white text-purple-900'}`}
                key={group.id}
                onClick={() => selectAcademicTerm(group.id)}
                role="tab"
                type="button"
              >
                {group.label} · {group.sections.length}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            Showing only <strong>{activeGroup?.label}</strong> meetings in this
            weekly timetable.
          </p>
        </section>
      ) : null}

      {conflicts.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2">
          {conflicts.map((conflict) => (
            <div
              className={`rounded-2xl border p-4 text-sm ${conflict.kind === 'confirmed' ? 'border-red-800/20 bg-red-50 text-red-950' : 'border-amber-800/20 bg-amber-50 text-amber-950'}`}
              key={`${conflict.firstSectionId}:${conflict.secondSectionId}:${conflict.kind}:${conflict.message}`}
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
        <div
          aria-label={`${activeGroup?.label ?? 'Active term'} weekly timetable`}
          className="overflow-x-auto rounded-3xl border border-purple-950/15 bg-white/70 p-4"
        >
          <div className="grid min-w-[900px] grid-cols-7 gap-3">
            {weekdays.map((day, index) => (
              <section className="rounded-2xl bg-slate-50 p-3" key={day}>
                <h2 className="text-center text-sm font-black text-purple-900">
                  {day.slice(0, 3)}
                </h2>
                <div className="mt-3 space-y-2">
                  {visibleSections.flatMap((section) =>
                    section.meetings
                      .filter((meeting) => meeting.weekday === index + 1)
                      .map((meeting) => (
                        <article
                          className="rounded-xl bg-purple-900 p-3 text-xs text-white shadow-sm"
                          key={meeting.id}
                        >
                          <p className="font-black">{section.courseCode}</p>
                          <p className="mt-1 opacity-90">{section.label}</p>
                          <p className="mt-2 font-semibold">
                            {meeting.rawTime}
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
              className="flex items-start justify-between gap-4 rounded-2xl border border-purple-950/15 bg-white/65 p-4"
              key={section.id}
            >
              <div>
                <p className="font-black text-purple-900">
                  {section.courseCode}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {section.label} · {section.termName}
                </p>
                {section.meetings.some(
                  (meeting) =>
                    meeting.startMinutes === null || meeting.endMinutes === null
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

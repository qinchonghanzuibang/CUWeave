'use client'

import {
  formatTeachingDates,
  layoutOverlappingMeetings,
  meetingVerticalLayout,
  TIMETABLE_END_MINUTES,
  TIMETABLE_HEIGHT_PX,
  TIMETABLE_HOUR_HEIGHT_PX,
  TIMETABLE_INTERVAL_MINUTES,
  TIMETABLE_START_MINUTES,
  type PlannerMeeting,
  type PlannerSection,
} from '@cuweave/planner'
import Link from 'next/link'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const hourMarks = Array.from(
  {
    length: (TIMETABLE_END_MINUTES - TIMETABLE_START_MINUTES) / 60 + 1,
  },
  (_, index) => TIMETABLE_START_MINUTES + index * 60
)

const gridMarks = Array.from(
  {
    length:
      (TIMETABLE_END_MINUTES - TIMETABLE_START_MINUTES) /
        TIMETABLE_INTERVAL_MINUTES +
      1,
  },
  (_, index) => TIMETABLE_START_MINUTES + index * TIMETABLE_INTERVAL_MINUTES
)

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const minute = minutes % 60
  const hour = hours % 12 || 12
  return `${hour}:${minute.toString().padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

function positionForMinutes(minutes: number): number {
  return ((minutes - TIMETABLE_START_MINUTES) / 60) * TIMETABLE_HOUR_HEIGHT_PX
}

interface CalendarMeeting {
  id: string
  meeting: PlannerMeeting
  section: PlannerSection
  startMinutes: number
  endMinutes: number
}

interface OpenMeeting extends CalendarMeeting {
  anchor: { left: number; top: number } | null
}

function MeetingDetails({
  meeting,
  onClose,
  onRemove,
}: {
  meeting: OpenMeeting
  onClose: () => void
  onRemove: (sectionId: string) => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const dialogId = `meeting-detail-${meeting.section.id}-${meeting.id}`
  const titleId = `${dialogId}-title`
  const component = /-([A-Z]{2,5})\b/.exec(meeting.section.label)?.[1]
  const classNumber = /\(([^)]+)\)\s*$/.exec(meeting.section.label)?.[1]
  const warnings = [
    meeting.meeting.teachingDates.kind === 'unknown'
      ? 'Teaching dates are unknown; calendar export omits this meeting.'
      : null,
    !meeting.meeting.locationRaw.trim() ||
    /^(tba|unknown|n\/a)$/i.test(meeting.meeting.locationRaw.trim())
      ? 'Venue is not confirmed.'
      : null,
  ].filter(Boolean)

  useEffect(() => {
    dialogRef.current
      ?.querySelector<HTMLElement>('[data-dialog-initial-focus]')
      ?.focus()
  }, [])

  function onDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      ) ?? []),
    ]
    if (focusable.length === 0) return
    const first = focusable[0]!
    const last = focusable.at(-1)!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/25 sm:bg-transparent"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="fixed right-0 bottom-0 left-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:right-auto sm:bottom-auto sm:left-auto sm:w-[23rem] sm:rounded-xl"
        onKeyDown={onDialogKeyDown}
        ref={dialogRef}
        role="dialog"
        id={dialogId}
        style={
          meeting.anchor
            ? { left: meeting.anchor.left, top: meeting.anchor.top }
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              {meeting.section.courseCode}
            </p>
            <h2 className="mt-1 font-display text-2xl font-medium" id={titleId}>
              {meeting.section.courseTitle}
            </h2>
          </div>
          <button
            aria-label="Close meeting details"
            className="mobile-menu-trigger inline-flex !min-h-11 !min-w-11 !p-2"
            data-dialog-initial-focus
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-[var(--text-muted)]">Term</dt>
          <dd>
            {meeting.section.academicYear} · {meeting.section.termName}
          </dd>
          <dt className="text-[var(--text-muted)]">Activity</dt>
          <dd>{component ?? 'Not specified'}</dd>
          <dt className="text-[var(--text-muted)]">Section</dt>
          <dd>{meeting.section.label}</dd>
          <dt className="text-[var(--text-muted)]">Class number</dt>
          <dd>{classNumber ?? 'Not provided'}</dd>
          <dt className="text-[var(--text-muted)]">When</dt>
          <dd>
            {weekdays[meeting.meeting.weekday! - 1]} ·{' '}
            {formatTime(meeting.startMinutes)}–{formatTime(meeting.endMinutes)}
          </dd>
          <dt className="text-[var(--text-muted)]">Venue</dt>
          <dd>{meeting.meeting.locationRaw || 'Not provided'}</dd>
          <dt className="text-[var(--text-muted)]">Instructor</dt>
          <dd>{meeting.meeting.instructorDisplayRaw || 'Not provided'}</dd>
          <dt className="text-[var(--text-muted)]">Teaching dates</dt>
          <dd>{formatTeachingDates(meeting.meeting.teachingDates)}</dd>
        </dl>

        {warnings.length ? (
          <div className="status-banner status-warning mt-5">
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
          Source: {meeting.section.sourceName} · revision{' '}
          {meeting.section.sourceRevision}
          {meeting.section.importedAt
            ? ` · imported ${new Date(meeting.section.importedAt).toLocaleString('en-HK')}`
            : ''}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            className="button-primary"
            href={`/courses/${meeting.section.courseCode}`}
          >
            View course
          </Link>
          <button
            className="button-danger"
            onClick={() => {
              onRemove(meeting.section.id)
              onClose()
            }}
            type="button"
          >
            Remove from planner
          </button>
        </div>
      </div>
    </div>
  )
}

export function WeeklyTimetable({
  label,
  onRemove,
  sections,
}: {
  label: string
  onRemove: (sectionId: string) => void
  sections: PlannerSection[]
}) {
  const [openMeeting, setOpenMeeting] = useState<OpenMeeting | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const meetingsByDay = weekdays.map((_, dayIndex) => {
    const meetings: CalendarMeeting[] = sections.flatMap((section) =>
      section.meetings.flatMap((meeting) => {
        if (
          meeting.weekday !== dayIndex + 1 ||
          meeting.startMinutes === null ||
          meeting.endMinutes === null ||
          meeting.endMinutes <= TIMETABLE_START_MINUTES ||
          meeting.startMinutes >= TIMETABLE_END_MINUTES
        )
          return []
        return [
          {
            id: meeting.id,
            meeting,
            section,
            startMinutes: meeting.startMinutes,
            endMinutes: meeting.endMinutes,
          },
        ]
      })
    )
    const layoutById = new Map(
      layoutOverlappingMeetings(meetings).map((layout) => [layout.id, layout])
    )
    return meetings.map((meeting) => ({
      ...meeting,
      overlap: layoutById.get(meeting.id)!,
    }))
  })

  function closeDetails() {
    setOpenMeeting(null)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <>
      <section
        aria-label={`${label} weekly timetable`}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        id="weekly-timetable-panel"
        role="tabpanel"
      >
        <div
          className="block w-full overflow-x-auto overscroll-x-contain"
          data-testid="timetable-horizontal-scroll"
          style={{ height: 'auto', maxHeight: 'none' }}
        >
          <div className="min-w-[1084px]">
            <div
              className="sticky top-0 z-30 grid h-10 items-center border-b border-[var(--border)] bg-[var(--surface)]"
              style={{
                gridTemplateColumns: '4.75rem repeat(7, minmax(9rem, 1fr))',
              }}
            >
              <div
                aria-hidden="true"
                className="sticky left-0 z-40 border-r border-[var(--border)] bg-[var(--surface-raised)]"
              />
              {weekdays.map((day) => (
                <div
                  className="flex h-full items-center justify-center border-r border-[var(--border-subtle)] px-2 text-center text-[0.68rem] leading-none font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] last:border-r-0"
                  key={day}
                >
                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{day}</span>
                </div>
              ))}
            </div>

            <div
              className="relative"
              style={{ height: `${TIMETABLE_HEIGHT_PX + 1}px` }}
            >
              <div aria-hidden="true" className="absolute inset-0 z-0">
                {gridMarks.map((minutes) => {
                  const isHour = minutes % 60 === 0
                  return (
                    <div
                      className={`absolute right-0 left-0 border-t ${isHour ? 'border-slate-900/12' : 'border-slate-900/5'}`}
                      key={minutes}
                      style={{ top: `${positionForMinutes(minutes)}px` }}
                    />
                  )
                })}
              </div>

              <div
                className="relative z-10 grid h-full"
                style={{
                  gridTemplateColumns: '4.75rem repeat(7, minmax(9rem, 1fr))',
                }}
              >
                <aside className="sticky left-0 z-20 border-r border-[var(--border)] bg-[var(--surface)] shadow-[3px_0_7px_rgb(36_33_31/0.035)]">
                  {hourMarks.map((minutes, index) => (
                    <span
                      className="absolute right-2 text-[0.65rem] leading-none font-medium whitespace-nowrap text-[var(--text-muted)]"
                      key={minutes}
                      style={{
                        top: `${positionForMinutes(minutes)}px`,
                        transform:
                          index === 0
                            ? 'translateY(0.35rem)'
                            : index === hourMarks.length - 1
                              ? 'translateY(-100%)'
                              : 'translateY(-50%)',
                      }}
                    >
                      {formatTime(minutes)}
                    </span>
                  ))}
                </aside>

                {weekdays.map((day, dayIndex) => (
                  <div
                    aria-label={day}
                    className="relative min-w-0 border-r border-[var(--border-subtle)] last:border-r-0"
                    key={day}
                  >
                    {meetingsByDay[dayIndex]?.map((meeting) => {
                      const vertical = meetingVerticalLayout(
                        meeting.startMinutes,
                        meeting.endMinutes
                      )
                      if (!vertical) return null
                      const showLabel = vertical.heightPx >= 64
                      const showLocation = vertical.heightPx >= 88
                      const timeRange = `${formatTime(meeting.startMinutes)}–${formatTime(meeting.endMinutes)}`
                      const accessibleLabel = `${meeting.section.courseCode}, ${meeting.section.label}, ${timeRange}, ${meeting.meeting.locationRaw}`

                      return (
                        <button
                          aria-controls={`meeting-detail-${meeting.section.id}-${meeting.id}`}
                          aria-expanded={openMeeting?.id === meeting.id}
                          aria-haspopup="dialog"
                          aria-label={accessibleLabel}
                          className="absolute overflow-hidden rounded-md border border-white/15 bg-[var(--accent)] px-2 py-1.5 text-left text-white shadow-[0_1px_3px_rgb(36_33_31/0.18)] outline-none transition-[filter,box-shadow] hover:brightness-105 focus-visible:brightness-105 focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
                          data-end-minutes={meeting.endMinutes}
                          data-layout-column={meeting.overlap.column}
                          data-layout-columns={meeting.overlap.columnCount}
                          data-start-minutes={meeting.startMinutes}
                          key={`${meeting.section.id}:${meeting.id}`}
                          onClick={(event) => {
                            triggerRef.current = event.currentTarget
                            const rect =
                              event.currentTarget.getBoundingClientRect()
                            const narrow = window.innerWidth < 640
                            setOpenMeeting({
                              ...meeting,
                              anchor: narrow
                                ? null
                                : {
                                    left: Math.max(
                                      16,
                                      Math.min(
                                        rect.left,
                                        window.innerWidth - 384
                                      )
                                    ),
                                    top: Math.max(
                                      16,
                                      Math.min(
                                        rect.bottom + 8,
                                        window.innerHeight - 560
                                      )
                                    ),
                                  },
                            })
                          }}
                          style={{
                            top: `${vertical.topPx}px`,
                            height: `${vertical.heightPx}px`,
                            left: `calc(${meeting.overlap.leftPercent}% + 3px)`,
                            width: `calc(${meeting.overlap.widthPercent}% - 6px)`,
                            zIndex: meeting.overlap.column + 1,
                          }}
                          title={accessibleLabel}
                          type="button"
                        >
                          <span className="block truncate text-[0.7rem] leading-4 font-semibold tracking-[0.01em]">
                            {meeting.section.courseCode}
                          </span>
                          <span className="block truncate text-[0.63rem] leading-3.5 font-medium text-white/95">
                            {timeRange}
                          </span>
                          {showLabel ? (
                            <span className="mt-0.5 block truncate text-[0.62rem] leading-3.5 text-white/85">
                              {meeting.section.label}
                            </span>
                          ) : null}
                          {showLocation ? (
                            <span className="mt-0.5 line-clamp-2 block text-[0.6rem] leading-3.5 text-white/78">
                              {meeting.meeting.locationRaw}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {openMeeting ? (
        <MeetingDetails
          meeting={openMeeting}
          onClose={closeDetails}
          onRemove={onRemove}
        />
      ) : null}
    </>
  )
}

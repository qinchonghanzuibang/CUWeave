import {
  layoutOverlappingMeetings,
  meetingVerticalLayout,
  TIMETABLE_END_MINUTES,
  TIMETABLE_HEIGHT_PX,
  TIMETABLE_HOUR_HEIGHT_PX,
  TIMETABLE_INTERVAL_MINUTES,
  TIMETABLE_START_MINUTES,
  type PlannerSection,
} from '@cuweave/planner'

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
  section: PlannerSection
  startMinutes: number
  endMinutes: number
  rawTime: string
  locationRaw: string
}

export function WeeklyTimetable({
  label,
  sections,
}: {
  label: string
  sections: PlannerSection[]
}) {
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
            section,
            startMinutes: meeting.startMinutes,
            endMinutes: meeting.endMinutes,
            rawTime: meeting.rawTime,
            locationRaw: meeting.locationRaw,
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

  return (
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
            // Include the final 23:00 border in the natural flow height.
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
                    const accessibleLabel = `${meeting.section.courseCode}, ${meeting.section.label}, ${timeRange}, ${meeting.locationRaw}`

                    return (
                      <article
                        aria-label={accessibleLabel}
                        className="absolute overflow-hidden rounded-md border border-white/15 bg-[var(--accent)] px-2 py-1.5 text-left text-white shadow-[0_1px_3px_rgb(36_33_31/0.18)] outline-none transition-[filter,box-shadow] hover:brightness-105 focus-visible:brightness-105 focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]"
                        data-end-minutes={meeting.endMinutes}
                        data-layout-column={meeting.overlap.column}
                        data-layout-columns={meeting.overlap.columnCount}
                        data-start-minutes={meeting.startMinutes}
                        key={meeting.id}
                        style={{
                          top: `${vertical.topPx}px`,
                          height: `${vertical.heightPx}px`,
                          left: `calc(${meeting.overlap.leftPercent}% + 3px)`,
                          width: `calc(${meeting.overlap.widthPercent}% - 6px)`,
                          zIndex: meeting.overlap.column + 1,
                        }}
                        tabIndex={0}
                        title={accessibleLabel}
                      >
                        <p className="truncate text-[0.7rem] leading-4 font-semibold tracking-[0.01em]">
                          {meeting.section.courseCode}
                        </p>
                        <p className="truncate text-[0.63rem] leading-3.5 font-medium text-white/95">
                          {timeRange}
                        </p>
                        {showLabel ? (
                          <p className="mt-0.5 truncate text-[0.62rem] leading-3.5 text-white/85">
                            {meeting.section.label}
                          </p>
                        ) : null}
                        {showLocation ? (
                          <p className="mt-0.5 line-clamp-2 text-[0.6rem] leading-3.5 text-white/78">
                            {meeting.locationRaw}
                          </p>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

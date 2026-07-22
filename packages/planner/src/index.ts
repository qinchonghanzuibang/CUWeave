export interface TeachingDateRange {
  start: string
  end: string
}

export type TeachingDates =
  | { kind: 'known'; dates: string[]; ranges: TeachingDateRange[] }
  | { kind: 'unknown'; raw: string }

export interface PlannerMeeting {
  id: string
  weekday: number | null
  startMinutes: number | null
  endMinutes: number | null
  teachingDates: TeachingDates
  rawTime: string
  locationRaw: string
  instructorDisplayRaw: string
}

export interface PlannerSection {
  id: string
  courseCode: string
  label: string
  academicYear: string
  termKey: string
  termName: string
  courseTitle: string
  sourceName: string
  sourceRevision: string
  importedAt: string
  meetings: PlannerMeeting[]
}

export interface AcademicTermGroup {
  id: string
  label: string
  sections: PlannerSection[]
}

export interface ConflictResult {
  kind: 'confirmed' | 'uncertain'
  firstSectionId: string
  secondSectionId: string
  message: string
}

export type CompatibilityResult =
  | { status: 'compatible'; ruleId: string }
  | { status: 'incompatible'; ruleId: string }
  | { status: 'unknown'; ruleId: string }

export interface StoredScheduleV1 {
  version: 1
  sectionIds: string[]
}

export interface TimetableMeetingInput {
  id: string
  startMinutes: number
  endMinutes: number
}

export interface TimetableMeetingLayout extends TimetableMeetingInput {
  column: number
  columnCount: number
  leftPercent: number
  widthPercent: number
}

export interface TimetableVerticalLayout {
  topPx: number
  heightPx: number
}

export const STORAGE_KEY = 'cuweave.planner.v1'
export const ACTIVE_TERM_STORAGE_KEY = 'cuweave.planner.active-term.v1'
export const TIMETABLE_START_MINUTES = 8 * 60
export const TIMETABLE_END_MINUTES = 23 * 60
export const TIMETABLE_INTERVAL_MINUTES = 30
export const TIMETABLE_HOUR_HEIGHT_PX = 52
export const TIMETABLE_MIN_MEETING_HEIGHT_PX = 28
export const TIMETABLE_HEIGHT_PX =
  ((TIMETABLE_END_MINUTES - TIMETABLE_START_MINUTES) / 60) *
  TIMETABLE_HOUR_HEIGHT_PX

export function minutesSinceTimetableStart(minutes: number): number {
  return minutes - TIMETABLE_START_MINUTES
}

export function minutesToTimetableOffset(minutes: number): number {
  return (minutesSinceTimetableStart(minutes) / 60) * TIMETABLE_HOUR_HEIGHT_PX
}

export function meetingVerticalLayout(
  startMinutes: number,
  endMinutes: number
): TimetableVerticalLayout | null {
  if (
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(endMinutes) ||
    endMinutes <= startMinutes ||
    endMinutes <= TIMETABLE_START_MINUTES ||
    startMinutes >= TIMETABLE_END_MINUTES
  )
    return null

  const visibleStart = Math.max(startMinutes, TIMETABLE_START_MINUTES)
  const visibleEnd = Math.min(endMinutes, TIMETABLE_END_MINUTES)
  const topPx = minutesToTimetableOffset(visibleStart)
  const actualHeightPx = minutesToTimetableOffset(visibleEnd) - topPx
  const availableHeightPx = TIMETABLE_HEIGHT_PX - topPx

  return {
    topPx,
    heightPx: Math.min(
      Math.max(actualHeightPx, TIMETABLE_MIN_MEETING_HEIGHT_PX),
      availableHeightPx
    ),
  }
}

export function layoutOverlappingMeetings(
  meetings: TimetableMeetingInput[]
): TimetableMeetingLayout[] {
  const sorted = [...meetings].sort(
    (first, second) =>
      first.startMinutes - second.startMinutes ||
      first.endMinutes - second.endMinutes ||
      first.id.localeCompare(second.id)
  )
  const groups: TimetableMeetingInput[][] = []
  let groupEnd = Number.NEGATIVE_INFINITY

  for (const meeting of sorted) {
    if (groups.length === 0 || meeting.startMinutes >= groupEnd) {
      groups.push([meeting])
      groupEnd = meeting.endMinutes
    } else {
      groups.at(-1)!.push(meeting)
      groupEnd = Math.max(groupEnd, meeting.endMinutes)
    }
  }

  return groups.flatMap((group) => {
    const columnEnds: number[] = []
    const assignments = group.map((meeting) => {
      let column = columnEnds.findIndex(
        (endMinutes) => endMinutes <= meeting.startMinutes
      )
      if (column === -1) column = columnEnds.length
      columnEnds[column] = meeting.endMinutes
      return { meeting, column }
    })
    const columnCount = columnEnds.length

    return assignments.map(({ meeting, column }) => ({
      ...meeting,
      column,
      columnCount,
      leftPercent: (column / columnCount) * 100,
      widthPercent: 100 / columnCount,
    }))
  })
}

export function wallClockMinutes(value: string | null): number | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function academicTermIdentity(
  section: Pick<PlannerSection, 'academicYear' | 'termKey'>
): string {
  return `${section.academicYear}:${section.termKey}`
}

export function academicTermLabel(
  section: Pick<PlannerSection, 'academicYear' | 'termName'>
): string {
  const term = section.termName
    .replace(new RegExp(`^${section.academicYear}\\s*`, 'i'), '')
    .trim()
  return `${section.academicYear} ${term || section.termName}`
}

export function weeklyMeetingDisplayIdentity(meeting: PlannerMeeting): string {
  const time =
    meeting.weekday !== null &&
    meeting.startMinutes !== null &&
    meeting.endMinutes !== null
      ? `${meeting.weekday}:${meeting.startMinutes}:${meeting.endMinutes}`
      : `raw:${meeting.rawTime.trim().toLocaleLowerCase('en')}`
  return `${time}:${meeting.locationRaw.trim().toLocaleLowerCase('en')}`
}

export function deduplicatePlannerSections(
  sections: PlannerSection[]
): PlannerSection[] {
  const sectionMap = new Map<string, PlannerSection>()
  const meetingKeys = new Map<string, Map<string, number>>()
  for (const section of sections) {
    let normalized = sectionMap.get(section.id)
    if (!normalized) {
      normalized = { ...section, meetings: [] }
      sectionMap.set(section.id, normalized)
      meetingKeys.set(section.id, new Map())
    }
    const seen = meetingKeys.get(section.id)!
    for (const meeting of section.meetings) {
      const key = weeklyMeetingDisplayIdentity(meeting)
      const existingIndex = seen.get(key)
      if (existingIndex !== undefined) {
        const existing = normalized.meetings[existingIndex]!
        existing.teachingDates = mergeTeachingDates(
          existing.teachingDates,
          meeting.teachingDates
        )
        continue
      }
      seen.set(key, normalized.meetings.length)
      normalized.meetings.push({ ...meeting })
    }
  }
  return [...sectionMap.values()].sort((first, second) =>
    `${first.courseCode}:${first.label}:${first.id}`.localeCompare(
      `${second.courseCode}:${second.label}:${second.id}`
    )
  )
}

const termOrder = new Map([
  ['term-1', 1],
  ['term-2', 2],
  ['summer-session', 3],
  ['academic-year', 4],
])

export function groupSectionsByAcademicTerm(
  sections: PlannerSection[]
): AcademicTermGroup[] {
  const groups = new Map<string, AcademicTermGroup>()
  for (const section of deduplicatePlannerSections(sections)) {
    const id = academicTermIdentity(section)
    const group = groups.get(id) ?? {
      id,
      label: academicTermLabel(section),
      sections: [],
    }
    group.sections.push(section)
    groups.set(id, group)
  }
  return [...groups.values()].sort((first, second) => {
    const [firstYear = '', firstTerm = ''] = first.id.split(':')
    const [secondYear = '', secondTerm = ''] = second.id.split(':')
    return (
      secondYear.localeCompare(firstYear) ||
      (termOrder.get(firstTerm) ?? 99) - (termOrder.get(secondTerm) ?? 99) ||
      first.id.localeCompare(second.id)
    )
  })
}

export function resolveActiveAcademicTerm(
  preferred: string | null,
  groups: AcademicTermGroup[]
): string | null {
  if (preferred && groups.some((group) => group.id === preferred))
    return preferred
  return groups[0]?.id ?? null
}

export function intervalsOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number
): boolean {
  return firstStart < secondEnd && secondStart < firstEnd
}

function teachingDatesOverlap(
  first: TeachingDates,
  second: TeachingDates,
  weekday: number
): boolean | null {
  if (first.kind === 'unknown' || second.kind === 'unknown') return null
  const firstDates = new Set(teachingOccurrenceDates(first, weekday))
  return teachingOccurrenceDates(second, weekday).some((date) =>
    firstDates.has(date)
  )
}

export function findConflicts(sections: PlannerSection[]): ConflictResult[] {
  const normalizedSections = deduplicatePlannerSections(sections)
  const conflicts: ConflictResult[] = []
  for (
    let firstIndex = 0;
    firstIndex < normalizedSections.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < normalizedSections.length;
      secondIndex += 1
    ) {
      const first = normalizedSections[firstIndex]
      const second = normalizedSections[secondIndex]
      if (
        !first ||
        !second ||
        academicTermIdentity(first) !== academicTermIdentity(second)
      )
        continue
      for (const firstMeeting of first.meetings) {
        for (const secondMeeting of second.meetings) {
          if (
            firstMeeting.weekday === null ||
            secondMeeting.weekday === null ||
            firstMeeting.startMinutes === null ||
            firstMeeting.endMinutes === null ||
            secondMeeting.startMinutes === null ||
            secondMeeting.endMinutes === null
          ) {
            conflicts.push({
              kind: 'uncertain',
              firstSectionId: first.id,
              secondSectionId: second.id,
              message: `${first.courseCode} ${first.label} and ${second.courseCode} ${second.label} include unscheduled meeting details.`,
            })
            continue
          }
          if (firstMeeting.weekday !== secondMeeting.weekday) continue
          if (
            !intervalsOverlap(
              firstMeeting.startMinutes,
              firstMeeting.endMinutes,
              secondMeeting.startMinutes,
              secondMeeting.endMinutes
            )
          )
            continue
          const dateOverlap = teachingDatesOverlap(
            firstMeeting.teachingDates,
            secondMeeting.teachingDates,
            firstMeeting.weekday
          )
          if (dateOverlap === false) continue
          conflicts.push({
            kind: dateOverlap === true ? 'confirmed' : 'uncertain',
            firstSectionId: first.id,
            secondSectionId: second.id,
            message:
              dateOverlap === true
                ? `${first.courseCode} ${first.label} overlaps ${second.courseCode} ${second.label} on the same weekday and time.`
                : `${first.courseCode} ${first.label} may overlap ${second.courseCode} ${second.label}; teaching-date overlap is unknown.`,
          })
        }
      }
    }
  }
  return conflicts.sort((first, second) =>
    first.message.localeCompare(second.message)
  )
}

export function sectionCompatibility(
  first: PlannerSection,
  second: PlannerSection
): CompatibilityResult {
  if (first.id === second.id)
    return { status: 'incompatible', ruleId: 'duplicate-section' }
  if (
    first.courseCode !== second.courseCode ||
    academicTermIdentity(first) !== academicTermIdentity(second)
  ) {
    return { status: 'compatible', ruleId: 'different-course-or-term' }
  }
  const type = (label: string) => /-(LEC|TUT|LAB|DIS|PRA)\b/.exec(label)?.[1]
  const firstType = type(first.label)
  const secondType = type(second.label)
  if (firstType && firstType === secondType) {
    return { status: 'incompatible', ruleId: 'same-component-alternatives' }
  }
  return { status: 'unknown', ruleId: 'unclassified-section-pairing' }
}

export function serializeSchedule(sectionIds: string[]): string {
  const value: StoredScheduleV1 = {
    version: 1,
    sectionIds: [...new Set(sectionIds)].sort(),
  }
  return JSON.stringify(value)
}

export function parseSchedule(raw: string | null): StoredScheduleV1 {
  if (!raw) return { version: 1, sectionIds: [] }
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'version' in value &&
      value.version === 1 &&
      'sectionIds' in value &&
      Array.isArray(value.sectionIds) &&
      value.sectionIds.every((id) => typeof id === 'string')
    ) {
      return { version: 1, sectionIds: [...new Set(value.sectionIds)].sort() }
    }
  } catch {
    // Invalid browser state is intentionally discarded.
  }
  return { version: 1, sectionIds: [] }
}

export function parseTeachingDates(
  raw: string,
  academicYear?: string
): TeachingDates {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) - (\d{2})\/(\d{2})\/(\d{4})$/.exec(
    raw
  )
  if (match) {
    const start = `${match[3]}-${match[2]}-${match[1]}`
    const end = `${match[6]}-${match[5]}-${match[4]}`
    return start <= end && isIsoDate(start) && isIsoDate(end)
      ? { kind: 'known', dates: [], ranges: [{ start, end }] }
      : { kind: 'unknown', raw }
  }

  const startYear = academicYearStart(academicYear)
  const parts = raw.split(',').map((part) => part.trim())
  if (
    startYear !== null &&
    parts.length > 0 &&
    parts.every((part) => /^\d{1,2}\/\d{1,2}$/.test(part))
  ) {
    const dates = parts.map((part) => {
      const [dayText = '', monthText = ''] = part.split('/')
      const day = Number(dayText)
      const month = Number(monthText)
      const year = month >= 8 ? startYear : startYear + 1
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    })
    if (dates.every(isIsoDate))
      return {
        kind: 'known',
        dates: [...new Set(dates)].sort(),
        ranges: [],
      }
  }
  return { kind: 'unknown', raw }
}

function academicYearStart(value?: string): number | null {
  const match = /^(\d{4})-(?:\d{2}|\d{4})$/.exec(value ?? '')
  return match ? Number(match[1]) : null
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function mergeTeachingDates(
  first: TeachingDates,
  second: TeachingDates
): TeachingDates {
  if (first.kind === 'unknown') return second
  if (second.kind === 'unknown') return first
  const ranges = new Map<string, TeachingDateRange>()
  for (const range of [...first.ranges, ...second.ranges])
    ranges.set(`${range.start}:${range.end}`, range)
  return {
    kind: 'known',
    dates: [...new Set([...first.dates, ...second.dates])].sort(),
    ranges: [...ranges.values()].sort((a, b) =>
      `${a.start}:${a.end}`.localeCompare(`${b.start}:${b.end}`)
    ),
  }
}

function addUtcDays(value: string, amount: number): string {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function isoWeekday(value: string): number {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

export function teachingOccurrenceDates(
  teachingDates: TeachingDates,
  weekday: number
): string[] {
  if (teachingDates.kind === 'unknown' || weekday < 1 || weekday > 7) return []
  const occurrences = new Set(
    teachingDates.dates.filter((date) => isoWeekday(date) === weekday)
  )
  for (const range of teachingDates.ranges) {
    let date = range.start
    let guard = 0
    while (date <= range.end && guard < 370) {
      if (isoWeekday(date) === weekday) occurrences.add(date)
      date = addUtcDays(date, 1)
      guard += 1
    }
  }
  return [...occurrences].sort()
}

export function formatTeachingDates(teachingDates: TeachingDates): string {
  if (teachingDates.kind === 'unknown')
    return teachingDates.raw || 'Unknown teaching dates'
  return [
    ...teachingDates.dates,
    ...teachingDates.ranges.map((range) => `${range.start} – ${range.end}`),
  ].join(', ')
}

export interface CalendarExportResult {
  content: string
  eventCount: number
  filename: string
  omittedMeetingCount: number
  warnings: string[]
}

function escapeIcs(value: string): string {
  return value
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function foldIcsLine(line: string): string[] {
  const encoder = new TextEncoder()
  const folded: string[] = []
  let current = ''
  let limit = 75
  for (const character of Array.from(line)) {
    if (encoder.encode(current + character).length > limit) {
      folded.push(current)
      current = ` ${character}`
      limit = 75
    } else current += character
  }
  folded.push(current)
  return folded
}

function calendarTimestamp(value: Date): string {
  return value
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function calendarLocalDateTime(date: string, minutes: number): string {
  return `${date.replaceAll('-', '')}T${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}00`
}

function stableHash(value: string): string {
  let first = 0x811c9dc5
  let second = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ (code + index), 0x01000193)
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}

function componentLabel(sectionLabel: string): string {
  return /-([A-Z]{2,5})\b/.exec(sectionLabel)?.[1] ?? sectionLabel
}

function classNumber(sectionLabel: string): string {
  return /\(([^)]+)\)\s*$/.exec(sectionLabel)?.[1] ?? 'Not provided'
}

export function exportAcademicTermCalendar(
  group: AcademicTermGroup,
  generatedAt = new Date()
): CalendarExportResult {
  const omittedReasons = new Map<string, number>()
  const eventLines = new Map<string, string[]>()
  const omit = (reason: string) =>
    omittedReasons.set(reason, (omittedReasons.get(reason) ?? 0) + 1)

  for (const section of deduplicatePlannerSections(group.sections)) {
    for (const meeting of section.meetings) {
      if (meeting.weekday === null) {
        omit('unknown weekday')
        continue
      }
      if (meeting.startMinutes === null || meeting.endMinutes === null) {
        omit('unknown or malformed time')
        continue
      }
      if (meeting.teachingDates.kind === 'unknown') {
        omit('unknown teaching dates')
        continue
      }
      const dates = teachingOccurrenceDates(
        meeting.teachingDates,
        meeting.weekday
      )
      if (dates.length === 0) {
        omit('no dated occurrence matched the meeting weekday')
        continue
      }
      for (const date of dates) {
        const occurrenceKey = [
          section.courseCode,
          section.label,
          date,
          meeting.startMinutes,
          meeting.endMinutes,
          meeting.locationRaw.trim(),
        ].join('|')
        if (eventLines.has(occurrenceKey)) continue
        const description = [
          section.courseTitle,
          `Section: ${section.label}`,
          `Class number: ${classNumber(section.label)}`,
          `Instructor: ${meeting.instructorDisplayRaw || 'Not provided'}`,
          `Term: ${group.label}`,
          'Planning only — verify in CUSIS.',
        ].join('\n')
        eventLines.set(occurrenceKey, [
          'BEGIN:VEVENT',
          `UID:${stableHash(occurrenceKey)}@cuweave.org`,
          `DTSTAMP:${calendarTimestamp(generatedAt)}`,
          `DTSTART;TZID=Asia/Hong_Kong:${calendarLocalDateTime(date, meeting.startMinutes)}`,
          `DTEND;TZID=Asia/Hong_Kong:${calendarLocalDateTime(date, meeting.endMinutes)}`,
          `SUMMARY:${escapeIcs(`${section.courseCode} ${componentLabel(section.label)}`)}`,
          `LOCATION:${escapeIcs(meeting.locationRaw)}`,
          `DESCRIPTION:${escapeIcs(description)}`,
          'END:VEVENT',
        ])
      }
    }
  }

  const calendarName = `CUWeave ${group.label}`
  const logicalLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CUWeave//Course Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Hong_Kong',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Hong_Kong',
    'X-LIC-LOCATION:Asia/Hong_Kong',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:HKT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...[...eventLines.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .flatMap(([, lines]) => lines),
    'END:VCALENDAR',
  ]
  const warnings = [...omittedReasons.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([reason, count]) => `${count} meeting pattern(s) omitted: ${reason}.`)
  return {
    content: `${logicalLines.flatMap(foldIcsLine).join('\r\n')}\r\n`,
    eventCount: eventLines.size,
    filename: `${calendarName.replaceAll(' ', '-')}.ics`,
    omittedMeetingCount: [...omittedReasons.values()].reduce(
      (total, count) => total + count,
      0
    ),
    warnings,
  }
}

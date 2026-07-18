export type TeachingDates =
  | { kind: 'known'; start: string; end: string }
  | { kind: 'unknown'; raw: string }

export interface PlannerMeeting {
  id: string
  weekday: number | null
  startMinutes: number | null
  endMinutes: number | null
  teachingDates: TeachingDates
  rawTime: string
  locationRaw: string
}

export interface PlannerSection {
  id: string
  courseCode: string
  label: string
  academicYear: string
  termKey: string
  termName: string
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

export const STORAGE_KEY = 'cuweave.planner.v1'
export const ACTIVE_TERM_STORAGE_KEY = 'cuweave.planner.active-term.v1'

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
  const meetingKeys = new Map<string, Set<string>>()
  for (const section of sections) {
    let normalized = sectionMap.get(section.id)
    if (!normalized) {
      normalized = { ...section, meetings: [] }
      sectionMap.set(section.id, normalized)
      meetingKeys.set(section.id, new Set())
    }
    const seen = meetingKeys.get(section.id)!
    for (const meeting of section.meetings) {
      const key = weeklyMeetingDisplayIdentity(meeting)
      if (seen.has(key)) continue
      seen.add(key)
      normalized.meetings.push(meeting)
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

function dateRangesOverlap(
  first: TeachingDates,
  second: TeachingDates
): boolean | null {
  if (first.kind === 'unknown' || second.kind === 'unknown') return null
  return first.start <= second.end && second.start <= first.end
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
          const dateOverlap = dateRangesOverlap(
            firstMeeting.teachingDates,
            secondMeeting.teachingDates
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

export function parseTeachingDates(raw: string): TeachingDates {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) - (\d{2})\/(\d{2})\/(\d{4})$/.exec(
    raw
  )
  if (!match) return { kind: 'unknown', raw }
  const start = `${match[3]}-${match[2]}-${match[1]}`
  const end = `${match[6]}-${match[5]}-${match[4]}`
  return start <= end ? { kind: 'known', start, end } : { kind: 'unknown', raw }
}

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
}

export interface PlannerSection {
  id: string
  courseCode: string
  label: string
  termKey: string
  meetings: PlannerMeeting[]
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
  const conflicts: ConflictResult[] = []
  for (let firstIndex = 0; firstIndex < sections.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < sections.length;
      secondIndex += 1
    ) {
      const first = sections[firstIndex]
      const second = sections[secondIndex]
      if (!first || !second || first.termKey !== second.termKey) continue
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
    first.termKey !== second.termKey
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

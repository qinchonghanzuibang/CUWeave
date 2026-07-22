import ICAL from 'ical.js'
import { describe, expect, it } from 'vitest'

import {
  academicTermIdentity,
  deduplicatePlannerSections,
  exportAcademicTermCalendar,
  findConflicts,
  groupSectionsByAcademicTerm,
  intervalsOverlap,
  layoutOverlappingMeetings,
  meetingVerticalLayout,
  minutesToTimetableOffset,
  parseSchedule,
  parseTeachingDates,
  resolveActiveAcademicTerm,
  sectionCompatibility,
  serializeSchedule,
  TIMETABLE_HEIGHT_PX,
  wallClockMinutes,
  type PlannerSection,
} from './index'

const section = (overrides: Partial<PlannerSection> = {}): PlannerSection => ({
  id: 'one',
  courseCode: 'IERG1000',
  label: 'A-LEC (1000)',
  academicYear: '2026-27',
  termKey: 'term-1',
  termName: '2026-27 Term 1',
  courseTitle: 'Synthetic Systems',
  sourceName: 'synthetic-source',
  sourceRevision: 'synthetic-revision',
  importedAt: '2026-07-20T00:00:00.000Z',
  meetings: [
    {
      id: 'meeting-one',
      weekday: 1,
      startMinutes: 570,
      endMinutes: 675,
      teachingDates: { kind: 'unknown', raw: '1/9, 8/9' },
      rawTime: 'Mo 9:30AM - 11:15AM',
      locationRaw: 'Engineering Building 801',
      instructorDisplayRaw: 'Dr Synthetic',
    },
  ],
  ...overrides,
})

describe('teaching-date normalization', () => {
  it('parses ranges and academic-year anchored exact dates', () => {
    expect(parseTeachingDates('08/09/2026 - 01/12/2026')).toEqual({
      kind: 'known',
      dates: [],
      ranges: [{ start: '2026-09-08', end: '2026-12-01' }],
    })
    expect(parseTeachingDates('8/9, 15/9, 12/1', '2026-27')).toEqual({
      kind: 'known',
      dates: ['2026-09-08', '2026-09-15', '2027-01-12'],
      ranges: [],
    })
    expect(parseTeachingDates('TBA', '2026-27')).toEqual({
      kind: 'unknown',
      raw: 'TBA',
    })
  })

  it('merges split date rows while deduplicating the weekly display card', () => {
    const normalized = deduplicatePlannerSections([
      section({
        meetings: [
          {
            ...section().meetings[0]!,
            teachingDates: parseTeachingDates('07/09/2026 - 28/09/2026'),
          },
          {
            ...section().meetings[0]!,
            id: 'split-row',
            teachingDates: parseTeachingDates('12/10/2026 - 30/11/2026'),
          },
        ],
      }),
    ])
    expect(normalized[0]?.meetings).toHaveLength(1)
    expect(normalized[0]?.meetings[0]?.teachingDates).toEqual({
      kind: 'known',
      dates: [],
      ranges: [
        { start: '2026-09-07', end: '2026-09-28' },
        { start: '2026-10-12', end: '2026-11-30' },
      ],
    })
  })
})

describe('RFC 5545 calendar export', () => {
  const termOne = {
    id: '2026-27:term-1',
    label: '2026-27 Term 1',
    sections: [
      section({
        courseCode: 'TEST1001',
        courseTitle: 'Systems, Safety; and \\ Reliability',
        label: 'A-LEC (1234)',
        meetings: [
          {
            id: 'wednesday',
            weekday: 3,
            startMinutes: 13 * 60 + 30,
            endMinutes: 15 * 60 + 15,
            teachingDates: parseTeachingDates('02/09/2026 - 16/09/2026'),
            rawTime: 'We 1:30PM - 3:15PM',
            locationRaw: 'Room 1, Main; Building',
            instructorDisplayRaw: 'Dr Example',
          },
          {
            id: 'wednesday-duplicate-source-row',
            weekday: 3,
            startMinutes: 13 * 60 + 30,
            endMinutes: 15 * 60 + 15,
            teachingDates: parseTeachingDates('02/09/2026 - 16/09/2026'),
            rawTime: 'We 1:30PM - 3:15PM',
            locationRaw: 'Room 1, Main; Building',
            instructorDisplayRaw: 'Dr Example',
          },
          {
            id: 'unknown',
            weekday: 4,
            startMinutes: 12 * 60 + 30,
            endMinutes: 13 * 60 + 15,
            teachingDates: { kind: 'unknown', raw: 'TBA' },
            rawTime: 'Th 12:30PM - 1:15PM',
            locationRaw: 'TBA',
            instructorDisplayRaw: 'Staff',
          },
        ],
      }),
    ],
  }

  it('exports only safe current-term occurrences with Hong Kong wall time', () => {
    const result = exportAcademicTermCalendar(
      termOne,
      new Date('2026-07-20T00:00:00.000Z')
    )
    const unfolded = result.content.replace(/\r\n[ \t]/g, '')
    expect(result.filename).toBe('CUWeave-2026-27-Term-1.ics')
    expect(result.eventCount).toBe(3)
    expect(result.omittedMeetingCount).toBe(1)
    expect(result.warnings).toEqual([
      '1 meeting pattern(s) omitted: unknown teaching dates.',
    ])
    expect(result.content).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0')
    expect(result.content).toContain('PRODID:-//CUWeave//Course Planner//EN')
    expect(result.content).toContain('TZID:Asia/Hong_Kong')
    expect(result.content).toContain(
      'DTSTART;TZID=Asia/Hong_Kong:20260902T133000'
    )
    expect(result.content).not.toContain('Term 2')
    expect(unfolded).toContain('Planning only — verify in CUSIS.')
    expect(result.content).toContain('LOCATION:Room 1\\, Main\\; Building')
    expect(result.content).toMatch(/UID:[0-9a-f]{16}@cuweave\.org/)
    expect(result.content).not.toContain('wednesday')
    expect(
      result.content
        .split('\r\n')
        .every((line) => new TextEncoder().encode(line).length <= 75)
    ).toBe(true)
    expect(result.content.endsWith('\r\n')).toBe(true)
    const parsedData = ICAL.parse(result.content) as unknown
    if (!Array.isArray(parsedData))
      throw new Error('Expected parsed jCal data.')
    const parsed = new ICAL.Component(parsedData as unknown[])
    const events = parsed.getAllSubcomponents('vevent')
    expect(events).toHaveLength(3)
    const firstEvent = new ICAL.Event(events[0])
    expect(firstEvent.startDate.zone.tzid).toBe('Asia/Hong_Kong')
    expect(firstEvent.startDate.toString()).toBe('2026-09-02T13:30:00')
  })

  it('keeps Thursday 12:30 invariant without using the process timezone', () => {
    const result = exportAcademicTermCalendar({
      id: '2026-27:term-1',
      label: '2026-27 Term 1',
      sections: [
        section({
          meetings: [
            {
              ...section().meetings[0]!,
              weekday: 4,
              startMinutes: 12 * 60 + 30,
              endMinutes: 13 * 60 + 15,
              teachingDates: parseTeachingDates('03/09/2026 - 03/09/2026'),
            },
          ],
        }),
      ],
    })
    expect(result.content).toContain(
      'DTSTART;TZID=Asia/Hong_Kong:20260903T123000'
    )
  })
})

describe('planner conflicts', () => {
  it('uses half-open intervals for adjacent and overlapping meetings', () => {
    expect(intervalsOverlap(60, 120, 120, 180)).toBe(false)
    expect(intervalsOverlap(60, 121, 120, 180)).toBe(true)
  })

  it('distinguishes confirmed, uncertain, weekday, and known date behavior', () => {
    expect(findConflicts([section(), section({ id: 'two' })])[0]?.kind).toBe(
      'uncertain'
    )
    expect(
      findConflicts([
        section({
          meetings: [
            {
              ...section().meetings[0]!,
              teachingDates: {
                kind: 'known',
                dates: [],
                ranges: [{ start: '2026-09-01', end: '2026-09-30' }],
              },
            },
          ],
        }),
        section({
          id: 'two',
          meetings: [
            {
              ...section().meetings[0]!,
              id: 'two-meeting',
              teachingDates: {
                kind: 'known',
                dates: [],
                ranges: [{ start: '2026-09-15', end: '2026-10-01' }],
              },
            },
          ],
        }),
      ])[0]?.kind
    ).toBe('confirmed')
    expect(
      findConflicts([
        section(),
        section({
          id: 'two',
          meetings: [{ ...section().meetings[0]!, weekday: 2 }],
        }),
      ])
    ).toEqual([])
    expect(
      findConflicts([
        section({
          meetings: [
            {
              ...section().meetings[0]!,
              teachingDates: {
                kind: 'known',
                dates: [],
                ranges: [{ start: '2026-09-01', end: '2026-09-02' }],
              },
            },
          ],
        }),
        section({
          id: 'two',
          meetings: [
            {
              ...section().meetings[0]!,
              teachingDates: {
                kind: 'known',
                dates: [],
                ranges: [{ start: '2026-10-01', end: '2026-10-02' }],
              },
            },
          ],
        }),
      ])
    ).toEqual([])
  })
})

describe('planner storage and compatibility', () => {
  it('serializes unique section ids deterministically and recovers invalid state', () => {
    expect(serializeSchedule(['b', 'a', 'b'])).toBe(
      '{"version":1,"sectionIds":["a","b"]}'
    )
    expect(parseSchedule('broken').sectionIds).toEqual([])
  })

  it('loads legacy v1 state without duplicating section ids', () => {
    expect(
      parseSchedule('{"version":1,"sectionIds":["one","one","two"]}')
    ).toEqual({ version: 1, sectionIds: ['one', 'two'] })
  })

  it('prevents duplicates without treating unknown pairing as truth', () => {
    expect(sectionCompatibility(section(), section()).status).toBe(
      'incompatible'
    )
    expect(
      sectionCompatibility(
        section(),
        section({ id: 'lab', label: 'AL01-LAB (1001)' })
      ).status
    ).toBe('unknown')
    expect(
      sectionCompatibility(
        section(),
        section({ id: 'next-year', academicYear: '2027-28' })
      )
    ).toEqual({ status: 'compatible', ruleId: 'different-course-or-term' })
  })
})

describe('academic term views', () => {
  const termTwo = section({
    id: 'term-two',
    courseCode: 'IERG5350',
    academicYear: '2026-27',
    termKey: 'term-2',
    termName: '2026-27 Term 2',
  })

  it('groups academic year and term separately and resolves a valid view', () => {
    const groups = groupSectionsByAcademicTerm([termTwo, section()])
    expect(groups.map((group) => [group.id, group.sections.length])).toEqual([
      ['2026-27:term-1', 1],
      ['2026-27:term-2', 1],
    ])
    expect(academicTermIdentity(termTwo)).toBe('2026-27:term-2')
    expect(resolveActiveAcademicTerm('2026-27:term-2', groups)).toBe(
      '2026-27:term-2'
    )
    expect(resolveActiveAcademicTerm('2025-26:term-1', groups)).toBe(
      '2026-27:term-1'
    )
    expect(resolveActiveAcademicTerm(null, [])).toBeNull()
  })

  it('keeps selected counts while each group contains only its own term', () => {
    const selected = [section(), section({ id: 'second-term-one' }), termTwo]
    const groups = groupSectionsByAcademicTerm(selected)
    expect(selected).toHaveLength(3)
    expect(groups[0]?.sections).toHaveLength(2)
    expect(groups[0]?.sections.map((item) => item.courseCode)).not.toContain(
      'IERG5350'
    )
    expect(groups[1]?.sections.map((item) => item.courseCode)).toEqual([
      'IERG5350',
    ])
  })
})

describe('generic weekly meeting normalization', () => {
  it('deduplicates persisted sections and API meetings by weekly display pattern', () => {
    const duplicateMeeting = {
      ...section().meetings[0]!,
      id: 'split-date-row',
      teachingDates: { kind: 'unknown' as const, raw: 'October dates' },
    }
    const duplicateSection = section({
      meetings: [...section().meetings, duplicateMeeting],
    })
    const normalized = deduplicatePlannerSections([
      duplicateSection,
      duplicateSection,
    ])
    expect(normalized).toHaveLength(1)
    expect(normalized[0]?.meetings).toHaveLength(1)
  })

  it('preserves different components, weekdays, times, and venues', () => {
    const base = section()
    const variants: PlannerSection[] = [
      base,
      section({ id: 'tutorial', label: 'T01-TUT (1001)' }),
      section({
        id: 'weekday',
        meetings: [{ ...base.meetings[0]!, weekday: 2 }],
      }),
      section({
        id: 'time',
        meetings: [{ ...base.meetings[0]!, startMinutes: 600 }],
      }),
      section({
        id: 'venue',
        meetings: [
          { ...base.meetings[0]!, locationRaw: 'Engineering Building 802' },
        ],
      }),
    ]
    expect(
      deduplicatePlannerSections(variants).flatMap((item) => item.meetings)
    ).toHaveLength(5)
  })

  it('parses local wall-clock times without a Date or timezone conversion', () => {
    expect(wallClockMinutes('13:30:00')).toBe(810)
    expect(wallClockMinutes('12:30')).toBe(750)
    expect(wallClockMinutes('24:00')).toBeNull()
  })
})

describe('weekly timetable layout', () => {
  it('positions meetings beginning on the hour and half hour', () => {
    expect(minutesToTimetableOffset(9 * 60)).toBe(52)
    expect(minutesToTimetableOffset(9 * 60 + 30)).toBe(78)
    expect(meetingVerticalLayout(9 * 60, 10 * 60)?.topPx).toBe(52)
    expect(meetingVerticalLayout(9 * 60 + 30, 10 * 60)?.topPx).toBe(78)
  })

  it('uses the real duration for a multi-hour meeting', () => {
    expect(meetingVerticalLayout(13 * 60 + 30, 16 * 60 + 15)).toEqual({
      topPx: 286,
      heightPx: 143,
    })
  })

  it('keeps a meeting near the timetable end inside the full grid', () => {
    expect(meetingVerticalLayout(22 * 60 + 30, 23 * 60)).toEqual({
      topPx: 754,
      heightPx: 26,
    })
    expect(TIMETABLE_HEIGHT_PX).toBe(780)
    expect(meetingVerticalLayout(23 * 60, 23 * 60 + 30)).toBeNull()
  })

  it('allocates simultaneous meetings side by side and reuses free columns', () => {
    const layouts = layoutOverlappingMeetings([
      { id: 'first', startMinutes: 9 * 60, endMinutes: 11 * 60 },
      { id: 'second', startMinutes: 9 * 60 + 30, endMinutes: 10 * 60 },
      { id: 'third', startMinutes: 10 * 60, endMinutes: 10 * 60 + 30 },
    ])
    expect(layouts).toEqual([
      {
        id: 'first',
        startMinutes: 540,
        endMinutes: 660,
        column: 0,
        columnCount: 2,
        leftPercent: 0,
        widthPercent: 50,
      },
      {
        id: 'second',
        startMinutes: 570,
        endMinutes: 600,
        column: 1,
        columnCount: 2,
        leftPercent: 50,
        widthPercent: 50,
      },
      {
        id: 'third',
        startMinutes: 600,
        endMinutes: 630,
        column: 1,
        columnCount: 2,
        leftPercent: 50,
        widthPercent: 50,
      },
    ])
  })
})

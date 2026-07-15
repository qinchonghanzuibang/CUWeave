import { describe, expect, it } from 'vitest'

import {
  findConflicts,
  intervalsOverlap,
  parseSchedule,
  sectionCompatibility,
  serializeSchedule,
  type PlannerSection,
} from './index'

const section = (overrides: Partial<PlannerSection> = {}): PlannerSection => ({
  id: 'one',
  courseCode: 'IERG1000',
  label: 'A-LEC (1000)',
  termKey: 'term-1',
  meetings: [
    {
      id: 'meeting-one',
      weekday: 1,
      startMinutes: 570,
      endMinutes: 675,
      teachingDates: { kind: 'unknown', raw: '1/9, 8/9' },
      rawTime: 'Mo 9:30AM - 11:15AM',
    },
  ],
  ...overrides,
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
                start: '2026-09-01',
                end: '2026-09-30',
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
                start: '2026-09-15',
                end: '2026-10-01',
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
                start: '2026-09-01',
                end: '2026-09-02',
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
                start: '2026-10-01',
                end: '2026-10-02',
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
  })
})

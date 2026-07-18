import { describe, expect, it } from 'vitest'

import {
  evaluateRequirements,
  validateRequirementSet,
  type RequirementCourse,
  type RequirementRule,
  type RequirementRuleInput,
  type RequirementSetDefinition,
} from './index'

const source = {
  id: 'official',
  title: 'Official study scheme',
  url: 'https://example.edu/study-scheme',
  revision: '2026',
  effectiveAcademicYear: '2026-27',
  verificationStatus: 'maintainer_verified' as const,
  maintainerVerifiedAt: '2026-07-18T00:00:00.000Z',
  note: 'Synthetic official source for engine tests.',
}

function definition(
  rules: RequirementRule[],
  operator: 'all' | 'any' = 'all'
): RequirementSetDefinition {
  return {
    id: 'set-1',
    programmeCode: 'TEST',
    entryYear: 2026,
    effectiveAcademicPeriod: '2026-27',
    sourceRevision: 'test-1',
    version: 1,
    status: 'verified',
    sources: [source],
    root: { id: 'root', label: 'Root', operator, rules, groups: [] },
  }
}

function rule(value: RequirementRuleInput): RequirementRule {
  return {
    id: `rule-${value.type}`,
    label: value.type,
    category: 'core',
    sourceIds: ['official'],
    ...value,
  }
}

const courses: RequirementCourse[] = [
  {
    code: 'IERG 5001',
    units: '0.10',
    planningStatus: 'completed',
    approvalStatus: 'approved',
    categories: ['core'],
  },
  {
    code: 'IERG5002',
    units: '0.20',
    planningStatus: 'planned',
    approvalStatus: 'approved',
    categories: ['elective'],
  },
]

describe('requirement evaluation', () => {
  it('evaluates course-count and exact decimal unit rules', () => {
    const result = evaluateRequirements(
      definition([
        rule({ type: 'minimum_course_count', minimum: 2 }),
        rule({ type: 'minimum_unit_count', minimumUnits: '0.30' }),
      ]),
      courses
    )
    expect(result.status).toBe('satisfied')
    expect(result.result.children[1]?.status).toBe('satisfied')
  })

  it('reports missing required courses and choose-N groups', () => {
    const result = evaluateRequirements(
      definition([
        rule({
          type: 'required_courses',
          courseCodes: ['IERG5001', 'IERG5003'],
        }),
        rule({
          type: 'choose_n',
          count: 2,
          courseCodes: ['IERG5001', 'IERG5002'],
        }),
      ]),
      courses
    )
    expect(result.status).toBe('unsatisfied')
    expect(result.result.children[0]?.missing.courses).toEqual(['IERG5003'])
    expect(result.result.children[1]?.status).toBe('satisfied')
  })

  it('combines nested all and any groups', () => {
    const set = definition([])
    set.root = {
      id: 'outer',
      label: 'Outer',
      operator: 'all',
      rules: [rule({ type: 'minimum_course_count', minimum: 1 })],
      groups: [
        {
          id: 'choice',
          label: 'Choice',
          operator: 'any',
          rules: [
            rule({ type: 'required_courses', courseCodes: ['MISSING1000'] }),
            rule({ type: 'required_courses', courseCodes: ['IERG5001'] }),
          ].map((item, index) => ({ ...item, id: `${item.id}-${index}` })),
          groups: [],
        },
      ],
    }
    expect(evaluateRequirements(set, courses).status).toBe('satisfied')
  })

  it('prevents duplicate courses from satisfying counts twice', () => {
    const result = evaluateRequirements(
      definition([
        rule({ type: 'minimum_course_count', minimum: 2 }),
        rule({ type: 'no_double_counting' }),
      ]),
      [courses[0]!, courses[0]!]
    )
    expect(result.status).toBe('unsatisfied')
    expect(result.result.children[1]?.contributingCourses).toEqual(['IERG5001'])
  })

  it('returns uncertain for approval-dependent and unsupported rules', () => {
    const pending = { ...courses[0]!, approvalStatus: 'unknown' as const }
    const approval = evaluateRequirements(
      definition([
        rule({
          type: 'minimum_course_count',
          minimum: 1,
          filter: { approvalRequired: true },
        }),
      ]),
      [pending]
    )
    expect(approval.status).toBe('uncertain')
    expect(approval.result.children[0]?.uncertaintyReason).toBeTruthy()
    expect(
      evaluateRequirements(
        definition([
          rule({
            type: 'unsupported',
            reason: 'Official wording is ambiguous.',
          }),
        ]),
        courses
      ).status
    ).toBe('uncertain')
  })

  it('includes official source references on every result and marks drafts unreliable', () => {
    const set = definition([rule({ type: 'minimum_course_count', minimum: 1 })])
    set.status = 'draft'
    const result = evaluateRequirements(set, courses)
    expect(result.reliable).toBe(false)
    expect(result.sources).toEqual([source])
    expect(result.result.children[0]?.sources).toEqual([source])
  })

  it('validates source-backed structured rules', () => {
    const set = definition([rule({ type: 'minimum_course_count', minimum: 1 })])
    set.root.rules[0] = { ...set.root.rules[0]!, sourceIds: [] }
    expect(validateRequirementSet(set)).toContain(
      'Rule rule-minimum_course_count must reference a source.'
    )
  })
})

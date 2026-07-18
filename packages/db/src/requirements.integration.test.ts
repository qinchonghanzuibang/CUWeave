import { beforeAll, describe, expect, it } from 'vitest'

import { getDatabaseConnection } from './client'
import {
  createDraftRequirementSet,
  listProgrammeRequirements,
  listRequirementCourses,
  saveRequirementSelection,
  supersedeRequirementSet,
} from './requirements'

const enabled = Boolean(process.env.CUWEAVE_TEST_DATABASE_URL)
if (enabled) process.env.DATABASE_URL = process.env.CUWEAVE_TEST_DATABASE_URL

const admin = { id: 'requirements-admin', role: 'admin' as const }
const student = 'requirements-student'
const programmeId = '91000000-0000-4000-8000-000000000001'
const oldSetId = '92000000-0000-4000-8000-000000000001'
const newSetId = '92000000-0000-4000-8000-000000000002'

describe.skipIf(!enabled)('requirement PostgreSQL services', () => {
  beforeAll(async () => {
    const { pool } = getDatabaseConnection()
    await pool.query(
      `insert into app_user (id, name, email, email_verified, role, status)
       values ($1, 'Requirements admin', 'requirements-admin@test.invalid', true, 'admin', 'active'),
              ($2, 'Requirements student', 'requirements-student@test.invalid', true, 'user', 'active')
       on conflict (id) do update set role = excluded.role`,
      [admin.id, student]
    )
    await pool.query(
      `insert into programme (id, code, name, stream)
       values ($1, 'TEST-RPG', 'Synthetic integration programme', 'Test')
       on conflict (id) do nothing`,
      [programmeId]
    )
    await pool.query(
      `insert into requirement_set
        (id, programme_id, entry_year, effective_academic_period,
         source_revision, version, status)
       values ($1, $3, 2026, '2026-27', 'integration-old', 1, 'verified'),
              ($2, $3, 2027, '2027-28', 'integration-new', 1, 'verified')
       on conflict (id) do update set status = 'verified'`,
      [oldSetId, newSetId, programmeId]
    )
  })

  it('selects explicit entry-year versions and preserves superseded sets', async () => {
    const options = (await listProgrammeRequirements()).filter(
      (option) => option.programmeId === programmeId
    )
    expect(options.map((option) => option.entryYear)).toEqual([2027, 2026])
    await supersedeRequirementSet(admin, oldSetId, newSetId)
    const statuses = (await listProgrammeRequirements())
      .filter((option) => option.programmeId === programmeId)
      .map((option) => [option.entryYear, option.status])
    expect(statuses).toContainEqual([2026, 'superseded'])
    expect(statuses).toContainEqual([2027, 'verified'])
  })

  it('aggregates manual choices without speculative approval', async () => {
    await saveRequirementSelection(student, {
      programmeId,
      requirementSetId: newSetId,
      entryYear: 2027,
      courses: [
        {
          code: 'IERG5999',
          units: '3.000',
          planningStatus: 'completed',
          approvalStatus: 'unknown',
          categories: [],
          origin: 'manual',
        },
      ],
    })
    expect(await listRequirementCourses(student)).toContainEqual({
      code: 'IERG5999',
      units: '3.000',
      planningStatus: 'completed',
      approvalStatus: 'unknown',
      categories: [],
      origin: 'manual',
    })
  })

  it('enforces administrator-only authoring before database writes', async () => {
    await expect(
      createDraftRequirementSet(
        { id: student, role: 'user' },
        {
          programmeId,
          entryYear: 2028,
          effectiveAcademicPeriod: '2028-29',
          sourceRevision: 'forbidden',
          notes: '',
        }
      )
    ).rejects.toMatchObject({ code: 'forbidden' })
  })
})

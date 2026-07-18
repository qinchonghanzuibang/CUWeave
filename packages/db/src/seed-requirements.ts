import 'dotenv/config'

import { getDatabaseConnection } from './client'

const programmes = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    setId: '20000000-0000-4000-8000-000000000001',
    groupId: '30000000-0000-4000-8000-000000000001',
    sourceId: '40000000-0000-4000-8000-000000000001',
    detailSourceId: '40000000-0000-4000-8000-000000000002',
    ruleId: '50000000-0000-4000-8000-000000000001',
    code: 'IERG-MPHIL',
    name: 'MPhil in Information Engineering',
    stream: 'Research postgraduate',
    minimum: 4,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    setId: '20000000-0000-4000-8000-000000000002',
    groupId: '30000000-0000-4000-8000-000000000002',
    sourceId: '40000000-0000-4000-8000-000000000003',
    detailSourceId: '40000000-0000-4000-8000-000000000004',
    ruleId: '50000000-0000-4000-8000-000000000002',
    code: 'IERG-PHD',
    name: 'PhD in Information Engineering',
    stream: 'Research postgraduate',
    minimum: 6,
  },
] as const

const graduateSchoolUrl =
  'https://www.gs.cuhk.edu.hk/programmes/engineering/mphil-phd-information-engineering'
const departmentUrl =
  'https://www.ie.cuhk.edu.hk/programmes/mphil-phd-in-information-engineering/major-programme-requirements/'

const { pool } = getDatabaseConnection()
const client = await pool.connect()
try {
  await client.query('begin')
  for (const item of programmes) {
    await client.query(
      `insert into programme (id, code, name, stream, description)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update set name = excluded.name,
         stream = excluded.stream, description = excluded.description,
         updated_at = now()`,
      [
        item.id,
        item.code,
        item.name,
        item.stream,
        'Initial 2026 planning target. Requirement details remain draft pending the complete official 2026–27 study scheme.',
      ]
    )
    await client.query(
      `insert into requirement_set
        (id, programme_id, entry_year, effective_academic_period,
         source_revision, version, status, notes)
       values ($1, $2, 2026, '2026-27', 'maintainer-audit-2026-07-18', 1,
         'draft', $3)
       on conflict (id) do update set notes = excluded.notes, updated_at = now()`,
      [
        item.setId,
        item.id,
        'Draft: the Graduate School confirms the minimum course count, but the department page does not yet publish a complete 2026–27 detailed study scheme. Course approval and detailed eligibility cannot be inferred.',
      ]
    )
    await client.query(
      `insert into requirement_rule_group
        (id, requirement_set_id, label, operator, position)
       values ($1, $2, 'Course requirements', 'all', 0)
       on conflict (id) do nothing`,
      [item.groupId, item.setId]
    )
    await client.query(
      `insert into requirement_source
        (id, requirement_set_id, title, url, source_revision,
         effective_academic_year, verification_status, maintainer_verified_at,
         explanatory_note)
       values ($1, $2, 'CUHK Graduate School programme page', $3,
         'reviewed 2026-07-18', '2026-27', 'official',
         '2026-07-18T00:00:00Z', $4)
       on conflict (id) do update set explanatory_note = excluded.explanatory_note,
         maintainer_verified_at = excluded.maintainer_verified_at`,
      [
        item.sourceId,
        item.setId,
        graduateSchoolUrl,
        `The page states a minimum of ${item.minimum} graduate courses approved by the Division for the ${item.name} route. The current page was reviewed on 2026-07-18.`,
      ]
    )
    await client.query(
      `insert into requirement_source
        (id, requirement_set_id, title, url, source_revision,
         effective_academic_year, verification_status, explanatory_note)
       values ($1, $2, 'Department of Information Engineering major programme requirements',
         $3, 'reviewed 2026-07-18', 'through 2025-26', 'needs_review', $4)
       on conflict (id) do update set explanatory_note = excluded.explanatory_note`,
      [
        item.detailSourceId,
        item.setId,
        departmentUrl,
        'The department page supplies detailed schemes only through 2025–26. It cannot verify the detailed 2026-entry course list.',
      ]
    )
    await client.query(
      `insert into requirement_rule
        (id, requirement_set_id, group_id, label, category, kind,
         configuration, verification_status, explanatory_note, position)
       values ($1, $2, $3, $4, 'graduate courses', 'minimum_course_count',
         $5::jsonb, 'needs_review', $6, 0)
       on conflict (id) do update set configuration = excluded.configuration,
         explanatory_note = excluded.explanatory_note`,
      [
        item.ruleId,
        item.setId,
        item.groupId,
        `At least ${item.minimum} Division-approved graduate courses`,
        JSON.stringify({
          minimum: item.minimum,
          filter: { minimumLevel: 5000, approvalRequired: true },
        }),
        'CUWeave cannot determine Division approval from a course code. Selected courses remain uncertain until approval is confirmed.',
      ]
    )
    await client.query(
      `insert into requirement_rule_source (rule_id, source_id)
       values ($1, $2) on conflict do nothing`,
      [item.ruleId, item.sourceId]
    )
  }
  await client.query('commit')
  console.log('Draft 2026 IE requirement sets seeded.')
} catch (error) {
  await client.query('rollback')
  throw error
} finally {
  client.release()
  await pool.end()
}

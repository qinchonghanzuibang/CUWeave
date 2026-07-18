import { beforeAll, describe, expect, it } from 'vitest'

import { getDatabaseConnection } from './client'
import { searchCourses } from './courses'

const enabled = Boolean(process.env.CUWEAVE_TEST_DATABASE_URL)
if (enabled) process.env.DATABASE_URL = process.env.CUWEAVE_TEST_DATABASE_URL

describe.skipIf(!enabled)('course search PostgreSQL query', () => {
  beforeAll(async () => {
    const { pool } = getDatabaseConnection()
    const existing = await pool.query(
      `select 1 from course c
       join course_catalog_version v on v.course_id = c.id
         and v.valid_to_import_run_id is null and v.academic_year = '2026-27'
       where c.subject_code = 'IERG' and c.catalog_number = '5310'`
    )
    if (existing.rowCount) return

    await pool.query(`
      insert into source_snapshot (
        id, source_name, source_uri, upstream_revision, retrieved_at,
        academic_year, subject_code, is_complete, content_sha256, raw_content
      ) values (
        'a1000000-0000-4000-8000-000000000001', 'Synthetic search fixture',
        'fixture://course-search', repeat('a', 40), '2026-07-18T00:00:00Z',
        '2026-27', 'IERG', true, repeat('b', 64), '{}'
      ) on conflict (id) do nothing;

      insert into import_run (
        id, snapshot_id, adapter_name, adapter_version, status, finished_at
      ) values (
        'a2000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001', 'test', '1', 'succeeded', now()
      ) on conflict (id) do nothing;

      insert into course (id, subject_code, catalog_number)
      values ('a3000000-0000-4000-8000-000000000001', 'IERG', '5310')
      on conflict (subject_code, catalog_number) do nothing;

      insert into course_catalog_version (
        id, course_id, academic_year, subject_raw, course_code_raw, title_raw,
        title, credits_raw, credits, academic_career_raw, record_hash,
        valid_from_import_run_id, first_seen_snapshot_id, last_seen_snapshot_id
      )
      select 'a4000000-0000-4000-8000-000000000001', c.id, '2026-27',
        'IERG', '5310', 'Security & Privacy in Cyber Systems',
        'Security & Privacy in Cyber Systems', '3.00', 3.00, 'Postgraduate',
        repeat('c', 64), 'a2000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001'
      from course c
      where c.subject_code = 'IERG' and c.catalog_number = '5310'
        and not exists (
          select 1 from course_catalog_version v
          where v.course_id = c.id and v.academic_year = '2026-27'
            and v.valid_to_import_run_id is null
        );

      insert into course_offering (
        id, course_id, catalog_version_id, academic_year, term_key,
        term_code_raw, term_name_raw, record_hash, valid_from_import_run_id,
        first_seen_snapshot_id, last_seen_snapshot_id
      )
      select 'a5000000-0000-4000-8000-000000000001', c.id, v.id, '2026-27',
        'term-1', '2420', '2026-27 Term 1', repeat('d', 64),
        'a2000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001'
      from course c
      join course_catalog_version v on v.course_id = c.id
        and v.academic_year = '2026-27' and v.valid_to_import_run_id is null
      where c.subject_code = 'IERG' and c.catalog_number = '5310'
        and not exists (
          select 1 from course_offering o
          where o.course_id = c.id and o.academic_year = '2026-27'
            and o.term_key = 'term-1' and o.valid_to_import_run_id is null
        );
    `)
  })

  it.each(['5310', 'ierg5310', 'IERG 5310', '  IERG 5310  '])(
    'finds IERG5310 for %j',
    async (query) => {
      expect(
        (await searchCourses({ query })).items.map((item) => item.code)
      ).toContain('IERG5310')
    }
  )

  it('keeps title keywords and rejects unrelated numeric strings', async () => {
    expect(
      (await searchCourses({ query: 'security privacy' })).items.map(
        (item) => item.code
      )
    ).toContain('IERG5310')
    expect(
      (await searchCourses({ query: '99999999' })).items.map(
        (item) => item.code
      )
    ).not.toContain('IERG5310')
  })

  it('composes subject and term filters with normalized search', async () => {
    expect(
      await searchCourses({ query: '5310', subject: 'ierg', term: 'term-1' })
    ).toMatchObject({ items: [expect.objectContaining({ code: 'IERG5310' })] })
    expect(
      await searchCourses({ query: '5310', subject: 'ENGG', term: 'term-1' })
    ).toMatchObject({ items: [] })
    expect(
      await searchCourses({ query: '5310', subject: 'IERG', term: 'term-2' })
    ).toMatchObject({ items: [] })
  })
})

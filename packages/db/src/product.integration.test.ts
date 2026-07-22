import { beforeAll, describe, expect, it } from 'vitest'

import { getDatabaseConnection } from './client'
import {
  createReview,
  createSavedSchedule,
  createScheduleShare,
  deleteSavedSchedule,
  deleteReview,
  duplicateSavedSchedule,
  getSharedSchedule,
  listCourseReviews,
  listFavorites,
  listModerationReports,
  listSavedSchedules,
  ProductDataError,
  reportReview,
  resolveReport,
  revokeScheduleShare,
  setFavorite,
  setReviewVote,
  updateReview,
  updateSavedSchedule,
} from './product'

const enabled = Boolean(process.env.CUWEAVE_TEST_DATABASE_URL)
if (enabled) process.env.DATABASE_URL = process.env.CUWEAVE_TEST_DATABASE_URL

const student = 'integration-student'
const other = 'integration-other'
const moderator = 'integration-moderator'
let courseId = ''
let courseCode = ''
let offeringId = ''
let sectionId = ''

describe.skipIf(!enabled)('public Web PostgreSQL services', () => {
  beforeAll(async () => {
    const { pool } = getDatabaseConnection()
    await pool.query(`delete from review where author_id = any($1::text[])`, [
      [student, other, moderator],
    ])
    await pool.query(`delete from app_user where id = any($1::text[])`, [
      [student, other, moderator],
    ])
    await pool.query(
      `insert into app_user (id,name,email,email_verified,role,status)
       values ($1,'Student','student@test.invalid',true,'user','active'),
              ($2,'Other','other@test.invalid',true,'user','active'),
              ($3,'Moderator','moderator@test.invalid',true,'moderator','active')`,
      [student, other, moderator]
    )
    const catalog = await pool.query<{
      course_id: string
      code: string
      offering_id: string
      section_id: string
    }>(
      `select c.id::text as course_id,c.subject_code||c.catalog_number as code,
       o.id::text as offering_id,s.id::text as section_id
       from course c join course_offering o on o.course_id=c.id and o.valid_to_import_run_id is null
       join section s on s.offering_id=o.id and s.valid_to_import_run_id is null
       order by c.subject_code,c.catalog_number limit 1`
    )
    const row = catalog.rows[0]
    if (!row)
      throw new Error('Synthetic academic fixture must be imported first.')
    courseId = row.course_id
    courseCode = row.code
    offeringId = row.offering_id
    sectionId = row.section_id
  })

  it('isolates schedules, protects optimistic updates, and revokes private share tokens', async () => {
    const created = await createSavedSchedule(student, 'Primary', [
      sectionId,
      sectionId,
    ])
    expect(created.sectionIds).toEqual([sectionId])
    await expect(
      updateSavedSchedule(other, created.id, created.version, {
        name: 'Stolen',
      })
    ).rejects.toMatchObject({ code: 'not_found' })
    const updated = await updateSavedSchedule(
      student,
      created.id,
      created.version,
      {
        name: 'Updated',
      }
    )
    await expect(
      updateSavedSchedule(student, created.id, created.version, {
        name: 'Stale',
      })
    ).rejects.toMatchObject({ code: 'conflict' })
    expect(updated.version).toBe(2)

    const { token } = await createScheduleShare(student, created.id)
    expect(token).toHaveLength(43)
    const shared = await getSharedSchedule(token)
    expect(shared).toEqual(
      expect.objectContaining({ name: 'Updated', sectionIds: [sectionId] })
    )
    expect(JSON.stringify(shared)).not.toContain(student)
    await revokeScheduleShare(student, created.id)
    expect(await getSharedSchedule(token)).toBeNull()

    const duplicate = await duplicateSavedSchedule(student, created.id)
    expect(duplicate).toMatchObject({
      name: 'Updated copy',
      sectionIds: [sectionId],
    })
    await deleteSavedSchedule(student, duplicate.id)
    expect(
      (await listSavedSchedules(student)).map((item) => item.id)
    ).not.toContain(duplicate.id)
  })

  it('keeps favorites idempotent and isolated by user', async () => {
    await setFavorite(student, courseId, true)
    await setFavorite(student, courseId, true)
    expect(await listFavorites(student)).toHaveLength(1)
    expect(await listFavorites(other)).toHaveLength(0)
    await setFavorite(student, courseId, false)
    await setFavorite(student, courseId, false)
    expect(await listFavorites(student)).toHaveLength(0)
  })

  it('enforces null-instructor review uniqueness, redacts anonymous authors, and audits moderation', async () => {
    const input = {
      offeringId,
      instructorId: null,
      isAnonymous: true,
      recommendation: true,
      attendanceRequirement: 'required' as const,
      assessmentSummary: 'Synthetic assessment summary.',
      body: 'Synthetic integration review long enough to satisfy the public review policy.',
      ratings: {
        overall: 4,
        teaching: 5,
        workload: 3,
        difficulty: 2,
        grading: 4,
        usefulness: 5,
      },
    }
    const created = await createReview(student, input)
    await expect(createReview(student, input)).rejects.toBeInstanceOf(
      ProductDataError
    )
    let publicData = await listCourseReviews(courseCode, {}, other)
    expect(publicData.reviews[0]).toMatchObject({
      authorLabel: 'Anonymous CUWeave user',
      ownedByViewer: false,
    })
    expect(JSON.stringify(publicData.reviews[0])).not.toContain(student)
    expect(publicData.aggregate.averages.overall).toBe(4)

    await updateReview(student, created.id, {
      ...input,
      body: 'Edited synthetic integration review with a complete audit snapshot.',
      ratings: { ...input.ratings, overall: 5 },
    })
    await setReviewVote(other, created.id, 'helpful')
    await setReviewVote(other, created.id, 'not_helpful')
    publicData = await listCourseReviews(courseCode)
    expect(publicData.reviews[0]?.notHelpful).toBe(1)

    await reportReview(other, created.id, 'incorrect', 'Synthetic report.')
    const [report] = await listModerationReports()
    expect(report?.status).toBe('open')
    if (!report) throw new Error('Expected report.')
    await resolveReport(
      moderator,
      report.id,
      'resolved',
      'Checked synthetic content.',
      false
    )
    expect((await listModerationReports())[0]?.status).toBe('resolved')

    await deleteReview(student, created.id)
    await expect(createReview(student, input)).resolves.toHaveProperty('id')
    const { pool } = getDatabaseConnection()
    const revisions = await pool.query<{ snapshot: { ratings?: unknown } }>(
      'select snapshot from review_revision where review_id=$1',
      [created.id]
    )
    expect(revisions.rowCount).toBe(1)
    expect(revisions.rows[0]?.snapshot.ratings).toEqual(input.ratings)
  })
})

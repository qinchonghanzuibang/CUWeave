import { createHash, randomBytes } from 'node:crypto'

import type { PoolClient } from 'pg'

import { getDatabaseConnection } from './client'

export type UserRole = 'user' | 'moderator' | 'admin'

export interface ProductUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'deactivated'
  verifiedCuhkEmail: boolean
}

export interface SavedScheduleRecord {
  id: string
  name: string
  version: number
  sectionIds: string[]
  shared: boolean
  updatedAt: string
}

export interface FavoriteCourse {
  id: string
  code: string
  title: string
  academicYear: string
}

export const ratingDimensions = [
  'overall',
  'teaching',
  'workload',
  'difficulty',
  'grading',
  'usefulness',
] as const

export type RatingDimension = (typeof ratingDimensions)[number]
export type RatingValues = Record<RatingDimension, number>

export interface ReviewInput {
  offeringId: string
  instructorId: string | null
  isAnonymous: boolean
  recommendation: boolean | null
  attendanceRequirement: 'required' | 'optional' | 'unknown'
  assessmentSummary: string
  body: string
  ratings: RatingValues
}

export interface PublicReview {
  id: string
  offeringId: string
  authorLabel: string
  ownedByViewer: boolean
  academicYear: string
  termKey: string
  termName: string
  instructorId: string | null
  instructorDisplay: string | null
  isAnonymous: boolean
  recommendation: boolean | null
  attendanceRequirement: string
  assessmentSummary: string
  body: string
  ratings: RatingValues
  helpful: number
  notHelpful: number
  createdAt: string
  updatedAt: string
}

export interface ReviewAggregate {
  count: number
  averages: Partial<Record<RatingDimension, number>>
}

export interface ReviewFilters {
  academicYear?: string
  termKey?: string
  instructorId?: string
}

export class ProductDataError extends Error {
  constructor(
    public readonly code: 'not_found' | 'conflict' | 'invalid' | 'forbidden',
    message: string
  ) {
    super(message)
  }
}

function scheduleName(value: string): string {
  const normalized = value.trim()
  if (normalized.length < 1 || normalized.length > 80)
    throw new ProductDataError(
      'invalid',
      'Schedule name must be 1–80 characters.'
    )
  return normalized
}

function uniqueSectionIds(values: string[]): string[] {
  const ids = [...new Set(values)]
  if (ids.length > 40)
    throw new ProductDataError(
      'invalid',
      'A schedule can contain at most 40 sections.'
    )
  if (ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id)))
    throw new ProductDataError('invalid', 'A section identifier is invalid.')
  return ids
}

async function assertActiveSections(client: PoolClient, sectionIds: string[]) {
  if (sectionIds.length === 0) return
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count from section
     where id = any($1::uuid[]) and valid_to_import_run_id is null`,
    [sectionIds]
  )
  if (Number(result.rows[0]?.count ?? 0) !== sectionIds.length)
    throw new ProductDataError(
      'invalid',
      'One or more sections are unavailable.'
    )
}

async function replaceScheduleItems(
  client: PoolClient,
  scheduleId: string,
  sectionIds: string[]
) {
  await assertActiveSections(client, sectionIds)
  await client.query('delete from saved_schedule_item where schedule_id = $1', [
    scheduleId,
  ])
  for (const [position, sectionId] of sectionIds.entries()) {
    await client.query(
      `insert into saved_schedule_item (schedule_id, section_id, position)
       values ($1, $2, $3)`,
      [scheduleId, sectionId, position]
    )
  }
}

export async function getProductUser(
  userId: string
): Promise<ProductUser | null> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    id: string
    name: string
    email: string
    role: UserRole
    status: 'active' | 'deactivated'
    verified_cuhk_email: boolean
  }>(
    `select id, name, email, role, status, verified_cuhk_email
     from app_user where id = $1`,
    [userId]
  )
  const row = result.rows[0]
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        verifiedCuhkEmail: row.verified_cuhk_email,
      }
    : null
}

export async function setUserRole(
  email: string,
  role: UserRole
): Promise<void> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query(
    `update app_user set role = $2, updated_at = now() where lower(email) = lower($1)`,
    [email.trim(), role]
  )
  if (result.rowCount !== 1)
    throw new ProductDataError('not_found', 'Account not found.')
}

export async function deactivateAccount(userId: string): Promise<void> {
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await client.query(
      `update app_user
       set status = 'deactivated', name = 'Deleted user',
           email = 'deleted+' || id || '@invalid.cuweave', image = null,
           updated_at = now()
       where id = $1 and status = 'active'`,
      [userId]
    )
    if (result.rowCount !== 1)
      throw new ProductDataError('not_found', 'Account not found.')
    await client.query('delete from auth_session where user_id = $1', [userId])
    await client.query('delete from auth_account where user_id = $1', [userId])
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function listSavedSchedules(
  userId: string
): Promise<SavedScheduleRecord[]> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    id: string
    name: string
    version: number
    section_ids: string[]
    shared: boolean
    updated_at: Date
  }>(
    `select s.id::text, s.name, s.version,
       coalesce(array_agg(i.section_id::text order by i.position)
         filter (where i.section_id is not null), '{}') as section_ids,
       (s.share_token_hash is not null and s.share_revoked_at is null) as shared,
       s.updated_at
     from saved_schedule s
     left join saved_schedule_item i on i.schedule_id = s.id
     where s.user_id = $1
     group by s.id
     order by s.updated_at desc, s.id`,
    [userId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    version: row.version,
    sectionIds: row.section_ids,
    shared: row.shared,
    updatedAt: row.updated_at.toISOString(),
  }))
}

export async function createSavedSchedule(
  userId: string,
  name: string,
  sectionIds: string[]
): Promise<SavedScheduleRecord> {
  const normalizedName = scheduleName(name)
  const ids = uniqueSectionIds(sectionIds)
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const created = await client.query<{ id: string; updated_at: Date }>(
      `insert into saved_schedule (user_id, name) values ($1, $2)
       returning id::text, updated_at`,
      [userId, normalizedName]
    )
    const row = created.rows[0]
    if (!row)
      throw new ProductDataError('invalid', 'Schedule could not be created.')
    await replaceScheduleItems(client, row.id, ids)
    await client.query('commit')
    return {
      id: row.id,
      name: normalizedName,
      version: 1,
      sectionIds: ids,
      shared: false,
      updatedAt: row.updated_at.toISOString(),
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function updateSavedSchedule(
  userId: string,
  scheduleId: string,
  expectedVersion: number,
  values: { name?: string; sectionIds?: string[] }
): Promise<SavedScheduleRecord> {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1)
    throw new ProductDataError('invalid', 'Schedule version is invalid.')
  const normalizedName =
    values.name === undefined ? undefined : scheduleName(values.name)
  const ids =
    values.sectionIds === undefined
      ? undefined
      : uniqueSectionIds(values.sectionIds)
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const updated = await client.query<{
      id: string
      name: string
      version: number
      shared: boolean
      updated_at: Date
    }>(
      `update saved_schedule
       set name = coalesce($4, name), version = version + 1, updated_at = now()
       where id = $1 and user_id = $2 and version = $3
       returning id::text, name, version,
         (share_token_hash is not null and share_revoked_at is null) as shared,
         updated_at`,
      [scheduleId, userId, expectedVersion, normalizedName ?? null]
    )
    const row = updated.rows[0]
    if (!row) {
      const exists = await client.query(
        'select 1 from saved_schedule where id = $1 and user_id = $2',
        [scheduleId, userId]
      )
      throw new ProductDataError(
        exists.rowCount ? 'conflict' : 'not_found',
        exists.rowCount
          ? 'Schedule changed in another tab. Refresh and try again.'
          : 'Schedule not found.'
      )
    }
    if (ids) await replaceScheduleItems(client, scheduleId, ids)
    const currentItems = ids ?? (await listScheduleItems(client, scheduleId))
    await client.query('commit')
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      sectionIds: currentItems,
      shared: row.shared,
      updatedAt: row.updated_at.toISOString(),
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

async function listScheduleItems(
  client: PoolClient,
  scheduleId: string
): Promise<string[]> {
  const result = await client.query<{ section_id: string }>(
    `select section_id::text from saved_schedule_item
     where schedule_id = $1 order by position`,
    [scheduleId]
  )
  return result.rows.map((row) => row.section_id)
}

export async function duplicateSavedSchedule(
  userId: string,
  scheduleId: string
): Promise<SavedScheduleRecord> {
  const schedules = await listSavedSchedules(userId)
  const source = schedules.find((schedule) => schedule.id === scheduleId)
  if (!source) throw new ProductDataError('not_found', 'Schedule not found.')
  return createSavedSchedule(
    userId,
    `${source.name} copy`.slice(0, 80),
    source.sectionIds
  )
}

export async function deleteSavedSchedule(
  userId: string,
  scheduleId: string
): Promise<void> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query(
    'delete from saved_schedule where id = $1 and user_id = $2',
    [scheduleId, userId]
  )
  if (result.rowCount !== 1)
    throw new ProductDataError('not_found', 'Schedule not found.')
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createScheduleShare(
  userId: string,
  scheduleId: string
): Promise<{ token: string }> {
  const token = randomBytes(32).toString('base64url')
  const { pool } = getDatabaseConnection()
  const result = await pool.query(
    `update saved_schedule set share_token_hash = $3, share_created_at = now(),
       share_revoked_at = null, updated_at = now(), version = version + 1
     where id = $1 and user_id = $2`,
    [scheduleId, userId, tokenHash(token)]
  )
  if (result.rowCount !== 1)
    throw new ProductDataError('not_found', 'Schedule not found.')
  return { token }
}

export async function revokeScheduleShare(
  userId: string,
  scheduleId: string
): Promise<void> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query(
    `update saved_schedule set share_revoked_at = now(), updated_at = now(), version = version + 1
     where id = $1 and user_id = $2 and share_token_hash is not null`,
    [scheduleId, userId]
  )
  if (result.rowCount !== 1)
    throw new ProductDataError('not_found', 'Active share not found.')
}

export async function getSharedSchedule(
  token: string
): Promise<{ name: string; sectionIds: string[]; updatedAt: string } | null> {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return null
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    id: string
    name: string
    updated_at: Date
  }>(
    `select id::text, name, updated_at from saved_schedule
     where share_token_hash = $1 and share_revoked_at is null`,
    [tokenHash(token)]
  )
  const row = result.rows[0]
  if (!row) return null
  const client = await pool.connect()
  try {
    return {
      name: row.name,
      sectionIds: await listScheduleItems(client, row.id),
      updatedAt: row.updated_at.toISOString(),
    }
  } finally {
    client.release()
  }
}

export async function listFavorites(userId: string): Promise<FavoriteCourse[]> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    id: string
    code: string
    title: string
    academic_year: string
  }>(
    `select c.id::text, c.subject_code || c.catalog_number as code,
       v.title, v.academic_year
     from course_favorite f
     join course c on c.id = f.course_id
     join course_catalog_version v on v.course_id = c.id and v.valid_to_import_run_id is null
     where f.user_id = $1 order by f.created_at desc`,
    [userId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    academicYear: row.academic_year,
  }))
}

export async function setFavorite(
  userId: string,
  courseId: string,
  favorite: boolean
): Promise<void> {
  const { pool } = getDatabaseConnection()
  if (favorite) {
    const result = await pool.query(
      `insert into course_favorite (user_id, course_id)
       select $1, id from course where id = $2
       on conflict do nothing`,
      [userId, courseId]
    )
    if (!result.rowCount) {
      const exists = await pool.query('select 1 from course where id = $1', [
        courseId,
      ])
      if (!exists.rowCount)
        throw new ProductDataError('not_found', 'Course not found.')
    }
  } else {
    await pool.query(
      'delete from course_favorite where user_id = $1 and course_id = $2',
      [userId, courseId]
    )
  }
}

function validateReviewInput(input: ReviewInput): ReviewInput {
  const body = input.body.trim()
  const assessmentSummary = input.assessmentSummary.trim()
  if (body.length < 20 || body.length > 4000)
    throw new ProductDataError('invalid', 'Review must be 20–4000 characters.')
  if (assessmentSummary.length > 1000)
    throw new ProductDataError('invalid', 'Assessment summary is too long.')
  for (const dimension of ratingDimensions) {
    if (
      !Number.isInteger(input.ratings[dimension]) ||
      input.ratings[dimension] < 1 ||
      input.ratings[dimension] > 5
    )
      throw new ProductDataError(
        'invalid',
        `Rating ${dimension} must be between 1 and 5.`
      )
  }
  return { ...input, body, assessmentSummary }
}

async function assertReviewScope(
  client: PoolClient,
  offeringId: string,
  instructorId: string | null
) {
  const offering = await client.query(
    'select 1 from course_offering where id = $1',
    [offeringId]
  )
  if (!offering.rowCount)
    throw new ProductDataError('not_found', 'Course offering not found.')
  if (instructorId) {
    const linked = await client.query(
      `select 1 from section_instructor si
       join section s on s.id = si.section_id
       where s.offering_id = $1 and si.instructor_id = $2 limit 1`,
      [offeringId, instructorId]
    )
    if (!linked.rowCount)
      throw new ProductDataError(
        'invalid',
        'Instructor is not linked to this offering.'
      )
  }
}

export async function createReview(
  authorId: string,
  values: ReviewInput
): Promise<{ id: string }> {
  const input = validateReviewInput(values)
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    await assertReviewScope(client, input.offeringId, input.instructorId)
    const created = await client.query<{ id: string }>(
      `insert into review
       (author_id, offering_id, instructor_id, is_anonymous, recommendation,
        attendance_requirement, assessment_summary, body)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id::text`,
      [
        authorId,
        input.offeringId,
        input.instructorId,
        input.isAnonymous,
        input.recommendation,
        input.attendanceRequirement,
        input.assessmentSummary,
        input.body,
      ]
    )
    const id = created.rows[0]?.id
    if (!id)
      throw new ProductDataError('invalid', 'Review could not be created.')
    for (const dimension of ratingDimensions) {
      await client.query(
        'insert into review_rating (review_id, dimension, value) values ($1,$2,$3)',
        [id, dimension, input.ratings[dimension]]
      )
    }
    await client.query('commit')
    return { id }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23505')
      throw new ProductDataError(
        'conflict',
        'You already reviewed this offering and instructor.'
      )
    throw error
  } finally {
    client.release()
  }
}

export async function updateReview(
  authorId: string,
  reviewId: string,
  values: ReviewInput
): Promise<void> {
  const input = validateReviewInput(values)
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const current = await client.query<{ snapshot: unknown }>(
      `select jsonb_build_object(
        'offeringId', r.offering_id, 'instructorId', r.instructor_id,
        'isAnonymous', r.is_anonymous, 'recommendation', r.recommendation,
        'attendanceRequirement', r.attendance_requirement,
        'assessmentSummary', r.assessment_summary, 'body', r.body,
        'ratings', (select jsonb_object_agg(rr.dimension, rr.value)
          from review_rating rr where rr.review_id = r.id)
      ) as snapshot
      from review r where r.id = $1 and r.author_id = $2
        and r.deleted_at is null for update`,
      [reviewId, authorId]
    )
    if (!current.rowCount)
      throw new ProductDataError('not_found', 'Review not found.')
    await assertReviewScope(client, input.offeringId, input.instructorId)
    await client.query(
      'insert into review_revision (review_id, editor_id, snapshot) values ($1,$2,$3)',
      [reviewId, authorId, current.rows[0]?.snapshot]
    )
    await client.query(
      `update review set offering_id=$3, instructor_id=$4, is_anonymous=$5,
       recommendation=$6, attendance_requirement=$7, assessment_summary=$8,
       body=$9, updated_at=now() where id=$1 and author_id=$2`,
      [
        reviewId,
        authorId,
        input.offeringId,
        input.instructorId,
        input.isAnonymous,
        input.recommendation,
        input.attendanceRequirement,
        input.assessmentSummary,
        input.body,
      ]
    )
    await client.query('delete from review_rating where review_id = $1', [
      reviewId,
    ])
    for (const dimension of ratingDimensions) {
      await client.query(
        'insert into review_rating (review_id, dimension, value) values ($1,$2,$3)',
        [reviewId, dimension, input.ratings[dimension]]
      )
    }
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23505')
      throw new ProductDataError(
        'conflict',
        'You already reviewed this offering and instructor.'
      )
    throw error
  } finally {
    client.release()
  }
}

export async function deleteReview(
  authorId: string,
  reviewId: string
): Promise<void> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query(
    `update review set deleted_at=now(), updated_at=now()
     where id=$1 and author_id=$2 and deleted_at is null`,
    [reviewId, authorId]
  )
  if (result.rowCount !== 1)
    throw new ProductDataError('not_found', 'Review not found.')
}

export async function getCourseReviewOptions(code: string): Promise<{
  courseId: string
  offerings: Array<{
    id: string
    academicYear: string
    termKey: string
    termName: string
    instructors: Array<{ id: string; display: string }>
  }>
}> {
  const match = /^([A-Z]{4})(.+)$/.exec(code.toUpperCase())
  if (!match) throw new ProductDataError('not_found', 'Course not found.')
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    course_id: string
    offering_id: string
    academic_year: string
    term_key: string
    term_name: string
    instructors: Array<{ id: string; display: string }>
  }>(
    `select c.id::text as course_id, o.id::text as offering_id, o.academic_year,
       o.term_key, o.term_name_raw as term_name,
       coalesce(jsonb_agg(distinct jsonb_build_object('id', i.id::text, 'display', i.display_value))
         filter (where i.id is not null), '[]'::jsonb) as instructors
     from course c
     join course_offering o on o.course_id = c.id
     left join section s on s.offering_id = o.id
     left join section_instructor si on si.section_id = s.id
     left join instructor i on i.id = si.instructor_id
     where c.subject_code=$1 and c.catalog_number=$2
     group by c.id, o.id order by o.academic_year desc, o.term_key, o.created_at desc`,
    [match[1], match[2]]
  )
  const first = result.rows[0]
  if (!first) throw new ProductDataError('not_found', 'Course not found.')
  return {
    courseId: first.course_id,
    offerings: result.rows.map((row) => ({
      id: row.offering_id,
      academicYear: row.academic_year,
      termKey: row.term_key,
      termName: row.term_name,
      instructors: row.instructors,
    })),
  }
}

export async function listCourseReviews(
  code: string,
  filters: ReviewFilters = {},
  viewerId?: string
): Promise<{ reviews: PublicReview[]; aggregate: ReviewAggregate }> {
  const match = /^([A-Z]{4})(.+)$/.exec(code.toUpperCase())
  if (!match) return { reviews: [], aggregate: { count: 0, averages: {} } }
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    id: string
    offering_id: string
    author_label: string
    owned: boolean
    academic_year: string
    term_key: string
    term_name: string
    instructor_id: string | null
    instructor_display: string | null
    is_anonymous: boolean
    recommendation: boolean | null
    attendance_requirement: string
    assessment_summary: string
    body: string
    ratings: RatingValues
    helpful: number
    not_helpful: number
    created_at: Date
    updated_at: Date
  }>(
    `select r.id::text, r.offering_id::text,
       case when r.is_anonymous then 'Anonymous CUWeave user' else u.name end as author_label,
       (r.author_id = $6) as owned,
       o.academic_year, o.term_key, o.term_name_raw as term_name,
       i.id::text as instructor_id, i.display_value as instructor_display,
       r.is_anonymous, r.recommendation, r.attendance_requirement,
       r.assessment_summary, r.body,
       jsonb_object_agg(rr.dimension, rr.value) as ratings,
       count(distinct v.user_id) filter (where v.value='helpful')::int as helpful,
       count(distinct v.user_id) filter (where v.value='not_helpful')::int as not_helpful,
       r.created_at, r.updated_at
     from review r
     join app_user u on u.id=r.author_id
     join course_offering o on o.id=r.offering_id
     join course c on c.id=o.course_id
     left join instructor i on i.id=r.instructor_id
     join review_rating rr on rr.review_id=r.id
     left join review_vote v on v.review_id=r.id
     where c.subject_code=$1 and c.catalog_number=$2
       and r.deleted_at is null and r.moderation_state='published'
       and ($3='' or o.academic_year=$3)
       and ($4='' or o.term_key=$4)
       and ($5='' or r.instructor_id::text=$5)
     group by r.id,u.id,o.id,i.id
     order by r.created_at desc`,
    [
      match[1],
      match[2],
      filters.academicYear ?? '',
      filters.termKey ?? '',
      filters.instructorId ?? '',
      viewerId ?? '',
    ]
  )
  const reviews = result.rows.map((row) => ({
    id: row.id,
    offeringId: row.offering_id,
    authorLabel: row.author_label,
    ownedByViewer: row.owned,
    academicYear: row.academic_year,
    termKey: row.term_key,
    termName: row.term_name,
    instructorId: row.instructor_id,
    instructorDisplay: row.instructor_display,
    isAnonymous: row.is_anonymous,
    recommendation: row.recommendation,
    attendanceRequirement: row.attendance_requirement,
    assessmentSummary: row.assessment_summary,
    body: row.body,
    ratings: row.ratings,
    helpful: row.helpful,
    notHelpful: row.not_helpful,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }))
  const averages: Partial<Record<RatingDimension, number>> = {}
  for (const dimension of ratingDimensions) {
    if (reviews.length)
      averages[dimension] = Number(
        (
          reviews.reduce((sum, review) => sum + review.ratings[dimension], 0) /
          reviews.length
        ).toFixed(2)
      )
  }
  return { reviews, aggregate: { count: reviews.length, averages } }
}

export async function setReviewVote(
  userId: string,
  reviewId: string,
  value: 'helpful' | 'not_helpful' | null
): Promise<void> {
  const { pool } = getDatabaseConnection()
  if (value === null) {
    await pool.query(
      'delete from review_vote where review_id=$1 and user_id=$2',
      [reviewId, userId]
    )
    return
  }
  const result = await pool.query(
    `insert into review_vote (review_id,user_id,value) values ($1,$2,$3)
     on conflict (review_id,user_id) do update set value=excluded.value,updated_at=now()`,
    [reviewId, userId, value]
  )
  if (!result.rowCount)
    throw new ProductDataError('not_found', 'Review not found.')
}

export async function reportReview(
  reporterId: string,
  reviewId: string,
  category: 'spam' | 'harassment' | 'privacy' | 'incorrect' | 'other',
  explanation: string
): Promise<void> {
  const normalized = explanation.trim()
  if (normalized.length > 1000)
    throw new ProductDataError('invalid', 'Report explanation is too long.')
  const { pool } = getDatabaseConnection()
  try {
    const result = await pool.query(
      `insert into review_report (review_id,reporter_id,category,explanation)
       select id,$2,$3,$4 from review where id=$1 and deleted_at is null`,
      [reviewId, reporterId, category, normalized]
    )
    if (!result.rowCount)
      throw new ProductDataError('not_found', 'Review not found.')
  } catch (error) {
    if ((error as { code?: string }).code === '23505')
      throw new ProductDataError(
        'conflict',
        'You already reported this review.'
      )
    throw error
  }
}

export interface ModerationReport {
  id: string
  reviewId: string
  courseCode: string
  category: string
  explanation: string
  status: string
  reviewBody: string
  createdAt: string
}

export async function listModerationReports(): Promise<ModerationReport[]> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    id: string
    review_id: string
    course_code: string
    category: string
    explanation: string
    status: string
    review_body: string
    created_at: Date
  }>(
    `select rp.id::text,r.id::text as review_id,
       c.subject_code||c.catalog_number as course_code,
       rp.category,rp.explanation,rp.status,r.body as review_body,rp.created_at
     from review_report rp join review r on r.id=rp.review_id
     join course_offering o on o.id=r.offering_id join course c on c.id=o.course_id
     order by (rp.status='open') desc,rp.created_at asc`
  )
  return result.rows.map((row) => ({
    id: row.id,
    reviewId: row.review_id,
    courseCode: row.course_code,
    category: row.category,
    explanation: row.explanation,
    status: row.status,
    reviewBody: row.review_body,
    createdAt: row.created_at.toISOString(),
  }))
}

export async function resolveReport(
  moderatorId: string,
  reportId: string,
  resolution: 'resolved' | 'dismissed',
  notes: string,
  hideReview: boolean
): Promise<void> {
  if (notes.trim().length > 2000)
    throw new ProductDataError('invalid', 'Resolution notes are too long.')
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await client.query<{ review_id: string }>(
      `update review_report set status=$3,moderator_id=$2,resolution_notes=$4,
       resolved_at=now(),updated_at=now() where id=$1 and status='open'
       returning review_id::text`,
      [reportId, moderatorId, resolution, notes.trim()]
    )
    const row = result.rows[0]
    if (!row) throw new ProductDataError('not_found', 'Open report not found.')
    if (hideReview)
      await client.query(
        `update review set moderation_state='hidden',updated_at=now() where id=$1`,
        [row.review_id]
      )
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

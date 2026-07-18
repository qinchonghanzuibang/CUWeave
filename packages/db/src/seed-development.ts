import {
  createReview,
  createSavedSchedule,
  getDatabaseConnection,
} from './index'

const STUDENT_ID = 'dev-student'
const MODERATOR_ID = 'dev-moderator'

async function seed() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Development seed is disabled in production.')
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(
      `delete from review_report
       where reporter_id = any($1::text[]) or moderator_id = any($1::text[])`,
      [[STUDENT_ID, MODERATOR_ID]]
    )
    await client.query(
      'delete from review_vote where user_id = any($1::text[])',
      [[STUDENT_ID, MODERATOR_ID]]
    )
    await client.query('delete from review where author_id = any($1::text[])', [
      [STUDENT_ID, MODERATOR_ID],
    ])
    await client.query(
      'delete from course_favorite where user_id = any($1::text[])',
      [[STUDENT_ID, MODERATOR_ID]]
    )
    await client.query(
      'delete from saved_schedule where user_id = any($1::text[])',
      [[STUDENT_ID, MODERATOR_ID]]
    )
    await client.query(
      'delete from auth_session where user_id = any($1::text[])',
      [[STUDENT_ID, MODERATOR_ID]]
    )
    await client.query(
      'delete from auth_account where user_id = any($1::text[])',
      [[STUDENT_ID, MODERATOR_ID]]
    )
    await client.query(
      `delete from auth_verification
       where identifier in ('student@cuweave.local', 'moderator@cuweave.local')`
    )
    await client.query(
      `insert into app_user
      (id,name,email,email_verified,role,status,verified_cuhk_email)
     values
      ($1,'Development Student','student@cuweave.local',true,'user','active',false),
      ($2,'Development Moderator','moderator@cuweave.local',true,'moderator','active',false)
     on conflict (id) do update set name=excluded.name,email=excluded.email,
       role=excluded.role,status='active',updated_at=now()`,
      [STUDENT_ID, MODERATOR_ID]
    )
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
  const catalog = await pool.query<{
    course_id: string
    offering_id: string
    section_id: string
    instructor_id: string | null
  }>(
    `select c.id::text as course_id,o.id::text as offering_id,
       s.id::text as section_id,
       (array_agg(si.instructor_id) filter (where si.instructor_id is not null))[1]::text as instructor_id
     from course c join course_offering o on o.course_id=c.id and o.valid_to_import_run_id is null
     join section s on s.offering_id=o.id and s.valid_to_import_run_id is null
     left join section_instructor si on si.section_id=s.id
     group by c.id,o.id,s.id order by c.subject_code,c.catalog_number limit 1`
  )
  const item = catalog.rows[0]
  if (!item)
    throw new Error(
      'Import the synthetic or local course dataset before running the development seed.'
    )
  await pool.query(
    `insert into course_favorite (user_id,course_id) values ($1,$2)
     on conflict do nothing`,
    [STUDENT_ID, item.course_id]
  )
  const schedules = await pool.query(
    'select 1 from saved_schedule where user_id=$1 limit 1',
    [STUDENT_ID]
  )
  if (!schedules.rowCount)
    await createSavedSchedule(STUDENT_ID, 'Public beta sample', [
      item.section_id,
    ])
  const reviews = await pool.query(
    'select 1 from review where author_id=$1 and offering_id=$2 and deleted_at is null',
    [MODERATOR_ID, item.offering_id]
  )
  if (!reviews.rowCount)
    await createReview(MODERATOR_ID, {
      offeringId: item.offering_id,
      instructorId: item.instructor_id,
      isAnonymous: true,
      recommendation: true,
      attendanceRequirement: 'unknown',
      assessmentSummary: 'Synthetic development assessment context.',
      body: 'Synthetic review for exercising Public Beta ratings and moderation without using real student content.',
      ratings: {
        overall: 4,
        teaching: 4,
        workload: 3,
        difficulty: 3,
        grading: 4,
        usefulness: 5,
      },
    })
  process.stdout.write(
    JSON.stringify({
      moderator: 'moderator@cuweave.local',
      student: 'student@cuweave.local',
    }) + '\n'
  )
}

seed().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Development seed failed.'}\n`
  )
  process.exitCode = 1
})

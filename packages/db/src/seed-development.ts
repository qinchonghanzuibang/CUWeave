import {
  createReview,
  createSavedSchedule,
  getDatabaseConnection,
} from './index'

const STUDENT_ID = 'dev-student'
const MODERATOR_ID = 'dev-moderator'
const ADMIN_ID = 'dev-admin'
const DEVELOPMENT_USER_IDS = [STUDENT_ID, MODERATOR_ID, ADMIN_ID]

async function seed() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Development seed is disabled in production.')
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('delete from rate_limit_event')
    await client.query(
      `delete from review_report
       where reporter_id = any($1::text[]) or moderator_id = any($1::text[])`,
      [DEVELOPMENT_USER_IDS]
    )
    await client.query(
      'delete from review_vote where user_id = any($1::text[])',
      [DEVELOPMENT_USER_IDS]
    )
    await client.query('delete from review where author_id = any($1::text[])', [
      DEVELOPMENT_USER_IDS,
    ])
    await client.query(
      'delete from course_favorite where user_id = any($1::text[])',
      [DEVELOPMENT_USER_IDS]
    )
    await client.query(
      'delete from saved_schedule where user_id = any($1::text[])',
      [DEVELOPMENT_USER_IDS]
    )
    await client.query(
      'delete from auth_session where user_id = any($1::text[])',
      [DEVELOPMENT_USER_IDS]
    )
    await client.query(
      'delete from auth_account where user_id = any($1::text[])',
      [DEVELOPMENT_USER_IDS]
    )
    await client.query(
      `delete from auth_verification
       where identifier in ('student@cuweave.local', 'moderator@cuweave.local',
         'admin@cuweave.local')`
    )
    await client.query(
      `insert into app_user
      (id,name,email,email_verified,role,status,verified_cuhk_email)
     values
      ($1,'Development Student','student@cuweave.local',true,'user','active',false),
      ($2,'Development Moderator','moderator@cuweave.local',true,'moderator','active',false),
      ($3,'Development Administrator','admin@cuweave.local',true,'admin','active',false)
     on conflict (id) do update set name=excluded.name,email=excluded.email,
       role=excluded.role,status='active',updated_at=now()`,
      [STUDENT_ID, MODERATOR_ID, ADMIN_ID]
    )
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
  await pool.query(
    `with source as (
       select s.* from course c
       join course_offering o on o.course_id=c.id and o.valid_to_import_run_id is null
       join section s on s.offering_id=o.id and s.valid_to_import_run_id is null
       where c.subject_code='ZZZZ' and c.catalog_number='1001'
         and s.section_key='A-LEC (1001)'
     )
     insert into section (
       offering_id,section_key,section_label_raw,class_attributes_raw,
       capacity_raw,capacity,enrolled_raw,enrolled,available_seats_raw,
       available_seats,waitlist_capacity_raw,waitlist_capacity,
       waitlist_total_raw,waitlist_total,availability_status_raw,revision_hash,
       valid_from_import_run_id,valid_to_import_run_id,first_seen_snapshot_id,
       last_seen_snapshot_id
     )
     select offering_id,'B-LEC (1004)','B-LEC (1004)',
       'Synthetic second-section fixture','25',25,'5',5,'20',20,'0',0,
       '0',0,'Open',repeat('b',64),valid_from_import_run_id,null,
       first_seen_snapshot_id,last_seen_snapshot_id
     from source
     on conflict (offering_id,section_key)
       where valid_to_import_run_id is null do nothing`
  )
  await pool.query(
    `insert into meeting (
       section_id,ordinal,time_raw,time_status,weekday,start_time,end_time,
       teaching_dates_raw,location_raw,instructor_display_raw
     )
     select target.id,0,'Tu 1:30PM - 2:45PM','parsed',2,'13:30','14:45',
       '2/9, 9/9, 16/9, 23/9, 30/9','Synthetic Room D',
       'Professor SAMPLE Delta'
     from course c
     join course_offering o on o.course_id=c.id and o.valid_to_import_run_id is null
     join section target on target.offering_id=o.id
       and target.valid_to_import_run_id is null
       and target.section_key='B-LEC (1004)'
     where c.subject_code='ZZZZ' and c.catalog_number='1001'
     on conflict (section_id,ordinal) do nothing`
  )
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
    await createSavedSchedule(STUDENT_ID, 'Public sample', [item.section_id])
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
      body: 'Synthetic review for exercising public ratings and moderation without using real student content.',
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
      administrator: 'admin@cuweave.local',
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

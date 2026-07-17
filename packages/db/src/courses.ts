import { getDatabaseConnection } from './client'

export interface CourseSearchItem {
  code: string
  subject: string
  catalogNumber: string
  title: string
  credits: string
  academicYear: string
  terms: string[]
  sourceName: string
  importedAt: string
}

export interface CourseMeeting {
  id: string
  ordinal: number
  timeRaw: string
  timeStatus: 'parsed' | 'unknown'
  weekday: number | null
  startTime: string | null
  endTime: string | null
  teachingDatesRaw: string
  locationRaw: string
  instructorDisplayRaw: string
}

export interface CourseSection {
  id: string
  courseCode?: string
  label: string
  termKey: string
  termName: string
  meetings: CourseMeeting[]
}

export interface CourseDetail {
  id: string
  code: string
  title: string
  credits: string
  academicCareer: string | null
  academicYear: string
  sourceName: string
  sourceRevision: string
  importedAt: string
  sections: CourseSection[]
}

export interface CourseSearchOptions {
  query?: string
  subject?: string
  term?: string
}

export async function searchCourses(
  options: CourseSearchOptions = {}
): Promise<CourseSearchItem[]> {
  const { pool } = getDatabaseConnection()
  const query = options.query?.trim() ?? ''
  const subject = options.subject?.trim().toUpperCase() ?? ''
  const term = options.term?.trim() ?? ''
  const result = await pool.query<{
    course_id: string
    code: string
    subject: string
    catalog_number: string
    title: string
    credits: string
    academic_year: string
    terms: string[]
    source_name: string
    imported_at: Date
  }>(
    `
      select
        c.subject_code || c.catalog_number as code,
        c.subject_code as subject,
        c.catalog_number,
        v.title,
        v.credits::text,
        v.academic_year,
        array_agg(distinct o.term_key order by o.term_key) as terms,
        s.source_name,
        max(r.finished_at) as imported_at
      from course c
      join course_catalog_version v on v.course_id = c.id and v.valid_to_import_run_id is null
      join course_offering o on o.course_id = c.id and o.valid_to_import_run_id is null
      join source_snapshot s on s.id = v.last_seen_snapshot_id
      join import_run r on r.id = v.valid_from_import_run_id
      where ($1 = '' or c.subject_code || c.catalog_number ilike $1 || '%' or v.title ilike '%' || $1 || '%')
        and ($2 = '' or c.subject_code = $2)
        and ($3 = '' or o.term_key = $3)
      group by c.id, c.subject_code, c.catalog_number, v.id, v.title, v.credits,
        v.academic_year, s.source_name
      order by c.subject_code, c.catalog_number
      limit 100
    `,
    [query, subject, term]
  )
  return result.rows.map((row) => ({
    code: row.code,
    subject: row.subject,
    catalogNumber: row.catalog_number,
    title: row.title,
    credits: row.credits,
    academicYear: row.academic_year,
    terms: row.terms,
    sourceName: row.source_name,
    importedAt: row.imported_at.toISOString(),
  }))
}

export async function getCourseDetail(
  code: string
): Promise<CourseDetail | null> {
  const match = /^([A-Z]{4})(.+)$/.exec(code.toUpperCase())
  if (!match) return null
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    course_id: string
    code: string
    title: string
    credits: string
    academic_career: string | null
    academic_year: string
    source_name: string
    upstream_revision: string
    imported_at: Date
    section_id: string | null
    section_label: string | null
    term_key: string | null
    term_name: string | null
    meeting_id: string | null
    ordinal: number | null
    time_raw: string | null
    time_status: 'parsed' | 'unknown' | null
    weekday: number | null
    start_time: string | null
    end_time: string | null
    teaching_dates_raw: string | null
    location_raw: string | null
    instructor_display_raw: string | null
  }>(
    `
      select
        c.id::text as course_id,
        c.subject_code || c.catalog_number as code,
        v.title, v.credits::text, v.academic_career_raw as academic_career,
        v.academic_year, snap.source_name, snap.upstream_revision,
        run.finished_at as imported_at,
        sec.id::text as section_id, sec.section_label_raw as section_label,
        o.term_key, o.term_name_raw as term_name,
        m.id::text as meeting_id, m.ordinal, m.time_raw, m.time_status,
        m.weekday, m.start_time::text, m.end_time::text,
        m.teaching_dates_raw, m.location_raw, m.instructor_display_raw
      from course c
      join course_catalog_version v on v.course_id = c.id and v.valid_to_import_run_id is null
      join source_snapshot snap on snap.id = v.last_seen_snapshot_id
      join import_run run on run.id = v.valid_from_import_run_id
      left join course_offering o on o.course_id = c.id and o.valid_to_import_run_id is null
      left join section sec on sec.offering_id = o.id and sec.valid_to_import_run_id is null
      left join meeting m on m.section_id = sec.id
      where c.subject_code = $1 and c.catalog_number = $2
      order by o.term_key, sec.section_key, m.ordinal
    `,
    [match[1], match[2]]
  )
  const first = result.rows[0]
  if (!first) return null
  const sectionMap = new Map<string, CourseSection>()
  for (const row of result.rows) {
    if (
      !row.section_id ||
      !row.section_label ||
      !row.term_key ||
      !row.term_name
    )
      continue
    let section = sectionMap.get(row.section_id)
    if (!section) {
      section = {
        id: row.section_id,
        label: row.section_label,
        termKey: row.term_key,
        termName: row.term_name,
        meetings: [],
      }
      sectionMap.set(row.section_id, section)
    }
    if (
      row.meeting_id &&
      row.time_raw &&
      row.time_status &&
      row.teaching_dates_raw &&
      row.location_raw &&
      row.instructor_display_raw
    ) {
      section.meetings.push({
        id: row.meeting_id,
        ordinal: row.ordinal ?? 0,
        timeRaw: row.time_raw,
        timeStatus: row.time_status,
        weekday: row.weekday,
        startTime: row.start_time,
        endTime: row.end_time,
        teachingDatesRaw: row.teaching_dates_raw,
        locationRaw: row.location_raw,
        instructorDisplayRaw: row.instructor_display_raw,
      })
    }
  }
  return {
    id: first.course_id,
    code: first.code,
    title: first.title,
    credits: first.credits,
    academicCareer: first.academic_career,
    academicYear: first.academic_year,
    sourceName: first.source_name,
    sourceRevision: first.upstream_revision.trim(),
    importedAt: first.imported_at.toISOString(),
    sections: [...sectionMap.values()],
  }
}

export async function getSectionsByIds(
  ids: string[]
): Promise<CourseSection[]> {
  if (ids.length === 0) return []
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{ code: string; payload: CourseSection }>(
    `
      select c.subject_code || c.catalog_number as code,
        jsonb_build_object(
          'id', sec.id::text,
          'label', sec.section_label_raw,
          'termKey', o.term_key,
          'termName', o.term_name_raw,
          'meetings', coalesce(jsonb_agg(jsonb_build_object(
            'id', m.id::text, 'ordinal', m.ordinal, 'timeRaw', m.time_raw,
            'timeStatus', m.time_status, 'weekday', m.weekday,
            'startTime', m.start_time::text, 'endTime', m.end_time::text,
            'teachingDatesRaw', m.teaching_dates_raw, 'locationRaw', m.location_raw,
            'instructorDisplayRaw', m.instructor_display_raw
          ) order by m.ordinal) filter (where m.id is not null), '[]'::jsonb)
        ) || jsonb_build_object('courseCode', c.subject_code || c.catalog_number) as payload
      from section sec
      join course_offering o on o.id = sec.offering_id and o.valid_to_import_run_id is null
      join course c on c.id = o.course_id
      left join meeting m on m.section_id = sec.id
      where sec.id = any($1::uuid[]) and sec.valid_to_import_run_id is null
      group by sec.id, o.id, c.id
    `,
    [ids]
  )
  return result.rows.map((row) => row.payload)
}

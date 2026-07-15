import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}

const lifecycleColumns = {
  validFromImportRunId: uuid('valid_from_import_run_id').notNull(),
  validToImportRunId: uuid('valid_to_import_run_id'),
  firstSeenSnapshotId: uuid('first_seen_snapshot_id').notNull(),
  lastSeenSnapshotId: uuid('last_seen_snapshot_id').notNull(),
}

export const systemMetadata = pgTable('system_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const sourceSnapshot = pgTable(
  'source_snapshot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceName: text('source_name').notNull(),
    sourceUri: text('source_uri').notNull(),
    upstreamRevision: char('upstream_revision', { length: 40 }).notNull(),
    retrievedAt: timestamp('retrieved_at', { withTimezone: true }).notNull(),
    academicYear: text('academic_year').notNull(),
    subjectCode: text('subject_code').notNull(),
    isComplete: boolean('is_complete').notNull(),
    contentSha256: char('content_sha256', { length: 64 }).notNull(),
    rawContent: text('raw_content').notNull(),
    ...auditColumns,
  },
  (table) => [
    unique('source_snapshot_identity_unique').on(
      table.sourceName,
      table.sourceUri,
      table.upstreamRevision,
      table.retrievedAt,
      table.academicYear,
      table.subjectCode,
      table.isComplete,
      table.contentSha256
    ),
    check(
      'source_snapshot_revision_check',
      sql`${table.upstreamRevision} ~ '^[0-9a-f]{40}$'`
    ),
    check(
      'source_snapshot_hash_check',
      sql`${table.contentSha256} ~ '^[0-9a-f]{64}$'`
    ),
    check(
      'source_snapshot_year_check',
      sql`${table.academicYear} ~ '^[0-9]{4}-[0-9]{2}$'`
    ),
    check(
      'source_snapshot_subject_check',
      sql`${table.subjectCode} ~ '^[A-Z]{4}$'`
    ),
  ]
)

export const importRun = pgTable(
  'import_run',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => sourceSnapshot.id, { onDelete: 'restrict' }),
    adapterName: text('adapter_name').notNull(),
    adapterVersion: text('adapter_version').notNull(),
    status: text('status').notNull(),
    reusedImportRunId: uuid('reused_import_run_id'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    report: jsonb('report'),
    errorCode: text('error_code'),
  },
  (table) => [
    check(
      'import_run_status_check',
      sql`${table.status} in ('running', 'succeeded', 'failed', 'skipped')`
    ),
    index('import_run_snapshot_idx').on(table.snapshotId),
    uniqueIndex('import_run_success_unique')
      .on(table.snapshotId, table.adapterName, table.adapterVersion)
      .where(sql`${table.status} = 'succeeded'`),
  ]
)

export const course = pgTable(
  'course',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectCode: text('subject_code').notNull(),
    catalogNumber: text('catalog_number').notNull(),
    ...auditColumns,
  },
  (table) => [
    unique('course_identity_unique').on(table.subjectCode, table.catalogNumber),
    index('course_code_search_idx').on(table.subjectCode, table.catalogNumber),
  ]
)

export const courseCatalogVersion = pgTable(
  'course_catalog_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'restrict' }),
    academicYear: text('academic_year').notNull(),
    subjectRaw: text('subject_raw').notNull(),
    courseCodeRaw: text('course_code_raw').notNull(),
    titleRaw: text('title_raw').notNull(),
    title: text('title').notNull(),
    creditsRaw: text('credits_raw').notNull(),
    credits: numeric('credits', { precision: 6, scale: 2 }).notNull(),
    academicCareerRaw: text('academic_career_raw'),
    recordHash: char('record_hash', { length: 64 }).notNull(),
    ...lifecycleColumns,
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('course_catalog_version_active_unique')
      .on(table.courseId, table.academicYear)
      .where(sql`${table.validToImportRunId} is null`),
    index('course_catalog_version_hash_idx').on(
      table.courseId,
      table.academicYear,
      table.recordHash
    ),
  ]
)

export const courseOffering = pgTable(
  'course_offering',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'restrict' }),
    catalogVersionId: uuid('catalog_version_id')
      .notNull()
      .references(() => courseCatalogVersion.id, { onDelete: 'restrict' }),
    academicYear: text('academic_year').notNull(),
    termKey: text('term_key').notNull(),
    termCodeRaw: text('term_code_raw').notNull(),
    termNameRaw: text('term_name_raw').notNull(),
    recordHash: char('record_hash', { length: 64 }).notNull(),
    ...lifecycleColumns,
    ...auditColumns,
  },
  (table) => [
    check(
      'course_offering_term_check',
      sql`${table.termKey} in ('term-1', 'term-2', 'summer-session')`
    ),
    uniqueIndex('course_offering_active_unique')
      .on(table.courseId, table.academicYear, table.termKey)
      .where(sql`${table.validToImportRunId} is null`),
  ]
)

export const section = pgTable(
  'section',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offeringId: uuid('offering_id')
      .notNull()
      .references(() => courseOffering.id, { onDelete: 'restrict' }),
    sectionKey: text('section_key').notNull(),
    sectionLabelRaw: text('section_label_raw').notNull(),
    classAttributesRaw: text('class_attributes_raw').notNull(),
    capacityRaw: text('capacity_raw').notNull(),
    capacity: integer('capacity').notNull(),
    enrolledRaw: text('enrolled_raw').notNull(),
    enrolled: integer('enrolled').notNull(),
    availableSeatsRaw: text('available_seats_raw').notNull(),
    availableSeats: integer('available_seats').notNull(),
    waitlistCapacityRaw: text('waitlist_capacity_raw').notNull(),
    waitlistCapacity: integer('waitlist_capacity').notNull(),
    waitlistTotalRaw: text('waitlist_total_raw').notNull(),
    waitlistTotal: integer('waitlist_total').notNull(),
    availabilityStatusRaw: text('availability_status_raw').notNull(),
    revisionHash: char('revision_hash', { length: 64 }).notNull(),
    ...lifecycleColumns,
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('section_active_unique')
      .on(table.offeringId, table.sectionKey)
      .where(sql`${table.validToImportRunId} is null`),
    check(
      'section_counts_nonnegative_check',
      sql`${table.capacity} >= 0 and ${table.enrolled} >= 0 and ${table.availableSeats} >= 0 and ${table.waitlistCapacity} >= 0 and ${table.waitlistTotal} >= 0`
    ),
  ]
)

export const meeting = pgTable(
  'meeting',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => section.id, { onDelete: 'restrict' }),
    ordinal: smallint('ordinal').notNull(),
    timeRaw: text('time_raw').notNull(),
    timeStatus: text('time_status').notNull(),
    weekday: smallint('weekday'),
    startTime: time('start_time'),
    endTime: time('end_time'),
    teachingDatesRaw: text('teaching_dates_raw').notNull(),
    locationRaw: text('location_raw').notNull(),
    instructorDisplayRaw: text('instructor_display_raw').notNull(),
  },
  (table) => [
    unique('meeting_section_ordinal_unique').on(table.sectionId, table.ordinal),
    check(
      'meeting_time_status_check',
      sql`${table.timeStatus} in ('parsed', 'unknown')`
    ),
    check(
      'meeting_weekday_check',
      sql`${table.weekday} is null or ${table.weekday} between 1 and 7`
    ),
  ]
)

export const instructor = pgTable('instructor', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayKey: text('display_key').notNull().unique(),
  displayValue: text('display_value').notNull(),
  ...auditColumns,
})

export const sectionInstructor = pgTable(
  'section_instructor',
  {
    sectionId: uuid('section_id')
      .notNull()
      .references(() => section.id, { onDelete: 'restrict' }),
    instructorId: uuid('instructor_id')
      .notNull()
      .references(() => instructor.id, { onDelete: 'restrict' }),
    sourceDisplayRaw: text('source_display_raw').notNull(),
    meetingOrdinals: smallint('meeting_ordinals').array().notNull(),
  },
  (table) => [primaryKey({ columns: [table.sectionId, table.instructorId] })]
)

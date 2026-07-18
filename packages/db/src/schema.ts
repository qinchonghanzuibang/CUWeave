import { sql } from 'drizzle-orm'
import {
  boolean,
  bigserial,
  check,
  char,
  foreignKey,
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

export const catalogCoverage = pgTable(
  'catalog_coverage',
  {
    academicYear: text('academic_year').primaryKey(),
    status: text('status').notNull(),
    upstreamRevision: char('upstream_revision', { length: 40 }).notNull(),
    expectedSubjectCount: integer('expected_subject_count').notNull(),
    discoveredFileCount: integer('discovered_file_count').notNull(),
    importedSubjectCount: integer('imported_subject_count').notNull(),
    courseCount: integer('course_count').notNull(),
    offeringCount: integer('offering_count').notNull(),
    sectionCount: integer('section_count').notNull(),
    instructorCount: integer('instructor_count').notNull(),
    warningCount: integer('warning_count').notNull(),
    report: jsonb('report').notNull(),
    validatedAt: timestamp('validated_at', { withTimezone: true }).notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      'catalog_coverage_status_check',
      sql`${table.status} in ('complete', 'partial')`
    ),
  ]
)

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
    index('course_subject_idx').on(table.subjectCode),
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
    index('course_catalog_title_idx').on(table.title),
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
      sql`${table.termKey} in ('term-1', 'term-2', 'summer-session', 'academic-year')`
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

export const instructor = pgTable(
  'instructor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    displayKey: text('display_key').notNull().unique(),
    displayValue: text('display_value').notNull(),
    ...auditColumns,
  },
  (table) => [index('instructor_display_idx').on(table.displayValue)]
)

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

export const user = pgTable(
  'app_user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: text('role').notNull().default('user'),
    status: text('status').notNull().default('active'),
    verifiedCuhkEmail: boolean('verified_cuhk_email').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('app_user_email_unique').on(sql`lower(${table.email})`),
    check(
      'app_user_role_check',
      sql`${table.role} in ('user', 'moderator', 'admin')`
    ),
    check(
      'app_user_status_check',
      sql`${table.status} in ('active', 'deactivated')`
    ),
  ]
)

export const session = pgTable(
  'auth_session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('auth_session_user_idx').on(table.userId),
    check(
      'auth_session_ip_disabled_check',
      sql`coalesce(${table.ipAddress}, '') = ''`
    ),
  ]
)

export const account = pgTable(
  'auth_account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('auth_account_user_idx').on(table.userId),
    unique('auth_account_provider_unique').on(
      table.providerId,
      table.accountId
    ),
  ]
)

export const verification = pgTable(
  'auth_verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('auth_verification_identifier_idx').on(table.identifier)]
)

export const savedSchedule = pgTable(
  'saved_schedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    version: integer('version').notNull().default(1),
    shareTokenHash: char('share_token_hash', { length: 64 }),
    shareCreatedAt: timestamp('share_created_at', { withTimezone: true }),
    shareRevokedAt: timestamp('share_revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('saved_schedule_user_idx').on(table.userId),
    uniqueIndex('saved_schedule_share_hash_unique')
      .on(table.shareTokenHash)
      .where(sql`${table.shareTokenHash} is not null`),
    check('saved_schedule_version_check', sql`${table.version} > 0`),
    check(
      'saved_schedule_name_check',
      sql`char_length(trim(${table.name})) between 1 and 80`
    ),
  ]
)

export const savedScheduleItem = pgTable(
  'saved_schedule_item',
  {
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => savedSchedule.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => section.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.scheduleId, table.sectionId] }),
    check('saved_schedule_item_position_check', sql`${table.position} >= 0`),
  ]
)

export const courseFavorite = pgTable(
  'course_favorite',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.courseId] })]
)

export const review = pgTable(
  'review',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    offeringId: uuid('offering_id')
      .notNull()
      .references(() => courseOffering.id, { onDelete: 'restrict' }),
    instructorId: uuid('instructor_id').references(() => instructor.id, {
      onDelete: 'restrict',
    }),
    isAnonymous: boolean('is_anonymous').notNull().default(true),
    recommendation: boolean('recommendation'),
    attendanceRequirement: text('attendance_requirement').notNull(),
    assessmentSummary: text('assessment_summary').notNull().default(''),
    body: text('body').notNull(),
    moderationState: text('moderation_state').notNull().default('published'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('review_active_scope_unique')
      .on(
        table.authorId,
        table.offeringId,
        sql`coalesce(${table.instructorId}, '00000000-0000-0000-0000-000000000000'::uuid)`
      )
      .where(sql`${table.deletedAt} is null`),
    index('review_offering_idx').on(table.offeringId),
    check(
      'review_attendance_check',
      sql`${table.attendanceRequirement} in ('required', 'optional', 'unknown')`
    ),
    check(
      'review_moderation_state_check',
      sql`${table.moderationState} in ('published', 'under_review', 'hidden')`
    ),
    check(
      'review_body_length_check',
      sql`char_length(${table.body}) between 20 and 4000`
    ),
    check(
      'review_assessment_length_check',
      sql`char_length(${table.assessmentSummary}) <= 1000`
    ),
  ]
)

export const reviewRating = pgTable(
  'review_rating',
  {
    reviewId: uuid('review_id')
      .notNull()
      .references(() => review.id, { onDelete: 'cascade' }),
    dimension: text('dimension').notNull(),
    value: smallint('value').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.reviewId, table.dimension] }),
    check(
      'review_rating_dimension_check',
      sql`${table.dimension} in ('overall', 'teaching', 'workload', 'difficulty', 'grading', 'usefulness')`
    ),
    check('review_rating_value_check', sql`${table.value} between 1 and 5`),
  ]
)

export const reviewVote = pgTable(
  'review_vote',
  {
    reviewId: uuid('review_id')
      .notNull()
      .references(() => review.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.reviewId, table.userId] }),
    check(
      'review_vote_value_check',
      sql`${table.value} in ('helpful', 'not_helpful')`
    ),
  ]
)

export const reviewReport = pgTable(
  'review_report',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => review.id, { onDelete: 'cascade' }),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    explanation: text('explanation').notNull().default(''),
    status: text('status').notNull().default('open'),
    moderatorId: text('moderator_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    resolutionNotes: text('resolution_notes').notNull().default(''),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('review_report_reporter_unique').on(
      table.reviewId,
      table.reporterId
    ),
    index('review_report_status_idx').on(table.status, table.createdAt),
    check(
      'review_report_category_check',
      sql`${table.category} in ('spam', 'harassment', 'privacy', 'incorrect', 'other')`
    ),
    check(
      'review_report_status_check',
      sql`${table.status} in ('open', 'resolved', 'dismissed')`
    ),
    check(
      'review_report_explanation_check',
      sql`char_length(${table.explanation}) <= 1000`
    ),
    check(
      'review_report_resolution_check',
      sql`char_length(${table.resolutionNotes}) <= 2000`
    ),
  ]
)

export const reviewRevision = pgTable(
  'review_revision',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => review.id, { onDelete: 'cascade' }),
    editorId: text('editor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    snapshot: jsonb('snapshot').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('review_revision_review_idx').on(table.reviewId, table.createdAt),
  ]
)

export const programme = pgTable(
  'programme',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    stream: text('stream').notNull(),
    description: text('description').notNull().default(''),
    active: boolean('active').notNull().default(true),
    ...auditColumns,
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('programme_code_check', sql`${table.code} ~ '^[A-Z0-9-]{2,40}$'`),
  ]
)

export const requirementSet = pgTable(
  'requirement_set',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    programmeId: uuid('programme_id')
      .notNull()
      .references(() => programme.id, { onDelete: 'restrict' }),
    entryYear: integer('entry_year').notNull(),
    effectiveAcademicPeriod: text('effective_academic_period').notNull(),
    sourceRevision: text('source_revision').notNull(),
    version: integer('version').notNull(),
    status: text('status').notNull().default('draft'),
    notes: text('notes').notNull().default(''),
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: text('verified_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    supersedesId: uuid('supersedes_id'),
    ...auditColumns,
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('requirement_set_version_unique').on(
      table.programmeId,
      table.entryYear,
      table.effectiveAcademicPeriod,
      table.sourceRevision,
      table.version
    ),
    index('requirement_set_lookup_idx').on(
      table.programmeId,
      table.entryYear,
      table.status
    ),
    check(
      'requirement_set_status_check',
      sql`${table.status} in ('draft', 'verified', 'superseded', 'archived')`
    ),
    check(
      'requirement_set_entry_year_check',
      sql`${table.entryYear} between 2000 and 2200`
    ),
    check('requirement_set_version_check', sql`${table.version} > 0`),
    foreignKey({
      columns: [table.supersedesId],
      foreignColumns: [table.id],
      name: 'requirement_set_supersedes_fk',
    }).onDelete('restrict'),
  ]
)

export const requirementSource = pgTable(
  'requirement_source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requirementSetId: uuid('requirement_set_id')
      .notNull()
      .references(() => requirementSet.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    sourceRevision: text('source_revision').notNull(),
    effectiveAcademicYear: text('effective_academic_year').notNull(),
    verificationStatus: text('verification_status').notNull(),
    maintainerVerifiedAt: timestamp('maintainer_verified_at', {
      withTimezone: true,
    }),
    explanatoryNote: text('explanatory_note').notNull().default(''),
    ...auditColumns,
  },
  (table) => [
    unique('requirement_source_url_unique').on(
      table.requirementSetId,
      table.url
    ),
    check('requirement_source_https_check', sql`${table.url} like 'https://%'`),
    check(
      'requirement_source_status_check',
      sql`${table.verificationStatus} in ('official', 'maintainer_verified', 'needs_review')`
    ),
  ]
)

export const requirementRuleGroup = pgTable(
  'requirement_rule_group',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requirementSetId: uuid('requirement_set_id')
      .notNull()
      .references(() => requirementSet.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    label: text('label').notNull(),
    operator: text('operator').notNull(),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    index('requirement_group_set_idx').on(
      table.requirementSetId,
      table.position
    ),
    check(
      'requirement_group_operator_check',
      sql`${table.operator} in ('all', 'any')`
    ),
    check('requirement_group_position_check', sql`${table.position} >= 0`),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'requirement_group_parent_fk',
    }).onDelete('cascade'),
  ]
)

export const requirementRule = pgTable(
  'requirement_rule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requirementSetId: uuid('requirement_set_id')
      .notNull()
      .references(() => requirementSet.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => requirementRuleGroup.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    category: text('category').notNull(),
    kind: text('kind').notNull(),
    configuration: jsonb('configuration').notNull(),
    verificationStatus: text('verification_status').notNull().default('draft'),
    maintainerReviewedAt: timestamp('maintainer_reviewed_at', {
      withTimezone: true,
    }),
    explanatoryNote: text('explanatory_note').notNull().default(''),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    index('requirement_rule_group_idx').on(table.groupId, table.position),
    check(
      'requirement_rule_kind_check',
      sql`${table.kind} in ('minimum_course_count', 'minimum_unit_count', 'required_courses', 'choose_n', 'course_allowlist', 'category', 'exclusion', 'no_double_counting', 'manual_review', 'unsupported')`
    ),
    check(
      'requirement_rule_status_check',
      sql`${table.verificationStatus} in ('draft', 'verified', 'needs_review')`
    ),
    check('requirement_rule_position_check', sql`${table.position} >= 0`),
  ]
)

export const requirementRuleSource = pgTable(
  'requirement_rule_source',
  {
    ruleId: uuid('rule_id')
      .notNull()
      .references(() => requirementRule.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => requirementSource.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.ruleId, table.sourceId] })]
)

export const requirementVerificationEvent = pgTable(
  'requirement_verification_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requirementSetId: uuid('requirement_set_id')
      .notNull()
      .references(() => requirementSet.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    eventType: text('event_type').notNull(),
    detail: jsonb('detail').notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    index('requirement_event_set_idx').on(
      table.requirementSetId,
      table.createdAt
    ),
    check(
      'requirement_event_type_check',
      sql`${table.eventType} in ('created', 'source_added', 'rule_added', 'validated', 'verified', 'superseded', 'archived')`
    ),
  ]
)

export const userPlanningProfile = pgTable('user_planning_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  programmeId: uuid('programme_id')
    .notNull()
    .references(() => programme.id, { onDelete: 'restrict' }),
  requirementSetId: uuid('requirement_set_id')
    .notNull()
    .references(() => requirementSet.id, { onDelete: 'restrict' }),
  entryYear: integer('entry_year').notNull(),
  ...auditColumns,
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const userRequirementCourse = pgTable(
  'user_requirement_course',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => course.id, {
      onDelete: 'set null',
    }),
    courseCode: text('course_code').notNull(),
    titleRaw: text('title_raw').notNull().default(''),
    units: numeric('units', { precision: 7, scale: 3 }).notNull(),
    planningStatus: text('planning_status').notNull(),
    origin: text('origin').notNull().default('manual'),
    approvalStatus: text('approval_status').notNull().default('unknown'),
    categories: jsonb('categories').notNull().default([]),
    ...auditColumns,
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('user_requirement_course_unique').on(table.userId, table.courseCode),
    index('user_requirement_course_user_idx').on(table.userId),
    check(
      'user_requirement_course_code_check',
      sql`${table.courseCode} ~ '^[A-Z]{4}[0-9A-Z]{4,5}$'`
    ),
    check(
      'user_requirement_course_status_check',
      sql`${table.planningStatus} in ('completed', 'planned')`
    ),
    check(
      'user_requirement_course_origin_check',
      sql`${table.origin} in ('manual', 'favorite', 'schedule')`
    ),
    check(
      'user_requirement_course_approval_check',
      sql`${table.approvalStatus} in ('approved', 'unknown', 'rejected')`
    ),
    check('user_requirement_course_units_check', sql`${table.units} >= 0`),
  ]
)

export const rateLimitEvent = pgTable(
  'rate_limit_event',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    scope: text('scope').notNull(),
    keyHash: char('key_hash', { length: 64 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('rate_limit_lookup_idx').on(
      table.scope,
      table.keyHash,
      table.occurredAt
    ),
    index('rate_limit_expiry_idx').on(table.expiresAt),
    check('rate_limit_hash_check', sql`${table.keyHash} ~ '^[0-9a-f]{64}$'`),
  ]
)

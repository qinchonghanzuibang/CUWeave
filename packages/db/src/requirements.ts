import type {
  RequirementCourse,
  RequirementRule,
  RequirementRuleGroup,
  RequirementSetDefinition,
  RequirementSetStatus,
} from '@cuweave/requirements'
import { validateRequirementSet } from '@cuweave/requirements'
import type { PoolClient } from 'pg'

import { getDatabaseConnection } from './client'
import { ProductDataError, type UserRole } from './product'

export interface ProgrammeRequirementOption {
  programmeId: string
  programmeCode: string
  programmeName: string
  stream: string
  requirementSetId: string
  entryYear: number
  effectiveAcademicPeriod: string
  version: number
  status: RequirementSetStatus
  notes: string
}

function assertAdmin(role: UserRole) {
  if (role !== 'admin')
    throw new ProductDataError('forbidden', 'Administrator access is required.')
}

export async function listProgrammeRequirements(): Promise<
  ProgrammeRequirementOption[]
> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    programme_id: string
    programme_code: string
    programme_name: string
    stream: string
    requirement_set_id: string
    entry_year: number
    effective_academic_period: string
    version: number
    status: RequirementSetStatus
    notes: string
  }>(
    `select p.id::text as programme_id, p.code as programme_code,
       p.name as programme_name, p.stream, rs.id::text as requirement_set_id,
       rs.entry_year, rs.effective_academic_period, rs.version, rs.status, rs.notes
     from programme p join requirement_set rs on rs.programme_id = p.id
     where p.active and rs.status <> 'archived'
     order by p.name, rs.entry_year desc,
       case rs.status when 'verified' then 0 when 'draft' then 1 else 2 end,
       rs.version desc`
  )
  return result.rows.map((row) => ({
    programmeId: row.programme_id,
    programmeCode: row.programme_code,
    programmeName: row.programme_name,
    stream: row.stream,
    requirementSetId: row.requirement_set_id,
    entryYear: row.entry_year,
    effectiveAcademicPeriod: row.effective_academic_period,
    version: row.version,
    status: row.status,
    notes: row.notes,
  }))
}

type SourceRow = {
  id: string
  title: string
  url: string
  source_revision: string
  effective_academic_year: string
  verification_status: 'official' | 'maintainer_verified' | 'needs_review'
  maintainer_verified_at: Date | null
  explanatory_note: string
}

function buildGroup(
  groupId: string,
  groups: Map<
    string,
    {
      id: string
      parentId: string | null
      label: string
      operator: 'all' | 'any'
    }
  >,
  rules: Map<string, RequirementRule[]>
): RequirementRuleGroup {
  const group = groups.get(groupId)
  if (!group) throw new Error('Requirement group is missing.')
  return {
    id: group.id,
    label: group.label,
    operator: group.operator,
    rules: rules.get(group.id) ?? [],
    groups: [...groups.values()]
      .filter((candidate) => candidate.parentId === group.id)
      .map((candidate) => buildGroup(candidate.id, groups, rules)),
  }
}

export async function getRequirementDefinition(
  requirementSetId: string
): Promise<RequirementSetDefinition | null> {
  const { pool } = getDatabaseConnection()
  const setResult = await pool.query<{
    id: string
    programme_code: string
    entry_year: number
    effective_academic_period: string
    source_revision: string
    version: number
    status: RequirementSetStatus
  }>(
    `select rs.id::text, p.code as programme_code, rs.entry_year,
       rs.effective_academic_period, rs.source_revision, rs.version, rs.status
     from requirement_set rs join programme p on p.id = rs.programme_id
     where rs.id = $1`,
    [requirementSetId]
  )
  const set = setResult.rows[0]
  if (!set) return null
  const [sourceResult, groupResult, ruleResult] = await Promise.all([
    pool.query<SourceRow>(
      `select id::text, title, url, source_revision, effective_academic_year,
         verification_status, maintainer_verified_at, explanatory_note
       from requirement_source where requirement_set_id = $1 order by created_at, id`,
      [requirementSetId]
    ),
    pool.query<{
      id: string
      parent_id: string | null
      label: string
      operator: 'all' | 'any'
    }>(
      `select id::text, parent_id::text, label, operator
       from requirement_rule_group where requirement_set_id = $1
       order by position, id`,
      [requirementSetId]
    ),
    pool.query<{
      id: string
      group_id: string
      label: string
      category: string
      kind: RequirementRule['type']
      configuration: Record<string, unknown>
      explanatory_note: string
      source_ids: string[]
    }>(
      `select r.id::text, r.group_id::text, r.label, r.category, r.kind,
         r.configuration, r.explanatory_note,
         coalesce(array_agg(rs.source_id::text order by rs.source_id)
           filter (where rs.source_id is not null), '{}') as source_ids
       from requirement_rule r
       left join requirement_rule_source rs on rs.rule_id = r.id
       where r.requirement_set_id = $1
       group by r.id order by r.position, r.id`,
      [requirementSetId]
    ),
  ])
  const groups = new Map(
    groupResult.rows.map((row) => [
      row.id,
      {
        id: row.id,
        parentId: row.parent_id,
        label: row.label,
        operator: row.operator,
      },
    ])
  )
  const rules = new Map<string, RequirementRule[]>()
  for (const row of ruleResult.rows) {
    const entries = rules.get(row.group_id) ?? []
    entries.push({
      ...row.configuration,
      id: row.id,
      label: row.label,
      category: row.category,
      sourceIds: row.source_ids,
      ...(row.explanatory_note
        ? { explanatoryNote: row.explanatory_note }
        : {}),
      type: row.kind,
    } as RequirementRule)
    rules.set(row.group_id, entries)
  }
  const roots = [...groups.values()].filter((group) => !group.parentId)
  if (roots.length !== 1)
    throw new Error('Requirement set must have one root group.')
  return {
    id: set.id,
    programmeCode: set.programme_code,
    entryYear: set.entry_year,
    effectiveAcademicPeriod: set.effective_academic_period,
    sourceRevision: set.source_revision,
    version: set.version,
    status: set.status,
    sources: sourceResult.rows.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      revision: source.source_revision,
      effectiveAcademicYear: source.effective_academic_year,
      verificationStatus: source.verification_status,
      maintainerVerifiedAt:
        source.maintainer_verified_at?.toISOString() ?? null,
      note: source.explanatory_note,
    })),
    root: buildGroup(roots[0]!.id, groups, rules),
  }
}

export async function listRequirementCourses(
  userId: string
): Promise<RequirementCourse[]> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query<{
    code: string
    units: string
    planning_status: 'completed' | 'planned'
    approval_status: 'approved' | 'unknown' | 'rejected'
    categories: string[]
    origin: 'manual' | 'favorite' | 'schedule'
  }>(
    `with selected as (
       select course_code as code, units::text, planning_status, approval_status,
         categories, origin, 0 as priority
       from user_requirement_course where user_id = $1
       union all
       select c.subject_code || c.catalog_number, cv.credits::text, 'planned',
         'unknown', '[]'::jsonb, 'favorite', 1
       from course_favorite f join course c on c.id = f.course_id
       join course_catalog_version cv on cv.course_id = c.id
         and cv.valid_to_import_run_id is null where f.user_id = $1
       union all
       select c.subject_code || c.catalog_number, cv.credits::text, 'planned',
         'unknown', '[]'::jsonb, 'schedule', 2
       from saved_schedule s join saved_schedule_item si on si.schedule_id = s.id
       join section se on se.id = si.section_id
       join course_offering co on co.id = se.offering_id
       join course c on c.id = co.course_id
       join course_catalog_version cv on cv.id = co.catalog_version_id
       where s.user_id = $1
     )
     select distinct on (code) code, units, planning_status, approval_status,
       categories, origin from selected order by code, priority`,
    [userId]
  )
  return result.rows.map((row) => ({
    code: row.code,
    units: row.units,
    planningStatus: row.planning_status,
    approvalStatus: row.approval_status,
    categories: row.categories,
    origin: row.origin,
  }))
}

export async function saveRequirementSelection(
  userId: string,
  input: {
    programmeId: string
    requirementSetId: string
    entryYear: number
    courses: RequirementCourse[]
  }
): Promise<void> {
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const set = await client.query<{ valid: boolean }>(
      `select exists(
         select 1 from requirement_set where id = $1 and programme_id = $2
           and entry_year = $3 and status <> 'archived'
       ) as valid`,
      [input.requirementSetId, input.programmeId, input.entryYear]
    )
    if (!set.rows[0]?.valid)
      throw new ProductDataError(
        'invalid',
        'Programme, entry year, and requirement set do not match.'
      )
    await client.query(
      `insert into user_planning_profile
         (user_id, programme_id, requirement_set_id, entry_year)
       values ($1, $2, $3, $4)
       on conflict (user_id) do update set programme_id = excluded.programme_id,
         requirement_set_id = excluded.requirement_set_id,
         entry_year = excluded.entry_year, updated_at = now()`,
      [userId, input.programmeId, input.requirementSetId, input.entryYear]
    )
    await client.query(
      `delete from user_requirement_course where user_id = $1 and origin = 'manual'`,
      [userId]
    )
    for (const course of input.courses.filter(
      (item) => item.origin === 'manual'
    )) {
      await client.query(
        `insert into user_requirement_course
          (user_id, course_code, units, planning_status, origin,
           approval_status, categories)
         values ($1, $2, $3, $4, 'manual', $5, $6::jsonb)`,
        [
          userId,
          course.code.toUpperCase().replace(/\s+/g, ''),
          course.units,
          course.planningStatus,
          course.approvalStatus,
          JSON.stringify(course.categories),
        ]
      )
    }
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

async function audit(
  client: PoolClient,
  setId: string,
  actorId: string,
  eventType: string,
  detail: Record<string, unknown> = {}
) {
  await client.query(
    `insert into requirement_verification_event
       (requirement_set_id, actor_id, event_type, detail)
     values ($1, $2, $3, $4::jsonb)`,
    [setId, actorId, eventType, JSON.stringify(detail)]
  )
}

export async function createDraftRequirementSet(
  actor: { id: string; role: UserRole },
  input: {
    programmeId: string
    entryYear: number
    effectiveAcademicPeriod: string
    sourceRevision: string
    notes: string
  }
): Promise<string> {
  assertAdmin(actor.role)
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const versionResult = await client.query<{ version: number }>(
      `select coalesce(max(version), 0) + 1 as version from requirement_set
       where programme_id = $1 and entry_year = $2`,
      [input.programmeId, input.entryYear]
    )
    const result = await client.query<{ id: string }>(
      `insert into requirement_set
        (programme_id, entry_year, effective_academic_period, source_revision,
         version, status, notes, created_by)
       values ($1, $2, $3, $4, $5, 'draft', $6, $7) returning id::text`,
      [
        input.programmeId,
        input.entryYear,
        input.effectiveAcademicPeriod,
        input.sourceRevision,
        versionResult.rows[0]!.version,
        input.notes,
        actor.id,
      ]
    )
    const id = result.rows[0]!.id
    await client.query(
      `insert into requirement_rule_group
         (requirement_set_id, label, operator, position)
       values ($1, 'All requirements', 'all', 0)`,
      [id]
    )
    await audit(client, id, actor.id, 'created')
    await client.query('commit')
    return id
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function addRequirementSource(
  actor: { id: string; role: UserRole },
  setId: string,
  input: {
    title: string
    url: string
    sourceRevision: string
    effectiveAcademicYear: string
    explanatoryNote: string
  }
): Promise<void> {
  assertAdmin(actor.role)
  if (!input.url.startsWith('https://'))
    throw new ProductDataError('invalid', 'Source URL must use HTTPS.')
  const { pool } = getDatabaseConnection()
  await pool.query(
    `with inserted as (
       insert into requirement_source
        (requirement_set_id, title, url, source_revision,
         effective_academic_year, verification_status, explanatory_note)
       values ($1, $2, $3, $4, $5, 'needs_review', $6) returning id
     )
     insert into requirement_verification_event
       (requirement_set_id, actor_id, event_type, detail)
     select $1, $7, 'source_added', jsonb_build_object('sourceId', id) from inserted`,
    [
      setId,
      input.title,
      input.url,
      input.sourceRevision,
      input.effectiveAcademicYear,
      input.explanatoryNote,
      actor.id,
    ]
  )
}

export async function addRequirementRule(
  actor: { id: string; role: UserRole },
  setId: string,
  input: Omit<RequirementRule, 'id'>
): Promise<void> {
  assertAdmin(actor.role)
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const root = await client.query<{ id: string }>(
      `select id::text from requirement_rule_group
       where requirement_set_id = $1 and parent_id is null order by position limit 1`,
      [setId]
    )
    if (!root.rows[0])
      throw new ProductDataError(
        'invalid',
        'Requirement root group is missing.'
      )
    const {
      label,
      category,
      sourceIds,
      explanatoryNote,
      type,
      ...configuration
    } = input
    const validSources = await client.query<{ count: string }>(
      `select count(*)::text as count from requirement_source
       where requirement_set_id = $1 and id = any($2::uuid[])`,
      [setId, sourceIds]
    )
    if (Number(validSources.rows[0]?.count ?? 0) !== new Set(sourceIds).size)
      throw new ProductDataError(
        'invalid',
        'Every rule source must belong to the same requirement set.'
      )
    const inserted = await client.query<{ id: string }>(
      `insert into requirement_rule
        (requirement_set_id, group_id, label, category, kind, configuration,
         verification_status, explanatory_note, position)
       values ($1, $2, $3, $4, $5, $6::jsonb, 'draft', $7,
         (select count(*) from requirement_rule where group_id = $2))
       returning id::text`,
      [
        setId,
        root.rows[0].id,
        label,
        category,
        type,
        JSON.stringify(configuration),
        explanatoryNote ?? '',
      ]
    )
    for (const sourceId of sourceIds)
      await client.query(
        `insert into requirement_rule_source (rule_id, source_id) values ($1, $2)`,
        [inserted.rows[0]!.id, sourceId]
      )
    await audit(client, setId, actor.id, 'rule_added', {
      ruleId: inserted.rows[0]!.id,
      type,
    })
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function verifyRequirementSource(
  actor: { id: string; role: UserRole },
  setId: string,
  sourceId: string
): Promise<void> {
  assertAdmin(actor.role)
  const { pool } = getDatabaseConnection()
  const result = await pool.query(
    `update requirement_source set verification_status = 'maintainer_verified',
       maintainer_verified_at = now()
     where id = $1 and requirement_set_id = $2`,
    [sourceId, setId]
  )
  if (result.rowCount !== 1)
    throw new ProductDataError('not_found', 'Requirement source not found.')
  await pool.query(
    `insert into requirement_verification_event
       (requirement_set_id, actor_id, event_type, detail)
     values ($1, $2, 'validated', $3::jsonb)`,
    [setId, actor.id, JSON.stringify({ sourceId, sourceVerified: true })]
  )
}

export async function validateRequirementSetForAdmin(
  actor: { id: string; role: UserRole },
  setId: string
): Promise<string[]> {
  assertAdmin(actor.role)
  const definition = await getRequirementDefinition(setId)
  const errors = definition
    ? validateRequirementSet(definition)
    : ['Set not found.']
  const { pool } = getDatabaseConnection()
  await pool.query(
    `insert into requirement_verification_event
       (requirement_set_id, actor_id, event_type, detail)
     values ($1, $2, 'validated', $3::jsonb)`,
    [setId, actor.id, JSON.stringify({ errors })]
  )
  return errors
}

export async function verifyRequirementSet(
  actor: { id: string; role: UserRole },
  setId: string
): Promise<void> {
  assertAdmin(actor.role)
  const errors = await validateRequirementSetForAdmin(actor, setId)
  if (errors.length) throw new ProductDataError('invalid', errors.join(' '))
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const sources = await client.query<{ count: string }>(
      `select count(*)::text as count from requirement_source
       where requirement_set_id = $1
         and (verification_status = 'needs_review' or maintainer_verified_at is null)`,
      [setId]
    )
    if (Number(sources.rows[0]?.count ?? 0) > 0)
      throw new ProductDataError(
        'invalid',
        'Every official source must be maintainer-verified first.'
      )
    const updated = await client.query(
      `update requirement_set set status = 'verified', verified_at = now(),
         verified_by = $2, updated_at = now()
       where id = $1 and status = 'draft'`,
      [setId, actor.id]
    )
    if (updated.rowCount !== 1)
      throw new ProductDataError(
        'conflict',
        'Only a draft set can be verified.'
      )
    await client.query(
      `update requirement_rule set verification_status = 'verified',
         maintainer_reviewed_at = now()
       where requirement_set_id = $1`,
      [setId]
    )
    await audit(client, setId, actor.id, 'verified')
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function supersedeRequirementSet(
  actor: { id: string; role: UserRole },
  oldSetId: string,
  replacementSetId: string
): Promise<void> {
  assertAdmin(actor.role)
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const replacement = await client.query<{ status: string }>(
      `select status from requirement_set where id = $1`,
      [replacementSetId]
    )
    if (replacement.rows[0]?.status !== 'verified')
      throw new ProductDataError('invalid', 'Replacement set must be verified.')
    const updated = await client.query(
      `update requirement_set set status = 'superseded', updated_at = now()
       where id = $1 and status = 'verified'`,
      [oldSetId]
    )
    if (updated.rowCount !== 1)
      throw new ProductDataError(
        'conflict',
        'Only a verified set can be superseded.'
      )
    await client.query(
      `update requirement_set set supersedes_id = $2 where id = $1`,
      [replacementSetId, oldSetId]
    )
    await audit(client, oldSetId, actor.id, 'superseded', {
      replacementSetId,
    })
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

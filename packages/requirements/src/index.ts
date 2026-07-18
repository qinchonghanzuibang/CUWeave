export type RequirementSetStatus =
  'draft' | 'verified' | 'superseded' | 'archived'
export type EvaluationStatus = 'satisfied' | 'unsatisfied' | 'uncertain'
export type CourseApprovalStatus = 'approved' | 'unknown' | 'rejected'

export interface RequirementSourceReference {
  id: string
  title: string
  url: string
  revision: string
  effectiveAcademicYear: string
  verificationStatus: 'official' | 'maintainer_verified' | 'needs_review'
  maintainerVerifiedAt: string | null
  note: string
}

export interface RequirementCourse {
  code: string
  units: string
  planningStatus: 'completed' | 'planned'
  approvalStatus: CourseApprovalStatus
  categories: string[]
  origin?: 'manual' | 'favorite' | 'schedule'
}

export interface CourseFilter {
  courseCodes?: string[]
  subjects?: string[]
  minimumLevel?: number
  categories?: string[]
  approvalRequired?: boolean
}

interface RuleBase {
  id: string
  label: string
  category: string
  sourceIds: string[]
  explanatoryNote?: string
}

export type RequirementRule =
  | (RuleBase & {
      type: 'minimum_course_count'
      minimum: number
      filter?: CourseFilter
    })
  | (RuleBase & {
      type: 'minimum_unit_count'
      minimumUnits: string
      filter?: CourseFilter
    })
  | (RuleBase & {
      type: 'required_courses'
      courseCodes: string[]
      approvalRequired?: boolean
    })
  | (RuleBase & {
      type: 'choose_n'
      count: number
      courseCodes: string[]
      approvalRequired?: boolean
    })
  | (RuleBase & {
      type: 'course_allowlist'
      minimumCount: number
      courseCodes?: string[]
      subjects?: string[]
      approvalRequired?: boolean
    })
  | (RuleBase & {
      type: 'category'
      categoryName: string
      minimumCourses?: number
      minimumUnits?: string
      approvalRequired?: boolean
    })
  | (RuleBase & {
      type: 'exclusion'
      forbiddenCourses: string[]
    })
  | (RuleBase & {
      type: 'no_double_counting'
      acrossCategories?: string[]
    })
  | (RuleBase & {
      type: 'manual_review'
      reason: string
    })
  | (RuleBase & {
      type: 'unsupported'
      reason: string
    })

export type RequirementRuleInput = RequirementRule extends infer Rule
  ? Rule extends RequirementRule
    ? Omit<Rule, 'id' | 'label' | 'category' | 'sourceIds'>
    : never
  : never

export interface RequirementRuleGroup {
  id: string
  label: string
  operator: 'all' | 'any'
  rules: RequirementRule[]
  groups: RequirementRuleGroup[]
}

export interface RequirementSetDefinition {
  id: string
  programmeCode: string
  entryYear: number
  effectiveAcademicPeriod: string
  sourceRevision: string
  version: number
  status: RequirementSetStatus
  sources: RequirementSourceReference[]
  root: RequirementRuleGroup
}

export interface RequirementMissing {
  courses?: string[]
  count?: number
  units?: string
}

export interface RequirementRuleResult {
  kind: 'rule'
  ruleId: string
  label: string
  category: string
  status: EvaluationStatus
  explanation: string
  contributingCourses: string[]
  missing: RequirementMissing
  sources: RequirementSourceReference[]
  requirementSetVersion: number
  uncertaintyReason?: string
}

export interface RequirementGroupResult {
  kind: 'group'
  groupId: string
  label: string
  operator: 'all' | 'any'
  status: EvaluationStatus
  explanation: string
  contributingCourses: string[]
  missing: RequirementMissing
  sources: RequirementSourceReference[]
  requirementSetVersion: number
  uncertaintyReason?: string
  children: Array<RequirementRuleResult | RequirementGroupResult>
}

export interface RequirementEvaluation {
  status: EvaluationStatus
  reliable: boolean
  requirementSetId: string
  requirementSetVersion: number
  programmeCode: string
  entryYear: number
  explanation: string
  sources: RequirementSourceReference[]
  result: RequirementGroupResult
}

const UNIT_SCALE = 1000n

function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/\s+/g, '')
}

function parseUnits(value: string): bigint | null {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(value.trim())
  if (!match) return null
  const whole = BigInt(match[1] ?? '0')
  const fraction = BigInt((match[2] ?? '').padEnd(3, '0'))
  return whole * UNIT_SCALE + fraction
}

function formatUnits(value: bigint): string {
  const whole = value / UNIT_SCALE
  const fraction = (value % UNIT_SCALE).toString().padStart(3, '0')
  return `${whole}.${fraction}`
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1')
}

function courseLevel(code: string): number | null {
  const match = /^[A-Z]{4}(\d)/.exec(code)
  return match ? Number(match[1]) * 1000 : null
}

function matchesFilter(course: RequirementCourse, filter: CourseFilter = {}) {
  const code = normalizeCode(course.code)
  const subject = code.slice(0, 4)
  const allowCodes = filter.courseCodes?.map(normalizeCode)
  const allowSubjects = filter.subjects?.map((value) => value.toUpperCase())
  return (
    (!allowCodes || allowCodes.includes(code)) &&
    (!allowSubjects || allowSubjects.includes(subject)) &&
    (!filter.minimumLevel || (courseLevel(code) ?? 0) >= filter.minimumLevel) &&
    (!filter.categories ||
      filter.categories.some((category) =>
        course.categories.includes(category)
      ))
  )
}

function splitApproval(
  courses: RequirementCourse[],
  approvalRequired: boolean
): { eligible: RequirementCourse[]; pending: RequirementCourse[] } {
  if (!approvalRequired) return { eligible: courses, pending: [] }
  return {
    eligible: courses.filter((course) => course.approvalStatus === 'approved'),
    pending: courses.filter((course) => course.approvalStatus === 'unknown'),
  }
}

function uniqueCodes(courses: RequirementCourse[]): string[] {
  return [
    ...new Set(courses.map((course) => normalizeCode(course.code))),
  ].sort()
}

function sourcesFor(
  sourceIds: string[],
  sourceMap: Map<string, RequirementSourceReference>
): RequirementSourceReference[] {
  return sourceIds
    .map((id) => sourceMap.get(id))
    .filter((source): source is RequirementSourceReference => Boolean(source))
}

function result(
  rule: RequirementRule,
  definition: RequirementSetDefinition,
  sourceMap: Map<string, RequirementSourceReference>,
  values: Omit<
    RequirementRuleResult,
    | 'kind'
    | 'ruleId'
    | 'label'
    | 'category'
    | 'sources'
    | 'requirementSetVersion'
  >
): RequirementRuleResult {
  return {
    kind: 'rule',
    ruleId: rule.id,
    label: rule.label,
    category: rule.category,
    sources: sourcesFor(rule.sourceIds, sourceMap),
    requirementSetVersion: definition.version,
    ...values,
  }
}

function evaluateRule(
  rule: RequirementRule,
  courses: RequirementCourse[],
  definition: RequirementSetDefinition,
  sourceMap: Map<string, RequirementSourceReference>,
  duplicateCodes: string[]
): RequirementRuleResult {
  if (rule.type === 'manual_review' || rule.type === 'unsupported')
    return result(rule, definition, sourceMap, {
      status: 'uncertain',
      explanation: rule.reason,
      uncertaintyReason: rule.reason,
      contributingCourses: [],
      missing: {},
    })

  if (rule.type === 'no_double_counting') {
    const categoryConflicts = courses
      .filter((course) => {
        const categories = rule.acrossCategories
          ? course.categories.filter((category) =>
              rule.acrossCategories?.includes(category)
            )
          : course.categories
        return new Set(categories).size > 1
      })
      .map((course) => normalizeCode(course.code))
    const conflicts = [
      ...new Set([...duplicateCodes, ...categoryConflicts]),
    ].sort()
    return result(rule, definition, sourceMap, {
      status: conflicts.length ? 'unsatisfied' : 'satisfied',
      explanation: conflicts.length
        ? `${conflicts.join(', ')} would be counted more than once.`
        : 'No selected course is counted more than once.',
      contributingCourses: conflicts,
      missing: {},
    })
  }

  if (rule.type === 'exclusion') {
    const forbidden = new Set(rule.forbiddenCourses.map(normalizeCode))
    const present = uniqueCodes(
      courses.filter((course) => forbidden.has(normalizeCode(course.code)))
    )
    return result(rule, definition, sourceMap, {
      status: present.length ? 'unsatisfied' : 'satisfied',
      explanation: present.length
        ? `Excluded course selection: ${present.join(', ')}.`
        : 'No excluded course is selected.',
      contributingCourses: present,
      missing: {},
    })
  }

  if (rule.type === 'required_courses') {
    const selected = new Map(
      courses.map((course) => [normalizeCode(course.code), course])
    )
    const required = rule.courseCodes.map(normalizeCode)
    const missing = required.filter((code) => !selected.has(code))
    const pending = required.filter(
      (code) =>
        rule.approvalRequired &&
        selected.get(code)?.approvalStatus === 'unknown'
    )
    const status: EvaluationStatus = missing.length
      ? 'unsatisfied'
      : pending.length
        ? 'uncertain'
        : 'satisfied'
    return result(rule, definition, sourceMap, {
      status,
      explanation:
        status === 'satisfied'
          ? 'Every required course is selected.'
          : status === 'uncertain'
            ? `Approval remains unknown for ${pending.join(', ')}.`
            : `Missing required courses: ${missing.join(', ')}.`,
      contributingCourses: required.filter((code) => selected.has(code)),
      missing: { courses: missing },
      ...(status === 'uncertain'
        ? { uncertaintyReason: 'Course approval has not been confirmed.' }
        : {}),
    })
  }

  let candidates: RequirementCourse[] = []
  let minimumCount: number | undefined
  let minimumUnits: string | undefined
  let approvalRequired = false

  if (rule.type === 'minimum_course_count') {
    candidates = courses.filter((course) => matchesFilter(course, rule.filter))
    minimumCount = rule.minimum
    approvalRequired = rule.filter?.approvalRequired ?? false
  } else if (rule.type === 'minimum_unit_count') {
    candidates = courses.filter((course) => matchesFilter(course, rule.filter))
    minimumUnits = rule.minimumUnits
    approvalRequired = rule.filter?.approvalRequired ?? false
  } else if (rule.type === 'choose_n') {
    const allowed = new Set(rule.courseCodes.map(normalizeCode))
    candidates = courses.filter((course) =>
      allowed.has(normalizeCode(course.code))
    )
    minimumCount = rule.count
    approvalRequired = rule.approvalRequired ?? false
  } else if (rule.type === 'course_allowlist') {
    candidates = courses.filter((course) =>
      matchesFilter(course, {
        ...(rule.courseCodes ? { courseCodes: rule.courseCodes } : {}),
        ...(rule.subjects ? { subjects: rule.subjects } : {}),
      })
    )
    minimumCount = rule.minimumCount
    approvalRequired = rule.approvalRequired ?? false
  } else if (rule.type === 'category') {
    candidates = courses.filter((course) =>
      course.categories.includes(rule.categoryName)
    )
    minimumCount = rule.minimumCourses
    minimumUnits = rule.minimumUnits
    approvalRequired = rule.approvalRequired ?? false
  }

  const { eligible, pending } = splitApproval(candidates, approvalRequired)
  const eligibleCodes = uniqueCodes(eligible)
  const pendingCodes = uniqueCodes(pending)
  const countMissing = minimumCount
    ? Math.max(0, minimumCount - eligibleCodes.length)
    : 0
  const requiredUnits = minimumUnits ? parseUnits(minimumUnits) : null
  const eligibleUnits = eligible.reduce(
    (sum, course) => sum + (parseUnits(course.units) ?? 0n),
    0n
  )
  const pendingUnits = pending.reduce(
    (sum, course) => sum + (parseUnits(course.units) ?? 0n),
    0n
  )
  const unitMissing = requiredUnits
    ? requiredUnits > eligibleUnits
      ? requiredUnits - eligibleUnits
      : 0n
    : 0n
  const countSatisfied = !minimumCount || eligibleCodes.length >= minimumCount
  const unitsSatisfied =
    requiredUnits === null || eligibleUnits >= requiredUnits
  const possiblySatisfied =
    (!minimumCount ||
      eligibleCodes.length + pendingCodes.length >= minimumCount) &&
    (requiredUnits === null || eligibleUnits + pendingUnits >= requiredUnits)
  const status: EvaluationStatus =
    countSatisfied && unitsSatisfied
      ? 'satisfied'
      : approvalRequired && possiblySatisfied
        ? 'uncertain'
        : 'unsatisfied'
  const missing: RequirementMissing = {}
  if (countMissing) missing.count = countMissing
  if (unitMissing) missing.units = formatUnits(unitMissing)
  return result(rule, definition, sourceMap, {
    status,
    explanation:
      status === 'satisfied'
        ? `${eligibleCodes.length} qualifying courses contribute ${formatUnits(eligibleUnits)} units.`
        : status === 'uncertain'
          ? `${pendingCodes.join(', ')} may contribute after formal approval.`
          : `More qualifying work is needed${countMissing ? `: ${countMissing} course(s)` : ''}${unitMissing ? `: ${formatUnits(unitMissing)} units` : ''}.`,
    contributingCourses: eligibleCodes,
    missing,
    ...(status === 'uncertain'
      ? { uncertaintyReason: 'One or more selected courses require approval.' }
      : {}),
  })
}

function combine(
  operator: 'all' | 'any',
  statuses: EvaluationStatus[]
): EvaluationStatus {
  if (operator === 'all') {
    if (statuses.includes('unsatisfied')) return 'unsatisfied'
    if (statuses.includes('uncertain')) return 'uncertain'
    return 'satisfied'
  }
  if (statuses.includes('satisfied')) return 'satisfied'
  if (statuses.includes('uncertain')) return 'uncertain'
  return 'unsatisfied'
}

function evaluateGroup(
  group: RequirementRuleGroup,
  courses: RequirementCourse[],
  definition: RequirementSetDefinition,
  sourceMap: Map<string, RequirementSourceReference>,
  duplicateCodes: string[]
): RequirementGroupResult {
  const children: Array<RequirementRuleResult | RequirementGroupResult> = [
    ...group.rules.map((rule) =>
      evaluateRule(rule, courses, definition, sourceMap, duplicateCodes)
    ),
    ...group.groups.map((child) =>
      evaluateGroup(child, courses, definition, sourceMap, duplicateCodes)
    ),
  ]
  const status = combine(
    group.operator,
    children.map((child) => child.status)
  )
  const sources = [
    ...new Map(
      children
        .flatMap((child) => child.sources)
        .map((source) => [source.id, source])
    ).values(),
  ]
  return {
    kind: 'group',
    groupId: group.id,
    label: group.label,
    operator: group.operator,
    status,
    explanation: `${group.operator === 'all' ? 'All' : 'At least one'} child requirement must be satisfied; current result is ${status}.`,
    contributingCourses: [
      ...new Set(children.flatMap((child) => child.contributingCourses)),
    ].sort(),
    missing: {},
    sources,
    requirementSetVersion: definition.version,
    ...(status === 'uncertain'
      ? { uncertaintyReason: 'A child requirement cannot yet be determined.' }
      : {}),
    children,
  }
}

export function validateRequirementSet(
  definition: RequirementSetDefinition
): string[] {
  const errors: string[] = []
  const sourceIds = new Set(definition.sources.map((source) => source.id))
  if (!definition.sources.length)
    errors.push('At least one source is required.')
  for (const source of definition.sources) {
    try {
      if (new URL(source.url).protocol !== 'https:') throw new Error()
    } catch {
      errors.push(`Source ${source.id} must use a valid HTTPS URL.`)
    }
  }
  const ruleIds = new Set<string>()
  const groupIds = new Set<string>()
  function visit(group: RequirementRuleGroup) {
    if (groupIds.has(group.id)) errors.push(`Duplicate group id: ${group.id}.`)
    groupIds.add(group.id)
    if (!group.rules.length && !group.groups.length)
      errors.push(`Group ${group.id} cannot be empty.`)
    for (const rule of group.rules) {
      if (ruleIds.has(rule.id)) errors.push(`Duplicate rule id: ${rule.id}.`)
      ruleIds.add(rule.id)
      if (!rule.sourceIds.length)
        errors.push(`Rule ${rule.id} must reference a source.`)
      for (const id of rule.sourceIds)
        if (!sourceIds.has(id))
          errors.push(`Rule ${rule.id} references unknown source ${id}.`)
      if (rule.type === 'minimum_course_count' && rule.minimum < 1)
        errors.push(`Rule ${rule.id} minimum must be positive.`)
      if (rule.type === 'choose_n' && rule.count < 1)
        errors.push(`Rule ${rule.id} count must be positive.`)
      if (
        rule.type === 'course_allowlist' &&
        (rule.minimumCount < 1 ||
          (!rule.courseCodes?.length && !rule.subjects?.length))
      )
        errors.push(
          `Rule ${rule.id} allowlist needs a positive count and at least one course or subject.`
        )
      if (
        rule.type === 'minimum_unit_count' &&
        parseUnits(rule.minimumUnits) === null
      )
        errors.push(`Rule ${rule.id} units are invalid.`)
      if (
        rule.type === 'category' &&
        (!rule.categoryName ||
          (rule.minimumCourses === undefined &&
            rule.minimumUnits === undefined) ||
          (rule.minimumCourses !== undefined && rule.minimumCourses < 1) ||
          (rule.minimumUnits !== undefined &&
            parseUnits(rule.minimumUnits) === null))
      )
        errors.push(`Rule ${rule.id} category configuration is invalid.`)
      if (rule.type === 'required_courses' && rule.courseCodes.length === 0)
        errors.push(`Rule ${rule.id} must name a required course.`)
    }
    group.groups.forEach(visit)
  }
  visit(definition.root)
  return errors
}

export function evaluateRequirements(
  definition: RequirementSetDefinition,
  inputCourses: RequirementCourse[]
): RequirementEvaluation {
  const errors = validateRequirementSet(definition)
  if (errors.length) throw new Error(errors.join(' '))
  const occurrence = new Map<string, number>()
  for (const course of inputCourses) {
    const code = normalizeCode(course.code)
    occurrence.set(code, (occurrence.get(code) ?? 0) + 1)
  }
  const duplicateCodes = [...occurrence]
    .filter(([, count]) => count > 1)
    .map(([code]) => code)
  const courses = [
    ...new Map(
      inputCourses.map((course) => [
        normalizeCode(course.code),
        { ...course, code: normalizeCode(course.code) },
      ])
    ).values(),
  ]
  const sourceMap = new Map(
    definition.sources.map((source) => [source.id, source])
  )
  const result = evaluateGroup(
    definition.root,
    courses,
    definition,
    sourceMap,
    duplicateCodes
  )
  return {
    status: result.status,
    reliable: definition.status === 'verified',
    requirementSetId: definition.id,
    requirementSetVersion: definition.version,
    programmeCode: definition.programmeCode,
    entryYear: definition.entryYear,
    explanation:
      definition.status === 'verified'
        ? result.explanation
        : `This ${definition.status} requirement set is not verified. ${result.explanation}`,
    sources: result.sources,
    result,
  }
}

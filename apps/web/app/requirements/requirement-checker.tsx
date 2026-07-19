'use client'

import type { ProgrammeRequirementOption } from '@cuweave/db'
import {
  evaluateRequirements,
  type RequirementCourse,
  type RequirementGroupResult,
  type RequirementRuleResult,
  type RequirementSetDefinition,
} from '@cuweave/requirements'
import { useMemo, useState } from 'react'

function statusStyle(status: 'satisfied' | 'unsatisfied' | 'uncertain') {
  return status === 'satisfied'
    ? 'border-emerald-800/20 bg-emerald-50 text-emerald-900'
    : status === 'unsatisfied'
      ? 'border-red-800/20 bg-red-50 text-red-900'
      : 'border-amber-800/20 bg-amber-50 text-amber-950'
}

function ResultCard({
  result,
  depth = 0,
}: {
  result: RequirementRuleResult | RequirementGroupResult
  depth?: number
}) {
  return (
    <div className={depth ? 'mt-3 border-l-2 border-purple-950/10 pl-4' : ''}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{result.label}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {result.explanation}
          </p>
          {result.uncertaintyReason ? (
            <p className="mt-2 text-sm font-semibold text-amber-900">
              Uncertainty: {result.uncertaintyReason}
            </p>
          ) : null}
          {result.contributingCourses.length ? (
            <p className="mt-2 text-xs text-slate-500">
              Contributing: {result.contributingCourses.join(', ')}
            </p>
          ) : null}
        </div>
        <span
          className={`rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.04em] ${statusStyle(result.status)}`}
        >
          {result.status}
        </span>
      </div>
      {'children' in result
        ? result.children.map((child) => (
            <ResultCard
              depth={depth + 1}
              key={`${child.kind}-${child.kind === 'rule' ? child.ruleId : child.groupId}`}
              result={child}
            />
          ))
        : null}
    </div>
  )
}

export function RequirementChecker({
  definition,
  courses: initialCourses,
  options,
  selected,
  signedIn,
}: {
  definition: RequirementSetDefinition
  courses: RequirementCourse[]
  options: ProgrammeRequirementOption[]
  selected: ProgrammeRequirementOption
  signedIn: boolean
}) {
  const [courses, setCourses] = useState(initialCourses)
  const [enabled, setEnabled] = useState(
    () => new Set(initialCourses.map((c) => c.code))
  )
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const evaluation = useMemo(
    () =>
      evaluateRequirements(
        definition,
        courses.filter((course) => enabled.has(course.code))
      ),
    [courses, definition, enabled]
  )

  function addManual(form: FormData) {
    const codeValue = form.get('code')
    const unitsValue = form.get('units')
    const code = (typeof codeValue === 'string' ? codeValue : '')
      .toUpperCase()
      .replace(/\s+/g, '')
    const units = (typeof unitsValue === 'string' ? unitsValue : '').trim()
    const planningStatus =
      form.get('status') === 'completed' ? 'completed' : 'planned'
    if (
      !/^[A-Z]{4}[0-9A-Z]{4,5}$/.test(code) ||
      !/^\d+(?:\.\d{1,3})?$/.test(units)
    ) {
      setMessage(
        'Enter a course code such as IERG5001 and a non-negative unit value.'
      )
      return
    }
    const course: RequirementCourse = {
      code,
      units,
      planningStatus,
      approvalStatus: 'unknown',
      categories: [],
      origin: 'manual',
    }
    setCourses((current) => [
      ...current.filter((item) => item.code !== code),
      course,
    ])
    setEnabled((current) => new Set([...current, code]))
    setMessage(
      'Manual course added locally. Save to keep it with your account.'
    )
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/v1/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programmeId: selected.programmeId,
        requirementSetId: selected.requirementSetId,
        entryYear: selected.entryYear,
        courses,
      }),
    })
    setSaving(false)
    setMessage(
      response.ok ? 'Requirement plan saved.' : 'The plan could not be saved.'
    )
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[21rem_1fr]">
      <aside className="space-y-5">
        <section className="panel p-5">
          <label className="field-label" htmlFor="requirement-set">
            Programme and entry year
          </label>
          <select
            className="field mt-2"
            id="requirement-set"
            onChange={(event) =>
              location.assign(`/requirements?set=${event.target.value}`)
            }
            value={selected.requirementSetId}
          >
            {options.map((option) => (
              <option
                key={option.requirementSetId}
                value={option.requirementSetId}
              >
                {option.programmeName} · {option.entryYear}
              </option>
            ))}
          </select>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.04em] ${selected.status === 'verified' ? 'border-emerald-800/20 bg-emerald-50 text-emerald-900' : 'border-amber-800/20 bg-amber-50 text-amber-950'}`}
            >
              {selected.status}
            </span>
            <span className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
              v{selected.version} · {selected.effectiveAcademicPeriod}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {selected.notes}
          </p>
        </section>

        <section className="panel p-5">
          <h2 className="font-semibold">Courses in this check</h2>
          <div className="mt-4 space-y-2">
            {courses.length ? (
              courses.map((course) => (
                <label
                  className="flex items-start gap-3 rounded-xl bg-white/70 p-3 text-sm"
                  key={course.code}
                >
                  <input
                    checked={enabled.has(course.code)}
                    className="mt-1"
                    onChange={(event) =>
                      setEnabled((current) => {
                        const next = new Set(current)
                        if (event.target.checked) next.add(course.code)
                        else next.delete(course.code)
                        return next
                      })
                    }
                    type="checkbox"
                  />
                  <span>
                    <strong>{course.code}</strong> · {course.units} units
                    <br />
                    <span className="text-xs text-slate-500">
                      {course.planningStatus} · {course.origin ?? 'manual'} ·
                      approval {course.approvalStatus}
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                No favorites, schedule courses, or manual courses selected.
              </p>
            )}
          </div>
        </section>

        <form action={addManual} className="panel p-5">
          <h2 className="font-semibold">Add a planned or completed course</h2>
          <div className="mt-4 grid gap-3">
            <label className="field-label">
              Course code
              <input
                className="field mt-1"
                name="code"
                placeholder="IERG5001"
                required
              />
            </label>
            <label className="field-label">
              Units
              <input
                className="field mt-1"
                name="units"
                placeholder="3"
                required
              />
            </label>
            <label className="field-label">
              Status
              <select className="field mt-1" name="status">
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <button className="button-secondary" type="submit">
              Add to check
            </button>
          </div>
        </form>
        {signedIn ? (
          <button
            className="button-primary w-full"
            disabled={saving}
            onClick={() => void save()}
            type="button"
          >
            {saving ? 'Saving…' : 'Save requirement plan'}
          </button>
        ) : null}
        {message ? (
          <p aria-live="polite" className="text-sm text-slate-600">
            {message}
          </p>
        ) : null}
      </aside>

      <div className="space-y-6">
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Current result
              </p>
              <h2 className="mt-1 font-display text-3xl font-medium capitalize">
                {evaluation.status}
              </h2>
            </div>
            <span
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.04em] ${statusStyle(evaluation.status)}`}
            >
              {evaluation.reliable ? 'Source-verified' : 'Not reliable yet'}
            </span>
          </div>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            {evaluation.explanation}
          </p>
        </section>
        <section className="panel p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Category progress
          </p>
          <div className="mt-5">
            <ResultCard result={evaluation.result} />
          </div>
        </section>
        <section className="panel p-5 sm:p-6">
          <h2 className="font-display text-xl font-medium">
            Official sources and interpretation notes
          </h2>
          <div className="mt-4 space-y-4">
            {definition.sources.map((source) => (
              <article
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4"
                key={source.id}
              >
                <a
                  className="text-link"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.title}
                </a>
                <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                  {source.effectiveAcademicYear} · {source.verificationStatus} ·{' '}
                  {source.revision}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {source.note}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

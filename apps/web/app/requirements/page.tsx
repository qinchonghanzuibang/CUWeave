import {
  getRequirementDefinition,
  listProgrammeRequirements,
  listRequirementCourses,
  type ProgrammeRequirementOption,
} from '@cuweave/db'
import type {
  RequirementCourse,
  RequirementSetDefinition,
} from '@cuweave/requirements'
import Link from 'next/link'

import { getViewer } from '../../lib/session'
import { RequirementChecker } from './requirement-checker'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Requirement checker · CUWeave',
  description:
    'Review draft, source-backed requirement checks with unsupported and uncertain rules shown explicitly.',
}
export const revalidate = 0

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>
}) {
  const viewer = await getViewer()
  let options: ProgrammeRequirementOption[] = []
  let selected: ProgrammeRequirementOption | undefined
  let definition: RequirementSetDefinition | null = null
  let courses: RequirementCourse[] = []
  try {
    options = await listProgrammeRequirements()
    const requested = (await searchParams).set
    selected =
      options.find((option) => option.requirementSetId === requested) ??
      options[0]
    definition = selected
      ? await getRequirementDefinition(selected.requirementSetId)
      : null
    courses = viewer ? await listRequirementCourses(viewer.id) : []
  } catch {
    return (
      <main className="page-shell py-16">
        <div className="rounded-2xl border border-amber-900/20 bg-amber-50 p-6 text-amber-950">
          Requirement data is temporarily unavailable. No completion result can
          be calculated safely.
        </div>
      </main>
    )
  }
  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Explainable planning check</span>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
        <div>
          <h1 className="page-title !text-[clamp(2.5rem,7vw,4.7rem)]">
            See what is clear—and what still needs confirmation.
          </h1>
          <p className="page-lead mt-5">
            Compare completed and planned courses against source-linked
            programme rules. Unverified, ambiguous, or approval-dependent
            details stay uncertain.
          </p>
        </div>
        <aside className="rounded-2xl border border-amber-900/15 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950">
          Planning aid only. CUSIS and your Division remain authoritative for
          enrollment and graduation decisions.
        </aside>
      </div>
      {selected && definition ? (
        <RequirementChecker
          courses={courses}
          definition={definition}
          options={options}
          selected={selected}
          signedIn={Boolean(viewer)}
        />
      ) : (
        <section className="panel mt-10 p-6">
          <h2 className="text-xl font-black">No requirement set is loaded.</h2>
          <p className="mt-2 text-sm text-slate-600">
            A maintainer must run the idempotent requirement seed after the
            database migration. No academic rule is inferred automatically.
          </p>
        </section>
      )}
      {!viewer ? (
        <p className="mt-6 text-sm text-slate-600">
          <Link className="font-bold text-purple-800 underline" href="/sign-in">
            Sign in
          </Link>{' '}
          to combine favorites, cloud schedules, and manual course choices.
        </p>
      ) : null}
    </main>
  )
}
import type { Metadata } from 'next'

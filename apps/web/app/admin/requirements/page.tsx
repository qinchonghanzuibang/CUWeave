import {
  addRequirementRule,
  addRequirementSource,
  createDraftRequirementSet,
  getRequirementDefinition,
  listProgrammeRequirements,
  supersedeRequirementSet,
  validateRequirementSetForAdmin,
  verifyRequirementSet,
  verifyRequirementSource,
} from '@cuweave/db'
import type { RequirementRule } from '@cuweave/requirements'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'

import { getViewer } from '../../../lib/session'

export const dynamic = 'force-dynamic'

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

async function admin() {
  const viewer = await getViewer()
  if (!viewer) redirect('/sign-in')
  if (viewer.role !== 'admin') notFound()
  return viewer
}

export default async function RequirementAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string; result?: string }>
}) {
  const viewer = await admin()
  const options = await listProgrammeRequirements()
  const query = await searchParams
  const selected =
    options.find((item) => item.requirementSetId === query.set) ?? options[0]
  const definition = selected
    ? await getRequirementDefinition(selected.requirementSetId)
    : null

  async function createDraft(form: FormData) {
    'use server'
    const actor = await admin()
    const id = await createDraftRequirementSet(actor, {
      programmeId: field(form, 'programmeId'),
      entryYear: Number(form.get('entryYear')),
      effectiveAcademicPeriod: field(form, 'period'),
      sourceRevision: field(form, 'revision'),
      notes: field(form, 'notes'),
    })
    redirect(`/admin/requirements?set=${id}`)
  }

  async function addSource(form: FormData) {
    'use server'
    const actor = await admin()
    await addRequirementSource(actor, field(form, 'setId'), {
      title: field(form, 'title'),
      url: field(form, 'url'),
      sourceRevision: field(form, 'revision'),
      effectiveAcademicYear: field(form, 'year'),
      explanatoryNote: field(form, 'note'),
    })
    revalidatePath('/admin/requirements')
  }

  async function reviewSource(form: FormData) {
    'use server'
    const actor = await admin()
    await verifyRequirementSource(
      actor,
      field(form, 'setId'),
      field(form, 'sourceId')
    )
    revalidatePath('/admin/requirements')
  }

  async function addRule(form: FormData) {
    'use server'
    const actor = await admin()
    const kind = field(form, 'kind') as RequirementRule['type']
    const configuration = JSON.parse(field(form, 'configuration')) as Record<
      string,
      unknown
    >
    await addRequirementRule(actor, field(form, 'setId'), {
      ...configuration,
      type: kind,
      label: field(form, 'label'),
      category: field(form, 'category'),
      sourceIds: field(form, 'sourceIds')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
      explanatoryNote: field(form, 'note'),
    })
    revalidatePath('/admin/requirements')
  }

  async function validateSet(form: FormData) {
    'use server'
    const actor = await admin()
    const setId = field(form, 'setId')
    const errors = await validateRequirementSetForAdmin(actor, setId)
    redirect(
      `/admin/requirements?set=${setId}&result=${encodeURIComponent(errors.length ? errors.join(' ') : 'Structure valid')}`
    )
  }

  async function verifySet(form: FormData) {
    'use server'
    const actor = await admin()
    const setId = field(form, 'setId')
    await verifyRequirementSet(actor, setId)
    redirect(`/admin/requirements?set=${setId}&result=Verified`)
  }

  async function supersedeSet(form: FormData) {
    'use server'
    const actor = await admin()
    await supersedeRequirementSet(
      actor,
      field(form, 'oldSetId'),
      field(form, 'replacementSetId')
    )
    revalidatePath('/admin/requirements')
  }

  return (
    <main className="page-shell py-10 sm:py-14">
      <span className="eyebrow">Administrator · audited publishing</span>
      <h1 className="page-title mt-4 !text-[clamp(2.4rem,7vw,4.3rem)]">
        Requirement source desk.
      </h1>
      <p className="page-lead mt-4">
        Create narrow structured drafts, attach official sources, validate them,
        and record deliberate verification or supersession. This is not a
        general CMS.
      </p>
      {query.result ? (
        <p className="mt-5 rounded-xl bg-purple-50 p-4 text-sm font-bold text-purple-900">
          {query.result}
        </p>
      ) : null}

      <div className="mt-9 grid gap-6 lg:grid-cols-2">
        <form action={createDraft} className="panel p-6">
          <h2 className="text-xl font-black">Create draft set</h2>
          <div className="mt-4 grid gap-3">
            <label className="field-label">
              Programme
              <select className="field mt-1" name="programmeId" required>
                {[
                  ...new Map(
                    options.map((option) => [option.programmeId, option])
                  ).values(),
                ].map((option) => (
                  <option key={option.programmeId} value={option.programmeId}>
                    {option.programmeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Entry year
              <input
                className="field mt-1"
                min="2000"
                name="entryYear"
                required
                type="number"
              />
            </label>
            <label className="field-label">
              Effective period
              <input
                className="field mt-1"
                name="period"
                placeholder="2026-27"
                required
              />
            </label>
            <label className="field-label">
              Source revision
              <input className="field mt-1" name="revision" required />
            </label>
            <label className="field-label">
              Notes
              <textarea className="field mt-1" name="notes" required />
            </label>
            <button className="button-primary" type="submit">
              Create audited draft
            </button>
          </div>
        </form>

        <section className="panel p-6">
          <label className="field-label" htmlFor="admin-set">
            Working set
          </label>
          <form method="get">
            <select
              className="field mt-2"
              defaultValue={selected?.requirementSetId}
              id="admin-set"
              name="set"
            >
              {options.map((option) => (
                <option
                  key={option.requirementSetId}
                  value={option.requirementSetId}
                >
                  {option.programmeName} · {option.entryYear} · {option.status}{' '}
                  v{option.version}
                </option>
              ))}
            </select>
            <button className="button-secondary mt-3" type="submit">
              Open set
            </button>
          </form>
          <p className="mt-4 text-sm text-slate-600">
            Open a set directly with <code>?set=&lt;id&gt;</code>. Publishing is
            refused until structure and source verification pass.
          </p>
          {selected ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <form action={validateSet}>
                <input
                  name="setId"
                  type="hidden"
                  value={selected.requirementSetId}
                />
                <button className="button-secondary" type="submit">
                  Validate structure
                </button>
              </form>
              <form action={verifySet}>
                <input
                  name="setId"
                  type="hidden"
                  value={selected.requirementSetId}
                />
                <button className="button-primary" type="submit">
                  Mark verified
                </button>
              </form>
            </div>
          ) : null}
        </section>

        {selected ? (
          <>
            <form action={addSource} className="panel p-6">
              <input
                name="setId"
                type="hidden"
                value={selected.requirementSetId}
              />
              <h2 className="text-xl font-black">Add official source</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="field"
                  name="title"
                  placeholder="Source title"
                  required
                />
                <input
                  className="field"
                  name="url"
                  placeholder="https://…"
                  required
                  type="url"
                />
                <input
                  className="field"
                  name="revision"
                  placeholder="Revision or reviewed date"
                  required
                />
                <input
                  className="field"
                  name="year"
                  placeholder="Effective academic year"
                  required
                />
                <textarea
                  className="field"
                  name="note"
                  placeholder="Interpretation note"
                  required
                />
                <button className="button-primary" type="submit">
                  Add source as needs review
                </button>
              </div>
            </form>

            <form action={addRule} className="panel p-6">
              <input
                name="setId"
                type="hidden"
                value={selected.requirementSetId}
              />
              <h2 className="text-xl font-black">Add structured rule</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="field"
                  name="label"
                  placeholder="Rule label"
                  required
                />
                <input
                  className="field"
                  name="category"
                  placeholder="Category"
                  required
                />
                <select className="field" name="kind">
                  {[
                    'minimum_course_count',
                    'minimum_unit_count',
                    'required_courses',
                    'choose_n',
                    'course_allowlist',
                    'category',
                    'exclusion',
                    'no_double_counting',
                    'manual_review',
                    'unsupported',
                  ].map((kind) => (
                    <option key={kind}>{kind}</option>
                  ))}
                </select>
                <textarea
                  className="field font-mono text-xs"
                  name="configuration"
                  placeholder={'{"minimum":4}'}
                  required
                />
                <input
                  className="field"
                  name="sourceIds"
                  placeholder="Comma-separated source UUIDs"
                  required
                />
                <textarea
                  className="field"
                  name="note"
                  placeholder="Interpretation note"
                />
                <button className="button-primary" type="submit">
                  Add rule
                </button>
              </div>
            </form>

            <section className="panel p-6 lg:col-span-2">
              <h2 className="text-xl font-black">Sources in working set</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {definition?.sources.map((source) => (
                  <article className="rounded-xl border p-4" key={source.id}>
                    <p className="font-black">{source.title}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {source.id}
                    </p>
                    <p className="mt-2 text-sm">{source.verificationStatus}</p>
                    {source.verificationStatus === 'needs_review' ? (
                      <form action={reviewSource} className="mt-3">
                        <input
                          name="setId"
                          type="hidden"
                          value={selected.requirementSetId}
                        />
                        <input
                          name="sourceId"
                          type="hidden"
                          value={source.id}
                        />
                        <button className="button-secondary" type="submit">
                          Record maintainer verification
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <form action={supersedeSet} className="panel p-6 lg:col-span-2">
              <h2 className="text-xl font-black">Supersede verified set</h2>
              <p className="mt-2 text-sm text-slate-600">
                The replacement must already be verified. Both changes and the
                actor are recorded transactionally.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  className="field"
                  name="oldSetId"
                  placeholder="Old verified set UUID"
                  required
                />
                <input
                  className="field"
                  name="replacementSetId"
                  placeholder="Replacement verified set UUID"
                  required
                />
              </div>
              <button className="button-danger mt-4" type="submit">
                Supersede old set
              </button>
            </form>
          </>
        ) : null}
      </div>
      <p className="mt-8 text-xs text-slate-500">
        Signed in as {viewer.email}. Verification is a maintainer attestation,
        not automated interpretation.
      </p>
    </main>
  )
}

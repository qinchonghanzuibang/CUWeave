'use client'

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'

import {
  addPlannerSection,
  getPlannerServerSnapshot,
  getPlannerSnapshot,
  parsePlannerSnapshot,
  removePlannerSection,
  subscribePlanner,
} from '../../../lib/planner-store'

export function AddSectionButton({ sectionId }: { sectionId: string }) {
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
  const stored = useSyncExternalStore(
    subscribePlanner,
    getPlannerSnapshot,
    getPlannerServerSnapshot
  )
  const selected = useMemo(
    () => parsePlannerSnapshot(stored).includes(sectionId),
    [sectionId, stored]
  )

  if (!hydrated)
    return (
      <span className="button-secondary" aria-live="polite">
        Checking planner…
      </span>
    )

  return selected ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link className="button-secondary" href="/planner">
        Added to planner
      </Link>
      <button
        className="button-danger"
        onClick={() => removePlannerSection(sectionId)}
        type="button"
      >
        Remove from planner
      </button>
    </div>
  ) : (
    <button
      className="button-primary"
      onClick={() => addPlannerSection(sectionId)}
      type="button"
    >
      Add to planner
    </button>
  )
}

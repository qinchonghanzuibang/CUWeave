import { parseSchedule, serializeSchedule, STORAGE_KEY } from '@cuweave/planner'

export const PLANNER_CHANGED_EVENT = 'cuweave:planner-changed'

type PlannerWindow = Pick<
  Window,
  'addEventListener' | 'dispatchEvent' | 'localStorage' | 'removeEventListener'
>

function plannerWindow(): PlannerWindow | null {
  return typeof window === 'undefined' ? null : window
}

export function getPlannerSnapshot(): string {
  return plannerWindow()?.localStorage.getItem(STORAGE_KEY) ?? ''
}

export function getPlannerServerSnapshot(): string {
  return ''
}

export function getPlannerSectionIds(): string[] {
  return parsePlannerSnapshot(getPlannerSnapshot())
}

export function parsePlannerSnapshot(snapshot: string): string[] {
  return parseSchedule(snapshot).sectionIds
}

export function subscribePlanner(notify: () => void): () => void {
  const target = plannerWindow()
  if (!target) return () => undefined

  const onStorage = (event: Event) => {
    const key = (event as StorageEvent).key
    if (key === null || key === STORAGE_KEY) notify()
  }
  target.addEventListener('storage', onStorage)
  target.addEventListener(PLANNER_CHANGED_EVENT, notify)
  return () => {
    target.removeEventListener('storage', onStorage)
    target.removeEventListener(PLANNER_CHANGED_EVENT, notify)
  }
}

export function replacePlannerSections(sectionIds: string[]): string[] {
  const target = plannerWindow()
  const normalized = parseSchedule(serializeSchedule(sectionIds)).sectionIds
  if (!target) return normalized

  const serialized = serializeSchedule(normalized)
  if (target.localStorage.getItem(STORAGE_KEY) !== serialized) {
    target.localStorage.setItem(STORAGE_KEY, serialized)
    target.dispatchEvent(new Event(PLANNER_CHANGED_EVENT))
  }
  return normalized
}

export function addPlannerSection(sectionId: string): string[] {
  return replacePlannerSections([...getPlannerSectionIds(), sectionId])
}

export function removePlannerSection(sectionId: string): string[] {
  return replacePlannerSections(
    getPlannerSectionIds().filter((candidate) => candidate !== sectionId)
  )
}

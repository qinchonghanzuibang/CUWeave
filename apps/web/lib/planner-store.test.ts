import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addPlannerSection,
  getPlannerSectionIds,
  PLANNER_CHANGED_EVENT,
  removePlannerSection,
  replacePlannerSections,
  subscribePlanner,
} from './planner-store'

class MemoryStorage {
  private values = new Map<string, string>()

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

describe('planner browser store', () => {
  let events: EventTarget
  let storage: MemoryStorage

  beforeEach(() => {
    events = new EventTarget()
    storage = new MemoryStorage()
    vi.stubGlobal('window', {
      addEventListener: events.addEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
      localStorage: storage,
      removeEventListener: events.removeEventListener.bind(events),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('detects persisted selections after serialization and reload', () => {
    replacePlannerSections(['section-a'])
    expect(getPlannerSectionIds()).toEqual(['section-a'])
  })

  it('adds idempotently and normalizes duplicate persisted ids', () => {
    storage.setItem(
      'cuweave.planner.v1',
      '{"version":1,"sectionIds":["section-a","section-a"]}'
    )
    addPlannerSection('section-a')
    expect(getPlannerSectionIds()).toEqual(['section-a'])
  })

  it('removes only the exact section and keeps same-course sections distinct', () => {
    replacePlannerSections(['course-a-section-1', 'course-a-section-2'])
    removePlannerSection('course-a-section-1')
    expect(getPlannerSectionIds()).toEqual(['course-a-section-2'])
  })

  it('keeps section identities from different terms distinct', () => {
    replacePlannerSections(['term-1-section', 'term-2-section'])
    expect(getPlannerSectionIds()).toEqual(['term-1-section', 'term-2-section'])
  })

  it('notifies same-tab subscribers after a real update', () => {
    const notify = vi.fn()
    const unsubscribe = subscribePlanner(notify)
    addPlannerSection('section-a')
    addPlannerSection('section-a')
    expect(notify).toHaveBeenCalledTimes(1)
    unsubscribe()
    events.dispatchEvent(new Event(PLANNER_CHANGED_EVENT))
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('handles cross-tab storage updates', () => {
    const notify = vi.fn()
    subscribePlanner(notify)
    storage.setItem(
      'cuweave.planner.v1',
      '{"version":1,"sectionIds":["other-tab"]}'
    )
    const event = new Event('storage')
    Object.defineProperty(event, 'key', { value: 'cuweave.planner.v1' })
    events.dispatchEvent(event)
    expect(notify).toHaveBeenCalledOnce()
    expect(getPlannerSectionIds()).toEqual(['other-tab'])
  })

  it('safely recovers invalid localStorage on the next mutation', () => {
    storage.setItem('cuweave.planner.v1', 'not-json')
    expect(getPlannerSectionIds()).toEqual([])
    addPlannerSection('section-a')
    expect(getPlannerSectionIds()).toEqual(['section-a'])
  })
})

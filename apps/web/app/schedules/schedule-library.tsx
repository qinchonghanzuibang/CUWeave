'use client'

import type { SavedScheduleRecord } from '@cuweave/db'
import { useState } from 'react'

import {
  getPlannerSectionIds,
  replacePlannerSections,
} from '../../lib/planner-store'

const CLOUD_SCHEDULE_KEY = 'cuweave:cloud-schedule-id'

export function ScheduleLibrary({
  initial,
}: {
  initial: SavedScheduleRecord[]
}) {
  const [schedules, setSchedules] = useState(initial)
  const [name, setName] = useState('My timetable')
  const [message, setMessage] = useState('')

  async function refresh() {
    const response = await fetch('/api/v1/schedules', { cache: 'no-store' })
    const data = (await response.json()) as {
      schedules?: SavedScheduleRecord[]
    }
    if (response.ok) setSchedules(data.schedules ?? [])
  }

  async function create(importLocal: boolean) {
    const sectionIds = importLocal ? getPlannerSectionIds() : []
    const response = await fetch('/api/v1/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sectionIds }),
    })
    const data = (await response.json()) as { error?: string }
    setMessage(
      response.ok
        ? 'Schedule created.'
        : (data.error ?? 'Schedule could not be created.')
    )
    if (response.ok) await refresh()
  }

  async function rename(schedule: SavedScheduleRecord) {
    const next = prompt('Schedule name', schedule.name)
    if (!next) return
    const response = await fetch(`/api/v1/schedules/${schedule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: next, version: schedule.version }),
    })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    setMessage(
      response.ok ? 'Schedule renamed.' : (data.error ?? 'Rename failed.')
    )
    await refresh()
  }

  async function duplicate(id: string) {
    await fetch(`/api/v1/schedules/${id}/duplicate`, { method: 'POST' })
    await refresh()
  }

  async function remove(id: string) {
    if (!confirm('Delete this cloud schedule?')) return
    await fetch(`/api/v1/schedules/${id}`, { method: 'DELETE' })
    await refresh()
  }

  async function share(schedule: SavedScheduleRecord) {
    if (schedule.shared) {
      await fetch(`/api/v1/schedules/${schedule.id}/share`, {
        method: 'DELETE',
      })
      setMessage('Share link revoked.')
    } else {
      const response = await fetch(`/api/v1/schedules/${schedule.id}/share`, {
        method: 'POST',
      })
      const data = (await response.json()) as {
        sharePath?: string
        error?: string
      }
      if (data.sharePath) {
        await navigator.clipboard
          .writeText(`${location.origin}${data.sharePath}`)
          .catch(() => undefined)
        setMessage(`Read-only link ready: ${data.sharePath}`)
      } else setMessage(data.error ?? 'Share link could not be created.')
    }
    await refresh()
  }

  function loadLocally(schedule: SavedScheduleRecord) {
    replacePlannerSections(schedule.sectionIds)
    localStorage.setItem(CLOUD_SCHEDULE_KEY, schedule.id)
    location.assign('/planner')
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="panel grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label>
          <span className="field-label">New schedule name</span>
          <input
            className="field mt-2"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <button
          className="button-secondary"
          onClick={() => void create(false)}
          type="button"
        >
          Create empty
        </button>
        <button
          className="button-primary"
          onClick={() => void create(true)}
          type="button"
        >
          Import local planner
        </button>
      </section>
      {message ? (
        <p className="status-banner status-info" role="status">
          {message}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {schedules.map((schedule) => (
          <article className="panel p-5" key={schedule.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-medium">
                  {schedule.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {schedule.sectionIds.length} sections · version{' '}
                  {schedule.version}
                </p>
              </div>
              {schedule.shared ? <span className="eyebrow">Shared</span> : null}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Updated {new Date(schedule.updatedAt).toLocaleString('en-HK')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="button-primary"
                onClick={() => loadLocally(schedule)}
                type="button"
              >
                Open in planner
              </button>
              <button
                className="button-secondary"
                onClick={() => void rename(schedule)}
                type="button"
              >
                Rename
              </button>
              <button
                className="button-secondary"
                onClick={() => void duplicate(schedule.id)}
                type="button"
              >
                Duplicate
              </button>
              <button
                className="button-secondary"
                onClick={() => void share(schedule)}
                type="button"
              >
                {schedule.shared ? 'Revoke share' : 'Share'}
              </button>
              <button
                className="button-danger"
                onClick={() => void remove(schedule.id)}
                type="button"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {!schedules.length ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-9 text-center text-[var(--text-secondary)]">
            No cloud schedules yet. Import the timetable already in this
            browser.
          </div>
        ) : null}
      </div>
    </div>
  )
}

'use client'

import { parseSchedule, serializeSchedule, STORAGE_KEY } from '@cuweave/planner'
import Link from 'next/link'
import { useState } from 'react'

export function AddSectionButton({ sectionId }: { sectionId: string }) {
  const [added, setAdded] = useState(false)

  function add() {
    const schedule = parseSchedule(window.localStorage.getItem(STORAGE_KEY))
    if (!schedule.sectionIds.includes(sectionId)) {
      window.localStorage.setItem(
        STORAGE_KEY,
        serializeSchedule([...schedule.sectionIds, sectionId])
      )
      window.dispatchEvent(new Event('cuweave:planner-changed'))
    }
    setAdded(true)
  }

  return added ? (
    <Link
      className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-900"
      href="/planner"
    >
      Added · View planner
    </Link>
  ) : (
    <button
      className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
      onClick={add}
      type="button"
    >
      Add to planner
    </button>
  )
}

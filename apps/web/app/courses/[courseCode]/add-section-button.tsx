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
    <Link className="button-secondary" href="/planner">
      Added · View planner
    </Link>
  ) : (
    <button className="button-primary" onClick={add} type="button">
      Add to planner
    </button>
  )
}

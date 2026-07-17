'use client'

import { useState } from 'react'

export function FavoriteButton({
  courseId,
  initial,
  signedIn,
}: {
  courseId: string
  initial: boolean
  signedIn: boolean
}) {
  const [favorite, setFavoriteState] = useState(initial)
  const [pending, setPending] = useState(false)

  async function toggle() {
    if (!signedIn) {
      location.assign('/sign-in')
      return
    }
    setPending(true)
    const next = !favorite
    const response = await fetch('/api/v1/favorites', {
      method: next ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    })
    if (response.ok) setFavoriteState(next)
    setPending(false)
  }

  return (
    <button
      aria-pressed={favorite}
      className={favorite ? 'button-primary' : 'button-secondary'}
      disabled={pending}
      onClick={() => void toggle()}
      type="button"
    >
      {favorite ? '★ Favorited' : '☆ Favorite'}
    </button>
  )
}

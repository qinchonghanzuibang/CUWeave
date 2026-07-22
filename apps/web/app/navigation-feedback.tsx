'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { NAVIGATION_START_EVENT } from '../lib/navigation-feedback'

const MINIMUM_VISIBLE_MS = 240
const FINISHING_MS = 180
const NAVIGATION_TIMEOUT_MS = 12_000

type Phase = 'idle' | 'loading' | 'finishing'

function isEligibleNavigation(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return false

  const target = event.target
  if (!(target instanceof Element)) return false
  const anchor = target.closest<HTMLAnchorElement>('a[href]')
  if (
    !anchor ||
    anchor.hasAttribute('download') ||
    (anchor.target && anchor.target !== '_self')
  )
    return false

  const destination = new URL(anchor.href, window.location.href)
  const current = new URL(window.location.href)
  if (
    destination.origin !== current.origin ||
    !['http:', 'https:'].includes(destination.protocol)
  )
    return false

  return !(
    destination.pathname === current.pathname &&
    destination.search === current.search
  )
}

function isEligibleGetForm(event: SubmitEvent) {
  if (event.defaultPrevented) return false
  const form = event.target
  if (!(form instanceof HTMLFormElement)) return false
  if ((form.method || 'get').toLowerCase() !== 'get') return false
  const destination = new URL(form.action || window.location.href)
  return destination.origin === window.location.origin
}

export function NavigationFeedback() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const [phase, setPhase] = useState<Phase>('idle')
  const startedAtRef = useRef(0)
  const routeKeyRef = useRef(routeKey)
  const finishTimerRef = useRef<number | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    for (const timer of [
      finishTimerRef.current,
      idleTimerRef.current,
      timeoutRef.current,
    ])
      if (timer !== null) window.clearTimeout(timer)
    finishTimerRef.current = null
    idleTimerRef.current = null
    timeoutRef.current = null
  }, [])

  const finish = useCallback(() => {
    if (!startedAtRef.current) return
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null

    const elapsed = performance.now() - startedAtRef.current
    finishTimerRef.current = window.setTimeout(
      () => {
        setPhase('finishing')
        document.documentElement.dataset.navigation = 'settling'
        idleTimerRef.current = window.setTimeout(() => {
          startedAtRef.current = 0
          setPhase('idle')
          delete document.documentElement.dataset.navigation
        }, FINISHING_MS)
      },
      Math.max(0, MINIMUM_VISIBLE_MS - elapsed)
    )
  }, [])

  const start = useCallback(() => {
    clearTimers()
    startedAtRef.current = performance.now()
    setPhase('loading')
    document.documentElement.dataset.navigation = 'loading'
    timeoutRef.current = window.setTimeout(finish, NAVIGATION_TIMEOUT_MS)
  }, [clearTimers, finish])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isEligibleNavigation(event)) start()
    }
    function onSubmit(event: SubmitEvent) {
      if (isEligibleGetForm(event)) start()
    }
    function onPopState() {
      start()
    }

    document.addEventListener('click', onClick, { capture: true })
    document.addEventListener('submit', onSubmit)
    window.addEventListener('popstate', onPopState)
    window.addEventListener(NAVIGATION_START_EVENT, start)
    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      document.removeEventListener('submit', onSubmit)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener(NAVIGATION_START_EVENT, start)
    }
  }, [start])

  useEffect(() => {
    if (routeKeyRef.current === routeKey) return
    routeKeyRef.current = routeKey
    finish()
  }, [finish, routeKey])

  useEffect(
    () => () => {
      clearTimers()
      delete document.documentElement.dataset.navigation
    },
    [clearTimers]
  )

  return (
    <div
      aria-hidden={phase === 'idle'}
      aria-label="Loading next page"
      aria-valuetext={phase === 'loading' ? 'Loading' : 'Loaded'}
      className="navigation-progress"
      data-phase={phase}
      role="progressbar"
    >
      <span />
    </div>
  )
}

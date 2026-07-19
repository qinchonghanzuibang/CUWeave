'use client'

import type { UserRole } from '@cuweave/db'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { authClient } from '../lib/auth-client'

interface HeaderViewer {
  role: UserRole
}

function SignOutMenuItem({ onSelect }: { onSelect?: () => void }) {
  return (
    <button
      className="account-menu-item w-full text-left"
      onClick={() => {
        onSelect?.()
        void authClient.signOut({
          fetchOptions: { onSuccess: () => location.assign('/') },
        })
      }}
      role="menuitem"
      type="button"
    >
      Sign out
    </button>
  )
}

function AdministrationLinks({ role }: { role: UserRole }) {
  if (role === 'user') return null
  return (
    <div
      className="border-t border-[var(--border-subtle)] px-2 pt-2"
      role="group"
    >
      <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Administration
      </p>
      <Link className="account-menu-item" href="/moderation" role="menuitem">
        Moderation
      </Link>
    </div>
  )
}

export function AppHeader({
  requirementsAvailable,
  viewer,
}: {
  requirementsAvailable: boolean
  viewer: HeaderViewer | null
}) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountOpen && !mobileOpen) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (
        accountOpen &&
        !accountMenuRef.current?.contains(target) &&
        !accountTriggerRef.current?.contains(target)
      )
        setAccountOpen(false)
      if (
        mobileOpen &&
        !mobileMenuRef.current?.contains(target) &&
        !mobileTriggerRef.current?.contains(target)
      )
        setMobileOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      const returnToAccount = accountOpen
      setAccountOpen(false)
      setMobileOpen(false)
      requestAnimationFrame(() =>
        (returnToAccount
          ? accountTriggerRef.current
          : mobileTriggerRef.current
        )?.focus()
      )
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountOpen, mobileOpen])

  function openAccountMenu() {
    const next = !accountOpen
    setMobileOpen(false)
    setAccountOpen(next)
    if (next)
      requestAnimationFrame(() =>
        accountMenuRef.current
          ?.querySelector<HTMLElement>('[role="menuitem"]')
          ?.focus()
      )
  }

  function openMobileMenu() {
    const next = !mobileOpen
    setAccountOpen(false)
    setMobileOpen(next)
    if (next)
      requestAnimationFrame(() =>
        mobileMenuRef.current?.querySelector<HTMLElement>('a, button')?.focus()
      )
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[rgb(247_246_242/92%)] backdrop-blur-lg"
      ref={rootRef}
    >
      <nav
        aria-label="Primary navigation"
        className="relative mx-auto flex min-h-16 w-full max-w-[76rem] items-center justify-between gap-4 px-4 sm:px-8"
      >
        <Link
          aria-label="CUWeave home"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text-primary)]"
          href="/"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--accent)] text-xs font-semibold text-white">
            CW
          </span>
          CUWeave
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-between md:flex">
          <div className="ml-8 flex items-center gap-1">
            <Link className="nav-link" href="/courses">
              Courses
            </Link>
            <Link className="nav-link" href="/planner">
              Planner
            </Link>
            {requirementsAvailable ? (
              <Link className="nav-link" href="/requirements">
                Requirements
              </Link>
            ) : null}
            {viewer ? (
              <Link className="nav-link" href="/schedules">
                Schedules
              </Link>
            ) : null}
          </div>
          {viewer ? (
            <div className="relative">
              <button
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="account-trigger"
                onClick={openAccountMenu}
                ref={accountTriggerRef}
                type="button"
              >
                <span aria-hidden="true" className="account-avatar">
                  {viewer.role === 'user'
                    ? 'U'
                    : viewer.role === 'admin'
                      ? 'A'
                      : 'M'}
                </span>
                <span>Account</span>
                <span aria-hidden="true">⌄</span>
              </button>
              {accountOpen ? (
                <div
                  aria-label="Account"
                  className="account-menu absolute right-0 top-[calc(100%+0.5rem)]"
                  ref={accountMenuRef}
                  role="menu"
                >
                  <div className="px-2 pb-2">
                    <Link
                      className="account-menu-item"
                      href="/profile"
                      role="menuitem"
                    >
                      Profile
                    </Link>
                    <SignOutMenuItem />
                  </div>
                  <AdministrationLinks role={viewer.role} />
                </div>
              ) : null}
            </div>
          ) : (
            <Link className="button-primary" href="/sign-in">
              Sign in
            </Link>
          )}
        </div>

        <button
          aria-expanded={mobileOpen}
          aria-haspopup="menu"
          className="mobile-menu-trigger md:hidden"
          onClick={openMobileMenu}
          ref={mobileTriggerRef}
          type="button"
        >
          <span aria-hidden="true">☰</span>
          Menu
        </button>

        {mobileOpen ? (
          <div
            aria-label="Mobile navigation"
            className="account-menu absolute right-4 top-[calc(100%+0.5rem)] left-4 md:hidden"
            ref={mobileMenuRef}
            role="menu"
          >
            <div className="px-2 pb-2">
              <Link
                className="account-menu-item"
                href="/courses"
                role="menuitem"
              >
                Courses
              </Link>
              <Link
                className="account-menu-item"
                href="/planner"
                role="menuitem"
              >
                Planner
              </Link>
              {requirementsAvailable ? (
                <Link
                  className="account-menu-item"
                  href="/requirements"
                  role="menuitem"
                >
                  Requirements
                </Link>
              ) : null}
              {viewer ? (
                <>
                  <Link
                    className="account-menu-item"
                    href="/schedules"
                    role="menuitem"
                  >
                    Schedules
                  </Link>
                  <Link
                    className="account-menu-item"
                    href="/profile"
                    role="menuitem"
                  >
                    Profile
                  </Link>
                  <SignOutMenuItem onSelect={() => setMobileOpen(false)} />
                </>
              ) : (
                <Link
                  className="account-menu-item"
                  href="/sign-in"
                  role="menuitem"
                >
                  Sign in
                </Link>
              )}
            </div>
            {viewer ? <AdministrationLinks role={viewer.role} /> : null}
          </div>
        ) : null}
      </nav>
    </header>
  )
}

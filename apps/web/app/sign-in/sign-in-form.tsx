'use client'

import { useState, type FormEvent } from 'react'

export function SignInForm() {
  const [email, setEmail] = useState('student@cuweave.local')
  const [message, setMessage] = useState('')
  const [developmentUrl, setDevelopmentUrl] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    setDevelopmentUrl('')
    try {
      const response = await fetch('/api/v1/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, callbackURL: '/profile' }),
      })
      const data = (await response.json()) as {
        status?: string
        developmentUrl?: string
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? 'Sign-in request failed.')
      setMessage(
        data.developmentUrl
          ? 'Development link ready. It is shown only because AUTH_DEV_MODE is enabled.'
          : 'Check your email for a single-use sign-in link.'
      )
      setDevelopmentUrl(data.developmentUrl ?? '')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Sign-in request failed.'
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="panel mx-auto max-w-xl p-6 sm:p-8"
      onSubmit={(event) => void submit(event)}
    >
      <label className="field-label" htmlFor="sign-in-email">
        Email address
      </label>
      <input
        autoComplete="email"
        className="field mt-2"
        id="sign-in-email"
        onChange={(event) => setEmail(event.target.value)}
        required
        type="email"
        value={email}
      />
      <p className="mt-3 text-sm leading-6 text-slate-600">
        CUWeave never asks for a CUHK password, OnePass credential, SID, legal
        name, or transcript.
      </p>
      <button
        className="button-primary mt-5 w-full"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Preparing link…' : 'Email me a sign-in link'}
      </button>
      {message ? (
        <p
          className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {developmentUrl ? (
        <a
          className="button-secondary mt-3 flex justify-center"
          href={developmentUrl}
        >
          Continue with development sign-in
        </a>
      ) : null}
    </form>
  )
}

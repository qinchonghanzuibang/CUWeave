'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      const response = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok)
        throw new Error(data.error ?? 'Authentication email is unavailable.')
      setStep('otp')
      setMessage(
        'If the address can receive CUWeave email, a six-digit code is on its way.'
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Authentication email is unavailable.'
      )
    } finally {
      setPending(false)
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      const response = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok)
        throw new Error(data.error ?? 'The code is invalid or expired.')
      router.push('/profile')
      router.refresh()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The code is invalid or expired.'
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="panel mx-auto max-w-xl p-6 sm:p-8"
      onSubmit={(event) => {
        void (step === 'email' ? requestCode(event) : verifyCode(event))
      }}
    >
      <label className="field-label" htmlFor="sign-in-email">
        CUHK student email
      </label>
      <input
        autoComplete="email"
        className="field mt-2"
        id="sign-in-email"
        onChange={(event) => setEmail(event.target.value)}
        readOnly={step === 'otp'}
        required
        type="email"
        value={email}
        placeholder="name@link.cuhk.edu.hk"
      />
      {step === 'otp' && (
        <>
          <div className="mt-5 flex items-center justify-between gap-4">
            <label className="field-label" htmlFor="sign-in-otp">
              Six-digit code
            </label>
            <button
              className="text-link text-sm"
              onClick={() => {
                setStep('email')
                setOtp('')
                setMessage('')
              }}
              type="button"
            >
              Use another address
            </button>
          </div>
          <input
            autoComplete="one-time-code"
            className="field mt-2 text-center font-mono text-2xl tracking-[0.35em]"
            id="sign-in-otp"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            pattern="[0-9]{6}"
            required
            value={otp}
          />
          <p className="mt-2 text-sm text-slate-600">
            The code expires in five minutes. A resend rotates the previous
            code.
          </p>
        </>
      )}
      <p className="mt-4 text-sm leading-6 text-slate-600">
        CUWeave never asks for a CUHK password, OnePass credential, SID, legal
        name, or transcript. Email-domain control does not prove current
        enrollment.
      </p>
      <button
        className="button-primary mt-5 w-full"
        disabled={pending}
        type="submit"
      >
        {pending
          ? 'Please wait…'
          : step === 'email'
            ? 'Send verification code'
            : 'Verify and sign in'}
      </button>
      {step === 'otp' && (
        <button
          className="button-secondary mt-3 w-full"
          disabled={pending}
          onClick={(event) => void requestCode(event)}
          type="button"
        >
          Send a new code
        </button>
      )}
      {message && (
        <p className="status-banner status-info mt-4" role="status">
          {message}
        </p>
      )}
    </form>
  )
}

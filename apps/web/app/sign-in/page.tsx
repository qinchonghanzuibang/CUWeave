import { redirect } from 'next/navigation'

import { getViewer } from '../../lib/session'
import { isAuthenticationAvailable } from '../../lib/auth-policy'
import { SignInForm } from './sign-in-form'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  if (await getViewer()) redirect('/profile')
  const available = isAuthenticationAvailable()
  return (
    <main className="page-shell py-12 sm:py-16">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <span className="eyebrow">Private by default</span>
        <h1 className="page-title mt-4">Sign in without another password.</h1>
        <p className="page-lead mx-auto mt-4">
          A short-lived email link opens your schedules, favorites, and review
          tools. Email ownership is not proof of current CUHK enrollment.
        </p>
      </div>
      {available ? (
        <SignInForm />
      ) : (
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-900/15 bg-amber-50 p-6 text-center text-amber-950">
          Sign-in is disabled for this Preview deployment. Use the protected
          staging environment or ask a maintainer for an isolated Preview.
        </div>
      )}
    </main>
  )
}

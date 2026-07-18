import { redirect } from 'next/navigation'

import { getViewer } from '../../lib/session'
import { SignInForm } from './sign-in-form'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  if (await getViewer()) redirect('/profile')
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
      <SignInForm />
    </main>
  )
}

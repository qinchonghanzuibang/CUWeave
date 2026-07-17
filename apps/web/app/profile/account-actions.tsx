'use client'

import { authClient } from '../../lib/auth-client'

export function AccountActions() {
  async function deactivate() {
    if (
      !confirm(
        'Deactivate this account and revoke every session? This cannot be undone here.'
      )
    )
      return
    const response = await fetch('/api/v1/account', { method: 'DELETE' })
    if (!response.ok) {
      alert('Account could not be deactivated.')
      return
    }
    await authClient.signOut()
    location.assign('/')
  }

  return (
    <button
      className="button-danger"
      onClick={() => void deactivate()}
      type="button"
    >
      Deactivate account
    </button>
  )
}

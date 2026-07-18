'use client'

import { authClient } from '../lib/auth-client'

export function SignOutButton() {
  return (
    <button
      className="nav-link"
      onClick={() =>
        void authClient.signOut({
          fetchOptions: { onSuccess: () => location.assign('/') },
        })
      }
      type="button"
    >
      Sign out
    </button>
  )
}

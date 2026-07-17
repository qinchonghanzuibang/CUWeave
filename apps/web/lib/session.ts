import { getProductUser, type ProductUser } from '@cuweave/db'
import { headers } from 'next/headers'

import { auth } from './auth'

export class AuthenticationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message)
  }
}

export async function getViewer(
  requestHeaders?: Headers
): Promise<ProductUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: requestHeaders ?? (await headers()),
    })
    if (!session) return null
    const user = await getProductUser(session.user.id)
    return user?.status === 'active' ? user : null
  } catch {
    return null
  }
}

export async function requireViewer(
  requestHeaders?: Headers
): Promise<ProductUser> {
  const viewer = await getViewer(requestHeaders)
  if (!viewer) throw new AuthenticationError(401, 'Sign in is required.')
  return viewer
}

export async function requireModerator(
  requestHeaders?: Headers
): Promise<ProductUser> {
  const viewer = await requireViewer(requestHeaders)
  if (viewer.role !== 'moderator' && viewer.role !== 'admin')
    throw new AuthenticationError(403, 'Moderator access is required.')
  return viewer
}

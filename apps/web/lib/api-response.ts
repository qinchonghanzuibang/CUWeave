import { ProductDataError } from '@cuweave/db'
import { NextResponse } from 'next/server'

import { AuthenticationError } from './session'

export function apiError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError)
    return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof ProductDataError) {
    const status =
      error.code === 'not_found'
        ? 404
        : error.code === 'conflict'
          ? 409
          : error.code === 'forbidden'
            ? 403
            : 400
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json(
    { error: 'The request could not be completed.' },
    { status: 500 }
  )
}

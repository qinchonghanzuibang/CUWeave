import { NextResponse, type NextRequest } from 'next/server'

const requestIdPattern = /^[A-Za-z0-9_-]{8,80}$/

export function proxy(request: NextRequest) {
  const incoming = request.headers.get('x-request-id') ?? ''
  const requestId = requestIdPattern.test(incoming)
    ? incoming
    : crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('X-Request-Id', requestId)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

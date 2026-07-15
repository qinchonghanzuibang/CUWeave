import { getHealthStatus } from '../../../../lib/status'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(): Promise<Response> {
  const health = await getHealthStatus()

  return Response.json(health, {
    status: health.status === 'ready' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

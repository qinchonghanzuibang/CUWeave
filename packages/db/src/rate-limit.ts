import { createHmac } from 'node:crypto'

import { getDatabaseConnection } from './client'

export interface RateLimitDecision {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

export function hashRateLimitKey(identifier: string, secret: string): string {
  if (secret.length < 32)
    throw new Error(
      'RATE_LIMIT_HASH_SECRET must contain at least 32 characters.'
    )
  return createHmac('sha256', secret).update(identifier).digest('hex')
}

export async function consumeRateLimit(input: {
  scope: string
  identifier: string
  secret: string
  limit: number
  windowSeconds: number
}): Promise<RateLimitDecision> {
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  const keyHash = hashRateLimitKey(input.identifier, input.secret)
  try {
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [
      `${input.scope}:${keyHash}`,
    ])
    const result = await client.query<{ count: string; oldest: Date | null }>(
      `select count(*)::text as count, min(occurred_at) as oldest
       from rate_limit_event where scope = $1 and key_hash = $2
         and occurred_at >= now() - ($3 * interval '1 second')`,
      [input.scope, keyHash, input.windowSeconds]
    )
    const count = Number(result.rows[0]?.count ?? 0)
    if (count >= input.limit) {
      const oldest = result.rows[0]?.oldest?.getTime() ?? Date.now()
      await client.query('commit')
      return {
        allowed: false,
        limit: input.limit,
        remaining: 0,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((oldest + input.windowSeconds * 1000 - Date.now()) / 1000)
        ),
      }
    }
    await client.query(
      `insert into rate_limit_event (scope, key_hash, expires_at)
       values ($1, $2, now() + ($3 * interval '1 second'))`,
      [input.scope, keyHash, input.windowSeconds]
    )
    if (Math.random() < 0.02)
      await client.query(
        'delete from rate_limit_event where expires_at < now()'
      )
    await client.query('commit')
    return {
      allowed: true,
      limit: input.limit,
      remaining: input.limit - count - 1,
      retryAfterSeconds: 0,
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  const { pool } = getDatabaseConnection()
  const result = await pool.query(
    'delete from rate_limit_event where expires_at < now()'
  )
  return result.rowCount ?? 0
}

import { getDatabaseConnection } from './client'

const apply = process.argv.includes('--apply')
const eligibleDomain = 'link.cuhk.edu.hk'

async function main() {
  const { pool } = getDatabaseConnection()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const ineligible = await client.query<{ id: string }>(
      `select id from app_user where lower(split_part(email, '@', 2)) <> $1`,
      [eligibleDomain]
    )
    const ids = ineligible.rows.map((row) => row.id)
    if (ids.length) {
      await client.query(
        'delete from auth_session where user_id = any($1::text[])',
        [ids]
      )
      await client.query(
        'delete from auth_account where user_id = any($1::text[])',
        [ids]
      )
      await client.query(
        `update app_user set email_verified=false, verified_cuhk_email=false, updated_at=now()
         where id = any($1::text[])`,
        [ids]
      )
    }
    await client.query('delete from auth_verification')
    if (apply) await client.query('commit')
    else await client.query('rollback')
    process.stdout.write(
      `${apply ? 'Revoked' : 'Would revoke'} authentication access for ${ids.length} ineligible account(s).\n`
    )
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(() => {
  process.stderr.write('Failed to revoke ineligible authentication access.\n')
  process.exitCode = 1
})

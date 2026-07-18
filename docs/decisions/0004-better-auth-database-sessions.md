# ADR 0004: Better Auth with database sessions

Status: accepted

## Context

Public Beta needs email sign-in, secure server sessions, logout, and a future verification path.
CUWeave must not implement authentication tokens, cookie signing, or session expiry itself.

## Decision

Use Better Auth with its Drizzle adapter, magic-link plugin, and Next.js integration. Store users,
accounts, sessions, and hashed one-time verification tokens in PostgreSQL. Use HTTP-only cookies,
secure cookies in production, a 14-day server session, and server-side route authorization.

Local development stores the most recent magic link in process memory only when
`AUTH_DEV_MODE=true` and the process is not production. Deployments must configure a unique
`BETTER_AUTH_SECRET`, canonical `BETTER_AUTH_URL`, `AUTH_SMTP_URL`, and `AUTH_EMAIL_FROM`.

Email-domain ownership may support a future `verified_cuhk_email` flag, but is not evidence of
current enrollment. Account deactivation revokes sessions and removes the sign-in email from the
active account record while preserving authored community records for audit integrity.

## Consequences

Authentication remains a maintained-library responsibility. CUWeave owns authorization, account
status, roles, and product privacy. Production deployment requires an SMTP provider and normal
secret rotation, rate limiting, abuse monitoring, and delivery observability.

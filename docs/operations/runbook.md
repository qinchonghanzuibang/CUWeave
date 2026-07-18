# Operations and moderation runbook

## Release and migration

1. Review migration SQL and generate again; no unexpected migration may appear.
2. Take or confirm a managed PostgreSQL backup and record its provider snapshot identifier outside the repository.
3. Apply migrations from a trusted operator environment with the direct migration URL.
4. Seed requirement metadata, then validate and import the complete locally reviewed, pinned subject manifest when approved.
5. Deploy the immutable application revision, request `/api/v1/health`, then run `pnpm smoke`.

The health endpoint reports readiness only when the database responds and the expected schema marker exists. It never returns hosts, versions, paths, credentials, or stack traces.

## Backups and restore

Enable managed PostgreSQL point-in-time recovery and daily backups with a retention window approved by maintainers. Test restore at least quarterly into an isolated, access-restricted database: restore the provider snapshot, run migration validation and synthetic smoke checks, document row-count checks, then destroy the test database. A real incident restore must target a new database first; switch `DATABASE_URL` only after integrity checks. Never restore production data into an arbitrary Preview.

## Incident checklist

1. Name an incident owner and open a private timeline with request IDs—never secrets or raw identities.
2. Contain: disable authentication or affected writes, revoke exposed credentials, and preserve provider audit logs.
3. Assess data scope, source, time window, and required user/authority notification with legal guidance.
4. Restore or remediate, rotate secrets, run migrations/readiness/smoke, and monitor stable error rates.
5. Publish an appropriate incident summary and track corrective work.

Application rollback uses Vercel's previous immutable deployment. If a migration is backward-compatible, roll back the application first. For a destructive incompatibility, stop writes and restore a verified backup into a new database; do not hand-edit migration history or run an unreviewed down migration.

## Logging

Server logs are single-line structured JSON with event name, level, timestamp, and request ID. Redaction removes email, tokens, cookies, authorization, secrets, raw IPs, hosts, and filesystem paths. Do not log OTPs, review author identity in public handlers, database errors, query text, or environment values.

## Moderation operations

- Bootstrap the first moderator/admin with `pnpm role:grant` only after the account signs in. Use distinct accounts and least privilege.
- The on-call moderator owns open reports. Resolution records the moderator, outcome, notes, and timestamp.
- For privacy or credible safety risk, hide first, preserve evidence and revisions, then review. Ordinary takedowns follow the queue and published policy.
- Suspend access by deactivating the account and revoking sessions. Do not publicly reveal the internal author relationship.
- Appeals go to the public security/contact address in `SECURITY.md`; a different maintainer reviews them when possible.
- Emergency cases require an incident owner, a private timeline, minimal disclosure, and escalation to the appropriate institution or authority only when necessary and legally appropriate.

Policy drafts require maintainer/legal review and a confirmed public appeals address before production launch.

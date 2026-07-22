# Production deployment

CUWeave has one authoritative live environment: the `main` branch deploys to
`https://cuweave.org`. Pull requests may receive temporary Vercel Preview deployments, but there
is no permanent staging project, hostname, or database.

## Vercel project settings

The Vercel project is `cuw-eave/cuweave`, connected to
`qinchonghanzuibang/CUWeave` with `main` as its Production Branch. It uses these exact settings:

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && pnpm --filter @cuweave/web build`
- Output Directory: framework default (`.next`); do not override
- Node.js: 22.x
- pnpm: 11.7.0, as declared by the root `packageManager`

`apps/web/vercel.json` records the framework and commands. Run `pnpm deploy:validate` before deployment.

## Environment variables

Server-only in Preview/Production: `DATABASE_URL`, optional `DATABASE_MIGRATION_URL`, `DATABASE_SSL=true`, `DATABASE_POOL_MAX`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_TRUSTED_ORIGINS`, `AUTH_SMTP_URL`, `AUTH_EMAIL_FROM`, optional `AUTH_OPERATOR_EMAILS`, `RATE_LIMIT_HASH_SECRET`, `TRUST_PROXY_HEADERS=true` only on the trusted platform, `FEATURE_REQUIREMENTS_ENABLED=false`, and `GITHUB_REPOSITORY_URL`. Never use `NEXT_PUBLIC_` for these values.

`AUTH_OPERATOR_EMAILS` is a comma-separated list of exact normalized addresses for exceptional operator login. It is server-only, does not accept wildcards or domain-wide entries, and grants no role; use `role:grant` separately after the account exists.

Production uses an exact HTTPS `BETTER_AUTH_URL`, its exact trusted origin, provider-neutral SMTP, the production managed PostgreSQL pool URL, and a direct migration URL if the provider recommends one. Migrations and approved imports are separate operator commands; neither runs at build or Web startup.

Preview authentication is disabled by default (`AUTH_PREVIEW_MODE=disabled`). If authentication
must run on a temporary Preview, set `AUTH_PREVIEW_MODE=isolated` and
`PREVIEW_DATABASE_ISOLATED=true` only after assigning that deployment a disposable isolated
database and exact `BETTER_AUTH_URL`/`AUTH_TRUSTED_ORIGINS`. Never use the production database
across Previews, never assign a stable Preview hostname, and never automatically import real
course data into a Preview.

## Operator commands

```bash
# Apply production migrations through the direct URL when configured.
DATABASE_URL="$APP_POOL_URL" DATABASE_MIGRATION_URL="$DIRECT_URL" \
  DATABASE_SSL=true pnpm db:migrate

# Seed draft requirement metadata only in an isolated environment where the feature is enabled.
DATABASE_URL="$APP_POOL_URL" DATABASE_SSL=true pnpm requirements:seed

# Validate and import every approved 2026-27 manifest subject at the audited revision.
CUWEAVE_UPSTREAM_DIR=/read-only/audited/another-cuhk-course-planner \
  pnpm data:validate:all --format text
CUWEAVE_UPSTREAM_DIR=/read-only/audited/another-cuhk-course-planner \
  DATABASE_URL="$APP_POOL_URL" DATABASE_SSL=true pnpm data:import:all --format text

# Revoke sessions/auth access for ineligible accounts outside the public student domain.
DATABASE_URL="$APP_POOL_URL" DATABASE_SSL=true pnpm auth:revoke-ineligible --apply

# Bootstrap roles after the account has signed in once.
DATABASE_URL="$APP_POOL_URL" DATABASE_SSL=true \
  pnpm role:grant operator@example.invalid admin

# Readiness and non-destructive route checks.
curl --fail-with-body https://cuweave.example/api/v1/health
SMOKE_BASE_URL=https://cuweave.example SMOKE_COURSE_CODE=IERG5001 pnpm smoke
```

Do not put real URLs or secrets in shell history on shared systems; use the deployment provider's secret injection mechanism.

## Release procedure

1. Merge a reviewed pull request to `main` after CI passes.
2. Confirm the Git integration automatically creates a Production deployment in
   `cuw-eave/cuweave` for the exact merge commit.
3. Wait for the deployment to become `READY`, verify that `https://cuweave.org` resolves to it,
   and complete production smoke testing without writing synthetic records.

Production environment variables are managed remotely and must never be committed. Preview
deployments are optional, temporary, authentication-disabled by default, and are not release
gates or long-lived environments.

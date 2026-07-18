# CUWeave

CUWeave is an unofficial, student-led, open-source course explorer and academic planning platform
for students at The Chinese University of Hong Kong.

> CUWeave is not affiliated with or endorsed by CUHK. It is an advisory planning tool, not a
> replacement for CUSIS. Always verify final enrollment details in CUSIS.

## Current status

The Public Beta Web experience integrates searchable courses, detailed offerings and meetings, a
hybrid local/cloud planner, favorites, structured reviews, private sharing, moderation, and an
explainable programme-requirement checker. The initial 2026 Information Engineering sets are
drafts pending complete official 2026–27 department study schemes. Live upstream fetching remains
out of scope; production launch still requires external accounts, secrets, policy review, and
operational approval.

The repository does not contain real course JSON. Tests and CI use independently synthetic data;
developers may validate local read-only files from an audited upstream checkout.

## Technology

- pnpm workspace, strict TypeScript, Next.js App Router, React, and Tailwind CSS
- PostgreSQL 16 and Drizzle-owned schema/migrations
- Python 3.12+, uv, Pydantic, Psycopg, pytest, and Ruff
- Vitest, focused Playwright flows, and GitHub Actions

## Local setup

Requirements: Node.js 22+, pnpm 11+, Docker Compose, and uv.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
cd services/ingest && uv sync --frozen && cd ../..
pnpm db:up
pnpm db:migrate
pnpm ingest import tests/fixtures/synthetic-subject.json \
  --manifest tests/fixtures/synthetic-manifest.json
pnpm dev:seed
pnpm requirements:seed
pnpm dev
```

Open <http://localhost:3000>, browse `/courses`, open `/planner`, or inspect `/requirements`. With
`AUTH_DEV_MODE=true`, request a link at `/sign-in` and continue through the local-only link shown in
the page. The synthetic accounts are `student@cuweave.local` and `moderator@cuweave.local`.

Production authentication requires a unique `BETTER_AUTH_SECRET`, exact canonical
`BETTER_AUTH_URL` and `AUTH_TRUSTED_ORIGINS`, provider-neutral `AUTH_SMTP_URL` / `AUTH_EMAIL_FROM`,
and a separate `RATE_LIMIT_HASH_SECRET`. Authentication is disabled on arbitrary Vercel Preview
deployments unless an isolated database and exact origin are explicitly configured. Database and
authentication credentials are server-only and must never use the `NEXT_PUBLIC_` prefix. See the
[deployment guide](docs/operations/deployment.md).

## Import local pinned course data

The CLI accepts local files only and never fetches a source URI. Create a manifest using the shape
documented in [the import guide](docs/upstream/importing.md), then run:

```bash
pnpm ingest validate "$INPUT" --manifest "$MANIFEST"
DATABASE_URL="$DATABASE_URL" pnpm ingest import "$INPUT" --manifest "$MANIFEST"
```

For the audited Another Planner checkout, import both approved 2026-27 subjects with one command:

```bash
CUWEAVE_UPSTREAM_DIR=/absolute/path/to/another-cuhk-course-planner \
  DATABASE_URL="$DATABASE_URL" pnpm data:import:local
```

The helper verifies revision `6c9ea314ff5595dd90a88bbbdae8d286408d85f3`, builds provenance
metadata, validates, and imports `IERG.json` and `ENGG.json` directly from the checkout. It fails on
another revision and never copies those files into CUWeave.

## Public Beta behavior

- Anonymous schedules stay in versioned browser storage. Signed-in users can save, rename, update,
  duplicate, delete, or import local schedules. Cloud writes use optimistic versions.
- Read-only schedule links use high-entropy tokens; only hashes are stored, owner identity is not
  exposed, and links can be revoked.
- Favorites are private to the account and link back to the course hub and planner.
- Reviews are scoped to an exact offering and optional instructor, support six rating dimensions,
  preserve edit history, and can be anonymous. Public anonymous responses redact account identity.
- One vote per user/review, structured reports, role-gated moderation, and resolution audit fields
  provide the initial community-safety boundary.
- Programme requirement sets retain entry year, version, source revision, verification status,
  source notes, structured rules, and audited publishing actions. Draft or ambiguous results are
  never labelled reliable.

See [accounts and privacy](docs/product/accounts-and-privacy.md),
[reviews and moderation](docs/product/reviews-and-moderation.md), and the
[authentication ADR](docs/decisions/0004-better-auth-database-sessions.md).

## Core commands

| Command                       | Purpose                                                 |
| ----------------------------- | ------------------------------------------------------- |
| `pnpm dev`                    | Start the Web development server                        |
| `pnpm build`                  | Build Web without requiring a reachable database        |
| `pnpm ingest ...`             | Validate or import one local subject/year snapshot      |
| `pnpm data:import:local`      | Import pinned local IERG and ENGG source files          |
| `pnpm dev:seed`               | Reset deterministic synthetic accounts and product data |
| `pnpm requirements:seed`      | Seed reviewed draft 2026 IE requirement metadata        |
| `pnpm role:grant EMAIL ROLE`  | Grant a local account `user`, `moderator`, or `admin`   |
| `pnpm lint`                   | Run TypeScript and Python lint checks                   |
| `pnpm format:check`           | Verify TypeScript, documentation, and Python formatting |
| `pnpm typecheck`              | Type-check all TypeScript workspaces                    |
| `pnpm test`                   | Run TypeScript and Python tests                         |
| `pnpm test:integration`       | Run PostgreSQL ingestion lifecycle tests                |
| `pnpm test:e2e`               | Run the focused course-to-planner browser flow          |
| `pnpm deploy:validate`        | Validate Vercel monorepo configuration                  |
| `pnpm smoke`                  | Run non-destructive production route checks             |
| `pnpm check`                  | Run repository quality checks and production build      |
| `pnpm db:up` / `pnpm db:down` | Start or stop local PostgreSQL                          |
| `pnpm db:migrate`             | Apply committed migrations                              |
| `pnpm db:generate`            | Generate a migration from the Drizzle schema            |

## Repository structure

```text
apps/web/          Next.js public-beta UI, authentication, and HTTP boundary
packages/config/   Shared lint configuration
packages/db/       Drizzle schema, authorized product services, and migrations
packages/domain/   Framework-independent health contracts
packages/planner/  Framework-independent conflict and schedule semantics
packages/requirements/ Framework-independent source-backed rule evaluation
services/ingest/   Local-file validation and transactional academic imports
docs/              Architecture, product principles, and provenance documentation
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. CUWeave is licensed under
[AGPL-3.0-only](LICENSE).

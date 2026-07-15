# CUWeave

CUWeave is an unofficial, student-led, open-source course explorer and academic planning platform
for students at The Chinese University of Hong Kong.

> CUWeave is not affiliated with or endorsed by CUHK. It is an advisory planning tool, not a
> replacement for CUSIS. Always verify final enrollment details in CUSIS.

## Current status

Fast-track Milestone 1 provides a working Web slice: local pinned course-data imports, searchable
course and section pages, and a browser-local weekly planner with confirmed and uncertain conflict
reporting. Accounts, reviews, programme requirements, and cloud synchronization remain deferred.

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
pnpm dev
```

Open <http://localhost:3000>, browse `/courses`, or open `/planner`.

## Import local pinned course data

The CLI accepts local files only and never fetches a source URI. Create a manifest using the shape
documented in [the import guide](docs/upstream/importing.md), then run:

```bash
pnpm ingest validate "$INPUT" --manifest "$MANIFEST"
DATABASE_URL="$DATABASE_URL" pnpm ingest import "$INPUT" --manifest "$MANIFEST"
```

For the audited Another Planner checkout, `INPUT` may point to
`data/2026-27/IERG.json` or `data/2026-27/ENGG.json` outside this repository. Do not copy those
files into CUWeave.

## Core commands

| Command                       | Purpose                                                 |
| ----------------------------- | ------------------------------------------------------- |
| `pnpm dev`                    | Start the Web development server                        |
| `pnpm build`                  | Build Web without requiring a reachable database        |
| `pnpm ingest ...`             | Validate or import one local subject/year snapshot      |
| `pnpm lint`                   | Run TypeScript and Python lint checks                   |
| `pnpm format:check`           | Verify TypeScript, documentation, and Python formatting |
| `pnpm typecheck`              | Type-check all TypeScript workspaces                    |
| `pnpm test`                   | Run TypeScript and Python tests                         |
| `pnpm test:integration`       | Run PostgreSQL ingestion lifecycle tests                |
| `pnpm test:e2e`               | Run the focused course-to-planner browser flow          |
| `pnpm check`                  | Run repository quality checks and production build      |
| `pnpm db:up` / `pnpm db:down` | Start or stop local PostgreSQL                          |
| `pnpm db:migrate`             | Apply committed migrations                              |
| `pnpm db:generate`            | Generate a migration from the Drizzle schema            |

## Repository structure

```text
apps/web/          Next.js course explorer, detail pages, planner, and HTTP boundary
packages/config/   Shared lint configuration
packages/db/       Drizzle schema, request-time course queries, and migrations
packages/domain/   Framework-independent health contracts
packages/planner/  Framework-independent conflict and schedule semantics
services/ingest/   Local-file validation and transactional academic imports
docs/              Architecture, product principles, and provenance documentation
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. CUWeave is licensed under
[AGPL-3.0-only](LICENSE).

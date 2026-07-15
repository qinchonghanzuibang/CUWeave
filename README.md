# CUWeave

CUWeave is an unofficial, student-led, open-source academic planning platform for students at The
Chinese University of Hong Kong. The long-term product will bring course discovery, timetable
planning, course reviews, and programme requirement checking into one coherent experience.

> CUWeave is not affiliated with or endorsed by CUHK. It is an advisory planning tool, not a
> replacement for CUSIS. Always verify final enrollment details in CUSIS.

## Current status

The project is at **Milestone 0A: Project Foundation**. This repository currently provides the web,
database, package, testing, and CI foundations only. It contains no academic data, upstream
adapters, course search, timetable planner, reviews, authentication, or programme rules.

CUWeave is Web-first. A native mobile application is deferred and no mobile-specific architecture
is included.

## Technology

- pnpm workspace with strict TypeScript
- Next.js App Router, React, and Tailwind CSS
- PostgreSQL 16 and Drizzle ORM
- Python 3.12+, uv, Pydantic, pytest, and Ruff
- Vitest and GitHub Actions

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

Open <http://localhost:3000>. The versioned health endpoint is
<http://localhost:3000/api/v1/health>.

## Core commands

| Command                       | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                    | Start the Web development server                           |
| `pnpm build`                  | Build the production Web application                       |
| `pnpm lint`                   | Run TypeScript and Python lint checks                      |
| `pnpm format`                 | Format TypeScript, documentation, and Python               |
| `pnpm format:check`           | Verify formatting without writing                          |
| `pnpm typecheck`              | Type-check all TypeScript workspaces                       |
| `pnpm test`                   | Run TypeScript and Python tests                            |
| `pnpm check`                  | Run all repository quality checks and the production build |
| `pnpm db:up` / `pnpm db:down` | Start or stop local PostgreSQL                             |
| `pnpm db:migrate`             | Apply committed migrations                                 |
| `pnpm db:generate`            | Generate a migration from the Drizzle schema               |

## Repository structure

```text
apps/web/          Next.js Web application and HTTP boundary
packages/config/   Shared lint configuration
packages/db/       Drizzle schema, client, readiness, and migrations
packages/domain/   Framework-independent health contracts
services/ingest/   Minimal Python ingestion package foundation
docs/              Architecture, decisions, product principles, and upstream audit summary
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change.

## License

CUWeave is licensed under [AGPL-3.0-only](LICENSE).

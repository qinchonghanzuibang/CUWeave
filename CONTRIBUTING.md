# Contributing to CUWeave

Thank you for helping build CUWeave. Keep changes understandable, source-backed, and appropriately
tested so student contributors can maintain them.

## Development workflow

1. Install Node.js 22+, pnpm 11+, Docker Compose, and uv.
2. Copy `.env.example` to `.env`; its credentials are for local development only.
3. Run `pnpm install --frozen-lockfile` and `uv sync --frozen` in `services/ingest`.
4. Start PostgreSQL and apply migrations with `pnpm db:up && pnpm db:migrate`.
5. Run `pnpm check` before opening a pull request.

Create schema changes through Drizzle, review generated SQL, and prove that every committed
migration applies to a clean database. Never edit an already-released migration.

## Academic and upstream material

Do not invent academic information or programme rules. Any future academic record must preserve
its source and uncertainty. Do not copy upstream code, data, fixtures, branding, or assets without
an explicit reuse decision, license review, attribution, and notice update.

Never add CUHK passwords, OnePass credentials, student IDs, or transcripts to code, fixtures,
issues, logs, or tests.

# Architecture overview

## System shape

CUWeave is a Web-first monorepo. The current foundation has four dependency layers:

```text
apps/web -> packages/domain
         -> packages/db -> PostgreSQL

services/ingest -> future validated import boundary
```

`apps/web` owns the Next.js App Router, Server Components, and versioned HTTP endpoints. Server
Components are the default; Client Components will be added only for genuine interaction.

`packages/domain` is framework-independent and currently contains only health contracts.
`packages/db` owns environment validation, Drizzle, migrations, and readiness queries. Web code
must not construct database clients directly.

## Backend boundary

The initial backend lives inside Next.js to keep development and operations simple. Stable HTTP
interfaces use `/api/v1`. Business rules belong in framework-independent packages so a separate
service can be introduced later without rewriting the domain.

Database-dependent pages and handlers are explicitly dynamic. Database connections are lazy and
must never occur during module initialization, metadata generation, or `next build`.

## Data boundaries

PostgreSQL is the canonical relational store. Milestone 0A contains only `system_metadata` to prove
connectivity and migration execution. The academic model—source snapshots, import runs, courses,
catalog versions, offerings, sections, meetings, and instructors—is deferred to Milestone 0B.

The Python ingestion service will eventually validate untrusted upstream input before it crosses
into canonical storage. Milestone 0A contains no adapter, network access, scraper, academic schema,
or database writer.

## Deferred work

Authentication, schedules, reviews, programme requirements, object storage, analytics, and
deployment infrastructure are outside Milestone 0A. Native mobile work is deferred indefinitely;
no mobile package or cross-platform abstraction is present.

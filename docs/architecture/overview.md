# Architecture overview

## System shape

```text
local pinned JSON -> services/ingest -> PostgreSQL <- packages/db <- apps/web
                                                        ^
browser localStorage -> packages/planner ----------------|
```

Drizzle is the only schema and migration authority. The Python ingestion service validates
untrusted local JSON, preserves exact source content and provenance, and performs one subject/year
activation transaction. It has no network or scraper behavior.

`packages/db` owns lazy connections and request-time queries. Database-dependent Next.js pages and
handlers are explicitly dynamic; imports and production builds do not contact PostgreSQL.

`packages/planner` is framework-independent and has no React, Next.js, browser, Drizzle, or
PostgreSQL dependency. The browser stores only a versioned set of selected section IDs and reloads
current section details through a small versioned route.

## Academic history

`course` is stable identity. Catalog, offering, and section rows are versioned with nullable closing
import references. Meetings are immutable children of section revisions. Complete subject/year
snapshots may retire missing current records; incomplete snapshots cannot. Failed activation
transactions leave active academic records unchanged, and duplicate content/adapter imports do not
duplicate academic rows.

## Product boundaries

The current Web slice provides course search, detail pages, and local timetable planning. CUSIS
remains authoritative. Authentication, cloud schedules, reviews, programme requirements, live
scraping, mobile clients, analytics, and production deployment remain deferred.

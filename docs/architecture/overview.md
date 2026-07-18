# Architecture overview

## System shape

```text
local pinned JSON -> services/ingest -> PostgreSQL <- packages/db <- apps/web
                                                        ^
browser localStorage -> packages/planner ----------------|
email magic link -> Better Auth -> PostgreSQL sessions ---|
```

Drizzle is the only schema and migration authority. The Python ingestion service validates
untrusted local JSON, preserves exact source content and provenance, and performs one subject/year
activation transaction. It has no network or scraper behavior.

`packages/db` owns lazy connections and request-time queries. Database-dependent Next.js pages and
handlers are explicitly dynamic; imports and production builds do not contact PostgreSQL.

`packages/planner` is framework-independent and has no React, Next.js, browser, Drizzle, or
PostgreSQL dependency. The browser stores only a versioned set of selected section IDs and reloads
current section details through a small versioned route. Signed-in users can copy that local state
into private, versioned cloud schedules without changing planner-domain semantics.

Better Auth owns authentication token and session mechanics. CUWeave configures hashed magic-link
tokens, database sessions, HTTP-only cookies, and server-side authorization. Product data services
own account status, roles, saved schedules, favorites, reviews, votes, reports, and moderation.
Route Handlers provide stable HTTP boundaries; page components do not contain authorization rules.

## Academic history

`course` is stable identity. Catalog, offering, and section rows are versioned with nullable closing
import references. Meetings are immutable children of section revisions. Complete subject/year
snapshots may retire missing current records; incomplete snapshots cannot. Failed activation
transactions leave active academic records unchanged, and duplicate content/adapter imports do not
duplicate academic rows.

## Product boundaries

The Public Beta Web slice provides course search, unified detail pages, hybrid local/cloud
planning, favorites, structured reviews, share links, and a small moderation queue. Public review
queries redact anonymous authors, and share links expose schedule content without owner identity.
CUSIS remains authoritative. Programme requirements, live scraping, mobile clients, analytics,
and production deployment remain deferred.

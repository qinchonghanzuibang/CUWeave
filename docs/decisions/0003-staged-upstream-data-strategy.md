# ADR 0003: staged upstream-data strategy

- Status: Accepted for future milestones
- Date: 2026-07-15

## Decision

Milestone 0A establishes only infrastructure. It incorporates no upstream source code, fixtures,
assets, branding, course data, schemas, adapters, network fetching, or scrapers.

Milestone 0B will introduce provenance and import boundaries before any academic data is accepted.
A later vertical slice may consume explicitly pinned, validated published data through a
CUWeave-owned adapter. Operating, forking, or rewriting a scraper requires a separate decision and
source-access review.

## Consequences

The Web application cannot display course freshness or import status in Milestone 0A. Future data
must be treated as untrusted, source-backed, historical, and subject to explicit uncertainty.

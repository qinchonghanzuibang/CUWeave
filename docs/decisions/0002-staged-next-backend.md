# ADR 0002: staged backend inside Next.js

- Status: Accepted
- Date: 2026-07-15

## Decision

Begin with Next.js Route Handlers and Server Components while keeping domain and database logic in
framework-independent workspace packages. Version stable HTTP endpoints under `/api/v1`.

Database-dependent routes are dynamic and connect only while handling a request. Importing a
module or building the application must not contact PostgreSQL.

## Consequences

The initial system has low operational complexity. A future API service can reuse domain and
database packages. GraphQL and a separate Node API are not justified at this stage.

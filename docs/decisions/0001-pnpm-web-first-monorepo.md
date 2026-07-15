# ADR 0001: pnpm Web-first monorepo

- Status: Accepted
- Date: 2026-07-15

## Decision

Use a pnpm workspace with a Next.js Web application and small responsibility-based packages. Use
strict TypeScript and one root pnpm lockfile. Do not use Turborepo, Nx, Changesets, or a native
mobile workspace.

## Consequences

Contributors use ordinary pnpm scripts and can understand dependency boundaries without a custom
orchestrator. Shared packages must have an immediate consumer. A native client may be evaluated
much later, but current design and implementation remain responsive Web only.

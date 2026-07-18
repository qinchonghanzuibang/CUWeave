# ADR 0005: Source-backed finite requirement rules

- Status: Accepted
- Date: 2026-07-18

## Decision

CUWeave stores programme requirements as versioned relational sets with source references and evaluates a finite discriminated union in `@cuweave/requirements`. Draft, verified, superseded, and archived states are explicit. Only maintainers with the administrator role may verify or supersede a set, and those actions are audited.

## Rationale

Academic requirements are contextual and change over time. A source-backed finite model makes explanations testable, preserves uncertainty, and prevents arbitrary code or speculative automated interpretation. It also allows old entry-year rules and saved selections to remain inspectable after a new version is published.

## Consequences

Unsupported or approval-dependent wording returns `uncertain`. Maintainers must obtain and review complete official materials before verification. The initial IE 2026 sets remain drafts because the detailed 2026–27 department study schemes are not currently published in the audited sources.

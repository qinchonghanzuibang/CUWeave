# Requirements and launch architecture

## Public availability

Requirement functionality is preserved but disabled by default through the server-only
`FEATURE_REQUIREMENTS_ENABLED` flag. Production sets it explicitly to `false`. When
disabled, public and administrator pages return 404, the API returns 404 before authentication or
persistence, and navigation/course/profile/schedule summaries are omitted. The database schema,
draft records, evaluator, administrative implementation, tests, and source documentation remain
intact for a later reviewed reactivation.

## Dependency direction

`@cuweave/requirements` is a framework-independent, deterministic evaluator. It accepts a versioned definition and normalized course choices; it neither queries PostgreSQL nor imports framework code. `@cuweave/db` owns persistence and reconstructs definitions from relational rows. The Next.js boundary authenticates viewers, selects a set, invokes the evaluator, and renders explanations.

Rules are deliberately finite: minimum course or unit counts, required courses, choose-N lists, allowlists, categories, nested all/any groups, exclusions, no-double-counting, manual review, and unsupported wording. There is no dynamic code execution or automatic interpretation.

Only a `verified` set is reliable. Draft, superseded, and archived sets preserve history and never acquire a verified label through UI inference. Every rule links to at least one source, and verification/publication actions create an audit event.

## Initial programme boundary

The seed creates 2026-entry MPhil and PhD Information Engineering sets as drafts. The CUHK Graduate School page supports minimum counts of four and six Division-approved graduate courses respectively. The Information Engineering department page currently publishes detailed study schemes only through 2025–26. Therefore detailed 2026 eligibility and Division approval remain uncertain; the complete official 2026–27 study schemes are still required before verification.

## Runtime and deployment boundaries

The browser never receives database, SMTP, authentication, or hashing secrets. Application queries use a bounded pool. Migrations use `DATABASE_MIGRATION_URL` when supplied and run separately from Web startup. Import commands read only approved local files and never run at build or application startup.

Every database-dependent route is dynamic. A Next.js production build must succeed with a valid unreachable database URL. Preview authentication is disabled by default; an explicitly isolated Preview database, exact deployment origin, and explicit opt-in are required to enable it.

# CUWeave

**Plan courses. Share experiences. Navigate your degree.**

**选课、评价与培养规划，一处完成。**

CUWeave is an open-source academic planning platform for students at The Chinese University of
Hong Kong. It brings course discovery, timetable planning, community experience, saved schedules,
and source-backed programme requirements into one coherent Web experience.

[![CI](https://github.com/qinchonghanzuibang/CUWeave/actions/workflows/ci.yml/badge.svg)](https://github.com/qinchonghanzuibang/CUWeave/actions/workflows/ci.yml)
[![License: AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-2563eb.svg)](LICENSE)
![Status: Public Beta](https://img.shields.io/badge/status-Public%20Beta-7c3aed.svg)

> **CUWeave is an unofficial, student-led project. It is not affiliated with or endorsed by CUHK.
> Always verify final course and enrollment information in CUSIS.**

## What is CUWeave?

CUWeave connects the decisions students usually make across separate tools. Discover a course,
inspect its offerings and meetings, add a section to a timetable, save the schedule, follow the
course, read experience tied to a specific instructor or offering, and evaluate programme progress
without losing context between pages.

The result is a unified course experience: academic records, personal planning, and community
knowledge remain connected while their different sources and confidence levels stay visible.

## Features

- **Course discovery** — Search and filter courses, offerings, sections, meetings, and instructors.
- **Timetable planner** — Build local schedules with deterministic conflict detection and explicit
  uncertainty for incomplete teaching dates.
- **Accounts and cloud schedules** — Save, rename, duplicate, import, share, and revoke schedules
  with account isolation and optimistic concurrency.
- **Favorites** — Keep a private course shortlist connected to course and planning views.
- **Contextual reviews** — Share experience for a specific course offering and, optionally, a
  specific instructor across structured rating dimensions.
- **Community safety** — Vote on reviews, report concerns, preserve revisions, and support audited
  moderation decisions.
- **Programme requirement checking** — Combine schedule, favorite, and manually entered courses in
  an explainable, source-linked evaluation that distinguishes satisfied, missing, and uncertain
  requirements.
- **Unified course details** — See academic history, current offerings, planning actions,
  requirement context, and community experience in one place.

## Designed for trust

- Imported academic records retain source URI, upstream revision, retrieval time, adapter version,
  snapshot hash, and import history.
- Changed source records create historical versions instead of silently overwriting the past.
- Missing, ambiguous, or approval-dependent information stays uncertain; CUWeave does not invent
  academic rules or meeting details.
- Anonymous reviews hide account identity publicly, while the authenticated author relationship is
  retained internally for editing, abuse handling, and moderation.
- Rate limiting uses keyed identifiers; raw IP addresses are neither stored nor logged.
- CUWeave never asks for CUHK passwords, OnePass credentials, student IDs (SID), or transcripts.
- CUSIS and official CUHK materials remain authoritative for enrollment and degree decisions.

## Current coverage

The local import pipeline has been validated against pinned **2026–27 IERG and ENGG** data from the
audited Another Planner revision. Real academic JSON remains outside this repository and is never
fetched automatically.

The two Information Engineering 2026 requirement sets—for the MPhil and PhD routes—remain
**drafts**. Official material supports their minimum graduate-course counts, but complete detailed
2026–27 study schemes are still required before the sets can be verified. CUWeave does not yet
claim whole-university course or programme coverage.

## Technology

- Next.js, React, TypeScript, and Tailwind CSS
- PostgreSQL and Drizzle ORM
- Better Auth with database-backed sessions and provider-neutral SMTP
- Python, Pydantic, and Psycopg
- Vitest, pytest, Playwright, Ruff, and GitHub Actions

## Local development

Requirements: Node.js 22+, pnpm 11+, Python 3.12+, uv, and Docker Compose.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
(cd services/ingest && uv sync --frozen)

pnpm db:up
pnpm db:migrate
pnpm ingest import tests/fixtures/synthetic-subject.json \
  --manifest tests/fixtures/synthetic-manifest.json
pnpm dev:seed
pnpm requirements:seed
pnpm dev
```

Open <http://localhost:3000>. Development magic links are displayed locally when
`AUTH_DEV_MODE=true`.

To import the reviewed IERG and ENGG files directly from the pinned, read-only upstream checkout:

```bash
CUWEAVE_UPSTREAM_DIR=/absolute/path/to/another-cuhk-course-planner \
  pnpm data:import:local
```

The command verifies the audited revision and does not copy source files into CUWeave. See the
[local import guide](docs/upstream/importing.md) for provenance and manifest requirements.

## Contributing

Contributions that improve accuracy, accessibility, privacy, or student usefulness are welcome.
Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change, and report vulnerabilities
privately according to [SECURITY.md](SECURITY.md).

## Policies

The current publishable policy drafts are available in the Web application and their source files:

- [Privacy Policy (`/privacy`)](apps/web/app/privacy/page.tsx)
- [Terms of Use (`/terms`)](apps/web/app/terms/page.tsx)
- [Community Guidelines (`/community-guidelines`)](apps/web/app/community-guidelines/page.tsx)
- [Review and Moderation Policy (`/moderation-policy`)](apps/web/app/moderation-policy/page.tsx)

These drafts require the maintainer and legal review identified in the documents before a public
production launch.

## License and acknowledgements

CUWeave source code is licensed under the [GNU Affero General Public License v3.0 only](LICENSE).
Academic data, university materials, names, and third-party projects remain subject to their own
rights and licenses. Review of an upstream project does not mean its code, fixtures, assets, or
academic data were incorporated into CUWeave. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
for the audited references and notices.

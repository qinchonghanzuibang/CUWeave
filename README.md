<div align="center">

# CUWeave

### Explore courses. Plan your schedule. Share experiences.

CUWeave helps CUHK students discover courses, build weekly timetables, save different plans, and
learn from other students’ experiences—all in one place.

**[Try CUWeave](https://cuweave.org)** · [Contribute](#contributing)

</div>

<!--
Demo video replacement:
- Keep docs/assets/readme/demo-cover.png as the poster image.
- Replace only the anchor href below with the final public demo-video URL.
- Recommended video: 1600 × 900, 45–60 seconds, following docs/readme-media-guide.md.
-->
<a href="https://cuweave.org">
  <img
    src="docs/assets/readme/demo-cover.png"
    alt="A populated CUWeave weekly timetable with real course meetings arranged from Monday to Sunday"
    width="1600"
  />
</a>

<p align="center">
  <sub>Turn course sections into a clear weekly plan.</sub>
</p>

> CUWeave is an unofficial, student-led project. It is not affiliated with or endorsed by The
> Chinese University of Hong Kong. Always verify final course and enrollment details in CUSIS.

## Plan your CUHK term in one place

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>Explore courses</h3>
      Search by course code or title, filter by subject and term, and compare sections, meeting
      times, instructors, and teaching dates.
    </td>
    <td width="33%" valign="top">
      <h3>Plan your schedule</h3>
      Add sections to a Monday–Sunday timetable, switch between academic terms, spot scheduling
      conflicts, and export your plan to a calendar.
    </td>
    <td width="33%" valign="top">
      <h3>Share experiences</h3>
      Read experiences tied to a course offering or instructor. Eligible students can sign in to
      contribute, vote, and report concerns.
    </td>
  </tr>
</table>

## See CUWeave in action

<table>
  <tr>
    <td width="50%" valign="top">
      <img
        src="docs/assets/readme/course-discovery.png"
        alt="CUWeave course discovery showing an IERG search and a grid of matching courses"
        width="720"
      />
      <p align="center"><sub>Search the current catalog and narrow it by subject or term.</sub></p>
    </td>
    <td width="50%" valign="top">
      <img
        src="docs/assets/readme/course-detail.png"
        alt="CUWeave course detail for IERG5310 with its title, section, meeting time, location, teaching dates, instructor, and Add to planner action"
        width="720"
      />
      <p align="center"><sub>Inspect a section in context, then add it directly to the planner.</sub></p>
    </td>
  </tr>
</table>

<img
  src="docs/assets/readme/weekly-planner.png"
  alt="CUWeave planner showing selected sections, Term 1 controls, and a populated Monday-to-Sunday timetable"
  width="1440"
/>

<p align="center">
  <sub>Compare your week at a glance while each meeting stays connected to its course.</sub>
</p>

## Why CUWeave

- **One connected workflow.** Go from finding a course to comparing sections and building a weekly
  plan without losing context.
- **Built for CUHK course structure.** Offerings, sections, meeting patterns, teaching dates, and
  instructors stay visible where they matter.
- **Plans that stay with you.** Start anonymously in the browser, then sign in to save named
  schedules and share read-only copies.
- **Source context stays visible.** See where catalog information came from and when it was
  imported.

## Available now

CUWeave is available at **[cuweave.org](https://cuweave.org)**. Course discovery and local planning
work without an account. Saving favorites and schedules, sharing plans, and contributing reviews
require a one-time code sent to an exact `@link.cuhk.edu.hk` address.

The current catalog covers the complete imported 2026–27 subject manifest. See the always-current
[data status page](https://cuweave.org/data-status) for course, offering, section, source, and import
details.

CUWeave is unofficial and does not replace CUSIS or official CUHK materials. Always verify final
enrollment availability, times, venues, teaching dates, and academic decisions with the
university’s authoritative systems.

## Trust and privacy

- CUWeave never asks for a OnePass password, student ID, legal name, or transcript.
- Anonymous planner choices stay in the current browser unless the student chooses to sign in and
  save a private cloud copy.
- Public anonymous reviews do not expose the author’s account identity.
- Course pages retain visible source and update context, and corrections can be reported without
  including private student information.

Read the current [Privacy Policy](https://cuweave.org/privacy),
[Terms of Use](https://cuweave.org/terms),
[Community Guidelines](https://cuweave.org/community-guidelines), and
[Review and Moderation Policy](https://cuweave.org/moderation-policy).

## Open-source project

[![CI](https://github.com/qinchonghanzuibang/CUWeave/actions/workflows/ci.yml/badge.svg)](https://github.com/qinchonghanzuibang/CUWeave/actions/workflows/ci.yml)
[![License: AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-6f2d6c.svg)](LICENSE)

CUWeave is a TypeScript and Python monorepo built with Next.js, React, Tailwind CSS, PostgreSQL,
Drizzle ORM, Better Auth, Pydantic, and Psycopg. Vitest, pytest, Playwright, Ruff, and GitHub Actions
cover application and data-pipeline quality.

<details>
<summary><strong>Run CUWeave locally</strong></summary>

### Requirements

- Node.js 22+
- pnpm 11+
- Python 3.12+ and uv
- Docker Compose

### Setup

```bash
cp .env.example .env
pnpm install --frozen-lockfile
(cd services/ingest && uv sync --frozen)

pnpm db:up
pnpm db:migrate
pnpm ingest import tests/fixtures/synthetic-subject.json \
  --manifest tests/fixtures/synthetic-manifest.json
pnpm dev:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The local setup uses synthetic fixtures; real
academic JSON is not committed or fetched automatically. See the
[local import guide](docs/upstream/importing.md) for the pinned-source validation and import
workflow.

Run the standard project checks with:

```bash
pnpm check
```

</details>

### Contributing

Contributions that improve accuracy, accessibility, privacy, or student usefulness are welcome.
Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. The
[README media guide](docs/readme-media-guide.md) documents how to refresh screenshots and record a
demo without exposing personal information.

For bugs or feature ideas, [open an issue](https://github.com/qinchonghanzuibang/CUWeave/issues).
Report security vulnerabilities privately by following [SECURITY.md](SECURITY.md), not through a
public issue.

### Documentation and policies

- [Architecture overview](docs/architecture/overview.md)
- [Product principles](docs/product/principles.md)
- [Planner semantics](docs/product/planner-semantics.md)
- [Accounts and privacy](docs/product/accounts-and-privacy.md)
- [Reviews and moderation](docs/product/reviews-and-moderation.md)
- [Importing and provenance](docs/upstream/importing.md)
- [Deployment and operations](docs/operations/deployment.md)

### License and acknowledgements

CUWeave source code is licensed under the
[GNU Affero General Public License v3.0 only](LICENSE). Academic data, university materials, names,
and third-party projects remain subject to their own rights and licenses.
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) records the audited references and notices; review
of another project does not mean its code, assets, fixtures, or academic data were incorporated
into CUWeave.

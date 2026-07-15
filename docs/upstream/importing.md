# Local academic data import

CUWeave imports one local subject/year JSON document at a time. It never dereferences `source_uri`
or contacts CUHK. The initial audited compatibility revision is
`6c9ea314ff5595dd90a88bbbdae8d286408d85f3`.

Create a local, untracked manifest:

```json
{
  "source_name": "another-cuhk-course-planner",
  "source_uri": "https://github.com/EagleZhen/another-cuhk-course-planner/blob/REV/data/2026-27/IERG.json",
  "upstream_revision": "REV",
  "expected_revisions": ["REV"],
  "retrieved_at": "2026-07-12T12:27:19.279652+00:00",
  "academic_year": "2026-27",
  "subject": "IERG",
  "completeness": "complete"
}
```

Then validate and import without copying the source file:

```bash
INPUT="$UPSTREAM/data/2026-27/IERG.json"
pnpm ingest validate "$INPUT" --manifest /tmp/ierg-manifest.json
DATABASE_URL="$DATABASE_URL" pnpm ingest import "$INPUT" --manifest /tmp/ierg-manifest.json
```

Repeat with `ENGG`. The operator must supply and approve the 40-character revision. Completeness is
an explicit scope assertion: `complete` may retire missing active records for that subject/year;
`incomplete` never does. The exact JSON content is hashed and stored in PostgreSQL, not Git.

Tests use the independently synthetic `ZZZZ` fixture. Real course information remains local and is
subject to its source provenance; no real academic JSON is used by CI.

# CUWeave ingestion service

This Python 3.12+ package validates local Another Planner-compatible JSON and imports one
subject/year scope transactionally. It never fetches URLs or invokes a scraper.

```bash
pnpm ingest validate "$INPUT" --manifest "$MANIFEST"
DATABASE_URL=postgresql://... pnpm ingest import "$INPUT" --manifest "$MANIFEST"
```

The manifest supplies source URI, retrieval time, academic year, subject, completeness, and the
operator-confirmed upstream revision. Set `expected_revisions` to an approved revision list when
the import must fail closed. The current approved import revision is
`a8104fe1c822196fef5bf7ab3595f226951518a7`.

Tests use independently authored synthetic fixtures. Real local upstream JSON remains outside the
CUWeave repository and must never be committed.

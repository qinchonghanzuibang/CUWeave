import json
from datetime import UTC, datetime
from pathlib import Path

from cuweave_ingest.catalog import discover_subjects, validate_catalog
from cuweave_ingest.cli import APPROVED_UPSTREAM_REVISION


def synthetic_upstream(tmp_path: Path) -> Path:
    manifest = tmp_path / "web/src/lib/generated/subjects.ts"
    manifest.parent.mkdir(parents=True)
    manifest.write_text("export const SUBJECTS_BY_YEAR = {\n  '2026-27': ['AAAA', 'BBBB'],\n}\n")
    fixture = json.loads((Path(__file__).parent / "fixtures/synthetic-subject.json").read_text())
    for subject in ("AAAA", "BBBB"):
        document = json.loads(json.dumps(fixture))
        document["metadata"]["subject"] = subject
        for course in document["courses"]:
            course["subject"] = subject
            for term in course["terms"]:
                term["term_name"] = term["term_name"].replace("2099-00", "2026-27")
        path = tmp_path / "data/2026-27" / f"{subject}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(document))
    return tmp_path


def test_manifest_completeness_and_deterministic_report(tmp_path: Path) -> None:
    upstream = synthetic_upstream(tmp_path)
    assert discover_subjects(upstream, "2026-27") == (["AAAA", "BBBB"], ["AAAA", "BBBB"])
    retrieved = datetime.now(UTC)
    arguments = (
        upstream,
        "2026-27",
        APPROVED_UPSTREAM_REVISION,
        retrieved,
        lambda path: path.read_bytes(),
    )
    first, validated = validate_catalog(*arguments)
    second, _ = validate_catalog(*arguments)
    assert first == second
    assert first["status"] == "validated"
    assert first["validated_subject_count"] == 2
    assert sorted(validated) == ["AAAA", "BBBB"]


def test_missing_and_unexpected_files_are_fatal(tmp_path: Path) -> None:
    upstream = synthetic_upstream(tmp_path)
    (upstream / "data/2026-27/BBBB.json").unlink()
    (upstream / "data/2026-27/CCCC.json").write_text("{}")
    report, _ = validate_catalog(
        upstream,
        "2026-27",
        APPROVED_UPSTREAM_REVISION,
        datetime.now(UTC),
        lambda path: path.read_bytes(),
    )
    assert report["status"] == "failed"
    assert report["missing_subject_files"] == ["BBBB"]
    assert report["unexpected_subject_files"] == ["CCCC"]

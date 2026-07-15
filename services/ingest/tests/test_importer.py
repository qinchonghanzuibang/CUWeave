import json
import os
from pathlib import Path

import psycopg
import pytest

from cuweave_ingest.adapter import adapt
from cuweave_ingest.importer import ImportDatabaseError, import_snapshot
from cuweave_ingest.models import Manifest

FIXTURES = Path(__file__).parent / "fixtures"
DATABASE_URL = os.environ.get("CUWEAVE_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="CUWEAVE_TEST_DATABASE_URL is not set")


def fixture() -> tuple[bytes, Manifest]:
    return (
        (FIXTURES / "synthetic-subject.json").read_bytes(),
        Manifest.model_validate_json((FIXTURES / "synthetic-manifest.json").read_bytes()),
    )


@pytest.fixture(autouse=True)
def clean_subject() -> None:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL) as connection, connection.cursor() as cursor:
        for table in (
            "section_instructor",
            "meeting",
            "section",
            "course_offering",
            "course_catalog_version",
            "instructor",
            "course",
            "import_run",
            "source_snapshot",
        ):
            cursor.execute(f"truncate table {table} cascade")


def counts() -> dict[str, int]:
    assert DATABASE_URL
    result = {}
    with psycopg.connect(DATABASE_URL) as connection, connection.cursor() as cursor:
        for table in ("course", "course_catalog_version", "course_offering", "section", "meeting"):
            cursor.execute(f"select count(*) from {table}")
            result[table] = cursor.fetchone()[0]
    return result


def test_real_import_and_duplicate_idempotency() -> None:
    raw, manifest = fixture()
    snapshot = adapt(raw, manifest)
    first = import_snapshot(raw.decode(), snapshot, manifest, DATABASE_URL)
    before = counts()
    second = import_snapshot(raw.decode(), snapshot, manifest, DATABASE_URL)
    assert first["status"] == "succeeded"
    assert second["status"] == "skipped"
    assert counts() == before


def test_changed_section_history_and_complete_retirement() -> None:
    raw, manifest = fixture()
    import_snapshot(raw.decode(), adapt(raw, manifest), manifest, DATABASE_URL)
    document = json.loads(raw)
    document["courses"][0]["terms"][0]["schedule"][0]["meetings"][0]["location"] = (
        "Synthetic Room B"
    )
    document["courses"][1]["terms"][0]["schedule"] = []
    changed = json.dumps(document, sort_keys=True).encode()
    report = import_snapshot(changed.decode(), adapt(changed, manifest), manifest, DATABASE_URL)
    assert report["counts"]["sections_changed"] == 1
    assert report["counts"]["records_retired"] >= 1
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL) as connection, connection.cursor() as cursor:
        cursor.execute("select count(*) from section")
        assert cursor.fetchone()[0] == 3
        cursor.execute("select count(*) from section where valid_to_import_run_id is null")
        assert cursor.fetchone()[0] == 1


def test_incomplete_snapshot_does_not_retire_and_failure_rolls_back() -> None:
    raw, manifest = fixture()
    snapshot = adapt(raw, manifest)
    import_snapshot(raw.decode(), snapshot, manifest, DATABASE_URL)
    before = counts()
    incomplete = manifest.model_copy(update={"completeness": "incomplete"})
    document = json.loads(raw)
    document["courses"][1]["terms"][0]["schedule"] = []
    changed = json.dumps(document, sort_keys=True).encode()
    import_snapshot(changed.decode(), adapt(changed, incomplete), incomplete, DATABASE_URL)
    assert counts()["section"] == before["section"]

    failed_document = json.loads(raw)
    failed_document["courses"][0]["terms"][0]["schedule"][0]["class_attributes"] = "Changed"
    failed = json.dumps(failed_document, sort_keys=True).encode()
    stable = counts()
    with pytest.raises(ImportDatabaseError):
        import_snapshot(
            failed.decode(), adapt(failed, manifest), manifest, DATABASE_URL, fail_after_sections=1
        )
    assert counts() == stable

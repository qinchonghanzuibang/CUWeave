"""Pinned, offline full-catalog discovery, validation, and import orchestration."""

from __future__ import annotations

import json
import re
from collections import Counter
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg

from .adapter import ImportValidationError, adapt
from .importer import import_snapshot, validation_report
from .models import Manifest, NormalizedSnapshot

MANIFEST_PATH = Path("web/src/lib/generated/subjects.ts")
SUBJECT_LINE = re.compile(r"^\s*'(?P<year>\d{4}-\d{2})': \[(?P<subjects>.*)\],\s*$")
SUBJECT_CODE = re.compile(r"'([A-Z]{4})'")


def discover_subjects(upstream: Path, academic_year: str) -> tuple[list[str], list[str]]:
    """Return manifest subjects and data files without executing upstream code."""
    manifest_path = upstream / MANIFEST_PATH
    if not manifest_path.is_file():
        raise ImportValidationError("upstream subject manifest is missing")
    subjects: list[str] | None = None
    for line in manifest_path.read_text(encoding="utf-8").splitlines():
        match = SUBJECT_LINE.fullmatch(line)
        if match and match.group("year") == academic_year:
            subjects = SUBJECT_CODE.findall(match.group("subjects"))
            break
    if not subjects or len(subjects) != len(set(subjects)):
        raise ImportValidationError("subject manifest is missing, empty, or duplicated")
    data_dir = upstream / "data" / academic_year
    if not data_dir.is_dir():
        raise ImportValidationError("upstream academic-year data directory is missing")
    discovered = sorted(path.stem for path in data_dir.glob("*.json") if path.is_file())
    return subjects, discovered


def _manifest(
    *, upstream_revision: str, retrieved_at: datetime, academic_year: str, subject: str
) -> Manifest:
    return Manifest(
        source_name="another-cuhk-course-planner",
        source_uri=(
            "https://github.com/EagleZhen/another-cuhk-course-planner/blob/"
            f"{upstream_revision}/data/{academic_year}/{subject}.json"
        ),
        upstream_revision=upstream_revision,
        expected_revisions=[upstream_revision],
        retrieved_at=retrieved_at,
        academic_year=academic_year,
        subject=subject,
        completeness="complete",
    )


def validate_catalog(
    upstream: Path,
    academic_year: str,
    revision: str,
    retrieved_at: datetime,
    load: Callable[[Path], bytes],
) -> tuple[dict[str, Any], dict[str, tuple[bytes, Manifest, NormalizedSnapshot]]]:
    expected, discovered = discover_subjects(upstream, academic_year)
    expected_set, discovered_set = set(expected), set(discovered)
    report: dict[str, Any] = {
        "schema_version": 1,
        "status": "validated",
        "academic_year": academic_year,
        "upstream_revision": revision,
        "expected_subject_count": len(expected),
        "discovered_file_count": len(discovered),
        "missing_subject_files": sorted(expected_set - discovered_set),
        "unexpected_subject_files": sorted(discovered_set - expected_set),
        "empty_subject_files": [],
        "failed_subjects": {},
        "warnings_by_subject": {},
        "counts": {"courses": 0, "offerings": 0, "sections": 0},
    }
    validated: dict[str, tuple[bytes, Manifest, NormalizedSnapshot]] = {}
    for subject in expected:
        if subject not in discovered_set:
            continue
        path = upstream / "data" / academic_year / f"{subject}.json"
        try:
            raw = load(path)
            if not raw.strip():
                report["empty_subject_files"].append(subject)
                continue
            manifest = _manifest(
                upstream_revision=revision,
                retrieved_at=retrieved_at,
                academic_year=academic_year,
                subject=subject,
            )
            snapshot = adapt(raw, manifest)
            subject_report = validation_report(snapshot, manifest)
            for key in ("courses", "offerings", "sections"):
                report["counts"][key] += subject_report["counts"][key]
            codes = Counter(warning["code"] for warning in snapshot.warnings)
            report["warnings_by_subject"][subject] = dict(sorted(codes.items()))
            validated[subject] = (raw, manifest, snapshot)
        except (ImportValidationError, ValueError) as error:
            report["failed_subjects"][subject] = str(error)
    report["empty_subject_files"].sort()
    fatal = any(
        report[key]
        for key in (
            "missing_subject_files",
            "unexpected_subject_files",
            "empty_subject_files",
            "failed_subjects",
        )
    )
    report["status"] = "failed" if fatal else "validated"
    report["validated_subject_count"] = len(validated)
    report["warning_count"] = sum(
        sum(counts.values()) for counts in report["warnings_by_subject"].values()
    )
    return report, validated


def database_counts(database_url: str, academic_year: str) -> dict[str, int]:
    with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            select
              (select count(*) from course_catalog_version
                where academic_year=%s and valid_to_import_run_id is null),
              (select count(*) from course_offering
                where academic_year=%s and valid_to_import_run_id is null),
              (select count(*) from section s join course_offering o on o.id=s.offering_id
                where o.academic_year=%s and o.valid_to_import_run_id is null
                  and s.valid_to_import_run_id is null),
              (select count(*) from instructor)
            """,
            (academic_year, academic_year, academic_year),
        )
        row = cursor.fetchone()
    return dict(zip(("courses", "offerings", "sections", "instructors"), row, strict=True))


def import_catalog(
    validation: dict[str, Any],
    validated: dict[str, tuple[bytes, Manifest, NormalizedSnapshot]],
    database_url: str,
) -> dict[str, Any]:
    if validation["status"] != "validated":
        raise ImportValidationError("all catalog files must validate before import")
    subject_reports = []
    for subject in sorted(validated):
        raw, manifest, snapshot = validated[subject]
        subject_reports.append(
            import_snapshot(raw.decode("utf-8"), snapshot, manifest, database_url)
        )
    counts = database_counts(database_url, validation["academic_year"])
    differences = {
        key: counts[key] - validation["counts"][key] for key in ("courses", "offerings", "sections")
    }
    status = "complete" if all(value == 0 for value in differences.values()) else "partial"
    coverage = {
        **validation,
        "status": status,
        "imported_subject_count": len(subject_reports),
        "database_counts": counts,
        "database_source_differences": differences,
        "subject_imports": subject_reports,
    }
    with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            insert into catalog_coverage (academic_year, status, upstream_revision,
              expected_subject_count, discovered_file_count, imported_subject_count,
              course_count, offering_count, section_count, instructor_count,
              warning_count, report, validated_at, imported_at)
            values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now(),now())
            on conflict (academic_year) do update set status=excluded.status,
              upstream_revision=excluded.upstream_revision,
              expected_subject_count=excluded.expected_subject_count,
              discovered_file_count=excluded.discovered_file_count,
              imported_subject_count=excluded.imported_subject_count,
              course_count=excluded.course_count, offering_count=excluded.offering_count,
              section_count=excluded.section_count, instructor_count=excluded.instructor_count,
              warning_count=excluded.warning_count, report=excluded.report,
              validated_at=excluded.validated_at, imported_at=excluded.imported_at
            """,
            (
                coverage["academic_year"],
                status,
                coverage["upstream_revision"],
                coverage["expected_subject_count"],
                coverage["discovered_file_count"],
                coverage["imported_subject_count"],
                counts["courses"],
                counts["offerings"],
                counts["sections"],
                counts["instructors"],
                coverage["warning_count"],
                json.dumps(coverage),
            ),
        )
    return coverage

"""Transactional PostgreSQL persistence for normalized academic snapshots."""

from __future__ import annotations

import json
import os
from typing import Any

import psycopg
from psycopg.rows import dict_row

from .adapter import ADAPTER_NAME, ADAPTER_VERSION
from .models import Manifest, NormalizedSection, NormalizedSnapshot


class ImportDatabaseError(RuntimeError):
    """Sanitized persistence error."""


def _report(
    snapshot: NormalizedSnapshot, manifest: Manifest, status: str, counts: dict[str, int]
) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "status": status,
        "source": manifest.source_name,
        "subject": manifest.subject,
        "academic_year": manifest.academic_year,
        "snapshot_sha256": snapshot.content_sha256,
        "adapter": {"name": ADAPTER_NAME, "version": ADAPTER_VERSION},
        "counts": dict(sorted(counts.items())),
        "warnings": list(snapshot.warnings),
    }


def validation_report(snapshot: NormalizedSnapshot, manifest: Manifest) -> dict[str, Any]:
    counts = {
        "courses": len(snapshot.courses),
        "offerings": sum(len(course.offerings) for course in snapshot.courses),
        "sections": sum(
            len(offering.sections) for course in snapshot.courses for offering in course.offerings
        ),
    }
    return _report(snapshot, manifest, "validated", counts)


def _insert_section_children(
    cursor: psycopg.Cursor[dict[str, Any]], section_id: Any, section: NormalizedSection
) -> None:
    instructors: dict[str, dict[str, Any]] = {}
    for meeting in section.meetings:
        cursor.execute(
            """
            insert into meeting (
              section_id, ordinal, time_raw, time_status, weekday, start_time, end_time,
              teaching_dates_raw, location_raw, instructor_display_raw
            ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                section_id,
                meeting.ordinal,
                meeting.time_raw,
                meeting.time_status,
                meeting.weekday,
                meeting.start_time,
                meeting.end_time,
                meeting.teaching_dates_raw,
                meeting.location_raw,
                meeting.instructor_display_raw,
            ),
        )
        display = meeting.instructor_display_raw.strip()
        if display.upper() != "TBA":
            instructors.setdefault(
                display, {"raw": meeting.instructor_display_raw, "ordinals": []}
            )["ordinals"].append(meeting.ordinal)

    for display_key in sorted(instructors):
        cursor.execute(
            """
            insert into instructor (display_key, display_value)
            values (%s, %s)
            on conflict (display_key) do update set display_value = instructor.display_value
            returning id
            """,
            (display_key, display_key),
        )
        instructor_id = cursor.fetchone()["id"]
        values = instructors[display_key]
        cursor.execute(
            """
            insert into section_instructor (
              section_id, instructor_id, source_display_raw, meeting_ordinals
            ) values (%s, %s, %s, %s)
            """,
            (section_id, instructor_id, values["raw"], values["ordinals"]),
        )


def import_snapshot(
    raw_text: str,
    snapshot: NormalizedSnapshot,
    manifest: Manifest,
    database_url: str | None = None,
    *,
    fail_after_sections: int | None = None,
) -> dict[str, Any]:
    url = database_url or os.environ.get("DATABASE_URL")
    if not url:
        raise ImportDatabaseError("DATABASE_URL is required")

    counts = {
        "courses_added": 0,
        "catalog_versions_added": 0,
        "offerings_added": 0,
        "sections_added": 0,
        "sections_changed": 0,
        "records_unchanged": 0,
        "records_retired": 0,
    }

    try:
        with psycopg.connect(url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into source_snapshot (
                      source_name, source_uri, upstream_revision, retrieved_at, academic_year,
                      subject_code, is_complete, content_sha256, raw_content
                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    on conflict on constraint source_snapshot_identity_unique
                    do update set raw_content = excluded.raw_content
                    returning id
                    """,
                    (
                        manifest.source_name,
                        manifest.source_uri,
                        manifest.upstream_revision,
                        manifest.retrieved_at,
                        manifest.academic_year,
                        manifest.subject,
                        manifest.completeness == "complete",
                        snapshot.content_sha256,
                        raw_text,
                    ),
                )
                snapshot_id = cursor.fetchone()["id"]
                cursor.execute(
                    """
                    select id from import_run
                    where snapshot_id = %s and adapter_name = %s and adapter_version = %s
                      and status = 'succeeded'
                    """,
                    (snapshot_id, ADAPTER_NAME, ADAPTER_VERSION),
                )
                existing = cursor.fetchone()
                if existing:
                    report = _report(snapshot, manifest, "skipped", counts)
                    cursor.execute(
                        """
                        insert into import_run (
                          snapshot_id, adapter_name, adapter_version, status,
                          reused_import_run_id, finished_at, report
                        ) values (%s, %s, %s, 'skipped', %s, now(), %s)
                        """,
                        (
                            snapshot_id,
                            ADAPTER_NAME,
                            ADAPTER_VERSION,
                            existing["id"],
                            json.dumps(report),
                        ),
                    )
                    connection.commit()
                    return report

                cursor.execute(
                    """
                    insert into import_run (snapshot_id, adapter_name, adapter_version, status)
                    values (%s, %s, %s, 'running') returning id
                    """,
                    (snapshot_id, ADAPTER_NAME, ADAPTER_VERSION),
                )
                import_run_id = cursor.fetchone()["id"]
                connection.commit()

            try:
                with connection.transaction():
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "select pg_advisory_xact_lock(hashtext(%s), hashtext(%s))",
                            (manifest.subject, manifest.academic_year),
                        )
                        seen_courses: set[Any] = set()
                        seen_offerings: set[tuple[Any, str]] = set()
                        processed_sections = 0

                        for normalized_course in snapshot.courses:
                            cursor.execute(
                                """
                                insert into course (subject_code, catalog_number)
                                values (%s, %s)
                                on conflict (subject_code, catalog_number)
                                do update set subject_code = excluded.subject_code
                                returning id, (xmax = 0) as inserted
                                """,
                                (normalized_course.subject_code, normalized_course.catalog_number),
                            )
                            course_row = cursor.fetchone()
                            course_id = course_row["id"]
                            seen_courses.add(course_id)
                            if course_row["inserted"]:
                                counts["courses_added"] += 1

                            cursor.execute(
                                """
                                select * from course_catalog_version
                                where course_id = %s and academic_year = %s
                                  and valid_to_import_run_id is null
                                """,
                                (course_id, manifest.academic_year),
                            )
                            catalog = cursor.fetchone()
                            if (
                                catalog
                                and catalog["record_hash"].strip() == normalized_course.record_hash
                            ):
                                catalog_id = catalog["id"]
                                cursor.execute(
                                    "update course_catalog_version set last_seen_snapshot_id = %s where id = %s",
                                    (snapshot_id, catalog_id),
                                )
                                counts["records_unchanged"] += 1
                            else:
                                if catalog:
                                    cursor.execute(
                                        "update course_catalog_version set valid_to_import_run_id = %s where id = %s",
                                        (import_run_id, catalog["id"]),
                                    )
                                    counts["records_retired"] += 1
                                cursor.execute(
                                    """
                                    insert into course_catalog_version (
                                      course_id, academic_year, subject_raw, course_code_raw, title_raw,
                                      title, credits_raw, credits, academic_career_raw, record_hash,
                                      valid_from_import_run_id, first_seen_snapshot_id, last_seen_snapshot_id
                                    ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                    returning id
                                    """,
                                    (
                                        course_id,
                                        manifest.academic_year,
                                        normalized_course.subject_raw,
                                        normalized_course.course_code_raw,
                                        normalized_course.title_raw,
                                        normalized_course.title,
                                        normalized_course.credits_raw,
                                        normalized_course.credits,
                                        normalized_course.academic_career_raw,
                                        normalized_course.record_hash,
                                        import_run_id,
                                        snapshot_id,
                                        snapshot_id,
                                    ),
                                )
                                catalog_id = cursor.fetchone()["id"]
                                counts["catalog_versions_added"] += 1

                            for offering in normalized_course.offerings:
                                cursor.execute(
                                    """
                                    select * from course_offering
                                    where course_id = %s and academic_year = %s and term_key = %s
                                      and valid_to_import_run_id is null
                                    """,
                                    (course_id, manifest.academic_year, offering.term_key),
                                )
                                active_offering = cursor.fetchone()
                                if (
                                    active_offering
                                    and active_offering["record_hash"].strip()
                                    == offering.record_hash
                                ):
                                    offering_id = active_offering["id"]
                                    cursor.execute(
                                        "update course_offering set last_seen_snapshot_id = %s where id = %s",
                                        (snapshot_id, offering_id),
                                    )
                                    counts["records_unchanged"] += 1
                                else:
                                    if active_offering:
                                        cursor.execute(
                                            "update section set valid_to_import_run_id = %s where offering_id = %s and valid_to_import_run_id is null",
                                            (import_run_id, active_offering["id"]),
                                        )
                                        counts["records_retired"] += cursor.rowcount
                                        cursor.execute(
                                            "update course_offering set valid_to_import_run_id = %s where id = %s",
                                            (import_run_id, active_offering["id"]),
                                        )
                                        counts["records_retired"] += 1
                                    cursor.execute(
                                        """
                                        insert into course_offering (
                                          course_id, catalog_version_id, academic_year, term_key,
                                          term_code_raw, term_name_raw, record_hash, valid_from_import_run_id,
                                          first_seen_snapshot_id, last_seen_snapshot_id
                                        ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                        returning id
                                        """,
                                        (
                                            course_id,
                                            catalog_id,
                                            manifest.academic_year,
                                            offering.term_key,
                                            offering.term_code_raw,
                                            offering.term_name_raw,
                                            offering.record_hash,
                                            import_run_id,
                                            snapshot_id,
                                            snapshot_id,
                                        ),
                                    )
                                    offering_id = cursor.fetchone()["id"]
                                    counts["offerings_added"] += 1
                                seen_offerings.add((course_id, offering.term_key))

                                seen_section_keys: list[str] = []
                                for normalized_section in offering.sections:
                                    seen_section_keys.append(normalized_section.section_key)
                                    cursor.execute(
                                        """
                                        select * from section where offering_id = %s and section_key = %s
                                          and valid_to_import_run_id is null
                                        """,
                                        (offering_id, normalized_section.section_key),
                                    )
                                    active_section = cursor.fetchone()
                                    if (
                                        active_section
                                        and active_section["revision_hash"].strip()
                                        == normalized_section.revision_hash
                                    ):
                                        cursor.execute(
                                            "update section set last_seen_snapshot_id = %s where id = %s",
                                            (snapshot_id, active_section["id"]),
                                        )
                                        counts["records_unchanged"] += 1
                                        continue
                                    if active_section:
                                        cursor.execute(
                                            "update section set valid_to_import_run_id = %s where id = %s",
                                            (import_run_id, active_section["id"]),
                                        )
                                        counts["sections_changed"] += 1
                                    cursor.execute(
                                        """
                                        insert into section (
                                          offering_id, section_key, section_label_raw, class_attributes_raw,
                                          capacity_raw, capacity, enrolled_raw, enrolled,
                                          available_seats_raw, available_seats, waitlist_capacity_raw,
                                          waitlist_capacity, waitlist_total_raw, waitlist_total,
                                          availability_status_raw, revision_hash, valid_from_import_run_id,
                                          first_seen_snapshot_id, last_seen_snapshot_id
                                        ) values (
                                          %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                                          %s, %s, %s, %s, %s, %s, %s, %s, %s
                                        ) returning id
                                        """,
                                        (
                                            offering_id,
                                            normalized_section.section_key,
                                            normalized_section.section_label_raw,
                                            normalized_section.class_attributes_raw,
                                            normalized_section.capacity_raw,
                                            normalized_section.capacity,
                                            normalized_section.enrolled_raw,
                                            normalized_section.enrolled,
                                            normalized_section.available_seats_raw,
                                            normalized_section.available_seats,
                                            normalized_section.waitlist_capacity_raw,
                                            normalized_section.waitlist_capacity,
                                            normalized_section.waitlist_total_raw,
                                            normalized_section.waitlist_total,
                                            normalized_section.availability_status_raw,
                                            normalized_section.revision_hash,
                                            import_run_id,
                                            snapshot_id,
                                            snapshot_id,
                                        ),
                                    )
                                    section_id = cursor.fetchone()["id"]
                                    _insert_section_children(cursor, section_id, normalized_section)
                                    counts["sections_added"] += 1
                                    processed_sections += 1
                                    if fail_after_sections == processed_sections:
                                        raise RuntimeError("injected transactional failure")

                                if manifest.completeness == "complete":
                                    if seen_section_keys:
                                        cursor.execute(
                                            """
                                            update section set valid_to_import_run_id = %s
                                            where offering_id = %s and valid_to_import_run_id is null
                                              and not (section_key = any(%s))
                                            """,
                                            (import_run_id, offering_id, seen_section_keys),
                                        )
                                    else:
                                        cursor.execute(
                                            "update section set valid_to_import_run_id = %s where offering_id = %s and valid_to_import_run_id is null",
                                            (import_run_id, offering_id),
                                        )
                                    counts["records_retired"] += cursor.rowcount

                        if manifest.completeness == "complete":
                            cursor.execute(
                                """
                                select o.id, o.course_id, o.term_key from course_offering o
                                join course c on c.id = o.course_id
                                where c.subject_code = %s and o.academic_year = %s
                                  and o.valid_to_import_run_id is null
                                """,
                                (manifest.subject, manifest.academic_year),
                            )
                            for row in cursor.fetchall():
                                if (row["course_id"], row["term_key"]) not in seen_offerings:
                                    cursor.execute(
                                        "update section set valid_to_import_run_id = %s where offering_id = %s and valid_to_import_run_id is null",
                                        (import_run_id, row["id"]),
                                    )
                                    counts["records_retired"] += cursor.rowcount
                                    cursor.execute(
                                        "update course_offering set valid_to_import_run_id = %s where id = %s",
                                        (import_run_id, row["id"]),
                                    )
                                    counts["records_retired"] += 1
                            cursor.execute(
                                """
                                select v.id, v.course_id from course_catalog_version v
                                join course c on c.id = v.course_id
                                where c.subject_code = %s and v.academic_year = %s
                                  and v.valid_to_import_run_id is null
                                """,
                                (manifest.subject, manifest.academic_year),
                            )
                            for row in cursor.fetchall():
                                if row["course_id"] not in seen_courses:
                                    cursor.execute(
                                        "update course_catalog_version set valid_to_import_run_id = %s where id = %s",
                                        (import_run_id, row["id"]),
                                    )
                                    counts["records_retired"] += 1

                        report = _report(snapshot, manifest, "succeeded", counts)
                        cursor.execute(
                            """
                            update import_run set status = 'succeeded', finished_at = now(), report = %s
                            where id = %s
                            """,
                            (json.dumps(report), import_run_id),
                        )
                return report
            except Exception as error:
                connection.rollback()
                with connection.cursor() as cursor:
                    cursor.execute(
                        "update import_run set status = 'failed', finished_at = now(), error_code = 'IMPORT_TRANSACTION_FAILED' where id = %s",
                        (import_run_id,),
                    )
                connection.commit()
                raise ImportDatabaseError("academic import transaction failed") from error
    except ImportDatabaseError:
        raise
    except psycopg.Error as error:
        raise ImportDatabaseError("database operation failed") from error

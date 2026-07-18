"""Pure Another Planner JSON adapter for the consumed CUWeave subset."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import datetime, time
from decimal import Decimal, InvalidOperation

from pydantic import ValidationError

from .models import (
    ExternalCourseFile,
    Manifest,
    NormalizedCourse,
    NormalizedMeeting,
    NormalizedOffering,
    NormalizedSection,
    NormalizedSnapshot,
)

ADAPTER_NAME = "another-planner-json"
ADAPTER_VERSION = "2"
TIME_PATTERN = re.compile(
    r"^(Mo|Tu|We|Th|Fr|Sa|Su) (\d{1,2}:\d{2}(?:AM|PM)) - (\d{1,2}:\d{2}(?:AM|PM))$"
)
WEEKDAYS = {"Mo": 1, "Tu": 2, "We": 3, "Th": 4, "Fr": 5, "Sa": 6, "Su": 7}


class ImportValidationError(ValueError):
    """Stable validation failure safe to expose through the CLI."""


def canonical_hash(value: object) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode()).hexdigest()


def normalize_display(value: str) -> str:
    return unicodedata.normalize("NFC", value.strip())


def parse_nonnegative_integer(value: str, path: str) -> int:
    if not re.fullmatch(r"\d+", value):
        raise ImportValidationError(f"{path}: expected a non-negative integer string")
    return int(value)


def parse_credit(value: str, path: str) -> Decimal:
    try:
        result = Decimal(value)
    except InvalidOperation as error:
        raise ImportValidationError(f"{path}: invalid credit value") from error
    if not result.is_finite() or result < 0 or result > Decimal("9999.99"):
        raise ImportValidationError(f"{path}: credit value is outside the supported range")
    if result.as_tuple().exponent < -2:
        raise ImportValidationError(f"{path}: credits may have at most two decimal places")
    return result


def parse_term(term_code: str, term_name: str, academic_year: str, path: str) -> str:
    if academic_year not in term_name:
        raise ImportValidationError(f"{path}: term academic year does not match manifest")
    normalized = term_name.casefold()
    if "term 1" in normalized:
        return "term-1"
    if "term 2" in normalized:
        return "term-2"
    if "summer" in normalized:
        return "summer-session"
    if "acad year" in normalized:
        return "academic-year"
    raise ImportValidationError(f"{path}: unsupported term {term_code!r}/{term_name!r}")


def parse_meeting_time(
    value: str | None, path: str
) -> tuple[str, int | None, time | None, time | None]:
    raw = normalize_display(value or "TBA") or "TBA"
    if raw.upper() == "TBA":
        return raw, None, None, None
    match = TIME_PATTERN.fullmatch(raw)
    if not match:
        raise ImportValidationError(f"{path}: unsupported meeting time format")
    start = datetime.strptime(match.group(2), "%I:%M%p").time()
    end = datetime.strptime(match.group(3), "%I:%M%p").time()
    if end <= start:
        # The approved source uses midnight-to-midnight as a placeholder. Keep
        # the raw display value, but never invent an overnight meeting.
        return raw, None, None, None
    return raw, WEEKDAYS[match.group(1)], start, end


def adapt(raw_bytes: bytes, manifest: Manifest) -> NormalizedSnapshot:
    if (
        manifest.expected_revisions
        and manifest.upstream_revision not in manifest.expected_revisions
    ):
        raise ImportValidationError("supplied upstream revision is not approved by the manifest")
    try:
        raw_text = raw_bytes.decode("utf-8")
        document = ExternalCourseFile.model_validate_json(raw_text)
    except (UnicodeDecodeError, ValidationError, ValueError) as error:
        raise ImportValidationError(
            "input is not a valid Another Planner course document"
        ) from error

    if document.metadata.subject != manifest.subject:
        raise ImportValidationError("metadata subject does not match manifest")
    if document.metadata.total_courses != len(document.courses):
        raise ImportValidationError("metadata total_courses does not match course count")

    warnings: list[dict[str, str]] = []
    normalized_courses: list[NormalizedCourse] = []
    seen_courses: set[str] = set()

    for course_index, course in enumerate(document.courses):
        path = f"courses[{course_index}]"
        if course.subject != manifest.subject:
            raise ImportValidationError(f"{path}.subject: subject does not match manifest")
        course_number = normalize_display(course.course_code)
        if course_number in seen_courses:
            raise ImportValidationError(f"{path}: duplicate course identity")
        seen_courses.add(course_number)
        credits = parse_credit(course.credits, f"{path}.credits")
        catalog_record = {
            "subject": course.subject,
            "course_code": course_number,
            "title": normalize_display(course.title),
            "credits": format(credits, "f"),
            "academic_career": course.academic_career,
        }

        offerings: list[NormalizedOffering] = []
        seen_terms: set[str] = set()
        for term_index, term in enumerate(course.terms):
            term_path = f"{path}.terms[{term_index}]"
            term_key = parse_term(term.term_code, term.term_name, manifest.academic_year, term_path)
            if term_key in seen_terms:
                raise ImportValidationError(f"{term_path}: duplicate normalized term")
            seen_terms.add(term_key)
            sections: list[NormalizedSection] = []
            seen_sections: set[str] = set()

            for section_index, source_section in enumerate(term.schedule):
                section_path = f"{term_path}.schedule[{section_index}]"
                section_key = normalize_display(source_section.section)
                if section_key in seen_sections:
                    raise ImportValidationError(f"{section_path}: duplicate section")
                seen_sections.add(section_key)
                availability = source_section.availability
                meetings: list[NormalizedMeeting] = []
                for meeting_index, source_meeting in enumerate(source_section.meetings):
                    meeting_path = f"{section_path}.meetings[{meeting_index}]"
                    time_raw, weekday, start, end = parse_meeting_time(
                        source_meeting.time, f"{meeting_path}.time"
                    )
                    dates = normalize_display(source_meeting.dates or "TBA") or "TBA"
                    location = normalize_display(source_meeting.location or "TBA") or "TBA"
                    instructor = normalize_display(source_meeting.instructor or "TBA") or "TBA"
                    for field, value in (
                        ("time", time_raw),
                        ("dates", dates),
                        ("location", location),
                        ("instructor", instructor),
                    ):
                        if value.upper() == "TBA":
                            warnings.append(
                                {
                                    "code": f"UNKNOWN_{field.upper()}",
                                    "path": f"{meeting_path}.{field}",
                                }
                            )
                    if time_raw.upper() != "TBA" and weekday is None:
                        warnings.append(
                            {
                                "code": "MALFORMED_MEETING_TIME",
                                "path": f"{meeting_path}.time",
                            }
                        )
                    meetings.append(
                        NormalizedMeeting(
                            ordinal=meeting_index,
                            time_raw=time_raw,
                            time_status="parsed" if weekday is not None else "unknown",
                            weekday=weekday,
                            start_time=start,
                            end_time=end,
                            teaching_dates_raw=dates,
                            location_raw=location,
                            instructor_display_raw=instructor,
                        )
                    )

                scalar = {
                    "section": section_key,
                    "class_attributes": source_section.class_attributes,
                    "availability": {
                        "capacity": availability.capacity,
                        "enrolled": availability.enrolled,
                        "available_seats": availability.available_seats,
                        "waitlist_capacity": availability.waitlist_capacity,
                        "waitlist_total": availability.waitlist_total,
                        "status": availability.status,
                    },
                    "meetings": [meeting.model_dump(mode="json") for meeting in meetings],
                }
                sections.append(
                    NormalizedSection(
                        section_key=section_key,
                        section_label_raw=source_section.section,
                        class_attributes_raw=source_section.class_attributes,
                        capacity_raw=availability.capacity,
                        capacity=parse_nonnegative_integer(availability.capacity, section_path),
                        enrolled_raw=availability.enrolled,
                        enrolled=parse_nonnegative_integer(availability.enrolled, section_path),
                        available_seats_raw=availability.available_seats,
                        available_seats=parse_nonnegative_integer(
                            availability.available_seats, section_path
                        ),
                        waitlist_capacity_raw=availability.waitlist_capacity,
                        waitlist_capacity=parse_nonnegative_integer(
                            availability.waitlist_capacity, section_path
                        ),
                        waitlist_total_raw=availability.waitlist_total,
                        waitlist_total=parse_nonnegative_integer(
                            availability.waitlist_total, section_path
                        ),
                        availability_status_raw=availability.status,
                        revision_hash=canonical_hash(scalar),
                        meetings=tuple(meetings),
                    )
                )

            sections.sort(key=lambda value: value.section_key)
            offering_scalar = {
                "catalog": canonical_hash(catalog_record),
                "term_key": term_key,
                "term_code": term.term_code,
                "term_name": term.term_name,
            }
            offerings.append(
                NormalizedOffering(
                    term_key=term_key,
                    term_code_raw=term.term_code,
                    term_name_raw=term.term_name,
                    record_hash=canonical_hash(offering_scalar),
                    sections=tuple(sections),
                )
            )

        offerings.sort(key=lambda value: value.term_key)
        normalized_courses.append(
            NormalizedCourse(
                subject_code=manifest.subject,
                catalog_number=course_number,
                subject_raw=course.subject,
                course_code_raw=course.course_code,
                title_raw=course.title,
                title=normalize_display(course.title),
                credits_raw=course.credits,
                credits=credits,
                academic_career_raw=course.academic_career,
                record_hash=canonical_hash(catalog_record),
                offerings=tuple(offerings),
            )
        )

    normalized_courses.sort(key=lambda value: (value.subject_code, value.catalog_number))
    warnings.sort(key=lambda value: (value["code"], value["path"]))
    return NormalizedSnapshot(
        content_sha256=hashlib.sha256(raw_bytes).hexdigest(),
        courses=tuple(normalized_courses),
        warnings=tuple(warnings),
    )

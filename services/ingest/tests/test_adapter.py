import json
from decimal import Decimal
from pathlib import Path

import pytest

from cuweave_ingest.adapter import ImportValidationError, adapt
from cuweave_ingest.models import Manifest

FIXTURES = Path(__file__).parent / "fixtures"


def load() -> tuple[bytes, Manifest]:
    return (
        (FIXTURES / "synthetic-subject.json").read_bytes(),
        Manifest.model_validate_json((FIXTURES / "synthetic-manifest.json").read_bytes()),
    )


def test_valid_fixture_accepts_extra_fields_and_is_deterministic() -> None:
    raw, manifest = load()
    first = adapt(raw, manifest)
    second = adapt(raw, manifest)
    assert first == second
    assert first.courses[0].credits == Decimal("3.00")
    assert first.courses[1].credits == Decimal("1.50")
    assert first.courses[0].offerings[0].sections[0].meetings[0].teaching_dates_raw == (
        "1/9, 8/9, 15/9"
    )
    assert {warning["code"] for warning in first.warnings} == {
        "UNKNOWN_DATES",
        "UNKNOWN_INSTRUCTOR",
        "UNKNOWN_LOCATION",
        "UNKNOWN_TIME",
    }


@pytest.mark.parametrize("value", ["3", "3.0", "3.00", "1.50"])
def test_credit_formats_are_exact(value: str) -> None:
    raw, manifest = load()
    document = json.loads(raw)
    document["courses"][0]["credits"] = value
    result = adapt(json.dumps(document).encode(), manifest)
    assert result.courses[0].credits == Decimal(value)
    assert result.courses[0].credits_raw == value


def test_missing_required_field_is_rejected() -> None:
    raw, manifest = load()
    document = json.loads(raw)
    del document["courses"][0]["title"]
    with pytest.raises(ImportValidationError):
        adapt(json.dumps(document).encode(), manifest)


def test_subject_and_year_mismatches_are_rejected() -> None:
    raw, manifest = load()
    document = json.loads(raw)
    document["courses"][0]["subject"] = "NOPE"
    with pytest.raises(ImportValidationError):
        adapt(json.dumps(document).encode(), manifest)
    document = json.loads(raw)
    document["courses"][0]["terms"][0]["term_name"] = "2098-99 Term 1"
    with pytest.raises(ImportValidationError):
        adapt(json.dumps(document).encode(), manifest)


def test_unknown_term_is_rejected() -> None:
    raw, manifest = load()
    document = json.loads(raw)
    document["courses"][0]["terms"][0]["term_name"] = "2099-00 Special Session"
    with pytest.raises(ImportValidationError):
        adapt(json.dumps(document).encode(), manifest)


def test_midnight_placeholder_is_preserved_as_unknown_warning() -> None:
    raw, manifest = load()
    document = json.loads(raw)
    document["courses"][0]["terms"][0]["schedule"][0]["meetings"][0]["time"] = (
        "Mo 12:00AM - 12:00AM"
    )
    snapshot = adapt(json.dumps(document).encode(), manifest)
    meeting = snapshot.courses[0].offerings[0].sections[0].meetings[0]
    assert meeting.time_raw == "Mo 12:00AM - 12:00AM"
    assert meeting.time_status == "unknown"
    assert any(warning["code"] == "MALFORMED_MEETING_TIME" for warning in snapshot.warnings)


def test_explicit_medicine_academic_year_term_is_supported() -> None:
    raw, manifest = load()
    document = json.loads(raw)
    term = document["courses"][0]["terms"][0]
    term["term_code"] = "MED"
    term["term_name"] = "2099-00 Acad Year (Medicine)"
    snapshot = adapt(json.dumps(document).encode(), manifest)
    assert snapshot.courses[0].offerings[0].term_key == "academic-year"


def test_exact_duplicate_meetings_are_removed_without_collapsing_source_facts() -> None:
    raw, manifest = load()
    document = json.loads(raw)
    meetings = document["courses"][0]["terms"][0]["schedule"][0]["meetings"]
    original = meetings[0]
    meetings.extend(
        [
            dict(original),
            {**original, "dates": "22/9, 29/9"},
            {**original, "time": "Tu 9:30AM - 11:15AM"},
            {**original, "time": "Mo 10:30AM - 12:15PM"},
            {**original, "location": "Synthetic Room C"},
            {**original, "instructor": "Professor SAMPLE Gamma"},
        ]
    )
    normalized = adapt(json.dumps(document).encode(), manifest)
    result = normalized.courses[0].offerings[0].sections[0].meetings
    assert len(result) == 6
    assert [meeting.ordinal for meeting in result] == list(range(6))
    assert {meeting.teaching_dates_raw for meeting in result} >= {
        "1/9, 8/9, 15/9",
        "22/9, 29/9",
    }

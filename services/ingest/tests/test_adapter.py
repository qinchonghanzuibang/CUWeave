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

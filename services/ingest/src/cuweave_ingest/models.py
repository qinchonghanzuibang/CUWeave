"""Strict consumed fields and canonical records for academic imports."""

from __future__ import annotations

from datetime import datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UpstreamModel(BaseModel):
    model_config = ConfigDict(extra="allow", strict=True)


class Manifest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    source_name: str = Field(min_length=1)
    source_uri: str = Field(min_length=1)
    upstream_revision: str = Field(pattern=r"^[0-9a-f]{40}$")
    expected_revisions: list[str] = Field(default_factory=list)
    retrieved_at: datetime
    academic_year: str = Field(pattern=r"^\d{4}-\d{2}$")
    subject: str = Field(pattern=r"^[A-Z]{4}$")
    completeness: Literal["complete", "incomplete"]

    @field_validator("retrieved_at")
    @classmethod
    def require_aware_datetime(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("retrieved_at must include a timezone")
        return value

    @field_validator("expected_revisions")
    @classmethod
    def validate_expected_revisions(cls, values: list[str]) -> list[str]:
        for value in values:
            if len(value) != 40 or value.lower() != value:
                raise ValueError("expected revisions must be lowercase 40-character hashes")
        return values


class ExternalMeeting(UpstreamModel):
    time: str | None = None
    location: str | None = None
    instructor: str | None = None
    dates: str | None = None


class ExternalAvailability(UpstreamModel):
    capacity: str = "0"
    enrolled: str = "0"
    available_seats: str = "0"
    waitlist_capacity: str = "0"
    waitlist_total: str = "0"
    status: str = "Unknown"


class ExternalSection(UpstreamModel):
    section: str = Field(min_length=1)
    meetings: list[ExternalMeeting] = Field(default_factory=list)
    availability: ExternalAvailability = Field(default_factory=ExternalAvailability)
    class_attributes: str = ""


class ExternalTerm(UpstreamModel):
    term_code: str = Field(min_length=1)
    term_name: str = Field(min_length=1)
    schedule: list[ExternalSection] = Field(default_factory=list)


class ExternalCourse(UpstreamModel):
    subject: str = Field(pattern=r"^[A-Z]{4}$")
    course_code: str = Field(min_length=1)
    title: str = Field(min_length=1)
    credits: str = Field(min_length=1)
    academic_career: str | None = None
    terms: list[ExternalTerm] = Field(default_factory=list)


class ExternalMetadata(UpstreamModel):
    subject: str = Field(pattern=r"^[A-Z]{4}$")
    total_courses: int = Field(ge=0)
    scraped_at: str | None = None
    scraper_version: str | None = None


class ExternalCourseFile(UpstreamModel):
    metadata: ExternalMetadata
    courses: list[ExternalCourse]


class NormalizedMeeting(BaseModel):
    model_config = ConfigDict(frozen=True)

    ordinal: int
    time_raw: str
    time_status: Literal["parsed", "unknown"]
    weekday: int | None
    start_time: time | None
    end_time: time | None
    teaching_dates_raw: str
    location_raw: str
    instructor_display_raw: str


class NormalizedSection(BaseModel):
    model_config = ConfigDict(frozen=True)

    section_key: str
    section_label_raw: str
    class_attributes_raw: str
    capacity_raw: str
    capacity: int
    enrolled_raw: str
    enrolled: int
    available_seats_raw: str
    available_seats: int
    waitlist_capacity_raw: str
    waitlist_capacity: int
    waitlist_total_raw: str
    waitlist_total: int
    availability_status_raw: str
    revision_hash: str
    meetings: tuple[NormalizedMeeting, ...]


class NormalizedOffering(BaseModel):
    model_config = ConfigDict(frozen=True)

    term_key: Literal["term-1", "term-2", "summer-session", "academic-year"]
    term_code_raw: str
    term_name_raw: str
    record_hash: str
    sections: tuple[NormalizedSection, ...]


class NormalizedCourse(BaseModel):
    model_config = ConfigDict(frozen=True)

    subject_code: str
    catalog_number: str
    subject_raw: str
    course_code_raw: str
    title_raw: str
    title: str
    credits_raw: str
    credits: Decimal
    academic_career_raw: str | None
    record_hash: str
    offerings: tuple[NormalizedOffering, ...]


class NormalizedSnapshot(BaseModel):
    model_config = ConfigDict(frozen=True)

    content_sha256: str
    courses: tuple[NormalizedCourse, ...]
    warnings: tuple[dict[str, str], ...]

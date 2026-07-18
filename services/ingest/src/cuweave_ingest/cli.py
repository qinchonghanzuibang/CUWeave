"""CUWeave local academic data command line interface."""

from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from pydantic import ValidationError

from cuweave_ingest import __version__

from .adapter import ImportValidationError, adapt
from .importer import ImportDatabaseError, import_snapshot, validation_report
from .models import Manifest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="cuweave-ingest")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    subcommands = parser.add_subparsers(dest="command")
    subcommands.add_parser("doctor")
    for command in ("validate", "import"):
        action = subcommands.add_parser(command)
        action.add_argument("input", type=Path)
        action.add_argument("--manifest", type=Path, required=True)
    local = subcommands.add_parser("import-local")
    local.add_argument(
        "--upstream-dir",
        type=Path,
        default=None,
        help="Another Planner checkout (defaults to CUWEAVE_UPSTREAM_DIR)",
    )
    local.add_argument("--academic-year", default="2026-27")
    return parser


def _load(path: Path, *, maximum_bytes: int = 16 * 1024 * 1024) -> bytes:
    if not path.is_file():
        raise ImportValidationError("input must be a local regular file")
    data = path.read_bytes()
    if len(data) > maximum_bytes:
        raise ImportValidationError("input exceeds the local import size limit")
    return data


APPROVED_UPSTREAM_REVISION = "6c9ea314ff5595dd90a88bbbdae8d286408d85f3"


def _git(upstream: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(upstream), *args],
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0:
        raise ImportValidationError("upstream directory is not the approved Git checkout")
    return result.stdout.strip()


def _import_local(upstream_arg: Path | None, academic_year: str) -> dict[str, object]:
    configured = upstream_arg or (
        Path(os.environ["CUWEAVE_UPSTREAM_DIR"]) if os.environ.get("CUWEAVE_UPSTREAM_DIR") else None
    )
    if configured is None:
        raise ImportValidationError("set CUWEAVE_UPSTREAM_DIR or pass --upstream-dir")
    upstream = configured.expanduser().resolve()
    revision = _git(upstream, "rev-parse", "HEAD")
    if revision != APPROVED_UPSTREAM_REVISION:
        raise ImportValidationError(
            f"upstream revision is not approved; expected {APPROVED_UPSTREAM_REVISION}"
        )
    retrieved_at = datetime.fromisoformat(_git(upstream, "show", "-s", "--format=%cI", "HEAD"))
    reports: list[dict[str, object]] = []
    for subject in ("IERG", "ENGG"):
        input_path = upstream / "data" / academic_year / f"{subject}.json"
        raw_bytes = _load(input_path)
        manifest = Manifest(
            source_name="another-cuhk-course-planner",
            source_uri=(
                "https://github.com/EagleZhen/another-cuhk-course-planner/blob/"
                f"{revision}/data/{academic_year}/{subject}.json"
            ),
            upstream_revision=revision,
            expected_revisions=[APPROVED_UPSTREAM_REVISION],
            retrieved_at=retrieved_at,
            academic_year=academic_year,
            subject=subject,
            completeness="complete",
        )
        snapshot = adapt(raw_bytes, manifest)
        validation_report(snapshot, manifest)
        reports.append(import_snapshot(raw_bytes.decode("utf-8"), snapshot, manifest))
    return {"academic_year": academic_year, "reports": reports, "revision": revision}


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.command or args.command == "doctor":
        print(f"cuweave-ingest {__version__}: ready on Python {platform.python_version()}")
        return 0

    try:
        if args.command == "import-local":
            report = _import_local(args.upstream_dir, args.academic_year)
            print(json.dumps(report, sort_keys=True, separators=(",", ":")))
            return 0
        raw_bytes = _load(args.input)
        manifest = Manifest.model_validate_json(_load(args.manifest))
        snapshot = adapt(raw_bytes, manifest)
        if args.command == "validate":
            report = validation_report(snapshot, manifest)
        else:
            report = import_snapshot(raw_bytes.decode("utf-8"), snapshot, manifest)
        print(json.dumps(report, sort_keys=True, separators=(",", ":")))
        return 0
    except (ImportValidationError, ValidationError) as error:
        print(f"validation_error: {error}", file=sys.stderr)
        return 2
    except ImportDatabaseError as error:
        print(f"database_error: {error}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())

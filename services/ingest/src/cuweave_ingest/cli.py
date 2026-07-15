"""CUWeave local academic data command line interface."""

from __future__ import annotations

import argparse
import json
import platform
import sys
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
    return parser


def _load(path: Path, *, maximum_bytes: int = 16 * 1024 * 1024) -> bytes:
    if not path.is_file():
        raise ImportValidationError("input must be a local regular file")
    data = path.read_bytes()
    if len(data) > maximum_bytes:
        raise ImportValidationError("input exceeds the local import size limit")
    return data


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.command or args.command == "doctor":
        print(f"cuweave-ingest {__version__}: ready on Python {platform.python_version()}")
        return 0

    try:
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

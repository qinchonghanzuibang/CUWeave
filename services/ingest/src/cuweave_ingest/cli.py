"""Environment-independent command-line diagnostics for the ingestion package."""

import argparse
import platform

from cuweave_ingest import __version__


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="cuweave-ingest")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument("command", nargs="?", choices=["doctor"], default="doctor")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    parser.parse_args(argv)
    print(f"cuweave-ingest {__version__}: ready on Python {platform.python_version()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

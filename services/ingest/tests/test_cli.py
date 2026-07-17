import json
import re
from pathlib import Path

from cuweave_ingest import __version__, cli
from cuweave_ingest.cli import main


def test_doctor_reports_installed_package_and_runtime(capsys) -> None:
    assert main(["doctor"]) == 0

    output = capsys.readouterr().out.strip()
    assert output.startswith(f"cuweave-ingest {__version__}: ready on Python ")
    assert re.search(r"Python 3\.\d+\.\d+$", output)


def test_import_local_uses_pinned_checkout_without_network(tmp_path: Path, monkeypatch) -> None:
    fixture = json.loads(
        (Path(__file__).parent / "fixtures" / "synthetic-subject.json").read_text()
    )
    for subject in ("IERG", "ENGG"):
        document = json.loads(json.dumps(fixture))
        document["metadata"]["subject"] = subject
        for course in document["courses"]:
            course["subject"] = subject
            for term in course["terms"]:
                term["term_name"] = term["term_name"].replace("2099-00", "2026-27")
        path = tmp_path / "data" / "2026-27" / f"{subject}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(document))

    monkeypatch.setattr(
        cli,
        "_git",
        lambda _path, *args: (
            cli.APPROVED_UPSTREAM_REVISION
            if args == ("rev-parse", "HEAD")
            else "2026-07-15T00:00:00+00:00"
        ),
    )
    monkeypatch.setattr(
        cli,
        "import_snapshot",
        lambda _raw, _snapshot, manifest: {"status": "succeeded", "subject": manifest.subject},
    )
    result = cli._import_local(tmp_path, "2026-27")
    assert result["revision"] == cli.APPROVED_UPSTREAM_REVISION
    assert [report["subject"] for report in result["reports"]] == ["IERG", "ENGG"]

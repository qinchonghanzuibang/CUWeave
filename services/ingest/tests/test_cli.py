import re

from cuweave_ingest import __version__
from cuweave_ingest.cli import main


def test_doctor_reports_installed_package_and_runtime(capsys) -> None:
    assert main(["doctor"]) == 0

    output = capsys.readouterr().out.strip()
    assert output.startswith(f"cuweave-ingest {__version__}: ready on Python ")
    assert re.search(r"Python 3\.\d+\.\d+$", output)

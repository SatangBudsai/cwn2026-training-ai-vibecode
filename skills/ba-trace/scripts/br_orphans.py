"""Report BR IDs that are defined but never referenced by a user story, and the reverse.

Usage:  python -X utf8 -I br_orphans.py <BRD.docx>
House format (see ba-brd/references/house-style.md):
  - BR defined: a table cell that is exactly "BR-nn" (High-level requirements table)
  - BR referenced: a table row whose first cell is "BR No." (user-story tables)
Run `python -I br_orphans.py --selftest` for the built-in check.
"""
import re
import sys

BR = re.compile(r"BR-\d+")


def scan(rows):
    defined, used = set(), set()
    for cells in rows:
        for c in cells:
            if re.fullmatch(r"BR-\d+", c.strip()):
                defined.add(c.strip())
        if cells and cells[0].strip().rstrip(":") == "BR No.":
            used.update(BR.findall(" ".join(cells[1:])))
    return defined, used


def docx_rows(path):
    import docx  # python-docx

    for t in docx.Document(path).tables:
        for r in t.rows:
            yield [c.text for c in r.cells]


def report(defined, used):
    key = lambda s: int(s[3:])
    print("defined :", len(defined), "referenced:", len(used))
    print("defined but no story :", sorted(defined - used, key=key) or "none")
    print("story cites undefined:", sorted(used - defined, key=key) or "none")


def selftest():
    rows = [
        ["TOR No.", "BR No.", "x", "Priority"],
        ["a", "BR-01", "x", "Must"], ["a", "BR-02", "x", "Must"], ["a", "BR-03", "x", "Must"],
        ["BR No.", "BR-01, BR-02 BR-09"],  # BR-09 undefined, BR-03 orphan
    ]
    d, u = scan(rows)
    assert d == {"BR-01", "BR-02", "BR-03"} and u == {"BR-01", "BR-02", "BR-09"}, (d, u)
    print("selftest ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        selftest()
    elif len(sys.argv) == 2:
        report(*scan(docx_rows(sys.argv[1])))
    else:
        sys.exit(__doc__)

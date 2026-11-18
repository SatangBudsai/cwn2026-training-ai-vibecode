"""Usage: python3 clean.py <tickets.csv>

Print JSON {id: {"time", "order_id", "error_code"}} to stdout for every row,
in file order. Missing values / per-row failures become null.
"""
import contextlib
import json
import os
import sys
import unicodedata

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import pandas as pd  # noqa: E402

with contextlib.redirect_stdout(sys.stderr):  # keep stdout clean
    from clean_code import clean_code  # noqa: E402
    from clean_order import clean_order  # noqa: E402
    from clean_time import clean_time  # noqa: E402

# Invisible fillers that are not in a "format"/"control" category.
_EXTRA_INVISIBLE = {"͏", "ᅟ", "ᅠ", "឴", "឵", "ㅤ", "ﾠ", "᠎"}


def _is_invisible(ch):
    return (
        ch.isspace()
        or ch in _EXTRA_INVISIBLE
        or unicodedata.category(ch) in ("Cf", "Cc", "Zs", "Zl", "Zp")
    )


def clean_id(raw):
    """Remove whitespace and invisible characters from an id."""
    if raw is None:
        return ""
    return "".join(ch for ch in str(raw) if not _is_invisible(ch))


def _safe(fn, *args):
    try:
        with contextlib.redirect_stdout(sys.stderr):
            value = fn(*args)
    except Exception as exc:  # one bad row must not kill the whole run
        print(f"warning: {fn.__name__}{args!r} raised {exc!r}", file=sys.stderr)
        return None
    if value is None or (isinstance(value, float) and value != value):
        return None
    return value


def _col(row, name):
    return row[name] if name in row.index else ""


def main(argv):
    if len(argv) != 2:
        print("usage: python3 clean.py <file.csv>", file=sys.stderr)
        return 2
    df = pd.read_csv(argv[1], dtype=str, keep_default_na=False)

    result = {}
    for _, row in df.iterrows():
        key = clean_id(_col(row, "id"))
        if key in result:
            print(f"warning: duplicate id {key!r}; later row overwrites", file=sys.stderr)
        text = _col(row, "text")
        result[key] = {
            "time": _safe(clean_time, _col(row, "received_at")),
            "order_id": _safe(clean_order, _col(row, "order_id"), text),
            "error_code": _safe(clean_code, text),
        }

    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

"""Clean ticket CSV: python3 clean.py <csv>  ->  JSON {id: {time, order_id, error_code}} on stdout."""

import json
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd  # noqa: E402

from clean_code import clean_code  # noqa: E402
from clean_order import clean_order  # noqa: E402
from clean_time import clean_time  # noqa: E402


def clean_id(value):
    """Remove whitespace and invisible (format/control) characters."""
    if not isinstance(value, str):
        value = "" if value is None else str(value)
    value = unicodedata.normalize("NFKC", value)
    return "".join(
        ch for ch in value
        if not ch.isspace() and unicodedata.category(ch) not in ("Cf", "Cc", "Zs", "Zl", "Zp")
    )


def _col(row, name):
    v = row.get(name, "")
    return v if isinstance(v, str) else ("" if v is None else str(v))


def clean_file(path):
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    result = {}
    for row in df.to_dict(orient="records"):
        key = clean_id(_col(row, "id"))
        text = _col(row, "text")
        result[key] = {
            "time": clean_time(_col(row, "received_at")),
            "order_id": clean_order(_col(row, "order_id"), text),
            "error_code": clean_code(text),
        }
    return result


def main(argv):
    if len(argv) != 2:
        print("usage: python3 clean.py <file.csv>", file=sys.stderr)
        return 2
    print(json.dumps(clean_file(argv[1]), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

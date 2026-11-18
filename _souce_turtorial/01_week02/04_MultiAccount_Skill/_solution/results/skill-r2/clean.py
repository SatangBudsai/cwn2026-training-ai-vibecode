"""Clean support tickets: python3 clean.py <tickets.csv>  ->  JSON on stdout.

Output: {id: {"time": ..., "order_id": ..., "error_code": ...}} in file order,
missing/unparseable values are null. All cleaning logic lives in
clean_time.py, clean_order.py and clean_code.py (imported, not duplicated).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd  # noqa: E402

from clean_code import clean_code  # noqa: E402
from clean_order import clean_order  # noqa: E402
from clean_time import clean_time  # noqa: E402


def _safe(fn, *args):
    try:
        return fn(*args)
    except Exception:
        return None


def _get(row, col):
    v = row.get(col, "")
    return "" if v is None else v


def clean_frame(df):
    out = {}
    for row in df.to_dict(orient="records"):
        tid = str(_get(row, "id"))
        text = _get(row, "text")
        out[tid] = {
            "time": _safe(clean_time, _get(row, "received_at")),
            "order_id": _safe(clean_order, _get(row, "order_id"), text),
            "error_code": _safe(clean_code, text),
        }
    return out


def main(argv):
    if len(argv) != 2:
        print("usage: python3 clean.py <tickets.csv>", file=sys.stderr)
        return 2
    df = pd.read_csv(argv[1], dtype=str, keep_default_na=False)
    result = clean_frame(df)
    sys.stdout.write(json.dumps(result, ensure_ascii=False))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

"""รวมผลจาก clean_time / clean_order / clean_code เป็น JSON ต่อ ticket

ใช้งาน: python3 clean.py <ไฟล์ csv>
"""
import json
import os
import sys
import unicodedata

sys.dont_write_bytecode = True
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import pandas as pd  # noqa: E402

from clean_code import clean_code  # noqa: E402
from clean_order import clean_order  # noqa: E402
from clean_time import clean_time  # noqa: E402


def strip_invisible(value):
    """ตัดช่องว่างและอักขระมองไม่เห็น (เช่น zero-width, BOM) ที่หัวและท้าย"""
    if value is None:
        return ""
    s = str(value)

    def junk(ch):
        return ch.isspace() or unicodedata.category(ch) in ("Cf", "Cc", "Zs", "Zl", "Zp")

    start, end = 0, len(s)
    while start < end and junk(s[start]):
        start += 1
    while end > start and junk(s[end - 1]):
        end -= 1
    return s[start:end]


def safe(func, *args):
    try:
        return func(*args)
    except Exception:
        return None


def main(argv):
    if len(argv) != 2:
        print("usage: python3 clean.py <file.csv>", file=sys.stderr)
        return 2
    df = pd.read_csv(argv[1], dtype=str, keep_default_na=False)
    for col in ("id", "received_at", "order_id", "channel", "text"):
        if col not in df.columns:
            df[col] = ""

    result = {}
    for row in df.itertuples(index=False):
        tid = strip_invisible(row.id)
        if tid in result:
            print(f"warning: duplicate id {tid!r}; later row overwrites earlier", file=sys.stderr)
        result[tid] = {
            "time": safe(clean_time, row.received_at),
            "order_id": safe(clean_order, row.order_id, row.text),
            "error_code": safe(clean_code, row.text),
        }

    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

"""Build report.md from clean.py output: python3 make_report.py <csv> [report.md]"""

import os
import sys
import unicodedata
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd  # noqa: E402

from clean import clean_file, clean_id  # noqa: E402


def is_blank(v):
    return clean_id(v if isinstance(v, str) else "") == ""


def main(csv_path, out_path):
    data = clean_file(csv_path)
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)

    per_day = Counter((v["time"] or "")[:10] or "ไม่ทราบวันที่" for v in data.values())
    codes = Counter(v["error_code"] for v in data.values())

    blank_keys = [clean_id(r["id"]) for _, r in df.iterrows() if is_blank(r.get("order_id", ""))]
    found = sum(1 for k in blank_keys if data[k]["order_id"] is not None)
    not_found = len(blank_keys) - found

    L = ["# รายงานสรุป ticket", "",
         f"ไฟล์ต้นฉบับ: `{os.path.basename(csv_path)}` · จำนวน ticket ทั้งหมด **{len(data)}** ใบ "
         "(คำนวณจากผลของ `clean.py`)", "",
         "## จำนวน ticket ต่อวัน (เวลาไทย)", "", "| วันที่ | จำนวน ticket |", "|---|---:|"]
    for day in sorted(per_day):
        L.append(f"| {day} | {per_day[day]} |")
    L.append(f"| **รวม** | **{sum(per_day.values())}** |")

    L += ["", "## จำนวน ticket ตามรหัสข้อผิดพลาด", "", "| รหัสข้อผิดพลาด | จำนวน ticket |", "|---|---:|"]
    for code, n in sorted(((c, n) for c, n in codes.items() if c), key=lambda x: (-x[1], x[0])):
        L.append(f"| {code} | {n} |")
    L.append(f"| ไม่มีรหัส | {codes.get(None, 0)} |")
    L.append(f"| **รวม** | **{sum(codes.values())}** |")

    L += ["", "## order_id ว่างในไฟล์ต้นฉบับ", "",
          "นับเฉพาะแถวที่คอลัมน์ `order_id` ว่างหลังตัดช่องว่างและอักขระที่มองไม่เห็นออก", "",
          "| รายการ | จำนวน |", "|---|---:|",
          f"| order_id ว่าง | {len(blank_keys)} |",
          f"| หาเลขออเดอร์จากข้อความได้ | {found} |",
          f"| หาเลขออเดอร์จากข้อความไม่ได้ | {not_found} |", ""]
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "report.md"))

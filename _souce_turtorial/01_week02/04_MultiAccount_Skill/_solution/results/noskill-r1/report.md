# รายงานสรุป tickets (data/tickets.csv)

ข้อมูลจากผลจริงของ `clean.py` — JSON ถูกต้อง, ticket ทั้งหมด 1000 ใบ, id ไม่ซ้ำ

## จำนวน ticket ต่อวัน (เวลาไทย UTC+7)

| วันที่ | จำนวน |
|---|---:|
| 2026-11-07 | 505 |
| 2026-11-08 | 472 |
| 2026-11-09 | 21 |
| 2026-11-10 | 2 |
| **รวม** | **1000** |

## จำนวน ticket ตามรหัสข้อผิดพลาด

| รหัส | จำนวน |
|---|---:|
| E402 | 14 |
| E405 | 12 |
| ไม่มีรหัส | 974 |
| **รวม** | **1000** |

## เลขออเดอร์

- คอลัมน์ `order_id` ในไฟล์ต้นฉบับว่าง (หลังตัดช่องว่าง/อักขระมองไม่เห็น): **112** ใบ
- ในจำนวนนี้ยังหาเลขออเดอร์ไม่ได้ (order_id เป็น null): **0** ใบ (ที่เหลือหาได้จากข้อความ `text`)
- ยังหาเลขออเดอร์ไม่ได้ทั้งหมดทั้งไฟล์: **0** ใบ

## คำสั่งที่ใช้สร้างรายงาน

```bash
cd /workspace/team-demo
python3 clean.py data/tickets.csv | python3 -B /tmp/gen_report.py > report.md
rm /tmp/gen_report.py
```

เนื้อหาของ `/tmp/gen_report.py` (ไฟล์ชั่วคราว ลบแล้วหลังสร้างรายงาน):

```python
import json, sys, collections, unicodedata
import pandas as pd
d = json.load(sys.stdin)
df = pd.read_csv("data/tickets.csv", dtype=str, keep_default_na=False)
def strip(s):
    j = lambda c: c.isspace() or unicodedata.category(c) in ("Cf", "Cc", "Zs", "Zl", "Zp")
    a, b = 0, len(s)
    while a < b and j(s[a]): a += 1
    while b > a and j(s[b-1]): b -= 1
    return s[a:b]
ids = [strip(x) for x in df.id]
assert len(d) == len(df) == len(set(ids)) and list(d) == ids
days = collections.Counter((v["time"] or "")[:10] or "ไม่มีเวลา" for v in d.values())
codes = collections.Counter(v["error_code"] or "ไม่มีรหัส" for v in d.values())
empty = [i for i, x in zip(ids, df.order_id) if strip(x) == ""]
null_all = sum(v["order_id"] is None for v in d.values())
null_empty = sum(d[i]["order_id"] is None for i in empty)
L = ["# รายงานสรุป tickets (data/tickets.csv)", "",
     f"ข้อมูลจากผลจริงของ `clean.py` — JSON ถูกต้อง, ticket ทั้งหมด {len(d)} ใบ, id ไม่ซ้ำ", "",
     "## จำนวน ticket ต่อวัน (เวลาไทย UTC+7)", "", "| วันที่ | จำนวน |", "|---|---:|"]
L += [f"| {k} | {v} |" for k, v in sorted(days.items())] + [f"| **รวม** | **{sum(days.values())}** |", ""]
L += ["## จำนวน ticket ตามรหัสข้อผิดพลาด", "", "| รหัส | จำนวน |", "|---|---:|"]
L += [f"| {k} | {v} |" for k, v in sorted(codes.items(), key=lambda kv: (kv[0] == "ไม่มีรหัส", kv[0]))]
L += [f"| **รวม** | **{sum(codes.values())}** |", ""]
L += ["## เลขออเดอร์", "",
      f"- คอลัมน์ `order_id` ในไฟล์ต้นฉบับว่าง (หลังตัดช่องว่าง/อักขระมองไม่เห็น): **{len(empty)}** ใบ",
      f"- ในจำนวนนี้ยังหาเลขออเดอร์ไม่ได้ (order_id เป็น null): **{null_empty}** ใบ (ที่เหลือหาได้จากข้อความ `text`)",
      f"- ยังหาเลขออเดอร์ไม่ได้ทั้งหมดทั้งไฟล์: **{null_all}** ใบ", ""]
L += ["## คำสั่งที่ใช้สร้างรายงาน", "", "```bash", "cd /workspace/team-demo",
      "python3 clean.py data/tickets.csv | python3 -B /tmp/gen_report.py > report.md", "rm /tmp/gen_report.py", "```", "",
      "เนื้อหาของ `/tmp/gen_report.py` (ไฟล์ชั่วคราว ลบแล้วหลังสร้างรายงาน):", "", "```python"]
L += [open(__file__).read().rstrip(), "```", ""]
print("\n".join(L))
```


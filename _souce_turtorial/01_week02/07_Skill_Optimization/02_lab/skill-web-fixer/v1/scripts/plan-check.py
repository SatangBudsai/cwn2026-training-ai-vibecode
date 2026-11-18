#!/usr/bin/env python3
"""plan-check.py [TEST-PLAN.md] [e2e/sweep.spec.js] - ตรวจว่า sweep ครอบคลุมแผนทดสอบก่อนรัน (ไม่เปิดเว็บ ไม่ใช้โทเคน)

รายงาน 3 อย่าง:
  1. TC ในแผนที่ยังไม่มีเทสต์ / มีเทสต์ซ้ำมากกว่า 1 ตัว
  2. TC ที่ผลที่คาดหวังมีหลายอย่าง (มี "และ" "," หรือ "+") → ต้องทำให้ทุกผลเกิดพร้อมกันในสถานการณ์เดียว และ assert ครบทุกผล
  3. เทสต์ของ TC ในข้อ 2 ที่มี expect น้อยกว่าจำนวนผลที่คาดหวัง
exit 0 = ครบ · exit 1 = มีรายการต้องแก้ (ข้อความบอกวิธีแก้)
"""
import re, sys

plan = sys.argv[1] if len(sys.argv) > 1 else "TEST-PLAN.md"
spec = sys.argv[2] if len(sys.argv) > 2 else "e2e/sweep.spec.js"
rows = {}
for line in open(plan, encoding="utf-8"):
    c = [x.strip() for x in line.strip().strip("|").split("|")]
    tc = next((x for x in c if re.fullmatch(r"TC-[A-Z]+-\d+", x)), None)
    if tc and len(c) >= 4:
        rows[tc] = {"what": c[c.index(tc) + 2] if len(c) > c.index(tc) + 2 else "", "expected": c[-1]}
try:
    src = open(spec, encoding="utf-8").read()
except OSError:
    sys.exit("ERROR ไม่พบ %s (เขียน sweep ให้ครบทุก TC ก่อน)" % spec)
starts = [(m.start(), m.group(2)) for m in re.finditer(r"\btest(?:\.only|\.skip)?\(\s*(['\"`])(TC-[A-Z]+-\d+)", src)]
body = {}
for i, (pos, tc) in enumerate(starts):
    body.setdefault(tc, []).append(src[pos:starts[i + 1][0] if i + 1 < len(starts) else len(src)])
bad = 0
missing = [t for t in rows if t not in body]
dup = [t for t in body if len(body[t]) > 1]
if missing:
    bad += 1
    print("✗ ยังไม่มีเทสต์ของ: %s → เพิ่มให้ครบ 1 เทสต์ต่อ 1 TC" % ", ".join(missing))
if dup:
    bad += 1
    print("✗ มีเทสต์ซ้ำของ: %s → รวมเป็นเทสต์เดียว (ห้ามแยกเงื่อนไขของ TC เดียวเป็นหลายเทสต์)" % ", ".join(dup))
multi = []
for tc, r in rows.items():
    parts = [p for p in re.split(r"และ|,|\+| แล้ว ", r["expected"]) if p.strip()]
    if len(parts) >= 2:
        multi.append((tc, r, len(parts)))
if multi:
    print("ผลที่คาดหวังมีหลายอย่าง → ป้อนข้อมูลที่ทำให้ทุกผลเกิดพร้อมกันในครั้งเดียว แล้ว assert ครบทุกผลก่อนกรอกใหม่หรือเปลี่ยนหน้า:")
    for tc, r, n in multi:
        k = sum(b.count("expect(") for b in body.get(tc, []))
        flag = "✗ expect %d < %d" % (k, n) if tc in body and k < n else "·"
        if flag.startswith("✗"):
            bad += 1
        print("  %s %s | %s | คาดหวัง %d อย่าง: %s" % (flag, tc, r["what"], n, r["expected"]))
print("แผนมี %d TC · sweep มี %d เทสต์ · %s" % (len(rows), len(starts), "ครบ ✅" if not bad else "ต้องแก้ %d รายการก่อนรัน" % bad))
sys.exit(1 if bad else 0)

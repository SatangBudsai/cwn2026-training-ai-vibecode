#!/usr/bin/env python3
"""สรุปลูกค้าเวอร์ชันเก่า + คำนวณกำหนดเวลาเลิกให้บริการตามนโยบาย (stdlib only)

ใช้: python sunset_dates.py <customers.csv> [--announce YYYY-MM-DD] [--eol YYYY-MM-DD]
คอลัมน์ที่ต้องมี: customer,type,branches,ma_end_date,ma_baht_per_year
คอลัมน์เสริม: active_branches_last_30d,queues_last_30d,interested_in_v2,note
"""
import csv, sys, argparse
from datetime import date, timedelta

FIN_TYPES = {"bank", "finance", "financial", "insurance"}
MD_THRESHOLD = 500_000

def d(s):
    return date.fromisoformat(s.strip())

def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    p = argparse.ArgumentParser()
    p.add_argument("csv")
    p.add_argument("--announce", help="วันส่งหนังสือประกาศ (หลัง MD อนุมัติ)")
    p.add_argument("--eol", help="วันปิดระบบที่เสนอ (ถ้าไม่ใส่ = วันหมด MA ล่าสุด)")
    a = p.parse_args()

    with open(a.csv, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit("ไม่พบข้อมูลลูกค้าในไฟล์")

    total_ma = sum(int(r["ma_baht_per_year"]) for r in rows)
    fin = [r["customer"] for r in rows if r["type"].strip().lower() in FIN_TYPES]
    latest_ma = max(d(r["ma_end_date"]) for r in rows)
    eol = d(a.eol) if a.eol else latest_ma

    print(f"ลูกค้า {len(rows)} ราย · สาขา {sum(int(r['branches']) for r in rows)}", end="")
    if "active_branches_last_30d" in rows[0]:
        print(f" (ใช้งานจริง 30 วัน {sum(int(r['active_branches_last_30d'] or 0) for r in rows)})", end="")
    if "queues_last_30d" in rows[0]:
        print(f" · คิว 30 วัน {sum(int(r['queues_last_30d'] or 0) for r in rows):,}", end="")
    print()
    print(f"MA รายปีที่จะหายไปรวม {total_ma:,} บาท")
    need_md = total_ma > MD_THRESHOLD or bool(fin)
    why = []
    if total_ma > MD_THRESHOLD: why.append(f"MA รวมเกิน {MD_THRESHOLD:,}")
    if fin: why.append("มีลูกค้าธนาคาร/สถาบันการเงิน: " + ", ".join(fin))
    print("ต้องให้ MD อนุมัติ: " + ("ใช่ (" + "; ".join(why) + ")" if need_md else "ไม่ต้อง"))
    print()
    print(f"{'ลูกค้า':<24}{'ประเภท':<12}{'MA หมด':<12}{'MA/ปี':>10}  ปิดก่อน MA หมด?")
    for r in sorted(rows, key=lambda r: r["ma_end_date"]):
        me = d(r["ma_end_date"])
        flag = "ต้องได้หนังสือยินยอม" if eol < me else "-"
        print(f"{r['customer']:<24}{r['type']:<12}{me.isoformat():<12}{int(r['ma_baht_per_year']):>10,}  {flag}")
    print()
    print(f"วันปิดระบบ (EOL): {eol}  · วันหมด MA ล่าสุด: {latest_ma}")
    print(f"ต้องประกาศไม่ช้ากว่า: {eol - timedelta(days=180)}  (180 วัน)")
    print(f"ต้องเปิดส่งออกข้อมูลไม่ช้ากว่า: {eol - timedelta(days=90)}  (90 วัน)")
    print(f"ต้องลบข้อมูลครบภายใน: {eol + timedelta(days=30)}  (30 วันหลังปิด · ธนาคารดู DPA)")
    if a.announce:
        an = d(a.announce)
        gap = (eol - an).days
        print(f"วันประกาศ {an} → เหลือ {gap} วันก่อนปิด " + ("OK" if gap >= 180 else "ไม่ถึง 180 วัน ผิดนโยบาย"))
        print(f"สิทธิ์ย้ายฟรีถ้าเซ็น v2 ภายใน: {an + timedelta(days=90)}")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""สรุป KPI รายเดือนเป็นตาราง Markdown สำหรับทำ deck ผู้บริหาร

ใช้:  python kpi_summary.py <monthly-kpi.csv> [--month YYYY-MM]
- ค่าเริ่มต้น = เดือนล่าสุดในไฟล์ เทียบกับเดือนก่อนหน้า
- คำนวณ: ส่วนต่างเทียบเดือนก่อน, สถานะเทียบเป้า, กำไรขั้นต้น (บาท) = revenue x gross_margin
- ไม่ตัดสินอะไรแทนคน: แค่บอกว่า "ผ่านเป้า / ต่ำกว่าเป้า / ไม่มีเป้า"
"""
import csv
import re
import sys

# metric ที่ "ค่าน้อยดีกว่า" (ผ่านเป้าเมื่อ <= target)
LOWER_IS_BETTER = {"incidents_sev1", "incidents_sev2", "attrition", "deals_lost"}

LABEL = {
    "revenue": "รายได้", "gross_margin": "กำไรขั้นต้น (%)", "gross_profit": "กำไรขั้นต้น (บาท, คำนวณ)",
    "pipeline_value": "Pipeline", "deals_won": "ดีลที่ชนะ", "deals_lost": "ดีลที่แพ้",
    "win_rate": "Win rate (%)", "projects_active": "โปรเจกต์ที่ทำอยู่", "projects_on_time": "โปรเจกต์ตรงเวลา",
    "incidents_sev1": "เหตุขัดข้อง Sev 1", "incidents_sev2": "เหตุขัดข้อง Sev 2", "headcount": "พนักงาน (คน)",
    "open_positions": "ตำแหน่งว่าง", "attrition": "ลาออก (คน)", "customer_nps": "NPS ลูกค้า",
}


def num(s):
    s = (s or "").strip()
    return float(s) if s else None


def fmt(v, unit):
    if v is None:
        return "–"
    if unit == "THB":
        return f"{v:,.0f}"
    if unit == "pct":
        return f"{v:.1f}%"
    return f"{v:,.0f}" if v == int(v) else f"{v:,.1f}"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    want = sys.argv[sys.argv.index("--month") + 1] if "--month" in sys.argv else None

    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    months = [c for c in rows[0].keys() if re.fullmatch(r"\d{4}-\d{2}", c)]
    cur = want or months[-1]
    if cur not in months:
        sys.exit(f"ไม่พบเดือน {cur} ในไฟล์ (มี {', '.join(months)})")
    i = months.index(cur)
    prev = months[i - 1] if i > 0 else None

    by = {r["metric"]: r for r in rows}
    # กำไรขั้นต้นเป็นบาท (MD ถามบ่อย: รายได้โตแต่กำไรเป็นเงินโตไหม)
    if "revenue" in by and "gross_margin" in by:
        gp = {m: (num(by["revenue"][m]) or 0) * (num(by["gross_margin"][m]) or 0) / 100 for m in months}
        t_rev, t_gm = num(by["revenue"].get("target_monthly")), num(by["gross_margin"].get("target_monthly"))
        by["gross_profit"] = {"metric": "gross_profit", "unit": "THB", **{m: str(gp[m]) for m in months},
                              "target_monthly": str(t_rev * t_gm / 100) if t_rev and t_gm else "",
                              "note": "revenue x gross_margin"}
        order = list(by.keys())
        order.insert(order.index("gross_margin") + 1, order.pop(order.index("gross_profit")))
    else:
        order = list(by.keys())

    print(f"# KPI {cur}" + (f" เทียบ {prev}" if prev else ""))
    print()
    print(f"| ตัวชี้วัด | {prev or ''} | {cur} | เปลี่ยน | เป้า/เดือน | สถานะ | หมายเหตุ |")
    print("|---|---:|---:|---:|---:|---|---|")
    for k in order:
        r = by[k]
        unit = r["unit"]
        c, p, t = num(r[cur]), num(r[prev]) if prev else None, num(r.get("target_monthly"))
        if c is not None and p is not None:
            if unit == "pct":
                chg = f"{c - p:+.1f} pt"
            elif p:
                chg = f"{(c - p) / p * 100:+.1f}%" if unit == "THB" else f"{c - p:+,.0f}"
            else:
                chg = f"{c - p:+,.0f}"
        else:
            chg = "–"
        if t is None or c is None:
            status = "ไม่มีเป้า"
        else:
            ok = c <= t if k in LOWER_IS_BETTER else c >= t
            status = "ผ่านเป้า" if ok else "**ต่ำกว่าเป้า**"
        print(f"| {LABEL.get(k, k)} | {fmt(p, unit)} | {fmt(c, unit)} | {chg} | {fmt(t, unit)} | {status} | {r.get('note', '')} |")

    # อัตราตรงเวลา (คำนวณ)
    if "projects_on_time" in by and "projects_active" in by:
        print()
        for m in [x for x in (prev, cur) if x]:
            a, o = num(by["projects_active"][m]), num(by["projects_on_time"][m])
            if a:
                print(f"- ตรงเวลา {m}: {o:.0f}/{a:.0f} = {o / a * 100:.1f}%")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

"""คำนวณตัวเลขตั้งต้นสำหรับสรุปต้นทุน-กำลังคนรายเดือน (cost-headcount-review)

ใช้:  python -I kpi_calc.py <monthly-kpi.csv> [เดือนนี้ YYYY-MM] [เดือนก่อน YYYY-MM]
ถ้าไม่ระบุเดือน จะใช้ 2 คอลัมน์เดือนล่าสุดในไฟล์
พิมพ์ตาราง Markdown ออก stdout — คัดลอกไปวางในรายงานได้ทันที
ทุกตัวเลขคิดจากไฟล์เท่านั้น ไม่เดา (ไม่มีข้อมูล = แสดง "—")
"""
import csv
import re
import sys


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def fmt(v, unit=""):
    if v is None:
        return "—"
    if unit == "pct":
        return f"{v:.1f}%"
    if unit == "pts":
        return f"{v:+.1f} pts"
    if abs(v) >= 100:
        return f"{v:,.0f}"
    return f"{v:,.1f}".rstrip("0").rstrip(".")


def signed(v):
    return ("+" if v >= 0 else "−") + fmt(abs(v))


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # Windows console ไม่ใช่ UTF-8
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    months = [c for c in rows[0] if re.fullmatch(r"\d{4}-\d{2}", c)]
    cur = sys.argv[2] if len(sys.argv) > 2 else months[-1]
    prev = sys.argv[3] if len(sys.argv) > 3 else months[months.index(cur) - 1]
    kpi = {r["metric"]: r for r in rows}

    def g(metric, col):
        return num(kpi.get(metric, {}).get(col))

    out = {}
    for col in (prev, cur):
        rev, gm, hc = g("revenue", col), g("gross_margin", col), g("headcount", col)
        gp = rev * gm / 100 if rev is not None and gm is not None else None
        act, ontime = g("projects_active", col), g("projects_on_time", col)
        out[col] = {
            "รายได้ (บาท)": rev,
            "Gross margin": gm,
            "กำไรขั้นต้น (บาท)": gp,
            "ต้นทุนตรง = รายได้ − กำไรขั้นต้น (บาท)": rev - gp if gp is not None else None,
            "พนักงาน (คน)": hc,
            "ตำแหน่งว่าง": g("open_positions", col),
            "รายได้ต่อหัว (บาท/คน)": rev / hc if rev and hc else None,
            "กำไรขั้นต้นต่อหัว (บาท/คน)": gp / hc if gp and hc else None,
            "โปรเจกต์ active": act,
            "โปรเจกต์ตรงเวลา %": ontime / act * 100 if act and ontime is not None else None,
            "Win rate": g("win_rate", col),
            "Pipeline (บาท)": g("pipeline_value", col),
        }

    t_rev, t_gm = g("revenue", "target_monthly"), g("gross_margin", "target_monthly")
    targets = {
        "รายได้ (บาท)": t_rev,
        "Gross margin": t_gm,
        "กำไรขั้นต้น (บาท)": t_rev * t_gm / 100 if t_rev and t_gm else None,
        "Win rate": g("win_rate", "target_monthly"),
        "Pipeline (บาท)": g("pipeline_value", "target_monthly"),
    }
    pct_rows = {"Gross margin", "โปรเจกต์ตรงเวลา %", "Win rate"}

    print(f"| ตัวชี้วัด | {prev} | {cur} | เปลี่ยน | เป้า/เดือน | เทียบเป้า |")
    print("|---|---:|---:|---:|---:|---:|")
    for name in out[cur]:
        a, b, t = out[prev][name], out[cur][name], targets.get(name)
        unit = "pct" if name in pct_rows else ""
        if a is None or b is None:
            chg = "—"
        elif unit:
            chg = fmt(b - a, "pts")
        else:
            chg = f"{signed(b - a)} ({(b - a) / a * 100:+.1f}%)" if a else signed(b - a)
        if t is None or b is None:
            vs = "—"
        elif unit:
            vs = fmt(b - t, "pts")
        else:
            vs = f"{signed(b - t)} ({(b - t) / t * 100:+.1f}%)"
        print(f"| {name} | {fmt(a, unit)} | {fmt(b, unit)} | {chg} | {fmt(t, unit)} | {vs} |")

    notes = [(r["metric"], r.get("note", "")) for r in rows if r.get("note")]
    if notes:
        print("\nหมายเหตุจากไฟล์ (อ่านทุกข้อ — มักอธิบายตัวเลขที่ผิดปกติ):")
        for m, n in notes:
            print(f"- {m}: {n}")


if __name__ == "__main__":
    main()

"""คำนวณตัวเลขอนุพันธ์สำหรับ cost-headcount-review จากไฟล์ KPI รายเดือน (stdlib เท่านั้น)

ใช้:  python kpi_calc.py <monthly-kpi.csv> [เดือนนี้ YYYY-MM] [เดือนก่อน YYYY-MM]
ถ้าไม่ระบุเดือน จะใช้ 2 คอลัมน์เดือนขวาสุด (คอลัมน์ที่ชื่อเป็น YYYY-MM)
รูปแบบ CSV ที่คาด: metric,unit,<YYYY-MM>...,target_monthly,note
"""
import csv
import re
import sys


def load(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    months = [c for c in rows[0].keys() if re.fullmatch(r"\d{4}-\d{2}", c or "")]
    data = {r["metric"]: r for r in rows}
    return data, months


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    data, months = load(sys.argv[1])
    cur = sys.argv[2] if len(sys.argv) > 2 else months[-1]
    prev = sys.argv[3] if len(sys.argv) > 3 else months[-2]

    def g(metric, m):
        return num(data.get(metric, {}).get(m))

    out = {}
    for m in (prev, cur):
        rev, gm, hc = g("revenue", m), g("gross_margin", m), g("headcount", m)
        gp = rev * gm / 100 if rev is not None and gm is not None else None
        cost = rev - gp if gp is not None else None
        out[m] = {
            "revenue": rev,
            "gross_margin_pct": gm,
            "gross_profit": gp,
            "cost_of_revenue": cost,
            "headcount": hc,
            "revenue_per_head": rev / hc if rev and hc else None,
            "cost_per_head": cost / hc if cost and hc else None,
            "gp_per_head": gp / hc if gp and hc else None,
            "open_positions": g("open_positions", m),
            "on_time_pct": (g("projects_on_time", m) / g("projects_active", m) * 100)
            if g("projects_active", m) else None,
        }

    def fmt(v, pct=False):
        if v is None:
            return "-"
        return f"{v:,.1f}%" if pct else f"{v:,.0f}"

    print(f"| ตัวชี้วัด | {prev} | {cur} | เปลี่ยนแปลง | เป้า/เดือน |")
    print("|---|---:|---:|---:|---:|")
    targets = {"revenue": num(data.get("revenue", {}).get("target_monthly")),
               "gross_margin_pct": num(data.get("gross_margin", {}).get("target_monthly"))}
    for k in out[cur]:
        a, b = out[prev][k], out[cur][k]
        pct = k.endswith("_pct")
        if a is not None and b is not None:
            d = f"{b - a:+,.1f} pt" if pct else (f"{b - a:+,.0f} ({(b - a) / a * 100:+.1f}%)" if a else f"{b - a:+,.0f}")
        else:
            d = "-"
        t = fmt(targets.get(k), pct) if targets.get(k) is not None else ""
        print(f"| {k} | {fmt(a, pct)} | {fmt(b, pct)} | {d} | {t} |")

    # จุดคุ้มทุนของการรับคน: ต้องมี gross profit เพิ่มเท่าไหร่ต่อเงินเดือน 1 คน
    gm = out[cur]["gross_margin_pct"]
    if gm:
        print(f"\nที่ margin {gm:.1f}% รายได้ต้องเพิ่ม ~{100 / gm:.1f} บาท ต่อค่าใช้จ่ายคนที่เพิ่ม 1 บาท")


if __name__ == "__main__":
    main()

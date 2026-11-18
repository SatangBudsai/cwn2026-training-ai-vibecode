#!/usr/bin/env python3
"""ตรวจเกณฑ์ถอยกลับ (rollback) ของโมเดลพยากรณ์ รายสัปดาห์ — ใช้ได้ทั้งช่วง shadow และหลังขึ้นจริง

อินพุต: CSV 1 แถว = 1 สาขา × 1 ชั่วโมง มีคอลัมน์
    date (YYYY-MM-DD), hour (0-23), branch_id, actual, pred_new, pred_base
    zone (ไม่บังคับ: "office" = สาขาย่านออฟฟิศ ใช้คิดเกณฑ์ช่วงพักเที่ยง)
ช่อง pred_* ว่าง = ไม่มีพยากรณ์ (นับเป็นพยากรณ์หาย)

เกณฑ์ (ค่าเริ่มต้นตาม references/rollback-criteria.md — ปรับด้วย option ได้):
    R1 MAPE รายสัปดาห์ของโมเดลใหม่ > --mape-max  สองสัปดาห์ติด          -> ROLLBACK (1 สัปดาห์ = WATCH)
    R2 MAPE โมเดลใหม่ แย่กว่า baseline  สองสัปดาห์ติด                    -> ROLLBACK (1 สัปดาห์ = WATCH)
    R3 bias ช่วงเที่ยง (สาขา office) ต่ำกว่า --lunch-rollback               -> ROLLBACK (ต่ำกว่า --lunch-watch = WATCH)
    R4 พยากรณ์ติดลบ / หาย / สูงเกิน --sanity-x เท่าของ actual สูงสุดในไฟล์ -> ROLLBACK ทันที (ข้อมูลผิด)

exit code: 0 = OK, 1 = WATCH, 2 = ROLLBACK, 3 = อินพุตผิด
ใช้แค่ standard library (Python 3.8+)
"""
import argparse
import csv
import datetime as dt
import math
import sys
from collections import defaultdict

LEVEL = {"OK": 0, "WATCH": 1, "ROLLBACK": 2}


def parse_args():
    p = argparse.ArgumentParser(description="ตรวจเกณฑ์ rollback โมเดลพยากรณ์ รายสัปดาห์")
    p.add_argument("csv", help="ไฟล์ผลพยากรณ์เทียบของจริง")
    p.add_argument("--mape-max", type=float, default=22.0, help="MAPE รายสัปดาห์สูงสุด (%%) [22]")
    p.add_argument("--lunch-hours", default="11,12", help="ชั่วโมงเริ่มของช่วงพักเที่ยง [11,12 = 11:00-13:00]")
    p.add_argument("--lunch-watch", type=float, default=-20.0, help="bias ช่วงเที่ยง (%%) ที่ต้องเฝ้า [-20]")
    p.add_argument("--lunch-rollback", type=float, default=-30.0, help="bias ช่วงเที่ยง (%%) ที่ต้องถอย [-30]")
    p.add_argument("--sanity-x", type=float, default=3.0, help="พยากรณ์เกินกี่เท่าของ actual สูงสุด = ผิดปกติ [3]")
    return p.parse_args()


def fnum(s):
    s = (s or "").strip()
    if s == "":
        return None
    v = float(s)
    return None if math.isnan(v) else v


def week_key(d):
    y, w, _ = d.isocalendar()
    monday = d - dt.timedelta(days=d.weekday())
    return f"{y}-W{w:02d} ({monday:%d %b})"


def main():
    for s in (sys.stdout, sys.stderr):  # Windows console ไม่ใช่ UTF-8 → ภาษาไทยเพี้ยน
        if hasattr(s, "reconfigure"):
            s.reconfigure(encoding="utf-8")
    a = parse_args()
    lunch = {int(h) for h in a.lunch_hours.split(",") if h.strip()}
    need = {"date", "hour", "branch_id", "actual", "pred_new", "pred_base"}

    rows = []
    try:
        with open(a.csv, newline="", encoding="utf-8-sig") as f:
            r = csv.DictReader(f)
            missing = need - set(r.fieldnames or [])
            if missing:
                print(f"อินพุตผิด: ไม่มีคอลัมน์ {sorted(missing)}", file=sys.stderr)
                return 3
            for i, row in enumerate(r, start=2):
                try:
                    rows.append({
                        "d": dt.date.fromisoformat(row["date"].strip()),
                        "h": int(row["hour"]),
                        "b": row["branch_id"].strip(),
                        "zone": (row.get("zone") or "").strip().lower(),
                        "y": fnum(row["actual"]),
                        "new": fnum(row["pred_new"]),
                        "base": fnum(row["pred_base"]),
                    })
                except ValueError as e:
                    print(f"อินพุตผิดที่บรรทัด {i}: {e}", file=sys.stderr)
                    return 3
    except OSError as e:
        print(f"เปิดไฟล์ไม่ได้: {e}", file=sys.stderr)
        return 3
    if not rows:
        print("อินพุตผิด: ไม่มีข้อมูล", file=sys.stderr)
        return 3

    ymax = max((x["y"] for x in rows if x["y"] is not None), default=0) or 1
    has_zone = any(x["zone"] == "office" for x in rows)

    W = defaultdict(lambda: {"ape_new": 0.0, "ape_base": 0.0, "n": 0, "l_err": 0.0, "l_act": 0.0,
                             "missing": 0, "negative": 0, "insane": 0, "rows": 0})
    for x in rows:
        w = W[week_key(x["d"])]
        w["rows"] += 1
        if x["new"] is None:
            w["missing"] += 1
            continue
        if x["new"] < 0:
            w["negative"] += 1
        if x["new"] > a.sanity_x * ymax:
            w["insane"] += 1
        if x["y"] is None:
            continue
        if x["y"] > 0 and x["base"] is not None:  # MAPE ข้ามชั่วโมงที่ actual = 0
            w["ape_new"] += abs(x["new"] - x["y"]) / x["y"]
            w["ape_base"] += abs(x["base"] - x["y"]) / x["y"]
            w["n"] += 1
        if x["h"] in lunch and (x["zone"] == "office" or not has_zone):
            w["l_err"] += x["new"] - x["y"]
            w["l_act"] += x["y"]

    print("| สัปดาห์ | แถว | MAPE ใหม่ % | MAPE baseline % | bias เที่ยง % | พยากรณ์หาย/ติดลบ/เกิน | ผล | เหตุผล |")
    print("|---|---:|---:|---:|---:|---|---|---|")
    overall = "OK"
    prev_over = prev_worse = False
    for k in sorted(W):
        w = W[k]
        mn = 100 * w["ape_new"] / w["n"] if w["n"] else float("nan")
        mb = 100 * w["ape_base"] / w["n"] if w["n"] else float("nan")
        lb = 100 * w["l_err"] / w["l_act"] if w["l_act"] else float("nan")
        verdict, why = "OK", []

        def bump(level, reason):
            nonlocal verdict
            if LEVEL[level] > LEVEL[verdict]:
                verdict = level
            why.append(reason)

        if w["missing"] or w["negative"] or w["insane"]:
            bump("ROLLBACK", "R4 ข้อมูลพยากรณ์ผิด")
        over = w["n"] > 0 and mn > a.mape_max
        worse = w["n"] > 0 and mn > mb
        if over:
            bump("ROLLBACK" if prev_over else "WATCH", f"R1 MAPE>{a.mape_max:g}%" + (" 2 สัปดาห์ติด" if prev_over else ""))
        if worse:
            bump("ROLLBACK" if prev_worse else "WATCH", "R2 แย่กว่า baseline" + (" 2 สัปดาห์ติด" if prev_worse else ""))
        if not math.isnan(lb):
            if lb < a.lunch_rollback:
                bump("ROLLBACK", f"R3 เที่ยงต่ำกว่าจริง {lb:.1f}%")
            elif lb < a.lunch_watch:
                bump("WATCH", f"R3 เที่ยงต่ำกว่าจริง {lb:.1f}%")
        prev_over, prev_worse = over, worse
        if LEVEL[verdict] > LEVEL[overall]:
            overall = verdict
        print(f"| {k} | {w['rows']} | {mn:.1f} | {mb:.1f} | {lb:+.1f} | "
              f"{w['missing']}/{w['negative']}/{w['insane']} | {verdict} | {'; '.join(why) or '-'} |")

    print()
    if not has_zone:
        print("หมายเหตุ: ไม่มีคอลัมน์ zone=office — คิด bias ช่วงเที่ยงจากทุกสาขา (เกณฑ์ R3 จะหลวมกว่าที่ตั้งใจ)")
    print(f"สรุป: {overall}")
    return LEVEL[overall]


if __name__ == "__main__":
    sys.exit(main())

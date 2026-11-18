#!/usr/bin/env python3
"""เทียบผลการทดลองจาก experiment-results.csv -> Markdown (stdlib only)

ใช้:  python compare_runs.py <experiment-results.csv> [--target-mape 20] [--out report-part.md]

ทำ 3 อย่าง:
1. ตารางเทียบ metric ทุก run (เรียงตาม run_id) + ส่วนต่างเทียบ run ก่อนหน้า
2. ตรวจว่าเทียบกันแฟร์ไหม (data_version / n_branches / test_period ต้องเหมือนกัน)
3. ตรวจช่องที่ขาดตามมาตรฐาน run record (seed, git_commit, artifact ...)
"""
import argparse
import csv
import sys

REQUIRED = ["run_id", "run_name", "date", "author", "model", "features", "params",
            "data_version", "n_branches", "train_period", "test_period",
            "MAE", "MAPE_pct", "RMSE", "git_commit"]
RECOMMENDED = ["seed", "artifact_uri", "mlflow_run_id", "decision", "reason"]
COMPARABILITY_KEYS = ["data_version", "n_branches", "train_period", "test_period"]
METRICS = ["MAE", "MAPE_pct", "RMSE", "MAPE_payday_pct", "MAPE_holiday_week_pct"]


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def fmt(v):
    return "–" if v is None else (f"{v:g}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--target-mape", type=float, default=20.0)
    ap.add_argument("--out")
    a = ap.parse_args()

    with open(a.csv, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit("ไม่มี run ในไฟล์")
    rows.sort(key=lambda r: r.get("run_id", ""))
    cols = rows[0].keys()
    metrics = [m for m in METRICS if m in cols]
    out = []

    # 1) ตาราง metric
    out.append("### ตารางเทียบ metric\n")
    out.append("| run | ชื่อ | โมเดล | data | สาขา | " + " | ".join(metrics) +
               f" | ผ่าน MAPE ≤ {a.target_mape:g}% |")
    out.append("|" + "---|" * (5 + len(metrics) + 1))
    prev = None
    for r in rows:
        cells = []
        for m in metrics:
            v = num(r.get(m))
            s = fmt(v)
            if prev is not None and v is not None and num(prev.get(m)) is not None:
                s += f" ({v - num(prev.get(m)):+.1f})"
            cells.append(s)
        mape = num(r.get("MAPE_pct"))
        ok = "–" if mape is None else ("✅" if mape <= a.target_mape else "❌")
        out.append(f"| {r['run_id']} | {r.get('run_name','')} | {r.get('model','')} | "
                   f"{r.get('data_version','')} | {r.get('n_branches','')} | "
                   + " | ".join(cells) + f" | {ok} |")
        if mape is not None:  # run ที่ยังไม่มีผล (planned) ไม่ใช้เป็นฐานคิดส่วนต่าง
            prev = r
    out.append("\n(ตัวเลขในวงเล็บ = ส่วนต่างจาก run ก่อนหน้า, metric ยิ่งต่ำยิ่งดี)\n")

    # 2) ความแฟร์ของการเทียบ
    out.append("### เทียบกันแฟร์ไหม\n")
    groups = {}
    for r in rows:
        key = tuple(r.get(k, "") for k in COMPARABILITY_KEYS)
        groups.setdefault(key, []).append(r["run_id"])
    if len(groups) == 1:
        out.append("- ✅ ทุก run ใช้ข้อมูล/ช่วงเวลาเดียวกัน เทียบตรง ๆ ได้")
    else:
        out.append("- ⚠️ มี run ที่ใช้ข้อมูลต่างกัน — เทียบตัวเลขข้ามกลุ่มตรง ๆ ไม่ได้:")
        for key, ids in groups.items():
            desc = ", ".join(f"{k}={v}" for k, v in zip(COMPARABILITY_KEYS, key))
            out.append(f"  - กลุ่ม {', '.join(ids)}: {desc}")
        out.append("- ต้องรัน run เดิมบนข้อมูลชุดใหม่ (หรือกลับกัน) เพื่อแยกผลของ feature ออกจากผลของข้อมูล")
    out.append("")

    # 3) ช่องที่ขาด
    out.append("### ช่องที่ขาดตามมาตรฐาน run record\n")
    any_gap = False
    for r in rows:
        if (r.get("status") or "").strip() == "planned":
            continue
        miss_req = [k for k in REQUIRED if not (r.get(k) or "").strip()]
        miss_rec = [k for k in RECOMMENDED if not (r.get(k) or "").strip()]
        if miss_req or miss_rec:
            any_gap = True
            parts = []
            if miss_req:
                parts.append("**ต้องมี:** " + ", ".join(miss_req))
            if miss_rec:
                parts.append("ควรมี: " + ", ".join(miss_rec))
            out.append(f"- {r['run_id']}: " + " · ".join(parts))
    if not any_gap:
        out.append("- ✅ ครบทุกช่อง")
    out.append("")

    text = "\n".join(out)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(text)
    sys.stdout.reconfigure(encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()

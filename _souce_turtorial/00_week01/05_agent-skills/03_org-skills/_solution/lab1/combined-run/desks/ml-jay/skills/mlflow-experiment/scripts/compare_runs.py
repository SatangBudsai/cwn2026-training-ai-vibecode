#!/usr/bin/env python3
"""เทียบผลการทดลองทุกรอบจาก experiment-results.csv -> Markdown

ใช้ stdlib อย่างเดียว (รันได้ทุกเครื่องที่มี Python 3.8+)

    python compare_runs.py --csv experiment-results.csv --out work/compare.md \
        [--metric MAPE_pct] [--threshold 20] [--baseline r01]

สิ่งที่สคริปต์ทำ
1. ตารางทุกรอบ: model, data_version, n_branches, metric หลัก + metric ย่อย
2. ส่วนต่างเทียบ baseline และเทียบรอบก่อนหน้า
3. ตรวจว่าคู่ไหน "เทียบแฟร์" (data_version, n_branches, train/test period เหมือนกัน)
4. ตรวจเกณฑ์ (เช่น TOR MAPE <= 20%)
5. ตรวจช่องที่ควรมีแต่ไม่มี (seed, data hash, artifact uri, ...)
ไม่ตัดสินใจแทนคน: แค่ชี้ข้อเท็จจริงให้ครบ
"""
import argparse
import csv
import sys

# ฟิลด์ที่ทุกรอบควรมีถึงจะทำซ้ำ/เทียบได้ (ดู references/experiment-record-standard.md)
REQUIRED = [
    "run_id", "run_name", "date", "author", "model", "features", "params",
    "data_version", "n_branches", "train_period", "test_period", "git_commit",
]
RECOMMENDED = ["seed", "data_hash", "artifact_uri", "mlflow_run_id", "reason"]
SAME_FOR_FAIR = ["data_version", "n_branches", "train_period", "test_period"]
LOWER_IS_BETTER_HINT = ("MAE", "MAPE", "RMSE", "train_time")


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def fmt(v, nd=1):
    return "-" if v is None else f"{v:.{nd}f}"


def delta(a, b):
    if a is None or b is None:
        return "-"
    d = a - b
    pct = f" ({d / b * 100:+.0f}%)" if b else ""
    return f"{d:+.1f}{pct}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out", default="-")
    ap.add_argument("--metric", default="MAPE_pct", help="metric หลักที่ใช้ตัดสิน")
    ap.add_argument("--threshold", type=float, default=None, help="เกณฑ์ผ่าน (ค่า <= threshold)")
    ap.add_argument("--baseline", default=None, help="run_id ของ baseline (default = แถวแรก)")
    a = ap.parse_args()

    with open(a.csv, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit("CSV ว่าง")
    cols = list(rows[0].keys())
    metrics = [c for c in cols if c.startswith(LOWER_IS_BETTER_HINT)]
    if a.metric not in cols:
        sys.exit(f"ไม่พบคอลัมน์ {a.metric} (มี: {', '.join(metrics)})")
    # รอบที่ยังไม่มีผล (เช่น PLANNED ไม่มีวันที่) ไปไว้ท้าย
    rows.sort(key=lambda r: (num(r[a.metric]) is None, r.get("date", "") or "9999", r["run_id"]))
    done = [r for r in rows if num(r[a.metric]) is not None]
    base = next((r for r in rows if r["run_id"] == a.baseline), done[0] if done else rows[0])

    out = []
    w = out.append
    w(f"# เทียบผลการทดลอง ({len(rows)} รอบ) · metric หลัก `{a.metric}`\n")
    w(f"baseline = `{base['run_id']}` ({base['run_name']})"
      + (f" · เกณฑ์ผ่าน: `{a.metric}` <= {a.threshold:g}" if a.threshold is not None else "") + "\n")

    # 1) ตารางทุกรอบ
    w("## 1. ทุกรอบ\n")
    hdr = ["run", "date", "model", "data", "สาขา"] + metrics
    w("| " + " | ".join(hdr) + " |")
    w("|" + "---|" * len(hdr))
    best = min(rows, key=lambda r: num(r[a.metric]) if num(r[a.metric]) is not None else 1e18)
    for r in rows:
        name = f"`{r['run_id']}` {r['run_name']}" + (" ⭐" if r is best else "")
        cells = [name, r.get("date", ""), r.get("model", ""), r.get("data_version", ""), r.get("n_branches", "")]
        cells += [fmt(num(r[m])) for m in metrics]
        w("| " + " | ".join(cells) + " |")
    w("")

    # 2) ส่วนต่าง
    w(f"## 2. ส่วนต่าง `{a.metric}` (ติดลบ = ดีขึ้น)\n")
    w("| run | เทียบ baseline | เทียบรอบก่อน | ผ่านเกณฑ์? |")
    w("|---|---|---|---|")
    prev = None
    for r in rows:
        v = num(r[a.metric])
        ok = "-" if a.threshold is None or v is None else ("✅ ผ่าน" if v <= a.threshold else "❌ ไม่ผ่าน")
        if a.threshold is not None and v is not None and v <= a.threshold and a.threshold - v < 1:
            ok += " (เฉียด < 1 จุด)"
        w(f"| `{r['run_id']}` | {delta(v, num(base[a.metric])) if r is not base else '—'} | "
          f"{delta(v, num(prev[a.metric])) if prev else '—'} | {ok} |")
        prev = r
    w("")

    # 3) เทียบแฟร์ไหม
    w("## 3. คู่ไหนเทียบกันได้แฟร์ (ข้อมูล/ช่วงเวลาเดียวกัน)\n")
    w("| คู่ | แฟร์? | ต่างกันที่ |")
    w("|---|---|---|")
    for i, r in enumerate(rows):
        for s in rows[i + 1:]:
            diff = [k for k in SAME_FOR_FAIR if k in cols and r[k] != s[k]]
            mark = "✅" if not diff else "⚠️ ไม่แฟร์"
            detail = "; ".join(f"{k}: {r[k]} → {s[k]}" for k in diff) or "-"
            w(f"| `{r['run_id']}` vs `{s['run_id']}` | {mark} | {detail} |")
    w("")

    # 4) ช่องที่ขาด
    w("## 4. ช่องที่ขาด (ทำซ้ำ/ตรวจย้อนไม่ได้)\n")
    miss_req = [k for k in REQUIRED if k not in cols]
    miss_rec = [k for k in RECOMMENDED if k not in cols]
    empty = [(r["run_id"], k) for r in rows for k in REQUIRED if k in cols and not r[k].strip()]
    w(f"- คอลัมน์บังคับที่ไม่มี: {', '.join(miss_req) or 'ไม่มี ✅'}")
    w(f"- คอลัมน์แนะนำที่ไม่มี: {', '.join(miss_rec) or 'ไม่มี ✅'}")
    w(f"- ช่องว่าง: {', '.join(f'{a_}.{b_}' for a_, b_ in empty) or 'ไม่มี ✅'}")
    w("")

    text = "\n".join(out)
    if a.out == "-":
        sys.stdout.reconfigure(encoding="utf-8")
        print(text)
    else:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"wrote {a.out}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""คิดราคา proposal ตาม margin-rules v2026.1 (skill pricing-rules ของ core)

ใช้:  python price.py lines.json [--price-list path.csv]
lines.json:
{
  "fixed_price": true,                 # true = บวก buffer 10% ใน man-day ให้เอง
  "budget": 4800000,                   # (ไม่บังคับ) งบลูกค้า ไม่รวม VAT
  "discount": 0,                       # ส่วนลดพิเศษ (บาท) — คิดจากบรรทัด man-day/license เท่านั้น
  "lines": [ {"code": "MD-SA", "qty": 20}, {"code": "CL-M", "qty": 12, "note": "ปีแรก"} ]
}
ผลลัพธ์: ตารางราคาสำหรับลูกค้า (markdown) + สรุปภายใน (ต้นทุน/margin/ผู้อนุมัติ) แยกกัน
"""
import csv, json, math, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
def _price_list_path():
    """price-list อยู่ที่ skill pricing-rules ของ plugin core (แหล่งเดียว)
    ลำดับ: --price-list <path> · $NOVATECH_PRICE_LIST · checkout ของคลัง · marketplace/cache ที่ติดตั้งแล้ว"""
    import os
    if "--price-list" in sys.argv:
        i = sys.argv.index("--price-list")
        path = sys.argv[i + 1]
        del sys.argv[i:i + 2]
        return Path(path)
    if os.environ.get("NOVATECH_PRICE_LIST"):
        return Path(os.environ["NOVATECH_PRICE_LIST"])
    rel = Path("plugins/core/skills/pricing-rules/references/price-list.csv")
    here = Path(__file__).resolve().parent
    for up in here.parents:
        if (up / rel).is_file():
            return up / rel
    home = Path.home() / ".claude" / "plugins"
    cands = [home / "marketplaces" / "novatech-skills" / rel]
    cands += sorted((home / "cache" / "novatech-skills" / "core").glob("*/skills/pricing-rules/references/price-list.csv"),
                    key=lambda p: p.stat().st_mtime, reverse=True)
    for c in cands:
        if c.is_file():
            return c
    sys.exit("หา price-list ไม่เจอ — ติดตั้ง plugin core หรือส่ง --price-list <pricing-rules>/references/price-list.csv")


PRICES = {r["code"]: r for r in csv.DictReader(open(_price_list_path(), encoding="utf-8"))}
NO_DISCOUNT = ("CL-", "MA-")  # ห้ามลด MA และ cloud hosting


def baht(x):
    return f"{x:,.0f}" if float(x).is_integer() else f"{x:,.2f}"


def main(path):
    cfg = json.load(open(path, encoding="utf-8"))
    rows, sell, cost, discountable = [], 0, 0, 0
    for ln in cfg["lines"]:
        p = PRICES[ln["code"]]
        qty = ln["qty"]
        if cfg.get("fixed_price") and ln["code"].startswith("MD-"):
            qty = math.ceil(qty * 1.10)  # risk buffer 10% ซ่อนใน man-day
        s, c = qty * int(p["unit_price_thb"]), qty * int(p["cost_thb"])
        sell += s; cost += c
        if not ln["code"].startswith(NO_DISCOUNT):
            discountable += s
        rows.append((ln["code"], p["item"] + (f" ({ln['note']})" if ln.get("note") else ""), f"{qty} {p['unit']}", int(p["unit_price_thb"]), s))

    disc = cfg.get("discount", 0)
    net = sell - disc
    vat = round(net * 0.07, 2)
    margin = (net - cost) / net * 100
    disc_pct = disc / sell * 100 if sell else 0

    print("## ตารางราคาสำหรับลูกค้า (ไม่รวม VAT)\n")
    print("| รหัส | รายการ | จำนวน | ราคาต่อหน่วย | รวม (บาท) |\n|---|---|---|---|---|")
    for code, item, q, u, s in rows:
        print(f"| {code} | {item} | {q} | {baht(u)} | {baht(s)} |")
    if disc:
        print(f"| | ส่วนลดพิเศษ | | | −{baht(disc)} |")
    print(f"| | **รวมก่อน VAT** | | | **{baht(net)}** |")
    print(f"| | VAT 7% | | | {baht(vat)} |")
    print(f"| | **รวมทั้งสิ้น** | | | **{baht(net + vat)}** |")

    print("\n## สรุปภายใน (ห้ามใส่ในเอกสารลูกค้า)\n")
    print(f"- ราคาตาม price-list {baht(sell)} · ส่วนลด {baht(disc)} ({disc_pct:.1f}% ของราคาเต็ม)")
    if disc > discountable:
        print("- ❌ ส่วนลดเกินมูลค่าบรรทัดที่ลดได้ (ห้ามลด MA/cloud)")
    print(f"- ต้นทุน {baht(cost)} · กำไรขั้นต้น {baht(net - cost)} · **margin {margin:.1f}%**")
    verdict = "ผ่าน — หัวหน้าทีมขายอนุมัติได้" if margin >= 25 else (
        "ต้องให้ MD อนุมัติ (deal-approval) พร้อมเหตุผลเชิงกลยุทธ์" if margin >= 15 else "REJECT — ห้ามส่งลูกค้า")
    print(f"- เกณฑ์ margin: {verdict}")
    who = "เซลส์เจ้าของดีล" if disc_pct <= 5 else "หัวหน้าทีมขาย" if disc_pct <= 10 else "MD เท่านั้น"
    print(f"- ผู้อนุมัติส่วนลด: {who}")
    if "budget" in cfg:
        gap = cfg["budget"] - net
        print(f"- เทียบงบ {baht(cfg['budget'])}: {'อยู่ในงบ เหลือ ' + baht(gap) if gap >= 0 else '❌ เกินงบ ' + baht(-gap)}")


if __name__ == "__main__":
    main(sys.argv[1])

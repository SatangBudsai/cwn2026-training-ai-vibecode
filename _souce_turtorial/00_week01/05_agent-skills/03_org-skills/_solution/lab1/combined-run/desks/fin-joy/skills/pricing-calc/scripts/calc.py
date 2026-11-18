#!/usr/bin/env python3
"""pricing-calc: คิดราคา + กำไรตาม price-list และ margin rules v2026.1

ใช้:
  python calc.py lines.csv [--prices PRICE_CSV] [--fixed-price]
                 [--discount BAHT | --target BAHT] [--out-internal F] [--out-customer F]

lines.csv คอลัมน์: code,qty,note
  - code ต้องอยู่ใน price-list (ของนอกตาราง script ไม่รับ -> คิดแยกตาม references/margin-rules.md ข้อ 1)
  - qty ของ man-day = จำนวน "ก่อน buffer" ; --fixed-price จะบวก 10% แล้วปัดขึ้นเป็นวันเต็ม
ส่วนลด: ลดได้เฉพาะบรรทัด man-day/license (ห้ามลด MA-*, CL-*) และแสดงเป็นบรรทัด "ส่วนลดพิเศษ"
"""
import argparse, csv, math, os, sys
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PRICES = os.path.join(HERE, "..", "references", "price-list.csv")
NO_DISCOUNT_PREFIX = ("MA-", "CL-")


def load_prices(path):
    with open(path, encoding="utf-8-sig") as f:
        return {r["code"]: r for r in csv.DictReader(f)}


def fmt(n):
    n = Decimal(n).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return f"{n:,.2f}".replace(".00", "") if n == n.to_integral() else f"{n:,.2f}"


def verdict(m):
    if m >= 25:
        return "ผ่าน (>= 25%) -> หัวหน้าทีมขาย sales-nida อนุมัติ"
    if m >= 15:
        return "15-<25% -> ต้องให้ MD (md-somchai) อนุมัติ พร้อมเหตุผลเชิงกลยุทธ์"
    return "< 15% -> REJECT ห้ามส่งลูกค้า ห้ามขอยกเว้น"


def disc_approver(pct):
    if pct == 0:
        return "-"
    if pct <= 5:
        return "เซลส์เจ้าของดีล"
    if pct <= 10:
        return "หัวหน้าทีมขาย (sales-nida)"
    return "MD เท่านั้น และ margin หลังลดต้อง >= 15%"


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows console (cp874) พิมพ์ไทย/สัญลักษณ์ได้
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("lines")
    ap.add_argument("--prices", default=DEFAULT_PRICES)
    ap.add_argument("--fixed-price", action="store_true", help="บวก risk buffer 10%% ใน man-day")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--discount", type=int, default=0, help="ส่วนลดเป็นบาท")
    g.add_argument("--target", type=int, help="ราคาเป้า (ก่อน VAT) เช่น งบใน TOR -> คำนวณส่วนลดให้")
    ap.add_argument("--out-internal")
    ap.add_argument("--out-customer")
    a = ap.parse_args()

    prices = load_prices(a.prices)
    rows, errors = [], []
    with open(a.lines, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            code = r["code"].strip()
            if code not in prices:
                errors.append(code)
                continue
            p = prices[code]
            base = Decimal(r["qty"])
            qty = base
            if a.fixed_price and p["unit"] == "man-day":
                qty = Decimal(math.ceil(base * Decimal("1.1")))
            up, uc = int(p["unit_price_thb"]), int(p["cost_thb"])
            rows.append(dict(code=code, item=p["item"], unit=p["unit"], base=base, qty=qty,
                             up=up, uc=uc, price=qty * up, cost=qty * uc, note=r.get("note", "")))
    if errors:
        sys.exit(f"ไม่พบ code ใน price-list: {errors} -> ห้ามเดาราคา ให้ถามหรือคิดตามข้อ 1 ของ margin-rules")

    list_total = sum(r["price"] for r in rows)
    cost = sum(r["cost"] for r in rows)
    discountable = sum(r["price"] for r in rows if not r["code"].startswith(NO_DISCOUNT_PREFIX))
    disc = Decimal(a.discount)
    if a.target is not None:
        disc = max(Decimal(0), list_total - a.target)
    if disc > discountable:
        sys.exit("ส่วนลดเกินมูลค่าบรรทัดที่ลดได้ (ห้ามลด MA/cloud)")
    net = list_total - disc
    gp = net - cost
    margin = gp / net * 100 if net else Decimal(0)
    dpct = disc / list_total * 100 if list_total else Decimal(0)
    vat = (net * Decimal("0.07")).quantize(Decimal("0.01"), ROUND_HALF_UP)

    # ---------- internal ----------
    L = ["| รหัส | รายการ | จำนวนฐาน | จำนวนคิดเงิน | หน่วย | ราคา/หน่วย | ราคาขาย | ต้นทุน/หน่วย | ต้นทุน | หมายเหตุ |",
         "|---|---|---:|---:|---|---:|---:|---:|---:|---|"]
    for r in rows:
        L.append(f"| {r['code']} | {r['item']} | {fmt(r['base'])} | {fmt(r['qty'])} | {r['unit']} | {fmt(r['up'])} | "
                 f"{fmt(r['price'])} | {fmt(r['uc'])} | {fmt(r['cost'])} | {r['note']} |")
    L.append(f"| | **รวมตาม price-list** | | | | | **{fmt(list_total)}** | | **{fmt(cost)}** | |")
    if disc:
        L.append(f"| | ส่วนลดพิเศษ ({fmt(dpct.quantize(Decimal('0.01')))}% ของราคา price-list) | | | | | −{fmt(disc)} | | | ลดจากค่าแรง/license เท่านั้น |")
    L += ["", f"- ราคาขายสุทธิ (ก่อน VAT): **{fmt(net)}** บาท",
          f"- ต้นทุนรวม: **{fmt(cost)}** บาท",
          f"- กำไรขั้นต้น: **{fmt(gp)}** บาท",
          f"- Gross margin (หลังส่วนลด): **{margin.quantize(Decimal('0.01'))}%** -> {verdict(margin)}",
          f"- ส่วนลด {fmt(dpct.quantize(Decimal('0.01')))}% -> ผู้อนุมัติส่วนลด: {disc_approver(dpct)}",
          f"- VAT 7%: {fmt(vat)} · รวมทั้งสิ้น: {fmt(net + vat)} บาท",
          f"- risk buffer 10% man-day: {'บวกแล้ว (ปัดขึ้นเป็นวันเต็ม)' if a.fixed_price else 'ไม่ได้บวก'}"]
    internal = "\n".join(L)

    # ---------- customer (no cost / margin) ----------
    C = ["| รหัส | รายการ | จำนวน | ราคาต่อหน่วย | รวม (บาท) |", "|---|---|---|---:|---:|"]
    for r in rows:
        C.append(f"| {r['code']} | {r['item']} | {fmt(r['qty'])} {r['unit']} | {fmt(r['up'])} | {fmt(r['price'])} |")
    if disc:
        C.append(f"| | ส่วนลดพิเศษ | | | −{fmt(disc)} |")
    C += [f"| | **รวมก่อน VAT** | | | **{fmt(net)}** |",
          f"| | VAT 7% | | | {fmt(vat)} |",
          f"| | **รวมทั้งสิ้น** | | | **{fmt(net + vat)}** |"]
    customer = "\n".join(C)

    for path, text in ((a.out_internal, internal), (a.out_customer, customer)):
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text + "\n")
    print(internal)
    print("\n--- customer table ---\n")
    print(customer)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""pricing-calc: คิดราคา + กำไรของโปรเจกต์ตาม margin-rules ของโนวาเทค

ใช้:  python price_calc.py <deal.json> [--price-list path.csv] [--out-dir work/]
ได้:  <deal>-pricing-internal.md (มีต้นทุน/margin — ใช้ภายใน)
      <deal>-quotation-draft.md  (ไม่มีต้นทุน/margin — ส่งต่อให้ Sales ใส่ใบเสนอราคา)

deal.json:
{
  "deal": "deal-001", "customer": "...", "project": "...", "prepared_by": "fin-joy",
  "date": "2026-11-03", "fixed_price": true, "budget_thb": 4800000,
  "lines": [{"code": "MD-SA", "qty": 20, "note": "..."}],          # qty man-day = ก่อน buffer
  "external": [{"item": "...", "unit": "...", "qty": 1, "cost_thb": 100000, "markup": 0.2, "note": "..."}],
  "discount_thb": 0, "discount_reason": ""
}
"""
import csv, json, math, sys, argparse
from pathlib import Path

HERE = Path(__file__).resolve().parent
def _find_price_list():
    """price-list อยู่ที่ skill pricing-rules ของ plugin core (แหล่งเดียว)"""
    import os
    rel = Path("plugins/core/skills/pricing-rules/references/price-list.csv")
    if os.environ.get("NOVATECH_PRICE_LIST"):
        return Path(os.environ["NOVATECH_PRICE_LIST"])
    for up in HERE.parents:                      # รันจาก checkout ของคลัง org-skills
        if (up / rel).is_file():
            return up / rel
    home = Path.home() / ".claude" / "plugins"
    cands = [home / "marketplaces" / "novatech-skills" / rel]
    cands += sorted((home / "cache" / "novatech-skills" / "core").glob("*/skills/pricing-rules/references/price-list.csv"),
                    key=lambda p: p.stat().st_mtime, reverse=True)
    for c in cands:
        if c.is_file():
            return c
    return None


DEFAULT_PL = _find_price_list()
NO_DISCOUNT_PREFIX = ("MA-", "CL-")      # ห้ามลด MA และ cloud hosting
BUFFER = 0.10                             # risk buffer งาน fixed-price
MIN_MARKUP_EXT = 0.20                     # ของนอกตาราง บวก >= 20%


def baht(x):
    return f"{x:,.2f}" if round(x, 2) != round(x) else f"{x:,.0f}"


def load_price_list(path):
    with open(path, encoding="utf-8-sig") as f:
        return {r["code"]: {**r, "unit_price_thb": float(r["unit_price_thb"]),
                            "cost_thb": float(r["cost_thb"])} for r in csv.DictReader(f)}


def tier(margin):
    if margin >= 25: return "✅ ผ่าน", "หัวหน้าทีมขาย (sales-nida)"
    if margin >= 15: return "🟡 ต้องให้ MD อนุมัติ + เหตุผลเชิงกลยุทธ์", "MD (md-somchai)"
    return "❌ ปฏิเสธ — ห้ามส่งลูกค้า ห้ามขอยกเว้น", "—"


def disc_tier(pct):
    if pct == 0: return "ไม่มีส่วนลด"
    if pct <= 5: return "เซลส์เจ้าของดีลให้ได้"
    if pct <= 10: return "หัวหน้าทีมขาย (sales-nida)"
    return "MD เท่านั้น และ margin หลังลดต้อง ≥ 15%"


def approver(r):
    if r["margin"] < 15: return "— (ปฏิเสธ)"
    if r["margin"] < 25 or r["disc_pct"] > 10: return "MD (md-somchai)"
    return "หัวหน้าทีมขาย (sales-nida)"   # margin >= 25% และส่วนลด <= 10%


def calc(deal, pl):
    errors, warns, rows = [], [], []
    fixed = deal.get("fixed_price", True)
    for ln in deal.get("lines", []):
        p = pl.get(ln["code"])
        if not p:
            errors.append(f"รหัส `{ln['code']}` ไม่มีใน price-list — ห้ามตั้งราคาเอง (ถ้าเป็นของนอกตาราง ใส่ใน external)")
            continue
        base = ln["qty"]
        qty = math.ceil(base * (1 + BUFFER)) if (fixed and p["unit"] == "man-day") else base
        rows.append(dict(code=ln["code"], item=p["item"], unit=p["unit"], base=base, qty=qty,
                         price=p["unit_price_thb"], cost=p["cost_thb"],
                         sell=qty * p["unit_price_thb"], tcost=qty * p["cost_thb"],
                         note=ln.get("note", ""), ext=False))
    for ex in deal.get("external", []):
        mk = ex.get("markup", MIN_MARKUP_EXT)
        if mk < MIN_MARKUP_EXT:
            errors.append(f"ของนอกตาราง `{ex['item']}` บวกแค่ {mk:.0%} (ขั้นต่ำ 20%)")
        unit_cost = ex["cost_thb"]
        unit_price = round(unit_cost * (1 + mk))
        rows.append(dict(code="EXT", item=ex["item"], unit=ex.get("unit", "งาน"), base=ex["qty"],
                         qty=ex["qty"], price=unit_price, cost=unit_cost,
                         sell=ex["qty"] * unit_price, tcost=ex["qty"] * unit_cost,
                         note=(ex.get("note", "") + f" · ต้นทุนผู้ขาย + {mk:.0%}").strip(" ·"), ext=True))

    list_total = sum(r["sell"] for r in rows)
    discountable = sum(r["sell"] for r in rows if not r["code"].startswith(NO_DISCOUNT_PREFIX))
    disc = float(deal.get("discount_thb", 0))
    disc_pct = disc / discountable * 100 if discountable else 0
    if disc > discountable:
        errors.append("ส่วนลดมากกว่ายอดที่ลดได้ (MA/cloud ห้ามลด)")
    sell = list_total - disc
    cost = sum(r["tcost"] for r in rows)
    gp = sell - cost
    margin = gp / sell * 100 if sell else 0
    vat = round(sell * 0.07, 2)
    if disc_pct > 10 and margin < 15:
        errors.append("ส่วนลด > 10% แต่ margin หลังลด < 15% — ให้ไม่ได้")
    budget = deal.get("budget_thb")
    if budget and sell > budget:
        warns.append(f"ราคาก่อน VAT {baht(sell)} เกินงบลูกค้า {baht(budget)} อยู่ {baht(sell - budget)} บาท")
    md_total = sum(r["qty"] for r in rows if r["unit"] == "man-day")
    return dict(rows=rows, list_total=list_total, discountable=discountable, disc=disc,
                disc_pct=disc_pct, sell=sell, cost=cost, gp=gp, margin=margin, vat=vat,
                grand=round(sell + vat, 2), errors=errors, warns=warns, md_total=md_total,
                md_base=sum(r["base"] for r in rows if r["unit"] == "man-day"), fixed=fixed)


def internal_md(d, r):
    t, who = tier(r["margin"])
    L = [f"# คิดราคา (ภายใน) — {d.get('project', d['deal'])}",
         "", f"> ⚠️ **เอกสารภายใน** มีต้นทุนและ margin — ห้ามส่งลูกค้า",
         f"> ลูกค้า: {d.get('customer', '-')} · คิดโดย {d.get('prepared_by', '-')} · {d.get('date', '-')}"
         f" · {'fixed-price (บวก buffer 10% ใน man-day แล้ว)' if r['fixed'] else 'T&M (ไม่บวก buffer)'}",
         "", "## ผลสรุป", "",
         "| | |", "|---|---|",
         f"| ราคาขายก่อน VAT (หลังส่วนลด) | **{baht(r['sell'])}** บาท |",
         f"| ต้นทุนรวม | {baht(r['cost'])} บาท |",
         f"| กำไรขั้นต้น | {baht(r['gp'])} บาท |",
         f"| **Gross margin** | **{r['margin']:.1f}%** → {t} |",
         f"| **ผู้อนุมัติ (เข้มสุดของ margin + ส่วนลด)** | **{approver(r)}** |",
         f"| ส่วนลด | {baht(r['disc'])} บาท = {r['disc_pct']:.1f}% ของยอดที่ลดได้ → {disc_tier(r['disc_pct'])} |",
         f"| VAT 7% / รวมทั้งสิ้น | {baht(r['vat'])} / {baht(r['grand'])} บาท |"]
    if d.get("budget_thb"):
        L.append(f"| งบลูกค้า (ก่อน VAT) | {baht(d['budget_thb'])} บาท · ใช้ {r['sell'] / d['budget_thb'] * 100:.1f}% |")
    L += ["", f"man-day รวม {r['md_total']:g} วัน (ประเมินก่อน buffer {r['md_base']:g} วัน)", ""]
    if r["errors"]:
        L += ["## ❌ ผิดกฎ — แก้ก่อนส่งต่อ", ""] + [f"- {e}" for e in r["errors"]] + [""]
    if r["warns"]:
        L += ["## ⚠️ ข้อสังเกต", ""] + [f"- {w}" for w in r["warns"]] + [""]
    L += ["## รายการ", "",
          "| รหัส | รายการ | ประเมิน | จำนวน (รวม buffer) | หน่วย | ราคา/หน่วย | ราคาขาย | ต้นทุน/หน่วย | ต้นทุน | margin บรรทัด | หมายเหตุ |",
          "|---|---|--:|--:|---|--:|--:|--:|--:|--:|---|"]
    for x in r["rows"]:
        m = (x["sell"] - x["tcost"]) / x["sell"] * 100 if x["sell"] else 0
        L.append(f"| {x['code']} | {x['item']} | {x['base']:g} | {x['qty']:g} | {x['unit']} | {baht(x['price'])} | "
                 f"{baht(x['sell'])} | {baht(x['cost'])} | {baht(x['tcost'])} | {m:.1f}% | {x['note']} |")
    if r["disc"]:
        L.append(f"| — | ส่วนลดพิเศษ | | | | | −{baht(r['disc'])} | | | | {d.get('discount_reason', '')} |")
    L.append(f"| | **รวม** | | | | | **{baht(r['sell'])}** | | **{baht(r['cost'])}** | **{r['margin']:.1f}%** | |")
    for k in ("assumptions", "decisions", "cut_options"):
        if d.get(k):
            title = {"assumptions": "สมมติฐาน", "decisions": "จุดที่ตัดสินใจเอง (ให้ Sales/MD ยืนยัน)",
                     "cut_options": "ถ้าต้องลดราคา — ตัวเลือกที่ไม่ผิดกฎ"}[k]
            L += ["", f"## {title}", ""] + [f"- {a}" for a in d[k]]
    return "\n".join(L) + "\n"


def quote_md(d, r):
    L = [f"# ร่างตารางราคา — {d.get('project', d['deal'])}", "",
         f"เสนอต่อ: {d.get('customer', '-')} · วันที่ {d.get('date', '-')} · ราคาเป็นเงินบาท ไม่รวม VAT ในแต่ละบรรทัด",
         "", "| รหัส | รายการ | จำนวน | หน่วย | ราคาต่อหน่วย | รวม (บาท) |", "|---|---|--:|---|--:|--:|"]
    for x in r["rows"]:
        L.append(f"| {x['code'] if not x['ext'] else '—'} | {x['item']} | {x['qty']:g} | {x['unit']} | {baht(x['price'])} | {baht(x['sell'])} |")
    if r["disc"]:
        L.append(f"| — | ส่วนลดพิเศษ | | | | −{baht(r['disc'])} |")
    L += [f"| | **รวมก่อน VAT** | | | | **{baht(r['sell'])}** |",
          f"| | VAT 7% | | | | {baht(r['vat'])} |",
          f"| | **รวมทั้งสิ้น** | | | | **{baht(r['grand'])}** |", "",
          "_ร่างจากบัญชี (pricing-calc) ให้ Sales ใส่ใน proposal — ใช้ได้หลังผ่านผู้อนุมัติตามเกณฑ์ margin แล้วเท่านั้น_"]
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("deal_json")
    ap.add_argument("--price-list", default=str(DEFAULT_PL) if DEFAULT_PL else None,
                    required=DEFAULT_PL is None, help="หาไม่เจออัตโนมัติ → ส่ง path ของ pricing-rules/references/price-list.csv")
    ap.add_argument("--out-dir", default="work")
    a = ap.parse_args()
    d = json.loads(Path(a.deal_json).read_text(encoding="utf-8"))
    r = calc(d, load_price_list(a.price_list))
    out = Path(a.out_dir); out.mkdir(parents=True, exist_ok=True)
    (out / f"{d['deal']}-pricing-internal.md").write_text(internal_md(d, r), encoding="utf-8")
    if not r["errors"]:
        (out / f"{d['deal']}-quotation-draft.md").write_text(quote_md(d, r), encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"sell={r['sell']:.2f} cost={r['cost']:.2f} margin={r['margin']:.1f}% "
          f"vat={r['vat']:.2f} total={r['grand']:.2f} md={r['md_total']:g} errors={len(r['errors'])}")
    for m in r["errors"] + r["warns"]:
        print(" -", m)
    sys.exit(1 if r["errors"] else 0)


if __name__ == "__main__":
    main()

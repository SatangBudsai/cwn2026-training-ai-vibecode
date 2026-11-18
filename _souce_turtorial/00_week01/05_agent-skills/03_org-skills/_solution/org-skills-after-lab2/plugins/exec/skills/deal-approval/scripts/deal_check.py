"""ตรวจตัวเลขดีลซ้ำ (margin, ส่วนลด, กำลังคน, buffer) จาก price-list ของ skill pricing-rules (core)

ใช้:  python deal_check.py deal.json [--price-list path.csv]
deal.json ตัวอย่าง:
{
  "lines": [{"code": "MD-SA", "qty": 15}, {"code": "CL-M", "qty": 12}],
  "external": [{"item": "GPS API", "price": 120000, "cost": 100000}],
  "discount": 915000,
  "claimed": {"price": 3307000, "cost": 2711900},
  "team_size": 6, "working_days": 60,
  "buffer_included": false
}
"""
import csv, json, sys
from pathlib import Path

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


PRICE = {r["code"]: r for r in csv.DictReader(open(_price_list_path(), encoding="utf-8"))}
NO_DISCOUNT = ("CL-", "MA-")  # ห้ามลด cloud และ MA


def totals(lines, external, discount, mandays_extra=0.0):
    price = cost = list_price = discountable = 0.0
    mandays = 0.0
    for ln in lines:
        p = PRICE[ln["code"]]
        q = ln["qty"]
        if ln["code"].startswith("MD-"):
            mandays += q
            q = q * (1 + mandays_extra)
        price += q * float(p["unit_price_thb"])
        cost += q * float(p["cost_thb"])
        if not ln["code"].startswith(NO_DISCOUNT):
            discountable += q * float(p["unit_price_thb"])
    for e in external:
        price += e["price"]; cost += e["cost"]
    list_price = price
    price -= discount
    return dict(list_price=list_price, discountable=discountable, price=price, cost=cost,
                margin=(price - cost) / price * 100, mandays=mandays)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    lines, ext, disc = d["lines"], d.get("external", []), d.get("discount", 0)
    t = totals(lines, ext, disc)
    print(f"ราคาตาม price-list  {t['list_price']:>14,.0f}")
    print(f"ส่วนลด              {disc:>14,.0f}  = {disc/t['list_price']*100:.1f}% ของราคารวม, "
          f"{disc/t['discountable']*100:.1f}% ของส่วนที่ลดได้")
    print(f"ราคาขาย (ก่อน VAT)   {t['price']:>14,.0f}")
    print(f"ต้นทุน              {t['cost']:>14,.0f}")
    print(f"Gross margin        {t['margin']:>13.1f}%")
    print(f"VAT 7%              {round(t['price']*0.07, 2):>14,.2f}")
    c = d.get("claimed")
    if c:
        ok = abs(c["price"] - t["price"]) < 1 and abs(c["cost"] - t["cost"]) < 1
        print("ตรงกับสรุปดีล" if ok else f"⚠️ ไม่ตรงกับสรุปดีล: ราคา {c['price']:,} ต้นทุน {c['cost']:,}")
    if d.get("team_size") and d.get("working_days"):
        u = t["mandays"] / (d["team_size"] * d["working_days"]) * 100
        print(f"man-day {t['mandays']:.0f} / ({d['team_size']}×{d['working_days']}) = ใช้กำลัง {u:.1f}% (เกณฑ์ ≤ 85%)")
    if not d.get("buffer_included", True):
        b = totals(lines, ext, disc, mandays_extra=0.10)
        b_cost_only = t["cost"] + (b["cost"] - t["cost"])
        m = (t["price"] - b_cost_only) / t["price"] * 100
        print(f"ถ้าเติม buffer 10% ทุกบทบาท แต่ราคาเท่าเดิม → ต้นทุน {b_cost_only:,.0f} margin {m:.1f}%")
        if d.get("team_size") and d.get("working_days"):
            u = t["mandays"] * 1.1 / (d["team_size"] * d["working_days"]) * 100
            print(f"   ใช้กำลังหลังเติม buffer = {u:.1f}%")


if __name__ == "__main__":
    main()

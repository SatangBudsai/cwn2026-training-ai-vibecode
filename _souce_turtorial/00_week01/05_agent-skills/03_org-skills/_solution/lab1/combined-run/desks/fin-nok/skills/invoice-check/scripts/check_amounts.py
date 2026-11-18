"""คำนวณยอดงวด / VAT 7% / รวมทั้งสิ้น / จำนวนเงินตัวอักษร เพื่อเทียบกับใบแจ้งหนี้

ใช้:  python check_amounts.py <มูลค่าสัญญาก่อน VAT> <สัดส่วนงวด %> [ยอดรวมที่ใบแจ้งหนี้เขียน]
เช่น  python check_amounts.py 1850000 40 791080
"""
import sys
from decimal import Decimal, ROUND_HALF_UP

DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
UNITS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"]


def _below_million(n: int, after_million: bool = False) -> str:
    s, digits = "", str(n)
    L = len(digits)
    for i, ch in enumerate(digits):
        d, pos = int(ch), L - i - 1
        if d == 0:
            continue
        if pos == 1 and d == 1:
            s += "สิบ"
        elif pos == 1 and d == 2:
            s += "ยี่สิบ"
        elif pos == 0 and d == 1 and (L > 1 or after_million):
            s += "เอ็ด"
        else:
            s += DIGITS[d] + UNITS[pos]
    return s


def _int_words(n: int) -> str:
    if n == 0:
        return "ศูนย์"
    if n < 1_000_000:
        return _below_million(n)
    high, low = divmod(n, 1_000_000)
    return _int_words(high) + "ล้าน" + (_below_million(low, True) if low else "")


def baht_text(amount: Decimal) -> str:
    amount = amount.quantize(Decimal("0.01"), ROUND_HALF_UP)
    baht = int(amount)
    satang = int((amount - baht) * 100)
    text = _int_words(baht) + "บาท" if baht else ""
    return text + (_int_words(satang) + "สตางค์" if satang else "ถ้วน")


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    two = Decimal("0.01")
    contract = Decimal(argv[1])
    pct = Decimal(argv[2])
    base = (contract * pct / 100).quantize(two, ROUND_HALF_UP)
    vat = (base * Decimal("0.07")).quantize(two, ROUND_HALF_UP)
    total = base + vat
    print(f"ยอดงวดก่อน VAT : {base:,.2f}")
    print(f"VAT 7%         : {vat:,.2f}")
    print(f"รวมทั้งสิ้น     : {total:,.2f}")
    print(f"ตัวอักษร       : ({baht_text(total)})")
    if len(argv) > 3:
        stated = Decimal(argv[3].replace(",", ""))
        ok = stated == total
        print(f"เทียบยอดในใบ   : {stated:,.2f} -> {'ตรง' if ok else 'ไม่ตรง ต่าง ' + format(stated - total, ',.2f')}")
        return 0 if ok else 1
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv))

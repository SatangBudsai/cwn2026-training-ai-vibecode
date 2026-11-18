#!/usr/bin/env python3
"""ตรวจตัวเลข + ข้อมูลต้องห้ามในร่างใบแจ้งหนี้ (Markdown) ของโนวาเทค

ใช้:  python check_invoice.py <invoice.md> [--contract 1850000] [--share 40]
      python check_invoice.py --calc 1850000 40      (คำนวณงวดอย่างเดียว)

ทำแค่ส่วนที่เครื่องทำได้แน่นอน: คำนวณยอด/VAT/รวม, แปลงเป็นตัวอักษรไทย,
หาเบอร์มือถือ/เลขบัตรประชาชน, เช็กรูปแบบเลขที่ ส่วนที่ต้องใช้วิจารณญาณ
(ชื่อลูกค้าปลายทาง, รายละเอียดเคส, เอกสารแนบ) ให้คนหรือ AI อ่านเองตาม checklist
"""
import re
import sys
from decimal import Decimal, ROUND_HALF_UP

DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
UNITS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"]


def _say_int(n: int) -> str:
    if n == 0:
        return ""
    if n >= 1_000_000:
        return _say_int(n // 1_000_000) + "ล้าน" + _say_int(n % 1_000_000)
    s, digits = "", str(n)
    for i, ch in enumerate(digits):
        d, pos = int(ch), len(digits) - i - 1
        if d == 0:
            continue
        if pos == 1 and d == 1:
            s += "สิบ"
        elif pos == 1 and d == 2:
            s += "ยี่สิบ"
        elif pos == 0 and d == 1 and len(digits) > 1:
            s += "เอ็ด"
        else:
            s += DIGITS[d] + UNITS[pos]
    return s


def baht_text(amount: Decimal) -> str:
    amount = amount.quantize(Decimal("0.01"), ROUND_HALF_UP)
    baht, satang = int(amount), int((amount * 100) % 100)
    text = (_say_int(baht) or "ศูนย์") + "บาท"
    return text + (_say_int(satang) + "สตางค์" if satang else "ถ้วน")


def q2(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), ROUND_HALF_UP)


def calc(contract: Decimal, share_pct: Decimal):
    base = q2(contract * share_pct / 100)
    vat = q2(base * Decimal("0.07"))
    return base, vat, base + vat


def money(s: str) -> Decimal:
    return Decimal(s.replace(",", ""))


def find_amount(text: str, label: str):
    m = re.search(re.escape(label) + r"[^\d\n]*([\d,]+\.\d{2})", text)
    return money(m.group(1)) if m else None


MOBILE = re.compile(r"(?<!\d)0[689]\d[- ]?\d{3}[- ]?\d{4}(?!\d)")
# เลขบัตรประชาชนขึ้นต้น 1-8 · เลขผู้เสียภาษีนิติบุคคลขึ้นต้น 0 (แสดงได้)
CITIZEN_ID = re.compile(r"(?<!\d)[1-8][- ]?\d{4}[- ]?\d{5}[- ]?\d{2}[- ]?\d(?!\d)")
INV_NO = re.compile(r"INV-(\d{4})-(\d{4})")


def check(path: str, contract=None, share=None) -> int:
    text = open(path, encoding="utf-8").read()
    problems = 0

    def report(ok: bool, msg: str):
        nonlocal problems
        problems += 0 if ok else 1
        print(("  OK   " if ok else "  FAIL ") + msg)

    print(f"== ตรวจ {path}")
    if contract is None:
        m = re.search(r"มูลค่าสัญญา\s*([\d,]+(?:\.\d{2})?)", text)
        contract = money(m.group(1)) if m else None
    if share is None:
        m = re.search(r"งวดที่\s*\d+[^\n(]*\((\d+(?:\.\d+)?)%\)", text)
        share = Decimal(m.group(1)) if m else None
    if contract is None or share is None:
        print("  ?    หา มูลค่าสัญญา / สัดส่วนงวด ไม่เจอ — ใส่ --contract และ --share เอง")
        return 2

    base, vat, total = calc(contract, share)
    print(f"  ที่ควรเป็น: {contract:,} × {share}% = {base:,.2f} · VAT {vat:,.2f} · รวม {total:,.2f}")
    for label, expect in (("รวมก่อน VAT", base), ("VAT 7%", vat), ("รวมทั้งสิ้น", total)):
        got = find_amount(text, label)
        report(got == expect, f"{label}: ในใบ {got if got is None else f'{got:,.2f}'} / ที่ถูก {expect:,.2f}")

    m = re.search(r"จำนวนเงินตัวอักษร[^\n(]*\(([^)]+)\)", text) or re.search(r"จำนวนเงินตัวอักษร\s*\|\s*([^|\n]+)", text)
    words = m.group(1).strip() if m else None
    report(words == baht_text(total), f"ตัวอักษร: ในใบ '{words}' / ที่ถูก '{baht_text(total)}'")

    nums = INV_NO.findall(text)
    report(bool(nums), f"รูปแบบเลขที่ INV-ปปปป-นนนน: พบ {['-'.join(n) for n in nums][:3]} (ลำดับต่อจากใบล่าสุดต้องเช็กในระบบบัญชีเอง)")

    for name, rx in (("เบอร์มือถือ", MOBILE), ("เลขบัตรประชาชน", CITIZEN_ID)):
        hits = rx.findall(text)
        report(not hits, f"{name}: {hits if hits else 'ไม่พบ'}")

    print(f"== สรุป: {'ผ่านส่วนตัวเลข/รูปแบบ' if problems == 0 else f'พบ {problems} จุดต้องแก้'} "
          "(ยังต้องอ่านเองเรื่องชื่อลูกค้าปลายทาง/รายละเอียดเคส/เอกสารแนบ)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    a = sys.argv[1:]
    if a and a[0] == "--calc":
        b, v, t = calc(Decimal(a[1]), Decimal(a[2]))
        print(f"ยอดงวด {b:,.2f} · VAT 7% {v:,.2f} · รวมทั้งสิ้น {t:,.2f} · ({baht_text(t)})")
        sys.exit(0)
    if not a:
        print(__doc__)
        sys.exit(2)
    opts = dict(zip(a[1::2], a[2::2]))
    sys.exit(check(a[0],
                   Decimal(opts["--contract"]) if "--contract" in opts else None,
                   Decimal(opts["--share"]) if "--share" in opts else None))

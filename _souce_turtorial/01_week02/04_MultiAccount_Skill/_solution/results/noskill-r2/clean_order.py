"""clean_order(order_id, text) -> 'ORD-######' or None."""
import re
import unicodedata

_DASHES = "\u2010\u2011\u2012\u2013\u2014\u2015\u2212\ufe58\ufe63\uff0d\u30fc"
_DASH_RE = re.compile("[" + _DASHES + "]")

# Prefixes that mark an order number.
_KW = (
    r"(?:ออเดอร์|ออร์เดอร์|ออเด้อ|คำสั่งซื้อ|เลขที่สั่งซื้อ|order|ord|"
    r"หมายเลข(?:คำสั่งซื้อ|ออเดอร์)?|เลขที่)"
)
_SEP = r"[\s:\-_.#=/]*"
_NUM = r"(?<!\d)(\d{6})(?!\d|[.,]\d)"

# Text: keyword (not glued to a preceding latin letter) + optional "no./number/เลข" + digits,
# or '#' directly before digits.
_TEXT_RE = re.compile(
    r"(?:(?<![a-z])" + _KW + _SEP + r"(?:(?:no|number|num|id|เลข(?:ที่)?)" + _SEP + r")?"
    r"|#\s*)" + _NUM,
    re.IGNORECASE,
)
# Fallback: a bare 6-digit number in free text (used only when no prefixed match exists).
# Not glued to digits/latin letters, not part of 1,234,567 / 123456.78 or a spaced/dashed
# digit run (phone numbers, dates), not right after a latin code prefix ("BN 123456",
# "TK-123456", "error: 123456"), and not a price / phone / tracking / error code.
_BARE_RE = re.compile(
    r"(?<![0-9A-Za-z])(?<!\d[.,])(?<!\d[\s\-/])"
    r"(\d{6})"
    r"(?![0-9A-Za-z])(?![.,]\d)(?![\s\-/]\d)"
)
_BARE_BAD_BEFORE = re.compile(
    r"(?:[A-Za-z]+[\s\-_:#.]*"
    r"|(?:ราคา|ค่า\w*|รวม|ยอด\w*|โทร\w*|เบอร์\w*|มือถือ|พัสดุ|เลขพัสดุ|เลขแทร[คก]\w*|"
    r"รหัส\w*|ผิดพลาด|ข้อผิดพลาด|฿|\$)[\s:#=.\-]*)$",
    re.IGNORECASE,
)
_BARE_BAD_AFTER = re.compile(r"^\s*(?:บาท|฿|baht|thb|bath|\.-)", re.IGNORECASE)

# Column: optional prefix then exactly 6 digits and nothing else.
_COL_RE = re.compile(r"^(?:" + _KW + r"|no|#)?" + _SEP + r"(?:no" + _SEP + r")?(\d{6})$", re.IGNORECASE)


def _is_blank(v):
    if v is None:
        return True
    try:
        if v != v:  # NaN
            return True
    except Exception:
        pass
    return False


def _normalize(s):
    s = str(s)
    s = unicodedata.normalize("NFKC", s)
    out = []
    for ch in s:
        cat = unicodedata.category(ch)
        if cat == "Cf" or ch in "\u00ad\u034f\u180e":  # zero-width, BOM, soft hyphen ...
            continue
        if cat == "Nd":  # Thai digits and any other decimal digits -> ASCII
            out.append(str(unicodedata.digit(ch)))
        elif ch.isspace() or cat == "Zs":
            out.append(" ")
        else:
            out.append(ch)
    s = _DASH_RE.sub("-", "".join(out))
    return re.sub(r" +", " ", s).strip()


def _from_column(v):
    s = _normalize(v)
    if not s:
        return None
    m = _COL_RE.match(s)
    if m:
        return m.group(1)
    # Digits split by spaces/dashes, e.g. "ORD 312 364" / "312-364"
    m = re.match(r"^(?:" + _KW + r"|#)?[\s\-_.:#]*([\d\s\-.]+)$", s, re.IGNORECASE)
    if m:
        digits = re.sub(r"\D", "", m.group(1))
        if len(digits) == 6:
            return digits
    # Something else in the column (e.g. a sentence): treat it like free text.
    return _from_text(s)


def _from_text(t):
    s = _normalize(t)
    if not s:
        return None
    m = _TEXT_RE.search(s)
    if m:
        return m.group(1)
    return _bare_from_text(s)


def _bare_from_text(s):
    for m in _BARE_RE.finditer(s):
        if _BARE_BAD_BEFORE.search(s[: m.start()]):
            continue
        if _BARE_BAD_AFTER.match(s[m.end():]):
            continue
        return m.group(1)
    return None


def clean_order(order_id, text):
    num = None
    if not _is_blank(order_id):
        num = _from_column(order_id)
    if num is None and not _is_blank(text):
        num = _from_text(text)
    return "ORD-" + num if num else None


if __name__ == "__main__":
    import sys
    import pandas as pd

    path = sys.argv[1] if len(sys.argv) > 1 else "data/tickets.csv"
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    res = [clean_order(o, t) for o, t in zip(df["order_id"], df["text"])]
    ok = sum(r is not None for r in res)
    print(f"rows={len(df)} value={ok} none={len(df) - ok}")
    for (i, o, t), r in zip(df[["id", "order_id", "text"]].itertuples(index=False), res):
        if r is None:
            print("NONE", i, repr(o), repr(t))

    tests = [
        ("#135790", "", "ORD-135790"), ("ord135790", "", "ORD-135790"),
        ("ORD 135790", "", "ORD-135790"), ("ORD-135790", "", "ORD-135790"),
        ("135790", "", "ORD-135790"), ("๑๓๕๗๙๐", "", "ORD-135790"),
        ("\ufeffORD\u00a0\u200b135790\u3000", "", "ORD-135790"),
        ("ＯＲＤ－１３５７９０", "", "ORD-135790"), ("ORD\u2013135\u00ad790", "", "ORD-135790"),
        (None, None, None), (float("nan"), "", None), ("", "", None),
        ("", "ของ CM 55555 ค้าง ออเดอร์ #246802", "ORD-246802"),
        ("", "TK-800431 ค้าง โทร 0812345678 ราคา 123,456 บาท E402", None),
        ("", "ขึ้น E-๔๐๒ ออเดอร์ ord๘๖๔๒๑๓", "ORD-864213"),
        ("", "order no. 123456", "ORD-123456"),
        ("", "ออเดอร์ 1234567", None), ("", "WORD123456", None),
        # bare 6-digit fallback: should match
        ("", "สั่งไป 135790 ยังไม่ได้ของ", "ORD-135790"),
        ("", "สั่งไป๑๓๕๗๙๐ยังไม่ได้ของ", "ORD-135790"),
        ("", "BN 111111 ค้าง ของที่สั่ง 135790 ยังไม่มา", "ORD-135790"),
        ("", "ราคา 500 บาท สั่ง 135790 กับ 654321", "ORD-135790"),
        ("", "ออเดอร์ #246802 กับ 135790", "ORD-246802"),  # prefixed wins
        # bare 6-digit fallback: should NOT match
        ("", "เลขพัสดุ BN 123456 ยังไม่ขยับ", None),
        ("", "TK-123456 ค้าง", None), ("", "error: 123456", None),
        ("", "ขึ้นรหัสข้อผิดพลาด 123456", None),
        ("", "ราคา 123456", None), ("", "จ่ายไป 123456 บาท", None),
        ("", "ยอด 1,234,567 กับ 123,456 และ 123456.50", None),
        ("", "โทร 123456", None), ("", "เบอร์ 081 234 5678 / 02-123456", None),
        ("", "AB123456 X123456Y 1234567", None),
    ]
    bad = [(a, b, e, clean_order(a, b)) for a, b, e in tests if clean_order(a, b) != e]
    print("unit tests:", "all passed" if not bad else bad)

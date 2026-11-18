import math
import re
import unicodedata

_THAI_DIGITS = {ord(c): str(i) for i, c in enumerate("๐๑๒๓๔๕๖๗๘๙")}
_DASHES = "-‐‑‒–—―−﹘﹣－⁃ー"
_EMPTY_WORDS = {"", "nan", "none", "null", "na", "n/a", "-", "--", "ไม่มี", "ไม่ระบุ"}

# separator allowed between a prefix (ORD / # / keyword) and the 6 digits
_SEP = r"[\s\-_:#.=/]*"
_NUM = r"(?<!\d)(\d{6})(?![\d,.]\d|\d)"

# ORD123456, ORD-123456, ORD 123456, ORDER#123456 ...
_RE_ORD = re.compile(r"(?<![a-z])ord(?:er)?" + _SEP + _NUM, re.I)
# #123456
_RE_HASH = re.compile(r"(?<![a-z0-9])#\s*" + _NUM, re.I)
# keyword context: ออเดอร์ / คำสั่งซื้อ / order no. ... (+ optional filler, optional ORD/#)
_KEYWORDS = (
    r"(?:ออเดอร์|ออร์เดอร์|ออเดอ|คำสั่งซื้อ|ใบสั่งซื้อ|รายการสั่งซื้อ|เลขสั่งซื้อ"
    r"|order(?:\s*(?:no|number|id))?\.?|po)"
)
_FILLER = r"(?:\s|ที่|เลข|หมายเลข|รหัส|คือ|no\.?|number|id|[:#=\-_.])*"
_RE_KEYWORD = re.compile(
    _KEYWORDS + _FILLER + r"(?:ord(?:er)?" + _SEP + r")?" + _NUM, re.I
)
# bare 6-digit number (fallback only)
_RE_BARE = re.compile(r"(?<![\d,.])(\d{6})(?![\d]|[,.]\d)")
# things that indicate a bare number is NOT an order id
_BAD_BEFORE = re.compile(
    r"(?:[a-z]{1,4}\s*[\-_]?\s*|฿\s*|\$\s*|(?:โทร|เบอร์|tel|phone|พัสดุ|tracking|เลขติดตาม"
    r"|ราคา|ยอด|รหัส|code|err(?:or)?|otp|บัญชี|acc(?:ount)?)\S{0,6}\s*[:#\-]?\s*)$",
    re.I,
)
_BAD_AFTER = re.compile(r"^\s*(?:บาท|บ\.|฿|thb|baht|ชิ้น|อัน|ตัว|คู่|กล่อง|ครั้ง|รอบ|นาที|วัน|กม|km|g\b|kg|%)", re.I)


def _normalize(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return ""
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return ""
        if value.is_integer():
            value = int(value)
    try:
        s = str(value)
    except Exception:
        return ""
    s = unicodedata.normalize("NFKC", s)
    s = s.translate(_THAI_DIGITS)
    out = []
    for ch in s:
        if ch in _DASHES:
            out.append("-")
            continue
        cat = unicodedata.category(ch)
        if cat == "Cf" or ch in "­͏ᅟᅠㅤﾠ":
            continue  # zero-width, BOM, soft hyphen, direction marks ...
        if ch.isspace() or cat == "Zs":
            out.append(" ")
            continue
        if cat == "Nd" and not ch.isascii():
            try:
                out.append(str(unicodedata.digit(ch)))
                continue
            except Exception:
                pass
        if cat == "Pd":
            out.append("-")
            continue
        if cat in ("Cc", "Co", "Cn"):
            out.append(" ")
            continue
        out.append(ch)
    return re.sub(r" +", " ", "".join(out)).strip()


def _fmt(digits):
    return "ORD-" + digits


def _from_text(s, allow_bare=True):
    for rx in (_RE_ORD, _RE_KEYWORD, _RE_HASH):
        m = rx.search(s)
        if m:
            return _fmt(m.group(1))
    if not allow_bare:
        return None
    found = []
    for m in _RE_BARE.finditer(s):
        before = s[max(0, m.start() - 20):m.start()]
        after = s[m.end():m.end() + 10]
        if _BAD_BEFORE.search(before) or _BAD_AFTER.search(after):
            continue
        if re.search(r"\d[\s\-]$", before) or re.match(r"^[\s\-]\d", after):
            continue  # part of a phone number / grouped number
        if re.search(r"[a-z]$", before, re.I) or re.match(r"^[a-z]", after, re.I):
            continue
        found.append(m.group(1))
    if len(set(found)) == 1:
        return _fmt(found[0])
    return None


def clean_order(order_id, text):
    try:
        oid = _normalize(order_id)
        if oid.lower() not in _EMPTY_WORDS:
            m = re.fullmatch(r"(?:ord(?:er)?|#)?" + _SEP + r"(\d{6})(?:\.0+)?", oid, re.I)
            if m:
                return _fmt(m.group(1))
            r = _from_text(oid, allow_bare=True)
            if r:
                return r
        return _from_text(_normalize(text), allow_bare=False)
    except Exception:
        return None

import re
import unicodedata

_THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")

# คำที่บอกว่าตัวเลขที่ตามมาคือเลขออเดอร์
_KEYWORD = r"(?:เลข(?:ที่)?\s*)?(?:ออเดอร์|ออร์เดอร์|คำสั่งซื้อ|order(?:\s*(?:no|number|id|\#))?)"
# ตัวคั่น/คำเสริมระหว่าง keyword กับเลข เช่น ":", "ที่", "เลข", "no."
_FILLER = r"(?:\s|[:：.,=\-]|ที่|เลข|no\.?|number|id)*"
# prefix ของเลขออเดอร์เอง เช่น ORD-, ORD , ord, #
_PREFIX = r"(?:ord\s*[-_.:]?\s*|\#\s*)?"
_NUM = r"(?<![0-9])([0-9]{6})(?![0-9])"

_RE_KEYWORD = re.compile(_KEYWORD + _FILLER + _PREFIX + _NUM, re.IGNORECASE)
_RE_ORD = re.compile(r"(?<![a-z])ord\s*[-_.:#]?\s*" + _NUM, re.IGNORECASE)
_RE_HASH = re.compile(r"(?<![a-z0-9])\#\s*" + _NUM, re.IGNORECASE)
_RE_ID_FULL = re.compile(r"^(?:ord)?[-_.:#]*([0-9]{6})$", re.IGNORECASE)


def _normalize(value):
    if value is None:
        return ""
    try:
        if value != value:  # NaN
            return ""
    except Exception:
        pass
    s = unicodedata.normalize("NFKC", str(value))
    s = s.translate(_THAI_DIGITS)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Cf")
    s = "".join(
        " " if ch.isspace() else "-" if unicodedata.category(ch) == "Pd" or ch == "−" else ch
        for ch in s
    )
    return s.strip()


def _from_order_id(s):
    compact = re.sub(r"\s+", "", s)
    m = _RE_ID_FULL.match(compact)
    if m:
        return m.group(1)
    for rx in (_RE_ORD, _RE_HASH):
        m = rx.search(s)
        if m:
            return m.group(1)
    nums = re.findall(r"(?<![0-9a-z])([0-9]{6})(?![0-9])", s, re.IGNORECASE)
    if len(nums) == 1:
        return nums[0]
    return None


def _from_text(s):
    for rx in (_RE_KEYWORD, _RE_ORD, _RE_HASH):
        m = rx.search(s)
        if m:
            return m.group(1)
    return None


def clean_order(order_id, text):
    num = None
    oid = _normalize(order_id)
    if oid:
        num = _from_order_id(oid)
    if num is None:
        t = _normalize(text)
        if t:
            num = _from_text(t)
    return f"ORD-{num}" if num else None

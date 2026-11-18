"""Normalize customer-support order numbers to the form 'ORD-XXXXXX'.

Standard library only.
"""
import math
import re
import unicodedata

# Characters that should be treated as a plain hyphen.
_DASHES = "‐‑‒–—―−⁃﹘﹣－ー"
_DASH_TABLE = {ord(c): "-" for c in _DASHES}

# Strings that mean "no value".
_NULL_TOKENS = {"", "nan", "none", "null", "na", "n/a", "nil", "-", "--", "?", "<na>", "nat"}


def _normalize(s):
    """NFKC + Thai/other digits -> ASCII, drop invisible chars, unify spaces/dashes."""
    if s is None:
        return ""
    s = str(s)
    s = unicodedata.normalize("NFKC", s)
    out = []
    for ch in s:
        cat = unicodedata.category(ch)
        if cat == "Cf":            # zero-width, BOM, soft hyphen, LRM/RLM, word joiner ...
            continue
        if cat == "Nd":            # any decimal digit (Thai ๐-๙, Arabic, full-width ...)
            out.append(str(unicodedata.decimal(ch)))
        elif ch in ("​", "⁠", "﻿", "­", "᠎"):
            continue
        elif ch.isspace() or cat == "Zs":
            out.append(" ")
        elif cat == "Cc":          # other control chars
            out.append(" ")
        else:
            out.append(ch)
    s = "".join(out).translate(_DASH_TABLE)
    s = re.sub(r" +", " ", s)
    return s.strip()


def _is_null(v):
    if v is None:
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    try:  # pandas.NA / NaT and similar
        if v != v:
            return True
    except Exception:
        pass
    return False


_NUM = r"(\d{6})(?![\d])(?![.,]\d)"
_SEP = r"[\s:#=\-_.]*"
_FILLER = r"(?:(?:เลขที่|หมายเลข|เลข|ที่|รหัส|คือ|no\.?|number|num|id|code)" + _SEP + r")*"

# Order with explicit ORD / ORDER prefix (ORD-123456, ord123456, ORD 123456, Order #123456 ...)
_RE_ORD = re.compile(r"(?<![A-Za-z])ord(?:er)?s?" + _SEP + _FILLER + r"(?<!\d)" + _NUM, re.I)
# Thai keywords (ออเดอร์ / ออร์เดอร์ / คำสั่งซื้อ / ใบสั่งซื้อ) followed by a number
_RE_TH = re.compile(
    r"(?:ออเดอร์|ออร์เดอร์|ออเดอ|คำสั่งซื้อ|ใบสั่งซื้อ|สั่งซื้อ)" + _SEP + _FILLER
    + r"(?:ord(?:er)?" + _SEP + r")?(?<!\d)" + _NUM,
    re.I,
)
# Hash prefix: #123456 (not preceded by letters/digits, e.g. not part of a code)
_RE_HASH = re.compile(r"(?<![A-Za-z0-9])#\s*(?<!\d)" + _NUM)


def _from_text(s):
    """Find an order number in free text using context; return 6-digit string or None."""
    if not s:
        return None
    best = None
    for rx in (_RE_ORD, _RE_TH, _RE_HASH):
        m = rx.search(s)
        if m and (best is None or m.start(1) < best.start(1)):
            best = m
    return best.group(1) if best else None


def _from_field(v):
    """Parse the order_id column; return 6-digit string or None."""
    if isinstance(v, bool):
        return None
    if isinstance(v, int):
        v = str(v)
    elif isinstance(v, float):
        if not v.is_integer():
            return None
        v = str(int(v))
    s = _normalize(v)
    if s.lower() in _NULL_TOKENS:
        return None
    m = re.fullmatch(r"(\d{6})\.0+", s)  # e.g. "312364.0" from float conversion
    if m:
        return m.group(1)
    # Strict: optional prefix + separators + exactly 6 digits (allow 123 456 / 123-456).
    compact = re.sub(r"[\s\-_.:/#=]", "", s).upper()
    compact = re.sub(r"^(?:ORDER|ORD|NO|ID|ออเดอร์|ออร์เดอร์|คำสั่งซื้อ|เลขที่)+", "", compact)
    if re.fullmatch(r"\d{6}", compact):
        return compact
    # Contextual search inside the field.
    found = _from_text(s)
    if found:
        return found
    # The field itself is the order context: accept a single isolated 6-digit number,
    # provided it is not glued to other letters (e.g. tracking code TK-123456).
    runs = set(re.findall(r"(?<![\dA-Za-z\-])(\d{6})(?![\d])(?![.,]\d)", s))
    if len(runs) == 1:
        return runs.pop()
    return None


def clean_order(order_id, text):
    """Return 'ORD-XXXXXX' (6 digits) or None.

    Uses the order_id column first; if it is empty/unusable, searches the
    free-text message for an order number given in context
    (ORD/ord/#/ออเดอร์/คำสั่งซื้อ/order).
    """
    num = None
    if not _is_null(order_id):
        num = _from_field(order_id)
    if num is None and not _is_null(text):
        num = _from_text(_normalize(text))
    return "ORD-" + num if num else None

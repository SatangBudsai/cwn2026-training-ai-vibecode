"""clean_time(received_at) -> 'YYYY-MM-DDTHH:MM' (Thai time, UTC+7, CE year) or None."""
import re
import unicodedata
from datetime import datetime, timedelta, timezone

_TH_TZ = timezone(timedelta(hours=7))

# Thai digits -> ASCII (fullwidth digits are handled by NFKC)
_THAI_DIGITS = {ord("๐") + i: str(i) for i in range(10)}

# Invisible / formatting characters to delete outright
_INVISIBLE_RE = re.compile(
    "[​‌‍‎‏⁠⁡⁢⁣⁤"
    "﻿­᠎͏؜‪-‮⁦-⁩]"
)
# Dash-like characters -> '-'
_DASH_RE = re.compile("[‐‑‒–—―−﹘﹣－]")

# ISO-like: 2026-11-08T11:48[:00[.123]][Z|+07:00|+0700|+07]
_ISO_RE = re.compile(
    r"(\d{4})-(\d{1,2})-(\d{1,2})\s*[T ]\s*(\d{1,2}):(\d{1,2})"
    r"(?::(\d{1,2})(?:[.,]\d+)?)?"
    r"\s*(Z|UTC|GMT|[+-]\d{1,2}(?::?\d{2})?)?",
    re.IGNORECASE,
)
# Day/Month/Year (Buddhist Era) Hour:Minute[:Second]
_DMY_RE = re.compile(
    r"(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2,4})\s*,?\s*"
    r"(\d{1,2})\s*[:.]\s*(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?"
)


def _normalize(s):
    s = unicodedata.normalize("NFKC", s)  # fullwidth digits/colons/letters, NBSP -> space
    s = s.translate(_THAI_DIGITS)
    s = _INVISIBLE_RE.sub("", s)
    # drop any remaining format (Cf) characters
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Cf")
    s = _DASH_RE.sub("-", s)
    s = re.sub(r"\s+", " ", s)  # tabs, multiple spaces, other unicode spaces
    return s.strip()


def _fmt(dt):
    return dt.strftime("%Y-%m-%dT%H:%M")


def _parse_offset(tz):
    if tz is None:
        return None
    t = tz.upper()
    if t in ("Z", "UTC", "GMT"):
        return timedelta(0)
    sign = -1 if t[0] == "-" else 1
    body = t[1:].replace(":", "")
    if len(body) <= 2:
        h, m = int(body), 0
    else:
        h, m = int(body[:-2]), int(body[-2:])
    return sign * timedelta(hours=h, minutes=m)


def clean_time(received_at):
    if received_at is None:
        return None
    if isinstance(received_at, float):  # pandas NaN etc.
        return None
    if not isinstance(received_at, str):
        try:
            received_at = str(received_at)
        except Exception:
            return None
    s = _normalize(received_at)
    if not s or s.lower() in ("nan", "none", "null", "nat", "-"):
        return None

    try:
        m = _ISO_RE.search(s)
        if m:
            y, mo, d, h, mi = (int(m.group(i)) for i in range(1, 6))
            sec = int(m.group(6)) if m.group(6) else 0
            off = _parse_offset(m.group(7))
            if y > 2400:  # ISO-looking string with a BE year
                y -= 543
            dt = datetime(y, mo, d, h, mi, sec)
            if off is None:
                return _fmt(dt)  # no offset -> assume already Thai time
            dt = dt.replace(tzinfo=timezone(off)).astimezone(_TH_TZ)
            return _fmt(dt)

        m = _DMY_RE.search(s)
        if m:
            d, mo, y, h, mi = (int(m.group(i)) for i in range(1, 6))
            sec = int(m.group(6)) if m.group(6) else 0
            if y < 100:  # 2-digit BE year, e.g. 69 -> 2569
                y += 2500
            if y > 2400:
                y -= 543
            return _fmt(datetime(y, mo, d, h, mi, sec))
    except (ValueError, OverflowError):
        return None
    return None

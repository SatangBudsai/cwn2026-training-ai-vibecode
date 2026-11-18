import math
import re
import unicodedata
from datetime import datetime, timedelta, timezone

_THAI_TZ = timezone(timedelta(hours=7))
_THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")
_DASHES = str.maketrans({c: "-" for c in "‐‑‒–—―−﹣－"})

_TZ = r"(?:\s*(?P<tz>Z|UTC|GMT|[+-]\d{1,2}(?::?\d{2})?|(?:UTC|GMT)\s*[+-]\d{1,2}(?::?\d{2})?))?"
_TIME = r"(?P<H>\d{1,2})[:.](?P<M>\d{2})(?:[:.](?P<S>\d{2})(?:[.,]\d+)?)?"

_ISO_RE = re.compile(
    r"^(?P<y>\d{4})[-/.](?P<m>\d{1,2})[-/.](?P<d>\d{1,2})(?:\s*T\s*|\s+|,\s*)" + _TIME + _TZ + r"$",
    re.IGNORECASE,
)
_DMY_RE = re.compile(
    r"^(?P<d>\d{1,2})[-/.](?P<m>\d{1,2})[-/.](?P<y>\d{4})(?:\s*T\s*|\s+|,\s*)" + _TIME
    + r"(?:\s*(?:น\.|นาฬิกา))?" + _TZ + r"$",
    re.IGNORECASE,
)


def _normalize(s):
    s = unicodedata.normalize("NFKC", s)
    s = s.translate(_THAI_DIGITS).translate(_DASHES)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Cf")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _parse_tz(tz):
    if not tz:
        return _THAI_TZ  # no offset given -> assume Thai local time
    tz = tz.upper().replace(" ", "")
    for prefix in ("UTC", "GMT"):
        if tz.startswith(prefix):
            tz = tz[len(prefix):]
    if tz in ("", "Z"):
        return timezone.utc
    m = re.fullmatch(r"([+-])(\d{1,2}):?(\d{2})?", tz)
    if not m:
        return None
    hh, mm = int(m.group(2)), int(m.group(3) or 0)
    if hh > 14 or mm > 59:
        return None
    delta = timedelta(hours=hh, minutes=mm)
    return timezone(-delta if m.group(1) == "-" else delta)


def clean_time(received_at):
    """แปลง received_at เป็นเวลาไทย (UTC+7) ปี ค.ศ. รูปแบบ YYYY-MM-DDTHH:MM, แปลงไม่ได้คืน None"""
    try:
        if received_at is None:
            return None
        if isinstance(received_at, float) and math.isnan(received_at):
            return None
        s = _normalize(str(received_at))
        if not s or s.lower() in ("nan", "none", "null", "nat"):
            return None

        m = _ISO_RE.match(s) or _DMY_RE.match(s)
        if not m:
            return None
        year = int(m.group("y"))
        if year >= 2400:  # พ.ศ. -> ค.ศ.
            year -= 543
        tzinfo = _parse_tz(m.group("tz"))
        if tzinfo is None:
            return None
        dt = datetime(
            year, int(m.group("m")), int(m.group("d")),
            int(m.group("H")), int(m.group("M")), int(m.group("S") or 0),
            tzinfo=tzinfo,
        )
        return dt.astimezone(_THAI_TZ).strftime("%Y-%m-%dT%H:%M")
    except (ValueError, OverflowError, TypeError):
        return None

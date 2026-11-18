import re
import unicodedata
from datetime import datetime, timedelta, timezone

_TH = timezone(timedelta(hours=7))
_DASHES = dict.fromkeys(map(ord, "‐‑‒–—―−﹘﹣"), "-")

_TZ = r"(?P<tz>Z|UTC|GMT|[+-]\s*\d{1,2}(?:\s*:?\s*\d{2})?|(?:UTC|GMT)\s*[+-]\s*\d{1,2}(?:\s*:?\s*\d{2})?)?"
_TIME = r"(?P<H>\d{1,2})\s*[:.]\s*(?P<M>\d{1,2})(?:\s*[:.]\s*(?P<S>\d{1,2})(?:[.,]\d+)?)?"
_SEP = r"\s*(?:T|,|\s)\s*"
_TAIL = r"\s*(?:น\.?|นาฬิกา)?\s*" + _TZ + r"\s*$"

_ISO = re.compile(r"^(?P<y>\d{4})\s*[-/.]\s*(?P<m>\d{1,2})\s*[-/.]\s*(?P<d>\d{1,2})" + _SEP + _TIME + _TAIL)
_DMY = re.compile(r"^(?P<d>\d{1,2})\s*[-/.]\s*(?P<m>\d{1,2})\s*[-/.]\s*(?P<y>\d{4}|\d{2})" + _SEP + r"(?:เวลา\s*)?" + _TIME + _TAIL)


def _normalize(s):
    s = unicodedata.normalize("NFKC", s)
    out = []
    for ch in s:
        cat = unicodedata.category(ch)
        if cat == "Nd":
            out.append(str(unicodedata.decimal(ch, 0)))
        elif cat == "Cf" or ch in "ㅤᅟᅠﾠ":
            continue  # invisible: ZWSP, ZWJ, BOM, soft hyphen, word joiner ...
        elif ch.isspace() or cat in ("Zs", "Zl", "Zp", "Cc"):
            out.append(" ")
        else:
            out.append(ch)
    s = "".join(out).translate(_DASHES)
    return re.sub(r"\s+", " ", s).strip().upper()


def _offset(tz):
    if not tz:
        return _TH  # no zone given -> assume Thai local time
    tz = re.sub(r"\s+", "", tz)
    tz = re.sub(r"^(UTC|GMT)(?=[+-])", "", tz)
    if tz in ("Z", "UTC", "GMT"):
        return timezone.utc
    m = re.fullmatch(r"([+-])(\d{1,2}):?(\d{2})?", tz)
    if not m:
        return None
    h, mi = int(m.group(2)), int(m.group(3) or 0)
    if h > 23 or mi > 59:
        return None
    delta = timedelta(hours=h, minutes=mi)
    return timezone(-delta if m.group(1) == "-" else delta)


def clean_time(received_at):
    try:
        if received_at is None:
            return None
        if isinstance(received_at, float) and received_at != received_at:
            return None
        s = _normalize(str(received_at))
        if not s or s in ("NAN", "NONE", "NULL", "NAT", "N/A", "-"):
            return None
        m = _ISO.match(s) or _DMY.match(s)
        if not m:
            return None
        y = int(m.group("y"))
        if len(m.group("y")) == 2:
            y += 2500  # 2-digit year: Thai convention (พ.ศ. 25xx)
        if y > 2400:
            y -= 543  # พ.ศ. -> ค.ศ.
        sec = int(m.group("S") or 0)
        tz = _offset(m.group("tz"))
        if tz is None:
            return None
        dt = datetime(y, int(m.group("m")), int(m.group("d")),
                      int(m.group("H")), int(m.group("M")), min(sec, 59), tzinfo=tz)
        return dt.astimezone(_TH).strftime("%Y-%m-%dT%H:%M")
    except Exception:
        return None

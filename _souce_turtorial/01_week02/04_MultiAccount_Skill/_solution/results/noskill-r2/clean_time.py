"""clean_time(received_at) -> 'YYYY-MM-DDTHH:MM' (Thai time, UTC+7, CE year) or None."""
import re
import unicodedata
from datetime import datetime, timedelta, timezone

_TH_TZ = timezone(timedelta(hours=7))

# Invisible characters not covered by category Cf (Cf already covers ZWSP/ZWJ/BOM/soft hyphen...)
_EXTRA_INVISIBLE = {"͏", "ᅟ", "ᅠ", "឴", "឵", "ㅤ", "ﾠ"}
_DASHES = "‐‑‒–—―−﹘﹣－"

_TH_MONTHS = {
    "มกราคม": 1, "มกรา": 1, "มค": 1,
    "กุมภาพันธ์": 2, "กุมภา": 2, "กพ": 2,
    "มีนาคม": 3, "มีนา": 3, "มีค": 3,
    "เมษายน": 4, "เมษา": 4, "เมย": 4,
    "พฤษภาคม": 5, "พฤษภา": 5, "พค": 5,
    "มิถุนายน": 6, "มิถุนา": 6, "มิย": 6,
    "กรกฎาคม": 7, "กรกฎา": 7, "กค": 7,
    "สิงหาคม": 8, "สิงหา": 8, "สค": 8,
    "กันยายน": 9, "กันยา": 9, "กย": 9,
    "ตุลาคม": 10, "ตุลา": 10, "ตค": 10,
    "พฤศจิกายน": 11, "พฤศจิกา": 11, "พย": 11,
    "ธันวาคม": 12, "ธันวา": 12, "ธค": 12,
}

_ISO_RE = re.compile(
    r"^(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*(?:T|\s)\s*"
    r"(\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*(\d{1,2})(?:[.,]\d+)?)?\s*"
    r"(Z|UTC|GMT|[+-]\s*\d{1,2}(?::?\s*\d{2})?)?$",
    re.IGNORECASE,
)
_DMY_RE = re.compile(
    r"^(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{4}|\d{2})\s*(?:,|T|เวลา)?\s*"
    r"(\d{1,2})\s*[:.]\s*(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?\s*(?:น\.?)?$",
    re.IGNORECASE,
)
_DMY_TH_MONTH_RE = re.compile(
    r"^(\d{1,2})\s*([ก-๛.]+?)\s*(\d{4}|\d{2})\s*(?:,|เวลา)?\s*"
    r"(\d{1,2})\s*[:.]\s*(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?\s*(?:น\.?)?$"
)


def _normalize(s):
    s = unicodedata.normalize("NFKC", s)
    out = []
    for ch in s:
        if ch in _EXTRA_INVISIBLE or unicodedata.category(ch) in ("Cf", "Cc", "Co", "Cs", "Zl", "Zp") and not ch.isspace():
            continue
        if ch.isspace() or unicodedata.category(ch) == "Zs":
            out.append(" ")
            continue
        if ch in _DASHES:
            out.append("-")
            continue
        d = unicodedata.decimal(ch, None)
        if d is not None:
            out.append(str(d))
            continue
        out.append(ch)
    return re.sub(r" +", " ", "".join(out)).strip()


def _be_to_ce(year):
    if year < 100:  # 2-digit year: assume Buddhist era short form (e.g. 69 -> 2569)
        year += 2500
    if year > 2400:
        year -= 543
    return year


def _fmt(dt):
    return dt.strftime("%Y-%m-%dT%H:%M")


def _parse_offset(tz):
    tz = tz.replace(" ", "").upper()
    if tz in ("Z", "UTC", "GMT"):
        return timezone.utc
    sign = -1 if tz[0] == "-" else 1
    body = tz[1:].replace(":", "")
    if len(body) <= 2:
        h, m = int(body), 0
    else:
        h, m = int(body[:-2]), int(body[-2:])
    if h > 14 or m >= 60:
        raise ValueError("bad offset")
    return timezone(sign * timedelta(hours=h, minutes=m))


def _build(y, mo, d, h, mi, sec):
    sec = int(sec) if sec else 0
    if sec > 59:
        raise ValueError("bad seconds")
    return datetime(int(y), int(mo), int(d), int(h), int(mi))


def clean_time(received_at):
    try:
        if received_at is None:
            return None
        if isinstance(received_at, float) and received_at != received_at:  # NaN
            return None
        if isinstance(received_at, datetime):
            dt = received_at
            if dt.tzinfo is not None:
                dt = dt.astimezone(_TH_TZ)
            return _fmt(dt)
        s = _normalize(str(received_at))
        if not s or s.lower() in ("nan", "nat", "none", "null"):
            return None

        m = _ISO_RE.match(s)
        if m:
            y, mo, d, h, mi, sec, tz = m.groups()
            dt = _build(y, mo, d, h, mi, sec)
            if tz:
                dt = dt.replace(tzinfo=_parse_offset(tz)).astimezone(_TH_TZ)
            return _fmt(dt)  # no offset -> already Thai local time

        m = _DMY_RE.match(s)
        if m:
            d, mo, y, h, mi, sec = m.groups()
            return _fmt(_build(_be_to_ce(int(y)), mo, d, h, mi, sec))

        m = _DMY_TH_MONTH_RE.match(s)
        if m:
            d, mon, y, h, mi, sec = m.groups()
            mo = _TH_MONTHS.get(mon.replace(".", "").replace(" ", ""))
            if mo:
                return _fmt(_build(_be_to_ce(int(y)), mo, d, h, mi, sec))
        return None
    except (ValueError, TypeError, OverflowError):
        return None


if __name__ == "__main__":
    import sys
    import pandas as pd

    path = sys.argv[1] if len(sys.argv) > 1 else "data/tickets.csv"
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    out = df["received_at"].map(clean_time)
    ok = out.notna().sum()
    print(f"rows={len(df)} parsed={ok} none={len(df) - ok}")
    for raw in df.loc[out.isna(), "received_at"]:
        print("FAIL:", ascii(raw))
    for raw, res in list(zip(df["received_at"], out))[:6]:
        print(ascii(raw), "->", res)

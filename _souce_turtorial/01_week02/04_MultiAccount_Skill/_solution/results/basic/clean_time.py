"""clean_time: normalise received_at strings to Thai local time (YYYY-MM-DDTHH:MM)."""
import re
from datetime import datetime, timedelta

_THAI = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")
_ISO = re.compile(
    r"^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$",
    re.I,
)
_DMY = re.compile(
    r"^(\d{1,2})/(\d{1,2})/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}:?\d{2})?$",
    re.I,
)


def _offset(tz):
    if tz is None:
        return None
    if tz.upper() == "Z":
        return 0
    sign = 1 if tz[0] == "+" else -1
    digits = tz[1:].replace(":", "")
    return sign * (int(digits[:2]) * 60 + int(digits[2:]))


def clean_time(received_at):
    """Return 'YYYY-MM-DDTHH:MM' in Thai time (Gregorian year) or None."""
    if received_at is None:
        return None
    try:
        if received_at != received_at:  # NaN
            return None
    except Exception:
        pass
    s = str(received_at).replace("​", "").strip().translate(_THAI)
    if not s:
        return None
    m = _ISO.match(s)
    if m:
        y, mo, d, h, mi, _, tz = m.groups()
        y = int(y)
        off = _offset(tz)
    else:
        m = _DMY.match(s)
        if not m:
            return None
        d, mo, y, h, mi, _, tz = m.groups()
        y = int(y)
        if y >= 2400:  # Buddhist Era
            y -= 543
        off = _offset(tz)
    try:
        dt = datetime(y, int(mo), int(d), int(h), int(mi))
    except ValueError:
        return None
    if off is not None:
        dt += timedelta(minutes=420 - off)  # convert to UTC+7
    return dt.strftime("%Y-%m-%dT%H:%M")

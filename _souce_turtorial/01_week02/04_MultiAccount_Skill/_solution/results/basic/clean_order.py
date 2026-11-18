"""Normalise order numbers: clean_order(order_id, text) -> 'ORD-dddddd' or None."""
import re
import pandas as pd

_THAI = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")
_INVIS = dict.fromkeys(map(ord, "​‌‍⁠﻿"))
_NUM = r"(?<![0-9A-Za-z])(?:ORD|#)?[ \-_]?([0-9]{6})(?![0-9])"
_PREFIXED = re.compile(r"(?:(?<![A-Za-z])ord[ \-_#]?|#)([0-9]{6})(?![0-9])", re.I)
_LABELED = re.compile(r"(?:ออเดอร์|คำสั่งซื้อ|order)\s*(?:no\.?|number|เลขที่|:)?\s*(?:ord[ \-_#]?|#)?([0-9]{6})(?![0-9])", re.I)
_BARE = re.compile(r"(?<![0-9A-Za-z\-_.,+])([0-9]{6})(?![0-9A-Za-z\-_.,])")


def _blank(v):
    return v is None or (not isinstance(v, str) and pd.isna(v)) or str(v).strip() == ""


def _norm(s):
    return str(s).translate(_INVIS).translate(_THAI)


def clean_order(order_id, text):
    if not _blank(order_id):
        m = re.search(r"(?<![0-9])([0-9]{6})(?![0-9])", _norm(order_id))
        if m:
            return "ORD-" + m.group(1)
    if _blank(text):
        return None
    t = _norm(text)
    for rx in (_LABELED, _PREFIXED, _BARE):
        hits = rx.findall(t)
        if hits:
            return "ORD-" + hits[-1]  # order is appended at the end of the message
    return None

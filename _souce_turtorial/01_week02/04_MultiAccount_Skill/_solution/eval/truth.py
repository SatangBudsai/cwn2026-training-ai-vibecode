"""เฉลยอ้างอิงของโจทย์ทำความสะอาด ticket: python3 truth.py tickets.csv > truth.json"""
import sys, re, json
from datetime import datetime, timedelta
import pandas as pd
TH = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")
def norm(s):
    return re.sub(r"[​‌‍﻿]", "", str(s)).translate(TH)
def clean_time(s):
    s = norm(s).strip()
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}):(\d{2})", s)
    if m:
        d, mo, y, h, mi = map(int, m.groups())
        t = datetime(y - 543, mo, d, h, mi)
    elif s.endswith("Z"):
        t = datetime.strptime(s[:-1][:16], "%Y-%m-%dT%H:%M") + timedelta(hours=7)
    else:
        t = datetime.strptime(s[:16], "%Y-%m-%dT%H:%M")
        assert s.endswith("+07:00"), s
    return t.strftime("%Y-%m-%dT%H:%M")
def clean_order(col, text):
    for src in (col, text):
        if isinstance(src, str):
            m = re.search(r"(?<!\d)(\d{6})(?!\d)", norm(src))
            if m:
                return "ORD-" + m.group(1)
    return None
def clean_code(text):
    m = re.search(r"(?i)(?<![a-z])(?:err|e|อี)[\s\-_]*(\d{3})(?!\d)", norm(text))
    return "E" + m.group(1) if m else None
def main(path):
    d = pd.read_csv(path, dtype=str)
    out = {}
    for r in d.itertuples():
        out[r.id] = {"time": clean_time(r.received_at),
                     "order_id": clean_order(r.order_id if isinstance(r.order_id, str) else None, r.text),
                     "error_code": clean_code(r.text)}
    return out
if __name__ == "__main__":
    json.dump(main(sys.argv[1]), sys.stdout, ensure_ascii=False, indent=0)

"""สร้างชุดซ่อน: python3 make_hidden.py ../../baseline/tickets.csv hidden.csv  (รูปแบบเดียวกับชุดฝึก แต่ค่าใหม่ทั้งหมด)"""
import sys, re, random
from datetime import datetime, timedelta
import pandas as pd
import truth
R = random.Random(2569)
THD = str.maketrans("0123456789", "๐๑๒๓๔๕๖๗๘๙")
CODES = ["301", "417", "503", "208"]
def fmt_time(t):
    k = R.randrange(3)
    if k == 0:
        return t.strftime("%Y-%m-%dT%H:%M:00+07:00")
    if k == 1:
        return (t - timedelta(hours=7)).strftime("%Y-%m-%dT%H:%MZ")
    return t.strftime("%d/%m/") + str(t.year + 543) + t.strftime(" %H:%M")
def fmt_order(n):
    return R.choice(["#%s", "ORD-%s", "ORD %s", "%s", "ord%s"]) % n
def fmt_code(c):
    f = R.choice(["E%s", "E%s", "E-%s", "E %s", "E_%s", "e%s", "ERR%s", "อี%s", "E%s", "E-%s"])
    if R.random() < 0.15:
        c = c.translate(THD)
    return f % c
CODE_RE = re.compile(r"(?i)(?<![a-z])(?:err|e|อี)[\s\-_]*[0-9๐-๙]{3}(?![0-9๐-๙])")
d = pd.read_csv(sys.argv[1], dtype=str)
rows = []
base = datetime(2026, 11, 14)
for i, r in enumerate(d.sample(frac=1, random_state=7).itertuples(), 1):
    text = r.text
    text = re.sub(r"\s*ออเดอร์[^\n]*?[0-9]{6}\s*$", "", text)
    text = re.sub(r"(?<![0-9๐-๙])[0-9๐-๙]{5}(?![0-9๐-๙])",
                  lambda m: ("%05d" % R.randrange(10**5)).translate(THD) if re.search("[๐-๙]", m.group()) else "%05d" % R.randrange(10**5), text)
    text = CODE_RE.sub(lambda m: fmt_code(R.choice(CODES)), text)
    if not CODE_RE.search(text) and re.search("จ่าย|ชำระ|โอน|บัตร", text) and R.random() < 0.35:
        text = text.rstrip() + " ขึ้น " + fmt_code(R.choice(CODES))
    n = "%06d" % R.randrange(100000, 10**6)
    assert not re.search(r"(?<!\d)\d{6}(?!\d)", truth.norm(text)), text
    if R.random() < 0.11:
        order, text = "", text + " ออเดอร์ " + fmt_order(n)
    else:
        order = fmt_order(n)
    t = base + timedelta(minutes=R.randrange(3 * 24 * 60))
    rows.append({"id": "H%04d" % i, "received_at": fmt_time(t), "order_id": order, "channel": r.channel, "text": text})
pd.DataFrame(rows).to_csv(sys.argv[2], index=False)

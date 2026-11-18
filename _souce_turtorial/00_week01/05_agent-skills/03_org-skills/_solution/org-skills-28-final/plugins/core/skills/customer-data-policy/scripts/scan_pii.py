#!/usr/bin/env python3
"""สแกนหาข้อมูลส่วนบุคคลที่น่าสงสัยในไฟล์ข้อความ (md/txt/csv/log/eml)
ใช้: python scan_pii.py <ไฟล์> [ไฟล์ ...]
ผล: ไฟล์:บรรทัด | ประเภท | ค่าที่เจอ — เป็น "ผู้ต้องสงสัย" เท่านั้น คนต้องตัดสินต่อตาม references/policy-summary.md
stdlib ล้วน ไม่ต้องติดตั้งอะไร
"""
import re, sys, pathlib

PATTERNS = [
    ("เบอร์มือถือ", re.compile(r"(?<!\d)0[689]\d[- ]?\d{3}[- ]?\d{4}(?!\d)")),
    ("เลขบัตรประชาชน", re.compile(r"(?<!\d)[1-8][- ]?\d{4}[- ]?\d{5}[- ]?\d{2}[- ]?\d(?!\d)")),
    # 13 หลักขึ้นต้น 0 = เลขผู้เสียภาษีนิติบุคคล ไม่ใช่ข้อมูลส่วนบุคคล จึงไม่จับ
    ("เลขบัตรเครดิต/เดบิต", re.compile(r"(?<!\d)\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}(?!\d)")),
    ("เลขบัญชีธนาคาร", re.compile(r"(?<!\d)\d{3}-\d-\d{5}-\d(?!\d)")),
    ("อีเมลส่วนตัว", re.compile(r"[\w.+-]+@(?:gmail|hotmail|yahoo|outlook|icloud|live)\.[a-z.]+", re.I)),
    ("อีเมล (เช็กว่าเป็นอีเมลบริษัทไหม)", re.compile(r"[\w.+-]+@(?!(?:gmail|hotmail|yahoo|outlook|icloud|live)\.)[\w-]+\.[\w.]+", re.I)),
    ("ชื่อบุคคล (คุณ...)", re.compile(r"คุณ[ก-๙]{2,}(?:\s[ก-๙]{2,})?")),
    ("ข้อมูลอ่อนไหว ม.26", re.compile(r"ศาสนา|สุขภาพ|ประวัติอาชญากรรม|ลายนิ้วมือ|ใบหน้า|ผลตรวจ|โรค")),
    ("IP address", re.compile(r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])")),
]

def scan(path):
    hits = 0
    text = pathlib.Path(path).read_text(encoding="utf-8", errors="replace")
    for no, line in enumerate(text.splitlines(), 1):
        for label, rx in PATTERNS:
            for m in rx.finditer(line):
                hits += 1
                print(f"{path}:{no} | {label} | {m.group(0)}")
    return hits

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    total = sum(scan(p) for p in sys.argv[1:])
    print(f"-- พบผู้ต้องสงสัย {total} จุด (ยังไม่ใช่คำตัดสิน)")

"""อ่าน records ของ HAR จาก REA evidence bundle (rea/evidence-bundle.json) — ไม่อ่าน HAR เอง
และแกะ response แบบ stream ของ FlightsFrontendService: )]}'  แล้วตามด้วย <ความยาว>\\n<JSON array> ซ้ำหลายก้อน"""
import json, re

import hashlib

BUNDLE = 'rea/evidence-bundle.json'
CLEAN_HAR = 'har/flights.clean.har'


def load_capture(path=BUNDLE, har=CLEAN_HAR):
    """evidence ของ inspect_web_network_capture ที่อ่านครบทุก record ของ HAR ไฟล์ปัจจุบัน (เทียบ sha256)
    bundle อาจมี evidence ของ HAR รอบก่อนปนอยู่ จึงไม่เลือกจากลำดับ"""
    sha = hashlib.sha256(open(har, 'rb').read()).hexdigest()
    b = json.load(open(path, encoding='utf-8'))
    for r in b['records']:
        n = r['normalized_result']
        if (r['operation'] == 'inspect_web_network_capture' and r['subject']['digest']['sha256'] == sha
                and len(n['records']) == n['total_records']):
            return r
    raise SystemExit(f'ไม่พบ evidence ของ REA ที่ครอบคลุม {har} (sha256 {sha[:12]}) ใน {path}')


def parse_stream(text):
    """คืน list ของ (rpc_tag, payload_json) จาก stream แบบ batchexecute"""
    out = []
    s = text[text.index('\n') + 1:] if text.startswith(")]}'") else text
    i = 0
    while i < len(s):
        m = re.compile(r'\s*(\d+)\n').match(s, i)
        if not m:
            break
        n = int(m.group(1)); start = m.end()
        # ความยาวนับเป็น UTF-16 code units ของ chunk (รวม \n หน้า) → ใช้ JSON decoder หาจุดจบแทน
        arr, end = json.JSONDecoder().raw_decode(s, start)
        for item in arr:
            if isinstance(item, list) and item and item[0] == 'wrb.fr':
                out.append((item[1], json.loads(item[2]) if isinstance(item[2], str) else item[2]))
            else:
                out.append((item[0] if isinstance(item, list) and item else None, item))
        i = end
    return out

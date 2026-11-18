"""ทำความสะอาด HAR ให้ผ่าน schema ของ REA (inspect_web_network_capture)
error ที่ REA แจ้ง: /log/entries/N/request/url → invalid_format (must match format "uri")
สาเหตุ: Playwright บันทึก URL ตามที่หน้าเว็บขอ เช่น fonts.googleapis.com/css?family=Product+Sans|Google+Sans+Text
ซึ่งมี '|' ที่ RFC 3986 ไม่อนุญาต → percent-encode อักขระที่ไม่อยู่ในชุด RFC 3986 (คง %XX เดิมไว้)
ไฟล์ต้นฉบับไม่ถูกแก้ ผลลัพธ์เขียนเป็นไฟล์ใหม่
ใช้: python3 -I scripts/clean_har.py har/flights.har har/flights.clean.har"""
import json, re, sys
from urllib.parse import quote

SAFE = "-._~:/?#[]@!$&'()*+,;=%"
BAD = re.compile(r"[^A-Za-z0-9" + re.escape(SAFE) + "]")

def fix(u):
    return quote(u, safe=SAFE) if BAD.search(u) else u

src, dst = sys.argv[1], sys.argv[2]
har = json.load(open(src, encoding='utf-8'))
changed = []
for i, e in enumerate(har['log']['entries']):
    for where, obj, key in (('request.url', e['request'], 'url'), ('response.redirectURL', e['response'], 'redirectURL')):
        v = obj.get(key)
        if v and fix(v) != v:
            changed.append((i, where, v, fix(v)))
            obj[key] = fix(v)
for p in har['log'].get('pages', []):
    if p.get('title') and fix(p['title']) != p['title'] and p['title'].startswith('http'):
        changed.append(('page', p['id'], p['title'], fix(p['title'])))
        p['title'] = fix(p['title'])
json.dump(har, open(dst, 'w', encoding='utf-8'), ensure_ascii=False)
for c in changed:
    print(f'entry {c[0]} {c[1]}: {c[2][:100]} → {c[3][:100]}')
print(f'{len(changed)} field(s) fixed → {dst}')

from pathlib import Path
from html import escape
from playwright.sync_api import sync_playwright
parts=['''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1220" viewBox="0 0 1200 1220"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#697078" stroke-width="1.4"/></marker></defs><rect width="1200" height="1220" fill="white"/><style>text{font-family:'Noto Sans Thai',Tahoma,sans-serif;fill:#35434c} .title{font-weight:600}</style>''']
def text(x,y,lines,size=22,color='#35434c'):
 for i,line in enumerate(lines):parts.append(f'<text x="{x}" y="{y+i*32}" text-anchor="middle" font-size="{size}" style="fill:{color}">{escape(line)}</text>')
def box(x,y,w,h,lines,fill,stroke):
 parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="15" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>');text(x+w/2,y+(h-(len(lines)-1)*32)/2+8,lines)
def arrow(d,dashed=False):parts.append(f'<path d="{d}" fill="none" stroke="#697078" stroke-width="2" marker-end="url(#arrow)"'+(' stroke-dasharray="7 6"' if dashed else '')+'/>')
text(600,44,['Graph Workflow · โครงสร้างตาม Template 2.2'],29)
box(365,80,360,80,['INPUT','โจทย์และข้อมูลต้นทาง'],'#f1eee8','#88817b')
arrow('M545 160 V200')
box(365,200,360,90,['N1 · สกัดข้อกำหนด','FR / BR จากข้อมูลต้นทาง'],'#f1eee8','#88817b')
arrow('M545 290 V335 H190 V385');arrow('M545 290 V335 H485 V385');arrow('M545 290 V335 H780 V385')
text(480,366,['Fan-out · แยกงานอิสระ N2–N4'],19)
box(60,385,260,95,['N2 · Use Case','แผนภาพการใช้งาน'],'#efebfa','#8a7eb0')
box(355,385,260,95,['N3 · ERD','แผนภาพข้อมูล'],'#efebfa','#8a7eb0')
box(650,385,260,95,['N4 · Sequence','แผนภาพลำดับงาน'],'#efebfa','#8a7eb0')
arrow('M725 245 H1050 V385',True);text(988,285,['เมื่อพบข้อขัดแย้ง'],18)
box(945,385,215,125,['N1b · ทางเลือก','ระบุประเด็น','ที่ยังสรุปไม่ได้'],'#fff2da','#c29c5f')
arrow('M190 480 V530 H545 V570');arrow('M485 480 V530 H545 V570');arrow('M780 480 V530 H545 V570')
arrow('M1050 510 V615 H760',True);text(975,566,['ถ้าถูกเรียกใช้','ต้องเสร็จก่อนรวม'],18)
box(330,570,430,100,['N5 · MERGER','ตรวจความสอดคล้องและรวมผล'],'#e3f3ed','#699b87')
arrow('M545 670 V720');text(740,705,['Fan-in · รวมผล'],18)
box(285,720,520,100,['หยุดเมื่อ N5 = DONE','ผลงาน + Execution Trace + ข้อขัดแย้งและหลักฐาน'],'#f8eee6','#b89377')
text(600,875,['กติกาที่กำกับทุก Node'],24)
box(45,905,540,120,['ทำงานเมื่อ Dependency ทุกตัว DONE','N2–N4 ใช้ผลจาก N1','และไม่เห็นผลของกันและกัน'],'#f7f9fb','#ccd4dc')
box(615,905,540,120,['ส่ง node / status / output / assumptions','MERGER รับเฉพาะ DONE','และข้อมูลครบตาม contract'],'#f7f9fb','#ccd4dc')
box(45,1045,540,125,['ล้มเหลว → ลองใหม่อีก 1 ครั้ง','ล้มเหลวซ้ำ → FAILED','ทำต่อเฉพาะงานที่ไม่พึ่ง Node ที่ล้มเหลว'],'#fff5e7','#d5bc91')
box(615,1045,540,125,['ไม่มี Node ที่ทำต่อได้ → หยุดและรายงานสิ่งที่ขาด','ข้อมูลขัดกัน → อ้างหลักฐานจาก INPUT','หลักฐานไม่พอ → คงข้อขัดแย้ง ไม่เลือกข้าง'],'#f9efef','#cba2a2')
parts.append('</svg>'); svg=''.join(parts);Path('img/graph-workflow-template.svg').write_text(svg)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/opt/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);page=b.new_page(viewport={'width':1200,'height':1220},device_scale_factor=1.5);page.set_content('<html><meta charset="utf-8"><style>body{margin:0}</style>'+svg+'</html>');page.evaluate('document.fonts.ready');page.locator('svg').screenshot(path='img/graph-workflow-template.png');b.close()
print('Graph layout revised to centered architecture with rounded blocks.')

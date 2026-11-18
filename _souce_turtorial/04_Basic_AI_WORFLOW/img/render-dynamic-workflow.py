from pathlib import Path
from html import escape
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parent
parts=['''<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1510" viewBox="0 0 1400 1510"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#526577" stroke="#526577" stroke-width="1"/></marker></defs><rect width="1400" height="1510" fill="white"/><style>text{font-family:'Noto Sans Thai',Tahoma,sans-serif;fill:#35434c}</style>''']
def text(x,y,lines,size=22):
 for i,line in enumerate(lines):parts.append(f'<text x="{x}" y="{y+i*32}" text-anchor="middle" font-size="{size}">{escape(line)}</text>')
def box(x,y,w,h,lines,fill='#f1eee8',stroke='#88817b'):
 parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="15" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>');text(x+w/2,y+(h-(len(lines)-1)*32)/2+8,lines)
def arrow(d,dashed=False,color='#267c78'):
 marker='a'+str(len(parts))
 parts.append(f'<defs><marker id="{marker}" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="{color}"/></marker></defs><path d="{d}" fill="none" stroke="{color}" stroke-width="3.5" stroke-linejoin="round" marker-end="url(#{marker})"/>')
text(700,48,['Dynamic Workflow · ตาม Template 3.2'],30)
text(420,100,['01  ทำงานและตรวจผล'],25)
text(1100,100,['02  ปรับแผนเฉพาะเมื่อจำเป็น'],25)
box(140,130,560,90,['INPUT · โจทย์และเป้าหมาย','NEW INFORMATION · NONE หรือข้อมูลใหม่'])
arrow('M420 220 V255')
box(140,255,560,85,['PLANNER · ผู้วางแผน','สร้าง Plan v1 พร้อมงาน / Dependency / สถานะ'],'#efebfa','#8a7eb0')
arrow('M420 340 V390')
box(140,390,560,115,['EXECUTOR · ผู้ลงมือทำ','ทำงาน TODO ทีละงาน เมื่อ Dependency ทุกตัว DONE','บันทึกผลลัพธ์ของงาน'],'#e3f3ed','#699b87')
arrow('M420 505 V550')
box(140,550,560,100,['EVALUATOR · ผู้ประเมิน','ตรวจผลและข้อมูลใหม่: แผนยังเหมาะสมหรือไม่?'],'#fff2da','#c29c5f')
arrow('M420 650 V725');text(450,692,['ใช่'],20)
box(140,725,560,100,['ทุกงาน DONE / DROPPED','และยืนยันว่าบรรลุเป้าหมายแล้ว?'],'#fff2da','#c29c5f')
arrow('M140 775 H60 V447 H140');text(155,535,['ยังไม่ครบ: ทำงานถัดไป'],17)
arrow('M420 825 V920');text(455,877,['ใช่'],20)
box(140,920,560,100,['จบ · ส่งมอบผลงาน','พร้อมบันทึกเวอร์ชันแผนและบันทึกการทำงาน'],'#e3f3ed','#699b87')
arrow('M700 600 H900',color='#b96a27');text(795,580,['ไม่ใช่'],20)
box(900,535,430,130,['ตรวจเหตุให้ปรับแผน','พบงานที่ขาด / งานทำไม่ได้','หรือข้อกำหนดเปลี่ยน'],'#fff2da','#c29c5f')
arrow('M1115 665 V715',color='#b96a27')
box(900,715,430,85,['ตรวจขีดจำกัด','Re-plan ได้สูงสุด 3 ครั้ง'],'#fff2da','#c29c5f')
arrow('M1330 757 H1370 V315 H1330',color='#b96a27')
text(1130,440,['ยังปรับแผนได้','กลับไปสร้างแผนเวอร์ชันใหม่'],20)
box(900,245,430,140,['PLANNER · ปรับแผนเวอร์ชันถัดไป','ระบุเหตุผล / สิ่งที่เปลี่ยน','ผลกระทบ / ผลงานเดิมที่ใช้ต่อ'],'#efebfa','#8a7eb0')
arrow('M900 315 H800 V447 H700',color='#b96a27');text(795,365,['ใช้แผนใหม่'],18)
arrow('M1115 800 V920',color='#b96a27');text(1120,870,['ถึงขีดจำกัด'],20)
box(900,920,430,100,['หยุด · รายงาน','สิ่งที่ยังตัดสินใจไม่ได้'],'#f9efef','#cba2a2')
text(700,1090,['กติกาประกอบ · ใช้ทุกครั้งที่ปรับแผน'],25)
box(45,1130,640,135,['เปลี่ยนแผนได้: เพิ่ม / ตัด / แยก / รวม / จัดลำดับงาน','หรือเปลี่ยน Dependency (งานที่ต้องรอให้เสร็จก่อน)','งานที่ตัดออกต้องระบุเหตุผล ห้ามตัดข้อกำหนดโดยไม่แจ้ง'],'#f7f9fb','#ccd4dc')
box(715,1130,640,135,['Impact analysis · ระบุงานและผลงานที่ได้รับผลกระทบ','Reuse · เก็บผลงาน DONE ที่ยังใช้ได้','ห้ามทำ DONE ซ้ำ ถ้าไม่มีผลกระทบรองรับ'],'#f7f9fb','#ccd4dc')
box(45,1290,1310,110,['สถานะงาน: TODO (รอทำ) / DONE (เสร็จแล้ว) / DROPPED (ตัดออกพร้อมเหตุผล)','แผนแรกยังเหมาะสม → ใช้แผนเดิมต่อได้ ไม่จำเป็นต้องเปลี่ยนเวอร์ชัน','บันทึกการทำงาน: ขั้นตอน / งาน / ผลลัพธ์ / การตัดสินของ EVALUATOR'],'#f7f9fb','#ccd4dc')
text(700,1460,['อ่านทางเดินหลักจากบนลงล่าง · ไปด้านขวาเฉพาะเมื่อจำเป็นต้องปรับแผน'],22)
parts.append('</svg>');svg=''.join(parts);(BASE/'dynamic-workflow-template.svg').write_text(svg)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/opt/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);p=b.new_page(viewport={'width':1400,'height':1510},device_scale_factor=1.5);p.set_content('<html><meta charset="utf-8"><style>body{margin:0}</style>'+svg+'</html>');p.evaluate('document.fonts.ready');p.locator('svg').screenshot(path=str(BASE/'dynamic-workflow-template.png'));b.close()
print('Rendered Dynamic diagram')

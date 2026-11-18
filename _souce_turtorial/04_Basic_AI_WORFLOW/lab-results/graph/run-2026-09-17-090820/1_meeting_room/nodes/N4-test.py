from pathlib import Path
import json
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/opt/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto((p/'output.html').as_uri());checks={}
 checks['three_rooms']=page.locator('#rooms article').count()==3
 checks['form_on_first_page']=page.locator('#booking-form').is_visible();checks['status_on_first_page']=page.locator('#status').is_visible()
 page.screenshot(path=str(p/'screen-overview.png'),full_page=True)
 page.get_by_role('button',name='ดูเวลาว่าง Garden',exact=True).click();checks['availability']='ว่างทุกช่วงเวลา' in page.locator('#slots').inner_text()
 page.locator('#title').fill('Graph test');page.get_by_role('button',name='ยืนยันการจอง',exact=True).click()
 row=page.locator('#bookings tr').filter(has_text='Graph test');checks['booking_created']=row.count()==1 and 'ยืนยันแล้ว' in row.inner_text();checks['busy_slot']='13:00–14:00' in page.locator('#slots').inner_text()
 page.screenshot(path=str(p/'screen-booked.png'),full_page=True)
 page.get_by_role('button',name='ยืนยันการจอง',exact=True).click();checks['reject_overlap']='ถูกจองแล้ว' in page.locator('#message').inner_text() and row.count()==1
 row.get_by_role('button',name='ยกเลิก Graph test',exact=True).click();checks['cancelled']='ยกเลิกแล้ว' in row.inner_text();checks['released_slot']='ว่างทุกช่วงเวลา' in page.locator('#slots').inner_text()
 page.screenshot(path=str(p/'screen-cancelled.png'),full_page=True)
 page.locator('#start').fill('15:00');page.locator('#end').fill('14:00');page.get_by_role('button',name='ยืนยันการจอง',exact=True).click();checks['invalid_range']='เวลาเริ่มต้องก่อน' in page.locator('#message').inner_text()
 page.goto((p/'output.html').as_uri());page.get_by_role('button',name='ยกเลิก ประชุมตัวอย่าง',exact=True).click();checks['initial_cancel']='ยกเลิกแล้ว' in page.locator('#bookings').inner_text()
 checks['no_errors']=not errors
 routes={'แสดงห้อง':0,'ดูเวลาว่าง':1,'ฟอร์มจอง':0,'ยกเลิกรายการตัวอย่าง':1,'ดูสถานะ':0}
 page.set_viewport_size({'width':390,'height':844});checks['mobile_no_overflow']=page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(p/'screen-mobile.png'),full_page=True)
 result={'checks':checks,'console_page_errors':errors,'access_clicks':routes,'click_definition':'เข้าถึงฟีเจอร์จากหน้าแรก ไม่รวมการกรอกและส่งฟอร์ม; อนุญาตเลื่อนหน้า','criteria':{'C1':all(checks[k] for k in ['three_rooms','availability','booking_created','cancelled','status_on_first_page']),'C2':all(checks.values()),'C3':max(routes.values())<=2}}
 (p/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));b.close()

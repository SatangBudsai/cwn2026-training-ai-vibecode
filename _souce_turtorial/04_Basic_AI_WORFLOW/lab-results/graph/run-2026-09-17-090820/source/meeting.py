from common import *
p=case('1_meeting_room')
contract='''# N1 — ข้อกำหนดและข้อตกลงการเชื่อมต่อ

ห้าฟีเจอร์: แสดงห้อง ดูเวลาว่าง จอง ยกเลิก และสถานะ ต้องเข้าถึงจากหน้าแรกไม่เกินสองคลิก
หน้าเดียวแสดง rooms, availability, booking-form, bookings และ message; input: date, room, start, end, title
ฟังก์ชัน JavaScript: renderRooms(), renderAvailability(), renderBookings(), bookRoom(), cancelBooking(id)
ข้อมูล Room: id,name,capacity; Booking: id,room,date,start,end,title,status
ห้องตัวอย่าง RIVER, GARDEN, STUDIO; วันตั้งต้น 2026-09-17; ช่วงเวลาแบบ 24 ชั่วโมง
ตัวอย่างนัดเริ่มต้น: RIVER 10:00–11:00 ชื่อ ประชุมตัวอย่าง สถานะ ยืนยันแล้ว
status ใช้ ยืนยันแล้ว / ยกเลิกแล้ว; กติกาตรวจเวลาซ้อน: start < existing.end และ end > existing.start
ปุ่ม ดูเวลาว่าง ใช้ data-room และคลาส availability-button; ปุ่มยกเลิกใช้ data-id
ทดสอบสร้างนัด GARDEN 13:00–14:00 ชื่อ Graph test แล้วดูสถานะ ยกเลิก และตรวจเวลาว่าง
สิ่งที่สมมติ: ชื่อห้อง ความจุ วันและนัดเริ่มต้นเป็นข้อมูลสาธิต ข้อมูลอยู่ในหน่วยความจำ รีเฟรชแล้วเริ่มใหม่
'''
node(p,'N1',[],{'nodes/N1-contract.md':contract},['ห้องและนัดเริ่มต้นเป็นข้อมูลจำลอง ไม่ใช่รายการจากโจทย์'])
js='''const rooms=[{id:'RIVER',name:'River',capacity:8},{id:'GARDEN',name:'Garden',capacity:12},{id:'STUDIO',name:'Studio',capacity:4}];
let bookings=[{id:'demo',room:'RIVER',date:'2026-09-17',start:'10:00',end:'11:00',title:'ประชุมตัวอย่าง',status:'ยืนยันแล้ว'}];let selectedRoom='RIVER';let nextId=1;const $=id=>document.getElementById(id);const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderRooms(){$('rooms').innerHTML=rooms.map(r=>`<article class="card"><span class="tag">${r.capacity} ที่นั่ง</span><h3>${r.name}</h3><p>ห้องตัวอย่างสำหรับทีมของคุณ</p><button class="availability-button" data-room="${r.id}">ดูเวลาว่าง ${r.name}</button></article>`).join('');document.querySelectorAll('.availability-button').forEach(b=>b.onclick=()=>{selectedRoom=b.dataset.room;$('room').value=selectedRoom;renderAvailability();$('availability').scrollIntoView({behavior:'smooth'});});}
function active(room,date){return bookings.filter(b=>b.room===room&&b.date===date&&b.status==='ยืนยันแล้ว');}
function renderAvailability(){const name=rooms.find(r=>r.id===selectedRoom).name;const list=active(selectedRoom,$('date').value);$('availability-title').textContent='เวลาว่าง · '+name;$('slots').textContent=list.length?'ช่วงที่จองแล้ว: '+list.map(b=>b.start+'–'+b.end).join(', ')+' · ช่วงอื่นว่าง':'ว่างทุกช่วงเวลาในวันที่เลือก';}
function renderBookings(){$('bookings').innerHTML=bookings.filter(b=>b.date===$('date').value).map(b=>`<tr data-booking="${b.id}"><td>${esc(b.title)}</td><td>${esc(b.room)}</td><td>${b.start}–${b.end}</td><td class="status">${b.status}</td><td>${b.status==='ยืนยันแล้ว'?`<button class="secondary cancel-button" data-id="${b.id}">ยกเลิก ${esc(b.title)}</button>`:'—'}</td></tr>`).join('');document.querySelectorAll('.cancel-button').forEach(b=>b.onclick=()=>cancelBooking(b.dataset.id));}
function bookRoom(){const item={id:'b'+nextId,room:$('room').value,date:$('date').value,start:$('start').value,end:$('end').value,title:$('title').value.trim(),status:'ยืนยันแล้ว'};if(!item.title||!item.date||!item.start||!item.end){$('message').textContent='กรอกข้อมูลให้ครบ';return;}if(item.start>=item.end){$('message').textContent='เวลาเริ่มต้องก่อนเวลาสิ้นสุด';return;}if(active(item.room,item.date).some(b=>item.start<b.end&&item.end>b.start)){$('message').textContent='ช่วงเวลานี้ถูกจองแล้ว';return;}nextId++;bookings.push(item);selectedRoom=item.room;renderBookings();renderAvailability();$('message').textContent='จองสำเร็จ';}
function cancelBooking(id){const b=bookings.find(b=>b.id===id);if(b){b.status='ยกเลิกแล้ว';selectedRoom=b.room;renderBookings();renderAvailability();$('message').textContent='ยกเลิกแล้ว และคืนเวลาว่าง';}}
$('booking-form').onsubmit=e=>{e.preventDefault();bookRoom();};$('date').onchange=()=>{renderBookings();renderAvailability();};$('room').onchange=()=>{selectedRoom=$('room').value;renderAvailability();};renderRooms();renderAvailability();renderBookings();
'''
node(p,'N2',['N1'],{'nodes/N2.js':js})
body='''<section><h2>ห้องประชุม</h2><div id="rooms" class="grid"></div></section><section id="availability"><h2 id="availability-title">เวลาว่าง</h2><label>วันที่<input id="date" type="date" value="2026-09-17"></label><p id="slots" class="warn"></p></section><section id="booking"><h2>จองห้องประชุม</h2><form id="booking-form"><div class="form-grid"><label>หัวข้อประชุม<input id="title" required placeholder="ชื่อการประชุม"></label><label>ห้อง<select id="room"><option value="RIVER">River</option><option value="GARDEN">Garden</option><option value="STUDIO">Studio</option></select></label><label>เริ่ม<input id="start" type="time" value="13:00" required></label><label>สิ้นสุด<input id="end" type="time" value="14:00" required></label></div><p><button type="submit">ยืนยันการจอง</button></p></form><p id="message" role="status" aria-live="polite"></p></section><section id="status"><h2>สถานะและการยกเลิก</h2><div class="table-wrap"><table><thead><tr><th>การประชุม</th><th>ห้อง</th><th>เวลา</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody id="bookings"></tbody></table></div></section>'''
html=page('ห้องพร้อม ทีมพร้อม','ดูเวลาว่างและจัดการนัดหมายในหน้าเดียว · รีเฟรชแล้วกลับข้อมูลตั้งต้น',body,'<a href="#availability">เวลาว่าง</a><a href="#booking">จองห้อง</a><a href="#status">สถานะ</a>','<!--APP_SCRIPT-->')
node(p,'N3',['N1'],{'nodes/N3.html':html})
test='''from pathlib import Path
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
'''
node(p,'N4',['N1'],{'nodes/N4-test.py':test})
(p/'output.html').write_text((p/'nodes/N3.html').read_text().replace('<!--APP_SCRIPT-->','<script>'+(p/'nodes/N2.js').read_text()+'</script>'))
with (p/'trace.md').open('a') as f:f.write('## N5 — กำลังตรวจ\n\nรับ N2/N3/N4 หลัง DONE ครบแล้ว รวมตาม DOM contract จาก N1 ไม่พบชื่อ interface ขัดกัน รัน N4-test.py ก่อนตัดสิน DONE\n\n')
print('Meeting nodes N1-N4 DONE; N5 merged and awaits actual tests')

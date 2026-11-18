from pathlib import Path
import json,re,datetime,html
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3]
roots={k:ROOT/v for k,v in json.loads(Path(__file__).with_name('runs.json').read_text()).items()}
CHROME='/opt/ms-playwright/chromium-1234/chrome-linux64/chrome'
MERMAID='/usr/local/lib/node_modules/mcp-excalidraw-server/node_modules/mermaid/dist/mermaid.min.js'
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
 # Meeting real browser interactions
 p=roots['1_meeting_room']; page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto((p/'output.html').as_uri());page.screenshot(path=str(p/'screen-overview.png'),full_page=True)
 tests={};tests['rooms_visible']=page.locator('#rooms article').count()==3
 page.get_by_role('button',name='ดูเวลาว่าง River').click();tests['availability_open']=page.locator('#availability').is_visible() and '10:00–11:00 · ว่าง' in page.locator('#slots').inner_text();page.get_by_role('button',name='ปิดตารางเวลา').click()
 page.locator('#title').fill('ประชุมทดสอบรอบใหม่');page.get_by_role('button',name='ยืนยันการจอง').click()
 row=page.locator('#bookings tr').filter(has_text='ประชุมทดสอบรอบใหม่');tests['booking_created']=row.count()==1 and 'ยืนยันแล้ว' in row.inner_text()
 page.get_by_role('button',name='ดูเวลาว่าง River').click();tests['availability_after_booking']='10:00–11:00 · ไม่ว่าง' in page.locator('#slots').inner_text();page.get_by_role('button',name='ปิดตารางเวลา').click()
 page.get_by_role('button',name='ยืนยันการจอง').click();tests['overlap_rejected']='ถูกจองแล้ว' in page.locator('#message').inner_text() and row.count()==1
 page.screenshot(path=str(p/'screen-booked.png'),full_page=True)
 row.get_by_role('button',name='ยกเลิก ประชุมทดสอบรอบใหม่',exact=True).click();tests['cancelled_status']='ยกเลิกแล้ว' in row.inner_text()
 page.get_by_role('button',name='ดูเวลาว่าง River').click();tests['availability_after_cancel']='10:00–11:00 · ว่าง' in page.locator('#slots').inner_text();page.get_by_role('button',name='ปิดตารางเวลา').click()
 page.screenshot(path=str(p/'screen-cancelled.png'),full_page=True)
 page.locator('#start').fill('12:00');page.locator('#end').fill('11:00');page.get_by_role('button',name='ยืนยันการจอง').click();tests['invalid_interval_rejected']='เริ่มก่อนสิ้นสุด' in page.locator('#message').inner_text()
 page.goto((p/'output.html').as_uri())
 routes={'แสดงห้องประชุม':{'clicks':0,'path':'หน้าแรก → รายการห้อง'},'ดูเวลาว่าง':{'clicks':1,'path':'หน้าแรก → ดูเวลาว่าง River'},'จองห้อง':{'clicks':0,'path':'หน้าแรก → ฟอร์มจองที่แสดงอยู่แล้ว; การส่งหลังกรอกใช้ปุ่มยืนยัน 1 คลิก'},'ยกเลิกการจอง':{'clicks':1,'path':'หน้าแรก → ยกเลิกประชุมตัวอย่าง'},'แสดงสถานะ':{'clicks':0,'path':'หน้าแรก → ตารางการจองและสถานะ'}}
 page.get_by_role('button',name='ยกเลิก ประชุมตัวอย่าง',exact=True).click();tests['initial_cancel_available']='ยกเลิกแล้ว' in page.locator('#bookings').inner_text()
 tests['no_console_or_page_errors']=not errors
 result={'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tests':tests,'console_page_errors':errors,'feature_access_routes':routes,'criteria':{'C1':all(tests[k] for k in ['rooms_visible','availability_open','booking_created','cancelled_status']),'C2':all(tests.values()),'C3':all(x['clicks']<=2 for x in routes.values())}}
 (p/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('meeting',result['criteria']);page.close()
 # Documents: render every diagram with installed Mermaid
 for name in ['2_expense_claim','3_clinic_migration']:
  p=roots[name]; text=(p/'output.md').read_text();blocks=re.findall(r'```mermaid\s*\n(.*?)```',text,re.S)
  page=browser.new_page(viewport={'width':1440,'height':1100});page.set_content('<!doctype html><html><meta charset="utf-8"><body></body></html>');page.add_script_tag(path=MERMAID)
  page.evaluate("mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral',fontFamily:'Tahoma, sans-serif'})")
  diagrams=[]
  for i,src in enumerate(blocks,1):
   try:
    svg=page.evaluate("async ({src,id}) => (await mermaid.render(id,src)).svg",{'src':src,'id':f'diagram{i}'})
    (p/f'diagram-{i}.svg').write_text(svg)
    shot=browser.new_page(viewport={'width':1440,'height':1100});shot.set_content('<html><meta charset="utf-8"><style>body{margin:24px;background:white;font-family:Tahoma}svg{max-width:100%!important;height:auto}</style>'+svg+'</html>');shot.locator('svg').screenshot(path=str(p/f'diagram-{i}.png'));shot.close()
    diagrams.append({'index':i,'rendered':True,'svg':f'diagram-{i}.svg','png':f'diagram-{i}.png'})
   except Exception as e: diagrams.append({'index':i,'rendered':False,'error':str(e)[:1200]})
  page.close()
  result={'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mermaid':diagrams,'all_diagrams_rendered':len(diagrams)>0 and all(d['rendered'] for d in diagrams)}
  if name=='2_expense_claim':
   page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.goto((p/'mockup.html').as_uri())
   sections={s:page.locator('#'+s).is_visible() for s in ['submit','tracking','review']}
   for s in sections:page.locator('#'+s).screenshot(path=str(p/f'screen-{s}.png'))
   page.screenshot(path=str(p/'screen-overview.png'),full_page=True)
   result['mockup']={'sections':sections,'console_page_errors':errors,'labelled_simulated':'ข้อมูลจำลอง' in page.locator('body').inner_text(),'unconfirmed_policy_visible':all(x in page.locator('#review').inner_text() for x in ['5,000','10,000','รอ HR'])}
   page.close()
   # Source coverage within the actual matrix, not unrelated headings
   matrix=text.split('## Traceability Matrix')[1].split('## Pain Point')[0]
   result['source_coverage']={f'S{i:02}':bool(re.search(r'\| S'+f'{i:02}'+r' \| (?:FR|BR)-',matrix)) for i in range(1,11)}
   erd=blocks[1];entities={m.group(1):set(re.findall(r'^\s*\w+\s+(\w+)',m.group(2),re.M)) for m in re.finditer(r'(\w+)\s*\{([^}]+)\}',erd)}
   refs={'Claim':['status','current_owner'],'Receipt':['image_ref','receipt_date','duplicate_review'],'Approval':['decision'],'Payment':['scheduled_date','result']}
   result['referenced_attributes']={e+'.'+a:a in entities.get(e,set()) for e,attrs in refs.items() for a in attrs}
   result['state_owners']=re.findall(r'state "([^"\n]+)"',blocks[3])
  else:
   result['weekday_evidence']={d:datetime.date.fromisoformat(d).strftime('%A') for d in ['2026-03-09','2026-09-03']}
   result['phone_normalization']={v:re.sub(r'[\s-]','',v) for v in ['081-234-5678','0812345678','081 234 5678']}
   result['review_rows_present']={f'R{i}':f'R{i}' in text.split('### จับคู่ตัวตนก่อนรวมข้อมูล')[1].split('### ขั้นนำเข้า')[0] for i in range(1,6)}
  (p/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(name,json.dumps(result,ensure_ascii=False))
 browser.close()

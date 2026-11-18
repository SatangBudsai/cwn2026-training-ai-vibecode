from pathlib import Path
from datetime import datetime,timezone
import re,json,sys,hashlib
from playwright.sync_api import sync_playwright
RUN=Path(__file__).resolve().parents[1]; keys=sys.argv[1:] or ['2_expense_claim','3_clinic_migration']
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/opt/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox'])
 for key in keys:
  p=RUN/key;text=(p/'output.md').read_text();phase='phase2' if (p/'phase2-active').exists() else 'phase1';prefix=phase+'-';result={'timestamp_utc':datetime.now(timezone.utc).isoformat(),'phase':phase,'diagrams':[],'mockup':{},'automated_scope':'rendering, DOM visibility, selected source/contract checks; semantic review is separate'}
  blocks=re.findall(r'```mermaid\s*\n(.*?)```',text,re.S);page=b.new_page(viewport={'width':1440,'height':1100});page.set_content('<html><meta charset="utf-8"><body></body></html>');page.add_script_tag(path='/usr/local/lib/node_modules/mcp-excalidraw-server/node_modules/mermaid/dist/mermaid.min.js');page.evaluate("mermaid.initialize({startOnLoad:false,theme:'neutral',securityLevel:'strict'})")
  for i,src in enumerate(blocks,1):
   try:
    svg=page.evaluate('async ({src,id})=>(await mermaid.render(id,src)).svg',{'src':src,'id':f'dynamicD{i}'});(p/f'{prefix}diagram-{i}.svg').write_text(svg)
    shot=b.new_page(viewport={'width':1440,'height':1100});shot.set_content('<html><meta charset="utf-8"><style>body{margin:24px;background:white}svg{max-width:100%;height:auto}</style>'+svg+'</html>');shot.locator('svg').screenshot(path=str(p/f'{prefix}diagram-{i}.png'));shot.close();result['diagrams'].append({'index':i,'rendered':True})
   except Exception as e:result['diagrams'].append({'index':i,'rendered':False,'error':str(e)[:1000]})
  page.close()
  ids=['submit','tracking','review'] if key=='2_expense_claim' else ['appointments','booking','review']+(['consent','line-booking'] if phase=='phase2' else [])
  for width in [1440,390]:
   page=b.new_page(viewport={'width':width,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.goto((p/'mockup.html').as_uri());page.evaluate('document.fonts.ready')
   body=page.locator('body').inner_text();checks={id:page.locator('#'+id).is_visible() for id in ids};checks['simulated_label']='ข้อมูลจำลอง' in body or 'จำลอง' in body;checks['no_page_overflow']=page.evaluate('document.documentElement.scrollWidth<=innerWidth');checks['no_errors']=not errors
   if key=='2_expense_claim':
    checks['unresolved_limits']=all(x in page.locator('#review').inner_text() for x in ['5,000','10,000','รอ HR']);checks['owners']=all(x in page.locator('#tracking').inner_text() for x in ['รอยืนยันนโยบาย','หัวหน้าทีม','รอจ่าย','บัญชี','ร่าง','พนักงาน']);checks['required_customer_fields']=all(x in page.locator('#submit').inner_text() for x in ['ชื่อลูกค้า','บริษัทลูกค้า','30 วัน'])
   else:
    checks['all_source_rows']=all(f'R{i}' in page.locator('#appointments').inner_text() for i in range(1,6));checks['review_rows']=all(f'R{i}' in page.locator('#review').inner_text() for i in range(1,6));checks['no_auto_merge']='ห้ามรวมตัวตนอัตโนมัติ' in body
    if phase=='phase2':checks['consent_not_prechecked']=not page.locator('#consent-choice').is_checked();checks['line_simulated']='ไม่เชื่อม LINE จริง' in page.locator('#line-booking').inner_text()
   for id in ids:page.locator('#'+id).screenshot(path=str(p/f'{prefix}{width}-{id}.png'))
   page.screenshot(path=str(p/f'{prefix}{width}-overview.png'),full_page=True);result['mockup'][str(width)]={'checks':checks,'console_page_errors':errors};page.close()
  if key=='2_expense_claim':
   sources=json.loads((p/'tasks/T1-sources.json').read_text());matrix=text.split('## Traceability Matrix',1)[1].split('## Pain Point',1)[0]
   result['source_coverage']={sid:quote in matrix and fr in matrix for sid,quote,fr in sources}
   erd='\n'.join(x for x in blocks if x.strip().startswith('erDiagram'));entities={m.group(1):set(re.findall(r'^\s*\w+\s+(\w+)',m.group(2),re.M)) for m in re.finditer(r'^\s*(\w+)\s*\{([^}]+)\}',erd,re.M)}
   contract=json.loads((p/'tasks/T1-contract.json').read_text());result['contract_fields']={e:all(a in entities.get(e,set()) for a in attrs) for e,attrs in contract['entities'].items()}
   state='\n'.join(x for x in blocks if x.strip().startswith('stateDiagram'));result['state_owners']={state_name:(state_name+' — '+owner) in state for state_name,owner in contract['states'].items()}
  else:
   result['weekday_evidence']={x:datetime.fromisoformat(x).strftime('%A') for x in ['2026-03-09','2026-09-03']};result['phone_normalization']={x:re.sub(r'[\s-]','',x) for x in ['081-234-5678','0812345678','081 234 5678']}
   finding=text.split('## Data Quality Findings',1)[1].split('### ข้อมูลที่ยังต้องยืนยัน',1)[0];result['findings_rows']=len([x for x in finding.splitlines() if x.startswith('| ')])-2
  passed=bool(blocks) and all(x['rendered'] for x in result['diagrams']) and all(all(x['checks'].values()) for x in result['mockup'].values())
  if key=='2_expense_claim':passed=passed and all(result['source_coverage'].values()) and all(result['contract_fields'].values()) and all(result['state_owners'].values())
  else:passed=passed and result['findings_rows']>=5
  result['automated_pass']=passed;result['sha256']={x:hashlib.sha256((p/x).read_bytes()).hexdigest() for x in ['output.md','mockup.html']}
  (p/f'verification-{phase}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(key,phase,'PASS' if passed else 'FAIL',json.dumps(result,ensure_ascii=False) if not passed else f'{len(blocks)} diagrams; desktop/mobile checked')
 b.close()

from pathlib import Path
import re,json,datetime,sys,hashlib
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parent; phase=sys.argv[1]
doc_name='output-phase1.md' if phase=='phase1' else 'output.md'; ui_name='mockup-phase1.html' if phase=='phase1' else 'mockup.html'
text=(p/doc_name).read_text(); blocks=re.findall(r'```mermaid\s*\n(.*?)```',text,re.S)
result={'phase':phase,'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'New Playwright Chromium run; semantic review recorded separately in trace.md','diagrams':[],'mockup':{}}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/opt/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000});page.set_content('<html><meta charset="utf-8"><body></body></html>')
 page.add_script_tag(path='/usr/local/lib/node_modules/mcp-excalidraw-server/node_modules/mermaid/dist/mermaid.min.js')
 page.evaluate("mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral'})")
 for i,src in enumerate(blocks,1):
  try:
   svg=page.evaluate('async ({src,id})=>(await mermaid.render(id,src)).svg',{'src':src,'id':f'd{i}'})
   (p/f'{phase}-diagram-{i}.svg').write_text(svg)
   shot=browser.new_page(viewport={'width':1280,'height':1000});shot.set_content('<html><style>body{background:white;margin:20px}svg{max-width:100%;height:auto}</style>'+svg+'</html>');shot.locator('svg').screenshot(path=str(p/f'{phase}-diagram-{i}.png'));shot.close()
   result['diagrams'].append({'index':i,'rendered':True})
  except Exception as e: result['diagrams'].append({'index':i,'rendered':False,'error':str(e)[:500]})
 page.close()
 for width in [1440,390]:
  page=browser.new_page(viewport={'width':width,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto((p/ui_name).as_uri());page.evaluate('document.fonts.ready')
  ids=['appointments','booking','review']+(['consent','line-booking'] if phase=='phase2' else [])
  checks={x:page.locator('#'+x).is_visible() for x in ids}
  checks['no_page_overflow']=page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  checks['simulation_label']='ข้อมูลจำลอง' in page.locator('body').inner_text()
  checks['raw_dates_preserved']=all(x in page.locator('#appointments').inner_text() for x in ['03/09/2026','2026-09-03','3 ก.ย. 69','09/03/2026'])
  checks['all_review_rows']=all(f'R{i}' in page.locator('#review').inner_text() for i in range(1,6))
  checks['identity_not_merged']='ห้ามรวมตัวตนอัตโนมัติ' in page.locator('#review').inner_text()
  checks['no_console_page_errors']=not errors
  if phase=='phase2':
   checks['consent_unchecked']=not page.locator('#consent-choice').is_checked()
   checks['line_label']='ไม่เชื่อม LINE จริง' in page.locator('#line-booking').inner_text()
  for id in ids:
   page.locator('#'+id).screenshot(path=str(p/f'{phase}-{width}-{id}.png'))
  result['mockup'][str(width)]={'checks':checks,'errors':errors}
  page.screenshot(path=str(p/f'{phase}-{width}-overview.png'),full_page=True);page.close()
 browser.close()
result['weekday_evidence']={d:datetime.date.fromisoformat(d).strftime('%A') for d in ['2026-03-09','2026-09-03']}
result['phone_normalization']={v:re.sub(r'[\s-]','',v) for v in ['081-234-5678','0812345678','081 234 5678']}
result['automated_checks_pass']=bool(blocks) and all(d['rendered'] for d in result['diagrams']) and all(all(v['checks'].values()) for v in result['mockup'].values())
result['artifact_sha256']={name:hashlib.sha256((p/name).read_bytes()).hexdigest() for name in [doc_name,ui_name,'prompt-used.md']}
(p/f'verification-{phase}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))

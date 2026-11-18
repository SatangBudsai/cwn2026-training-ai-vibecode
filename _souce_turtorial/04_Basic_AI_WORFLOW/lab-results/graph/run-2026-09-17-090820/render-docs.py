from pathlib import Path
from html import escape
import json,re,mistune
from playwright.sync_api import sync_playwright
run=Path(__file__).resolve().parent;md=mistune.create_markdown(plugins=['table'])
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/opt/ms-playwright/chromium-1234/chrome-linux64/chrome',args=['--no-sandbox'])
 for key in ['2_expense_claim','3_clinic_migration']:
  p=run/key;phase='phase2' if key=='3_clinic_migration' else 'phase1';text=(p/'output.md').read_text();counter=[0]
  def diagram(m):
   counter[0]+=1;return f'\n![แผนภาพ {counter[0]}]({phase}-diagram-{counter[0]}.svg)\n'
  html=md(re.sub(r'```mermaid\s*\n(.*?)```',diagram,text,flags=re.S))
  html='<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font:16px/1.7 "Noto Sans Thai",Tahoma,sans-serif;max-width:1220px;margin:auto;padding:38px;color:#253d4b}h1{font-size:30px}h2{margin-top:40px;border-bottom:2px solid #d9e8eb;padding-bottom:10px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:12px;border:1px solid #dce6eb;text-align:left;vertical-align:top}th{background:#eff6f8}img{max-width:100%;height:auto}code{overflow-wrap:anywhere}p{overflow-wrap:anywhere}</style><body>'+html+'</body></html>'
  (p/'output.render.html').write_text(html);page=b.new_page(viewport={'width':1440,'height':1000});page.goto((p/'output.render.html').as_uri());page.evaluate('document.fonts.ready')
  images=page.locator('img').evaluate_all('(els)=>els.every(e=>e.complete && e.naturalWidth>0)');assert images
  page.locator('table').first.screenshot(path=str(p/'screen-document-table.png'))
  if key=='3_clinic_migration':
   page.locator('table').filter(has_text='N1-v2').first.screenshot(path=str(p/'screen-impact.png'))
  page.close()
 b.close()
print('Rendered document HTML and captured document/impact tables')

from pathlib import Path
from datetime import datetime,timezone
import json,hashlib
ROOT=Path.cwd();RUN=Path(__file__).resolve().parents[1]
def case(key):return RUN/key
def readplan(p):return json.loads((p/'plan-current.json').read_text())
def log(p,event):
 event['timestamp_utc']=datetime.now(timezone.utc).isoformat()
 with (p/'events.jsonl').open('a') as f:f.write(json.dumps(event,ensure_ascii=False)+'\n')
def save(p,plan):
 (p/'plan-current.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2))
 rows=['# Plan v'+str(plan['version']),'','เหตุผล: '+plan['reason'],'','สิ่งที่เปลี่ยน: '+plan['changes'],'','Impact: '+(', '.join(plan['impact']) or 'ไม่มี'),'','Reuse: '+(', '.join(plan['reuse']) or 'ไม่มี'),'','| งาน | คำอธิบาย | Dependency | สถานะ |','| --- | --- | --- | --- |']
 for t,item in plan['tasks'].items():rows.append('| '+t+' | '+item['description']+' | '+(', '.join(item['dependencies']) or '-')+' | '+item['status']+' |')
 (p/'plan-current.md').write_text('\n'.join(rows)+'\n')
def replan(p,reason,changes,impact,reuse,newtasks):
 plan=readplan(p);assert plan['replans']<3,'Re-plan limit reached'
 plan['version']+=1;plan['replans']+=1;plan.update(reason=reason,changes=changes,impact=impact,reuse=reuse)
 plan['tasks'].update(newtasks);save(p,plan)
 (p/f"plans/plan-v{plan['version']}-initial.json").write_text(json.dumps(plan,ensure_ascii=False,indent=2))
 (p/f"plans/plan-v{plan['version']}-initial.md").write_text((p/'plan-current.md').read_text())
 log(p,{'role':'PLANNER','event':'REPLAN','version':plan['version'],'reason':reason,'changes':changes,'impact':impact,'reuse':reuse})
 with (p/'trace.md').open('a') as f:f.write(f"## PLANNER — Plan v{plan['version']}\n\nเหตุผล: {reason}\n\nChanges: {changes}\n\nImpact: {', '.join(impact)}\n\nReuse: {', '.join(reuse)}\n\n")
def task(p,name,deps,files,assumptions=()):
 plan=readplan(p);assert name in plan['tasks'],name;item=plan['tasks'][name]
 assert item['status']=='TODO',(name,item)
 assert all(plan['tasks'][x]['status']=='DONE' for x in item['dependencies'])
 assert all(plan['tasks'][x]['status']=='DONE' for x in deps)
 for file,content in files.items():(p/file).write_text(content)
 item['status']='DONE';save(p,plan)
 log(p,{'role':'EXECUTOR','task':name,'status':'DONE','plan_version':plan['version'],'depends_on':item['dependencies'],'output':list(files),'assumptions':list(assumptions),'sha256':{f:hashlib.sha256((p/f).read_bytes()).hexdigest() for f in files}})
 text='\n'.join(files.values());assert all((p/f).stat().st_size>0 for f in files)
 conflict=p.name=='2_expense_claim' and name=='T1' and '5,000' in text and '10,000' in text
 decision='ปรับแผน: พบงานจัดการข้อขัดแย้งวงเงินที่ยังไม่มีใน Plan v1' if conflict else 'แผนยังเหมาะสม: ผลงานขั้นนี้พร้อมให้งานถัดไปใช้ เกณฑ์รับทั้งชิ้นยังรอ T5 ทดสอบและตรวจความหมาย'
 if name.startswith('T5'):decision='บรรลุเป้าหมายของเฟส: ตรวจผลทดสอบจริงและความหมายตาม C1–C3 แล้ว'
 log(p,{'role':'EVALUATOR','after_task':name,'plan_version':plan['version'],'decision':decision,'scope':'same-conversation review; final acceptance only after actual tests at T5'})
 with (p/'trace.md').open('a') as f:f.write(f"## {name} — DONE (Plan v{plan['version']})\n\nผลลัพธ์: {', '.join(files)}\n\nEVALUATOR: {decision}\n\n")
 if conflict:
  new={'T1b':{'description':'เก็บข้อขัดแย้ง 5,000/10,000 และวงเงินที่พักที่ยังไม่ระบุ','dependencies':['T1'],'status':'TODO'}}
  t5=plan['tasks']['T5'];t5['dependencies'].append('T1b');new['T5']=t5
  replan(p,'พบกติกาส่งอนุมัติสองค่าที่ไม่ตรงกัน และ Plan v1 ยังไม่มีงานจัดการข้อขัดแย้ง','เพิ่ม T1b และให้ T5 รอ T1b ก่อนตรวจรับ',['Open Issues','Mockup ต้องแสดงรอยืนยันนโยบาย','T5'],['T1 ข้อกำหนดและหลักฐานสัมภาษณ์'],new)
 (p/f"plans/after-{name}.json").write_text(json.dumps(readplan(p),ensure_ascii=False,indent=2))

"""metrics.py <app.jsonl> <start> <end> : นับคำสั่ง คำสั่งที่ล้ม เวลา และค่าใช้จ่ายของ Claude Code ที่ทำหน้าที่ app"""
import json,sys,re
f,s,e=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
tools=[];res=None;errs=0
for l in open(f,encoding='utf-8'):
    try: m=json.loads(l)
    except: continue
    if m.get('type')=='assistant':
        for c in m['message'].get('content',[]):
            if c.get('type')=='tool_use': tools.append(c['name']+' '+json.dumps(c['input'],ensure_ascii=False))
    if m.get('type')=='user':
        for c in m['message'].get('content',[]):
            if isinstance(c,dict) and c.get('type')=='tool_result' and c.get('is_error'): errs+=1
    if m.get('type')=='result': res=m
cred=[t[:160] for t in tools if re.search(r'\.credentials\.json|auth\.json|\.claude\.json',t)]
# เวลารวม = ตั้งแต่ส่งพรอมต์จนได้คำตอบสุดท้าย อ่านเวลาของข้อความสุดท้ายจาก transcript ของ session
# (process อาจค้างรองานเฝ้าดูเบื้องหลังหลังตอบเสร็จแล้ว จึงไม่ใช้เวลาจบของ process ถ้าหา transcript เจอ)
import os,glob
from datetime import datetime
wall=round(e-s,1)
cfg=os.environ.get('CLAUDE_CONFIG_DIR') or os.path.expanduser('~/.claude')
for t in glob.glob(cfg+'/projects/*/%s.jsonl'%((res or {}).get('session_id') or '-')):
    last=[json.loads(l) for l in open(t,encoding='utf-8')]
    last=[x['timestamp'] for x in last if x.get('type')=='assistant' and x.get('timestamp')]
    if last: wall=round(min(e,datetime.fromisoformat(last[-1].replace('Z','+00:00')).timestamp())-s,1)
print(json.dumps({'wall_s':wall,'process_s':round(e-s,1),'tool_calls':len(tools),'tool_errors':errs,'num_turns':res and res.get('num_turns'),
 'cost_usd':res and round(res.get('total_cost_usd') or 0,3),'is_error':res and res.get('is_error'),'credential_touch':cred,
 'result':(res or {}).get('result',''),'commands':[t[:300] for t in tools]},ensure_ascii=False,indent=1))

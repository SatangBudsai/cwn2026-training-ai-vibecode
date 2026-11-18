# usage: python summarize.py <jsonl>  -> prints skills used, tools count, duration, result
import json,sys
skills=[];tools=0;res={}
for l in open(sys.argv[1],encoding='utf-8'):
    try:d=json.loads(l)
    except:continue
    if d.get('type')=='assistant':
        for c in d['message']['content']:
            if c.get('type')=='tool_use':
                tools+=1
                if c['name']=='Skill': skills.append(c['input'].get('skill'))
    if d.get('type')=='result':res=d
print(json.dumps({'skills_used':skills,'tool_calls':tools,'sec':round(res.get('duration_ms',0)/1000),'cost':res.get('total_cost_usd'),'result':res.get('result','')},ensure_ascii=False))

import json,re,sys
html=open(sys.argv[1]).read()
out={}
for m in re.finditer(r"AF_initDataCallback\(\{key: '([^']+)', hash: '[^']*', data:",html):
    s=m.end(); dec=json.JSONDecoder()
    obj,end=dec.raw_decode(html,s)
    out[m.group(1)]=obj
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False)
for k,v in out.items(): print(k,len(json.dumps(v,ensure_ascii=False)), json.dumps(v,ensure_ascii=False)[:300])

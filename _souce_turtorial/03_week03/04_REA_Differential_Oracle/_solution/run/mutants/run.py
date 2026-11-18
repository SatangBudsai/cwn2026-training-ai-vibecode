import pathlib,subprocess,os,time,json,shutil,hashlib,traceback
R=pathlib.Path('/workspace/rea-flight-v4'); M=R/'mutants'; manifest=json.loads((M/'manifest.json').read_text()); outcomes={}
def run(cmd,log,env=None,cwd=None):
 with open(log,'w') as f: return subprocess.run(cmd,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
def compose(name,*args): return ['docker','compose','-p','mutation-'+name.lower(),'-f',str(M/name/'mutation-compose.yml'),*args]
def save(): (M/'outcomes.json').write_text(json.dumps(outcomes,ensure_ascii=False,indent=2))
def report():
 baseline=outcomes.get('base',{}); ba=set(baseline.get('acceptance_failed',[])); bd=set(baseline.get('differential_failed',[]))
 lines=['# Mutation testing','', 'รันทีละแอปด้วย Docker Compose ที่ http://localhost:5090; mutant แต่ละตัวเริ่มจาก v3 เดียวกันและเปลี่ยนตรรกะเพียงจุดเดียว ไม่มีการรวมบั๊ก','', 'Acceptance: 82 ข้อจาก `/workspace/rea-flight-v3/accept`; differential: 8 สถานการณ์จาก `diff/` โดยรันต้นฉบับแช่แข็งใหม่ทุกครั้ง สำเนาไฟล์ทดสอบเหมือนต้นฉบับทุกไบต์; `endpoint.cjs` เปลี่ยนเฉพาะ Playwright context baseURL จากพอร์ต 5083 เป็น 5090 โดยไม่เปลี่ยน assertion หรือ scenario','',f'ฐาน: acceptance ล้ม {len(ba)}/82 ({", ".join(sorted(ba)) or "ไม่มี"}); differential ล้ม {len(bd)}/8 ({", ".join(sorted(bd)) or "ไม่มี"})','', '“จับได้” ในตารางหมายถึงมีข้อที่ผ่านบนฐานแล้วล้มบน mutant เพื่อไม่นับปัญหาเดิมเป็นผลงานของ mutation testing','', '| mutant | บั๊กที่ใส่ | acceptance จับได้ไหม | differential จับได้ไหม |','|---|---|---|---|']
 ac=dc=rawa=rawd=0
 for v in manifest:
  o=outcomes.get(v['id'],{}); a=set(o.get('acceptance_failed',[]))-ba; d=set(o.get('differential_failed',[]))-bd
  ac+=bool(a); dc+=bool(d); rawa+=bool(o.get('acceptance_failed')); rawd+=bool(o.get('differential_failed'))
  def cell(ids,key):
   if o.get(key+'_exit')==2:return 'ERROR (ดู log)'
   return ('ได้: '+', '.join(sorted(ids))) if ids else 'ไม่ได้'
  lines.append(f"| [{v['id']}](mutants/{v['id']}) | {v['bug']} | {cell(a,'acceptance')} | {cell(d,'differential')} |")
 lines+=['',f'- Mutation score ที่หักข้อฐานล้มแล้ว: acceptance **{ac}/10 = {ac*10}%**; differential **{dc}/10 = {dc*10}%**',f'- ตามนิยามดิบ “มี test ล้มอย่างน้อย 1 ข้อ” ที่ผู้ใช้ระบุ: acceptance **{rawa}/10 = {rawa*10}%**; differential **{rawd}/10 = {rawd*10}%** (รวมข้อที่ฐานล้มอยู่แล้ว จึงอาจทำให้คะแนนสูงเกินจริง)','', 'หลักฐาน: [ผลรวม JSON](mutants/outcomes.json), [รายการการเปลี่ยนแปลง](mutants/manifest.json), [hash ของชุดทดสอบ](mutants/test-hashes.json), `mutants/runs/<base หรือ Mxx>/` เก็บผล JSON, log, screenshot, video และ GIF ของแต่ละรอบ','', 'คำสั่งทำซ้ำ: `python mutants/run.py` (ใช้เวลานานและเขียนทับหลักฐานรอบเดิม) โดย runner สั่ง `docker compose ... up -d --build` → รอ health → acceptance → differential → `down -v --remove-orphans` ใน finally ทุกแอป','']
 (R/'MUTATION.md').write_text('\n'.join(lines))
try:
 for name in ['base']+[v['id'] for v in manifest]:
  out=M/'runs'/name; out.mkdir(parents=True,exist_ok=True)
  for src,dest in [(pathlib.Path('/workspace/rea-flight-v3/accept'),out/'accept'),(R/'diff',out/'diff')]:
   dest.mkdir(exist_ok=True)
   for p in src.glob('*'):
    if p.suffix in ['.cjs','.mjs']:shutil.copy2(p,dest/p.name)
   if (src/'lib').exists():shutil.copytree(src/'lib',dest/'lib',dirs_exist_ok=True)
  for link,target in [('frozen',R/'frozen'),('node_modules',R/'node_modules')]:
   if not (out/link).exists():(out/link).symlink_to(target,target_is_directory=True)
  print(f'{name}: BUILD',flush=True); outcomes[name]={}; save()
  try:
   code=run(compose(name,'up','-d','--build'),out/'compose.log'); assert code==0,f'build exit {code}'
   for i in range(120):
    p=subprocess.run(['curl','-fsS','http://localhost:5090/api/health'],capture_output=True)
    if p.returncode==0 and b'"ok":true' in p.stdout:break
    time.sleep(2)
   else:raise RuntimeError('health timeout')
   print(f'{name}: ACCEPTANCE',flush=True)
   env=os.environ|{'BASE_URL':'http://localhost:5090','ACCEPT_WORKERS':'6'}
   a=run(['node',str(out/'accept/run.cjs')],out/'acceptance.log',env=env,cwd=R)
   aj=json.loads((out/'accept/results.json').read_text())
   outcomes[name].update(acceptance_exit=a,acceptance_failed=[x['id'] for x in aj['results'] if x['status']=='FAIL'],acceptance_total=len(aj['results']));save()
   print(f'{name}: DIFFERENTIAL (acceptance exit {a})',flush=True)
   d=run(['node','--require',str(M/'endpoint.cjs'),str(out/'diff/run.mjs'),'v3'],out/'differential.log',cwd=R)
   dj=json.loads((out/'diff/results/diff-results.json').read_text())
   outcomes[name].update(differential_exit=d,differential_failed=[k for k,v in dj['versions']['v3'].items() if v['verdict']!='ตรง'],differential_total=len(dj['versions']['v3']));save()
   print(f'{name}: DONE {json.dumps(outcomes[name])}',flush=True)
  finally:
   run(compose(name,'down','-v','--remove-orphans'),out/'cleanup.log')
  report()
 hashes=json.loads((M/'test-hashes.json').read_text()); assert all(hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h for p,h in hashes.items())
 subprocess.run(['python',str(M/'verify.py')],check=True)
 subprocess.run(['python',str(M/'summarize.py')],check=True)
 print('ALL DONE; tests unchanged; all mutant projects down',flush=True)
except Exception:
 traceback.print_exc(); save(); raise

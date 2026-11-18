# ใช้: python gen.py manifest.json [--workers 6] [--only name1,name2]
import json,subprocess,sys,os,time,threading,queue,argparse,hashlib
ap=argparse.ArgumentParser();ap.add_argument('manifest');ap.add_argument('--workers',type=int,default=6);ap.add_argument('--only',default='');ap.add_argument('--force',action='store_true');a=ap.parse_args()
W='C:/t/spa04/imgwork';CY='C:/Users/oishi/bin/cyolo.cmd'
jobs=json.load(open(a.manifest,encoding='utf-8'))
only=set(x for x in a.only.split(',') if x)
if only: jobs=[j for j in jobs if j['name'] in only]
q=queue.Queue();[q.put(j) for j in jobs]
lock=threading.Lock()
def log(*x):
    with lock:
        print(time.strftime('%H:%M:%S'),*x,flush=True)
TPL="""Generate exactly one image with your built-in image generation tool, then save the final image file to this exact absolute path (create folders if needed): {out}

Image brief:
{prompt}

Rules: aspect {size}. Do not run any git command (no add/commit/push). Do not create or modify any other file. Do not ask questions. After saving, reply with just: SAVED.
"""
def run(j):
    out=j['out'];
    if os.path.exists(out) and os.path.getsize(out)>20000 and not a.force:
        log('SKIP',j['name']);return
    pf=f"{W}/jobs/{j['name'].replace('/','_')}.txt"
    open(pf,'w',encoding='utf-8').write(TPL.format(out=out,prompt=j['prompt'],size=j.get('size','3:2 landscape')))
    for att in range(3):
        t=time.time()
        cmd=[CY,'exec','--skip-git-repo-check']
        for r in j.get('refs',[]): cmd+=['-i',r]
        cmd+=['-']
        try:
            with open(pf,'rb') as f, open(f"{W}/logs/{j['name'].replace('/','_')}.log",'wb') as lf:
                subprocess.run(cmd,stdin=f,stdout=lf,stderr=subprocess.STDOUT,cwd=W,timeout=900,shell=False)
        except Exception as e:
            log('ERR',j['name'],str(e)[:120])
        if os.path.exists(out) and os.path.getsize(out)>20000:
            log('OK',j['name'],f"{time.time()-t:.0f}s",os.path.getsize(out)//1024,'KB');return
        log('RETRY',j['name'],att)
    log('FAIL',j['name'])
def worker():
    while True:
        try:j=q.get_nowait()
        except queue.Empty:return
        run(j)
th=[threading.Thread(target=worker) for _ in range(a.workers)];[t.start() for t in th];[t.join() for t in th]
log('DONE-ALL',a.manifest)

#!/usr/bin/env node
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {cases,setup}=require('./suite.cjs');
const root=__dirname;
const baseURL=process.env.BASE_URL;
if(!baseURL){console.error('Usage: BASE_URL=http://localhost:5082 node accept/run.cjs');process.exit(2);}
const report=process.env.ACCEPT_REPORT || 'REPORT.md';
if(report==='BASELINE.md'&&new URL(baseURL).port!=='5082')throw Error('BASELINE.md requires v2 port 5082');
const exec=(cmd,args)=>new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',c=>c?reject(Error(err)):resolve());});
(async()=>{
 for(const dir of ['video','gif','screenshots','evidence'])await fs.mkdir(path.join(root,dir),{recursive:true});
 const browser=await chromium.launch({headless:true});let cursor=0;const results=[];
 async function worker(){while(cursor<cases.length){const c=cases[cursor++];const started=Date.now();const context=await browser.newContext({baseURL,viewport:{width:1366,height:900},locale:'th-TH',timezoneId:'Asia/Bangkok',recordVideo:{dir:path.join(root,'video'),size:{width:1366,height:900}}});const page=await context.newPage();page.setDefaultTimeout(3500);page.setDefaultNavigationTimeout(15000);let error=null;
 // Prevent leaving the booking app; no login, payment, or seller continuation.
 await context.route('**/*',route=>{const req=route.request();if(req.isNavigationRequest()&&new URL(req.url()).origin!==new URL(baseURL).origin)return route.abort();return route.continue();});
 try{await setup(page,c.scope);await c.run(page);}catch(e){error=e.message;}
 // Keep the actual final application state visible for a full 3 seconds, even after failure.
 await page.waitForTimeout(3000);
 await page.screenshot({path:path.join(root,'screenshots',c.id+'.png')});
 await fs.writeFile(path.join(root,'evidence',c.id+'.txt'),await page.locator('body').ariaSnapshot());
 const video=page.video();await context.close();const src=await video.path();const destination=path.join(root,'video',c.id+'.webm');await fs.rename(src,destination);
 let artifactError=null;try{await exec('ffmpeg',['-hide_banner','-loglevel','error','-threads','1','-y','-i',destination,'-filter_complex_threads','1','-filter_complex','fps=5,scale=684:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer','-loop','0',path.join(root,'gif',c.id+'.gif')]);}catch(e){artifactError=e.message;}
 const r={id:c.id,title:c.title,status:error?'FAIL':'PASS',reason:error||'พฤติกรรมตรงตามเกณฑ์ที่ระบุ',artifactError,durationMs:Date.now()-started};results.push(r);console.log(`${r.id} ${r.status} ${r.title}${error?' — '+error.split('\n')[0]:''}`);
 }}
 await Promise.all(Array.from({length:Number(process.env.ACCEPT_WORKERS||3)},worker));await browser.close();results.sort((a,b)=>a.id.localeCompare(b.id));
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify({baseURL,runAt:new Date().toISOString(),results},null,2));
 const pass=results.filter(r=>r.status==='PASS').length;
 await require('./report.cjs').writeReport({root,report,baseURL,results});console.log(`TOTAL ${results.length} PASS ${pass} FAIL ${results.length-pass}`);process.exitCode=results.some(r=>r.artifactError)?2:results.some(r=>r.status==='FAIL')?1:0;
})().catch(e=>{console.error(e);process.exit(2)});

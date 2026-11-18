// GIF แอนิเมชันของ LAB 0 (เปิดบริษัทจาก compose.yml → Gitea) และ LAB 2 (รวม skill → push → Gitea)
// วาดเป็น HTML ที่มีไทม์ไลน์ + เคอร์เซอร์ แล้วถ่ายทีละเฟรมด้วย Chromium ก่อนต่อเป็น GIF ด้วย ffmpeg
// ภาพหน้าเว็บในฉาก Gitea เป็นภาพหน้าจอจริงจากบริษัทจำลอง (localhost:3300)
// node lab-gifs.mjs <shots-dir> <out-dir> <chromium.exe>
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
const [,, shots, out, exe] = process.argv;
const img = f => `data:image/png;base64,${readFileSync(join(shots, f)).toString('base64')}`;
const FPS = 10;

const base = `*{box-sizing:border-box}body{margin:0;width:1280px;height:720px;overflow:hidden;font-family:'Leelawadee UI','Segoe UI',sans-serif;background:#1e1e1e}
.scene{position:absolute;inset:0;opacity:0;transition:none}
.cap{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);background:#0B2545ee;color:#fff;font-size:30px;font-weight:700;padding:12px 26px;border-radius:16px;white-space:nowrap;box-shadow:0 6px 20px #0006;opacity:0}
.cap small{display:block;font-size:20px;font-weight:400;opacity:.9;text-align:center}
#cur{position:absolute;width:34px;height:34px;z-index:99;pointer-events:none;filter:drop-shadow(0 2px 3px #0008)}
.ring{position:absolute;width:44px;height:44px;border:4px solid #f59e0b;border-radius:50%;z-index:98;opacity:0}
.browser{position:absolute;inset:0;background:#dee1e6}
.bar{height:46px;display:flex;align-items:center;gap:10px;padding:0 14px}
.dots span{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px}
.url{flex:1;background:#fff;border-radius:18px;height:30px;display:flex;align-items:center;padding:0 16px;font-size:17px;color:#333;font-family:Consolas,monospace}
.page{position:absolute;top:46px;left:0;right:0;bottom:0;overflow:hidden;background:#fff}
.page img{width:1280px;display:block}
.hl{position:absolute;border:4px solid #f59e0b;border-radius:10px;box-shadow:0 0 0 9999px #0003;opacity:0}`;
const cursorSvg = `<svg id="cur" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg><div class="ring" id="ring"></div>`;
// ไทม์ไลน์: scenes [id, from, to] · caps [id, from, to] · cursor [[t,x,y,click?]] · show [[selector, from, to]]
const runtime = (tl) => `<script>
const TL=${JSON.stringify(tl)};
function lerp(a,b,k){return a+(b-a)*k}
function ease(k){return k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2}
window.render=function(t){
  const vis=(f,to)=>t>=f&&t<to;
  const fade=(f,to)=>Math.max(0,Math.min(1,(t-f)/.35,(to-t)/.35));
  for(const [id,f,to] of TL.scenes){document.getElementById(id).style.opacity=fade(f,to)}
  for(const [id,f,to] of TL.show){for(const el of document.querySelectorAll(id)){el.style.opacity=vis(f,to)?Math.min(1,(t-f)/.25):0}}
  for(const [id,f,to] of TL.type){const el=document.getElementById(id);const full=el.dataset.full;const k=Math.max(0,Math.min(1,(t-f)/(to-f)));el.textContent=full.slice(0,Math.round(full.length*k))}
  const C=TL.cursor;let p=C[0];for(let i=0;i<C.length-1;i++){if(t>=C[i][0]&&t<=C[i+1][0]){const k=ease((t-C[i][0])/(C[i+1][0]-C[i][0]));p=[t,lerp(C[i][1],C[i+1][1],k),lerp(C[i][2],C[i+1][2],k)];break}if(t>C[i+1][0])p=C[i+1]}
  const cur=document.getElementById('cur');cur.style.left=p[1]+'px';cur.style.top=p[2]+'px';
  const ring=document.getElementById('ring');let r=0;for(const c of C){if(c[3]&&t>=c[0]&&t<c[0]+.45){r=1-(t-c[0])/.45;ring.style.left=(c[1]-14)+'px';ring.style.top=(c[2]-14)+'px'}}ring.style.opacity=r;ring.style.transform='scale('+(1.6-r*.6)+')';
  for(const [sel,y0,y1,f,to] of (TL.scroll||[])){const el=document.querySelector(sel);const k=ease(Math.max(0,Math.min(1,(t-f)/(to-f))));el.style.transform='translateY(-'+lerp(y0,y1,k)+'px)'}
}
</script>`;
const browser = (id, url, inner) => `<div class="scene browser" id="${id}"><div class="bar"><div class="dots"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span></div><div class="url">${url}</div></div><div class="page">${inner}</div></div>`;

// ---------- LAB 0: เปิดบริษัทจาก compose.yml ----------
const compose = `<span class="c"># บริษัทจำลองโนวาเทค: Gitea + CI runner + seed พนักงาน 28 คน</span>
name: <b>novatech</b>
services:
  <b class="svc" data-n="1">gitea:</b>     <span class="c"># 🌐 คลังกลาง http://localhost:3300</span>
    image: gitea/gitea:1.24
  <b class="svc" data-n="2">init:</b>      <span class="c"># สร้างผู้ดูแลระบบ (ครั้งเดียว)</span>
  <b class="svc" data-n="3">runner:</b>    <span class="c"># ⚙️ ด่านตรวจ CI (ใช้ใน LAB 6)</span>
    image: gitea/act_runner:0.2.11
  <b class="svc" data-n="4">seed:</b>      <span class="c"># สร้างองค์กร 12 ทีม พนักงาน 28 คน 28 โต๊ะ</span>
    image: node:22-alpine
  <b class="svc" data-n="5">cleanup:</b>   <span class="c"># 🧹 ลบตัวช่วยที่ทำงานเสร็จแล้ว</span>`;
const lab0 = `<html><head><meta charset="utf-8"><style>${base}
.vs{position:absolute;inset:0;background:#1e1e1e;color:#d4d4d4}
.title{height:34px;background:#323233;color:#ccc;font-size:15px;display:flex;align-items:center;justify-content:center}
.side{position:absolute;top:34px;left:0;width:290px;bottom:0;background:#252526;font-size:18px;padding-top:8px}
.side .h{font-size:13px;letter-spacing:1px;color:#bbb;padding:6px 16px}
.side .f{padding:5px 16px;font-family:Consolas,monospace;color:#ddd}
.side .f.sel{background:#094771;color:#fff}
.ed{position:absolute;top:34px;left:290px;right:0;bottom:0}
.tab{height:38px;background:#2d2d2d;display:flex}.tab span{background:#1e1e1e;color:#fff;padding:9px 18px;font-family:Consolas,monospace;font-size:16px}
pre{margin:0;padding:14px 22px;font-family:Consolas,monospace;font-size:19px;line-height:1.55;color:#9cdcfe}
pre .c{color:#6a9955} pre b{color:#569cd6;font-weight:400}
.menu{position:absolute;left:190px;top:330px;width:300px;background:#2d2d30;border:1px solid #454545;border-radius:6px;font-size:17px;color:#ddd;padding:6px 0;box-shadow:0 8px 24px #0009;opacity:0;z-index:50}
.menu div{padding:7px 18px}.menu .on{background:#094771;color:#fff}
.term{position:absolute;left:290px;right:0;bottom:0;height:300px;background:#181818;border-top:1px solid #444;font-family:Consolas,monospace;font-size:18px;color:#ccc;padding:10px 20px;opacity:0;line-height:1.55;white-space:pre}
.term .ok{color:#4ec9b0}.term .gr{color:#888}
.final{position:absolute;inset:0;background:#0B2545;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;opacity:0}
.final b{font-size:52px}.final span{font-size:28px;opacity:.9}
</style></head><body>
<div class="scene vs" id="s1"><div class="title">novatech — VS Code</div>
<div class="side"><div class="h">EXPLORER · NOVATECH</div><div class="f">▸ company-kit/</div><div class="f">▸ desks/</div><div class="f">▸ people/</div><div class="f">▸ seed/</div><div class="f sel" id="fcompose">🐳 compose.yml</div></div>
<div class="ed"><div class="tab"><span>compose.yml</span></div><pre>${compose}</pre></div>
<div class="menu" id="menu"><div>Open to the Side</div><div>Copy Path</div><div class="on">▶ Compose Up</div><div>Compose Down</div><div>Compose Restart</div></div>
<div class="term" id="term"><span class="gr">&gt; docker compose -f "compose.yml" up -d</span>
<span id="t1" data-full=" ✔ novatech-gitea     Healthy    ← คลังกลาง"></span>
<span id="t2" data-full=" ✔ novatech-init      Exited     ← สร้างแอดมิน"></span>
<span id="t3" data-full=" ✔ novatech-seed      Exited     ← 28 คน · 12 ทีม · 28 โต๊ะ"></span>
<span id="t4" data-full=" ✔ novatech-runner    Started    ← ด่านตรวจ CI"></span>
<span id="t5" data-full=" ✔ novatech-cleanup   ลบ init · seed · ตัวเอง"></span>
<span class="gr" id="t6" data-full="&gt; docker compose ps   →  novatech-gitea Up (healthy) · novatech-runner Up"></span></div></div>
${browser('s2', 'localhost:3300/novatech', `<img src="${img('lab0-org.png')}"><div class="hl" id="hm" style="left:358px;top:172px;width:132px;height:34px"></div><div class="hl" id="ht" style="left:500px;top:172px;width:110px;height:34px"></div>`)}
${browser('s3', 'localhost:3300/org/novatech/teams', `<img id="tm" src="${img('lab0-teams.png')}">`)}
${browser('s4', 'localhost:3300/org/novatech/members', `<img src="${img('members-list.png')}" style="width:1280px">`)}
<div class="final" id="s5"><b>🏢 บริษัทพร้อมแล้ว</b><span>2 container ทำงานตลอด · 28 คน · 12 ทีม · 28 โต๊ะ · ยังไม่มี repo</span><span>→ LAB 1 ทุกคนเก็บความเก่งเป็น skill</span></div>
<div class="cap" id="c1">① compose.yml = ใบสั่งตั้งบริษัท<small>5 container: gitea · init · runner · seed · cleanup</small></div>
<div class="cap" id="c2">② คลิกขวา → Compose Up<small>ใน VS Code (ส่วนขยาย Docker) = docker compose up -d</small></div>
<div class="cap" id="c3">③ ตัวช่วย 3 ตัวทำงานครั้งเดียวแล้วหายไป<small>เหลือทำงานตลอด 2 ตัว: gitea + runner</small></div>
<div class="cap" id="c4">④ เปิด localhost:3300 = เว็บของบริษัท<small>องค์กร โนวาเทค · ยังไม่มี repository</small></div>
<div class="cap" id="c5">Members 29 = พนักงาน 28 คน + แอดมิน<small>Teams 13 = 11 แผนก + leads + Owners</small></div>
<div class="cap" id="c6">⑤ ทีมใน Gitea = แผนกในบริษัท<small>ผู้บริหาร · Sales · SA · Product · Dev · QA · DevOps · ML · ทีมกลาง · HR · บัญชี</small></div>
<div class="cap" id="c7">⑥ 1 บัญชี = 1 พนักงาน = 1 โต๊ะใน desks/<small>เปิด Claude Code ที่โต๊ะไหน = ทำงานในนามคนนั้น</small></div>
${cursorSvg}${runtime({
  scenes: [['s1', 0, 7.6], ['s2', 7.4, 11.6], ['s3', 11.4, 14.2], ['s4', 14.0, 16.8], ['s5', 16.6, 19]],
  show: [['#c1', 0.2, 2.6], ['#c2', 2.6, 4.6], ['#c3', 4.6, 7.4], ['#c4', 7.6, 9.4], ['#c5', 9.4, 11.4], ['#hm', 9.4, 11.4], ['#ht', 10.4, 11.4], ['#c6', 11.6, 14.0], ['#c7', 14.2, 16.6], ['#menu', 2.9, 4.4], ['#term', 4.3, 7.6]],
  type: [['t1', 4.5, 4.9], ['t2', 5.0, 5.4], ['t3', 5.5, 5.9], ['t4', 6.0, 6.4], ['t5', 6.5, 6.9], ['t6', 7.0, 7.4]],
  scroll: [['#tm', 0, 700, 12.0, 13.8]],
  cursor: [[0, 700, 420], [1.8, 120, 214], [2.7, 120, 214, 1], [3.4, 260, 410], [3.9, 260, 410, 1], [4.4, 900, 600], [7.6, 900, 600], [9.0, 430, 236], [9.5, 430, 236, 1], [10.4, 560, 236], [10.8, 560, 236, 1], [11.6, 640, 400], [14.2, 640, 400], [15.4, 320, 420], [16.8, 320, 420], [19, 1150, 680]],
})}</body></html>`;

// ---------- LAB 2: รวม skill → push → Gitea ----------
const desks = ['sales-nida', 'md-somchai', 'fin-joy', 'hr-fah', 'ml-jay'];
const lab2 = `<html><head><meta charset="utf-8"><style>${base}
.flow{position:absolute;inset:0;background:#f8fafc}
.dk{position:absolute;left:60px;width:250px;height:64px;background:#fef9c3;border:3px solid #f59e0b;border-radius:12px;font-family:Consolas,monospace;font-size:20px;display:flex;align-items:center;padding-left:14px;color:#9a3412}
.chip{position:absolute;width:150px;height:40px;background:#facc15;border-radius:8px;font-family:Consolas,monospace;font-size:17px;display:flex;align-items:center;justify-content:center;color:#713f12;font-weight:700}
.box{position:absolute;left:640px;top:90px;width:580px;height:470px;background:#fff;border:4px solid #0B2545;border-radius:18px;padding:0}
.box .bh{background:#0B2545;color:#fff;font-family:Consolas,monospace;font-size:22px;padding:10px 16px}
.box .r{font-family:Consolas,monospace;font-size:20px;padding:6px 18px;color:#1e3a8a}
.ken{position:absolute;left:420px;top:280px;font-size:22px;text-align:center;color:#0B2545;font-weight:700}
.ken div{font-size:70px}
.term{position:absolute;inset:0;background:#181818;font-family:Consolas,monospace;font-size:22px;color:#ccc;padding:40px 50px;line-height:1.7;white-space:pre}
.term .ok{color:#4ec9b0}.term .bad{color:#f48771}.term .gr{color:#888}
</style></head><body>
<div class="scene flow" id="s1">
${desks.map((d, i) => `<div class="dk" style="top:${90 + i * 92}px">💻 ${d}/</div><div class="chip" id="k${i}" style="left:${190}px;top:${100 + i * 92}px">SKILL.md</div>`).join('')}
<div class="ken"><div>🧹</div>plat-ken<br><span style="font-weight:400;font-size:18px">อ่านอย่างเดียว</span></div>
<div class="box"><div class="bh">desks/plat-ken/org-skills/</div>
<div class="r">.claude-plugin/marketplace.json</div><div class="r">plugins/core/ ⭐ ทุกคน</div><div class="r">plugins/shared/</div><div class="r">plugins/sales/ · exec/ · finance/</div><div class="r">plugins/hr/ · mlops/ · sa/ · dev/ …</div><div class="r">.gitea/CODEOWNERS</div><div class="r">scripts/build.py</div></div></div>
<div class="scene term" id="s2"><span class="gr">plat-ken@novatech:~/org-skills$</span> git push origin main
<span id="p1" data-full="remote: . Processing 1 references"></span>
<span id="p2" data-full="remote: Processed 1 references in total"></span>
<span class="ok" id="p3" data-full="To http://localhost:3300/novatech/org-skills.git"></span>
<span class="ok" id="p4" data-full=" * [new branch]      main -> main"></span></div>
${browser('s3', 'localhost:3300/novatech/org-skills', `<img src="${img('repo.png')}" style="width:1280px">`)}
${browser('s4', 'localhost:3300/novatech/org-skills/src/branch/main/plugins', `<img src="${img('plugins.png')}" style="width:1280px">`)}
${browser('s5', 'localhost:3300/novatech/org-skills/src/branch/main/.gitea/CODEOWNERS', `<img src="${img('codeowners.png')}" style="width:1280px">`)}
<div class="scene term" id="s6"><span class="gr">plat-ken@novatech:~/org-skills$</span> git push origin main   <span class="gr"># ลอง push ตรงเข้า main</span>
<span class="bad" id="q1" data-full="remote: error: Not allowed to push to protected branch main"></span>
<span class="bad" id="q2" data-full=" ! [remote rejected] main -> main (pre-receive hook declined)"></span></div>
<div class="cap" id="c1">① plat-ken ดูด skill จากทุกโต๊ะ<small>อ่านอย่างเดียว ไม่แก้ของใคร</small></div>
<div class="cap" id="c2">② จัดเป็นคลังเดียว org-skills<small>1 แผนก = 1 plugin · ของที่ทุกคนใช้อยู่ใน core</small></div>
<div class="cap" id="c3">③ push ขึ้น Gitea</div>
<div class="cap" id="c4">④ repo novatech/org-skills บน Gitea<small>ของจริงมีที่เดียว ทุกโต๊ะดึงไปติดตั้งได้</small></div>
<div class="cap" id="c5">plugins/ = แพ็กของแต่ละแผนก<small>core · shared · dev · devops · exec · finance · hr · mlops · qa · sa · sales</small></div>
<div class="cap" id="c6">CODEOWNERS = ใครรีวิวโฟลเดอร์ไหน<small>plugins/sales/ → @sales-nida · plugins/dev/ → @dev-pond</small></div>
<div class="cap" id="c7">⑤ main มียาม: push ตรงถูกปฏิเสธ<small>ต้องผ่าน PR + approve อย่างน้อย 1 คน</small></div>
${cursorSvg}${runtime({
  scenes: [['s1', 0, 3.4], ['s2', 3.2, 5.0], ['s3', 4.8, 7.2], ['s4', 7.0, 8.8], ['s5', 8.6, 10.4], ['s6', 10.2, 12.4]],
  show: [['#c1', 0.1, 1.6], ['#c2', 1.6, 3.2], ['#c3', 3.4, 4.8], ['#c4', 5.0, 7.0], ['#c5', 7.2, 8.6], ['#c6', 8.8, 10.2], ['#c7', 10.4, 12.4]],
  type: [['p1', 3.6, 3.9], ['p2', 3.9, 4.2], ['p3', 4.2, 4.5], ['p4', 4.5, 4.8], ['q1', 10.6, 11.2], ['q2', 11.2, 11.8]],
  cursor: [[0, 1100, 650], [4.8, 1100, 650], [6.0, 60, 410], [6.6, 60, 410, 1], [7.0, 60, 410], [8.4, 820, 560], [10.4, 820, 560], [12.4, 1150, 680]],
})}
<script>
// skill ลอยจากโต๊ะเข้าคลัง
const _r=window.render;window.render=function(t){_r(t);for(let i=0;i<5;i++){const el=document.getElementById('k'+i);const s=.2+i*.25,e=s+1.1;const k=Math.max(0,Math.min(1,(t-s)/(e-s)));const x=190+(700-190)*k,y=100+i*92+((200+i*50)-(100+i*92))*k;el.style.left=x+'px';el.style.top=y+'px';el.style.opacity=k>=1?0:1}}
</script></body></html>`;

const b = await chromium.launch({ executablePath: exe });
for (const [name, html, T] of [['lab0-company-intro', lab0, 19], ['lab2-push-flow', lab2, 12.4]]) {
  const fr = join(out, name + '-frames'); rmSync(fr, { recursive: true, force: true }); mkdirSync(fr, { recursive: true });
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await pg.setContent(html); await pg.waitForTimeout(300);
  const n = Math.round(T * FPS);
  for (let i = 0; i <= n; i++) {
    await pg.evaluate(t => window.render(t), i / FPS);
    await pg.screenshot({ path: join(fr, `f${String(i).padStart(4, '0')}.png`) });
  }
  await pg.close();
  const gif = join(out, name + '.gif');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(fr, 'f%04d.png'),
    '-vf', 'scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', gif]);
  console.log(name, n + 1, 'frames', T + 's');
}
await b.close();

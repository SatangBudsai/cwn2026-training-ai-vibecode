// GIF เล่าเรื่องจากภาพหน้าจอจริง: แต่ละฉากมีภาพ + คำบรรยายไทย + กรอบไฮไลต์ + ซูมช้า ๆ ไปที่จุดสำคัญ (ใช้กับ LAB 0)
// spec: { "w":1280, "h":720, "scenes":[ { "img":"a.png", "dur":4, "title":"...", "sub":"...", "hl":[[x,y,w,h],...], "zoom":[x,y,w,h], "browser":"http://..." } ] }
//   hl / zoom ใช้พิกัดของภาพต้นฉบับ · zoomInstant = ซูมค้างตั้งแต่ต้นฉาก (ใช้กับภาพต่อเนื่องจาก terminal) · browser = ใส่กรอบเบราว์เซอร์พร้อม URL · ไม่มี title = ไม่มีแถบคำบรรยาย (ใช้กับภาพแนวคิดเต็มจอ)
// node story-gif.mjs <spec.json> <out.gif> <chromium.exe>
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
const [,, specFile, outGif, exe] = process.argv;
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
const base = dirname(resolve(specFile));
const W = spec.w || 1280, H = spec.h || 720, FPS = spec.fps || 8;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const b64 = f => `data:image/png;base64,${readFileSync(resolve(base, f)).toString('base64')}`;
const sizeOf = f => { const b = readFileSync(resolve(base, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

let t0 = 0;
const scenes = spec.scenes.map((s, i) => { const [iw, ih] = sizeOf(s.img); const o = { ...s, i, iw, ih, from: t0, to: t0 + s.dur }; t0 += s.dur; return o; });
const total = t0;
const html = `<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#0B2545;font-family:'Leelawadee UI','Segoe UI',sans-serif}
.sc{position:absolute;inset:0;opacity:0}.view{position:absolute;overflow:hidden;background:#fff}
.view img{position:absolute;left:0;top:0;transform-origin:0 0}
.bar{position:absolute;left:0;right:0;top:0;height:40px;background:#dee1e6;display:flex;align-items:center;gap:10px;padding:0 14px}
.bar i{width:11px;height:11px;border-radius:50%;display:inline-block}.url{flex:1;background:#fff;border-radius:16px;height:26px;display:flex;align-items:center;padding:0 14px;font:15px Consolas,monospace;color:#333}
.hl{position:absolute;border:4px solid #f59e0b;border-radius:10px;box-shadow:0 0 0 3px #fff8,0 0 18px #f59e0b;opacity:0}
.cap{position:absolute;left:24px;right:24px;bottom:18px;background:#0B2545ee;color:#fff;border-radius:16px;padding:12px 22px;box-shadow:0 6px 20px #0006;opacity:0}
.cap b{display:block;font-size:27px}.cap span{display:block;font-size:19px;opacity:.92;margin-top:3px;line-height:1.45}
.step{position:absolute;top:14px;right:18px;background:#f59e0b;color:#0B2545;font-weight:700;font-size:18px;border-radius:14px;padding:4px 14px;opacity:0}
</style></head><body>
${scenes.map(s => {
  const top = s.browser ? 40 : 0; const vw = W, vh = H - top;
  return `<div class="sc" id="s${s.i}"><div class="view" style="left:0;top:${top}px;width:${vw}px;height:${vh}px"><img id="im${s.i}" src="${b64(s.img)}" width="${s.iw}" height="${s.ih}">
  ${(s.hl || []).map((r, k) => `<div class="hl" id="h${s.i}_${k}"></div>`).join('')}</div>
  ${s.browser ? `<div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><div class="url">${esc(s.browser)}</div></div>` : ''}
  ${s.title ? `<div class="cap" id="c${s.i}"><b>${esc(s.title)}</b>${s.sub ? `<span>${esc(s.sub)}</span>` : ''}</div>` : ''}
  ${s.step ? `<div class="step" id="st${s.i}">${esc(s.step)}</div>` : ''}</div>`;
}).join('')}
<script>
const S=${JSON.stringify(scenes.map(s => ({ i: s.i, from: s.from, to: s.to, iw: s.iw, ih: s.ih, hl: s.hl || [], zoom: s.zoom, zi: !!s.zoomInstant, top: s.browser ? 40 : 0, cut: !!s.cut })))};
const W=${W},H=${H};
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
window.render=function(t){
  for(const s of S){
    const el=document.getElementById('s'+s.i);
    const on=t>=s.from-0.001&&t<s.to+0.45;
    el.style.opacity=on?(s.i===0?1:Math.min(1,(t-s.from)/.45)):0;
    el.style.zIndex=s.i;
    const vh=H-s.top;
    let sc=Math.max(W/s.iw, vh/s.ih), x=-(s.iw*sc-W)/2, y=0;
    if(s.zoom){const [zx,zy,zw,zh]=s.zoom;const k=s.zi?1:ease(Math.max(0,Math.min(1,(t-s.from-.5)/.9)));
      const zs=Math.min(W/zw, vh/zh);const tx=-(zx*zs)+(W-zw*zs)/2, ty=-(zy*zs)+(vh-zh*zs)/2;
      sc=sc+(zs-sc)*k; x=x+(tx-x)*k; y=y+(ty-y)*k;}
    const im=document.getElementById('im'+s.i); im.style.transform='translate('+x+'px,'+y+'px) scale('+sc+')';
    s.hl.forEach((r,k)=>{const h=document.getElementById('h'+s.i+'_'+k);h.style.left=(x+r[0]*sc-6)+'px';h.style.top=(y+r[1]*sc-6)+'px';h.style.width=(r[2]*sc+12)+'px';h.style.height=(r[3]*sc+12)+'px';
      h.style.opacity=Math.max(0,Math.min(1,(t-s.from-1.0-k*.5)/.3));});
    const c=document.getElementById('c'+s.i); if(c) c.style.opacity=Math.max(0,Math.min(1,(t-s.from-.3)/.35));
    const st=document.getElementById('st'+s.i); if(st) st.style.opacity=Math.max(0,Math.min(1,(t-s.from-.2)/.3));
  }
};
</script></body></html>`;
const fr = outGif.replace(/\.gif$/, '-frames'); rmSync(fr, { recursive: true, force: true }); mkdirSync(fr, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const pg = await b.newPage({ viewport: { width: W, height: H } });
await pg.setContent(html, { waitUntil: 'load' });
const n = Math.round(total * FPS);
for (let k = 0; k <= n; k++) { await pg.evaluate(t => window.render(t), k / FPS); await pg.screenshot({ path: join(fr, `f${String(k).padStart(4, '0')}.png`) }); }
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(fr, 'f%04d.png'),
  '-vf', `scale=${spec.outW || 1100}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${spec.colors || 160}:stats_mode=diff[p];[b][p]paletteuse=dither=${spec.dither || 'none'}`, outGif]);
rmSync(fr, { recursive: true, force: true });
console.log(outGif, total.toFixed(1) + 's');

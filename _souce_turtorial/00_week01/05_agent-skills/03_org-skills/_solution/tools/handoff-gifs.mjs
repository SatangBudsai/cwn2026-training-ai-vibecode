// GIF "ส่งต่องานทีละโต๊ะ" ของ LAB 4 และ LAB 5: แต่ละขั้นแสดง input (พรอมต์ + ไฟล์ที่อ่าน) → skill ที่ Claude หยิบเอง → output (ไฟล์ที่ได้ + ข้อความสำคัญ) → ผล
// ข้อความทั้งหมดมาจาก log ของรอบรันจริง (เขียนไว้ใน spec JSON) · ภาพประกอบตัดจากภาพแนวคิดที่สร้างด้วย image gen
// node handoff-gifs.mjs <spec.json> <out-dir> <chromium.exe>
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
const [,, specFile, out, exe] = process.argv;
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
const base = dirname(resolve(specFile));
const FPS = 10;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = f => `data:image/${/\.jpe?g$/i.test(f) ? 'jpeg' : 'png'};base64,${readFileSync(resolve(base, f)).toString('base64')}`;
const KIND = { ok: ['#dcfce7', '#166534', '✅'], bad: ['#fee2e2', '#991b1b', '❌'], warn: ['#fef9c3', '#854d0e', '⚠️'], info: ['#e0e7ff', '#3730a3', '➡️'] };

function page(s, i, n) {
  const [vbg, vfg, vic] = KIND[s.verdict.kind] || KIND.info;
  const dots = Array.from({ length: n }, (_, k) => `<span class="dot ${k < i ? 'done' : k === i ? 'now' : ''}">${k + 1}</span>`).join('<i></i>');
  // art = ตัดส่วนหนึ่งของภาพแนวคิด: cx, cy = จุดกลาง (พิกเซลของภาพต้นฉบับ) · w = ความกว้างของภาพต้นฉบับ · zoom = ขยาย
  // portrait = ภาพบุคคลของเจ้าของโต๊ะ (img/people/<user>.jpg) แสดงกลางภาพแทนภาพแนวคิด และเป็นรูปเล็กบนแถบบน
  const art = s.portrait ? `<div class="art" style="background:url(${img(s.portrait)}) center/cover"></div>` : s.art ? (() => { const W = s.art.w * s.art.zoom; const x = 150 - s.art.cx * s.art.zoom, y = 125 - s.art.cy * s.art.zoom;
    return `<div class="art" style="background-image:url(${img(s.art.file)});background-size:${W}px auto;background-position:${x}px ${y}px;background-repeat:no-repeat;background-color:#fff"></div>`; })() : '';
  return `<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1280px;height:720px;overflow:hidden;font-family:'Leelawadee UI','Segoe UI',sans-serif;background:#f6f7fb;color:#0B2545}
.top{height:86px;background:#0B2545;color:#fff;display:flex;align-items:center;padding:0 30px;gap:22px}
.top .lab{font-size:22px;opacity:.85}.top .who{font-size:32px;font-weight:700}.top .role{font-size:20px;background:${s.color};color:#0B2545;border-radius:14px;padding:4px 14px;font-weight:700}
.top .sp{flex:1}.av{width:58px;height:58px;border-radius:50%;background-size:cover;background-position:center;border:3px solid #fff}.dots{display:flex;align-items:center}.dots i{width:22px;height:3px;background:#ffffff55}
.dot{width:34px;height:34px;border-radius:50%;border:2px solid #ffffff88;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700}
.dot.done{background:#22c55e;border-color:#22c55e}.dot.now{background:#f59e0b;border-color:#f59e0b;color:#0B2545}
.col{position:absolute;top:110px;bottom:118px;border-radius:20px;background:#fff;box-shadow:0 4px 18px #0B254518;padding:18px 22px;opacity:0}
.in{left:24px;width:440px}.mid{left:484px;width:300px;background:transparent;box-shadow:none;padding:0;text-align:center}.outc{left:804px;width:452px}
h3{margin:0 0 12px;font-size:22px;display:flex;gap:8px;align-items:center}
.prompt{background:#eef2ff;border-left:5px solid #4f46e5;border-radius:10px;padding:12px 14px;font-size:18.5px;line-height:1.6;min-height:110px}
.reads{margin-top:12px;font-size:16.5px;line-height:1.7}.reads div{opacity:0}.reads b{color:#4f46e5}
.art{width:300px;height:250px;border-radius:18px;margin:0 auto 14px;box-shadow:0 4px 14px #0B254522;opacity:0}
.chip{display:inline-block;background:#0B2545;color:#fde68a;font-family:Consolas,monospace;font-size:20px;font-weight:700;padding:10px 16px;border-radius:14px;opacity:0;box-shadow:0 0 0 0 #f59e0b}
.chipcap{font-size:16px;color:#555;margin-top:8px;opacity:0}.arrow{font-size:46px;color:#94a3b8;margin-top:6px;opacity:0}
.files>div{opacity:0;margin-bottom:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 12px}
.files .fn{font-family:Consolas,monospace;font-size:16px;color:#0f766e;font-weight:700}.files .nt{font-size:16.5px;line-height:1.5;margin-top:2px}
.verdict{position:absolute;left:24px;right:24px;bottom:22px;height:80px;border-radius:18px;background:${vbg};color:${vfg};display:flex;align-items:center;gap:14px;padding:0 24px;font-size:24px;font-weight:700;opacity:0}
.verdict small{display:block;font-size:17px;font-weight:400}.verdict .sp{flex:1}.verdict .next{font-size:19px;background:#fff;color:#0B2545;border-radius:12px;padding:8px 14px;white-space:nowrap}
</style></head><body>
<div class="top"><span class="lab">${esc(spec.lab)}</span>${s.portrait ? `<span class="av" style="background-image:url(${img(s.portrait)})"></span>` : ''}<span class="who">${esc(s.who)}</span><span class="role">${esc(s.role)}</span><span class="sp"></span><div class="dots">${dots}</div></div>
<div class="col in" id="cin"><h3>📥 Input</h3><div class="prompt" id="pr" data-full="${esc(s.prompt)}"></div>
<div class="reads">${(s.reads || []).map(r => `<div>📄 ${esc(r)}</div>`).join('')}</div></div>
<div class="col mid" id="cmid">${art}<div class="chip" id="chip">${esc(s.skill || '— ไม่ใช้ skill')}</div><div class="chipcap" id="chipcap">${esc(s.skillNote || 'Claude หยิบ skill นี้เอง')}</div><div class="arrow" id="arr">➜</div></div>
<div class="col outc" id="cout"><h3>📤 Output ${s.time ? `<span style="font-size:16px;color:#64748b;font-weight:400">· ${esc(s.time)}</span>` : ''}</h3>
<div class="files">${s.outputs.map(o => `<div><div class="fn">${esc(o.file)}</div><div class="nt">${esc(o.note)}</div></div>`).join('')}</div></div>
<div class="verdict" id="vd"><span style="font-size:34px">${vic}</span><span>${esc(s.verdict.text)}${s.verdict.sub ? `<small>${esc(s.verdict.sub)}</small>` : ''}</span><span class="sp"></span>${s.next ? `<span class="next">${esc(s.next)}</span>` : ''}</div>
<script>
const R=${(s.reads || []).length},O=${s.outputs.length};
const a=(f,t,t0,d=.4)=>Math.max(0,Math.min(1,(t-t0)/d));
window.render=function(t){
  const pt=Math.min(2.4,Math.max(1.2,document.getElementById('pr').dataset.full.length/45));
  document.getElementById('cin').style.opacity=a(0,t,.2);
  const el=document.getElementById('pr'),full=el.dataset.full;el.textContent=full.slice(0,Math.round(full.length*Math.max(0,Math.min(1,(t-.5)/pt))));
  const r0=.6+pt;document.querySelectorAll('.reads div').forEach((d,k)=>d.style.opacity=a(0,t,r0+k*.35));
  const m0=r0+R*.35+.3;document.getElementById('cmid').style.opacity=a(0,t,m0);
  const art=document.querySelector('.art');if(art)art.style.opacity=a(0,t,m0);
  const c0=m0+.6;const chip=document.getElementById('chip');chip.style.opacity=a(0,t,c0);
  const g=Math.max(0,Math.sin(Math.min(Math.PI,(t-c0)*2.2)));chip.style.boxShadow='0 0 0 '+(g*14)+'px #f59e0b55';
  document.getElementById('chipcap').style.opacity=a(0,t,c0+.4);document.getElementById('arr').style.opacity=a(0,t,c0+.8);
  const o0=c0+1.3;document.getElementById('cout').style.opacity=a(0,t,o0);
  document.querySelectorAll('.files>div').forEach((d,k)=>d.style.opacity=a(0,t,o0+.4+k*.7));
  window.END=o0+.4+O*.7+.5;document.getElementById('vd').style.opacity=a(0,t,window.END);
};
</script></body></html>`;
}

mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const n = spec.steps.length;
for (let i = 0; i < n; i++) {
  const s = spec.steps[i];
  await pg.setContent(page(s, i, n));
  await pg.evaluate(() => window.render(0));
  const end = await pg.evaluate(() => window.END);
  const total = Math.max(7, end + (s.hold || 3.5));          // ค้างภาพผลไว้อย่างน้อย 3.5 วินาที · ทั้ง GIF ไม่ต่ำกว่า 7 วินาที
  const fr = join(out, `${s.id}-frames`); rmSync(fr, { recursive: true, force: true }); mkdirSync(fr);
  const frames = Math.round(total * FPS);
  for (let k = 0; k <= frames; k++) {
    await pg.evaluate(t => window.render(t), k / FPS);
    await pg.screenshot({ path: join(fr, `f${String(k).padStart(4, '0')}.png`) });
  }
  const gif = join(out, `${s.id}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(fr, 'f%04d.png'),
    '-vf', 'scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', gif]);
  rmSync(fr, { recursive: true, force: true });
  console.log(gif, total.toFixed(1) + 's');
}
await b.close();

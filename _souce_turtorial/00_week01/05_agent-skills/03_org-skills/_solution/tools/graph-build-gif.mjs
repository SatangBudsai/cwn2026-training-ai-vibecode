// GIF "กราฟของ skill สร้างมาจากไหน": หัวไฟล์ → จุด → เส้น follows / next / uses → โหนดศูนย์กลาง → ถ้าแก้แล้วกระทบใคร
// ข้อมูลจริงจาก cards-header.json (หัวไฟล์ของทุก skill ในคลังกลาง)
// node graph-build-gif.mjs <cards-header.json> <out.gif> <chromium.exe>
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
const [,, cardsFile, outGif, exe] = process.argv;
const cards = JSON.parse(readFileSync(cardsFile, 'utf8'));
const W = 1280, H = 720, FPS = 8;
const COL = { core: '#0B2545', shared: '#64748b', sales: '#e4572e', exec: '#8e5ea2', finance: '#665191', sa: '#f2a541', dev: '#2f6fb3', qa: '#29a3a3', devops: '#4c9a2a', mlops: '#a05195', hr: '#d45087', product: '#0ea5e9' };
// วางจุด: core อยู่วงใน · แผนกอื่นเรียงเป็นวงนอกตามแผนก
const core = cards.filter(c => c.plugin === 'core'), rest = cards.filter(c => c.plugin !== 'core').sort((a, b) => a.plugin.localeCompare(b.plugin));
const cx = 915, cy = 385, pos = {};
core.forEach((c, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / core.length; pos[c.name] = [cx + 95 * Math.cos(a), cy + 95 * Math.sin(a)]; });
rest.forEach((c, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / rest.length; pos[c.name] = [cx + 285 * Math.cos(a), cy + 255 * Math.sin(a)]; });
const names = new Set(cards.map(c => c.name));
const edges = []; for (const c of cards) for (const t of ['follows', 'next', 'uses']) for (const to of c.metadata[t] || []) if (names.has(to)) edges.push({ from: c.name, to, t });
const cnt = t => edges.filter(e => e.t === t).length;
const hub = 'customer-data-policy', hubIn = edges.filter(e => e.to === hub && e.t === 'follows').length;
const sp = cards.find(c => c.name === 'sales-proposal').metadata;
const S = { follows: [7, 11.5], next: [11.5, 15.5], uses: [15.5, 17] };
const ET = { follows: ['#ef4444', '6 5'], next: ['#2563eb', ''], uses: ['#f59e0b', ''] };
const caps = [
  [0, 'หัวไฟล์ของทุก skill มี 3 ช่องที่บอกความสัมพันธ์', 'uses = เรียกใช้ · next = งานถัดไป · follows = กติกาที่ต้องทำตาม (ด่าน ② ของ LAB 6 บังคับให้ครบ)'],
  [4, `ขั้น 1 · 1 skill = 1 จุด (${cards.length} จุด)`, 'สคริปต์อ่านหัวไฟล์ของทุก skill ในคลังกลาง · สีตามแผนก · วงในคือ core'],
  [7, `ขั้น 2 · ลากเส้น follows ${cnt('follows')} เส้น`, 'skill → กติกาที่ต้องทำตาม (ส่วนใหญ่ชี้เข้า core)'],
  [11.5, `ขั้น 3 · ลากเส้น next ${cnt('next')} เส้น`, 'skill → งานที่มักทำต่อ (เช่น sales-proposal → deal-approval)'],
  [15.5, `ขั้น 4 · ลากเส้น uses ${cnt('uses')} เส้น`, `รวม ${edges.length} เส้น · ไม่ต้องมีฐานข้อมูลกราฟ แค่หัวไฟล์ก็พอ`],
  [17.5, `โหนดศูนย์กลาง: ${hub}`, `${hubIn} skill มีเส้น follows ชี้เข้ามา`],
  [21, `ถ้าแก้ ${hub} กระทบใคร = เดินเส้นย้อนกลับ`, `ได้ ${hubIn} skill ที่ต้องตรวจใหม่ และรู้ว่าต้องแจ้งเจ้าของคนไหน (หัวไฟล์มี owner)`],
];
const TOTAL = 27;
const html = `<html><head><meta charset="utf-8"><style>
body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#f6f7fb;font-family:'Leelawadee UI','Segoe UI',sans-serif;color:#0B2545}
.top{position:absolute;left:0;right:0;top:0;height:64px;background:#0B2545;color:#fff;display:flex;align-items:center;padding:0 28px;font-size:26px;font-weight:700}
.yaml{position:absolute;left:28px;top:96px;width:470px;background:#0f172a;color:#e2e8f0;border-radius:16px;padding:18px 22px;font:16px/1.7 Consolas,monospace;white-space:pre-wrap;word-break:break-word}
.yaml .k{color:#93c5fd}.yaml .hl{border-radius:6px;padding:0 4px}
.cap{position:absolute;left:28px;width:470px;top:470px;background:#fff;border-radius:16px;padding:16px 20px;box-shadow:0 4px 16px #0B254518}
.cap b{display:block;font-size:24px;line-height:1.35}.cap span{display:block;font-size:18px;color:#475569;margin-top:6px;line-height:1.5}
.leg{position:absolute;left:28px;top:660px;font-size:16px;color:#334155;display:flex;gap:18px}
.leg i{display:inline-block;width:28px;height:4px;vertical-align:middle;margin-right:6px}
svg{position:absolute;left:0;top:0}
</style></head><body>
<div class="top">LAB 7 · กราฟของ skill สร้างมาจากหัวไฟล์</div>
<div class="yaml" id="yaml"><span class="k">name:</span> sales-proposal
<span class="k">metadata:</span>
  <span class="k">owner:</span> ${sp.owner}
  <span class="k">version:</span> ${sp.version}
  <span class="hl" id="y-uses"><span class="k">uses:</span> [${(sp.uses || []).join(', ')}]</span>
  <span class="hl" id="y-next"><span class="k">next:</span> [${sp.next.join(', ')}]</span>
  <span class="hl" id="y-fol"><span class="k">follows:</span> [${sp.follows.join(', ')}]</span></div>
<div class="cap"><b id="cb"></b><span id="cs"></span></div>
<div class="leg"><span><i style="background:#ef4444"></i>follows</span><span><i style="background:#2563eb"></i>next</span><span><i style="background:#f59e0b"></i>uses</span></div>
<svg width="${W}" height="${H}"><defs>${Object.entries(ET).map(([t, [c]]) => `<marker id="m-${t}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join('')}</defs>
<g id="E">${edges.map((e, i) => { const [x1, y1] = pos[e.from], [x2, y2] = pos[e.to]; const d = Math.hypot(x2 - x1, y2 - y1), r = 16;
  const ax = x1 + (x2 - x1) * r / d, ay = y1 + (y2 - y1) * r / d, bx = x2 - (x2 - x1) * (r + 4) / d, by = y2 - (y2 - y1) * (r + 4) / d;
  return `<line id="e${i}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${ET[e.t][0]}" stroke-width="2.2" stroke-dasharray="${ET[e.t][1]}" marker-end="url(#m-${e.t})" opacity="0"/>`; }).join('')}</g>
<g id="N">${cards.map(c => { const [x, y] = pos[c.name]; const ly = y > cy + 150 ? y + 33 + (rest.indexOf(c) % 2) * 17 : y < cy - 150 ? y - 24 : y + 33; return `<g id="n-${c.name}" opacity="0"><circle cx="${x}" cy="${y}" r="16" fill="${COL[c.plugin] || '#999'}" stroke="#fff" stroke-width="3"/><text x="${x}" y="${ly}" text-anchor="middle" font-size="14" font-family="Consolas" fill="#0B2545">${c.name}</text></g>`; }).join('')}</g>
</svg>
<script>
const E=${JSON.stringify(edges)},S=${JSON.stringify(S)},CAPS=${JSON.stringify(caps)},HUB=${JSON.stringify(hub)},N=${JSON.stringify(cards.map(c => c.name))};
const cl=x=>Math.max(0,Math.min(1,x));
window.render=function(t){
  let c=CAPS[0];for(const k of CAPS)if(t>=k[0])c=k;document.getElementById('cb').textContent=c[1];document.getElementById('cs').textContent=c[2];
  const hl=(id,t0,col)=>{document.getElementById(id).style.background=t>=t0?col:'transparent'};
  hl('y-fol',1.2,'#7f1d1d');hl('y-next',2,'#1e3a8a');hl('y-uses',2.8,'#78350f');
  N.forEach((n,i)=>{document.getElementById('n-'+n).setAttribute('opacity',cl((t-4-i*0.09)/0.3))});
  const per={};E.forEach((e,i)=>{per[e.t]=per[e.t]||[];per[e.t].push(i)});
  for(const t2 in per){const [a,b]=S[t2],L=per[t2];L.forEach((i,k)=>{const at=a+(b-a-0.6)*k/Math.max(1,L.length);document.getElementById('e'+i).setAttribute('opacity',cl((t-at)/0.3)*(t>=17.5?(E[i].to===HUB&&E[i].t==='follows'?1:0.15):1))})}
  const hubG=document.querySelector('#n-'+HUB+' circle');const pulse=t>=17.5?6+4*Math.sin(t*5):3;hubG.setAttribute('stroke-width',pulse);hubG.setAttribute('stroke',t>=17.5?'#f59e0b':'#fff');
  N.forEach(n=>{if(n===HUB)return;const hit=E.some(e=>e.from===n&&e.to===HUB&&e.t==='follows');const c=document.querySelector('#n-'+n+' circle');c.setAttribute('stroke',t>=21&&hit?'#ef4444':'#fff');c.setAttribute('stroke-width',t>=21&&hit?5:3);document.getElementById('n-'+n).setAttribute('opacity',t>=21?(hit?1:0.35):document.getElementById('n-'+n).getAttribute('opacity'))});
};
</script></body></html>`;
const fr = outGif.replace(/\.gif$/, '-frames'); rmSync(fr, { recursive: true, force: true }); mkdirSync(fr, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const pg = await b.newPage({ viewport: { width: W, height: H } });
await pg.setContent(html);
const n = Math.round(TOTAL * FPS);
for (let k = 0; k <= n; k++) { await pg.evaluate(t => window.render(t), k / FPS); await pg.screenshot({ path: join(fr, `f${String(k).padStart(4, '0')}.png`) }); }
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(fr, 'f%04d.png'),
  '-vf', 'scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none', outGif]);
rmSync(fr, { recursive: true, force: true });
console.log(outGif, TOTAL + 's', 'edges', edges.length, 'follows', cnt('follows'), 'next', cnt('next'), 'uses', cnt('uses'), 'hubIn', hubIn);

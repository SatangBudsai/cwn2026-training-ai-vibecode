// ผังองค์กรภาพเดียว กว้าง 1200px เรนเดอร์ 2 เท่า (2400px) ให้ชัดเต็มความกว้างบน GitHub
// ชั้น 1 MD + ผู้ช่วย → แถบ 3 สาย (ชั้น 2 ผู้บริหารสาย) → คอลัมน์แผนก (ชั้น 3 หัวหน้า 👑 · ชั้น 4 พนักงาน)
// node org-chart.mjs <people.json> <out.png> <chromium.exe>
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const [,, json, out, exe] = process.argv;
const d = JSON.parse(readFileSync(json, 'utf8'));
const P = Object.fromEntries(d.people.map(p => [p.user, p]));
const dep = Object.fromEntries(d.departments.map(x => [x.team, x.name]));
const icon = { exec:'👔', sales:'💼', sa:'🧩', product:'📦', dev:'💻', qa:'🧪', devops:'⚙️', mlops:'🤖', hr:'🤝', finance:'🧾', platform:'🏛️' };
const tint = { business:'#eff6ff', tech:'#f0fdf4', corporate:'#fdf2f8' }, edge = { business:'#2563eb', tech:'#16a34a', corporate:'#db2777' };
const first = p => p.name.split(' ')[0];
const role = p => p.role.replace(/ ดูแล .*/, '');
const team = t => d.people.filter(p => p.team === t);
const staff = d.people.filter(p => p.team !== 'exec' && !p.lead).length;

const css = `body{margin:0;width:1200px;font-family:'Leelawadee UI','Segoe UI',sans-serif;background:#f8fafc;color:#1d2433}
h1{font-size:46px;margin:26px 36px 4px} .sub{margin:0 36px 18px;font-size:24px;color:#4a5568}
.b{background:#fff;border-radius:14px;padding:10px 8px;box-shadow:0 2px 6px #0001;border:2px solid #cbd5e1;box-sizing:border-box;text-align:center}
.b.lead{border-color:#f59e0b;background:#fffbeb} .b.new{border-style:dashed;border-color:#22c55e;background:#f0fdf4}
.b.md{border:4px solid #1d4ed8;background:#dbeafe} .b.dir{border:3px solid #475569;background:#f1f5f9}
.n{font-size:26px;font-weight:800} .u{font-family:Consolas,monospace;font-size:20px;color:#1e40af}
.r{font-size:18px;color:#475569;line-height:1.3} .s{font-family:Consolas,monospace;font-size:17px;color:#64748b;margin-top:5px;border-top:1px dashed #e2e8f0;padding-top:4px}
.v{width:4px;background:#475569;margin:0 auto} .legend{margin:18px 36px 28px;font-size:21px;color:#334155;line-height:1.7}`;
const box = (p, cls = '') => `<div class="b ${cls} ${p.lead ? 'lead' : ''} ${p.skill ? '' : 'new'}"><div class="n">${first(p)}${p.lead ? ' 👑' : ''}${p.skill ? '' : ' 🆕'}</div><div class="u">${p.user}</div><div class="r">${role(p)}</div><div class="s">${p.skill ?? 'น้องใหม่ · ยังไม่มี skill'}</div></div>`;

const exLine = p => `<span class="ex"><b>${first(p)}</b> <code>${p.user}</code> ${role(p)} · skill <code>${p.skill}</code></span>`;
const band = v => `<div class="band" style="background:${tint[v.id]};border-color:${edge[v.id]}">
  <div class="tick" style="background:${edge[v.id]}"></div>
  <div class="bh"><span class="lv">ชั้น 2</span><span style="color:${edge[v.id]}">${v.name}</span>${exLine(P[v.head])}</div>
  <div class="grid" style="grid-template-columns:repeat(${Math.max(v.teams.length, 3)},1fr)">${v.teams.map(t => {
    const ps = team(t), h = ps.find(p => p.lead);
    return `<div class="col"><div class="dt">${icon[t]} ${dep[t]}</div>${[h, ...ps.filter(p => p !== h)].map(p => box(p)).join('<div class="v" style="height:10px;background:#94a3b8"></div>')}</div>`;
  }).join('')}</div></div>`;
const html = `<html><head><meta charset="utf-8"><style>${css}
.levels{display:flex;gap:10px;margin:0 36px 14px;flex-wrap:wrap}
.levels span{background:#fff;border:2px solid #cbd5e1;border-radius:999px;padding:4px 14px;font-size:20px} .levels b{color:#1d4ed8}
.top{display:flex;align-items:center;gap:14px;margin:0 0 18px;position:relative} .dash{width:44px;border-top:4px dashed #94a3b8}
.lv{background:#1d4ed8;color:#fff;border-radius:8px;padding:2px 10px;font-size:18px;font-weight:700;margin-right:10px}
.spine{margin:0 36px 0 60px;padding:0 0 4px 26px;position:relative}
.spine:before{content:'';position:absolute;left:0;top:58px;bottom:60px;width:5px;background:#475569}
.band{border:3px solid;border-radius:18px;margin:0 0 18px;padding:10px 12px 14px;position:relative}
.tick{position:absolute;left:-26px;top:30px;width:26px;height:5px}
.bh{font-size:27px;font-weight:800;margin:0 4px 10px;display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.ex{font-size:19px;font-weight:400;color:#334155;margin-left:10px;background:#fff;border:2px solid #475569;border-radius:10px;padding:2px 10px}
.ex code,.bh code{font-size:17px;color:#1e40af}
.grid{display:grid;gap:10px} .col{display:flex;flex-direction:column}
.dt{font-size:22px;font-weight:800;text-align:center;margin-bottom:6px;white-space:nowrap}
.grid .n{font-size:24px} .grid .u{font-size:18px} .grid .r{font-size:16px} .grid .s{font-size:15px}
</style></head><body>
<h1>ผังองค์กรโนวาเทค · 4 ชั้น ${d.people.length} คน</h1>
<div class="sub">สั่งงานไล่จากบนลงล่าง: MD → ผู้บริหาร 3 สาย → หัวหน้าแผนก 👑 → พนักงาน · แต่ละคอลัมน์ = 1 แผนก</div>
<div class="levels"><span><b>ชั้น 1</b> MD</span><span><b>ชั้น 2</b> ผู้บริหารสาย 3 คน + ผู้ช่วยผู้บริหาร</span><span><b>ชั้น 3</b> หัวหน้าแผนก 👑 10 คน (กล่องบนสุดของคอลัมน์)</span><span><b>ชั้น 4</b> พนักงาน ${staff} คน</span></div>
<div class="spine"><div class="top"><div class="tick" style="background:#475569;top:58px"></div><div style="width:330px">${box(P['md-somchai'], 'md')}</div><div class="dash"></div><div style="width:270px">${box(P['exec-ploy'])}</div><span class="lv" style="margin-left:14px">ชั้น 1</span></div>${d.divisions.map(band).join('')}</div>
<div class="legend">👑 = หัวหน้าแผนก / ผู้ดูแล skill ของแผนก (ทีม <b>leads</b>) · 🆕 กรอบเขียวประ = น้องใหม่ ยังไม่มี skill · <span style="border-bottom:4px dashed #94a3b8">เส้นประ</span> = ผู้ช่วยผู้บริหาร ขึ้นตรงกับ MD<br>บรรทัดล่างในกล่อง = skill ที่คนนั้นสร้างใน LAB 1 · 🏛️ ทีมกลาง (platform) = ทีมภายในที่ดูแลคลัง skill ของทั้งบริษัท</div>
</body></html>`;

const b = await chromium.launch({ executablePath: exe });
const pg = await b.newPage({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 2 });
await pg.setContent(html); await pg.screenshot({ path: out, fullPage: true });
await b.close();

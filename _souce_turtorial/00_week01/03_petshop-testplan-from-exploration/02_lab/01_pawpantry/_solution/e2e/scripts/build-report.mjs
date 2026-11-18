// สร้างรายงานหน้าเดียว e2e/index.html (เปิดด้วยดับเบิลคลิกได้ ไม่ต้องมี server)
// อ่าน: test-report/data/results.json (จาก collect.mjs) · test-report/list.json (ชุด test ของแต่ละ project) · triage.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'test-report/data/results.json'), 'utf8'));
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'test-report/list.json'), 'utf8'));
const triagePath = path.join(ROOT, 'triage.json');
const triage = fs.existsSync(triagePath) ? JSON.parse(fs.readFileSync(triagePath, 'utf8')) : {};

// ชุด test ของแต่ละ project จาก --list
const sets = {};
const meta = {};
function walk(s, fn) {
  (s.specs || []).forEach(fn);
  (s.suites || []).forEach((x) => walk(x, fn));
}
list.suites.forEach((top) =>
  walk(top, (spec) => {
    const id = (spec.title.match(/^(TC-[A-Z0-9]+-\d{3})/) || [])[1];
    if (!id) return;
    const tags = spec.tags || [];
    meta[id] = {
      id,
      title: spec.title.replace(/^TC-[A-Z0-9]+-\d{3}\s*/, ''),
      pri: (tags.find((t) => /^P\d$/.test(t)) || '?'),
      sec: (tags.find((t) => /^5\.\d$/.test(t)) || '?'),
      tags,
    };
    for (const t of spec.tests) (sets[t.projectName] ||= new Set()).add(id);
  }),
);

const BROWSERS = ['chromium', 'mobile-chrome'];
const DESKTOP = new Set(['chromium']);
const apiIds = sets.api || new Set();

function resultFor(browser, id) {
  const proj = DESKTOP.has(browser) && apiIds.has(id) ? 'api' : browser;
  return data.tests[`${proj}|${id}`] ? { ...data.tests[`${proj}|${id}`], viaApi: proj === 'api' } : null;
}
const isPass = (r) => r && r.status === 'passed' && r.outcome === 'expected';
function triageFor(id, browser) {
  return triage[`${id}@${browser}`] || triage[id] || null;
}

const summary = {};
const secs = ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8'];
for (const b of BROWSERS) {
  const ids = new Set([...(sets[b] || []), ...(DESKTOP.has(b) ? apiIds : [])]);
  let pass = 0, p1 = 0, p1pass = 0, notRun = 0, openHigh = 0, untriaged = 0;
  const bySec = Object.fromEntries(secs.map((s) => [s, { n: 0, pass: 0 }]));
  const p1fails = [];
  for (const id of ids) {
    const r = resultFor(b, id);
    const ok = isPass(r);
    if (!r || r.status === 'skipped') notRun++;
    if (ok) pass++;
    const m = meta[id];
    if (m.pri === 'P1') {
      p1++;
      if (ok) p1pass++;
      else {
        p1fails.push(id);
        const tr = triageFor(id, b);
        if (!tr) untriaged++;
        else if (tr.category === 'เว็บผิด') openHigh++;
      }
    }
    if (bySec[m.sec]) {
      bySec[m.sec].n++;
      if (ok) bySec[m.sec].pass++;
    }
  }
  const total = ids.size;
  const need = Math.ceil(total * 0.9 - 1e-9);
  const c1 = p1 > 0 && p1pass === p1;
  const c2 = pass >= need;
  const c3 = openHigh === 0 && untriaged === 0;
  summary[b] = { total, pass, need, p1, p1pass, notRun, openHigh, untriaged, c1, c2, c3, verdict: c1 && c2 && c3, bySec, p1fails: p1fails.length };
}

// แถวของตาราง
const rows = Object.values(meta)
  .sort((a, b) => (a.sec + a.id).localeCompare(b.sec + b.id, 'en', { numeric: true }))
  .map((m) => {
    const per = {};
    let expected = '', source = '';
    for (const b of BROWSERS) {
      const inSet = (sets[b] && sets[b].has(m.id)) || (DESKTOP.has(b) && apiIds.has(m.id));
      if (!inSet) continue;
      const r = resultFor(b, m.id);
      const tr = triageFor(m.id, b);
      per[b] = r
        ? {
            st: isPass(r) ? 'pass' : r.status === 'skipped' ? 'skip' : 'fail',
            raw: r.status,
            viaApi: r.viaApi,
            ms: r.ms,
            run: r.run,
            errors: r.errors,
            steps: r.steps,
            points: r.points,
            other: r.other,
            gif: r.gif,
            blocked: r.blocked,
            triage: tr,
          }
        : { st: 'notrun', triage: tr };
      if (r) {
        expected ||= r.expected;
        source ||= r.source;
      }
    }
    return { ...m, expected, source, per };
  });

const triageCounts = {};
for (const r of rows)
  for (const [b, p] of Object.entries(r.per))
    if (p.st !== 'pass') {
      const c = p.triage?.category || 'ยังไม่จำแนก';
      triageCounts[c] ||= {};
      triageCounts[c][b] = (triageCounts[c][b] || 0) + 1;
    }

const payload = { generated: new Date().toISOString(), stamp: data.stamp, browsers: BROWSERS, secs, summary, rows, triageCounts, triageMeta: triage._meta || null };
const json = JSON.stringify(payload).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PawPantry E2E Report</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#1d2330;--mute:#667085;--line:#e3e6eb;--pass:#127a3e;--passbg:#e5f5ec;--fail:#b42318;--failbg:#fde8e7;--warn:#9a6700;--warnbg:#fff4d6;--skip:#5d6b82;--skipbg:#eef1f5;--acc:#2f5bd3;--bar:#dfe4ec}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#11141a;--card:#1a1f27;--ink:#e6e9ef;--mute:#98a2b3;--line:#2b323d;--pass:#4cc38a;--passbg:#163626;--fail:#ff8a80;--failbg:#3d1b1a;--warn:#f2c94c;--warnbg:#3a3015;--skip:#a3adbd;--skipbg:#252b35;--acc:#7da2ff;--bar:#2b323d}}
:root[data-theme="dark"]{--bg:#11141a;--card:#1a1f27;--ink:#e6e9ef;--mute:#98a2b3;--line:#2b323d;--pass:#4cc38a;--passbg:#163626;--fail:#ff8a80;--failbg:#3d1b1a;--warn:#f2c94c;--warnbg:#3a3015;--skip:#a3adbd;--skipbg:#252b35;--acc:#7da2ff;--bar:#2b323d}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 "Leelawadee UI","Sarabun","Noto Sans Thai",Tahoma,system-ui,sans-serif}
main{max-width:1280px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}
.sub{color:var(--mute)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
.card h3{margin:0 0 6px;font-size:15px}
.verdict{font-size:20px;font-weight:700;padding:6px 10px;border-radius:8px;display:inline-block;margin:4px 0 10px}
.v-pass{color:var(--pass);background:var(--passbg)}.v-fail{color:var(--fail);background:var(--failbg)}
.crit{list-style:none;padding:0;margin:0}.crit li{display:flex;gap:6px;align-items:flex-start;padding:2px 0}
.ok{color:var(--pass)}.ng{color:var(--fail)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:7px 9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-weight:600;background:var(--skipbg);font-size:13px;position:sticky;top:0}
td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.pct{display:flex;align-items:center;gap:8px;min-width:120px}.pct .b{flex:1;height:8px;background:var(--bar);border-radius:4px;overflow:hidden}.pct .b i{display:block;height:100%;background:var(--pass)}
.pct span{font-variant-numeric:tabular-nums;white-space:nowrap;font-size:13px}
.chip{display:inline-block;padding:1px 7px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.c-pass{color:var(--pass);background:var(--passbg)}.c-fail{color:var(--fail);background:var(--failbg)}.c-skip,.c-notrun{color:var(--skip);background:var(--skipbg)}.c-na{color:var(--mute)}
.t-web{color:var(--fail);background:var(--failbg)}.t-plan{color:var(--warn);background:var(--warnbg)}.t-test{color:var(--acc);background:var(--skipbg)}.t-none{color:var(--mute);background:var(--skipbg)}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.filters input,.filters select{padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);font:inherit}
.filters input{flex:1;min-width:200px}
tr.row{cursor:pointer}tr.row:hover{background:var(--skipbg)}
tr.detail>td{background:var(--bg);padding:14px}
.tscroll{overflow-x:auto;border-radius:10px}
.kv{display:grid;grid-template-columns:150px 1fr;gap:6px 12px;margin-bottom:12px}
.kv b{color:var(--mute);font-weight:600}
.pre{white-space:pre-wrap;word-break:break-word;font-family:Consolas,Menlo,monospace;font-size:12.5px;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:8px;margin:0}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.tabs button{border:1px solid var(--line);background:var(--card);color:var(--ink);padding:5px 10px;border-radius:6px;cursor:pointer;font:inherit}.tabs button.on{border-color:var(--acc);color:var(--acc);font-weight:600}
.points{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.pt{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px}
.pt img{width:100%;border:1px solid var(--line);border-radius:4px;cursor:zoom-in;margin-top:6px}
.steps{margin:0;padding-left:20px}.steps li{margin:2px 0}.steps .err{color:var(--fail)}
.gif img{max-width:100%;border:1px solid var(--line);border-radius:6px}
.tri{border-left:4px solid var(--line);padding:6px 10px;background:var(--card);border-radius:4px;margin:8px 0}
#zoom{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;z-index:9;cursor:zoom-out}#zoom img{max-width:96vw;max-height:94vh}
.legend{font-size:13px;color:var(--mute);margin:6px 0}
@media (max-width:700px){.kv{grid-template-columns:1fr}}
</style>
</head>
<body>
<main>
<h1>PawPantry — ผลทดสอบ E2E ตาม TEST-PLAN.md หัวข้อ 5</h1>
<div class="sub" id="meta"></div>
<p class="legend">ขอบเขต (แผนฉบับ 1.2): <b>chromium</b> = คอม 1280×800 บนเว็บ <code>petshop</code> :3000 · <b>mobile-chrome</b> = Pixel 7 375×812 บนเว็บ <code>petshop2</code> :3001 · <b>api</b> รันครั้งเดียวบน :3000 นับผลให้ chromium · แต่ละเบราว์เซอร์ใช้เว็บของตัวเองเพราะ reset ล้างข้อมูลทั้งเว็บ · ไม่ทดสอบ Firefox / WebKit / Mobile Safari (ผลที่รันไปก่อนถูกลบตามคำสั่งผู้ใช้)</p>

<h2>เกณฑ์ผ่าน (หัวข้อ 6.2) — แยกทีละเบราว์เซอร์</h2>
<div class="cards" id="exit"></div>
<p class="legend">เกณฑ์: (1) P1 ผ่านทั้งหมด · (2) อัตราผ่านรวม ≥ 90% ของชุดที่ project นั้นรัน (TC ที่ blocked/ไม่ได้รันนับเป็นไม่ผ่าน; TC API ล้วนรันครั้งเดียวที่ project <code>api</code> แล้วนับให้ chromium) · (3) ไม่มีบั๊ก Critical/High ที่ยังเปิดอยู่ = ไม่มี P1 ที่ล้มเพราะ "เว็บผิด" และไม่มี P1 ที่ล้มแต่ยังไม่จำแนก</p>
<div id="release"></div>

<h2>% ผ่านของแต่ละหัวข้อย่อย</h2>
<div class="tscroll"><table id="secs"></table></div>

<h2>การจำแนกข้อที่ล้ม (triage.json)</h2>
<div class="tscroll"><table id="tri"></table></div>
<h3 style="margin-top:18px;font-size:15px">test ที่เขียนผิด → แก้ test แล้วรันข้อนั้นซ้ำ</h3>
<div class="tscroll"><table id="fixed"></table></div>

<h2>ทุก test case</h2>
<div class="filters">
<input id="q" placeholder="ค้นหา ID หรือชื่อ…">
<select id="fsec"><option value="">ทุกหัวข้อ</option></select>
<select id="fpri"><option value="">ทุกระดับ</option><option>P1</option><option>P2</option><option>P3</option></select>
<select id="fst"><option value="">ทุกสถานะ</option><option value="fail">มีเบราว์เซอร์ที่ล้ม</option><option value="pass">ผ่านทุกเบราว์เซอร์</option></select>
<select id="ftri"><option value="">ทุกการจำแนก</option><option>เว็บผิด</option><option>แผนผิด</option><option>test เขียนผิด</option><option>ยังไม่จำแนก</option></select>
</div>
<div class="legend" id="count"></div>
<div class="tscroll"><table id="tests"></table></div>
</main>
<div id="zoom"><img alt=""></div>
<script id="data" type="application/json">${json}</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const B = D.browsers, BN = {chromium:'Chromium',firefox:'Firefox',webkit:'WebKit','mobile-chrome':'Mobile Chrome','mobile-safari':'Mobile Safari'};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct = (a,n) => n ? Math.round(a*1000/n)/10 : 0;
const triCls = c => c==='เว็บผิด'?'t-web':c==='แผนผิด'?'t-plan':c==='test เขียนผิด'?'t-test':'t-none';
const stLabel = {pass:'ผ่าน',fail:'ล้ม',skip:'ข้าม',notrun:'ไม่ได้รัน'};
document.getElementById('meta').textContent = 'รอบ ' + (D.stamp||'-') + ' · สร้างรายงาน ' + new Date(D.generated).toLocaleString('th-TH') + ' · ' + D.rows.length + ' test case';

// กล่องเกณฑ์
document.getElementById('exit').innerHTML = B.map(b => { const s = D.summary[b]; return '<div class="card"><h3>'+BN[b]+' <span class="sub">('+s.total+' ข้อ)</span></h3>'+
 '<div class="verdict '+(s.verdict?'v-pass':'v-fail')+'">'+(s.verdict?'ผ่านเกณฑ์':'ไม่ผ่านเกณฑ์')+'</div><ul class="crit">'+
 '<li><span class="'+(s.c1?'ok':'ng')+'">'+(s.c1?'✓':'✗')+'</span><span>P1 ผ่าน '+s.p1pass+' / '+s.p1+'</span></li>'+
 '<li><span class="'+(s.c2?'ok':'ng')+'">'+(s.c2?'✓':'✗')+'</span><span>ผ่านรวม '+s.pass+' / '+s.total+' ('+pct(s.pass,s.total)+'%) ต้องได้ ≥ '+s.need+'</span></li>'+
 '<li><span class="'+(s.c3?'ok':'ng')+'">'+(s.c3?'✓':'✗')+'</span><span>บั๊ก P1 ที่เปิดอยู่ (เว็บผิด) '+s.openHigh+(s.untriaged?' · P1 ล้มที่ยังไม่จำแนก '+s.untriaged:'')+'</span></li>'+
 (s.notRun?'<li><span class="ng">!</span><span>ไม่ได้รัน/ข้าม '+s.notRun+' ข้อ (นับเป็นไม่ผ่าน)</span></li>':'')+'</ul></div>'; }).join('');
const allOk = B.every(b => D.summary[b].verdict);
document.getElementById('release').innerHTML = '<div class="card"><b>ผลรวมการปล่อย:</b> '+(allOk?'<span class="chip c-pass">ปล่อยได้</span>':'<span class="chip c-fail">ยังปล่อยไม่ได้</span> ไม่รองรับ: '+B.filter(b=>!D.summary[b].verdict).map(b=>BN[b]).join(', '))+'</div>';

// ตารางหัวข้อย่อย
const secName = {'5.1':'แคตตาล็อกและการค้นหา','5.2':'หน้ารายละเอียดสินค้า','5.3':'ตะกร้าสินค้า','5.4':'คูปองและค่าส่ง','5.5':'ชำระเงิน คำสั่งซื้อ และบัญชี','5.6':'สมัครสมาชิก เข้าสู่ระบบ และ session','5.7':'ตัวช่วยเลือกอาหาร คำแนะนำ และรายการโปรด','5.8':'โครงเว็บ มือถือ และการเข้าถึง'};
document.getElementById('secs').innerHTML = '<thead><tr><th>หัวข้อย่อย</th>'+B.map(b=>'<th>'+BN[b]+'</th>').join('')+'</tr></thead><tbody>'+
 D.secs.map(s => '<tr><td><b>'+s+'</b> '+secName[s]+'</td>'+B.map(b => { const x = D.summary[b].bySec[s]; if(!x.n) return '<td class="sub">—</td>'; const p = pct(x.pass,x.n); return '<td><div class="pct"><div class="b"><i style="width:'+p+'%"></i></div><span>'+p+'% ('+x.pass+'/'+x.n+')</span></div></td>'; }).join('')+'</tr>').join('')+
 '<tr><td><b>รวม</b></td>'+B.map(b=>{const s=D.summary[b];const p=pct(s.pass,s.total);return '<td><div class="pct"><div class="b"><i style="width:'+p+'%"></i></div><span><b>'+p+'%</b> ('+s.pass+'/'+s.total+')</span></div></td>';}).join('')+'</tr></tbody>';

// ตาราง triage
const cats = ['เว็บผิด','แผนผิด','test เขียนผิด','ยังไม่จำแนก'];
document.getElementById('tri').innerHTML = '<thead><tr><th>การจำแนก</th>'+B.map(b=>'<th>'+BN[b]+'</th>').join('')+'</tr></thead><tbody>'+cats.map(c=>'<tr><td><span class="chip '+triCls(c)+'">'+c+'</span></td>'+B.map(b=>'<td class="num">'+((D.triageCounts[c]||{})[b]||0)+'</td>').join('')+'</tr>').join('')+'</tbody>';

// ตารางทุก test
const fsec = document.getElementById('fsec'); D.secs.forEach(s => fsec.insertAdjacentHTML('beforeend','<option value="'+s+'">'+s+' '+secName[s]+'</option>'));
document.getElementById('fixed').innerHTML = '<thead><tr><th>ID</th><th>จำแนกรอบหลัก</th><th>สิ่งที่แก้ใน test</th><th>ผลรอบแก้ (chromium)</th></tr></thead><tbody>'+
  D.rows.filter(r => r.per.chromium && r.per.chromium.triage && r.per.chromium.triage.rerun).map(r => { const t = r.per.chromium.triage; return '<tr class="row" data-id="'+r.id+'"><td><b>'+r.id+'</b></td><td><span class="chip '+triCls(t.category)+'">'+esc(t.category)+'</span></td><td>'+esc(t.fix||'')+'</td><td><span class="chip c-'+r.per.chromium.st+'">'+stLabel[r.per.chromium.st]+'</span> '+esc(t.rerun.note||'')+'</td></tr>'; }).join('')+'</tbody>';
const rowTri = r => { const s = new Set(); Object.values(r.per).forEach(p => { if (p.st!=='pass') s.add(p.triage?.category || 'ยังไม่จำแนก'); }); return [...s]; };
function render() {
  const q = document.getElementById('q').value.trim().toLowerCase(), sec = fsec.value, pri = document.getElementById('fpri').value, st = document.getElementById('fst').value, tri = document.getElementById('ftri').value;
  const rows = D.rows.filter(r => (!q || (r.id+' '+r.title).toLowerCase().includes(q)) && (!sec || r.sec===sec) && (!pri || r.pri===pri) &&
    (!st || (st==='fail' ? Object.values(r.per).some(p=>p.st!=='pass') : Object.values(r.per).every(p=>p.st==='pass'))) && (!tri || rowTri(r).includes(tri)));
  document.getElementById('count').textContent = 'แสดง ' + rows.length + ' / ' + D.rows.length + ' ข้อ · กดที่แถวเพื่อดูรายละเอียด';
  document.getElementById('tests').innerHTML = '<thead><tr><th>ID</th><th>สิ่งที่ทดสอบ</th><th>ระดับ</th><th>หัวข้อ</th>'+B.map(b=>'<th>'+BN[b]+'</th>').join('')+'<th>การจำแนก</th></tr></thead><tbody>'+
    rows.map(r => '<tr class="row" data-id="'+r.id+'"><td><b>'+r.id+'</b></td><td>'+esc(r.title)+'</td><td>'+r.pri+'</td><td>'+r.sec+'</td>'+
      B.map(b => { const p = r.per[b]; return '<td>'+(p?'<span class="chip c-'+p.st+'">'+stLabel[p.st]+(p.viaApi?' (api)':'')+'</span>':'<span class="c-na">—</span>')+'</td>'; }).join('')+
      '<td>'+rowTri(r).map(c=>'<span class="chip '+triCls(c)+'">'+c+'</span>').join(' ')+(Object.values(r.per).some(p=>p.st==='pass'&&p.triage&&p.triage.rerun)?' <span class="chip c-pass">แก้ test แล้ว</span>':'')+'</td></tr>').join('')+'</tbody>';
}
['q','fsec','fpri','fst','ftri'].forEach(id => document.getElementById(id).addEventListener('input', render));
render();

function stepsHtml(steps) { if (!steps || !steps.length) return ''; return '<ol class="steps">'+steps.map(s => '<li'+(s.error?' class="err"':'')+'>'+(s.error?'✗ ':'')+esc(s.title)+(s.steps?stepsHtml(s.steps):'')+'</li>').join('')+'</ol>'; }
function browserPane(r, b) {
  const p = r.per[b]; if (!p) return '';
  if (p.st === 'notrun') return '<p>ไม่ได้รันในเบราว์เซอร์นี้ (นับเป็นไม่ผ่าน)</p>';
  let h = '<div class="kv"><b>สถานะ</b><span><span class="chip c-'+p.st+'">'+stLabel[p.st]+'</span> '+esc(p.raw)+' · '+(p.ms/1000).toFixed(1)+' วินาที'+(p.viaApi?' · รันที่ project api (นับให้ chromium)':'')+(p.run&&!p.run.startsWith('main')?' · รอบแก้: '+esc(p.run):'')+'</span>';
  if (p.blocked) h += '<b>Blocked</b><span>'+esc(p.blocked)+'</span>';
  if (p.triage && p.st === 'pass') h += '<b>ประวัติ</b><span>รอบหลักล้ม จำแนกเป็น <span class="chip '+triCls(p.triage.category)+'">'+esc(p.triage.category)+'</span> '+esc(p.triage.reason||'')+(p.triage.fix?'<br><span class="sub">แก้ test: '+esc(p.triage.fix)+'</span>':'')+(p.triage.rerun?'<br><span class="sub">รอบแก้ ('+esc(p.triage.rerun.run)+'): '+esc(p.triage.rerun.status)+'</span>':'')+'</span>';
  else if (p.triage) h += '<b>การจำแนก</b><span><span class="chip '+triCls(p.triage.category)+'">'+esc(p.triage.category)+'</span> '+esc(p.triage.reason||'')+(p.triage.fix?'<br><span class="sub">แก้ test: '+esc(p.triage.fix)+'</span>':'')+(p.triage.rerun?'<br><span class="sub">รอบแก้ ('+esc(p.triage.rerun.run)+'): '+esc(p.triage.rerun.status)+' — '+esc(p.triage.rerun.note||'')+'</span>':'')+(p.triage.evidence?'<br><span class="sub">หลักฐาน: '+esc(p.triage.evidence)+'</span>':'')+'</span>';
  else if (p.st !== 'pass') h += '<b>การจำแนก</b><span><span class="chip t-none">ยังไม่จำแนก</span></span>';
  h += '</div>';
  if (p.errors && p.errors.length) h += '<h4>ผลจริง / ข้อความ error</h4><pre class="pre">'+esc(p.errors.join('\\n\\n────\\n\\n'))+'</pre>';
  h += '<h4>ขั้นตอน</h4>'+stepsHtml(p.steps);
  if (p.points && p.points.length) h += '<h4>จุดตรวจ (ภาพตอนตรวจ กรอบแดง = element ที่ตรวจ)</h4><div class="points">'+p.points.map(pt =>
    '<div class="pt"><div><span class="chip '+(pt.ok===false?'c-fail':pt.ok?'c-pass':'c-skip')+'">'+(pt.ok===false?'ไม่ตรง':pt.ok?'ตรง':'—')+'</span> <b>'+esc(pt.label)+'</b></div>'+
    (pt.actual?'<div class="sub" style="margin-top:4px">ค่าจริง:</div><pre class="pre">'+esc(pt.actual.slice(0,600))+'</pre>':'')+(pt.shot?'<img loading="lazy" src="'+pt.shot+'" alt="'+esc(pt.label)+'">':'')+'</div>').join('')+'</div>';
  if (p.other && p.other.length) h += '<h4>ภาพตอนล้ม</h4><div class="points">'+p.other.map(o=>'<div class="pt"><img loading="lazy" src="'+o.file+'"></div>').join('')+'</div>';
  if (p.gif) h += '<h4>GIF (Chromium)</h4><div class="gif"><img loading="lazy" src="'+p.gif+'" alt="GIF '+r.id+'"></div>';
  return h;
}
document.getElementById('tests').addEventListener('click', e => {
  const tr = e.target.closest('tr.row'); if (!tr) return;
  const nx = tr.nextElementSibling; if (nx && nx.classList.contains('detail')) { nx.remove(); return; }
  const r = D.rows.find(x => x.id === tr.dataset.id);
  const bs = B.filter(b => r.per[b]);
  const first = bs.find(b => r.per[b].st !== 'pass') || bs[0];
  const d = document.createElement('tr'); d.className = 'detail';
  d.innerHTML = '<td colspan="'+(5+B.length)+'"><div class="kv"><b>ผลที่คาดหวัง (แผน)</b><pre class="pre">'+esc(r.expected)+'</pre><b>ที่มา</b><span>'+esc(r.source)+'</span><b>tag</b><span>'+r.tags.map(t=>'@'+esc(t)).join(' ')+'</span></div>'+
    '<div class="tabs">'+bs.map(b=>'<button data-b="'+b+'" class="'+(b===first?'on':'')+'">'+BN[b]+' · '+stLabel[r.per[b].st]+'</button>').join('')+'</div><div class="pane">'+browserPane(r, first)+'</div></td>';
  d.querySelector('.tabs').addEventListener('click', ev => { const btn = ev.target.closest('button'); if (!btn) return; d.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on', x===btn)); d.querySelector('.pane').innerHTML = browserPane(r, btn.dataset.b); });
  tr.after(d);
});
document.getElementById('fixed').addEventListener('click', e => { const tr = e.target.closest('tr.row'); if (!tr) return; const q = document.getElementById('q'); q.value = tr.dataset.id; ['fsec','fpri','fst','ftri'].forEach(i => document.getElementById(i).value=''); render(); const t = document.querySelector('#tests tr.row[data-id="'+tr.dataset.id+'"]'); if (t) { t.click(); t.scrollIntoView({behavior:'smooth', block:'start'}); } });
const zoom = document.getElementById('zoom');
document.addEventListener('click', e => { if (e.target.matches('.pt img, .gif img')) { zoom.querySelector('img').src = e.target.src; zoom.style.display = 'flex'; } else if (e.target.closest('#zoom')) zoom.style.display = 'none'; });
</script>
</body>
</html>`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('เขียน index.html แล้ว');
for (const b of BROWSERS) {
  const s = summary[b];
  console.log(`${b.padEnd(14)} ${s.verdict ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}  P1 ${s.p1pass}/${s.p1}  รวม ${s.pass}/${s.total} (${((s.pass * 100) / s.total).toFixed(1)}%) ต้อง ≥${s.need}  เปิดอยู่ ${s.openHigh} ยังไม่จำแนก ${s.untriaged} ไม่ได้รัน ${s.notRun}`);
  console.log('   ' + secs.map((x) => `${x}: ${s.bySec[x].n ? ((s.bySec[x].pass * 100) / s.bySec[x].n).toFixed(0) + '% (' + s.bySec[x].pass + '/' + s.bySec[x].n + ')' : '—'}`).join('  '));
}

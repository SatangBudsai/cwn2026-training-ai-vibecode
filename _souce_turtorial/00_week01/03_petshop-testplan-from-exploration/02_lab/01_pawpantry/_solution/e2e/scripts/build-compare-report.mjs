// สร้าง e2e/index.html แบบเทียบ 2 รอบของ Chromium (+ project api ที่นับให้ chromium)
//   ปกติ    = report-normal/test-report/data/results.json + report-normal/triage.json  (ภาพอยู่ใต้ report-normal/)
//   ฝังบั๊ก = test-report/data/results.json (รอบ bug-*) + triage.json                   (ภาพอยู่ใต้ test-report/)
// test ที่ผ่านในรอบปกติแต่ล้มในโหมดฝังบั๊ก = จุดที่บั๊กใหม่โผล่
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const list = rd('report-normal/test-report/list.json');
const MODES = {
  normal: { label: 'ปกติ (BUG_MODE=0)', data: rd('report-normal/test-report/data/results.json'), triage: rd('report-normal/triage.json'), prefix: 'report-normal/' },
  bug: { label: 'ฝังบั๊ก (BUG_MODE=1)', data: rd('test-report/data/results.json'), triage: rd('triage.json'), prefix: '' },
};
const bugTriage = MODES.bug.triage;

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
    meta[id] = { id, title: spec.title.replace(/^TC-[A-Z0-9]+-\d{3}\s*/, ''), pri: tags.find((t) => /^P\d$/.test(t)) || '?', sec: tags.find((t) => /^5\.\d$/.test(t)) || '?', tags };
    for (const t of spec.tests) (sets[t.projectName] ||= new Set()).add(id);
  }),
);
const apiIds = sets.api || new Set();
const ids = new Set([...(sets.chromium || []), ...apiIds]);

const isPass = (r) => r && r.status === 'passed' && r.outcome === 'expected';
function resultFor(mode, id) {
  const proj = apiIds.has(id) ? 'api' : 'chromium';
  const r = MODES[mode].data.tests[`${proj}|${id}`];
  return r ? { ...r, viaApi: proj === 'api' } : null;
}
const triageFor = (mode, id) => MODES[mode].triage[id] || null;

const secs = ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8'];
const summary = {};
for (const mode of Object.keys(MODES)) {
  let pass = 0, p1 = 0, p1pass = 0, notRun = 0, openHigh = 0, untriaged = 0;
  const bySec = Object.fromEntries(secs.map((s) => [s, { n: 0, pass: 0 }]));
  for (const id of ids) {
    const r = resultFor(mode, id);
    const ok = isPass(r);
    if (!r || r.status === 'skipped') notRun++;
    if (ok) pass++;
    const m = meta[id];
    if (m.pri === 'P1') {
      p1++;
      if (ok) p1pass++;
      else {
        const tr = triageFor(mode, id);
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
  const c1 = p1 > 0 && p1pass === p1, c2 = pass >= need, c3 = openHigh === 0 && untriaged === 0;
  summary[mode] = { total, pass, need, p1, p1pass, notRun, openHigh, untriaged, c1, c2, c3, verdict: c1 && c2 && c3, bySec };
}

const pre = (prefix, p) => (p ? prefix + p : p);
const rows = Object.values(meta)
  .filter((m) => ids.has(m.id))
  .sort((a, b) => (a.sec + a.id).localeCompare(b.sec + b.id, 'en', { numeric: true }))
  .map((m) => {
    const per = {};
    let expected = '', source = '';
    for (const [mode, M] of Object.entries(MODES)) {
      const r = resultFor(mode, m.id);
      const tr = triageFor(mode, m.id);
      per[mode] = r
        ? {
            st: isPass(r) ? 'pass' : r.status === 'skipped' ? 'skip' : 'fail',
            raw: r.status, viaApi: r.viaApi, ms: r.ms, run: r.run, errors: r.errors, steps: r.steps,
            points: (r.points || []).map((p) => ({ ...p, shot: pre(M.prefix, p.shot) })),
            other: (r.other || []).map((o) => ({ ...o, file: pre(M.prefix, o.file) })),
            gif: pre(M.prefix, r.gif), blocked: r.blocked, triage: tr,
          }
        : { st: 'notrun', triage: tr };
      if (r) { expected ||= r.expected; source ||= r.source; }
    }
    const n = per.normal.st, b = per.bug.st;
    const change = n === 'pass' && b !== 'pass' ? 'new-fail' : n !== 'pass' && b === 'pass' ? 'new-pass' : n !== 'pass' && b !== 'pass' ? 'both-fail' : 'both-pass';
    return { ...m, expected, source, per, change, bugId: per.bug.triage?.bug || null };
  });

const changeCounts = rows.reduce((a, r) => ((a[r.change] = (a[r.change] || 0) + 1), a), {});
const triageCounts = {};
for (const r of rows)
  for (const [mode, p] of Object.entries(r.per))
    if (p.st !== 'pass') {
      const c = p.triage?.category || 'ยังไม่จำแนก';
      triageCounts[c] ||= {};
      triageCounts[c][mode] = (triageCounts[c][mode] || 0) + 1;
    }

const payload = {
  generated: new Date().toISOString(),
  // เวลาเริ่มรันจริงของแต่ละรอบ (stamp.txt เป็นค่าตายตัวของรอบปกติ จึงใช้ startTime ที่เก่าที่สุดของ chromium/api แทน)
  stamps: Object.fromEntries(Object.entries(MODES).map(([k, M]) => {
    const t = Object.values(M.data.tests).filter((e) => e.project !== 'mobile-chrome' && e.startTime).map((e) => e.startTime).sort()[0];
    return [k, t ? new Date(t).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : M.data.stamp];
  })),
  modes: Object.keys(MODES), modeLabels: Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, v.label])),
  secs, summary, rows, triageCounts, changeCounts, bugs: bugTriage._bugs || [], triageMeta: bugTriage._meta || null,
};
const json = JSON.stringify(payload).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PawPantry Bug Hunt</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#1d2330;--mute:#667085;--line:#e3e6eb;--pass:#127a3e;--passbg:#e5f5ec;--fail:#b42318;--failbg:#fde8e7;--warn:#9a6700;--warnbg:#fff4d6;--skip:#5d6b82;--skipbg:#eef1f5;--acc:#2f5bd3;--bar:#dfe4ec;--new:#7a1fa2;--newbg:#f4e6fb}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#11141a;--card:#1a1f27;--ink:#e6e9ef;--mute:#98a2b3;--line:#2b323d;--pass:#4cc38a;--passbg:#163626;--fail:#ff8a80;--failbg:#3d1b1a;--warn:#f2c94c;--warnbg:#3a3015;--skip:#a3adbd;--skipbg:#252b35;--acc:#7da2ff;--bar:#2b323d;--new:#e2a8ff;--newbg:#38204a}}
:root[data-theme="dark"]{--bg:#11141a;--card:#1a1f27;--ink:#e6e9ef;--mute:#98a2b3;--line:#2b323d;--pass:#4cc38a;--passbg:#163626;--fail:#ff8a80;--failbg:#3d1b1a;--warn:#f2c94c;--warnbg:#3a3015;--skip:#a3adbd;--skipbg:#252b35;--acc:#7da2ff;--bar:#2b323d;--new:#e2a8ff;--newbg:#38204a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 "Leelawadee UI","Sarabun","Noto Sans Thai",Tahoma,system-ui,sans-serif}
main{max-width:1280px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 12px}
.sub{color:var(--mute)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
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
.c-new{color:var(--new);background:var(--newbg)}
.t-web{color:var(--fail);background:var(--failbg)}.t-plan{color:var(--warn);background:var(--warnbg)}.t-test{color:var(--acc);background:var(--skipbg)}.t-none{color:var(--mute);background:var(--skipbg)}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.filters input,.filters select{padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);font:inherit}
.filters input{flex:1;min-width:200px}
tr.row{cursor:pointer}tr.row:hover{background:var(--skipbg)}
tr.newfail>td:first-child{box-shadow:inset 4px 0 0 var(--new)}
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
#zoom{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;z-index:9;cursor:zoom-out}#zoom img{max-width:96vw;max-height:94vh}
.legend{font-size:13px;color:var(--mute);margin:6px 0}
@media (max-width:700px){.kv{grid-template-columns:1fr}}
</style>
</head>
<body>
<main>
<h1>PawPantry — ล่าบั๊ก: รอบปกติ เทียบ โหมดฝังบั๊ก (Chromium)</h1>
<div class="sub" id="meta"></div>
<p class="legend">ขอบเขต: <b>Chromium</b> 1280×800 บนเว็บ <code>petshop</code> :3000 + project <b>api</b> (นับผลให้ Chromium) · รอบ <b>ปกติ</b> = ผลเดิมที่เก็บไว้ใน <code>report-normal/</code> (รอบหลัก + รอบแก้ test) · รอบ <b>ฝังบั๊ก</b> = เปิดเว็บด้วย <code>BUG_MODE=1</code> (<code>data-bug-mode="1"</code>) แล้วรันทุก test ชุดเดิมโดยไม่แก้ test หรือแผน · ไม่ได้รัน Mobile Chrome ในรอบนี้ · <span class="chip c-new">บั๊กใหม่</span> = ผ่านในรอบปกติแต่ล้มในโหมดฝังบั๊ก</p>

<h2>บั๊กที่โผล่ในโหมดฝังบั๊ก</h2>
<div class="tscroll"><table id="bugs"></table></div>

<h2>เกณฑ์ผ่าน (หัวข้อ 6.2) — แยกทีละรอบ</h2>
<div class="cards" id="exit"></div>
<p class="legend">เกณฑ์: (1) P1 ผ่านทั้งหมด · (2) อัตราผ่านรวม ≥ 90% · (3) ไม่มี P1 ที่ล้มเพราะ "เว็บผิด" และไม่มี P1 ที่ล้มแต่ยังไม่จำแนก</p>
<div class="cards" id="changes" style="margin-top:12px"></div>

<h2>% ผ่านของแต่ละหัวข้อย่อย</h2>
<div class="tscroll"><table id="secs"></table></div>

<h2>การจำแนกข้อที่ล้ม (รอบปกติ: report-normal/triage.json · รอบฝังบั๊ก: triage.json)</h2>
<div class="tscroll"><table id="tri"></table></div>

<h2>ทุก test case</h2>
<div class="filters">
<input id="q" placeholder="ค้นหา ID หรือชื่อ…">
<select id="fsec"><option value="">ทุกหัวข้อ</option></select>
<select id="fpri"><option value="">ทุกระดับ</option><option>P1</option><option>P2</option><option>P3</option></select>
<select id="fch"><option value="">ทุกการเปลี่ยนแปลง</option><option value="new-fail">บั๊กใหม่ (ปกติผ่าน → ฝังบั๊กล้ม)</option><option value="both-fail">ล้มทั้งสองรอบ</option><option value="new-pass">ปกติล้ม → ฝังบั๊กผ่าน</option><option value="both-pass">ผ่านทั้งสองรอบ</option></select>
<select id="ftri"><option value="">ทุกการจำแนก (รอบฝังบั๊ก)</option><option>เว็บผิด</option><option>แผนผิด</option><option>test เขียนผิด</option><option>ยังไม่จำแนก</option></select>
</div>
<div class="legend" id="count"></div>
<div class="tscroll"><table id="tests"></table></div>
</main>
<div id="zoom"><img alt=""></div>
<script id="data" type="application/json">${json}</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const M = D.modes, ML = {normal:'ปกติ', bug:'ฝังบั๊ก'};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct = (a,n) => n ? Math.round(a*1000/n)/10 : 0;
const triCls = c => c==='เว็บผิด'?'t-web':c==='แผนผิด'?'t-plan':c==='test เขียนผิด'?'t-test':'t-none';
const stLabel = {pass:'ผ่าน',fail:'ล้ม',skip:'ข้าม',notrun:'ไม่ได้รัน'};
const chLabel = {'new-fail':'บั๊กใหม่','both-fail':'ล้มทั้งสองรอบ','new-pass':'กลับมาผ่าน','both-pass':'ผ่านทั้งสองรอบ'};
document.getElementById('meta').textContent = 'รอบปกติ ' + (D.stamps.normal||'-') + ' · รอบฝังบั๊ก ' + (D.stamps.bug||'-') + ' · สร้างรายงาน ' + new Date(D.generated).toLocaleString('th-TH') + ' · ' + D.rows.length + ' test case';

document.getElementById('bugs').innerHTML = '<thead><tr><th>บั๊ก</th><th>อาการ</th><th>ความรุนแรง</th><th>test ที่จับได้</th><th>ทายไว้ในหัวข้อ 8.2</th></tr></thead><tbody>'+
  D.bugs.map(b => '<tr><td><b>'+esc(b.id)+'</b></td><td>'+esc(b.title)+'</td><td><span class="chip '+(/Critical|High/.test(b.severity)?'c-fail':'t-plan')+'">'+esc(b.severity)+'</span></td><td>'+b.tests.map(t=>'<a href="#" class="jump" data-id="'+t+'">'+t+'</a>').join(', ')+'</td><td>'+esc(b.predicted)+'</td></tr>').join('')+'</tbody>';

document.getElementById('exit').innerHTML = M.map(m => { const s = D.summary[m]; return '<div class="card"><h3>'+esc(D.modeLabels[m])+' <span class="sub">('+s.total+' ข้อ)</span></h3>'+
 '<div class="verdict '+(s.verdict?'v-pass':'v-fail')+'">'+(s.verdict?'ผ่านเกณฑ์':'ไม่ผ่านเกณฑ์')+'</div><ul class="crit">'+
 '<li><span class="'+(s.c1?'ok':'ng')+'">'+(s.c1?'✓':'✗')+'</span><span>P1 ผ่าน '+s.p1pass+' / '+s.p1+'</span></li>'+
 '<li><span class="'+(s.c2?'ok':'ng')+'">'+(s.c2?'✓':'✗')+'</span><span>ผ่านรวม '+s.pass+' / '+s.total+' ('+pct(s.pass,s.total)+'%) ต้องได้ ≥ '+s.need+'</span></li>'+
 '<li><span class="'+(s.c3?'ok':'ng')+'">'+(s.c3?'✓':'✗')+'</span><span>P1 ที่ล้มเพราะเว็บผิด '+s.openHigh+(s.untriaged?' · P1 ล้มที่ยังไม่จำแนก '+s.untriaged:'')+'</span></li></ul></div>'; }).join('');
const C = D.changeCounts;
document.getElementById('changes').innerHTML = ['new-fail','both-fail','new-pass','both-pass'].map(k => '<div class="card"><h3>'+chLabel[k]+'</h3><div style="font-size:26px;font-weight:700" class="'+(k==='new-fail'?'ng':'')+'">'+(C[k]||0)+'</div><div class="sub">'+({'new-fail':'ปกติผ่าน → ฝังบั๊กล้ม','both-fail':'บั๊กเดิมของเว็บ/แผน','new-pass':'ปกติล้ม → ฝังบั๊กผ่าน','both-pass':'ไม่เปลี่ยน'})[k]+'</div></div>').join('');

const secName = {'5.1':'แคตตาล็อกและการค้นหา','5.2':'หน้ารายละเอียดสินค้า','5.3':'ตะกร้าสินค้า','5.4':'คูปองและค่าส่ง','5.5':'ชำระเงิน คำสั่งซื้อ และบัญชี','5.6':'สมัครสมาชิก เข้าสู่ระบบ และ session','5.7':'ตัวช่วยเลือกอาหาร คำแนะนำ และรายการโปรด','5.8':'โครงเว็บ มือถือ และการเข้าถึง'};
const secNew = s => D.rows.filter(r => r.sec===s && r.change==='new-fail').length;
document.getElementById('secs').innerHTML = '<thead><tr><th>หัวข้อย่อย</th>'+M.map(m=>'<th>'+ML[m]+'</th>').join('')+'<th>บั๊กใหม่</th></tr></thead><tbody>'+
 D.secs.map(s => '<tr><td><b>'+s+'</b> '+secName[s]+'</td>'+M.map(m => { const x = D.summary[m].bySec[s]; if(!x.n) return '<td class="sub">—</td>'; const p = pct(x.pass,x.n); return '<td><div class="pct"><div class="b"><i style="width:'+p+'%"></i></div><span>'+p+'% ('+x.pass+'/'+x.n+')</span></div></td>'; }).join('')+'<td class="num">'+(secNew(s)||'')+'</td></tr>').join('')+
 '<tr><td><b>รวม</b></td>'+M.map(m=>{const s=D.summary[m];const p=pct(s.pass,s.total);return '<td><div class="pct"><div class="b"><i style="width:'+p+'%"></i></div><span><b>'+p+'%</b> ('+s.pass+'/'+s.total+')</span></div></td>';}).join('')+'<td class="num"><b>'+(C['new-fail']||0)+'</b></td></tr></tbody>';

const cats = ['เว็บผิด','แผนผิด','test เขียนผิด','ยังไม่จำแนก'];
document.getElementById('tri').innerHTML = '<thead><tr><th>การจำแนก</th>'+M.map(m=>'<th>'+ML[m]+'</th>').join('')+'</tr></thead><tbody>'+cats.map(c=>'<tr><td><span class="chip '+triCls(c)+'">'+c+'</span></td>'+M.map(m=>'<td class="num">'+((D.triageCounts[c]||{})[m]||0)+'</td>').join('')+'</tr>').join('')+'</tbody>';

const fsec = document.getElementById('fsec'); D.secs.forEach(s => fsec.insertAdjacentHTML('beforeend','<option value="'+s+'">'+s+' '+secName[s]+'</option>'));
const bugTri = r => r.per.bug.st==='pass' ? null : (r.per.bug.triage?.category || 'ยังไม่จำแนก');
function render() {
  const q = document.getElementById('q').value.trim().toLowerCase(), sec = fsec.value, pri = document.getElementById('fpri').value, ch = document.getElementById('fch').value, tri = document.getElementById('ftri').value;
  const rows = D.rows.filter(r => (!q || (r.id+' '+r.title+' '+(r.bugId||'')).toLowerCase().includes(q)) && (!sec || r.sec===sec) && (!pri || r.pri===pri) && (!ch || r.change===ch) && (!tri || bugTri(r)===tri));
  document.getElementById('count').textContent = 'แสดง ' + rows.length + ' / ' + D.rows.length + ' ข้อ · กดที่แถวเพื่อดูรายละเอียด (แท็บ ปกติ / ฝังบั๊ก)';
  document.getElementById('tests').innerHTML = '<thead><tr><th>ID</th><th>สิ่งที่ทดสอบ</th><th>ระดับ</th><th>หัวข้อ</th><th>ปกติ</th><th>ฝังบั๊ก</th><th>การจำแนก (ฝังบั๊ก)</th></tr></thead><tbody>'+
    rows.map(r => '<tr class="row'+(r.change==='new-fail'?' newfail':'')+'" data-id="'+r.id+'"><td><b>'+r.id+'</b></td><td>'+esc(r.title)+'</td><td>'+r.pri+'</td><td>'+r.sec+'</td>'+
      M.map(m => { const p = r.per[m]; return '<td><span class="chip c-'+p.st+'">'+stLabel[p.st]+(p.viaApi?' (api)':'')+'</span></td>'; }).join('')+
      '<td>'+(r.change==='new-fail'?'<span class="chip c-new">บั๊กใหม่ '+esc(r.bugId||'')+'</span> ':'')+(bugTri(r)?'<span class="chip '+triCls(bugTri(r))+'">'+bugTri(r)+'</span>':'')+(r.change==='new-pass'?'<span class="chip c-pass">กลับมาผ่าน</span>':'')+'</td></tr>').join('')+'</tbody>';
}
['q','fsec','fpri','fch','ftri'].forEach(id => document.getElementById(id).addEventListener('input', render));
render();

function stepsHtml(steps) { if (!steps || !steps.length) return ''; return '<ol class="steps">'+steps.map(s => '<li'+(s.error?' class="err"':'')+'>'+(s.error?'✗ ':'')+esc(s.title)+(s.steps?stepsHtml(s.steps):'')+'</li>').join('')+'</ol>'; }
function pane(r, m) {
  const p = r.per[m];
  if (p.st === 'notrun') return '<p>ไม่ได้รันในรอบนี้</p>';
  let h = '<div class="kv"><b>สถานะ</b><span><span class="chip c-'+p.st+'">'+stLabel[p.st]+'</span> '+esc(p.raw)+' · '+(p.ms/1000).toFixed(1)+' วินาที · รอบ '+esc(p.run)+(p.viaApi?' · รันที่ project api (นับให้ chromium)':'')+'</span>';
  const t = p.triage;
  if (t && p.st !== 'pass') h += '<b>การจำแนก</b><span><span class="chip '+triCls(t.category)+'">'+esc(t.category)+'</span>'+(t.bug?' <span class="chip c-new">'+esc(t.bug)+'</span>':'')+(t.sameAsNormal?' <span class="sub">(เหมือนรอบปกติ)</span>':'')+' '+esc(t.reason||'')+(t.evidence?'<br><span class="sub">หลักฐาน: '+esc(t.evidence)+'</span>':'')+'</span>';
  else if (t && p.st === 'pass' && m==='normal') h += '<b>ประวัติ</b><span>รอบหลักล้ม จำแนกเป็น <span class="chip '+triCls(t.category)+'">'+esc(t.category)+'</span> '+esc(t.reason||'')+(t.rerun?'<br><span class="sub">รอบแก้ ('+esc(t.rerun.run)+'): '+esc(t.rerun.status)+'</span>':'')+'</span>';
  else if (p.st !== 'pass') h += '<b>การจำแนก</b><span><span class="chip t-none">ยังไม่จำแนก</span></span>';
  h += '</div>';
  if (p.errors && p.errors.length) h += '<h4>ผลจริง / ข้อความ error</h4><pre class="pre">'+esc(p.errors.join('\\n\\n────\\n\\n'))+'</pre>';
  h += '<h4>ขั้นตอน</h4>'+stepsHtml(p.steps);
  if (p.points && p.points.length) h += '<h4>จุดตรวจ (ภาพตอนตรวจ กรอบแดง = element ที่ตรวจ)</h4><div class="points">'+p.points.map(pt =>
    '<div class="pt"><div><span class="chip '+(pt.ok===false?'c-fail':pt.ok?'c-pass':'c-skip')+'">'+(pt.ok===false?'ไม่ตรง':pt.ok?'ตรง':'—')+'</span> <b>'+esc(pt.label)+'</b></div>'+
    (pt.actual?'<div class="sub" style="margin-top:4px">ค่าจริง:</div><pre class="pre">'+esc(pt.actual.slice(0,600))+'</pre>':'')+(pt.shot?'<img loading="lazy" src="'+pt.shot+'" alt="'+esc(pt.label)+'">':'')+'</div>').join('')+'</div>';
  if (p.other && p.other.length) h += '<h4>ภาพตอนล้ม</h4><div class="points">'+p.other.map(o=>'<div class="pt"><img loading="lazy" src="'+o.file+'"></div>').join('')+'</div>';
  if (p.gif) h += '<h4>GIF ('+ML[m]+')</h4><div class="gif"><img loading="lazy" src="'+p.gif+'" alt="GIF '+r.id+'"></div>';
  return h;
}
function openRow(tr) {
  const nx = tr.nextElementSibling; if (nx && nx.classList.contains('detail')) { nx.remove(); return; }
  const r = D.rows.find(x => x.id === tr.dataset.id);
  const first = r.per.bug.st !== 'pass' ? 'bug' : 'normal';
  const d = document.createElement('tr'); d.className = 'detail';
  d.innerHTML = '<td colspan="7"><div class="kv"><b>ผลที่คาดหวัง (แผน)</b><pre class="pre">'+esc(r.expected)+'</pre><b>ที่มา</b><span>'+esc(r.source)+'</span><b>tag</b><span>'+r.tags.map(t=>'@'+esc(t)).join(' ')+'</span></div>'+
    '<div class="tabs">'+M.map(m=>'<button data-m="'+m+'" class="'+(m===first?'on':'')+'">'+ML[m]+' · '+stLabel[r.per[m].st]+'</button>').join('')+'</div><div class="pane">'+pane(r, first)+'</div></td>';
  d.querySelector('.tabs').addEventListener('click', ev => { const btn = ev.target.closest('button'); if (!btn) return; d.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on', x===btn)); d.querySelector('.pane').innerHTML = pane(r, btn.dataset.m); });
  tr.after(d);
}
document.getElementById('tests').addEventListener('click', e => { const tr = e.target.closest('tr.row'); if (tr) openRow(tr); });
document.getElementById('bugs').addEventListener('click', e => { const a = e.target.closest('a.jump'); if (!a) return; e.preventDefault(); const q = document.getElementById('q'); q.value = a.dataset.id; ['fsec','fpri','fch','ftri'].forEach(i => document.getElementById(i).value=''); render(); const t = document.querySelector('#tests tr.row[data-id="'+a.dataset.id+'"]'); if (t) { openRow(t); t.scrollIntoView({behavior:'smooth', block:'start'}); } });
const zoom = document.getElementById('zoom');
document.addEventListener('click', e => { if (e.target.matches('.pt img, .gif img')) { zoom.querySelector('img').src = e.target.src; zoom.style.display = 'flex'; } else if (e.target.closest('#zoom')) zoom.style.display = 'none'; });
</script>
</body>
</html>`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('เขียน index.html แล้ว', changeCounts);
for (const m of Object.keys(MODES)) {
  const s = summary[m];
  console.log(`${m.padEnd(7)} ${s.verdict ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}  P1 ${s.p1pass}/${s.p1}  รวม ${s.pass}/${s.total}  P1 เว็บผิด ${s.openHigh} ยังไม่จำแนก ${s.untriaged}`);
}

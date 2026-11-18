#!/usr/bin/env node
/**
 * สร้างรายงานหน้าเดียว e2e/index.html (เปิดด้วยดับเบิลคลิก ไม่ต้องมี server — ข้อมูลฝังในหน้า รูป/GIF อ้างแบบ relative)
 *   node scripts/build-report.mjs
 * อ่าน: test-report/data-main.json (+ data-rerun.json ถ้ามี แทนผลของ ID เดียวกัน) · triage.json · .state/searches.jsonl · .state/STOP.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return d; } };

const main = rd('test-report/data-main.json', []);
const rerun = fs.readdirSync(path.join(ROOT, 'test-report')).filter((f) => /^data-rerun.*\.json$/.test(f)).sort().flatMap((f) => rd('test-report/' + f, []));
const triage = rd('triage.json', {});
const stop = rd('.state/STOP.json', null);
const explore = rd('test-report/explore-searches.json', null);
let searchLog = [];
try { searchLog = fs.readFileSync(path.join(ROOT, '.state/searches.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch {}

const byId = new Map(main.map((t) => [t.id, { ...t, first: null }]));
for (const r of rerun) {
  if (!r.status || r.notRun) continue;
  const prev = byId.get(r.id);
  byId.set(r.id, { ...r, prefix: 'rerun', first: prev ? { status: prev.status, errors: prev.errors, gif: prev.gif } : null });
}
const order = (id) => { const m = id.match(/TC-([A-Z]+)-(\d+)/); const mods = ['SRCH', 'RES', 'FLT', 'PRC', 'BKG', 'LOC']; return m ? mods.indexOf(m[1]) * 100 + +m[2] : 9999; };
const tests = [...byId.values()].sort((a, b) => order(a.id) - order(b.id)).map((t) => {
  const tg = t.tags.map((x) => x.replace(/^@/, ''));
  const prio = tg.find((x) => /^P\d$/.test(x)) || '';
  const section = tg.find((x) => /^5\.\d$/.test(x)) || '';
  let result;
  if (t.status === 'passed') result = 'ผ่าน';
  else if (t.status === 'skipped' && t.naAll) result = 'N/A';
  else if (t.status === 'skipped' || t.notRun || t.errors.some((e) => /งบการค้นหาครบ|หน้า booking ครบ|หยุดทั้งชุด/.test(e))) result = 'ไม่ได้รัน';
  else result = 'ล้ม';
  return { ...t, prio, section, result, triage: triage[t.id] || null };
});

const SECTIONS = [
  ['5.1', 'ฟอร์มค้นหา'], ['5.2', 'ผลลัพธ์และการจัดอันดับ'], ['5.3', 'ตัวกรอง'],
  ['5.4', 'เครื่องมือราคาและวันที่'], ['5.5', 'เลือกเที่ยวบินและหน้า booking'], ['5.6', 'ภาษา สกุลเงิน และหน้าแรก'],
];
const sec = SECTIONS.map(([s, name]) => {
  const ts = tests.filter((t) => t.section === s);
  const na = ts.filter((t) => t.result === 'N/A').length;
  const pass = ts.filter((t) => t.result === 'ผ่าน').length;
  const denom = ts.length - na;
  return { s, name, n: ts.length, pass, fail: ts.filter((t) => t.result === 'ล้ม').length, notrun: ts.filter((t) => t.result === 'ไม่ได้รัน').length, na, pct: denom ? Math.round((pass / denom) * 1000) / 10 : null };
});

// ── เกณฑ์หัวข้อ 6.2 ──
const TOTAL = 38;
const nNA = tests.filter((t) => t.result === 'N/A').length;
const passed = tests.filter((t) => t.result === 'ผ่าน').length;
const need = Math.ceil(0.85 * (TOTAL - nNA));
const p1 = tests.filter((t) => t.prio === 'P1');
const p1NA = p1.filter((t) => t.result === 'N/A');
const p1Pass = p1.filter((t) => t.result === 'ผ่าน').length;
const X1 = { ok: p1NA.length === 0 && p1Pass === 22 && p1.length === 22, undecided: p1NA.length > 0, text: `P1 ผ่าน ${p1Pass} / 22${p1NA.length ? ` · N/A ทั้งข้อ ${p1NA.length} (ต้องรันซ้ำวันอื่น)` : ''}` };
const X2 = { ok: passed >= need, text: `ผ่าน ${passed} / ${TOTAL - nNA} = ${(TOTAL - nNA) ? ((passed / (TOTAL - nNA)) * 100).toFixed(1) : 0}% · เกณฑ์ ≥ 85% (≥ ${need} ข้อ)` };
const ran = tests.filter((t) => t.result === 'ผ่าน' || t.result === 'ล้ม');
const missingEvidence = ran.filter((t) => t.checks.filter((c) => c.status !== 'na').some((c) => !c.shot));
const X3 = { ok: missingEvidence.length === 0, text: missingEvidence.length ? `ขาดภาพตอนตรวจ: ${missingEvidence.map((t) => t.id).join(', ')}` : `ทุกจุดตรวจที่ตัดสินแล้วมีภาพหน้าจอพร้อมเวลา (${ran.reduce((a, t) => a + t.checks.filter((c) => c.status !== 'na').length, 0)} จุด)` };
const failed = tests.filter((t) => t.result === 'ล้ม' || t.result === 'ไม่ได้รัน' && !stop);
const untriaged = tests.filter((t) => t.result === 'ล้ม' && !t.triage?.category);
const X4 = { ok: untriaged.length === 0, text: untriaged.length ? `ยังไม่จำแนก: ${untriaged.map((t) => t.id).join(', ')}` : `ข้อที่ล้มจำแนกครบ ${tests.filter((t) => t.result === 'ล้ม').length} ข้อ` };
let verdict;
if (stop && /CAPTCHA|unusual|บล็อก|429|403|sorry|reCAPTCHA/i.test(stop.reason)) verdict = 'ยังสรุปไม่ได้';
else if (!X3.ok || !X4.ok || X1.undecided) verdict = 'ยังสรุปไม่ได้';
else if (X1.ok && X2.ok) verdict = 'ผ่าน';
else verdict = 'ไม่ผ่าน';

const totals = {
  search: searchLog.filter((l) => l.kind === 'search').length,
  booking: searchLog.filter((l) => l.kind === 'booking').length,
  explore, generated: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
  counts: { ผ่าน: passed, ล้ม: tests.filter((t) => t.result === 'ล้ม').length, 'N/A': nNA, ไม่ได้รัน: tests.filter((t) => t.result === 'ไม่ได้รัน').length },
};
const DATA = { tests, sec, crit: { X1, X2, X3, X4, verdict, stop }, totals };

const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>รายงานทดสอบ Google Flights</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#1b1f24;--muted:#5b6571;--line:#e2e5ea;--pass:#1a7f37;--passbg:#e6f4ea;--fail:#c62828;--failbg:#fdecea;--na:#6b7280;--nabg:#eef0f3;--warn:#9a6700;--warnbg:#fff4d6;--accent:#1f5fbf}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f1216;--card:#171b21;--ink:#e6e9ee;--muted:#9aa4b1;--line:#2a3039;--pass:#4ac26b;--passbg:#12301c;--fail:#ff6b6b;--failbg:#3a1616;--na:#9aa4b1;--nabg:#232831;--warn:#e3b341;--warnbg:#332a12;--accent:#6ea8ff}}
:root[data-theme="dark"]{--bg:#0f1216;--card:#171b21;--ink:#e6e9ee;--muted:#9aa4b1;--line:#2a3039;--pass:#4ac26b;--passbg:#12301c;--fail:#ff6b6b;--failbg:#3a1616;--na:#9aa4b1;--nabg:#232831;--warn:#e3b341;--warnbg:#332a12;--accent:#6ea8ff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 "Sarabun","Leelawadee UI","Noto Sans Thai",system-ui,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:24px;margin:0 0 4px}
h2{font-size:17px;margin:28px 0 10px}
.sub{color:var(--muted);font-size:13.5px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.verdict{font-size:28px;font-weight:700;margin:2px 0}
.v-ok{color:var(--pass)}.v-bad{color:var(--fail)}.v-und{color:var(--warn)}
.crit{display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-top:1px solid var(--line)}
.crit:first-of-type{border-top:0}
.pill{display:inline-block;font-size:12px;font-weight:600;padding:1px 8px;border-radius:999px;white-space:nowrap}
.p-pass{background:var(--passbg);color:var(--pass)}.p-fail{background:var(--failbg);color:var(--fail)}.p-na{background:var(--nabg);color:var(--na)}.p-nr{background:var(--warnbg);color:var(--warn)}
.big{font-size:22px;font-weight:700}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12.5px;color:var(--muted);font-weight:600;background:var(--nabg)}
tr.row{cursor:pointer}tr.row:hover td{background:var(--nabg)}
tr.detail td{background:var(--bg);padding:14px}
.bar{height:8px;background:var(--nabg);border-radius:4px;overflow:hidden;min-width:80px}
.bar>i{display:block;height:100%;background:var(--pass)}
.num{font-variant-numeric:tabular-nums;text-align:right}
.tblwrap{overflow-x:auto}
.det h4{margin:14px 0 6px;font-size:14px}
.det ul{margin:4px 0;padding-left:20px}
.err{white-space:pre-wrap;font:12.5px/1.45 ui-monospace,Consolas,monospace;background:var(--failbg);color:var(--ink);border-radius:6px;padding:8px 10px;max-height:260px;overflow:auto}
.shots{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.shots figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.shots img{width:100%;display:block}
.shots figcaption{font-size:12.5px;padding:6px 8px}
.gif img{max-width:100%;border:1px solid var(--line);border-radius:8px}
.steps{font-size:13.5px}.steps li.bad>span{color:var(--fail);font-weight:600}
.tri{border-left:4px solid var(--warn);background:var(--warnbg);padding:8px 12px;border-radius:6px}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.filters button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:4px 12px;cursor:pointer;font:inherit;font-size:13px}
.filters button.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.muted{color:var(--muted)}
a{color:var(--accent)}
</style>
</head>
<body>
<div class="wrap">
<h1>รายงานทดสอบ Google Flights · กรุงเทพ → โตเกียว</h1>
<div class="sub" id="meta"></div>

<h2>สรุปตามเกณฑ์หัวข้อ 6 ของแผน</h2>
<div class="grid">
  <div class="card"><div class="sub">ผลของชุด (6.2)</div><div class="verdict" id="verdict"></div><div id="counts" class="sub"></div></div>
  <div class="card" style="grid-column:span 2" id="crit"></div>
</div>

<h2>% ผ่านของแต่ละหัวข้อย่อย</h2>
<div class="tblwrap"><table id="sec"><thead><tr><th>หัวข้อย่อย</th><th class="num">จำนวน test</th><th class="num">ผ่าน</th><th class="num">ล้ม</th><th class="num">N/A</th><th class="num">ไม่ได้รัน</th><th class="num">%</th><th></th></tr></thead><tbody></tbody></table></div>

<h2>ทุก test <span class="sub">(กดที่แถวเพื่อดูรายละเอียด)</span></h2>
<div class="filters" id="flt"></div>
<div class="tblwrap"><table id="tests"><thead><tr><th>ID</th><th>ชื่อ</th><th>ระดับ</th><th>หัวข้อ</th><th>ผล</th><th>การจำแนก</th><th class="num">ค้นหา</th><th class="num">เวลา</th></tr></thead><tbody></tbody></table></div>
</div>
<script>
const DATA = ${JSON.stringify(DATA).replace(/</g, '\\u003c')};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pill = (r) => '<span class="pill ' + ({ 'ผ่าน': 'p-pass', 'ล้ม': 'p-fail', 'N/A': 'p-na', 'ไม่ได้รัน': 'p-nr' }[r] || 'p-na') + '">' + esc(r) + '</span>';
const C = DATA.crit, T = DATA.totals;
document.getElementById('meta').textContent = 'สร้างรายงาน ' + T.generated + ' · Chromium · workers 1 · retries 0 · การค้นหาระหว่างรันชุด ' + T.search + ' ครั้ง (เพดาน 105) · หน้า booking ' + T.booking + ' หน้า (เพดาน 20)' + (T.explore ? ' · การค้นหาตอนเขียน test (subagent) ' + T.explore.total + ' ครั้ง' : '');
const v = document.getElementById('verdict'); v.textContent = C.verdict; v.className = 'verdict ' + (C.verdict === 'ผ่าน' ? 'v-ok' : C.verdict === 'ไม่ผ่าน' ? 'v-bad' : 'v-und');
document.getElementById('counts').innerHTML = Object.entries(T.counts).map(([k, n]) => pill(k) + ' ' + n).join(' &nbsp; ');
document.getElementById('crit').innerHTML = [['X1', 'P1 ผ่านทั้งหมด', C.X1], ['X2', 'อัตราผ่านรวม ≥ 85%', C.X2], ['X3', 'หลักฐานครบ', C.X3], ['X4', 'ความล้มเหลวจัดประเภทครบ', C.X4]]
  .map(([k, n, x]) => '<div class="crit">' + (x.ok ? '<span class="pill p-pass">ผ่านเกณฑ์</span>' : '<span class="pill p-fail">ไม่ผ่านเกณฑ์</span>') + '<div><b>' + k + ' · ' + n + '</b><div class="sub">' + esc(x.text) + '</div></div></div>').join('')
  + (C.stop ? '<div class="crit"><span class="pill p-nr">หยุดชุด</span><div><b>' + esc(C.stop.reason) + '</b><div class="sub">' + esc(C.stop.test + ' · ' + C.stop.url + ' · ' + C.stop.at) + '</div></div></div>' : '');
document.querySelector('#sec tbody').innerHTML = DATA.sec.map((s) => '<tr><td><b>' + s.s + '</b> ' + esc(s.name) + '</td><td class="num">' + s.n + '</td><td class="num">' + s.pass + '</td><td class="num">' + s.fail + '</td><td class="num">' + s.na + '</td><td class="num">' + s.notrun + '</td><td class="num"><b>' + (s.pct == null ? '–' : s.pct + '%') + '</b></td><td><div class="bar"><i style="width:' + (s.pct || 0) + '%"></i></div></td></tr>').join('')
  + (() => { const n = DATA.tests.length, p = DATA.tests.filter(t => t.result === 'ผ่าน').length, na = DATA.tests.filter(t => t.result === 'N/A').length; const pct = n - na ? Math.round(p / (n - na) * 1000) / 10 : 0; return '<tr><td><b>รวม</b></td><td class="num"><b>' + n + '</b></td><td class="num"><b>' + p + '</b></td><td class="num">' + DATA.tests.filter(t => t.result === 'ล้ม').length + '</td><td class="num">' + na + '</td><td class="num">' + DATA.tests.filter(t => t.result === 'ไม่ได้รัน').length + '</td><td class="num"><b>' + pct + '%</b></td><td><div class="bar"><i style="width:' + pct + '%"></i></div></td></tr>'; })();

function stepsHtml(steps) {
  if (!steps || !steps.length) return '';
  return '<ul>' + steps.map((s) => '<li class="' + (s.error ? 'bad' : '') + '"><span>' + esc(s.title) + '</span> <span class="muted">(' + (s.ms / 1000).toFixed(1) + ' วิ)</span>' + (s.error && !(s.steps || []).some(c => c.error) ? '<div class="err">' + esc(s.error) + '</div>' : '') + stepsHtml(s.steps) + '</li>').join('') + '</ul>';
}
function detail(t) {
  const checks = t.checks.map((c) => '<li>' + pill(c.status === 'pass' ? 'ผ่าน' : c.status === 'fail' ? 'ล้ม' : 'N/A') + ' ' + esc(c.label) + (c.note ? ' <span class="muted">— ' + esc(c.note) + '</span>' : '') + '</li>').join('');
  const shots = t.shots.filter((s) => !s.final).map((s) => '<figure><a href="test-report/' + esc(s.file) + '" target="_blank"><img loading="lazy" src="test-report/' + esc(s.file) + '" alt=""></a><figcaption>' + esc(s.name) + '</figcaption></figure>').join('');
  const tri = t.triage ? '<div class="tri"><b>' + esc(t.triage.category) + '</b> — ' + esc(t.triage.reason || '') + (t.triage.action ? '<div class="sub">ต่อไป: ' + esc(t.triage.action) + '</div>' : '') + '</div>' : (t.result === 'ล้ม' ? '<div class="tri">ยังไม่จำแนก</div>' : '<span class="muted">—</span>');
  return '<div class="det">'
    + '<h4>ผลที่คาดหวังจากแผน</h4><ul>' + t.expected.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>'
    + '<h4>ที่มา</h4><div>' + esc(t.source) + (t.budget ? ' · งบค้นหา ' + esc(t.budget) : '') + ' · ไฟล์ <code>tests/' + esc(t.file) + '</code></div>'
    + '<h4>การจำแนกข้อที่ล้ม (triage.json)</h4>' + tri
    + (t.first ? '<h4>รันซ้ำ 1 ครั้งหลังแก้ test</h4><div class="sub">ผลรอบแรก: ' + esc(t.first.status) + (t.first.gif ? '' : '') + '</div>' : '')
    + '<h4>ผลจริงของแต่ละจุดตรวจ</h4><ul>' + (checks || '<li class="muted">ไม่มีจุดตรวจที่บันทึก</li>') + '</ul>'
    + (t.errors.length ? '<h4>ข้อความ error</h4>' + t.errors.map((e) => '<div class="err">' + esc(e) + '</div>').join('<br>') : '')
    + (t.na.length ? '<h4>N/A ตามเงื่อนไขในแผน</h4><ul>' + t.na.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '')
    + (t.notes.length ? '<h4>บันทึกจาก test</h4><ul>' + t.notes.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '')
    + '<h4>การค้นหาที่ใช้ (' + t.searches.length + ' ครั้ง · booking ' + t.bookings.length + ' หน้า)</h4><ul>' + t.searches.map((x) => '<li>' + esc(x) + '</li>').join('') + t.bookings.map((x) => '<li>booking: ' + esc(x) + '</li>').join('') + '</ul>'
    + '<h4>ขั้นตอน (test.step)</h4><div class="steps">' + stepsHtml(t.steps) + '</div>'
    + '<h4>GIF</h4><div class="gif">' + (t.gif ? '<img loading="lazy" src="test-report/' + esc(t.gif) + '" alt="GIF ' + esc(t.id) + '">' : '<span class="muted">ไม่มี</span>') + (t.video ? ' <div><a href="test-report/' + esc(t.video) + '" target="_blank">วิดีโอเต็ม</a></div>' : '') + '</div>'
    + '<h4>ภาพตอนตรวจ (กรอบแดง)</h4><div class="shots">' + (shots || '<span class="muted">ไม่มี</span>') + '</div>'
    + '</div>';
}
let filter = 'ทั้งหมด';
function render() {
  const tb = document.querySelector('#tests tbody');
  tb.innerHTML = '';
  DATA.tests.filter((t) => filter === 'ทั้งหมด' || t.result === filter || t.section === filter).forEach((t) => {
    const tr = document.createElement('tr'); tr.className = 'row';
    tr.innerHTML = '<td><b>' + esc(t.id) + '</b></td><td>' + esc(t.title.replace(/^TC-[A-Z]+-\\d+\\s*·\\s*/, '')) + (t.prefix === 'rerun' ? ' <span class="pill p-nr">รันซ้ำ</span>' : '') + '</td><td>' + esc(t.prio) + '</td><td>' + esc(t.section) + '</td><td>' + pill(t.result) + '</td><td>' + esc(t.triage ? t.triage.category : '') + '</td><td class="num">' + t.searches.length + '</td><td class="num">' + (t.duration / 60000).toFixed(1) + ' น.</td>';
    const dr = document.createElement('tr'); dr.className = 'detail'; dr.hidden = true;
    dr.innerHTML = '<td colspan="8"></td>';
    tr.onclick = () => { if (!dr.firstChild.innerHTML) dr.firstChild.innerHTML = detail(t); dr.hidden = !dr.hidden; };
    tb.append(tr, dr);
  });
}
const fl = document.getElementById('flt');
['ทั้งหมด', 'ผ่าน', 'ล้ม', 'N/A', 'ไม่ได้รัน', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6'].forEach((f) => { const b = document.createElement('button'); b.textContent = f; if (f === filter) b.className = 'on'; b.onclick = () => { filter = f; [...fl.children].forEach((x) => x.className = x === b ? 'on' : ''); render(); }; fl.append(b); });
render();
</script>
</body>
</html>`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log(`index.html: ${tests.length} tests · verdict ${verdict} · searches ${totals.search} · booking ${totals.booking}`);

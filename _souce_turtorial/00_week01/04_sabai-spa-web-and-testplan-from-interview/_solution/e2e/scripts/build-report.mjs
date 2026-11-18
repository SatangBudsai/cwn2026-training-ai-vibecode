#!/usr/bin/env node
/**
 * รวมผลทุกชุดเป็นรายงานหน้าเดียว e2e/index.html (เปิดด้วยการดับเบิลคลิก ไม่ต้องมี server)
 * ข้อมูลฝังในหน้า เพราะ file:// fetch ไม่ได้ · ภาพและ GIF อ้าง path สัมพัทธ์ใต้ test-report/
 * เกณฑ์: TEST-PLAN.md หัวข้อ 6 · การจำแนกข้อล้ม: e2e/triage.json · เทียบส่วน C: e2e/section-c-check.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPORT = path.join(ROOT, 'test-report');
const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };

const SECTIONS = {
  '5.1': 'จองคิวพื้นฐาน', '5.2': 'จองคู่และจองกลุ่ม', '5.3': 'ราคา แต้ม ระดับสมาชิก และเดือนเกิด', '5.4': 'รถรับส่งและ Bangkok Relax',
  '5.5': 'คอร์สและ Wallet', '5.6': 'Gift Card และฐานแต้ม', '5.7': 'ยกเลิก บัญชี หลังร้าน และสิทธิ์', '5.8': 'ตัวช่วยเลือก แชต ภาษา และบรรยากาศ',
};
// แผนหัวข้อ 6
const CRITERIA = {
  chromium: { label: 'Chromium', total: 80, p1: 68, minPass: 72 },
  'mobile-chrome': { label: 'Chrome บนมือถือ (Pixel 7)', total: 3, p1: 1, minPass: 3 },
};

const triage = readJson(path.join(ROOT, 'triage.json'), {});
const sectionC = readJson(path.join(ROOT, 'section-c-check.json'), []);
const bugMode = readJson(path.join(REPORT, 'bug-mode.json'), { bugMode: 'ไม่ทราบ' }).bugMode;
const loadStats = readJson(path.join(REPORT, 'load-stats.json'), []);
// เทียบรอบปกติจาก scripts/compare-rounds.mjs · ข้อที่ไม่มีผลรอบนี้แสดงเป็นหมายเหตุ
const compare = readJson(path.join(REPORT, 'compare.json'), []);
const notRun = compare.filter((c) => c.group === 'ไม่ได้รันรอบฝังบั๊ก').map((c) => `${c.id}@${c.project}`);

const tests = [];
for (const project of Object.keys(CRITERIA)) {
  const dir = path.join(REPORT, 'results', project);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    const r = readJson(path.join(dir, f), null);
    if (!r || !/^TC-/.test(r.id)) continue;
    const ev = readJson(path.join(REPORT, 'evidence', project, f), { checks: [] });
    const ann = (type) => r.annotations.filter((a) => a.type === type).map((a) => a.description).join('\n');
    const t = triage[`${r.id}@${project}`] ?? triage[r.id] ?? null;
    tests.push({
      id: r.id,
      title: r.title.replace(/@\S+/g, '').replace(r.id, '').trim(),
      project,
      section: r.tags.find((x) => /^@5\.\d$/.test(x))?.slice(1) ?? '?',
      level: r.tags.find((x) => /^@P\d$/.test(x))?.slice(1) ?? '?',
      status: r.status,
      passed: r.status === 'passed',
      durationMs: r.durationMs,
      attempts: r.attempts,
      expected: ann('expected'), source: ann('source'), frbr: ann('fr-br'), rules: ann('rules'), technique: ann('technique'), timing: ann('timing'), pending: ann('pending-answer'),
      errors: r.errors.map((e) => e.slice(0, 2500)),
      steps: r.steps,
      checks: ev.checks,
      gif: project === 'chromium' && fs.existsSync(path.join(REPORT, 'gifs', `${r.id}.gif`)) ? `test-report/gifs/${r.id}.gif` : null,
      triage: r.status === 'passed' ? null : t,
      normalStatus: compare.find((c) => c.id === r.id && c.project === project)?.normalStatus ?? null,
      group: compare.find((c) => c.id === r.id && c.project === project)?.group ?? '',
    });
  }
}
tests.sort((a, b) => a.section.localeCompare(b.section) || a.id.localeCompare(b.id) || a.project.localeCompare(b.project));

const verdicts = Object.entries(CRITERIA).map(([project, c]) => {
  const rs = tests.filter((t) => t.project === project);
  const passed = rs.filter((t) => t.passed).length;
  const p1 = rs.filter((t) => t.level === 'P1');
  const p1Passed = p1.filter((t) => t.passed).length;
  const ok = rs.length === c.total && p1Passed === c.p1 && passed >= c.minPass;
  return { project, label: c.label, total: c.total, ran: rs.length, passed, p1Total: c.p1, p1Passed, minPass: c.minPass, ok, p1Failed: p1.filter((t) => !t.passed).map((t) => t.id) };
}).filter((v) => v.ran > 0);

const sectionRows = Object.entries(SECTIONS).map(([s, name]) => {
  const per = {};
  for (const project of Object.keys(CRITERIA)) {
    const rs = tests.filter((t) => t.section === s && t.project === project);
    per[project] = { n: rs.length, passed: rs.filter((t) => t.passed).length };
  }
  return { s, name, per };
});

const data = { tests, verdicts, sectionRows, bugMode, sectionC, loadStats, notRun, builtAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }), triageCounts: {} };
for (const t of tests.filter((x) => !x.passed)) {
  const k = t.triage?.class ?? 'ยังไม่จำแนก';
  data.triageCounts[k] = (data.triageCounts[k] ?? 0) + 1;
}

const page = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>รายงานทดสอบ สบายใจ สปา</title>
<style>
:root{--bg:#f7f6f3;--card:#fff;--ink:#1f2328;--muted:#5f6670;--line:#dfdcd5;--good:#14683a;--good-bg:#e4f4ea;--bad:#a4231c;--bad-bg:#fbe9e7;--warn:#7a5200;--warn-bg:#fbf0d5;--accent:#2f5d8a}
@media (prefers-color-scheme:dark){:root{--bg:#16181b;--card:#1f2226;--ink:#e8e6e1;--muted:#a3a8af;--line:#373b41;--good:#74d39a;--good-bg:#17301f;--bad:#f49a93;--bad-bg:#3a1b19;--warn:#e7c26f;--warn-bg:#33290f;--accent:#8db8e0}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 "Noto Sans Thai","Sarabun",Tahoma,system-ui,sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 10px}
.sub{color:var(--muted);margin:0 0 16px}
.badge{display:inline-block;padding:1px 9px;border-radius:999px;border:1px solid var(--line);font-size:13px;white-space:nowrap}
.pass{background:var(--good-bg);color:var(--good);border-color:transparent}.fail{background:var(--bad-bg);color:var(--bad);border-color:transparent}.warn{background:var(--warn-bg);color:var(--warn);border-color:transparent}
.verdicts{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.verdict{background:var(--card);border:1px solid var(--line);border-left-width:6px;border-radius:8px;padding:14px 16px}
.verdict.ok{border-left-color:var(--good)}.verdict.no{border-left-color:var(--bad)}
.verdict strong.big{font-size:21px;display:block;margin:2px 0 6px}
.verdict.ok strong.big{color:var(--good)}.verdict.no strong.big{color:var(--bad)}
.verdict p{margin:2px 0;color:var(--muted);font-size:14px}
.scroll{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{color:var(--muted);font-weight:600;white-space:nowrap}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr:last-child td{border-bottom:0}
.controls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
select,input[type=search]{font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:5px 9px;min-width:0}
input[type=search]{flex:1 1 220px}
tr.row{cursor:pointer}tr.row:hover td{background:color-mix(in srgb,var(--accent) 8%,transparent)}tr.row:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
tr.detail td{background:color-mix(in srgb,var(--line) 22%,var(--card));padding:14px 16px}
.chev{display:inline-block;width:1em;color:var(--muted)}
dl{display:grid;grid-template-columns:130px minmax(0,1fr);gap:6px 14px;margin:0}
dt{color:var(--muted)}dd{margin:0;white-space:pre-wrap;word-break:break-word}
@media (max-width:640px){dl{grid-template-columns:minmax(0,1fr)}dt{margin-top:8px}}
pre{white-space:pre-wrap;word-break:break-word;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:9px;margin:4px 0;font:12.5px/1.5 ui-monospace,Consolas,monospace;max-height:280px;overflow:auto}
ol.steps{margin:0;padding-left:20px}
.checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:6px}
.check{background:var(--card);border:1px solid var(--line);border-radius:6px;overflow:hidden;font-size:13px;display:block;color:inherit;text-decoration:none}
.check.bad{border-color:var(--bad)}
.check img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#000}
.check div{padding:6px 8px}.check small{color:var(--muted);display:block;max-height:4.5em;overflow:hidden}
img.gif{max-width:100%;width:640px;border:1px solid var(--line);border-radius:6px;display:block}
.note{color:var(--muted);font-size:13.5px}
</style>
</head>
<body>
<main>
<h1>รายงานทดสอบ สบายใจ สปา</h1>
<p class="sub">ชุดทดสอบ Playwright ตาม TEST-PLAN.md หัวข้อ 5 · สร้างเมื่อ <span id="built"></span> · โหมดเว็บ <span id="mode"></span></p>
<div class="verdicts" id="verdicts"></div>
<h2>% ผ่านของแต่ละหัวข้อย่อย</h2>
<div class="scroll"><table id="sections"></table></div>
<h2>การจำแนกข้อที่ล้ม</h2>
<p id="triage-summary"></p>
<p class="note" id="not-run"></p>
<h2>ทุก test</h2>
<div class="controls">
  <input type="search" id="q" placeholder="ค้น ID หรือชื่อ" aria-label="ค้น ID หรือชื่อ">
  <select id="f-project" aria-label="เบราว์เซอร์"><option value="">ทุกเบราว์เซอร์</option><option value="chromium">chromium</option><option value="mobile-chrome">mobile-chrome</option></select>
  <select id="f-status" aria-label="ผล"><option value="">ทุกผล</option><option value="pass">ผ่าน</option><option value="fail">ล้ม</option></select>
  <select id="f-level" aria-label="ระดับ"><option value="">ทุกระดับ</option><option>P1</option><option>P2</option><option>P3</option></select>
  <select id="f-section" aria-label="หัวข้อย่อย"><option value="">ทุกหัวข้อย่อย</option></select>
</div>
<div class="scroll"><table id="tests"></table></div>
<section id="c-wrap"><h2>เทียบกับ EXPLORATION.md ส่วน C</h2><div class="scroll"><table id="section-c"></table></div></section>
<section id="load-wrap"><h2>การใช้ทรัพยากรตอนรันขนาน</h2><div class="scroll"><table id="load"></table></div></section>
</main>
<script type="application/json" id="data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (p, n) => (n ? Math.round((p / n) * 1000) / 10 + '%' : '—');
$('built').textContent = D.builtAt;
$('mode').innerHTML = '<span class="badge">data-bug-mode = ' + esc(D.bugMode) + '</span>';

$('verdicts').innerHTML = D.verdicts.map((v) => '<div class="verdict ' + (v.ok ? 'ok' : 'no') + '"><span class="note">' + esc(v.label) + '</span><strong class="big">' + (v.ok ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์') + '</strong>'
  + '<p>P1 ผ่าน ' + v.p1Passed + ' จาก ' + v.p1Total + ' (ต้องครบ)</p><p>ผ่านรวม ' + v.passed + ' จาก ' + v.total + ' (ต้องอย่างน้อย ' + v.minPass + ')' + (v.ran !== v.total ? ' · รันจริง ' + v.ran + ' ข้อ' : '') + '</p>'
  + (v.p1Failed.length ? '<p>P1 ที่ล้ม: ' + v.p1Failed.map(esc).join(', ') + '</p>' : '') + '</div>').join('');

$('sections').innerHTML = '<thead><tr><th>หัวข้อย่อย</th><th class="num">chromium ผ่าน</th><th class="num">chromium %</th><th class="num">mobile-chrome ผ่าน</th><th class="num">mobile-chrome %</th></tr></thead><tbody>'
  + D.sectionRows.map((r) => { const c = r.per.chromium, m = r.per['mobile-chrome'];
    return '<tr><td>' + r.s + ' ' + esc(r.name) + '</td><td class="num">' + c.passed + '/' + c.n + '</td><td class="num">' + pct(c.passed, c.n) + '</td><td class="num">' + (m.n ? m.passed + '/' + m.n : '—') + '</td><td class="num">' + pct(m.passed, m.n) + '</td></tr>'; }).join('') + '</tbody>';

$('triage-summary').textContent = Object.entries(D.triageCounts).map(([k, v]) => k + ' ' + v).join(' · ') || 'ไม่มีข้อที่ล้ม';
$('not-run').textContent = D.notRun.length ? 'ไม่มีผลรอบฝังบั๊ก: ' + D.notRun.join(', ') + ' · ผลรอบปกติอยู่ที่ report-normal/index.html' : '';
const normalLabel = (t) => t.normalStatus === 'passed' ? '<span class="badge pass">ผ่าน</span>' : t.normalStatus ? '<span class="badge fail">ล้ม</span>' : '—';

for (const r of D.sectionRows) { const o = document.createElement('option'); o.value = r.s; o.textContent = r.s + ' ' + r.name; $('f-section').append(o); }

const statusLabel = (t) => t.passed ? '<span class="badge pass">ผ่าน</span>' : t.status === 'timedOut' ? '<span class="badge fail">หมดเวลา</span>' : '<span class="badge fail">ล้ม</span>';
const triageBadge = (t) => t.passed ? '' : t.triage ? '<span class="badge ' + (t.triage.class === 'เว็บผิด' ? 'fail' : 'warn') + '">' + esc(t.triage.class) + '</span>' : '<span class="badge">ยังไม่จำแนก</span>';

function detail(t) {
  const steps = t.steps.length ? '<ol class="steps">' + t.steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' : '—';
  const actual = t.passed
    ? 'ผ่านทุกจุดตรวจ (' + t.checks.length + ' จุด)'
    : t.errors.map((e) => '<pre>' + esc(e) + '</pre>').join('');
  const checks = t.checks.map((c) => '<a class="check ' + (c.pass ? '' : 'bad') + '" href="test-report/' + esc(c.shot) + '" target="_blank" rel="noopener"><img loading="lazy" src="test-report/' + esc(c.shot) + '" alt="' + esc(c.label) + '"><div><span class="badge ' + (c.pass ? 'pass' : 'fail') + '">' + (c.pass ? 'ผ่าน' : 'ล้ม') + '</span> ' + esc(c.label) + '<small>' + esc(c.actual) + '</small></div></a>').join('');
  return '<dl>'
    + '<dt>ผลที่คาดหวังจากแผน</dt><dd>' + esc(t.expected) + '</dd>'
    + '<dt>ที่มา</dt><dd>' + esc(t.source) + '</dd>'
    + '<dt>FR/BR</dt><dd>' + esc(t.frbr) + (t.rules ? ' · อ้างกฎ ' + esc(t.rules) : '') + '</dd>'
    + (t.technique ? '<dt>เทคนิค</dt><dd>' + esc(t.technique) + '</dd>' : '')
    + '<dt>ขั้นตอน</dt><dd>' + steps + '</dd>'
    + '<dt>ผลจริง / error</dt><dd>' + actual + '</dd>'
    + (t.pending ? '<dt>รอคำตอบ (ไม่นับเป็นข้อล้ม)</dt><dd>' + esc(t.pending) + '</dd>' : '')
    + (!t.passed ? '<dt>การจำแนก</dt><dd>' + (t.triage ? '<span class="badge ' + (t.triage.class === 'เว็บผิด' ? 'fail' : 'warn') + '">' + esc(t.triage.class) + '</span> ' + esc(t.triage.note ?? '') : 'ยังไม่จำแนก') + '</dd>' : '')
    + (t.attempts?.length ? '<dt>รอบก่อนหน้า</dt><dd>' + t.attempts.map((a) => esc(a.status)).join(', ') + '</dd>' : '')
    + '<dt>GIF</dt><dd>' + (t.gif ? '<img class="gif" src="' + esc(t.gif) + '" alt="GIF ของ ' + esc(t.id) + '">' : (t.project === 'chromium' ? 'ไม่มีไฟล์' : 'อัดเฉพาะ Chromium')) + '</dd>'
    + '<dt>ภาพตอนตรวจ (กรอบแดง)</dt><dd>' + (checks ? '<div class="checks">' + checks + '</div>' : 'ไม่มีจุดตรวจ') + '</dd>'
    + '</dl>';
}

function render() {
  const q = $('q').value.trim().toLowerCase(), fp = $('f-project').value, fs = $('f-status').value, fl = $('f-level').value, fx = $('f-section').value;
  const rows = D.tests.map((t, i) => [t, i]).filter(([t]) => (!q || (t.id + ' ' + t.title).toLowerCase().includes(q)) && (!fp || t.project === fp) && (!fs || (fs === 'pass') === t.passed) && (!fl || t.level === fl) && (!fx || t.section === fx));
  $('tests').innerHTML = '<thead><tr><th>ID</th><th>สิ่งที่ทดสอบ</th><th>เบราว์เซอร์</th><th>ระดับ</th><th>ปกติ</th><th>ฝังบั๊ก</th><th>จำแนก</th><th class="num">เวลา</th></tr></thead><tbody>'
    + rows.map(([t, i]) => '<tr class="row" tabindex="0" role="button" aria-expanded="false" data-i="' + i + '"><td style="white-space:nowrap"><span class="chev">▸</span>' + esc(t.id) + '</td><td>' + esc(t.title) + '</td><td>' + esc(t.project) + '</td><td>' + esc(t.level) + '</td><td>' + normalLabel(t) + '</td><td>' + statusLabel(t) + '</td><td>' + triageBadge(t) + '</td><td class="num">' + Math.round(t.durationMs / 1000) + ' วิ</td></tr>').join('') + '</tbody>';
}
function toggle(tr) {
  const next = tr.nextElementSibling;
  if (next && next.classList.contains('detail')) { next.remove(); tr.setAttribute('aria-expanded', 'false'); tr.querySelector('.chev').textContent = '▸'; return; }
  const d = document.createElement('tr'); d.className = 'detail';
  d.innerHTML = '<td colspan="8">' + detail(D.tests[Number(tr.dataset.i)]) + '</td>';
  tr.after(d); tr.setAttribute('aria-expanded', 'true'); tr.querySelector('.chev').textContent = '▾';
}
$('tests').addEventListener('click', (e) => { if (e.target.closest('.detail')) return; const tr = e.target.closest('tr.row'); if (tr) toggle(tr); });
$('tests').addEventListener('keydown', (e) => { const tr = e.target.closest('tr.row'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(tr); } });
for (const id of ['q', 'f-project', 'f-status', 'f-level', 'f-section']) $(id).addEventListener('input', render);
render();

if (D.sectionC.length) {
  $('section-c').innerHTML = '<thead><tr><th>กฎ</th><th>ตอนสำรวจ</th><th>test</th><th>ผลรอบนี้</th><th>สรุป</th></tr></thead><tbody>' + D.sectionC.map((r) => '<tr><td>' + esc(r.rule) + '</td><td>' + esc(r.exploration) + '</td><td>' + esc(r.test) + '</td><td>' + esc(r.result) + '</td><td>' + esc(r.note) + '</td></tr>').join('') + '</tbody>';
} else { $('c-wrap').hidden = true; }
if (D.loadStats.length) {
  $('load').innerHTML = '<thead><tr><th>ระดับ</th><th class="num">container</th><th class="num">CPU รวม container</th><th class="num">RAM รวม container</th><th class="num">RAM เครื่องที่ใช้อยู่</th></tr></thead><tbody>' + D.loadStats.map((r) => '<tr><td>' + esc(r.label) + '</td><td class="num">' + r.containers + '</td><td class="num">' + r.containerCpuPercent + '%</td><td class="num">' + r.containerMemMiB + ' MiB</td><td class="num">' + r.hostLoadedMemGiB + ' / ' + r.hostTotalMemGiB + ' GiB</td></tr>').join('') + '</tbody>';
} else { $('load-wrap').hidden = true; }
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'index.html'), page);
const summary = verdicts.map((v) => `${v.label}: ${v.ok ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'} · P1 ${v.p1Passed}/${v.p1Total} · รวม ${v.passed}/${v.total}`).join('\n');
console.log(summary);
console.log('หัวข้อย่อย:', sectionRows.map((r) => `${r.s} ${r.per.chromium.passed}/${r.per.chromium.n}`).join(' · '));
console.log('จำแนก:', JSON.stringify(data.triageCounts));

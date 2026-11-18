// node diff/run.mjs <BASE_URL> [expected.json] [--only id,id]
// node diff/run.mjs - [expected.json] --actual <ผลที่เก็บไว้.json>   (ตรวจแบบออฟไลน์)
// รันทุกสถานการณ์กับแอปที่ BASE_URL (เริ่มด้วยเส้นทางมาตรฐานจากฟอร์มบนจอ หรือถ้า BASE_URL เปิดมาเป็นหน้าผลค้นหาแล้วก็ใช้เลย)
// แล้วเทียบกับเฉลย expected.json ทีละสถานการณ์ → ตรง/ไม่ตรง (exit 0 เมื่อทุกสถานการณ์ตรง)
import fs from 'node:fs';
import { open, standardRoute } from '../lib.mjs';
import { runAll, SCENARIOS } from './scenarios.mjs';

const D = new URL('.', import.meta.url).pathname;
const args = process.argv.slice(2);
const oi = args.indexOf('--only');
const only = oi >= 0 ? args.splice(oi, 2)[1].split(',') : null;
const ai = args.indexOf('--actual');   // ตรวจแบบออฟไลน์: ใช้ผลที่เก็บไว้แทนการเปิดเบราว์เซอร์ (ไฟล์รูปแบบเดียวกับ expected.json)
const actualFile = ai >= 0 ? args.splice(ai, 2)[1] : null;
const [base, expFile = D + 'expected.json'] = args;
if (!base && !actualFile) { console.error('ใช้: node diff/run.mjs <BASE_URL> [expected.json] [--only id,id]'); process.exit(2); }
const expected = JSON.parse(fs.readFileSync(expFile, 'utf8')).scenarios;

// ช่องที่ใช้ตัดสิน: รายการ → จำนวน·ลำดับราคา·สายการบิน·เวลาออก·แวะพัก · รายละเอียด → แถว·เลขเที่ยวบิน·เวลา/สนามบินแต่ละขา·จุดแวะ
// (resultText เก็บไว้ดูเฉยๆ ไม่ได้อยู่ในรายการนี้)
const FIELDS = {
  list: ['count', 'prices', 'airlines', 'deps', 'stops'],
  'layover-details': ['row', 'flightNumbers', 'legTimes', 'layovers'],
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- ผ่อนเกณฑ์ (ตามข้อตัดสินของผู้ดูแลบท 2026-11-01 · เหตุผลใน RULERS.md ข้อ 3.1) มีแค่ 3 ข้อ ห้ามเพิ่ม ----
// (1) สถานการณ์ที่มีตัวกรอง: 3 แถวแรก ("ดีที่สุด" ที่ Google เลือกเอง) ตัดสินเป็นชุด (multiset ของแถว) ไม่ดูลำดับ · แถวที่ 4 เป็นต้นไปตัดสินตามลำดับเหมือนเดิม
// (2) depart-23-24: ตัดแถวที่ไม่มีอยู่ใน spec/data/flights-all.json ออก (ทั้งเฉลยและแอป) ก่อนเทียบ · แถวที่ตัดจะอยู่ใน last-run.json → excluded
// (3) resultText ("มีผลลัพธ์ # รายการ") ไม่อยู่ใน FIELDS อยู่แล้ว จึงไม่ใช้ตัดสินทุกสถานการณ์ รวมตัวกรองราคา
const FILTERED = ['nonstop', 'thai-only', 'price-max-10000', 'depart-23-24'];
const TOP_SET = 3;
const ONLY_IN_DATA = ['depart-23-24'];
const DATA_FILE = D + '../../spec/data/flights-all.json';
// ชื่อสายการบินแบบที่จอแสดง: "A" · "A และB" · "A, B และC"
const screenAirline = n => n.length < 2 ? n[0] : n.slice(0, -1).join(', ') + ' และ' + n.at(-1);
const rowKey = (s, i) => JSON.stringify([s.prices[i], s.airlines[i], s.deps[i], s.stops[i]]);
let dataRows;   // multiset ของแถวใน flights-all.json (โหลดเมื่อจำเป็น)
function onlyInData(s) {
  dataRows ??= JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).flights.reduce((m, f) => {
    const k = JSON.stringify([f.price.amount, screenAirline(f.airlineNames), f.departureLocal.slice(11, 16), f.stopCount]);
    return m.set(k, (m.get(k) || 0) + 1);
  }, new Map());
  const left = new Map(dataRows), keep = [], excluded = [];
  for (let i = 0; i < s.count; i++) {
    const k = rowKey(s, i);
    if (left.get(k)) { left.set(k, left.get(k) - 1); keep.push(i); } else excluded.push({ index: i, row: JSON.parse(k) });
  }
  const pick = a => keep.map(i => a[i]);
  return { s: { ...s, count: keep.length, prices: pick(s.prices), airlines: pick(s.airlines), deps: pick(s.deps), stops: pick(s.stops) }, excluded };
}
// เทียบรายการ: count ตรงตัว · ถ้าเป็นสถานการณ์กรอง 3 แถวแรกเทียบเป็นชุด แล้วช่องที่เหลือเทียบตามลำดับจากแถวที่ 4
function compareList(id, e, a, fields) {
  const diffs = [];
  const top = FILTERED.includes(id) ? TOP_SET : 0;
  if (top) {
    const set = s => Array.from({ length: Math.min(top, s.count) }, (_, i) => rowKey(s, i)).sort();
    if (!same(set(e), set(a))) diffs.push({ field: `top${top}(ชุด)`, expected: set(e).map(JSON.parse), actual: set(a).map(JSON.parse) });
  }
  for (const f of fields) {
    if (f === 'count' || !top) { if (!same(e[f], a[f])) diffs.push({ field: f, ...firstDiff(e[f], a[f]) }); continue; }
    const d = firstDiff(e[f].slice(top), a[f].slice(top));
    if (d) diffs.push({ field: f, ...d, ...(d.index != null && { index: d.index + top, lengths: [e[f].length, a[f].length] }) });
  }
  return diffs;
}
function firstDiff(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return { expected: a, actual: b };
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (!same(a[i], b[i])) return { index: i, expected: a[i] ?? null, actual: b[i] ?? null, lengths: [a.length, b.length] };
  return null;
}

let actual;
if (actualFile) actual = JSON.parse(fs.readFileSync(actualFile, 'utf8')).scenarios;
else {
  const { browser, context } = await open();
  actual = await runAll(() => context.newPage(), p => standardRoute(p, base), only);
  await browser.close();
}

const report = [];
for (const s of SCENARIOS) {
  if (only && !only.includes(s.id)) continue;
  const e = expected[s.id], a = actual[s.id];
  const fields = FIELDS[s.id] || FIELDS.list;
  let ok, diffs = [], excluded = null;
  if (!e || e.error) { ok = null; diffs.push({ note: 'ไม่มีเฉลยของสถานการณ์นี้ ' + (e?.error || '') }); }
  else if (a.error) { ok = false; diffs.push({ error: a.error }); }
  else if (!FIELDS[s.id]) {
    let ee = e, aa = a;
    if (ONLY_IN_DATA.includes(s.id)) { const x = onlyInData(e), y = onlyInData(a); ee = x.s; aa = y.s; excluded = { expected: x.excluded, actual: y.excluded }; }
    diffs = compareList(s.id, ee, aa, fields);
    ok = diffs.length === 0;
  } else {
    for (const f of fields) if (!same(e[f], a[f])) diffs.push({ field: f, ...firstDiff(e[f], a[f]) });
    ok = diffs.length === 0;
  }
  report.push({ id: s.id, title: s.title, result: ok === null ? 'ไม่มีเฉลย' : ok ? 'ตรง' : 'ไม่ตรง', count: [e?.count ?? null, a?.count ?? null], diffs, ...(excluded && { excluded }) });
}
fs.writeFileSync(D + 'last-run.json', JSON.stringify({ base, at: new Date().toISOString(), report, actual }, null, 1));
console.log('| สถานการณ์ | ผล | จำนวน (เฉลย/แอป) | ช่องที่ต่าง |\n|---|---|---|---|');
for (const r of report) console.log(`| ${r.title} | ${r.result} | ${r.count.join(' / ')}${r.excluded ? ` (ตัดแถวที่ไม่อยู่ในข้อมูล ${r.excluded.expected.length}/${r.excluded.actual.length})` : ''} | ${r.diffs.map(d => d.field ? `${d.field}${d.index != null ? '#' + d.index : ''}: ${JSON.stringify(d.expected)}≠${JSON.stringify(d.actual)}` : JSON.stringify(d)).join(' · ').slice(0, 300)} |`);
const pass = report.filter(r => r.result === 'ตรง').length;
console.log(`\nตรง ${pass}/${report.length}`);
process.exitCode = pass === report.length ? 0 : 1;

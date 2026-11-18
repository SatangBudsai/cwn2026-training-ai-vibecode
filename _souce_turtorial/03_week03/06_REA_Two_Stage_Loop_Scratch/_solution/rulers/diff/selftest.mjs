// node diff/selftest.mjs → ตรวจไม้บรรทัด differential กับตัวเอง (ออฟไลน์ ไม่เปิดเบราว์เซอร์)
// 1) expected.json กับตัวเอง ต้องตรง 8/8
// 2) กลายพันธุ์ 3 แบบ (ราคา +1 บาท / ตัด 1 แถว / เลขเที่ยวบินผิด) ต้องจับได้ทุกตัว · ราคา+1 และตัดแถว ลองทั้งในแถว top-3 และแถวหลังของทุกสถานการณ์รายการ
// 3) spec/data/flights-all.json 300 ใบ (เรียงตามไฟล์) เทียบ expected.more ต้องตรง 300/300 และ flights-initial.json เทียบ expected.initial ต้อง 21/21
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const D = new URL('.', import.meta.url).pathname;
const exp = JSON.parse(fs.readFileSync(D + 'expected.json', 'utf8'));
const tmp = fs.mkdtempSync(os.tmpdir() + '/diff-selftest-');
const run = (scen, only) => {
  const f = `${tmp}/a.json`; fs.writeFileSync(f, JSON.stringify({ scenarios: scen }));
  try { execFileSync('node', [D + 'run.mjs', '-', '--actual', f, ...(only ? ['--only', only] : [])], { stdio: 'pipe' }); return true; } catch { return false; }
};
const clone = () => structuredClone(exp.scenarios);
const out = { self: null, mutations: [], data: {} };

out.self = run(clone());

const LISTS = ['initial', 'cheapest-tab', 'more', 'nonstop', 'thai-only', 'price-max-10000', 'depart-23-24'];
for (const id of LISTS) for (const i of [0, exp.scenarios[id].count - 1]) {
  const a = clone(); a[id].prices[i] += 1;
  out.mutations.push({ kind: 'ราคา+1', id, row: i, caught: !run(a, id) });
  const b = clone(); for (const k of ['prices', 'airlines', 'deps', 'stops']) b[id][k].splice(i, 1); b[id].count--;
  out.mutations.push({ kind: 'ตัด 1 แถว', id, row: i, caught: !run(b, id) });
}
{ const a = clone(); a['layover-details'].flightNumbers[1] = 'SL 395';
  out.mutations.push({ kind: 'เลขเที่ยวบินผิด', id: 'layover-details', caught: !run(a, 'layover-details') }); }

const screenAirline = n => n.length < 2 ? n[0] : n.slice(0, -1).join(', ') + ' และ' + n.at(-1);
for (const [file, id] of [['flights-all.json', 'more'], ['flights-initial.json', 'initial']]) {
  const fl = JSON.parse(fs.readFileSync(D + '../../spec/data/' + file, 'utf8')).flights, s = exp.scenarios[id];
  const ok = fl.filter((f, i) => f.price.amount === s.prices[i] && screenAirline(f.airlineNames) === s.airlines[i] && f.departureLocal.slice(11, 16) === s.deps[i] && f.stopCount === s.stops[i]).length;
  out.data[file] = `${ok}/${s.count} (ข้อมูล ${fl.length} ใบ)`;
}

run(clone());   // ให้ last-run.json จบที่ผล expected กับตัวเอง
fs.rmSync(tmp, { recursive: true });
const caught = out.mutations.filter(m => m.caught).length;
console.log(JSON.stringify({ selfMatch: out.self ? '8/8' : 'ไม่ตรง', mutationsCaught: `${caught}/${out.mutations.length}`, missed: out.mutations.filter(m => !m.caught), data: out.data }, null, 1));
process.exitCode = out.self && caught === out.mutations.length && Object.values(out.data).every(v => /^(\d+)\/\1 /.test(v)) ? 0 : 1;

// differential 8 สถานการณ์ ใช้เฉลยแช่แข็งใน kit/src/diff/diff-results.json (ส่วน original) — ไม่เปิดต้นฉบับใหม่
// ตรรกะเดียวกับ runner/diff-v1.mjs: SCENARIOS (clone + compare) และ diff/lib/clone.mjs ตัวเดิมทุกตัว
// frozen/open-original.mjs ถูกแทนด้วย stub (hooks.mjs → runner/stub-frozen.mjs)
// node --import ./hooks.mjs diff.mjs <BASE_URL> <out>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as c from '../src/diff/lib/clone.mjs';
import { SCENARIOS } from '../src/diff/scenarios.mjs';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const [BASE, outArg] = process.argv.slice(2);
const OUT = path.resolve(outArg);
const frozen = JSON.parse(fs.readFileSync(path.join(SRC, 'diff', 'diff-results.json'), 'utf8'));
const HOLD = 1500;

async function record(body) {
  const t0 = Date.now();
  const s = await c.launch(BASE);
  const errors = [];
  s.page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  let data, error, unsupported = false;
  try { data = await body(s.page); } catch (e) { error = String(e.message || e).split('\n')[0]; unsupported = e instanceof c.Unsupported; }
  await s.page.waitForTimeout(HOLD).catch(() => {});
  await s.context.close(); await s.browser.close();
  return { data, error, unsupported, ms: Date.now() - t0, pageErrors: errors.slice(0, 3) };
}

const out = { ranAt: new Date().toISOString(), baseURL: BASE, oracle: { file: 'kit/src/diff/diff-results.json', ranAt: frozen.ranAt }, scenarios: {} };
// สถานการณ์เป็นอิสระต่อกัน (เบราว์เซอร์ใหม่ทุกครั้ง) จึงรันพร้อมกันได้ ตั้ง DIFF_PARALLEL=1 ให้รันทีละตัว
const PAR = Number(process.env.DIFF_PARALLEL || 4);
let cur = 0;
await Promise.all(Array.from({ length: PAR }, async () => {
  while (cur < SCENARIOS.length) {
    const s = SCENARIOS[cur++];
    const O = frozen.original[s.id]?.data;
    if (!O) { out.scenarios[s.id] = { title: s.title, verdict: 'ข้าม', detail: 'ไม่มีเฉลยแช่แข็ง' }; continue; }
    const r = await record((page) => s.clone(page, O));
    let verdict, detail;
    if (r.unsupported) { verdict = 'ไม่มีฟีเจอร์'; detail = r.error; }
    else if (r.error) { verdict = 'ไม่ตรง'; detail = `ทำสถานการณ์ไม่สำเร็จ: ${r.error}`; }
    else { const cmp = s.compare(O, r.data); verdict = cmp.ok ? 'ตรง' : 'ไม่ตรง'; detail = cmp.detail; if (r.data.note) detail += ` · หมายเหตุ: ${r.data.note}`; }
    out.scenarios[s.id] = { title: s.title, oracle: s.summary(O), verdict, detail, ms: r.ms, shown: r.data?.shown ?? null, count: r.data?.rows?.length ?? null, data: r.data, pageErrors: r.pageErrors };
    console.log(`  ${s.id} ${s.title}: ${verdict} — ${String(detail).slice(0, 200)}`);
  }
}));
out.scenarios = Object.fromEntries(SCENARIOS.map((s) => [s.id, out.scenarios[s.id]]));
out.total = SCENARIOS.length;
out.pass = SCENARIOS.filter((s) => out.scenarios[s.id].verdict === 'ตรง').length;
out.mismatched = SCENARIOS.filter((s) => out.scenarios[s.id].verdict !== 'ตรง').map((s) => ({ id: s.id, title: s.title, verdict: out.scenarios[s.id].verdict, oracle: out.scenarios[s.id].oracle, detail: out.scenarios[s.id].detail }));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'diff.json'), JSON.stringify(out, null, 2));
console.log(`DIFF ${out.pass}/${out.total}`);

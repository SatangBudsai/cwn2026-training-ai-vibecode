// differential 8 สถานการณ์กับ v1 โดยใช้เฉลยแช่แข็งจาก diff/diff-results.json (ส่วน original) — ไม่เปิดต้นฉบับใหม่
// ใช้ SCENARIOS (clone + compare) และ lib/clone.mjs เดิมทุกตัว ตรรกะคำตัดสินเหมือน diff/run.mjs ขั้นที่ 2
// node --import ./runner/stub-frozen.mjs runner/diff-v1.mjs <out-dir> [BASE_URL]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as c from '../diff/lib/clone.mjs';
import { SCENARIOS } from '../diff/scenarios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'results'));
const BASE = process.argv[3] || 'http://localhost:5081';
const frozen = JSON.parse(fs.readFileSync(path.join(ROOT, 'diff', 'diff-results.json'), 'utf8'));
const HOLD = 1500;

async function record(body) {
  const t0 = Date.now();
  const s = await c.launch(BASE);
  const errors = [];
  s.page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  let data, error, unsupported = false;
  try { data = await body(s.page); } catch (e) {
    error = String(e.message || e).split('\n')[0];
    unsupported = e instanceof c.Unsupported;
  }
  await s.page.waitForTimeout(HOLD).catch(() => {});
  await s.context.close();
  await s.browser.close();
  return { data, error, unsupported, ms: Date.now() - t0, pageErrors: errors.slice(0, 3) };
}

const out = { ranAt: new Date().toISOString(), baseURL: BASE, oracle: { file: 'diff/diff-results.json', ranAt: frozen.ranAt }, scenarios: {} };
for (const s of SCENARIOS) {
  const O = frozen.original[s.id]?.data;
  if (!O) { out.scenarios[s.id] = { title: s.title, verdict: 'ข้าม', detail: 'ไม่มีเฉลยแช่แข็ง' }; continue; }
  const r = await record((page) => s.clone(page, O));
  let verdict, detail;
  if (r.unsupported) { verdict = 'ไม่มีฟีเจอร์'; detail = r.error; }
  else if (r.error) { verdict = 'ไม่ตรง'; detail = `ทำสถานการณ์ไม่สำเร็จ: ${r.error}`; }
  else { const cmp = s.compare(O, r.data); verdict = cmp.ok ? 'ตรง' : 'ไม่ตรง'; detail = cmp.detail; if (r.data.note) detail += ` · หมายเหตุ: ${r.data.note}`; }
  out.scenarios[s.id] = { title: s.title, oracle: s.summary(O), verdict, detail, ms: r.ms, shown: r.data?.shown ?? null, count: r.data?.rows?.length ?? null, data: r.data, pageErrors: r.pageErrors };
  console.log(`v1 ${s.id} ${s.title}: ${verdict} — ${detail}`);
}
const pass = SCENARIOS.filter((s) => out.scenarios[s.id].verdict === 'ตรง').length;
out.total = SCENARIOS.length; out.pass = pass;
// เทียบกับคำตัดสิน v1 ที่บันทึกไว้ในไฟล์เฉลยเดียวกัน (รอบบทที่ 3–4)
out.previous = Object.fromEntries(SCENARIOS.map((s) => [s.id, frozen.versions?.v1?.[s.id]?.verdict ?? null]));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'diff.json'), JSON.stringify(out, null, 2));
console.log(`DIFF ${pass}/${SCENARIOS.length}`);

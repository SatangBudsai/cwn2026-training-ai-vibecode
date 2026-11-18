// acceptance 82 ข้อ: ใช้ cases/setup จาก kit/src/accept/suite.cjs ตัวเดิม (ไม่แก้เกณฑ์)
// วนรันแบบเดียวกับ accept/run.cjs: 3 worker · 1366×900 · th-TH · Asia/Bangkok · timeout 3500/15000 · บล็อกการออกนอกแอป
// ต่างจาก run.cjs แค่: เขียนผลลง <out>/accept/ แทนโฟลเดอร์ของชุดทดสอบ และไม่อัดวิดีโอ/GIF (ตั้ง MEASURE_VIDEO=1 เพื่ออัด)
// node --import ./hooks.mjs accept.mjs <BASE_URL> <out>
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const { cases, setup } = require('../src/accept/suite.cjs');
const { writeReport } = require('../src/accept/report.cjs');

const [baseURL, outArg] = process.argv.slice(2);
const root = path.join(path.resolve(outArg), 'accept');
const VIDEO = process.env.MEASURE_VIDEO === '1';
const HOLD = Number(process.env.ACCEPT_HOLD_MS ?? 0); // run.cjs ค้างภาพ 3000 ms หลังจบแต่ละข้อ (ไม่มีผลต่อผ่าน/ไม่ผ่าน)
for (const d of ['screenshots', 'evidence', ...(VIDEO ? ['video'] : [])]) await fs.mkdir(path.join(root, d), { recursive: true });

// สำเนาของ concise() ใน accept/report.cjs (ไม่ได้ export ไว้) — ใช้ทำเหตุผลสั้นใน report.json
function concise(reason) {
  const s = reason.replace(/\u001b\[[0-9;]*m/g, '');
  if (s.startsWith('ยืนยันไม่ได้')) return s.split('\n')[0];
  const mismatch = s.match(/(\d+) !== (\d+)/);
  if (mismatch) { const lead = s.split('\n')[0]; return (lead.startsWith('Expected') ? 'จำนวนหรือค่าที่แสดงไม่ตรงเกณฑ์' : lead) + ` (พบ ${mismatch[1]}, คาด ${mismatch[2]})`; }
  const pattern = s.match(/regular expression (\/.*\/)[.]?\s*Input:/);
  if (pattern) return `ไม่พบข้อความตามเกณฑ์ ${pattern[1]}`;
  if (s.includes('Timeout')) { const target = s.match(/name: ('[^']*'|\/.*?\/)/); return `ไม่พบหรือกดองค์ประกอบ ${target ? target[1] : 'ที่ระบุ'} ไม่ได้ภายในเวลารอ`; }
  if (s.includes('assert(a.some')) return 'ไม่พบตารางบิน 14:15 ที่มีราคาทั้ง ฿32,050 และ ฿32,132';
  return s.split('\n')[0].slice(0, 250);
}

const browser = await chromium.launch({ headless: true });
let cursor = 0; const results = [];
async function worker() {
  while (cursor < cases.length) {
    const c = cases[cursor++]; const started = Date.now();
    const context = await browser.newContext({ baseURL, viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok',
      ...(VIDEO ? { recordVideo: { dir: path.join(root, 'video'), size: { width: 1366, height: 900 } } } : {}) });
    const page = await context.newPage(); page.setDefaultTimeout(3500); page.setDefaultNavigationTimeout(15000);
    await context.route('**/*', (route) => { const req = route.request(); if (req.isNavigationRequest() && new URL(req.url()).origin !== new URL(baseURL).origin) return route.abort(); return route.continue(); });
    let error = null;
    try { await setup(page, c.scope); await c.run(page); } catch (e) { error = e.message; }
    if (HOLD) await page.waitForTimeout(HOLD);
    await page.screenshot({ path: path.join(root, 'screenshots', c.id + '.png') }).catch(() => {});
    await fs.writeFile(path.join(root, 'evidence', c.id + '.txt'), await page.locator('body').ariaSnapshot().catch((e) => String(e)));
    const video = VIDEO ? page.video() : null; await context.close();
    if (video) await fs.rename(await video.path(), path.join(root, 'video', c.id + '.webm'));
    const r = { id: c.id, title: c.title, status: error ? 'FAIL' : 'PASS', reason: error || 'พฤติกรรมตรงตามเกณฑ์ที่ระบุ', short: error ? concise(error) : null, durationMs: Date.now() - started };
    results.push(r); console.log(`  ${r.id} ${r.status} ${r.title}${error ? ' — ' + r.short : ''}`);
  }
}
await Promise.all(Array.from({ length: Number(process.env.ACCEPT_WORKERS || 3) }, worker));
await browser.close();
results.sort((a, b) => a.id.localeCompare(b.id));
const pass = results.filter((r) => r.status === 'PASS').length;
await fs.writeFile(path.join(root, 'results.json'), JSON.stringify({ baseURL, runAt: new Date().toISOString(), results }, null, 2));
await writeReport({ root, report: 'REPORT.md', baseURL, results });
const out = { pass, total: results.length, failed: results.filter((r) => r.status === 'FAIL').map((r) => ({ id: r.id, title: r.title, reason: r.short, fullReason: r.reason.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 1200) })) };
await fs.writeFile(path.join(root, '..', 'accept.json'), JSON.stringify(out, null, 2));
console.log(`ACCEPT ${pass}/${results.length}`);

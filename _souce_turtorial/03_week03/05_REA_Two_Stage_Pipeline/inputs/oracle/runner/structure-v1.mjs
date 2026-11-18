// โครงสร้างหน้า: ถ่าย ariaSnapshot หน้าแรก v1 แบบเดียวกับ structure/capture.mjs (ส่วนโคลน v1)
// แล้วรัน structure/compare.mjs ตัวจริง (สำเนาใน results/structure/ ที่จำกัด VERSIONS เหลือ v1) กับ structure/original.yml
// node runner/structure-v1.mjs <out-dir> [BASE_URL]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(path.resolve(process.argv[2] || path.join(ROOT, 'results')), 'structure');
const BASE = process.argv[3] || 'http://localhost:5081';
const SNAP = path.join(OUT, 'snapshots');
fs.mkdirSync(SNAP, { recursive: true });

async function stable(page, loc) {
  let last = -1, same = 0;
  for (let i = 0; i < 80 && same < 4; i++) { const n = await loc.count(); same = n === last && n > 0 ? same + 1 : 0; last = n; await page.waitForTimeout(250); }
  return last;
}
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
const page = await context.newPage();
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1000);
const rows = await stable(page, page.getByRole('link', { name: /^เที่ยวบิน .*ราคา|^เลือก$/ }));
fs.writeFileSync(path.join(SNAP, 'v1.yml'), await page.locator('body').ariaSnapshot());
await browser.close();
fs.copyFileSync(path.join(ROOT, 'structure', 'original.yml'), path.join(SNAP, 'original.yml'));

// compare.mjs ตัวเดิม เปลี่ยนเฉพาะรายการเวอร์ชันที่จะเทียบ (ไม่มี snapshot ของ v2/v3 ในรอบนี้)
const src = fs.readFileSync(path.join(ROOT, 'structure', 'compare.mjs'), 'utf8');
const patched = src.replace("const VERSIONS = ['v1', 'v2', 'v3'];", "const VERSIONS = ['v1'];");
if (patched === src) throw new Error('compare.mjs เปลี่ยนรูป: หา VERSIONS ไม่เจอ');
fs.writeFileSync(path.join(OUT, 'compare.mjs'), patched);
const log = execFileSync(process.execPath, [path.join(OUT, 'compare.mjs')], { encoding: 'utf8' });
fs.writeFileSync(path.join(OUT, 'compare.log'), log);
const m = JSON.parse(fs.readFileSync(path.join(OUT, 'metrics.json'), 'utf8')).versions.v1;
const res = {
  url: BASE + '/', rows,
  structure: m.structure, keyJaccard: m.keyJaccard.j, strictJaccard: m.strictJaccard.j, roleWeightedJaccard: m.roleWeightedJaccard,
  keyFound: m.keyFound, keyTotal: m.keyTotal, missing: m.missing, elements: m.elements,
};
fs.writeFileSync(path.join(OUT, '..', 'structure.json'), JSON.stringify(res, null, 2));
const pct = (x) => (x * 100).toFixed(1) + '%';
console.log(`STRUCTURE structure=${pct(res.structure)} key=${pct(res.keyJaccard)} strict=${pct(res.strictJaccard)} role=${pct(res.roleWeightedJaccard)} keyFound=${res.keyFound}/${res.keyTotal}`);

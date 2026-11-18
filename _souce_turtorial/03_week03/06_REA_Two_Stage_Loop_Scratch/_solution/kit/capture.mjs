// node kit/capture.mjs <BASE_URL> <out-dir>
// เก็บภาพ (app.png) + ariaSnapshot (app.yml) ของหน้าผลค้นหาสถานะเริ่มต้น ด้วยวิธีเดียวกับที่เก็บเฉลย (rulers/capture-live.mjs):
// เส้นทางมาตรฐานของ rulers/lib.mjs · viewport 1366×900 · scroll บนสุด · document.fonts.ready + 1 วินาที
// ถ้าเส้นทางมาตรฐานล้ม ยังเก็บสภาพหน้าจอขณะนั้น (แอปพัง = วัดได้แต่คะแนนต่ำ) แล้วบันทึก routeError
import fs from 'node:fs';
import { open, standardRoute, rows, isGoogle } from '../rulers/lib.mjs';

const [base, out] = process.argv.slice(2);
if (!base || !out || isGoogle(base)) { console.error('ใช้: node kit/capture.mjs <BASE_URL ของโคลน> <out-dir>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const { browser, page } = await open();
const res = { base, routeError: null, rows: null };
try {
  try { res.url = await standardRoute(page, base, 1); }
  catch (e) { res.routeError = e.message.split('\n')[0]; }
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${out}/app.png` });
  fs.writeFileSync(`${out}/app.yml`, (await page.locator('body').ariaSnapshot().catch(() => '')) + '\n');
  res.rows = (await rows(page).catch(() => [])).length;
} finally { await browser.close(); }
fs.writeFileSync(`${out}/capture.json`, JSON.stringify(res, null, 2));
console.log(JSON.stringify(res));

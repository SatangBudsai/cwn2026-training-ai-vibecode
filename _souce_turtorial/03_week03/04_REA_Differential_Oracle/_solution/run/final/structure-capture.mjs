// สำเนา structure/capture.mjs เฉพาะฝั่งโคลน (ใช้ snapshot ต้นฉบับเดิม) — node final/structure-capture.mjs v4=5084
// เก็บ ariaSnapshot() ของ "หน้าผลค้นหาเริ่มต้น" (กรุงเทพ → โตเกียว · เที่ยวเดียว · 15 พ.ย. 2026 · แท็บดีที่สุด · ก่อนกดดูเพิ่ม)
// ต้นฉบับ = frozen/open-original.mjs (offline) · โคลน v1 5081 / v2 5082 / v3 5083 เปิดด้วยวิธีเดียวกับ visual diff ของ LAB 3
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'structure', 'snapshots');
fs.mkdirSync(OUT, { recursive: true });
const VIEWPORT = { width: 1366, height: 900 };
const CLONE_QS = 'search?trip=oneway&from=BKK-CITY&to=TYO&date=2026-11-15&cabin=economy&adults=1&children=0&infantsSeat=0&infantsLap=0';
const CLONES = (process.argv[2] || 'v4=5084').split(',').map((x) => { const [v, p] = x.split('='); return [v, `http://localhost:${p}/${CLONE_QS}`]; });

async function stable(page, loc) {
  let last = -1, same = 0;
  for (let i = 0; i < 80 && same < 4; i++) { const n = await loc.count(); same = n === last && n > 0 ? same + 1 : 0; last = n; await page.waitForTimeout(250); }
  return last;
}
const meta = {};

// โคลน
const browser = await chromium.launch();
for (const [v, url] of CLONES) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  if (v !== 'v1') await page.getByRole('tab', { name: /ดีที่สุด/ }).waitFor({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  meta[v] = { url, rows: await stable(page, page.getByRole('link', { name: /^เที่ยวบิน .*ราคา|^เลือก$/ })) };
  fs.writeFileSync(path.join(OUT, `${v}.yml`), await page.locator('body').ariaSnapshot());
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, `meta-${Object.keys(meta).join('-')}.json`), JSON.stringify(meta, null, 2));
console.log(meta);

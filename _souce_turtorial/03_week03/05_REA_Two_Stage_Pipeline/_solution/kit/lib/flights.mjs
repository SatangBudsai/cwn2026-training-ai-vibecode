// เที่ยวบินที่แสดงได้ทั้งหมด: เปิดหน้าผลค้นหาผ่านฟอร์ม (เหมือน visual) นับแถวแรก แล้วกด "ดูเที่ยวบินเพิ่มเติม" ซ้ำจนปุ่มหาย/จำนวนนิ่ง
// แถว = ลิงก์ "เที่ยวบิน … ราคา …" (แบบเดียวกับ visual-ch4.cjs) ถ้าไม่มีใช้ listitem ที่มีลิงก์ "เลือก" (clone.mjs rowsLoc)
// node --import ./hooks.mjs flights.mjs <BASE_URL> <out>
import fs from 'node:fs';
import path from 'node:path';
import { launch, newPage, openResults, stable } from './common.mjs';
import { rowsLoc } from '../src/diff/lib/clone.mjs';

const [BASE, outArg] = process.argv.slice(2);
const OUT = path.resolve(outArg);
const browser = await launch();
const { context, page } = await newPage(browser, BASE);
page.setDefaultTimeout(6000);
await openResults(page);
const initial = await stable(page, await rowsLoc(page));
const clicks = [];
const moreBtn = () => page.getByRole('button', { name: /^[^\p{L}\p{N}]*ดูเที่ยวบินเพิ่มเติม/u });
for (let i = 0; i < 20; i++) {
  const b = moreBtn();
  if (!(await b.count()) || !(await b.first().isVisible())) break;
  await b.first().click();
  await page.waitForTimeout(1500);
  const n = await stable(page, await rowsLoc(page));
  clicks.push(n);
  if (clicks.length > 1 && n === clicks.at(-2)) break;
}
const loc = await rowsLoc(page);
const names = await loc.evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || e.innerText).replace(/\s+/g, ' ').trim()));
const shown = ((await page.getByRole('main').innerText().catch(() => '')).match(/มีผลลัพธ์ (\d+) รายการ|พบ (\d+) เที่ยวบิน/) || []).slice(1).find(Boolean);
await context.close(); await browser.close();
const res = { baseURL: BASE, initial, afterMore: clicks, total: names.length, unique: new Set(names).size, shownText: shown ? Number(shown) : null,
  duplicates: names.filter((n, i) => names.indexOf(n) !== i).slice(0, 10), rows: names };
fs.writeFileSync(path.join(OUT, 'flights.json'), JSON.stringify(res, null, 2));
console.log(`FLIGHTS ${initial} → ${res.total} (ไม่ซ้ำ ${res.unique}, กดดูเพิ่ม ${clicks.length} ครั้ง)`);

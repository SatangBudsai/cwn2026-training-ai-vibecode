import fs from 'fs';
import { open, URL, consent, captcha, shot, log, waitResults, rows, summarize, BASE } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
if (await captcha(page)) process.exit(2);
let r = await rows(page);
log('[best tab initial]', JSON.stringify(summarize(r)), 'unique', new Set(r.map(x=>x.name)).size);
await page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' }).click(); await page.waitForTimeout(6000);
r = await rows(page);
log('[best tab after ดูเที่ยวบินเพิ่มเติม]', JSON.stringify(summarize(r)), 'unique', new Set(r.map(x=>x.name)).size, 'moreBtn', await page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' }).count());
fs.writeFileSync(`${BASE}/logs/rows-expanded.json`, JSON.stringify(r, null, 1));
const air = {};
for (const x of r) { const m = x.name.match(/กับ (.+?) (ออกเดินทาง|ดำเนินการ)/); const k = m ? m[1] : '?'; air[k] = (air[k] || 0) + 1; }
log('airline counts (best, expanded)', JSON.stringify(air));
console.log('last row:', r[r.length-1]?.text);
const last = await page.evaluate(() => [...document.querySelectorAll('[role=main] *')].filter(e=>e.children.length===0 && e.offsetParent && /ไม่|ทั้งหมด|เพิ่มเติม/.test(e.textContent)).map(e=>e.textContent).slice(-15));
console.log(last);
await browser.close();

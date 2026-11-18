import fs from 'fs';
import { open, URL, consent, captcha, shot, snap, log, waitResults, rows, summarize, clickMore, BASE } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
if (await captcha(page)) process.exit(2);
let r = await rows(page);
log('initial best tab', JSON.stringify(summarize(r)));
fs.writeFileSync(`${BASE}/logs/rows-initial.json`, JSON.stringify(r, null, 1));
console.log('FULL NAME 0:', r[0]?.name); console.log('FULL NAME 1:', r[1]?.name);
// ดูเที่ยวบินเพิ่มเติม
const btn = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' });
await btn.scrollIntoViewIfNeeded(); await shot(page, '02-more-button');
await btn.click(); await page.waitForTimeout(6000);
r = await rows(page);
log('after ดูเที่ยวบินเพิ่มเติม (best tab)', JSON.stringify(summarize(r)), 'more button still?', await page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' }).count());
fs.writeFileSync(`${BASE}/logs/rows-expanded.json`, JSON.stringify(r, null, 1));
await shot(page, '02-after-more-full', true);
await snap(page, '02-after-more', '[role=main]');
// counts of airlines
const air = {};
for (const x of r) { const m = x.name.match(/กับ (.+?) (ออกเดินทาง|ดำเนินการ)/); const k = m ? m[1] : '?'; air[k] = (air[k] || 0) + 1; }
log('airline counts expanded', JSON.stringify(air));
// expand a stopover flight
const stop = page.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ });
const names = await stop.evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
console.log('DETAIL BTN 0:', names[0]);
const idx = r.findIndex(x => /แวะพัก 1 ครั้ง/.test(x.name));
await page.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).nth(idx).click();
await page.waitForTimeout(2500);
const li = page.locator('[role=main] li').filter({ has: page.locator('[role=link]') }).nth(idx);
await li.scrollIntoViewIfNeeded();
await shot(page, '02-expanded-stopover');
const y = await li.ariaSnapshot();
fs.writeFileSync(`${BASE}/snapshots/02-expanded-stopover.yml`, y);
console.log(y);
await browser.close();

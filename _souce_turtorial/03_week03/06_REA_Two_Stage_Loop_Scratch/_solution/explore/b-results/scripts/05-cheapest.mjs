import { open, URL, consent, captcha, shot, snap, log, waitResults, rows, summarize } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
await page.getByRole('tab', { name: /ถูกที่สุด/ }).click();
for (const t of [2, 5, 10]) { await page.waitForTimeout(t * 1000 - (t===2?0:t===5?2000:5000)); const r = await rows(page);
  log(`[cheapest +${t}s]`, JSON.stringify(summarize(r)), r.slice(0,3).map(x=>x.text.match(/฿[\d,]+/)?.[0]).join(','),
  'sortBtn', await page.getByRole('button', { name: /เปลี่ยนลำดับการจัดเรียง/ }).count(),
  'h3', JSON.stringify(await page.locator('[role=main] h3').evaluateAll(e => e.filter(x=>x.offsetParent).map(x => x.innerText)))); }
await shot(page, '05-tab-cheapest-loaded'); await snap(page, '05-tab-cheapest', '[role=main]');
await page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' }).click().catch(e=>log('no more btn in cheapest')); await page.waitForTimeout(5000);
const r = await rows(page); log('[cheapest after more]', JSON.stringify(summarize(r)));
const prices = r.map(x=>+x.name.match(/ราคาเริ่มต้นที่ (\d+)/)[1]); log('cheapest sorted asc?', prices.every((p,i)=>i==0||p>=prices[i-1]));
await browser.close();

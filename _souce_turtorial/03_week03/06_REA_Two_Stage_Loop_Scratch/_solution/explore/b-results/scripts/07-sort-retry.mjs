import { open, URL, consent, captcha, shot, snap, log, waitResults, rows, summarize } from './lib.mjs';
const opt = process.argv[2] || 'ราคา';
const { browser, page } = await open();
const sortBtn = () => page.getByRole('button', { name: /เปลี่ยนลำดับการจัดเรียง/ }).filter({ visible: true });
await page.goto(URL); await consent(page); await waitResults(page);
await sortBtn().first().click(); await page.waitForTimeout(1500);
await page.getByRole('menuitemradio', { name: opt }).click();
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(4000);
  const err = await page.getByText('มีบางอย่างผิดพลาด').count();
  const r = await rows(page);
  log(`[sort=${opt} t+${(i+1)*4}s] err=${err}`, JSON.stringify(summarize(r)), 'sortBtn', await sortBtn().first().getAttribute('aria-label', {timeout:1000}).catch(()=>'NONE'));
  if (r.length) { log('state', JSON.stringify({tabs: await page.getByRole('tab').evaluateAll(e => e.map(x => x.innerText.replace(/\s+/g,' ').trim() + (x.getAttribute('aria-selected')==='true'?'[sel]':''))), h3: await page.locator('[role=main] h3').evaluateAll(e => e.filter(x => x.offsetParent).map(x => x.innerText)), url: page.url().slice(-45)})); if (opt==='ราคา') await snap(page,'07-sorted-price','[role=main]'); log('top5', JSON.stringify(r.slice(0,5).map(x=>x.text.split(' | ').filter(s=>s.trim()).slice(0,5).join(' ')+' '+x.text.match(/฿[\d,]+/)?.[0]))); break; }
}
if (await page.getByText('มีบางอย่างผิดพลาด').count()) {
  await snap(page, '07-error-state', '[role=main]');
  await page.getByRole('button', { name: 'โหลดซ้ำ' }).click(); await page.waitForTimeout(8000);
  const r = await rows(page);
  log(`[after โหลดซ้ำ] err=${await page.getByText('มีบางอย่างผิดพลาด').count()}`, JSON.stringify(summarize(r)), 'sortBtn', await sortBtn().first().getAttribute('aria-label', {timeout:1000}).catch(()=>'NONE'), page.url().slice(-50));
  if (r.length) log('top5', JSON.stringify(r.slice(0,5).map(x=>x.text.split(' | ').filter(s=>s.trim()).slice(0,5).join(' ')+' '+x.text.match(/฿[\d,]+/)?.[0])));
}
await shot(page, `07-sort-${opt}`);
await browser.close();

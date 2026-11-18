import { open, URL, consent, captcha, shot, snap, log, waitResults, rows, summarize } from './lib.mjs';
const { browser, page } = await open();
const sortBtn = () => page.getByRole('button', { name: /เปลี่ยนลำดับการจัดเรียง/ }).filter({ visible: true });
const state = async () => ({
  tabs: await page.getByRole('tab').evaluateAll(e => e.map(x => x.innerText.replace(/\s+/g, ' ').trim() + (x.getAttribute('aria-selected') === 'true' ? '[sel]' : ''))),
  sort: await sortBtn().first().getAttribute('aria-label', { timeout: 3000 }).catch(() => 'NONE'),
  h3: await page.locator('[role=main] h3').evaluateAll(e => e.filter(x => x.offsetParent).map(x => x.innerText)),
});
const top = async (n = 5) => (await rows(page)).slice(0, n).map(x => x.text.split(' | ').filter(s => s.trim()).filter((_, i) => [0, 2, 3, 4].includes(i)).join(' ') + ' ' + x.text.match(/฿[\d,]+/)?.[0]);
const OPTS = ['เที่ยวบินยอดนิยม', 'ราคา', 'เวลาออกเดินทาง', 'เวลาถึง', 'ระยะเวลา', 'การปล่อยก๊าซ'];
await page.goto(URL); await consent(page); await waitResults(page);
if (await captcha(page)) process.exit(2);
await sortBtn().first().click(); await page.waitForTimeout(1200);
await shot(page, '06-sort-menu-open'); await snap(page, '06-sort-menu', '[role=menu]');
await page.keyboard.press('Escape'); await page.waitForTimeout(1000);
log('after Escape state', JSON.stringify(await state()));
for (const o of OPTS.slice(1)) {
  await sortBtn().first().click(); await page.waitForTimeout(1200);
  await page.getByRole('menuitemradio', { name: o }).click(); await page.waitForTimeout(5000);
  const st = await state(); const r = await rows(page);
  log(`[sort=${o}]`, JSON.stringify(st), JSON.stringify(summarize(r)), 'url', page.url().slice(-60));
  log(`[sort=${o}] top5`, JSON.stringify(await top()));
  await shot(page, `06-sort-${o}`);
  if (o === 'ราคา') await snap(page, '06-sorted-price', '[role=main]');
}
// persistence: sorted by การปล่อยก๊าซ now. Click ดูเที่ยวบินเพิ่มเติม
const mb = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' });
log('more button exists when sorted?', await mb.count());
if (await mb.count()) { await mb.click(); await page.waitForTimeout(5000); log('[sorted emission + more]', JSON.stringify(summarize(await rows(page))), JSON.stringify(await state())); }
// switch tab
const t = page.getByRole('tab', { name: /ถูกที่สุด/ });
if (await t.count()) { await t.click(); await page.waitForTimeout(5000); log('[sorted then tab ถูกที่สุด]', JSON.stringify(await state()), JSON.stringify(await top(3))); }
// apply a filter (nonstop) - does sort persist?
await page.getByRole('button', { name: /^จำนวนครั้งที่แวะพัก/ }).click(); await page.waitForTimeout(1500);
await page.getByRole('radio', { name: /บินตรงเท่านั้น/ }).click(); await page.waitForTimeout(4000);
await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
log('[sort + filter nonstop]', JSON.stringify(await state()), JSON.stringify(summarize(await rows(page))));
await page.reload(); await page.waitForTimeout(8000);
log('[after reload]', JSON.stringify(await state()), 'url', page.url());
await browser.close();

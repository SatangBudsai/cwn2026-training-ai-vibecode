import fs from 'fs';
import { open, URL, consent, captcha, shot, snap, log, waitResults, rows, summarize, BASE } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
if (await captcha(page)) process.exit(2);
const first3 = async () => (await rows(page)).slice(0, 3).map(x => x.text.split(' | ').filter(Boolean).slice(0, 4).join(' ') + ' ' + x.text.match(/฿[\d,]+/)?.[0]);
// info button about ranking
await page.getByRole('button', { name: 'ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ' }).first().click(); await page.waitForTimeout(1500);
await shot(page, '04-ranking-info'); await snap(page, '04-ranking-info-dialog', 'body');
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
// cheapest tab
await page.getByRole('tab', { name: /ถูกที่สุด/ }).click(); await page.waitForTimeout(5000);
log('[tab ถูกที่สุด] url', page.url());
log('[tab ถูกที่สุด]', JSON.stringify(summarize(await rows(page))), JSON.stringify(await first3()));
await shot(page, '04-tab-cheapest'); await snap(page, '04-tab-cheapest', '[role=main]');
// sort menu in cheapest
const sortBtn = () => page.getByRole('button', { name: /เปลี่ยนลำดับการจัดเรียง/ });
log('sort btn (cheapest tab):', await sortBtn().first().getAttribute('aria-label'));
await sortBtn().first().click(); await page.waitForTimeout(1500);
await shot(page, '04-sort-menu-cheapest'); 
const items = await page.getByRole('menuitemradio').evaluateAll(e => e.map(x => x.innerText.trim() + (x.getAttribute('aria-checked') === 'true' ? ' [checked]' : '')));
log('sort options (cheapest tab):', JSON.stringify(items));
await snap(page, '04-sort-menu', '[role=menu]').catch(e => console.log('menu snap fail', e.message));
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
// back to best
await page.getByRole('tab', { name: /ดีที่สุด/ }).click(); await page.waitForTimeout(4000);
await sortBtn().first().click(); await page.waitForTimeout(1500);
const items2 = await page.getByRole('menuitemradio').evaluateAll(e => e.map(x => x.innerText.trim() + (x.getAttribute('aria-checked') === 'true' ? ' [checked]' : '')));
log('sort options (best tab):', JSON.stringify(items2));
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
for (let i = 0; i < items2.length; i++) {
  await sortBtn().first().click(); await page.waitForTimeout(1200);
  const opt = page.getByRole('menuitemradio').nth(i);
  const label = (await opt.innerText()).trim();
  await opt.click(); await page.waitForTimeout(5000);
  const tabs = await page.getByRole('tab').evaluateAll(e => e.map(x => x.innerText.replace(/\n/g, ' ') + (x.getAttribute('aria-selected') === 'true' ? '[sel]' : '')));
  const r = await rows(page);
  const heads = await page.locator('[role=main] h3').evaluateAll(e => e.map(x => x.innerText));
  log(`[sort=${label}] url=${page.url()} tabs=${JSON.stringify(tabs)} sortBtn=${await sortBtn().first().getAttribute('aria-label').catch(()=>'NONE')} headings=${JSON.stringify(heads)}`, JSON.stringify(summarize(r)), JSON.stringify(await first3()));
  await shot(page, `04-sort-${i}`);
  if (i === 1) await snap(page, '04-sorted-by-option1', '[role=main]');
}
// does sort persist when switching tab?
const tabs = page.getByRole('tab');
log('tab count after sort', await tabs.count());
if (await tabs.count()) {
  await page.getByRole('tab', { name: /ถูกที่สุด/ }).click().catch(()=>{}); await page.waitForTimeout(4000);
  log('[after sort then click ถูกที่สุด] sortBtn=', await sortBtn().first().getAttribute('aria-label').catch(()=>'NONE'), JSON.stringify(await first3()));
  await page.getByRole('tab', { name: /ดีที่สุด/ }).click().catch(()=>{}); await page.waitForTimeout(4000);
  log('[then back ดีที่สุด] sortBtn=', await sortBtn().first().getAttribute('aria-label').catch(()=>'NONE'), JSON.stringify(await first3()));
}
await browser.close();

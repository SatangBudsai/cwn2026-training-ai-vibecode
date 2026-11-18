import { open, home, shot, snap, log, setPlace, setTripType } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
const D = () => page.getByRole('dialog').filter({ visible: true }).first();
async function visErr(tag) {
  const a = await page.getByRole('alert').filter({ visible: true }).allInnerTexts().catch(() => []);
  const tips = await page.locator('[role=tooltip], [aria-live]').filter({ visible: true }).allInnerTexts().catch(() => []);
  log(tag, '| url:', page.url().slice(0, 110), '| alerts:', JSON.stringify(a), '| live/tooltips:', JSON.stringify(tips.filter(Boolean).slice(0, 5)));
}
try {
  // A: same origin & dest
  await home(page);
  await setTripType(page, 'เที่ยวเดียว');
  await setPlace(page, 'ปลายทาง', 'กรุงเทพ', /^กรุงเทพมหานคร/);
  await page.waitForTimeout(800);
  await visErr('A same city selected');
  await shot(page, '36-same-origin-dest');
  console.log(await snap(page, '36-same-origin-dest', S()));
  const dv = await S().getByRole('combobox', { name: /^ปลายทาง/ }).first().inputValue();
  log('A dest value:', dv);
  // set date then search
  await S().getByRole('textbox', { name: 'ขาไป' }).click(); await page.waitForTimeout(1200);
  await D().locator('[role=gridcell]').filter({ visible: true }).filter({ hasText: /^15/ }).first().click(); await page.waitForTimeout(400);
  await D().getByRole('button', { name: /^เสร็จ/ }).click(); await page.waitForTimeout(600);
  const u0 = page.url();
  await S().getByRole('button', { name: /^(ค้นหา|สำรวจ)/ }).last().click(); await page.waitForTimeout(4000);
  await visErr('A search same city'); log('A navigated to search page?', page.url() !== u0, page.url().includes('/search'));
  await shot(page, '37-same-origin-dest-search');
  // B: BKK airport vs DMK airport (different airports same city)
  await home(page);
  await setTripType(page, 'เที่ยวเดียว');
  await setPlace(page, 'ต้นทาง', 'BKK', /BKK/);
  await setPlace(page, 'ปลายทาง', 'DMK', /DMK/);
  await visErr('B BKK->DMK');
  await shot(page, '38-bkk-dmk');
  // C: empty origin
  await home(page);
  await setTripType(page, 'เที่ยวเดียว');
  await S().getByRole('combobox', { name: /^ต้นทาง/ }).first().click(); await page.waitForTimeout(600);
  const oi = D().getByRole('combobox').first(); await oi.fill(''); await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  log('C origin value after clear+Esc:', JSON.stringify(await S().getByRole('combobox', { name: /^ต้นทาง/ }).first().inputValue()));
  await setPlace(page, 'ปลายทาง', 'โตเกียว', /^โตเกียว/);
  const u1 = page.url();
  await S().getByRole('button', { name: /^(ค้นหา|สำรวจ)/ }).last().click(); await page.waitForTimeout(3000);
  await visErr('C search with cleared origin'); await shot(page, '39-empty-origin-search');
  // D: only dest, no date, round trip -> click ค้นหา (calendar opens?)
  await home(page);
  await setPlace(page, 'ปลายทาง', 'โตเกียว', /^โตเกียว/);
  await S().getByRole('button', { name: /^(ค้นหา|สำรวจ)/ }).last().click(); await page.waitForTimeout(2500);
  log('D roundtrip no dates -> dialog visible?', await D().isVisible().catch(() => false), 'focused:', await page.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.placeholder));
  await shot(page, '40-roundtrip-nodate-search');
  // E: empty dest, press สำรวจ
  await home(page);
  const btn = S().getByRole('button', { name: 'สำรวจจุดหมายปลายทาง' });
  await btn.click(); await page.waitForTimeout(4000);
  log('E สำรวจ with empty dest -> url:', page.url());
  await shot(page, '41-explore-from-empty-dest');
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-08'); }
finally { await browser.close(); }

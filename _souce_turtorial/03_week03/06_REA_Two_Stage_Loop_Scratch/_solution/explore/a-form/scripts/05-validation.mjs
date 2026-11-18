import { open, home, shot, snap, log, setPlace, setTripType } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
const vals = async () => JSON.stringify({ o: await S().getByRole('combobox', { name: /^ต้นทาง/ }).first().inputValue(), d: await S().getByRole('combobox', { name: /^ปลายทาง/ }).first().inputValue(), searchBtn: await S().getByRole('button', { name: /สำรวจ|ค้นหา/ }).last().getAttribute('aria-label') });
async function errs(tag) {
  const a = await page.getByRole('alert').filter({ visible: true }).allInnerTexts().catch(() => []);
  const red = await page.evaluate(() => [...document.querySelectorAll('[role=search] *')].filter(e => e.childElementCount === 0 && e.innerText && getComputedStyle(e).color === 'rgb(217, 48, 37)').map(e => e.innerText));
  log(tag, 'url=', page.url().slice(0, 140), '| alerts:', JSON.stringify(a), '| red text:', JSON.stringify(red));
}
try {
  await home(page);
  // 1) default state: press สำรวจ (empty dest)
  log('initial', await vals());
  await setTripType(page, 'เที่ยวเดียว');
  log('oneway', await vals());
  // 2) set dest Tokyo → button label changes?
  await setPlace(page, 'ปลายทาง', 'โตเกียว', /^โตเกียว/);
  log('after dest tokyo', await vals());
  await shot(page, '24-oneway-bkk-tyo-nodate');
  console.log(await snap(page, '24-oneway-bkk-tyo-nodate', S()));
  // 3) swap
  await S().getByRole('button', { name: 'สลับต้นทางกับปลายทาง' }).first().click(); await page.waitForTimeout(800);
  log('after swap', await vals()); await shot(page, '25-after-swap');
  await S().getByRole('button', { name: 'สลับต้นทางกับปลายทาง' }).first().click(); await page.waitForTimeout(800);
  log('after swap back', await vals());
  // 4) search without date
  const before = page.url();
  await S().getByRole('button', { name: /ค้นหา|สำรวจ/ }).last().click(); await page.waitForTimeout(3500);
  await errs('search without date'); await shot(page, '26-search-no-date');
  log('navigated?', page.url() !== before);
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-05'); }
finally { await browser.close(); }

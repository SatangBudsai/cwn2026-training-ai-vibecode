import { open, home, shot, snap, log, setPlace, setTripType } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
const D = () => page.getByRole('dialog').filter({ visible: true }).first();
const months = () => D().locator('[role=rowgroup]').evaluateAll(gs => gs.filter(g => { const r = g.getBoundingClientRect(); return r.width && r.left > 380 && r.right < 1200; }).map(g => g.firstElementChild?.innerText?.trim() || g.innerText.split('\n')[0]));
try {
  await home(page);
  await setTripType(page, 'เที่ยวเดียว');
  await setPlace(page, 'ปลายทาง', 'โตเกียว', /^โตเกียว/);
  await S().getByRole('textbox', { name: 'ขาไป' }).click();
  await page.waitForTimeout(3000);
  const btns = async () => JSON.stringify(await D().getByRole('button').evaluateAll(bs => bs.filter(b => !/^\d/.test(b.innerText)).map(b => `${b.getAttribute('aria-label') ?? b.innerText}${b.disabled || b.getAttribute('aria-disabled') === 'true' ? '[disabled]' : ''}${b.offsetParent ? '' : '[hidden]'}`)));
  log('nav buttons', await btns());
  log('done button exact aria-label:', JSON.stringify(await D().getByRole('button', { name: /^เสร็จ/ }).getAttribute('aria-label')), 'text:', JSON.stringify(await D().getByRole('button', { name: /^เสร็จ/ }).innerText()));
  // today cell style
  log('today cell (1 Nov):', JSON.stringify(await D().getByRole('button', { name: /^วันอาทิตย์ที่ 1 พฤศจิกายน ค.ศ. 2026/ }).evaluate(b => ({ cls: b.parentElement.className, dis: b.getAttribute('aria-disabled'), color: getComputedStyle(b).color }))));
  let k = 0;
  while (k < 15) {
    const nx = D().getByRole('button', { name: 'ถัดไป' });
    if (!(await nx.isVisible()) || await nx.isDisabled()) break;
    await nx.click(); await page.waitForTimeout(1200); k++;
    if (k === 2) await shot(page, '28-calendar-next2');
  }
  log('next clicks until stop:', k, 'nav buttons now:', await btns());
  await shot(page, '29-calendar-last');
  const last = await D().locator('[role=gridcell] [role=button], [role=gridcell] button').evaluateAll(bs => bs.filter(b => b.getBoundingClientRect().width).map(b => b.getAttribute('aria-label') || b.innerText).slice(-3));
  log('last visible days:', JSON.stringify(last));
  // go back to Nov
  for (let i = 0; i < k; i++) { await D().getByRole('button', { name: 'ก่อนหน้า' }).click().catch(() => {}); await page.waitForTimeout(400); }
  await page.waitForTimeout(1500);
  log('nav after back', await btns());
  // select Sun 15 Nov
  const t0 = new Date().toISOString();
  const day15 = D().getByRole('button', { name: /^วันอาทิตย์ที่ 15 พฤศจิกายน ค.ศ. 2026/ });
  log('15 Nov label @', t0, ':', await day15.getAttribute('aria-label'));
  await day15.click(); await page.waitForTimeout(800);
  log('after click 15: field =', await D().getByRole('textbox', { name: 'ขาไป' }).inputValue(), '| dialog still open?', await D().isVisible(), '| nav', await btns());
  await shot(page, '30-calendar-selected-15nov');
  await snap(page, '30-calendar-selected-15nov', D());
  await D().getByRole('button', { name: /^เสร็จ/ }).click(); await page.waitForTimeout(800);
  log('after เสร็จ: main field =', await S().getByRole('textbox', { name: 'ขาไป' }).inputValue());
  console.log(await snap(page, '31-form-filled-standard', S()));
  await shot(page, '31-form-filled-standard');
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-06b'); }
finally { await browser.close(); }

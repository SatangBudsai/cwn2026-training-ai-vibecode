import { open, home, shot, snap, log, setPlace, setTripType } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
const D = () => page.getByRole('dialog').filter({ visible: true }).first();
const dep = () => S().getByRole('textbox', { name: 'ขาไป' }).first();
try {
  await home(page);
  await setTripType(page, 'เที่ยวเดียว');
  await setPlace(page, 'ปลายทาง', 'โตเกียว', /^โตเกียว/);
  // arrows beside date field before date chosen?
  const arrowInfo = async (tag) => log(tag, JSON.stringify(await S().locator('button').evaluateAll(bs => bs.filter(b => b.getBoundingClientRect().width).map(b => (b.getAttribute('aria-label') || b.innerText) + (b.disabled || b.getAttribute('aria-disabled') === 'true' ? '[disabled]' : '')))));
  await arrowInfo('buttons in form (no date):');
  await dep().click(); await page.waitForTimeout(1500);
  await D().getByRole('button', { name: /^วันอาทิตย์ที่ 15 พฤศจิกายน/ }).click().catch(async () => { await D().locator('[role=gridcell]').filter({ hasText: /^15/ }).first().click(); });
  await page.waitForTimeout(500);
  await D().getByRole('button', { name: /^เสร็จ/ }).click(); await page.waitForTimeout(800);
  await arrowInfo('buttons in form (date 15):');
  const arrows = S().locator('button').filter({ visible: true }).filter({ hasNotText: /./ });
  const info = await S().locator('button').evaluateAll(bs => bs.filter(b => b.getBoundingClientRect().width && !(b.getAttribute('aria-label') || b.innerText.trim())).map(b => ({ html: b.outerHTML.slice(0, 300), parentLabel: b.closest('[aria-label]')?.getAttribute('aria-label'), x: Math.round(b.getBoundingClientRect().x), dis: b.disabled, tabindex: b.tabIndex, ariaHidden: b.closest('[aria-hidden=true]') ? true : false })));
  console.log(JSON.stringify(info, null, 1));
  const xs = info.map(i => i.x).sort((a, b) => a - b);
  // click left arrow (prev day) and right arrow (next day)
  const clickAt = async (x) => { const b = S().locator('button').filter({ visible: true }); for (let k = 0; k < await b.count(); k++) { const bb = await b.nth(k).boundingBox(); if (bb && Math.round(bb.x) === x) { await b.nth(k).click(); return; } } };
  await clickAt(xs[1]); await page.waitForTimeout(800);
  log('after > :', await dep().inputValue(), '| url', page.url().slice(0, 60)); await shot(page, '32-date-next-arrow');
  await clickAt(xs[0]); await clickAt(xs[0]); await page.waitForTimeout(800);
  log('after < x2 :', await dep().inputValue());
  // go back toward today: press < many times
  for (let k = 0; k < 20; k++) { const pb = S().locator('button[data-delta="-1"]').filter({ visible: true }).first(); if (await pb.isDisabled()) { log('prev arrow disabled after', k, 'clicks'); break; } await pb.click(); await page.waitForTimeout(250); }
  log('after < x20 :', await dep().inputValue(), JSON.stringify(await S().locator('button').evaluateAll(bs => bs.filter(b => b.getBoundingClientRect().width && !(b.getAttribute('aria-label') || b.innerText.trim())).map(b => b.disabled || b.getAttribute('aria-disabled')))));
  await shot(page, '33-date-prev-at-today');
  // type a past date manually
  await dep().click(); await page.waitForTimeout(800);
  const din = D().getByRole('textbox', { name: 'ขาไป' });
  await din.fill('10 ต.ค. 2026'); await din.press('Enter'); await page.waitForTimeout(1000);
  log('typed past date -> dialog field:', await din.inputValue());
  await shot(page, '34-date-typed-past');
  await din.fill('15/11/2026'); await din.press('Enter'); await page.waitForTimeout(1000);
  log('typed 15/11/2026 ->', await din.inputValue());
  await din.fill('15 พ.ย. 2026'); await din.press('Enter'); await page.waitForTimeout(1000);
  log('typed 15 พ.ย. 2026 ->', await din.inputValue());
  await din.fill('1 ม.ค. 2028'); await din.press('Enter'); await page.waitForTimeout(1000);
  log('typed 1 ม.ค. 2028 (beyond range) ->', await din.inputValue());
  await shot(page, '35-date-typed-beyond');
  // reset
  await D().getByRole('button', { name: 'รีเซ็ต' }).click().catch(e => log('reset err', e.message.split('\n')[0])); await page.waitForTimeout(600);
  log('after รีเซ็ต ->', JSON.stringify(await din.inputValue()));
  // click a far-out greyed day: navigate to last month and click 27 Sep 2027
  for (let k = 0; k < 9; k++) { await D().getByRole('button', { name: 'ถัดไป' }).click().catch(() => {}); await page.waitForTimeout(300); }
  await page.waitForTimeout(800);
  const c27 = D().locator('[role=gridcell]').filter({ visible: true }).filter({ hasText: /^27$/ }).last();
  log('27 Sep 2027 cell:', JSON.stringify(await c27.evaluate(c => ({ lab: c.getAttribute('aria-label'), dis: c.getAttribute('aria-disabled'), html: c.outerHTML.slice(0, 200) }))));
  await c27.click({ timeout: 2000 }).catch(e => log('click 27 err', e.message.split('\n')[0])); await page.waitForTimeout(600);
  log('after click 27 Sep 2027 ->', JSON.stringify(await din.inputValue()));
  const c26 = D().locator('[role=gridcell]').filter({ visible: true }).filter({ hasText: /^26/ }).last();
  await c26.click().catch(() => {}); await page.waitForTimeout(600);
  log('after click 26 Sep 2027 ->', JSON.stringify(await din.inputValue()));
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-07'); }
finally { await browser.close(); }

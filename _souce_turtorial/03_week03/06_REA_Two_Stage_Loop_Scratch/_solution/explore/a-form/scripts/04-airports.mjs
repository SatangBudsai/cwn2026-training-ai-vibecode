import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
try {
  await home(page);
  // click origin field
  await S().getByRole('combobox', { name: 'ต้นทาง' }).first().click();
  await page.waitForTimeout(1000);
  await shot(page, '15-origin-focus');
  const y0 = await snap(page, '15-origin-focus', page.locator('body'));
  // print only listbox / dialog parts
  const lb = page.getByRole('listbox');
  log('listboxes', await lb.count());
  for (let i = 0; i < await lb.count(); i++) if (await lb.nth(i).isVisible()) console.log(await lb.nth(i).ariaSnapshot());
  const dl = page.getByRole('dialog');
  for (let i = 0; i < await dl.count(); i++) if (await dl.nth(i).isVisible()) { console.log('--dialog', i); console.log(await dl.nth(i).ariaSnapshot()); }
  // what's focused
  log('focused:', await page.evaluate(() => { const a = document.activeElement; return a.tagName + ' ' + a.getAttribute('aria-label') + ' val=' + a.value; }));
  await page.keyboard.press('Control+A'); await page.keyboard.type('กรุงเทพ', { delay: 80 });
  await page.waitForTimeout(1500);
  await shot(page, '16-origin-typed-krungthep');
  for (let i = 0; i < await lb.count(); i++) if (await lb.nth(i).isVisible()) { const y = await lb.nth(i).ariaSnapshot(); console.log(y); }
  await snap(page, '16-origin-typed-krungthep', page.getByRole('listbox').filter({ visible: true }).first());
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-04'); }
finally { await browser.close(); }

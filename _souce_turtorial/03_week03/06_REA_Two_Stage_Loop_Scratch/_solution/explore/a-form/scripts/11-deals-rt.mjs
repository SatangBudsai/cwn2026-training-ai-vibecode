import { open, home, shot, snap, log, setPlace } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
const D = () => page.getByRole('dialog').filter({ visible: true }).first();
try {
  if (false) for (let i = 0; i < 4; i++) { await home(page); if (await page.getByRole('tab', { name: 'เทศบาลนครภูเก็ต' }).count()) break; log('V2 loaded, retry'); }
  const tab = null && page.getByRole('tab', { name: 'เทศบาลนครภูเก็ต' }).first();
  if (false) {
    await tab.scrollIntoViewIfNeeded(); await tab.click(); await page.waitForTimeout(2500);
    log('deals tab ภูเก็ต cards:', JSON.stringify(await page.getByRole('main').getByRole('list').first().getByRole('button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label')))));
    await shot(page, '46-deals-phuket-tab');
    await page.getByRole('button', { name: 'ดูข้อมูลเพิ่มเติมเกี่ยวกับส่วนนี้' }).click(); await page.waitForTimeout(800);
    log('deals info popup:', (await page.locator('[role=dialog],[role=tooltip],[role=alertdialog]').filter({ visible: true }).allInnerTexts()).join(' | ').replace(/\s+/g, ' '));
    await shot(page, '47-deals-info'); await page.keyboard.press('Escape');
    for (const t of ['เที่ยวบินระหว่างประเทศจากไทย', 'เที่ยวบินภายในประเทศในไทย']) {
      await page.getByRole('tab', { name: t }).click(); await page.waitForTimeout(600);
      log('tab', t, '->', JSON.stringify(await page.getByRole('tabpanel', { name: t }).getByRole('link').allInnerTexts()));
    }
  }
  // round trip calendar
  await home(page);
  await setPlace(page, 'ปลายทาง', 'โตเกียว', /^โตเกียว/);
  await S().getByRole('textbox', { name: 'ขาไป' }).click(); await page.waitForTimeout(2500);
  const cell = (re) => D().locator('[role=gridcell]').filter({ visible: true }).filter({ hasText: re }).first();
  await cell(/^15/).click(); await page.waitForTimeout(800);
  log('RT after pick 15: dep=', await D().getByRole('textbox', { name: 'ขาไป' }).inputValue(), 'ret=', await D().getByRole('textbox', { name: 'ขากลับ' }).inputValue(), 'focused=', await page.evaluate(() => document.activeElement.getAttribute('aria-label')));
  await page.waitForTimeout(2500);
  await shot(page, '50-rt-calendar-after-dep');
  const lbl = await D().locator('[role=gridcell]').filter({ visible: true }).evaluateAll(cs => cs.slice(14, 22).map(c => c.getAttribute('aria-label') + ' :: ' + c.innerText.replace(/\s+/g, ' ')));
  log('RT cells after dep (prices = round-trip?):', JSON.stringify(lbl));
  await cell(/^10/).click(); await page.waitForTimeout(800);
  log('RT click 10 (before dep): dep=', await D().getByRole('textbox', { name: 'ขาไป' }).inputValue(), 'ret=', await D().getByRole('textbox', { name: 'ขากลับ' }).inputValue());
  await cell(/^20/).click(); await page.waitForTimeout(800);
  log('RT click 20: dep=', await D().getByRole('textbox', { name: 'ขาไป' }).inputValue(), 'ret=', await D().getByRole('textbox', { name: 'ขากลับ' }).inputValue());
  await shot(page, '51-rt-calendar-range');
  await snap(page, '51-rt-calendar-range', D().getByRole('textbox').first().locator('xpath=ancestor::*[3]'));
  log('done btn label:', await D().getByRole('button', { name: /^เสร็จ/ }).getAttribute('aria-label'));
  await D().getByRole('button', { name: /^เสร็จ/ }).click(); await page.waitForTimeout(600);
  log('main dep/ret:', await S().getByRole('textbox', { name: 'ขาไป' }).inputValue(), '/', await S().getByRole('textbox', { name: 'ขากลับ' }).inputValue());
  await shot(page, '52-rt-filled');
  // same day dep/ret allowed?
  await S().getByRole('textbox', { name: 'ขาไป' }).click(); await page.waitForTimeout(1500);
  await D().getByRole('button', { name: 'รีเซ็ต' }).click(); await page.waitForTimeout(500);
  await cell(/^15/).click(); await page.waitForTimeout(500); await cell(/^15/).click(); await page.waitForTimeout(600);
  log('RT same day: dep=', await D().getByRole('textbox', { name: 'ขาไป' }).inputValue(), 'ret=', await D().getByRole('textbox', { name: 'ขากลับ' }).inputValue());
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-11'); }
finally { await browser.close(); }

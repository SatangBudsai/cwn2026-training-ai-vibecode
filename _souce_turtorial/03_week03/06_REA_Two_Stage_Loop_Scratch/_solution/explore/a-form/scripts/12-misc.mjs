import { open, home, shot, snap, log, setTripType } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
try {
  await home(page);
  await setTripType(page, 'หลายเมือง');
  let n = 0;
  while (n < 10) { const b = S().getByRole('button', { name: 'เพิ่มเที่ยวบิน' }); if (!(await b.count()) || !(await b.isVisible()) || await b.isDisabled()) break; await b.click(); await page.waitForTimeout(400); n++; }
  const legs = await S().getByRole('textbox', { name: 'ขาไป' }).count();
  log('multi-city: clicks on เพิ่มเที่ยวบิน =', n, 'legs =', legs, 'dates:', JSON.stringify(await S().getByRole('textbox', { name: 'ขาไป' }).evaluateAll(es => es.map(e => e.value))));
  await shot(page, '53-multicity-max-legs', { fullPage: false });
  await snap(page, '53-multicity-max-legs', S());
  log('remove buttons:', JSON.stringify(await S().getByRole('button', { name: /^ลบเที่ยวบิน/ }).evaluateAll(b => b.map(x => x.getAttribute('aria-label')))));
  // delete legs down to min
  let r = 0; while (r < 10) { const d = S().getByRole('button', { name: /^ลบเที่ยวบิน/ }); if (!(await d.count())) break; await d.last().click(); await page.waitForTimeout(300); r++; }
  log('after removing all possible: legs =', await S().getByRole('textbox', { name: 'ขาไป' }).count(), 'removed', r);
  // pax 1A+1seat+1lap
  await page.getByRole('search').getByRole('button', { name: /ผู้โดยสาร/ }).click(); await page.waitForTimeout(400);
  const dlg = page.getByRole('dialog', { name: 'จำนวนผู้โดยสาร' });
  await dlg.getByRole('button', { name: 'เพิ่มทารกที่โดยสารบนที่นั่ง', exact: true }).click();
  await dlg.getByRole('button', { name: 'เพิ่มทารกที่โดยสารบนตัก', exact: true }).click(); await page.waitForTimeout(400);
  log('1A+1seat+1lap alerts:', JSON.stringify(await dlg.getByRole('alert').allInnerTexts()), 'footer:', await dlg.getByRole('button', { name: /^(เสร็จ|ยกเลิก)$/ }).count());
  await shot(page, '54-pax-1seat-1lap');
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-12'); }
finally { await browser.close(); }

import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
const dlg = () => page.getByRole('dialog', { name: 'จำนวนผู้โดยสาร' });
async function state(tag) {
  const items = dlg().getByRole('listitem');
  const out = [];
  for (let i = 0; i < await items.count(); i++) {
    const it = items.nth(i);
    const btns = it.getByRole('button');
    out.push((await it.innerText()).replace(/\s+/g, ' ') + ` [-${await btns.nth(0).isDisabled() ? 'X' : 'ok'} +${await btns.nth(1).isDisabled() ? 'X' : 'ok'}]`);
  }
  const extra = (await dlg().innerText()).replace(/\s+/g, ' ');
  log(tag, '|', out.join(' || '));
  log('  dialog text:', extra);
  const alerts = await page.getByRole('alert').allInnerTexts().catch(() => []);
  if (alerts.length) log('  alerts:', alerts);
}
try {
  await home(page);
  await page.getByRole('button', { name: /ผู้โดยสาร/ }).click();
  await page.waitForTimeout(600);
  // adults to max
  for (let i = 0; i < 10; i++) { const b = dlg().getByRole('button', { name: 'เพิ่มผู้ใหญ่' }); if (await b.isDisabled()) break; await b.click(); await page.waitForTimeout(150); }
  await state('adults max');
  await shot(page, '07-pax-adults-max');
  await snap(page, '07-pax-adults-max', dlg());
  // try add child when at 9
  await dlg().getByRole('button', { name: 'เพิ่มเด็กอายุ 2-11 ปี' }).click({ force: true, timeout: 2000 }).catch(e => log('child click err', e.message.split('\n')[0]));
  await page.waitForTimeout(500);
  await state('after child at max');
  await shot(page, '08-pax-over-max');
  // cancel -> check count resets
  await dlg().getByRole('button', { name: 'ยกเลิก' }).click();
  await page.waitForTimeout(500);
  log('after cancel button:', await page.getByRole('button', { name: /ผู้โดยสาร/ }).first().getAttribute('aria-label'));
  // lap infants rule
  await page.getByRole('button', { name: /ผู้โดยสาร/ }).first().click();
  await page.waitForTimeout(600);
  await state('reopen');
  await dlg().getByRole('button', { name: 'เพิ่มทารกที่โดยสารบนตัก' }).click();
  await page.waitForTimeout(300);
  await state('1 adult 1 lap');
  await dlg().getByRole('button', { name: 'เพิ่มทารกที่โดยสารบนตัก' }).click({ timeout: 2000 }).catch(e => log('lap2 err', e.message.split('\n')[0]));
  await page.waitForTimeout(500);
  await state('1 adult 2 lap attempt');
  await shot(page, '09-pax-lap-rule');
  await snap(page, '09-pax-lap-rule', dlg());
  // remove adult while lap=?
  await dlg().getByRole('button', { name: 'เพิ่มผู้ใหญ่' }).click();
  await dlg().getByRole('button', { name: 'เพิ่มทารกที่โดยสารบนตัก' }).click().catch(() => {});
  await page.waitForTimeout(300);
  await state('2 adult + lap');
  await dlg().getByRole('button', { name: 'นำผู้ใหญ่ออก' }).click().catch(e => log('rm adult err', e.message.split('\n')[0]));
  await page.waitForTimeout(500);
  await state('remove adult with 2 lap');
  await shot(page, '10-pax-remove-adult');
  // done with infants -> label
  await dlg().getByRole('button', { name: 'เสร็จ' }).click();
  await page.waitForTimeout(500);
  log('after done button:', await page.getByRole('button', { name: /ผู้โดยสาร/ }).first().getAttribute('aria-label'));
  // children-only scenario: reopen, adults ->0?
  await page.getByRole('button', { name: /ผู้โดยสาร/ }).first().click();
  await page.waitForTimeout(500);
  await dlg().getByRole('button', { name: 'นำทารกที่โดยสารบนตักออก' }).click().catch(()=>{});
  await dlg().getByRole('button', { name: 'นำทารกที่โดยสารบนตักออก' }).click().catch(()=>{});
  await dlg().getByRole('button', { name: 'เพิ่มเด็กอายุ 2-11 ปี' }).click();
  await page.waitForTimeout(300);
  await state('1 adult 1 child');
  await dlg().getByRole('button', { name: 'นำผู้ใหญ่ออก' }).click({ timeout: 2000 }).catch(e => log('rm adult(1) err', e.message.split('\n')[0]));
  await page.waitForTimeout(500);
  await state('0 adult 1 child?');
  await shot(page, '11-pax-child-only');
  // infant in seat only
  await dlg().getByRole('button', { name: 'เพิ่มทารกที่โดยสารบนที่นั่ง' }).click();
  await page.waitForTimeout(300);
  await state('+ infant seat');
  await dlg().getByRole('button', { name: 'เสร็จ' }).click();
  await page.waitForTimeout(800);
  log('after done:', await page.getByRole('button', { name: /ผู้โดยสาร/ }).first().getAttribute('aria-label'));
  await shot(page, '12-pax-after-done');
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-03'); }
finally { await browser.close(); }

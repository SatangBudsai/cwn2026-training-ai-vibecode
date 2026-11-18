import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
const dlg = () => page.getByRole('dialog', { name: 'จำนวนผู้โดยสาร' });
const paxBtn = () => page.getByRole('search').getByRole('button', { name: /ผู้โดยสาร/ }).first();
async function state(tag) {
  const items = dlg().getByRole('listitem');
  const out = [];
  for (let i = 0; i < await items.count(); i++) {
    const it = items.nth(i); const btns = it.getByRole('button');
    const n = (await it.innerText()).match(/\d+(?=\s*$)|\b\d\b/g);
    out.push(`${(await btns.nth(1).getAttribute('aria-label')).replace('เพิ่ม','')}=${n?.slice(-1)} [-${await btns.nth(0).isDisabled() ? 'X' : 'ok'} +${await btns.nth(1).isDisabled() ? 'X' : 'ok'}]`);
  }
  const alerts = await dlg().getByRole('alert').allInnerTexts().catch(() => []);
  const footer = await dlg().getByRole('button', { name: /^(เสร็จ|ยกเลิก)$/ }).allInnerTexts();
  log(tag, '|', out.join(' | '), '| alerts:', JSON.stringify(alerts), '| footer:', footer.join(','));
}
const add = (n) => dlg().getByRole('button', { name: n, exact: true }).click({ timeout: 3000 }).catch(e => log('click fail', n, e.message.split('\n')[0]));
async function openPax() { await paxBtn().click(); await page.waitForTimeout(500); }
try {
  await home(page);
  // S1: lap infant > adults
  await openPax();
  await add('เพิ่มทารกที่โดยสารบนตัก'); await page.waitForTimeout(300); await state('S1 1A+1lap');
  await add('เพิ่มทารกที่โดยสารบนตัก'); await page.waitForTimeout(500); await state('S1 1A+2lap');
  await shot(page, '09-pax-lap-rule'); await snap(page, '09-pax-lap-rule', dlg());
  // S2: escape while error
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  log('S2 after Esc in error, dialog visible?', await dlg().isVisible(), 'pax aria:', await paxBtn().getAttribute('aria-label'));
  if (await dlg().isVisible()) { await page.mouse.click(1250, 600); await page.waitForTimeout(500); log('after outside click visible?', await dlg().isVisible(), await paxBtn().getAttribute('aria-label')); }
  // S3: reopen: state persisted?
  await openPax(); await state('S3 reopen');
  await add('นำทารกที่โดยสารบนตักออก'); await add('นำทารกที่โดยสารบนตักออก'); await page.waitForTimeout(300);
  await state('S3 cleared lap');
  // S4: child only — can adults go to 0?
  await add('เพิ่มเด็กอายุ 2-11 ปี'); await page.waitForTimeout(300); await state('S4 1A1C');
  await add('นำผู้ใหญ่ออก'); await page.waitForTimeout(500); await state('S4 remove adult');
  await shot(page, '11-pax-child-only');
  // S5: infant seat with 0 adult?
  await add('เพิ่มทารกที่โดยสารบนที่นั่ง'); await page.waitForTimeout(300); await state('S5 +infant seat');
  await shot(page, '11b-pax-infant-seat');
  // S6: cancel resets?
  if (await dlg().getByRole('button', { name: 'ยกเลิก' }).count()) {
    await dlg().getByRole('button', { name: 'ยกเลิก' }).click(); await page.waitForTimeout(500);
    log('S6 after ยกเลิก pax aria:', await paxBtn().getAttribute('aria-label'), 'text:', await paxBtn().innerText());
  }
  // S7: set 2A 1C 1lap -> เสร็จ
  await openPax(); await state('S7 reopen after cancel');
  for (const b of ['เพิ่มผู้ใหญ่','เพิ่มเด็กอายุ 2-11 ปี','เพิ่มทารกที่โดยสารบนตัก']) await add(b);
  await page.waitForTimeout(300); await state('S7 set');
  await dlg().getByRole('button', { name: 'เสร็จ' }).click(); await page.waitForTimeout(600);
  log('S7 after เสร็จ pax aria:', await paxBtn().getAttribute('aria-label'), 'text:', await paxBtn().innerText(), 'url:', page.url());
  await shot(page, '12-pax-after-done');
  // S8: total 9 incl. lap? 8A +1lap ... set adults to 9 then +lap
  await openPax();
  for (let i = 0; i < 9; i++) await dlg().getByRole('button', { name: 'เพิ่มผู้ใหญ่', exact: true }).click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(300); await state('S8 try adults up');
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-03b'); }
finally { await browser.close(); }

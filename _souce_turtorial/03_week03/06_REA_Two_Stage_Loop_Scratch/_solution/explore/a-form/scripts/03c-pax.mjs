import { open, home, shot, log } from './lib.mjs';
const { browser, page } = await open();
const dlg = () => page.getByRole('dialog', { name: 'จำนวนผู้โดยสาร' });
const paxBtn = () => page.getByRole('search').getByRole('button', { name: /ผู้โดยสาร/ }).first();
const click = async (n, k = 1) => { for (let i = 0; i < k; i++) await dlg().getByRole('button', { name: n, exact: true }).click({ timeout: 1500 }).catch(() => log('  (disabled/fail)', n)); await page.waitForTimeout(250); };
async function counts(tag) {
  const t = await dlg().innerText();
  const nums = [...t.matchAll(/^\s*(\d+)\s*$/gm)].map(m => m[1]);
  const alerts = await dlg().getByRole('alert').allInnerTexts().catch(() => []);
  const footer = await dlg().getByRole('button', { name: /^(เสร็จ|ยกเลิก)$/ }).count();
  log(tag, '| A,C,Iseat,Ilap =', nums.join(','), '| alert:', JSON.stringify(alerts), '| footer btns:', footer);
}
async function fresh() { await page.reload(); await page.waitForTimeout(2500); await paxBtn().click(); await page.waitForTimeout(400); }
try {
  await home(page);
  await paxBtn().click(); await page.waitForTimeout(400);
  await click('เพิ่มผู้ใหญ่', 7); await click('เพิ่มทารกที่โดยสารบนตัก'); await counts('8A+1lap (total 9)');
  await click('เพิ่มทารกที่โดยสารบนตัก'); await counts('8A+2lap (total 10)');
  await fresh();
  await click('เพิ่มทารกที่โดยสารบนที่นั่ง', 2); await counts('1A+2seat');
  await click('เพิ่มทารกที่โดยสารบนที่นั่ง'); await counts('1A+3seat');
  await shot(page, '13-pax-infant-seat-rule');
  await click('นำทารกที่โดยสารบนที่นั่งออก', 2);
  await click('เพิ่มทารกที่โดยสารบนตัก'); await click('เพิ่มทารกที่โดยสารบนที่นั่ง'); await counts('1A+1seat+1lap');
  await click('เพิ่มทารกที่โดยสารบนที่นั่ง'); await counts('1A+2seat+1lap');
  await fresh();
  await click('เพิ่มเด็กอายุ 2-11 ปี', 8); await counts('1A+8C');
  await click('เพิ่มเด็กอายุ 2-11 ปี', 1); await counts('1A+9C');
  await shot(page, '14-pax-children-max');
  // click done when error -> can we? footer hidden. try Esc and check
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  log('after Esc', await paxBtn().getAttribute('aria-label'));
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-03c'); }
finally { await browser.close(); }

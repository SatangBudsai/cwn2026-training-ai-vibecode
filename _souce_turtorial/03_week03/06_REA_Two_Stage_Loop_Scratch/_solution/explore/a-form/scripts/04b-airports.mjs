import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
const S = () => page.getByRole('search');
async function showList(tag) {
  const lb = page.getByRole('listbox').filter({ visible: true });
  const n = await lb.count();
  if (!n) { log(tag, 'NO LISTBOX; dialog text:', (await page.getByRole('dialog').filter({ visible: true }).first().innerText().catch(() => '-')).replace(/\s+/g, ' ')); return; }
  const opts = await lb.first().getByRole('option').allInnerTexts();
  log(tag, 'options:', opts.map(o => o.replace(/\s+/g, ' ')).join(' || '));
}
try {
  await home(page);
  await S().getByRole('combobox', { name: 'ปลายทาง' }).first().click();
  await page.waitForTimeout(1000);
  await shot(page, '17-dest-focus-empty');
  await snap(page, '17-dest-focus-empty', page.getByRole('dialog').filter({ visible: true }).first());
  await showList('dest empty');
  const inp = page.getByRole('dialog').filter({ visible: true }).getByRole('combobox').first();
  log('dest dialog input label:', await inp.getAttribute('aria-label'));
  for (const q of ['โตเกียว', 'tokyo', 'NRT', 'ญี่ปุ่น', 'กรุงเทพ', 'โต', 'zzqqxx']) {
    await inp.fill(''); await inp.pressSequentially(q, { delay: 60 });
    await page.waitForTimeout(1800);
    await showList(`dest "${q}"`);
    if (q === 'โตเกียว') { await shot(page, '18-dest-typed-tokyo'); await snap(page, '18-dest-typed-tokyo', page.getByRole('dialog').filter({ visible: true }).first()); }
    if (q === 'zzqqxx') await shot(page, '19-dest-noresult');
    if (q === 'ญี่ปุ่น') await shot(page, '19b-dest-country');
  }
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-04b'); }
finally { await browser.close(); }

import fs from 'fs';
import { open, URL, consent, shot, snap, log, waitResults, BASE } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
const F = [['stops','จำนวนครั้งที่แวะพัก'],['airlines','สายการบิน'],['bags','สัมภาระ'],['price','ราคา'],['times','เวลา'],['emissions','การปล่อยก๊าซ'],['connect','สนามบินสำหรับต่อเครื่อง'],['duration','ระยะเวลา']];
for (const [k, n] of F) {
  const b = page.getByRole('button', { name: new RegExp('^' + n + ', ') });
  await b.click(); await page.waitForTimeout(2000);
  const dlg = page.getByRole('dialog').filter({ visible: true }).last();
  await shot(page, `09-filter-${k}`);
  try { const y = await dlg.ariaSnapshot(); fs.writeFileSync(`${BASE}/snapshots/09-filter-${k}.yml`, y); console.log(`==== ${n}\n` + y.slice(0, 3500)); } catch (e) { console.log('no dialog', n, e.message); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
}
await page.getByRole('button', { name: 'ตัวกรองทั้งหมด' }).click(); await page.waitForTimeout(2000);
await shot(page, '09-all-filters');
const y = await page.getByRole('dialog').filter({ visible: true }).last().ariaSnapshot(); fs.writeFileSync(`${BASE}/snapshots/09-all-filters.yml`, y);
console.log('==== ALL\n' + y.slice(0, 2500));
await browser.close();

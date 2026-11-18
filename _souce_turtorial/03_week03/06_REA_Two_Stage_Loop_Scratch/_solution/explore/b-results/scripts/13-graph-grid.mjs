import fs from 'fs';
import { open, URL, consent, shot, log, waitResults, rows, summarize, BASE } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
const dlg = () => page.getByRole('dialog').filter({ visible: true }).last();
await page.getByRole('button', { name: 'กราฟราคา' }).click();
for (let i = 0; i < 6; i++) { await page.waitForTimeout(4000); if (!(await dlg().innerText()).includes('กำลังดึงข้อมูลราคา')) break; }
await shot(page, '13-price-graph-loaded');
let y = await dlg().ariaSnapshot(); fs.writeFileSync(`${BASE}/snapshots/13-price-graph.yml`, y);
log('graph text', (await dlg().innerText()).replace(/\n/g, ' / ').slice(0, 800));
console.log(y.slice(0, 3000));
const bars = await dlg().getByRole('button').evaluateAll(e => e.map(x => x.getAttribute('aria-label') || x.innerText).filter(Boolean));
log('graph buttons count', bars.length, JSON.stringify(bars.slice(0, 12)), '...', JSON.stringify(bars.slice(-6)));
const reg = dlg().getByRole('region', { name: 'กราฟราคา' }); const rb = await reg.boundingBox(); log('graph region bbox', JSON.stringify(rb));
for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) { await page.mouse.move(rb.x + rb.width * fx, rb.y + rb.height * 0.6); await page.waitForTimeout(700); log('hover graph at', fx, (await dlg().innerText()).replace(/\n/g, ' / ').slice(0, 260)); }
await shot(page, '13-price-graph-hover');
await dlg().getByRole('button', { name: 'เลื่อนไปข้างหน้า' }).click().catch(e => log('fwd fail')); await page.waitForTimeout(4000);
log('graph after เลื่อนไปข้างหน้า', (await dlg().innerText()).replace(/\n/g, ' / ').slice(0, 300));
await shot(page, '13-price-graph-forward');
// switch to date grid tab inside dialog
await dlg().getByRole('tab', { name: 'วันที่' }).click(); await page.waitForTimeout(4000);
await dlg().getByRole('button', { name: 'เลื่อนไปทางขวา' }).click(); await page.waitForTimeout(4000);
log('grid after เลื่อนไปทางขวา', (await dlg().innerText()).replace(/\n/g, ' / ').slice(0, 500));
await shot(page, '13-date-grid-right');
await dlg().getByRole('button', { name: 'เลื่อนไปทางซ้าย' }).click(); await page.waitForTimeout(4000);
const cells = await dlg().getByRole('button', { name: /^฿/ }).evaluateAll(e => e.map(x => x.getAttribute('aria-label') || x.innerText));
log('grid cells back', JSON.stringify(cells));
// pick cheapest date and Cancel first
const mclick = async l => { const b = await l.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
await mclick(dlg().getByRole('button', { name: /ราคาถูกที่สุด/ }).first()); await page.waitForTimeout(1500);
log('after click cheapest cell footer:', (await dlg().innerText()).split('\n').slice(-4).join(' / '));
await dlg().getByRole('button', { name: 'ยกเลิก' }).click(); await page.waitForTimeout(3000);
log('after ยกเลิก date field:', await page.getByRole('textbox', { name: 'ขาไป' }).inputValue());
await page.getByRole('button', { name: 'ตารางวันที่' }).click(); await page.waitForTimeout(5000);
await mclick(dlg().getByRole('button', { name: /ราคาถูกที่สุด/ }).first()); await page.waitForTimeout(1500);
await dlg().getByRole('button', { name: 'ตกลง' }).click(); await page.waitForTimeout(7000);
const r = await rows(page);
log('after ตกลง on cheapest date: date field=', await page.getByRole('textbox', { name: 'ขาไป' }).inputValue(), 'url', page.url().slice(0, 120), JSON.stringify(summarize(r)));
await shot(page, '13-after-pick-cheapest-date');
await browser.close();

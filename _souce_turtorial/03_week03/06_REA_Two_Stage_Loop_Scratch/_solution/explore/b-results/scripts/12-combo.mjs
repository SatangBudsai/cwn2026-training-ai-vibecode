import fs from 'fs';
import { open, URL, consent, captcha, shot, snap, log, waitResults, rows, summarize, BASE } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
if (await captcha(page)) process.exit(2);
const dlg = () => page.getByRole('dialog').filter({ visible: true }).last();
const openF = async n => { await page.getByRole('button', { name: new RegExp('(^|, )' + n + ', (ไม่ได้)?เลือก') }).first().click({ position: { x: 12, y: 12 } }); await page.waitForTimeout(1500); return dlg(); };
const close = async () => { if (await page.getByRole('dialog').filter({ visible: true }).count()) await page.keyboard.press('Escape'); await page.waitForTimeout(3000); };
const recover = async () => { if (await page.getByText('มีบางอย่างผิดพลาด').filter({ visible: true }).count()) { log('  (error page -> โหลดซ้ำ)'); await page.getByRole('button', { name: 'โหลดซ้ำ' }).click(); await page.waitForTimeout(8000); } };
const st = async tag => { await recover(); const chips = await page.getByRole('search').getByRole('button').evaluateAll(e => e.map(x => x.getAttribute('aria-label')).filter(t => t && /เลือกแล้ว|ตัวกรองทั้งหมด/.test(t))); const main = await page.locator('[role=main]').innerText(); const nr = (main.match(/ไม่พบ[^\n]*/g) || []).join(' ; '); let r = await rows(page); log(tag, 'chips=' + JSON.stringify(chips), 'noRes=' + nr, JSON.stringify(summarize(r)), JSON.stringify(r.slice(0, 6).map(x => x.text.split(' | ').filter(s=>s.trim()).slice(0, 3).join(' ') + ' ' + x.text.match(/฿[\d,]+/)?.[0]))); return r; };
let d = await openF('จำนวนครั้งที่แวะพัก'); await d.getByRole('radio', { name: 'บินตรงเท่านั้น' }).click(); await page.waitForTimeout(3000); await close();
await st('[combo1 บินตรง]');
d = await openF('สายการบิน'); await d.getByRole('checkbox', { name: 'การบินไทย', exact: true }).hover(); await page.waitForTimeout(500); await d.locator('[aria-label="การบินไทย เท่านั้น"]').click(); await page.waitForTimeout(3000); await close();
await st('[combo2 บินตรง+การบินไทย]'); await shot(page, '12-combo-nonstop-thai');
d = await openF('เวลา'); await d.getByRole('slider', { name: 'เวลาออกเดินทางที่ช้าที่สุด', exact: true }).fill('12'); await page.waitForTimeout(3500); await close();
await st('[combo3 +ออก 00-12]'); await shot(page, '12-combo3');
d = await openF('การปล่อยก๊าซ'); await d.getByRole('radio', { name: 'การปล่อยก๊าซต่ำเท่านั้น' }).click(); await page.waitForTimeout(3500); await close();
await st('[combo4 +CO2ต่ำ]'); await shot(page, '12-combo4-noresults', true); await snap(page, '12-combo4-noresults', '[role=main]');
// clear one via chip x
const x = page.getByRole('button', { name: 'ล้าง การปล่อยก๊าซ' });
log('clear chip exists', await x.count()); if (await x.count()) { await x.first().click(); await page.waitForTimeout(4000); }
await st('[combo5 after ล้าง การปล่อยก๊าซ (chip ×)]');
log('url with 3 filters', page.url());
// open all filters dialog and look at state + clear all
await page.getByRole('button', { name: /^ตัวกรองทั้งหมด/ }).click(); await page.waitForTimeout(2000);
await shot(page, '12-all-filters-with-3'); 
const ad = dlg(); fs.writeFileSync(`${BASE}/snapshots/12-all-filters-active.yml`, await ad.ariaSnapshot());
const footer = await ad.getByRole('button').evaluateAll(e => e.slice(-4).map(x => (x.getAttribute('aria-label') || x.innerText) + ' dis=' + x.disabled));
log('all-filters footer buttons', JSON.stringify(footer));
await ad.getByRole('button', { name: 'ล้างทั้งหมด' }).click(); await page.waitForTimeout(4000);
log('after ล้างทั้งหมด dialog still open?', await page.getByRole('dialog').filter({ visible: true }).count());
await close();
await st('[combo6 after ล้างทั้งหมด]'); await shot(page, '12-after-clear-all');
log('url after clear', page.url());
await browser.close();

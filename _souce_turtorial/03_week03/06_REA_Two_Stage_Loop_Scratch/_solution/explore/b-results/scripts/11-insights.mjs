import fs from 'fs';
import { open, URL, consent, captcha, shot, snap, log, waitResults, BASE } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
if (await captcha(page)) process.exit(2);
const ins = page.getByRole('heading', { name: 'ข้อมูลเชิงลึกด้านราคา' });
await ins.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
await shot(page, '11-insights-collapsed');
const sec = page.locator('[role=main]');
log('insight heading4', JSON.stringify(await page.getByRole('heading', { level: 4 }).allInnerTexts()));
await page.getByRole('button', { name: 'ดูประวัติราคา' }).click(); await page.waitForTimeout(2500);
await shot(page, '11-insights-expanded');
// capture region around insights
const txt = await page.evaluate(() => { const h = [...document.querySelectorAll('h3')].find(x => x.innerText.includes('ข้อมูลเชิงลึกด้านราคา')); let n = h; for (let i = 0; i < 4; i++) n = n.parentElement; return n.innerText; });
log('insights expanded text:', txt.replace(/\n/g, ' / ').slice(0, 1500));
const y = await snap(page, '11-insights-expanded', '[role=main]');
const i0 = y.indexOf('ข้อมูลเชิงลึกด้านราคา'); console.log(y.slice(i0, i0 + 3000));
// hover price history graph
const grp = page.locator('[role=main] svg, [role=main] canvas').filter({ visible: true });
log('svg/canvas visible count', await grp.count());
// collapse: button name after expand?
log('buttons near insights', JSON.stringify(await page.getByRole('button', { name: /ประวัติราคา/ }).evaluateAll(e => e.map(x => x.getAttribute('aria-label') + '|exp=' + x.getAttribute('aria-expanded')))));

// ---- date grid
const ddump = async (name) => { const d = page.getByRole('dialog').filter({ visible: true }).last(); const y = await d.ariaSnapshot(); fs.writeFileSync(`${BASE}/snapshots/${name}.yml`, `# captured ${new Date().toISOString()}\n` + y); return { d, y }; };
await page.getByRole('button', { name: 'ตารางวันที่' }).click(); await page.waitForTimeout(5000);
await shot(page, '11-date-grid');
let { d, y: gy } = await ddump('11-date-grid');
console.log('=== DATE GRID\n' + gy.slice(0, 5000));
log('date grid text', (await d.innerText()).replace(/\n/g, ' / ').slice(0, 1500));
await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
// ---- price graph
await page.getByRole('button', { name: 'กราฟราคา' }).click(); await page.waitForTimeout(5000);
await shot(page, '11-price-graph');
({ d, y: gy } = await ddump('11-price-graph'));
console.log('=== PRICE GRAPH\n' + gy.slice(0, 4000));
log('price graph text', (await d.innerText()).replace(/\n/g, ' / ').slice(0, 1500));
await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
// ---- track price toggle (no login!)
const sw = page.getByRole('switch', { name: /ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่/ });
log('track switch checked before', await sw.getAttribute('aria-checked'));
await sw.click(); await page.waitForTimeout(3000);
log('after click track: url', page.url().slice(0, 80), 'dialogs', await page.getByRole('dialog').filter({ visible: true }).count(), 'switch', await sw.getAttribute('aria-checked').catch(()=>'?'));
await shot(page, '11-track-price-click');
if (await page.getByRole('dialog').filter({ visible: true }).count()) { ({ d, y: gy } = await ddump('11-track-price-dialog')); console.log('=== TRACK\n' + gy.slice(0, 2000)); }
await page.keyboard.press('Escape');
await browser.close();

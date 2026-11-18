import fs from 'fs';
import { open, URL, consent, shot, log, waitResults, rows, BASE } from './lib.mjs';
const { browser, page } = await open();
await page.goto(URL); await consent(page); await waitResults(page);
const dlg = () => page.getByRole('dialog').filter({ visible: true }).last();
// info dialogs
const info = async (name, file) => { const b = page.getByRole('button', { name }).filter({ visible: true }).first(); await b.click(); await page.waitForTimeout(1500); const n = await page.getByRole('dialog').filter({ visible: true }).count(); let t = ''; if (n) { t = await dlg().ariaSnapshot(); fs.writeFileSync(`${BASE}/snapshots/${file}.yml`, t); await shot(page, file); } else { await shot(page, file); t = 'no dialog'; } log(`[info ${name}]`, t.replace(/\n/g, ' ').slice(0, 900)); await page.keyboard.press('Escape'); await page.waitForTimeout(1000); };
await info('ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ', '14-ranking-info');
await info('ค่าธรรมเนียมสัมภาระ', '14-bag-fees');
await info('ความช่วยเหลือสำหรับผู้โดยสาร', '14-passenger-assist');
await info(/^ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ/, '14-emission-info');
// expand all flights
await page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' }).click(); await page.waitForTimeout(6000);
const r = await rows(page);
const pick = { direct: r.findIndex(x => x.text.includes('บินตรง')), airportChange: r.findIndex(x => x.text.includes('มีการเปลี่ยนสนามบิน')), mixedCabin: r.findIndex(x => x.text.includes('ประหยัดพรีเมียม + ชั้นประหยัด')), stops2: r.findIndex(x => /แวะพัก 2 ครั้ง/.test(x.name)), operated: r.findIndex(x => x.name.includes('ดำเนินการโดย')) };
log('picked idx', JSON.stringify(pick));
for (const [k, i] of Object.entries(pick)) {
  if (i < 0) continue;
  const li = page.locator('li').filter({ has: page.locator(`[aria-label="${r[i].name.replace(/"/g, '\\"')}"]`) }).first();
  log(`[row ${k}] FULL NAME:`, r[i].name);
  await li.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).click(); await page.waitForTimeout(2500);
  await li.scrollIntoViewIfNeeded();
  const y = await li.ariaSnapshot(); fs.writeFileSync(`${BASE}/snapshots/14-row-${k}-expanded.yml`, `# captured ${new Date().toISOString()}\n` + y);
  await li.screenshot({ path: `${BASE}/shots/14-row-${k}-expanded.png` });
  log(`[row ${k}] expanded text:`, (await li.innerText()).replace(/\n/g, ' / ').slice(0, 1200));
  await li.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).click(); await page.waitForTimeout(1000);
}
await browser.close();

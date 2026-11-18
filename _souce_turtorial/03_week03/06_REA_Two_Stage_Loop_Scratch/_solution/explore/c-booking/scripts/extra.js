process.env.PLAYWRIGHT_BROWSERS_PATH='/ms-playwright';
const L = require('./lib'); const fs=require('fs');
const info=JSON.parse(fs.readFileSync('../out/direct.json')); const burl=info.steps.find(s=>s.k==='bookingUrl').v;
(async () => {
  const { browser, page } = await L.open();
  await page.goto(L.URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(6000);
  const h0 = await page.evaluate(()=>history.length); L.log('X hist at results', h0, page.url());
  const item = page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('link', { name: /เที่ยวบินตรงกับ ไทยเวียดเจ๊ทแอร์ .*เวลา 23:50/ }) }).first();
  // select by clicking the row directly (collapsed)
  await item.getByText('6 ชม. 5 นาที').first().click(); await page.waitForTimeout(6000);
  L.log('X collapsed-row click ->', page.url().slice(0,60), 'hist', await page.evaluate(()=>history.length));
  // 'ดูตัวเลือก' visibility
  const dt = page.getByText('ดูตัวเลือก', { exact: true });
  for (let i=0;i<await dt.count();i++) L.log('X ดูตัวเลือก visible?', await dt.nth(i).isVisible());
  // share button dialog
  await page.getByRole('button', { name: 'แชร์เที่ยวบินนี้' }).click(); await page.waitForTimeout(2000);
  const dlg = page.getByRole('dialog'); if (await dlg.count()) { L.log('X share dialog', (await dlg.first().innerText()).replace(/\n/g,' | ')); await L.snap(page,'direct-11-share-dialog',dlg.first()); await L.shot(page,'direct-11-share-dialog'); }
  await page.getByRole('dialog').getByRole('button',{name:'ปิด'}).click(); await page.waitForTimeout(1000);
  // เปลี่ยนเที่ยวบิน button
  await page.getByRole('main').getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first().click(); await page.waitForTimeout(1200);
  const ch = page.getByRole('main').getByRole('button', { name: /เปลี่ยนเที่ยวบิน/ });
  L.log('X เปลี่ยนเที่ยวบิน count', await ch.count(), await ch.first().getAttribute('aria-label').catch(()=>'')); 
  await ch.first().click(); await page.waitForTimeout(6000);
  L.log('X after เปลี่ยนเที่ยวบิน', page.url(), 'hist', await page.evaluate(()=>history.length));
  await L.shot(page,'direct-12-after-change-flight');
  await page.goBack(); await page.waitForTimeout(5000); L.log('X goBack ->', page.url().slice(0,60));
  // in-page back + history length
  await page.getByRole('banner').getByRole('button', { name: 'ย้อนกลับ' }).click(); await page.waitForTimeout(6000);
  L.log('X after ย้อนกลับ', page.url().slice(0,60), 'hist', await page.evaluate(()=>history.length));
  // passenger change on booking page: open only, record, escape
  await page.goto(burl); await page.waitForTimeout(6000);
  await page.getByRole('main').getByRole('button', { name: /ผู้โดยสาร 1 คน/ }).click(); await page.waitForTimeout(1500);
  const d2 = page.getByRole('dialog'); L.log('X pax dialogs', await d2.count()); await L.shot(page,'direct-13-pax'); if (await d2.count()) { L.log('X pax dialog', (await d2.first().innerText()).replace(/\n/g,' | ')); await L.snap(page,'direct-13-pax-dialog',d2.first()); await L.shot(page,'direct-13-pax-dialog'); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  // baggage fee button
  await page.getByRole('main').getByRole('button', { name: 'ค่าธรรมเนียมสัมภาระ' }).click().catch(()=>{}); await page.waitForTimeout(1500);
  const d3 = page.getByRole('dialog'); if (await d3.count()) { L.log('X baggage dialog', (await d3.first().innerText()).replace(/\n/g,' | ').slice(0,800)); await L.shot(page,'direct-14-baggage-dialog'); }
  // narrow viewport check for ดูตัวเลือก
  await page.keyboard.press('Escape'); await page.setViewportSize({width:600,height:900}); await page.waitForTimeout(1500);
  const dt2 = page.getByText('ดูตัวเลือก', { exact: true }); for (let i=0;i<await dt2.count();i++) L.log('X narrow ดูตัวเลือก visible?', await dt2.nth(i).isVisible());
  await L.shot(page,'direct-15-narrow-600', true);
  await browser.close();
})();

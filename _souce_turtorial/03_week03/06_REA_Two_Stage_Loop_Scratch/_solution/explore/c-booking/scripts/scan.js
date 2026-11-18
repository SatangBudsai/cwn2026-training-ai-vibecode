process.env.PLAYWRIGHT_BROWSERS_PATH='/ms-playwright';
const L = require('./lib'); const fs=require('fs');
(async () => {
  const { browser, page } = await L.open();
  await page.goto(L.URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  if (await L.captcha(page)) { await browser.close(); return; }
  const more = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' });
  if (await more.count()) { await more.click(); await page.waitForTimeout(5000); }
  const links = page.locator('main [role=listitem] a, main li [role=link]');
  const items = page.getByRole('main').getByRole('listitem');
  const n = await items.count(); L.log('items after more:', n);
  const out = [];
  for (let i=0;i<n;i++){
    const it = items.nth(i);
    const lab = await it.getByRole('link').first().getAttribute('aria-label').catch(()=>null);
    out.push({i, lab});
  }
  fs.writeFileSync('../out/scan-list.json', JSON.stringify(out,null,1));
  // expand all non-direct
  const res=[];
  for (let i=0;i<n;i++){
    const it = items.nth(i);
    const lab = out[i].lab||'';
    if (!lab || lab.includes('เที่ยวบินตรง')) continue;
    const btn = it.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ });
    if (!await btn.count()) continue;
    await btn.first().click(); await page.waitForTimeout(1500);
    const txt = await it.innerText();
    res.push({i, lab: lab.slice(0,120), txt});
    await btn.first().click().catch(()=>{}); await page.waitForTimeout(600);
  }
  fs.writeFileSync('../out/scan-expanded.json', JSON.stringify(res,null,1));
  for (const r of res) if (/เปลี่ยนสนามบิน|สนามบินอื่น|airport change/i.test(r.txt)) L.log('AIRPORT CHANGE at', r.i, r.lab);
  await browser.close();
})();

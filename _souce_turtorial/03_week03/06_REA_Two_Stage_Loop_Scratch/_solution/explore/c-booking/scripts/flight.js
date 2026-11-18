process.env.PLAYWRIGHT_BROWSERS_PATH='/ms-playwright';
const L = require('./lib'); const fs=require('fs');
const T = {
  direct: { re: /9\d{3} บาทไทย เดินทางด้วยเที่ยวบินตรงกับ ไทยเวียดเจ๊ทแอร์ .*เวลา 23:50/, alt: /เที่ยวบินตรง/ },
  stop1:  { re: /เดินทางด้วยเที่ยวบินแบบแวะพัก 1 ครั้งกับ ไทยไลอ้อนแอร์ ออกเดินทางจาก ท่าอากาศยานดอนเมือง เวลา 06:20/ },
  change: { re: /แวะพัก 1 ครั้งกับ เจเอแอล ออกเดินทางจาก ท่าอากาศยานสุวรรณภูมิ เวลา 01:00 .*นะริตะ เวลา 16:05.*เปลี่ยนจาก/ },
};
const key = process.argv[2]; const t = T[key]; const P = key;
const info = { key, steps: [] }; const step=(k,v)=>{info.steps.push({t:L.ts(),k,v}); L.log(P,k,typeof v==='string'?v.slice(0,200):JSON.stringify(v).slice(0,200));};
async function findItem(page){
  const items = page.getByRole('main').getByRole('listitem');
  const n = await items.count();
  for (let i=0;i<n;i++){ const lab = await items.nth(i).getByRole('link').first().getAttribute('aria-label',{timeout:1000}).catch(()=>null); if (lab && t.re.test(lab)) return {it: items.nth(i), lab, i}; }
  return null;
}
(async () => {
  const { browser, context, page } = await L.open();
  await page.goto(L.URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000);
  if (await L.captcha(page)) { await L.shot(page, `${P}-captcha`); await browser.close(); return; }
  step('resultsUrl', page.url());
  let f = await findItem(page);
  if (!f) { await page.getByRole('button',{name:'ดูเที่ยวบินเพิ่มเติม'}).click(); await page.waitForTimeout(5000); step('clicked','ดูเที่ยวบินเพิ่มเติม'); f = await findItem(page); }
  if (!f) { step('notfound', String(t.re)); await browser.close(); fs.writeFileSync(`../out/${P}.json`, JSON.stringify(info,null,1)); return; }
  step('itemIndex', f.i); step('label', f.lab);
  await f.it.scrollIntoViewIfNeeded(); await L.shot(page, `${P}-1-collapsed`);
  const det = f.it.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first();
  await det.click(); await page.waitForTimeout(2000);
  step('expandedBtnLabel', await f.it.getByRole('button').filter({hasText:''}).last().getAttribute('aria-label').catch(()=>''));
  await f.it.scrollIntoViewIfNeeded();
  await f.it.screenshot({ path: `../shots/${P}-2-expanded.png` });
  await L.snap(page, `${P}-2-expanded`, f.it);
  step('expandedText', await f.it.innerText());
  // select
  const before = page.url();
  // in expanded state, look for select button
  const sel = f.it.getByRole('button', { name: /^เลือก/ });
  step('selectButtonsInExpanded', await sel.count());
  if (await sel.count()) { step('selectBtnText', await sel.first().innerText().catch(()=>'')); await sel.first().click(); }
  else await f.it.getByRole('link').first().click();
  await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(7000);
  if (await L.captcha(page)) { await L.shot(page, `${P}-captcha`); await browser.close(); return; }
  step('bookingUrl', page.url()); step('urlChanged', page.url()!==before);
  await L.shot(page, `${P}-3-booking`); await L.shot(page, `${P}-3-booking-full`, true);
  await L.snap(page, `${P}-3-booking`);
  step('bookingText', await page.getByRole('main').innerText().catch(()=>page.locator('body').innerText()));
  fs.writeFileSync(`../out/${P}.json`, JSON.stringify(info,null,1));
  fs.writeFileSync(`../out/${P}-booking.html`, await page.content());
  const bookingUrl = page.url();
  // sellers
  const conts = page.getByRole('main').getByRole('button', { name: /^ดำเนินการต่อ/ });
  const sellers = []; for (let i=0;i<await conts.count();i++) sellers.push(await conts.nth(i).getAttribute('aria-label'));
  step('sellers', sellers); step('sellerCount', sellers.length);
  // more-options buttons (expand hidden sellers?)
  const moreBtns = page.getByRole('main').getByRole('button', { name: /ตัวเลือกการจองเพิ่มเติม|ดูตัวเลือก|เพิ่มเติม/ });
  const mb=[]; for (let i=0;i<await moreBtns.count();i++) mb.push(await moreBtns.nth(i).getAttribute('aria-label')||await moreBtns.nth(i).innerText()); step('moreButtons', mb);
  // info tooltips (non-navigating)
  for (const nm of ['ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกการจอง','ข้อมูลเพิ่มเติมเกี่ยวกับค่าอำนวยความสะดวก']) {
    const b = page.getByRole('main').getByRole('button', { name: nm }).first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(1500);
      const dlg = page.getByRole('dialog').or(page.getByRole('tooltip'));
      const txt = (await dlg.count()) ? await dlg.first().innerText().catch(()=>'') : '';
      step('tooltip:'+nm, txt); await L.shot(page, `${P}-4-tip-${nm.slice(-12)}`);
      if (await dlg.count()) await L.snap(page, `${P}-4-tip-${nm.slice(-12)}`, dlg.first());
      await page.keyboard.press('Escape'); await page.waitForTimeout(800); }
  }
  // expand details on booking page
  const bd = page.getByRole('main').getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first();
  if (await bd.count()) { await bd.click(); await page.waitForTimeout(1500); await L.shot(page, `${P}-5-booking-details-expanded`, true); await L.snap(page, `${P}-5-booking-details-expanded`, page.getByRole('main'));
    step('bookingDetailsText', await page.getByRole('main').getByRole('list').first().innerText().catch(()=>'')); }
  // in-page back button
  await page.getByRole('banner').getByRole('button', { name: 'ย้อนกลับ' }).click();
  await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(6000);
  step('afterInPageBackUrl', page.url());
  await L.shot(page, `${P}-6-after-back`); await L.snap(page, `${P}-6-after-back`);
  const items2 = page.getByRole('main').getByRole('listitem'); step('itemsAfterBack', await items2.count());
  step('scrollYAfterBack', await page.evaluate(()=>window.scrollY));
  step('moreBtnVisibleAfterBack', await page.getByRole('button',{name:'ดูเที่ยวบินเพิ่มเติม'}).count());
  const exp = page.getByRole('main').getByRole('button', { name: /^เลือกเที่ยวบิน/ }); step('expandedSelectBtnsAfterBack', await exp.count());
  step('resultCountText', await page.getByText(/มีผลลัพธ์ \d+ รายการ/).first().innerText().catch(()=>''));
  // browser forward then browser back
  await page.goForward(); await page.waitForTimeout(5000); step('afterForwardUrl', page.url()); await L.shot(page, `${P}-7-after-forward`);
  await page.goBack(); await page.waitForTimeout(5000); step('afterBrowserBackUrl', page.url()); await L.shot(page, `${P}-8-after-browser-back`);
  // deep link in fresh context
  const c2 = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  const p2 = await c2.newPage(); await p2.goto(bookingUrl, { waitUntil: 'domcontentloaded' }); await p2.waitForTimeout(7000);
  step('deepLinkUrl', p2.url()); await L.shot(p2, `${P}-9-deeplink`);
  step('deepLinkHasBooking', await p2.getByRole('heading', { name: 'ตัวเลือกการจอง' }).count());
  // back button on deep-linked page (no history)
  await p2.getByRole('banner').getByRole('button', { name: 'ย้อนกลับ' }).click().catch(e=>step('deepBackErr', e.message));
  await p2.waitForTimeout(6000); step('deepLinkAfterBackUrl', p2.url()); await L.shot(p2, `${P}-10-deeplink-after-back`);
  fs.writeFileSync(`../out/${P}.json`, JSON.stringify(info,null,1));
  await browser.close();
})();

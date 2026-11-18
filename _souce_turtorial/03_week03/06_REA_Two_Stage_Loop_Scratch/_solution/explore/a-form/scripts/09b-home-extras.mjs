import { open, home, shot, snap, log } from './lib.mjs';
const { browser, page } = await open();
try {
  await home(page);
  log('h2s:', JSON.stringify(await page.getByRole('heading', { level: 2 }).allInnerTexts()));
  // FAQ expand first
  const faq = page.getByRole('group', { name: 'คำถามที่พบบ่อย' }).getByRole('button').first();
  await faq.scrollIntoViewIfNeeded(); await faq.click(); await page.waitForTimeout(800);
  log('FAQ expanded aria:', await faq.getAttribute('aria-expanded'));
  const g = page.getByRole('group', { name: 'คำถามที่พบบ่อย' });
  await shot(page, '45-faq-expanded'); await snap(page, '45-faq-expanded', g);
  log('FAQ text:', (await g.innerText()).replace(/\s+/g, ' ').slice(0, 700));
  // deals tabs (cards change?) at time
  const tabs = page.getByRole('tab', { name: 'เทศบาลนครภูเก็ต' }).first();
  log('deal tabs:', JSON.stringify(await page.getByRole('main').getByRole('tablist').first().getByRole('tab').allInnerTexts()));
  await tabs.scrollIntoViewIfNeeded(); await tabs.click(); await page.waitForTimeout(2500);
  const cards = await page.getByRole('main').getByRole('listitem').getByRole('button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label')).filter(Boolean));
  log('deals tab ภูเก็ต cards:', JSON.stringify(cards));
  await shot(page, '46-deals-phuket-tab');
  // info button of deals section
  await page.getByRole('button', { name: 'ดูข้อมูลเพิ่มเติมเกี่ยวกับส่วนนี้' }).click(); await page.waitForTimeout(800);
  log('deals info popup:', (await page.locator('[role=dialog],[role=tooltip]').filter({ visible: true }).allInnerTexts()).join(' | ').replace(/\s+/g, ' '));
  await shot(page, '47-deals-info');
  await page.keyboard.press('Escape');
  // tabs: popular routes
  for (const t of ['เที่ยวบินระหว่างประเทศจากไทย', 'เที่ยวบินภายในประเทศในไทย']) {
    await page.getByRole('tab', { name: t }).click(); await page.waitForTimeout(600);
    const links = await page.getByRole('tabpanel', { name: t }).getByRole('link').allInnerTexts();
    log('tab', t, '->', JSON.stringify(links));
  }
  // full page text dump for reference
  await shot(page, '48-home-bottom', { fullPage: true });
} catch (e) { console.error('ERR', e.message); await shot(page, 'err-09'); }
finally { await browser.close(); }

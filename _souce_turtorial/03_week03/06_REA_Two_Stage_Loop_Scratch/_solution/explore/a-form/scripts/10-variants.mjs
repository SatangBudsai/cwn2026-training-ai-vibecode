import { open, home, shot, snap, log } from './lib.mjs';
const res = [];
for (let i = 0; i < 4; i++) {
  const { browser, page } = await open();
  try {
    await home(page); await page.waitForTimeout(1500);
    const h2 = await page.getByRole('heading', { level: 2 }).allInnerTexts();
    const v = h2.some(h => h.includes('จุดหมายยอดนิยม')) ? 'V1-cards' : 'V2-map';
    log('load', i, v, JSON.stringify(h2));
    res.push(v);
    if (v === 'V2-map' && !res.slice(0, -1).includes('V2-map')) {
      await shot(page, '49-home-variant2-full', { fullPage: true });
      await snap(page, '49-home-variant2', page.getByRole('main'));
      // map section interaction info
      const sec = page.getByRole('heading', { name: /ค้นหาเที่ยวบินราคาถูกไปยังที่ใดก็ได้/ });
      log('V2 map section buttons:', JSON.stringify(await page.getByRole('main').getByRole('button').allInnerTexts()));
    }
  } catch (e) { console.error('ERR', e.message); } finally { await browser.close(); }
}
log('variants', res.join(','));

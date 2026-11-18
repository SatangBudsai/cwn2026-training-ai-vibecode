// B08: ทดสอบ end-to-end ผ่าน file:// ด้วย Playwright headless
// รัน: node test-e2e.js   (ผลลัพธ์ JSON + screenshot.png)
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) {
  pw = require('/usr/lib/node_modules/@playwright/mcp/node_modules/playwright');
}

(async () => {
  const url = 'file://' + path.join(__dirname, 'index.html');
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));

  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass: !!pass, detail });

  await page.goto(url);
  await page.evaluate(() => localStorage.removeItem('meow-cart'));
  await page.reload();
  await page.waitForSelector('.product-card');

  // 1) สโลแกน
  const slogan = (await page.textContent('#slogan')).trim();
  const expected = require('fs').readFileSync(path.join(__dirname, 'slogan.txt'), 'utf8').trim();
  check('สโลแกนจาก slogan.txt อยู่ใน header', slogan === expected &&
    await page.locator('header #slogan').count() === 1, slogan);

  // 2) สินค้า 6 ใบพร้อมรูป (โหลด products.png สำเร็จ + มี background-image ทุกใบ)
  const cards = await page.locator('.product-card').count();
  const imgInfo = await page.evaluate(async () => {
    const sprites = [...document.querySelectorAll('.product-card .sprite')];
    const urls = sprites.map(s => getComputedStyle(s).backgroundImage);
    const ok = await new Promise(res => {
      const im = new Image();
      im.onload = () => res(im.naturalWidth + 'x' + im.naturalHeight);
      im.onerror = () => res(null);
      im.src = 'products.png';
    });
    const sizes = sprites.map(s => s.getBoundingClientRect()).map(r => Math.round(r.width) + 'x' + Math.round(r.height));
    return { count: sprites.length, allHaveUrl: urls.every(u => u.includes('products.png')), loaded: ok, sizes,
      positions: sprites.map(s => getComputedStyle(s).backgroundPosition) };
  });
  check('เห็นสินค้า 6 ใบ', cards === 6, cards + ' ใบ');
  check('ทุกใบมีรูป (products.png โหลดได้ + sprite แสดง)',
    imgInfo.count === 6 && imgInfo.allHaveUrl && imgInfo.loaded && imgInfo.sizes.every(s => !s.startsWith('0')),
    JSON.stringify(imgInfo));

  // 3) กดใส่ตะกร้า 2 รายการ
  await page.locator('.product-card[data-product-id="1"] .add-to-cart').click();
  await page.locator('.product-card[data-product-id="3"] .add-to-cart').click();
  const before = await page.$$eval('#cart .cart-item', els => els.map(e => e.textContent));
  const stored = await page.evaluate(() => localStorage.getItem('meow-cart'));
  check('กดใส่ตะกร้า 2 รายการ → ตะกร้าแสดง 2 รายการ', before.length === 2, before.join(' | ') + ' · localStorage=' + stored);

  // 4) รีเฟรชแล้วตะกร้ายังอยู่
  await page.reload();
  await page.waitForSelector('#cart .cart-item');
  const after = await page.$$eval('#cart .cart-item', els => els.map(e => e.textContent));
  const total = await page.textContent('#cart .cart-total');
  check('รีเฟรชแล้วตะกร้ายังอยู่', after.length === 2 && JSON.stringify(after) === JSON.stringify(before),
    after.join(' | ') + ' · ' + total);

  await page.screenshot({ path: path.join(__dirname, 'screenshot.png'), fullPage: true });

  // 5) ไม่มี console error
  check('ไม่มี console error', errors.length === 0, errors.length ? errors.join('; ') : 'ไม่มี');

  await browser.close();
  console.log(JSON.stringify({ url, results }, null, 2));
  process.exit(results.every(r => r.pass) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });

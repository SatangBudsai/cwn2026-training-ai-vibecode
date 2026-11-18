// visual diff: ถ่ายหน้าจอ v1 แบบเดียวกับ visual/compare.cjs (ส่วน v1: เปิดหน้าแรก ไม่กรอกฟอร์ม)
// แล้วเทียบกับ visual/reference.png ด้วย pixelmatch threshold 0.1, includeAA:false
// node runner/visual-v1.cjs <out-dir> [BASE_URL]
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(path.resolve(process.argv[2] || path.join(ROOT, 'results')), 'visual');
const BASE = process.argv[3] || 'http://localhost:5081';
(async () => {
  const pixelmatch = (await import('pixelmatch')).default;
  fs.mkdirSync(OUT, { recursive: true });
  const ref = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'visual', 'reference.png')));
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: ref.width, height: ref.height }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'v1.png') });
  fs.writeFileSync(path.join(OUT, 'v1.txt'), await page.locator('body').ariaSnapshot());
  const actual = PNG.sync.read(fs.readFileSync(path.join(OUT, 'v1.png')));
  const diff = new PNG({ width: ref.width, height: ref.height });
  const pixels = pixelmatch(ref.data, actual.data, diff.data, ref.width, ref.height, { threshold: 0.1, includeAA: false });
  fs.writeFileSync(path.join(OUT, 'v1-diff.png'), PNG.sync.write(diff));
  await browser.close();
  const res = { version: 'v1', url: BASE, viewport: { width: ref.width, height: ref.height }, threshold: 0.1, includeAA: false, pixels, totalPixels: ref.width * ref.height, percent: (pixels / (ref.width * ref.height)) * 100 };
  fs.writeFileSync(path.join(OUT, '..', 'visual.json'), JSON.stringify(res, null, 2));
  console.log(`VISUAL ${res.percent.toFixed(2)}% (${pixels}/${res.totalPixels} px)`);
})().catch((e) => { console.error(e); process.exit(2); });

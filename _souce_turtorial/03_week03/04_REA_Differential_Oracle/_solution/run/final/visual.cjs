// visual diff แบบเดียวกับ LAB 3 (/workspace/rea-flight-v3/results/visual/compare.cjs) แต่เลือกเวอร์ชัน/พอร์ตได้
// node final/visual.cjs v4=5084 [outdir]   → <outdir>/<v>.png, <v>-diff.png, metrics-<v>.json
const V3 = '/workspace/rea-flight-v3/results/visual';
const req = require('module').createRequire(V3 + '/compare.cjs');
const { chromium } = req('playwright');
const { setup } = req('../v2/suite.cjs');
const { PNG } = req('pngjs');
const fs = require('fs'), path = require('path');
(async () => {
  const pixelmatch = (await import(req.resolve('pixelmatch'))).default;
  const [spec, outArg] = process.argv.slice(2);
  const [v, port] = (spec || 'v4=5084').split('=');
  const out = path.resolve(outArg || path.join(__dirname, 'visual')); fs.mkdirSync(out, { recursive: true });
  const ref = PNG.sync.read(fs.readFileSync(path.join(V3, 'reference.png')));
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: `http://localhost:${port}`, viewport: { width: ref.width, height: ref.height }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  await page.goto(`http://localhost:${port}`);
  await setup(page, 'results');
  await page.getByRole('combobox', { name: 'เปลี่ยนประเภทตั๋ว' }).selectOption({ label: '→ เที่ยวเดียว' });
  await page.getByRole('button', { name: /ค้นหาเที่ยวบิน/ }).click();
  await page.getByRole('tab', { name: /ดีที่สุด/ }).waitFor();
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, v + '.png') });
  const actual = PNG.sync.read(fs.readFileSync(path.join(out, v + '.png')));
  const diff = new PNG({ width: ref.width, height: ref.height });
  const pixels = pixelmatch(ref.data, actual.data, diff.data, ref.width, ref.height, { threshold: 0.1, includeAA: false });
  fs.writeFileSync(path.join(out, v + '-diff.png'), PNG.sync.write(diff));
  const initial = await page.getByRole('link', { name: /^เที่ยวบิน .*ราคา/ }).count();
  await page.getByRole('button', { name: /^ดูเที่ยวบินเพิ่มเติม/ }).click();
  await page.waitForTimeout(1500);
  const total = await page.getByRole('link', { name: /^เที่ยวบิน .*ราคา/ }).count();
  const r = { version: v, port: Number(port), pixels, totalPixels: ref.width * ref.height, percent: +(pixels / (ref.width * ref.height) * 100).toFixed(2), initial, total };
  fs.writeFileSync(path.join(out, `metrics-${v}.json`), JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(2); });

// visual diff: ขั้นตอนเดียวกับ src/visual/visual-ch4.cjs — goto → setup(page,'results') → เลือก "→ เที่ยวเดียว" → ค้นหา
// → รอแท็บ "ดีที่สุด" → fonts.ready → 1000 ms → screenshot 1366×900 → pixelmatch threshold 0.1, includeAA false กับ reference.png
// เพิ่ม: สัดส่วนพิกเซลแดงในแต่ละแถบความสูง 75 px (แดง = พิกเซลที่นับเป็นต่าง; เหลือง = AA ไม่นับ)
// node --import ./hooks.mjs visual.mjs <BASE_URL> <out>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngjs from 'pngjs';
import pixelmatch from 'pixelmatch';
import { launch, newPage, openResults } from './common.mjs';
const { PNG } = pngjs;

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const [BASE, outArg] = process.argv.slice(2);
const OUT = path.join(path.resolve(outArg), 'visual');
fs.mkdirSync(OUT, { recursive: true });
const ref = PNG.sync.read(fs.readFileSync(path.join(SRC, 'visual', 'reference.png')));
const W = ref.width, H = ref.height, BAND = 75;

const browser = await launch();
const { context, page } = await newPage(browser, BASE, { viewport: { width: W, height: H } });
await page.goto(BASE);
await openResults(page);
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(OUT, 'app.png') });
const url = page.url();
await context.close(); await browser.close();

const actual = PNG.sync.read(fs.readFileSync(path.join(OUT, 'app.png')));
const diff = new PNG({ width: W, height: H });
const pixels = pixelmatch(ref.data, actual.data, diff.data, W, H, { threshold: 0.1, includeAA: false });
fs.writeFileSync(path.join(OUT, 'diff.png'), PNG.sync.write(diff));

// pixelmatch ระบายพิกเซลที่ต่างเป็น diffColor [255,0,0] · AA เป็น [255,255,0] · ที่เหลือเป็นภาพเทาจาง (r=g=b)
const bands = [];
let red = 0;
for (let y0 = 0; y0 < H; y0 += BAND) {
  const y1 = Math.min(H, y0 + BAND); let n = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) n++; }
  red += n;
  bands.push({ y0, y1, redPixels: n, pixels: (y1 - y0) * W, redPct: +((n / ((y1 - y0) * W)) * 100).toFixed(2), shareOfDiffPct: 0 });
}
for (const b of bands) b.shareOfDiffPct = red ? +((b.redPixels / red) * 100).toFixed(1) : 0;
const res = { url, viewport: { width: W, height: H }, threshold: 0.1, includeAA: false, pixels, totalPixels: W * H,
  percent: (pixels / (W * H)) * 100, percentRounded: +((pixels / (W * H)) * 100).toFixed(2), redPixelsCounted: red,
  screenshot: 'visual/app.png', diffImage: 'visual/diff.png', reference: 'kit/src/visual/reference.png', bandHeight: BAND, bands };
fs.writeFileSync(path.join(OUT, '..', 'visual.json'), JSON.stringify(res, null, 2));
const worst = [...bands].sort((a, b) => b.redPixels - a.redPixels).slice(0, 3).map((b) => `${b.y0}-${b.y1}px ${b.redPct}%`).join(' · ');
console.log(`  แถบที่แดงมากสุด: ${worst}`);
console.log(`VISUAL ${res.percent.toFixed(2)}% (${pixels}/${W * H} px)`);

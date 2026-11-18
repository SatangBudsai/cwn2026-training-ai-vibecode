// node visual/diff.mjs <png ของแอป> [reference.png] [diff-out.png]
// → { diffPct, pixels } · pixelmatch threshold 0.1 · includeAA false · ภาพต้อง 1366×900
// ระดับสัญญาณรบกวนของต้นฉบับเอง (3 รอบ) อยู่ใน visual/noise.json
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const D = new URL('.', import.meta.url).pathname;
const [app, ref = D + 'reference.png', out] = process.argv.slice(2);
if (!app) { console.error('ใช้: node visual/diff.mjs <png ของแอป> [reference.png] [diff-out.png]'); process.exit(2); }
const A = PNG.sync.read(fs.readFileSync(app)), R = PNG.sync.read(fs.readFileSync(ref));
const { width, height } = R;
let a = A;
if (A.width !== width || A.height !== height) {
  // ขนาดไม่ตรง: วางภาพแอปบนพื้นขาวขนาดเท่าต้นฉบับ (ส่วนที่ขาด/เกินนับเป็นความต่าง)
  a = new PNG({ width, height }); a.data.fill(255);
  PNG.bitblt(A, a, 0, 0, Math.min(A.width, width), Math.min(A.height, height), 0, 0);
  console.error(`เตือน: ขนาดภาพแอป ${A.width}×${A.height} ≠ ${width}×${height}`);
}
const diff = out ? new PNG({ width, height }) : null;
const pixels = pixelmatch(R.data, a.data, diff?.data ?? null, width, height, { threshold: 0.1, includeAA: false });
if (out) fs.writeFileSync(out, PNG.sync.write(diff));
const noise = fs.existsSync(D + 'noise.json') ? JSON.parse(fs.readFileSync(D + 'noise.json', 'utf8')).noiseFloorPct : null;
console.log(JSON.stringify({ diffPct: +(100 * pixels / (width * height)).toFixed(4), pixels, size: `${A.width}x${A.height}`, noiseFloorPct: noise }, null, 2));

// node sheet.mjs out.jpg cols thumbW file1 file2 ...  (contact sheet + ชื่อไฟล์)
import sharp from 'sharp';
import { basename } from 'node:path';
const [, , out, colsS, wS, ...files] = process.argv;
const cols = +colsS, w = +wS, h = Math.round(w * 0.72), lab = 22;
const rows = Math.ceil(files.length / cols);
const comps = [];
for (let i = 0; i < files.length; i++) {
  const x = (i % cols) * w, y = Math.floor(i / cols) * (h + lab);
  const img = await sharp(files[i]).resize(w, h, { fit: 'cover', position: 'top' }).jpeg({ quality: 78 }).toBuffer();
  comps.push({ input: img, left: x, top: y });
  const svg = `<svg width="${w}" height="${lab}"><rect width="100%" height="100%" fill="#111"/><text x="4" y="16" font-size="14" fill="#fff" font-family="Consolas">${basename(files[i]).replace(/\.[a-z]+$/, '').slice(0, Math.floor(w / 8))}</text></svg>`;
  comps.push({ input: Buffer.from(svg), left: x, top: y + h });
}
await sharp({ create: { width: cols * w, height: rows * (h + lab), channels: 3, background: '#222' } }).composite(comps).jpeg({ quality: 80 }).toFile(out);

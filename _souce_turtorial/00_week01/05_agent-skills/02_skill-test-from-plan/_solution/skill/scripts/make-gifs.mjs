#!/usr/bin/env node
// แปลงวิดีโอ .webm ของแต่ละ test (จาก test-report/results.json) เป็น GIF ชื่อตามรหัส test case
// ใช้: node make-gifs.mjs [--only ID1,ID2] [--min 5]   (รันใน e2e/)
// ผล: test-report/gifs/<ID>.gif + test-report/gifs.json (ความยาว/ขนาด)
// exit 2 = มี GIF สั้นกว่า --min วินาที → อัดข้อนั้นใหม่ให้ช้าลงและค้างหน้าผลลัพธ์ (ห้ามยืดด้วย ffmpeg)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadPlan, loadResults, gifSeconds, arg } from './_lib.mjs';

const plan = loadPlan();
const { byId } = loadResults(plan);
const only = arg('--only') ? new Set(arg('--only').split(',')) : null;
const MIN = Number(arg('--min', 5));
const outDir = 'test-report/gifs';
fs.mkdirSync(outDir, { recursive: true });
const metaFile = 'test-report/gifs.json';
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
const short = [], missing = [];

for (const c of plan.cases) {
  if (only && !only.has(c.id)) continue;
  const r = byId.get(c.id);
  if (!r?.video || !fs.existsSync(r.video)) { missing.push(c.id); continue; }
  const out = path.join(outDir, `${c.id}.gif`);
  // fps 8 · กว้าง 720 · palette 128 สี → อ่านตัวอักษรได้ ไฟล์ราว 1–2 MB
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', r.video, '-vf',
    'fps=8,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', out]);
  const sec = gifSeconds(out);
  meta[c.id] = { seconds: +sec.toFixed(1), kb: Math.round(fs.statSync(out).size / 1024), status: r.status };
  if (sec < MIN) short.push(c.id);
  console.log(`${c.id}\t${r.status}\t${sec.toFixed(1)}s\t${meta[c.id].kb}KB${sec < MIN ? `\t<-- สั้นกว่า ${MIN} วินาที` : ''}`);
}
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
if (missing.length) console.log(`\n⚠️ ไม่มีวิดีโอ: ${missing.join(', ')} (ยังไม่ได้รัน หรือชื่อ test ไม่มีรหัส)`);
console.log(short.length ? `\n⚠️ สั้นกว่า ${MIN} วินาที: ${short.join(', ')}` : `\n✅ ทุก GIF ยาว ≥ ${MIN} วินาที`);
process.exit(short.length ? 2 : 0);

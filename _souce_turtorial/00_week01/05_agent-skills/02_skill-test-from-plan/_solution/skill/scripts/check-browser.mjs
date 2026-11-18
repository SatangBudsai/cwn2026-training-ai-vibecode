#!/usr/bin/env node
// ตรวจว่า Playwright ใน e2e ใช้ Chromium ที่มีในเครื่องอยู่แล้ว (ไม่โหลดใหม่) และมี ffmpeg/ffprobe สำหรับทำ GIF
// ใช้: node check-browser.mjs   (รันใน e2e/)   exit 1 = ต้องถามผู้ใช้ก่อน ห้ามโหลดเบราว์เซอร์เอง
import fs from 'node:fs';
import { execSync } from 'node:child_process';

let bad = 0;
const sh = c => { try { return execSync(c, { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); } catch (e) { return (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? ''); } };

const ver = sh('npx playwright --version').match(/Version\s+([\d.]+)/)?.[1];
console.log(`Playwright: ${ver ?? '❌ ไม่พบ (รัน scaffold-e2e.mjs ก่อน)'}`);
if (!ver) bad++;

const dry = sh('npx playwright install --dry-run chromium');
const blocks = dry.split(/\r?\n\r?\n/);
for (const b of blocks) {
  const name = b.split(/\r?\n/)[0]?.trim();
  const loc = b.match(/Install location:\s*(.+)/)?.[1]?.trim();
  if (!name || !loc) continue;
  const ok = fs.existsSync(loc);
  if (!ok && /chrom/i.test(name)) bad++;
  console.log(`${ok ? '✅' : '❌'} ${name}\n   ${loc}`);
}
if (bad) {
  const root = blocks.map(b => b.match(/Install location:\s*(.+)[\\/][^\\/]+$/m)?.[1]).find(Boolean);
  if (root && fs.existsSync(root)) console.log(`\nที่มีในเครื่อง (${root}): ${fs.readdirSync(root).join(', ')}`);
  console.log('\n⚠️ Chromium รุ่นที่ Playwright รุ่นนี้ต้องการยังไม่มีในเครื่อง — ห้ามโหลดเอง ให้บอกผู้ใช้ 2 ทาง:');
  console.log('   1) ติดตั้ง @playwright/test รุ่นที่ตรงกับ chromium-XXXX ที่มีอยู่  2) อนุญาตให้ npx playwright install chromium');
}

for (const tool of ['ffmpeg', 'ffprobe']) {
  const out = sh(`${tool} -version`);
  const ok = /version/i.test(out);
  if (!ok) bad++;
  console.log(`${ok ? '✅' : '❌'} ${tool}${ok ? ' ' + out.split('\n')[0].split(' ').slice(2, 3).join('') : ' — ไม่พบ (ต้องมีเพื่อทำ GIF; บอกผู้ใช้ เช่น winget install Gyan.FFmpeg)'}`);
}
process.exit(bad ? 1 : 0);

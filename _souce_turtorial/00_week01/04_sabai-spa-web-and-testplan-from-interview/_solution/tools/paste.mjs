// สร้างภาพหน้าต่าง Claude Code ตอนวางพรอมต์ของแต่ละ LAB จากไฟล์พรอมต์จริง
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { CSS, esc } from './kit.mjs';
import { pathToFileURL } from 'node:url';
const OUT = process.env.OUT || 'C:/t/spa04/out/img';
const labs = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE });
mkdirSync('tmp', { recursive: true });
for (const n of labs) {
  const text = readFileSync(`C:/t/spa04/prompts/lab${n}.txt`, 'utf8').trim().split('\n');
  const first = text.slice(0, 5).map((l) => (l.length > 96 ? l.slice(0, 96) + '…' : l));
  const more = text.length - first.length;
  const html = `<!doctype html><meta charset="utf-8"><style>${CSS}html,body{width:1120px;height:430px;background:#17392b}</style>
  <div style="position:absolute;inset:18px;border-radius:14px;background:#1f1f1f;box-shadow:0 12px 34px rgba(0,0,0,.5);overflow:hidden;border:1px solid #444">
   <div style="height:38px;background:#2c2c2c;display:flex;align-items:center;padding:0 14px;gap:8px"><i style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></i><i style="width:12px;height:12px;border-radius:50%;background:#febc2e"></i><i style="width:12px;height:12px;border-radius:50%;background:#28c840"></i><span style="margin-left:12px;color:#ddd;font-size:15px">Claude Code · โฟลเดอร์ sabai · เซสชันใหม่</span><span style="margin-left:auto;background:#c9a24b;color:#17392b;font-weight:700;border-radius:8px;padding:1px 10px;font-size:15px">LAB ${n}</span></div>
   <div style="padding:16px 22px;color:#e8e8e8"><div style="color:#9bd0b1;font-size:16px;font-weight:600">วางพรอมต์นี้ แล้วกด Enter</div>
   <div style="margin-top:10px;border:1.5px solid #c9a24b;border-radius:10px;padding:12px 16px;background:#262626;font-size:19px;line-height:1.5">${first.map(esc).join('<br>')}${more > 0 ? `<div style="color:#e6c97a;font-weight:600;margin-top:6px">[Pasted text · อีก ${more} บรรทัด]</div>` : ''}</div>
   <div style="margin-top:12px;color:#aaa;font-size:15px">⏎ ส่ง · ถ้า Claude ขออนุญาตรันคำสั่ง ให้กด Yes</div></div></div>`;
  writeFileSync('tmp/paste.html', html);
  const pg = await b.newPage({ viewport: { width: 1120, height: 430 } });
  await pg.goto(pathToFileURL('tmp/paste.html').href);
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: `${OUT}/lab${n}-paste.png` });
  await pg.close();
}
await b.close();
console.log('ok', labs.length);

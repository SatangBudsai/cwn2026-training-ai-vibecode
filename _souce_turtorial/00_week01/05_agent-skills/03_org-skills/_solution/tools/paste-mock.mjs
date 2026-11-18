// ภาพจำลองหน้าต่าง Claude Code ตอน "วางพรอมต์" (โหมดขออนุญาตปกติ) · ข้อความพรอมต์อ่านจากไฟล์จริงใน _solution
// node paste-mock.mjs <out.png> <ชื่อแถบบน> <โฟลเดอร์ที่เปิด> <prompt.txt> <chromium.exe>
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const [,, out, title, folder, promptFile, exe] = process.argv;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = esc(readFileSync(promptFile, 'utf8').trimEnd()).replace(/\n/g, '<br>').replace(/(<br>)( +)/g, (m, br, sp) => br + '&nbsp;'.repeat(sp.length));
const html = `<html><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;font-family:'Leelawadee UI','Segoe UI',sans-serif;background:#f6f4ef;color:#1f2328}
.top{height:84px;background:#fff;display:flex;align-items:center;gap:34px;padding:0 40px;font-size:26px;color:#333}
.top .sp{flex:1}.top .fd{background:#ece8e1;border-radius:10px;padding:8px 14px;font-size:20px;display:flex;gap:8px;align-items:center}
.tag{margin:40px 74px 0;display:inline-block;background:#dbe7fb;color:#1d4ed8;font-weight:700;font-size:22px;padding:14px 32px;border-radius:30px}
.new{text-align:center;color:#888;font-size:16px;margin:30px 0 14px}
.hint{margin:0 74px;display:inline-block;background:#dc2626;color:#fff;font-weight:700;font-size:19px;padding:10px 26px;border-radius:24px}
.box{margin:14px 54px 34px 74px;border:3px solid #dc2626;border-radius:20px;padding:18px 18px 10px;background:#f6f4ef}
.in{background:#fff;border:1px solid #ddd;border-radius:14px;padding:20px 34px;font-size:17.5px;line-height:1.85}
.bar{display:flex;align-items:center;gap:26px;padding:16px 36px 6px;font-size:19px;color:#666}
.bar .sp{flex:1}.bar b{color:#111;font-size:20px}
</style></head><body>
<div class="top"><span>☰</span><span>▣</span><span>←</span><span style="color:#bbb">→</span><span class="sp"></span><span class="fd">📁 ${esc(folder)}</span><span>⋮</span><span>—</span><span>☐</span><span>✕</span></div>
<div class="tag">${esc(title)}</div>
<div class="new">เซสชันใหม่ (ยังไม่มีแชต)</div>
<div class="hint">👇 วางพรอมต์ตรงนี้ (Ctrl+V) แล้วกด Enter</div>
<div class="box"><div class="in">${text}</div>
<div class="bar"><span>+</span><span>Ask permissions</span><span class="sp"></span><b>Opus 5.5</b><b>⬆</b></div></div>
</body></html>`;
const b = await chromium.launch({ executablePath: exe });
const pg = await b.newPage({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 2 });
await pg.setContent(html); await pg.screenshot({ path: out, fullPage: true });
await b.close();

// node gshots.mjs <outdir> <w> <h> url=name[;full] ...   (ล็อกอินแอดมินด้วยค่าทดสอบใน .env.example ของแล็บ)
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
const [,, out, w, h, ...items] = process.argv; mkdirSync(out, { recursive: true });
const env = Object.fromEntries(readFileSync('C:/t/lab0rec/novatech/.env.example', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => l.trim().split('=')));
const b = await chromium.launch({ executablePath: 'C:/Users/oishi/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
const pg = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1.5, locale: 'th-TH' });
const U = 'http://localhost:3300';
for (const it of items) {
  const [url, rest] = it.split('='); const [name, full] = rest.split(';');
  if (url === 'LOGIN') { await pg.goto(U + '/user/login'); await pg.screenshot({ path: `${out}/${name}.png` });
    await pg.fill('#user_name', env.ADMIN_USER); await pg.fill('#password', env.ADMIN_PASSWORD);
    await pg.click('button.ui.primary.button'); await pg.waitForURL(u => !u.pathname.includes('login')); console.log(name); continue; }
  await pg.goto(U + url, { waitUntil: 'load' }); await pg.waitForTimeout(700);
  await pg.screenshot({ path: `${out}/${name}.png`, fullPage: !!full }); console.log(name);
}
await b.close();

// node peek.mjs <url> <out.png> [w h full]
import { chromium } from 'playwright-core';
const [, , url, out, w = 1440, h = 900, full = '0'] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE });
const pg = await b.newPage({ viewport: { width: +w, height: +h } });
await pg.goto(url, { waitUntil: 'load', timeout: 60000 });
await pg.waitForTimeout(2500);
if (full === '1') {
  const H = await pg.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 500) { await pg.evaluate((y) => window.scrollTo(0, y), y); await pg.waitForTimeout(250); }
  await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(800);
}
await pg.screenshot({ path: out, fullPage: full === '1' });
console.log(await pg.title(), await pg.evaluate(() => document.body.scrollHeight));
await b.close();

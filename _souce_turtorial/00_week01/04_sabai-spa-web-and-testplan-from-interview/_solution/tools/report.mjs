// ถ่ายรายงานจริงจาก file:// และทำ GIF เดินดูรายงาน
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [, , file, prefix = 'lab12', tc = 'TC-PRICE-05'] = process.argv;
const OUT = process.env.OUT || 'C:/t/spa04/out/img';
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
await pg.goto(pathToFileURL(file).href); await pg.waitForTimeout(1500);
await pg.screenshot({ path: `${OUT}/${prefix}-report.jpg`, type: 'jpeg', quality: 80 });
const tmp = 'tmp/rep-' + prefix; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
let k = 0; const FPS = 6;
const snap = async () => pg.screenshot({ path: join(tmp, `f${String(k++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 86 });
const hold = async (s) => { for (let i = 0; i < s * FPS; i++) { await snap(); await pg.waitForTimeout(30); } };
await hold(2.5);
for (let i = 0; i < 12; i++) { await pg.evaluate(() => window.scrollBy(0, 60)); await snap(); }
await hold(1.2);
const row = pg.locator(`tr:has-text("${tc}"), [data-id="${tc}"], summary:has-text("${tc}")`).first();
await row.scrollIntoViewIfNeeded().catch(() => {}); await pg.waitForTimeout(300); await hold(1.2);
await row.click({ timeout: 5000 }).catch((e) => console.log('click fail', e.message.slice(0, 80)));
await pg.waitForTimeout(800); await hold(1);
await pg.screenshot({ path: `${OUT}/${prefix}-report-detail.jpg`, type: 'jpeg', quality: 80 });
for (let i = 0; i < 14; i++) { await pg.evaluate(() => window.scrollBy(0, 50)); await snap(); }
await hold(2.5);
await pg.screenshot({ path: `${OUT}/${prefix}-report-detail2.jpg`, type: 'jpeg', quality: 80 });
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(tmp, 'f%04d.jpg'), '-vf', 'scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', `${OUT}/${prefix}-report-tour.gif`]);
console.log('frames', k, (k / FPS).toFixed(1) + 's');

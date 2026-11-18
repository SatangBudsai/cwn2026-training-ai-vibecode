// ถ่ายภาพเว็บจริง + GIF ทัวร์เว็บจริง (อ่านอย่างเดียว ไม่ reset ไม่จอง)
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const OUT = process.env.OUT || 'C:/t/spa04/out/img', B = 'http://localhost:3000';
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE });
const shots = [['site-home', '/th', 0], ['site-services', '/th/services', 0], ['site-therapists', '/th/therapists', 0], ['site-team', '/th/team', 0], ['site-gallery', '/th/gallery', 0], ['site-about', '/th/about', 0], ['site-reviews', '/th/reviews', 0], ['site-herbs', '/th/herbs', 0], ['site-booking', '/th/booking', 0], ['site-package', '/th/packages/bangkok-relax', 0], ['site-gift', '/th/gift-cards', 0], ['site-shuttle', '/th/shuttle', 0], ['site-mood', '/th/mood', 0], ['site-quiz', '/th/quiz', 0], ['site-skin', '/th/skin', 0], ['site-tour', '/th/tour', 0], ['site-zh', '/zh', 0], ['site-en', '/en/services', 0], ['site-register', '/th/register', 0]];
const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } });
const pg = await ctx.newPage();
for (const [n, u] of shots) {
  try { await pg.goto(B + u, { waitUntil: 'load', timeout: 30000 }); await pg.waitForTimeout(1800); await pg.mouse.wheel(0, 200); await pg.waitForTimeout(900); await pg.screenshot({ path: `${OUT}/${n}.jpg`, quality: 78, type: 'jpeg' }); console.log('ok', n); } catch (e) { console.log('ERR', n, e.message.slice(0, 80)); }
}
async function login(email, pw) {
  const c = await b.newContext({ viewport: { width: 1280, height: 760 } }); const p = await c.newPage();
  await p.goto(B + '/th/login'); await p.fill('[data-testid=login-email]', email); await p.fill('[data-testid=login-password]', pw); await p.click('[data-testid=login-submit]'); await p.waitForTimeout(2500); return [c, p];
}
const [c1, p1] = await login('nida@sabai.test', 'Nida#2026');
for (const [n, u] of [['site-account', '/th/account'], ['site-wallet', '/th/wallet'], ['site-history', '/th/account/history']]) { await p1.goto(B + u); await p1.waitForTimeout(1800); await p1.screenshot({ path: `${OUT}/${n}.jpg`, quality: 78, type: 'jpeg' }); console.log('ok', n); }
await c1.close();
const [c2, p2] = await login('owner@sabai.test', 'Owner#2026');
await p2.goto(B + '/th/admin'); await p2.waitForTimeout(1800); await p2.screenshot({ path: `${OUT}/site-admin.jpg`, quality: 78, type: 'jpeg' }); await c2.close();
const m = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await m.newPage(); await mp.goto(B + '/th'); await mp.waitForTimeout(2200); await mp.screenshot({ path: `${OUT}/site-mobile.jpg`, quality: 78, type: 'jpeg' }); await m.close();
// GIF ทัวร์จริง
const FPS = 8, tmp = 'tmp/tour'; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const c = await b.newContext({ viewport: { width: 1280, height: 720 } }); const t = await c.newPage(); let k = 0;
const snap = async () => { await t.screenshot({ path: join(tmp, `f${String(k++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 86 }); };
const hold = async (s) => { for (let i = 0; i < s * FPS; i++) { await snap(); await t.waitForTimeout(40); } };
const scroll = async (dist, s) => { const n = s * FPS; for (let i = 0; i < n; i++) { await t.evaluate((d) => window.scrollBy(0, d), dist / n); await t.waitForTimeout(30); await snap(); } };
await t.goto(B + '/th'); await t.waitForTimeout(1500); await hold(2.5); await scroll(1600, 3); await hold(.8); await scroll(2600, 3.5); await hold(.8); await scroll(2200, 2.5); await hold(.8);
await t.goto(B + '/th/therapists'); await t.waitForTimeout(1200); await hold(2); await scroll(500, 1); await hold(.8);
await t.goto(B + '/zh'); await t.waitForTimeout(1500); await hold(1.5);
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(tmp, 'f%04d.jpg'), '-vf', 'scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=200:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', `${OUT}/site-tour-real.gif`]);
console.log('frames', k, k / FPS, 's');

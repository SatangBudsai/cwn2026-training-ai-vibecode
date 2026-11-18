import { chromium } from 'playwright';
import fs from 'fs';
export const BASE = '/workspace/arena6/explore/b-results';
export const URL = 'https://www.google.com/travel/flights?q=Flights%20from%20Bangkok%20to%20Tokyo%20on%202026-11-15%20one%20way&hl=th&gl=TH&curr=THB';
export const ts = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
export async function open() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  const page = await ctx.newPage();
  return { browser, ctx, page };
}
export async function captcha(page) {
  const u = page.url();
  if (u.includes('/sorry/') || (await page.locator('iframe[src*="recaptcha"]').count())) { console.log('CAPTCHA DETECTED', u); return true; }
  return false;
}
export async function consent(page) {
  const b = page.getByRole('button', { name: /ยอมรับทั้งหมด|Accept all/ });
  if (await b.count()) { await b.first().click(); await page.waitForTimeout(2000); }
}
export async function shot(page, name, full = false) { await page.screenshot({ path: `${BASE}/shots/${name}.png`, fullPage: full }); }
export async function snap(page, name, sel = 'body') {
  const y = await page.locator(sel).first().ariaSnapshot();
  fs.writeFileSync(`${BASE}/snapshots/${name}.yml`, `# captured ${ts()} (Asia/Bangkok)\n# url: ${page.url()}\n` + y);
  return y;
}
export function log(...a) { const s = `[${ts()}] ` + a.join(' '); console.log(s); fs.appendFileSync(`${BASE}/logs/observations.log`, s + '\n'); }
export async function waitResults(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(6000);
}
// extract rows: each listitem in main lists that has a link
export async function rows(page) {
  return await page.evaluate(() => {
    const out = []; const seen = new Set();
    document.querySelectorAll('[role=link][aria-label^="ราคา"], a[aria-label^="ราคา"]').forEach(a => {
      const li = a.closest('li'); if (!li || seen.has(li)) return; seen.add(li);
      const r = li.getBoundingClientRect(); if (r.height === 0 || !li.offsetParent) return;
      out.push({ name: a.getAttribute('aria-label'), text: li.innerText.replace(/\n+/g, ' | ') });
    });
    return out;
  });
}
export function summarize(rs) {
  const s = { total: rs.length, direct: 0, stops1: 0, stops2: 0, stops3: 0, thaiAirways: 0, thaiAny: 0, minPrice: null, maxPrice: null };
  for (const r of rs) {
    if (r.name.includes('เที่ยวบินตรง')) s.direct++;
    if (/แวะพัก 1 ครั้ง/.test(r.name)) s.stops1++;
    if (/แวะพัก 2 ครั้ง/.test(r.name)) s.stops2++;
    if (/แวะพัก 3 ครั้ง/.test(r.name)) s.stops3++;
    if (/กับ การบินไทย( |$)/.test(r.name) || /กับ การบินไทย และ/.test(r.name)) s.thaiAirways++;
    if (r.name.includes('การบินไทย')) s.thaiAny++;
    const m = r.name.match(/ราคาเริ่มต้นที่ (\d+)/); if (m) { const p = +m[1]; s.minPrice = s.minPrice == null ? p : Math.min(s.minPrice, p); s.maxPrice = Math.max(s.maxPrice || 0, p); }
  }
  return s;
}
export async function clickMore(page) {
  let n = 0;
  while (true) {
    const b = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' });
    if (!(await b.count())) break;
    await b.first().click(); n++;
    await page.waitForTimeout(4000);
    if (n > 5) break;
  }
  return n;
}

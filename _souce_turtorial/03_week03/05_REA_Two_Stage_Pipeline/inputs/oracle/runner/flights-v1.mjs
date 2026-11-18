// เที่ยวบินทั้งหมดที่แอปแสดงได้: ไล่ทุกมุมมองที่ผู้ใช้กดไปถึงได้จากหน้าแรก (ลิงก์เรียง/ตัวกรองในหน้าเดียวกัน)
// แล้วนับใบเที่ยวบินไม่ซ้ำ (ลิงก์ "เลือก" แต่ละใบชี้ไปหน้าจองของเที่ยวบินนั้น) — กล่องดำ ใช้ role/ข้อความที่มองเห็น
// node runner/flights-v1.mjs <out-dir> [BASE_URL]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'results'));
const BASE = process.argv[3] || 'http://localhost:5081';
const origin = new URL(BASE).origin;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
const page = await context.newPage();
const seen = new Set(['/']), queue = ['/'], views = [], flights = new Map();
while (queue.length && views.length < 50) {
  const u = queue.shift();
  await page.goto(origin + u, { waitUntil: 'networkidle' });
  const main = page.getByRole('main');
  const cards = main.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'เลือก', exact: true }) });
  const rows = await cards.evaluateAll((els) => els.map((e) => ({ href: e.querySelector('a[href]:last-of-type')?.getAttribute('href'), text: e.innerText.replace(/\s+/g, ' ').trim() })));
  const sel = await main.getByRole('link', { name: 'เลือก', exact: true }).evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  const shown = ((await main.innerText()).match(/พบ (\d+) เที่ยวบิน|มีผลลัพธ์ (\d+) รายการ/) || []).slice(1).find(Boolean) ?? null;
  sel.forEach((h, i) => { if (!flights.has(h)) flights.set(h, rows[i]?.text ?? ''); });
  views.push({ url: u, cards: sel.length, shown: shown && Number(shown) });
  // ลิงก์ภายในหน้าแรก (เรียง/ตัวกรอง) ที่ยังไม่ได้เปิด — ไม่ตามหน้าจอง/ฟอร์ม
  const hrefs = await page.getByRole('link').evaluateAll((as) => as.map((a) => a.getAttribute('href')).filter(Boolean));
  for (const h of hrefs) {
    const url = new URL(h, origin);
    if (url.origin !== origin || url.pathname !== '/') continue;
    const key = url.pathname + url.search;
    if (!seen.has(key)) { seen.add(key); queue.push(key); }
  }
}
await browser.close();
const res = { baseURL: BASE, total: flights.size, views, flights: [...flights].map(([href, text]) => ({ href, text })) };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'flights.json'), JSON.stringify(res, null, 2));
console.log(`FLIGHTS ${res.total} ไม่ซ้ำ จาก ${views.length} มุมมอง: ${views.map((v) => `${v.url}=${v.cards}`).join(' ')}`);

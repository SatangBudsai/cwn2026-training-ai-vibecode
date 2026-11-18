// ตัวขับโคลน (v1/v2/v3) แบบกล่องดำ: ใช้เฉพาะ role/ชื่อ/ข้อความที่ผู้ใช้เห็น ไม่อ่านซอร์ส ไม่เรียก API ภายใน
// ถ้าหา control ของสถานการณ์ไม่เจอ → โยน Unsupported (รายงานเป็น "ไม่มีฟีเจอร์")
import { chromium } from 'playwright';
import fs from 'node:fs';

const CHROME = '/ms-playwright/chromium-1247/chrome-linux64/chrome';
export class Unsupported extends Error {}

const btn = (p, name) => p.getByRole('button', {
  name: typeof name === 'string' ? new RegExp('^[^\\p{L}\\p{N}]*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'u') : name,
});
const exists = async (l) => (await l.count()) > 0;
const need = async (l, what) => { if (!(await exists(l))) throw new Unsupported(`ไม่พบ ${what}`); return l.first(); };

// แถวเที่ยวบิน: ลิงก์ "เที่ยวบิน X ราคา ฿…" (v2/v3) หรือ listitem ที่มีลิงก์ "เลือก" (รายการธรรมดา)
const linkRows = (p) => p.getByRole('link', { name: /^เที่ยวบิน .*ราคา/ });
const itemRows = (p) => p.getByRole('main').getByRole('listitem').filter({ has: p.getByRole('link', { name: 'เลือก', exact: true }) });
export async function rowsLoc(p) { return (await exists(linkRows(p))) ? linkRows(p) : itemRows(p); }

export async function stableCount(p) {
  let last = -1, same = 0;
  for (let i = 0; i < 60 && same < 4; i++) {
    const n = await (await rowsLoc(p)).count();
    same = n === last ? same + 1 : 0;
    last = n;
    await p.waitForTimeout(200);
  }
  return last;
}

export async function launch(base, { video } = {}) {
  const browser = await chromium.launch({ executablePath: fs.existsSync(CHROME) ? CHROME : undefined });
  const context = await browser.newContext({
    baseURL: base, viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok',
    ...(video ? { recordVideo: { dir: video, size: { width: 1366, height: 900 } } } : {}),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  return { browser, context, page };
}

// เปิดผลค้นหา กรุงเทพ → โตเกียว เที่ยวเดียว 15 พ.ย. 2569 ผ่านฟอร์มที่มองเห็น (ถ้าหน้าแรกแสดงผลอยู่แล้ว ใช้ได้เลย)
export async function open(p) {
  await p.goto('/');
  await p.waitForLoadState('networkidle').catch(() => {});
  if (await exists(btn(p, /^ปลายทาง,/))) {
    const trip = p.getByRole('combobox', { name: /ประเภทตั๋ว/ });
    if (await exists(trip)) await trip.selectOption({ label: '→ เที่ยวเดียว' }).catch(() => {});
    await btn(p, /^ปลายทาง,/).first().click();
    await p.getByRole('option', { name: /โตเกียว เมือง/ }).click();
    await btn(p, /^ขาไป, /).first().click();
    for (let i = 0; i < 12; i++) {
      if (await p.getByRole('heading', { name: 'พฤศจิกายน 2569', exact: true }).isVisible()) break;
      await btn(p, 'เดือนก่อนหน้า').first().click();
    }
    await btn(p, '15').first().click();
    await btn(p, 'เสร็จ').first().click();
    await btn(p, /ค้นหาเที่ยวบิน/).first().click();
    await p.getByRole('tab', { name: /ดีที่สุด/ }).waitFor({ timeout: 15000 }).catch(() => {});
  }
  await (await rowsLoc(p)).first().waitFor({ timeout: 15000 });
  await stableCount(p);
}

export async function rawRows(p) {
  return (await rowsLoc(p)).evaluateAll((els) => els.map((e) => ({ text: e.innerText, name: e.getAttribute('aria-label') || '' })));
}
// ข้อความ "มีผลลัพธ์ N รายการ" / "พบ N เที่ยวบิน" ถ้ามี
export async function shownCount(p) {
  const t = await p.getByRole('main').innerText().catch(() => '');
  const m = t.match(/มีผลลัพธ์ (\d+) รายการ|พบ (\d+) เที่ยวบิน/);
  return m ? Number(m[1] ?? m[2]) : null;
}

// แท็บ "ถูกที่สุด" — ถ้าไม่มีแท็บ ใช้ลิงก์เรียง "ราคาถูกสุด" แทน (บันทึกเป็นหมายเหตุ)
export async function cheapest(p) {
  const tab = p.getByRole('tab', { name: /ถูกที่สุด/ });
  if (await exists(tab)) {
    const label = await tab.first().innerText();
    await tab.first().click();
    await p.waitForTimeout(500);
    await stableCount(p);
    return { label, note: null };
  }
  const link = p.getByRole('link', { name: /ราคาถูกสุด/ });
  if (await exists(link)) { await link.first().click(); await p.waitForLoadState('networkidle').catch(() => {}); await stableCount(p); return { label: null, note: 'ไม่มีแท็บ "ถูกที่สุด" ใช้ลิงก์เรียง "ราคาถูกสุด" แทน' }; }
  throw new Unsupported('ไม่พบแท็บ "ถูกที่สุด"');
}

export async function more(p) {
  const b = await need(btn(p, /^ดูเที่ยวบินเพิ่มเติม/), 'ปุ่ม "ดูเที่ยวบินเพิ่มเติม"');
  await b.scrollIntoViewIfNeeded();
  await b.click();
  await p.waitForTimeout(500);
  await stableCount(p);
}

const filterChip = (p, name) => btn(p, new RegExp('^' + name + '(?: ▾|$)'));
const closeDialog = async (p) => { const c = btn(p, 'ปิด'); if (await exists(c)) await c.first().click(); else await p.keyboard.press('Escape'); };
async function openFilter(p, name) {
  const chip = await need(filterChip(p, name), `ตัวกรอง "${name}"`);
  await p.evaluate(() => window.scrollTo(0, 0));
  await chip.click();
  await p.waitForTimeout(300);
}

export async function nonstop(p) {
  if (await exists(filterChip(p, 'จำนวนครั้งที่แวะพัก'))) {
    await openFilter(p, 'จำนวนครั้งที่แวะพัก');
    await (await need(p.getByRole('radio', { name: 'บินตรงเท่านั้น', exact: true }), 'ตัวเลือก "บินตรงเท่านั้น"')).check();
    await closeDialog(p);
  } else {
    const link = await need(p.getByRole('link', { name: /บินตรงเท่านั้น/ }), 'ตัวกรองบินตรง');
    await link.click();
    await p.waitForLoadState('networkidle').catch(() => {});
  }
  await p.waitForTimeout(400);
  await stableCount(p);
}

export async function airlineOnly(p, airline) {
  await openFilter(p, 'สายการบิน');
  const cb = await need(p.getByRole('checkbox', { name: new RegExp('^' + airline + '(\\s|\\(|$)') }), `เช็กบ็อกซ์ "${airline}"`);
  const only = cb.locator('..').getByRole('button', { name: 'เท่านั้น', exact: true });
  await (await need(only, `ปุ่ม "เท่านั้น" ของ ${airline}`)).click();
  await closeDialog(p);
  await p.waitForTimeout(400);
  await stableCount(p);
}

// slider ราคาสูงสุด: กด Home (ค่าต่ำสุดของ slider) แล้วอ่านค่าที่ตั้งได้กลับมาจาก UI
export async function priceMax(p) {
  await openFilter(p, 'ราคา');
  const s = await need(p.getByRole('slider', { name: 'ราคาสูงสุด', exact: true }), 'slider "ราคาสูงสุด"');
  await s.press('Home');
  const value = (await s.getAttribute('aria-valuetext')) || (await s.getAttribute('aria-valuenow')) || (await s.inputValue().catch(() => null));
  await closeDialog(p);
  await p.waitForTimeout(400);
  await stableCount(p);
  return value;
}

export async function departLate(p) {
  await openFilter(p, 'เวลา');
  const s = await need(p.getByRole('slider', { name: /ออกเดินทาง\s?(ที่)?เร็วที่สุด/ }), 'slider "ออกเดินทาง เร็วที่สุด"');
  await s.press('End');
  const value = (await s.getAttribute('aria-valuetext')) || (await s.getAttribute('aria-valuenow'));
  await closeDialog(p);
  await p.waitForTimeout(400);
  await stableCount(p);
  return value;
}

// ขยายรายละเอียดของแถวที่ เวลาออก + สายการบิน ตรงกับแถวที่เลือกจากต้นฉบับ แล้วคืนข้อความรายละเอียด
export async function expandDetail(p, { dep, airline }) {
  const rows = await rowsLoc(p);
  const row = rows.filter({ hasText: dep }).filter({ hasText: airline });
  if (!(await exists(row))) throw new Unsupported(`ไม่พบแถว ${dep} ${airline}`);
  const b = await need(row.first().getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }), 'ปุ่ม "รายละเอียดเที่ยวบิน"');
  await b.scrollIntoViewIfNeeded();
  await b.click();
  await p.waitForTimeout(800);
  // ข้อความรายละเอียด = จากแถวที่ขยาย ไปจนก่อนแถวถัดไป (โครงสร้างต่างกันได้ จึงเดินตามพี่น้องใน DOM)
  return b.evaluate((el) => {
    const isRow = (n) => n.matches?.('a[aria-label^="เที่ยวบิน "]') || n.querySelector?.('a[aria-label^="เที่ยวบิน "]');
    let node = el.closest('a[aria-label^="เที่ยวบิน "]') || el;
    while (node.parentElement && !node.parentElement.innerText.includes('เวลาเดินทาง')) node = node.parentElement;
    if (node.innerText.includes('เวลาเดินทาง')) return node.innerText;
    let out = node.innerText;
    for (let s = node.nextElementSibling; s && !isRow(s); s = s.nextElementSibling) out += '\n' + s.innerText;
    // ถ้าพ่อแม่รวมหลายแถว ให้ไล่จากลูกที่มีแถวที่ขยาย
    if (!out.includes('เวลาเดินทาง') && node.parentElement) {
      const kids = [...node.parentElement.children];
      let i = kids.findIndex((k) => k.contains(el)); out = '';
      for (let j = i; j < kids.length && (j === i || !isRow(kids[j])); j++) out += '\n' + kids[j].innerText;
    }
    return out;
  });
}

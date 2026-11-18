// ตัวขับต้นฉบับแช่แข็ง (Google Flights offline จาก HAR) — ใช้ newFrozenContext ของ frozen/open-original.mjs
import { newFrozenContext, SEARCH_URL } from '../../frozen/open-original.mjs';

export const rowsLoc = (page) => page.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ });
const settle = (page) => page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

export async function stableCount(page, rows) {
  let last = -1, same = 0;
  for (let i = 0; i < 120 && same < 4; i++) {
    const n = await rows.count();
    same = n === last && n > 0 ? same + 1 : 0;
    last = n;
    await page.waitForTimeout(250);
  }
  return last;
}

export async function launch({ video } = {}) {
  const { browser, context, stats } = await newFrozenContext({ video });
  const page = await context.newPage();
  return { browser, context, page, stats };
}

export async function open(page) {
  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });
  await rowsLoc(page).first().waitFor({ timeout: 30_000 });
  await settle(page);
  await stableCount(page, rowsLoc(page));
}

// ข้อความของแถวที่มองเห็น (ปุ่มรายละเอียด → li ของแถว)
// (ติดป้าย data-diff-idx ไว้ที่ li เพื่อให้ showDerived อ้างแถวเดียวกันได้)
export const rawRows = (page) => rowsLoc(page).evaluateAll((btns) => btns.map((b, i) => {
  const li = b.closest('li') || b.parentElement;
  li.dataset.diffIdx = i;
  // ชื่อสายการบินหลายรายคั่นด้วย span ว่าง (จุดวาดด้วย CSS) → ใส่ " · " ขนาดตัวอักษร 0 ให้ innerText แยกชื่อได้ โดยภาพไม่เปลี่ยน
  li.querySelectorAll('span[aria-label=" "]:empty').forEach((s) => { s.textContent = ' · '; s.style.fontSize = '0'; });
  return { text: li.innerText };
}));

export async function more(page) {
  const rows = rowsLoc(page);
  const before = await rows.count();
  const btn = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  for (let i = 0; i < 60 && (await rows.count()) <= before; i++) await page.waitForTimeout(250);
  await settle(page);
  await stableCount(page, rows);
}

export async function nonstop(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: /^จำนวนครั้งที่แวะพัก/ }).click();
  const filtered = page.waitForResponse(/GetShoppingResults/, { timeout: 30_000 });
  await page.getByRole('radio', { name: /บินตรงเท่านั้น/ }).click();
  await filtered;
  await page.getByRole('button', { name: 'ปิดกล่องโต้ตอบ' }).first().click({ timeout: 3000 }).catch(() => page.keyboard.press('Escape'));
  await settle(page);
  await stableCount(page, rowsLoc(page));
}

export const tabLabel = (page) => page.getByRole('tab', { name: /ถูกที่สุด/ }).innerText();

// ขยายรายละเอียดแถวแรกที่ตรงเงื่อนไข แล้วคืนข้อความรายละเอียดของแถวนั้น
export async function expandDetail(page, index) {
  const btn = rowsLoc(page).nth(index);
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(1200);
  return page.locator('li').filter({ has: page.locator('[aria-expanded="true"][aria-label^="รายละเอียดเที่ยวบิน"]') }).first().innerText();
}

// ใช้ตอนทำ GIF ของสถานการณ์ที่ HAR ไม่มีคำตอบ: ซ่อนแถวที่ไม่ผ่านเงื่อนไข (เฉลยอนุมาน) + ป้ายอธิบาย
// เปลี่ยนเฉพาะการแสดงผลในเบราว์เซอร์ทดสอบ ไม่แตะข้อมูลที่ดึงไปเทียบ (ดึงก่อนเรียกฟังก์ชันนี้)
export async function showDerived(page, keepIdx, banner) {
  await page.evaluate(({ keep, banner }) => {
    const lis = [...document.querySelectorAll('[data-diff-idx]')];
    const idx = (li) => Number(li.dataset.diffIdx);
    lis.forEach((li) => { if (keep && !keep.includes(idx(li))) li.style.display = 'none'; else if (keep) li.style.outline = '3px solid #e8710a'; });
    const d = document.createElement('div');
    d.textContent = banner;
    Object.assign(d.style, { position: 'fixed', top: '0', left: '0', right: '0', zIndex: 99999, background: '#e8710a', color: '#fff', font: 'bold 18px sans-serif', padding: '10px 16px', textAlign: 'center' });
    document.body.appendChild(d);
    (lis.find((li) => !keep || keep.includes(idx(li))) || document.body).scrollIntoView({ block: 'center' });
  }, { keep: keepIdx, banner });
}

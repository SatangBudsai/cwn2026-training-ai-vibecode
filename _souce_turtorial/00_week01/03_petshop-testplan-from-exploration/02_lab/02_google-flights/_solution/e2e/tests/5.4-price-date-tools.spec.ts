/**
 * 5.4 เครื่องมือราคาและวันที่ (TEST-PLAN.md หัวข้อ 5.4 · ต้นฉบับ plan/5.4-เครื่องมือราคาและวันที่.md)
 * TC-PRC-01 … TC-PRC-04 · งบค้นหารวม 9 ครั้ง (TC-PRC-04 ใช้ 2 ถ้าวันรันไม่มีการ์ด)
 *
 * ป้ายและบทบาทที่ใช้ (จาก exploration/C4 + ตรวจสดใน session gen-54 วันที่ 2026-11-03)
 *  - แท็บ "ถูกที่สุด เริ่มต้น ฿X" · กล่อง heading "ข้อมูลเชิงลึกด้านราคา" + ปุ่ม "ดูประวัติราคา"
 *  - กราฟประวัติราคา: ปุ่ม "วันนี้ - ฿…" (aria มีราคา)
 *  - region "หาราคาที่ดีที่สุด" → switch "ติดตามราคาเที่ยวบินจาก … ออกเดินทางวันที่ YYYY-MM-DD" (aria-checked)
 *  - ปุ่ม "ตารางวันที่" / "กราฟราคา" → dialog "ข้อมูลเชิงลึกด้านราคา" แท็บ "วันที่" / "กราฟราคา"
 *    · ตาราง: ปุ่มราคา "฿5,900, ราคาถูกที่สุด, เลือกแล้ว" (ไม่มีวันที่) จับคู่กับหัวคอลัมน์ "อังคาร 15 ธ.ค." ตามตำแหน่ง x
 *      ปุ่มราคาถูก <canvas role="grid"> ทับ → เลือกช่องด้วยการคลิกเมาส์ที่พิกัดของช่อง (clickGridCell)
 *    · ปฏิทิน: ราคาในช่องโหลดตามหลังการเปิด (ชื่อช่องเป็น "… ????" ก่อน) → readCalCells รอจนมีราคา
 *    · กราฟ: แท่งเป็น <path data-id="YYYY-MM-DD"> ใน img aria-hidden (ไม่มี role/ชื่อ จึงใช้ data-id) · tooltip "การเดินทางเที่ยวเดียว · <วัน> · เริ่มที่ ฿…"
 *    · ปุ่ม "เลื่อนไปทางซ้าย/ขวา" (ตาราง) · "ยกเลิก" / "ตกลง"
 *  - ปฏิทินฟอร์ม: dialog ที่มีปุ่ม "เสร็จ. ค้นหาเที่ยวบิน…" · ช่องวัน button "วันอังคารที่ 15 ธันวาคม ค.ศ. 2026 … , 5900 บาทไทย"
 *    · ยอด "เริ่มที่ ฿… สำหรับเที่ยวเดียว" มุมล่าง (ขึ้นหลังเลือกวัน — ถ้ายังไม่ขึ้นให้คลิกช่องวันเดิมซ้ำ ไม่เปลี่ยนวัน ไม่ค้นหา)
 *  - การ์ดวันที่ถูกกว่า: "เดินทางวันที่ 29 ธ.ค. ในราคา ฿8,375" + ปุ่ม "เปลี่ยนวันที่" + ปุ่ม "ปิด"
 *  - ป๊อปอัปติดตามราคา: heading "ลงชื่อเข้าใช้เพื่อติดตามราคา" · ปุ่ม "ปิด" · ลิงก์ "ลงชื่อเข้าใช้" (ห้ามกด)
 */
import { test, expect, getU1, type GF } from '../support/gf';
import type { Locator, Page } from '@playwright/test';

// ───────────────────────── วันที่ภาษาไทย ─────────────────────────
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
const TH_WD_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MON_RE = TH_MON.map(esc).join('|');
const WD_RE = TH_WD.join('|');
const GRID_HEADER_RE = new RegExp(`^(?:${WD_RE})\\s*\\d{1,2}\\s*(?:${MON_RE})$`);
const SHORT_DATE_RE = new RegExp(`^\\d{1,2}\\s*(?:${MON_RE})$`);
const CARD_RE = new RegExp(`เดินทางวันที่\\s*\\d{1,2}\\s*(?:${MON_RE})\\s*ในราคา\\s*฿\\s*[\\d,]+`);

const D_DATE = '2026-12-15';
const D_HIGH = '2026-12-31';
const D_PRC_3RD_FALLBACK = '2026-12-29';

function isoToDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const dateToIso = (dt: Date) => dt.toISOString().slice(0, 10);
function addDays(iso: string, n: number) {
  const dt = isoToDate(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dateToIso(dt);
}
const diffDays = (a: string, b: string) => Math.round((isoToDate(a).getTime() - isoToDate(b).getTime()) / 86_400_000);
/** "15 ธ.ค." */
const thShort = (iso: string) => { const dt = isoToDate(iso); return `${dt.getUTCDate()} ${TH_MON[dt.getUTCMonth()]}`; };
/** "อังคาร 15 ธ.ค." (รูปแบบในช่อง "ขาไป") */
const thWd = (iso: string) => `${TH_WD[isoToDate(iso).getUTCDay()]} ${thShort(iso)}`;
/** ชื่อช่องวันในปฏิทินฟอร์ม "วันอังคารที่ 15 ธันวาคม ค.ศ. 2026 …" */
function calNameRe(iso: string) {
  const dt = isoToDate(iso);
  return new RegExp(`^วัน${TH_WD_FULL[dt.getUTCDay()]}ที่ ${dt.getUTCDate()} ${TH_MON_FULL[dt.getUTCMonth()]} ค\\.ศ\\. ${dt.getUTCFullYear()}`);
}
/** "15 ธ.ค." / "อังคาร 15 ธ.ค." → ISO (ช่วงทดสอบ พ.ย.–ธ.ค. 2026 และ ม.ค.–ก.พ. 2027) */
function parseThDayMon(text: string): string | null {
  const m = text.match(new RegExp(`(\\d{1,2})\\s*(${MON_RE})`));
  if (!m) return null;
  const mi = TH_MON.indexOf(m[2]);
  const y = mi >= 10 ? 2026 : 2027;
  return `${y}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
const winDays = (d: string) => [-3, -2, -1, 0, 1, 2, 3].map((k) => addDays(d, k));

// ───────────────────────── อ่านราคา ─────────────────────────
const num = (s: string) => Number(s.replace(/[^\d]/g, ''));
function priceIn(text: string): number | null {
  const k = text.match(/฿\s*([\d.,]+)\s*K/i);
  if (k) return Math.round(parseFloat(k[1].replace(/,/g, '')) * 1000);
  const m = text.match(/฿\s*([\d,]+)/);
  return m ? num(m[1]) : null;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number | null | undefined) => (n == null ? '—' : `฿${n.toLocaleString('en-US')}`);

function note(desc: string) {
  test.info().annotations.push({ type: 'จด', description: desc });
}
/** หลักฐาน snapshot (accessibility tree) ตามขั้น "snapshot" ในแผน */
async function snap(page: Page, name: string) {
  const yml = await page.locator('body').ariaSnapshot({ timeout: 20_000 }).catch((e) => `snapshot error: ${e}`);
  await test.info().attach(`snapshot · ${name}`, { body: yml, contentType: 'text/yaml' }).catch(() => {});
}
/** หลักฐาน screenshot ตามขั้น "screenshot" ในแผน (นอกเหนือจากภาพของ gf.check) */
async function shot(page: Page, name: string) {
  const buf = await page.screenshot().catch(() => null);
  if (buf) await test.info().attach(`ภาพ · ${name}`, { body: buf, contentType: 'image/png' }).catch(() => {});
}
async function scrollTop(gf: GF, page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await gf.pause(1500, 2500);
}
const tfsOf = (u: string) => { try { return new URL(u).searchParams.get('tfs'); } catch { return null; } };

// ───────────────────────── ฟอร์ม / หัวผลลัพธ์ ─────────────────────────
const searchForm = (page: Page) => page.getByRole('search');
const departBox = (page: Page) => searchForm(page).getByRole('textbox', { name: 'ขาไป' }).first();

/** ตรวจหัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · <วัน> (ใช้ภายใน gf.check) */
async function expectHeader(page: Page, iso: string) {
  const form = searchForm(page);
  await expect.soft(form.getByRole('combobox', { name: /ประเภทตั๋ว/ }), 'ประเภทตั๋ว = เที่ยวเดียว').toContainText('เที่ยวเดียว');
  await expect.soft(form.getByRole('button', { name: /ผู้โดยสาร 1 คน/ }), 'ผู้โดยสาร = 1 คน').toBeVisible();
  await expect.soft(form.getByRole('combobox', { name: /ชั้นโดยสาร/ }), 'ชั้นโดยสาร = ชั้นประหยัด').toContainText('ชั้นประหยัด');
  await expect.soft(form.getByRole('combobox', { name: 'ต้นทาง' }), 'ต้นทาง = กรุงเทพมหานคร').toHaveValue(/กรุงเทพมหานคร/);
  await expect.soft(form.getByRole('combobox', { name: 'ปลายทาง' }), 'ปลายทาง = โตเกียว').toHaveValue(/โตเกียว/);
  await expect.soft(departBox(page), `ขาไป = ${thWd(iso)}`).toHaveValue(thWd(iso));
}

const cheapestTab = (page: Page) => page.getByRole('tab').filter({ hasText: 'ถูกที่สุด' }).first();
/** ราคาบนแท็บ "ถูกที่สุด เริ่มต้น ฿X" · รอจนราคาขึ้นบนแท็บ (ผลอาจยังโหลดอยู่) · สำรองอ่านจาก aria "เริ่มต้น 5900 บาทไทย" */
async function readTabPrice(page: Page): Promise<number | null> {
  const tab = cheapestTab(page);
  await tab.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  const deadline = Date.now() + 15_000;
  for (;;) {
    let p = priceIn(await tab.innerText({ timeout: 3000 }).catch(() => ''));
    if (p == null) {
      const aria = await tab.ariaSnapshot({ timeout: 3000 }).catch(() => '');
      const m = aria.match(/เริ่มต้น\s*(\d+)\s*บาทไทย/);
      p = m ? Number(m[1]) : null;
    }
    if (p != null || Date.now() > deadline) return p;
    await sleep(1000);
  }
}

/**
 * รอผลเที่ยวบินโหลด (แท็บ "ถูกที่สุด" มีราคา) · ถ้าหน้าผลลัพธ์ขึ้น "อ๊ะ มีบางอย่างผิดพลาด" + ปุ่ม "โหลดซ้ำ"
 * (เว็บโหลดผลไม่สำเร็จชั่วคราว — เกิดใน TC-PRC-01 รอบแรก) ให้รอแบบคนแล้วกด "โหลดซ้ำ" ได้ 1 ครั้งต่อ test (นับเป็นการค้นหา)
 */
const reloadUsed = new WeakSet<GF>();
async function ensureResults(gf: GF, page: Page, ctx: string) {
  const tab = cheapestTab(page);
  const err = page.getByRole('main').getByText(/มีบางอย่างผิดพลาด/).first();
  const wait = async () => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (priceIn(await tab.innerText({ timeout: 1000 }).catch(() => '')) != null) return 'ok';
      if (await err.isVisible().catch(() => false)) return 'error';
      await sleep(1000);
    }
    return 'timeout';
  };
  let st = await wait();
  if (st === 'error' && !reloadUsed.has(gf)) {
    reloadUsed.add(gf);
    note(`หลัง${ctx} หน้าผลลัพธ์ขึ้น "อ๊ะ มีบางอย่างผิดพลาด" (เว็บโหลดผลไม่สำเร็จ) → รอแล้วกด "โหลดซ้ำ" 1 ครั้ง (นับเป็นการค้นหาเพิ่ม 1)`);
    await shot(page, `หน้าผลลัพธ์ผิดพลาดหลัง${ctx}`);
    await gf.pause(8000, 12_000);
    await gf.click(page.getByRole('button', { name: 'โหลดซ้ำ' }).first(), { search: `กด "โหลดซ้ำ" หลังหน้าผลลัพธ์ผิดพลาด (${ctx})` });
    st = await wait();
  }
  if (st !== 'ok') note(`หลัง${ctx}: ผลเที่ยวบินยังไม่ขึ้น (${st === 'error' ? 'หน้าแสดง "อ๊ะ มีบางอย่างผิดพลาด"' : 'รอครบ 30 วินาที'})`);
  return st;
}

// ───────────────────────── คลิกแบบคนที่ทนต่อสิ่งบัง ─────────────────────────
const humanGap = () => sleep(400 + Math.round(Math.random() * 500));
/** เลื่อนให้ element อยู่กลางจอ (ไม่ชิดขอบบนใต้แถบหัว Google หรือขอบล่างที่การ์ด/ป๊อปโอเวอร์ลอยอยู่) */
async function centerInView(loc: Locator) {
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' })).catch(() => {});
  await sleep(700);
}
/** จุดกลางของ element รับคลิกได้จริงหรือไม่ (ไม่มีสิ่งอื่นทับ) */
async function hittable(loc: Locator) {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  }).catch(() => false);
}
/**
 * คลิกปุ่มที่อาจถูกบัง (เช่น การ์ดวันที่ถูกกว่าที่ลอยทับ "ดูประวัติราคา" · แถบหัว Google):
 * เลื่อนให้อยู่กลางจอก่อน → ถ้าจุดกลางไม่ถูกบัง คลิกเมาส์ตามปกติ · ถ้าถูกบัง โฟกัสแล้วกดคีย์ (Enter / Space) แบบผู้ใช้คีย์บอร์ด
 */
async function safeClick(gf: GF, loc: Locator, opts: { key?: string; search?: string } = {}) {
  await loc.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  await centerInView(loc);
  if (await hittable(loc)) {
    await gf.click(loc, { search: opts.search });
    return;
  }
  await gf.assertNotBlocked();
  const focused = await loc.focus({ timeout: 10_000 }).then(() => true).catch(() => false);
  if (!focused) {
    await forceClick(gf, loc);
    if (opts.search) await gf.searched(opts.search);
    return;
  }
  await humanGap();
  await gf.press(opts.key ?? 'Enter', { search: opts.search });
}
/**
 * คลิกเมาส์จริงที่ตำแหน่งของ element ที่มีชั้นวาดทับ (ตารางวันที่วาดบน <canvas role="grid"> ทับปุ่มราคา div role=button ·
 * แท่งกราฟเป็น <path> ใน img aria-hidden) — เมาส์ลงที่จุดเดียวกับที่คนคลิก ชั้นที่ทับเป็นตัวรับคลิกตามพิกัด
 */
async function forceClick(gf: GF, loc: Locator, position?: { x: number; y: number }) {
  await gf.assertNotBlocked();
  await loc.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
  await loc.hover({ force: true, position, timeout: 10_000 }).catch(() => {});
  await humanGap();
  await loc.click({ force: true, position });
  await gf.pause();
}

/** ราคาทุกแถวในรายการที่แสดงอยู่ (ไม่กด "ดูเที่ยวบินเพิ่มเติม" · ไม่นับแถว "ไม่มีข้อมูลราคา") */
async function listPrices(page: Page): Promise<number[]> {
  const items = page.getByRole('main').getByRole('listitem');
  const n = await items.count();
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = await items.nth(i).innerText().catch(() => '');
    if (/ไม่มีข้อมูลราคา/.test(t)) continue;
    const p = priceIn(t);
    if (p != null) out.push(p);
  }
  return out;
}

// ───────────────────────── ปฏิทินฟอร์ม ─────────────────────────
const calDialog = (page: Page) => page.getByRole('dialog').filter({ has: page.getByRole('button', { name: /^เสร็จ/ }) });
const calCell = (cal: Locator, iso: string) => cal.getByRole('button', { name: calNameRe(iso) }).first();

async function openCalendar(gf: GF, page: Page) {
  await gf.click(departBox(page));
  const cal = calDialog(page);
  await cal.waitFor({ state: 'visible', timeout: 15_000 });
  return cal;
}
/** ปิดปฏิทินด้วย Esc เท่านั้น · ถ้า Esc แล้วหน้าโหลดผลใหม่ นับเป็นการค้นหา */
async function closeCalendarEsc(gf: GF, page: Page) {
  const before = page.url();
  await gf.press('Escape');
  if (page.url() !== before) await gf.searched('Esc ปิดปฏิทินแล้วหน้าโหลดผลใหม่ (จดไว้ตามแผน)');
}
/** kUnit = ความละเอียดของช่องที่แสดงแบบย่อ "฿10.1K" (1 ทศนิยม = ฿100) · null = แสดงเต็ม "฿6,530" */
type CalRead = { loc: Locator; display: number | null; full: number | null; kUnit: number | null };
async function readCalCell(cal: Locator, iso: string, timeout = 3000): Promise<CalRead> {
  const loc = calCell(cal, iso);
  const aria = await loc.ariaSnapshot({ timeout }).catch(() => '');
  const full = aria.match(/(\d+)\s*บาทไทย/);
  const txt = await loc.innerText({ timeout }).catch(() => '');
  const k = txt.match(/฿\s*[\d,]+(?:\.(\d+))?\s*K/i);
  return { loc, display: priceIn(txt), full: full ? Number(full[1]) : null, kUnit: k ? 1000 / 10 ** (k[1]?.length ?? 0) : null };
}
/**
 * อ่านหลายช่องในปฏิทิน · ราคาในช่องโหลดตามหลังการเปิดปฏิทิน (ตอนแรกชื่อช่องเป็น "… ค.ศ. 2026 ????" ไม่มีราคา)
 * → อ่านซ้ำจนทุกช่องมีทั้งราคาที่แสดงและราคาเต็มใน aria (≤ 30 วินาที)
 */
async function readCalCells(cal: Locator, isos: string[], timeoutMs = 30_000): Promise<CalRead[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const out: CalRead[] = [];
    for (const iso of isos) out.push(await readCalCell(cal, iso));
    if (out.every((c) => c.display != null && c.full != null) || Date.now() > deadline) return out;
    await sleep(1500);
  }
}
/**
 * ความละเอียดของช่องปฏิทิน (R37/Q08): หน่วยปัดที่ใหญ่สุดที่ราคาเต็มใน aria ปัดแล้วได้ตรงกับที่ช่องแสดงทุกช่อง
 * (คิดเฉพาะช่องที่แสดงราคาเต็ม — ช่องแบบย่อ "฿10.1K" มีความละเอียดของตัวเองตามจำนวนทศนิยม)
 */
function calUnit(cells: CalRead[]): number {
  const ok = cells.filter((c) => c.display != null && c.full != null && c.kUnit == null);
  if (!ok.length) return 10;
  for (const u of [1000, 100, 10, 1]) if (ok.every((c) => Math.round(c.full! / u) * u === c.display)) return u;
  return 1;
}
/** ความละเอียดของช่องนี้: ช่องแบบย่อ K ใช้หน่วยของตัวเอง · ช่องแสดงเต็มใช้หน่วยจาก calUnit */
const cellUnit = (cell: CalRead | null | undefined, unit: number) => cell?.kUnit ?? unit;
const sameAtCell = (cell: CalRead | null | undefined, unit: number, value: number | null) => {
  const display = cell?.display ?? null;
  const u = cellUnit(cell, unit);
  return display != null && value != null && Math.round(value / u) * u === display;
};

// ───────────────────────── ข้อมูลเชิงลึกด้านราคา ─────────────────────────
const insightsBox = (page: Page) => page.getByRole('heading', { name: 'ข้อมูลเชิงลึกด้านราคา', level: 3 }).locator('xpath=..');
const insightHeading = (page: Page) => page.getByRole('heading', { level: 4, name: /^ขณะนี้เที่ยวบิน/ }).first();
const labelOf = (t: string) => ((t.match(/มีราคา\s*(\S+)\s*$/) || [])[1] || '').trim();

async function readInsightCollapsed(page: Page) {
  const h = insightHeading(page);
  await h.scrollIntoViewIfNeeded({ timeout: 20_000 }).catch(() => {});
  const text = (await h.innerText({ timeout: 10_000 }).catch(() => '')).trim();
  return { loc: h, text, label: labelOf(text) };
}
/**
 * กด "ดูประวัติราคา" ให้กล่องขยาย · ปุ่มอยู่ขวาของกล่อง ถ้าเลื่อนแค่พอเห็นจะชิดขอบล่างแล้วการ์ดวันที่ถูกกว่า (ป๊อปโอเวอร์ของ
 * region "หาราคาที่ดีที่สุด") ลอยทับ หรือชิดขอบบนใต้แถบหัว Google → safeClick เลื่อนกลางจอ / ใช้ Enter ถ้ายังถูกบัง
 * แล้วรอ aria-expanded = true (ถ้ายังไม่ขยาย กด Enter บนปุ่มอีกครั้ง)
 */
async function expandInsights(gf: GF, page: Page) {
  const btn = page.getByRole('button', { name: 'ดูประวัติราคา' }).first();
  await btn.waitFor({ state: 'attached', timeout: 30_000 }).catch(() => {});
  const expanded = async () => (await btn.getAttribute('aria-expanded', { timeout: 3000 }).catch(() => null)) === 'true';
  if (await expanded()) return;
  await safeClick(gf, btn);
  for (let i = 0; i < 8 && !(await expanded()); i++) await sleep(1000);
  if (!(await expanded())) {
    await btn.focus({ timeout: 10_000 }).catch(() => {});
    await humanGap();
    await gf.press('Enter');
  }
  await page.getByText(/ราคาขั้นต่ำ.*อยู่ระหว่าง/).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
}
async function readInsightExpanded(page: Page) {
  const range = page.getByText(/ราคาขั้นต่ำ.*อยู่ระหว่าง/).first();
  const rangeText = (await range.innerText({ timeout: 15_000 }).catch(() => '')).replace(/\s+/g, ' ');
  const r = rangeText.match(/฿\s*([\d,]+)\s*[–\-]\s*฿?\s*([\d,]+)/);
  const sentence = page.getByText(/฿[\d,]+\s*อยู่ในช่วงราคา/).first();
  const sText = (await sentence.innerText({ timeout: 10_000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
  const strong = (await sentence.locator('strong').first().innerText({ timeout: 3000 }).catch(() => '')).trim();
  const label = strong || ((sText.match(/อยู่ในช่วงราคา\s*(\S+)/) || [])[1] || '');
  return {
    rangeLoc: range, rangeText, lo: r ? num(r[1]) : null, hi: r ? num(r[2]) : null,
    sentenceLoc: sentence, sentenceText: sText, price: priceIn(sText), label,
  };
}
/** hover จุดขวาสุด ("วันนี้") ของกราฟประวัติราคา แล้วอ่านราคาจาก aria */
async function readHistoryToday(gf: GF, page: Page) {
  const today = page.getByRole('button', { name: /^วันนี้ - ฿/ }).first();
  await today.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
  await today.hover({ timeout: 10_000, force: true }).catch(() => {});
  await gf.pause(1500, 2500);
  const aria = await today.ariaSnapshot({ timeout: 10_000 }).catch(() => '');
  const m = aria.match(/วันนี้ - ฿\s*([\d,]+)/);
  return { loc: today, price: m ? num(m[1]) : null };
}
/** กฎ R90: Lo ≤ X ≤ Hi → "ปกติ" · X > Hi → "สูง" · X < Lo → ไม่ใช่ "ปกติ" และไม่ใช่ "สูง" */
function expectLabelConsistent(x: number | null, lo: number | null, hi: number | null, label: string, ctx: string) {
  expect.soft(x != null && lo != null && hi != null, `${ctx}: อ่านราคา/ช่วงปกติได้ครบ (X=${fmt(x)} Lo=${fmt(lo)} Hi=${fmt(hi)})`).toBe(true);
  if (x == null || lo == null || hi == null) return;
  if (x >= lo && x <= hi) expect.soft(label, `${ctx}: ${fmt(x)} อยู่ใน ${fmt(lo)}–${fmt(hi)} → ป้ายต้องเป็น "ปกติ"`).toBe('ปกติ');
  else if (x > hi) expect.soft(label, `${ctx}: ${fmt(x)} > Hi ${fmt(hi)} → ป้ายต้องเป็น "สูง"`).toBe('สูง');
  else {
    expect.soft(label, `${ctx}: ${fmt(x)} < Lo ${fmt(lo)} → ป้ายต้องไม่ใช่ "ปกติ"`).not.toBe('ปกติ');
    expect.soft(label, `${ctx}: ${fmt(x)} < Lo ${fmt(lo)} → ป้ายต้องไม่ใช่ "สูง"`).not.toBe('สูง');
  }
}

// ───────────────────────── ติดตามราคา ─────────────────────────
const trackRegion = (page: Page) => page.getByRole('region', { name: 'หาราคาที่ดีที่สุด' });
const trackSwitch = (page: Page) => trackRegion(page).getByRole('switch', { name: /ออกเดินทางวันที่/ }).first();
const trackLabel = (page: Page) => trackRegion(page).getByText(SHORT_DATE_RE).first();
async function readTrack(page: Page) {
  const sw = trackSwitch(page);
  await sw.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
  const aria = (await sw.getAttribute('aria-label').catch(() => null)) || '';
  const checked = await sw.getAttribute('aria-checked').catch(() => null);
  const label = (await trackLabel(page).innerText({ timeout: 5000 }).catch(() => '')).trim();
  return { sw, aria, checked, label };
}
const signInDialog = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /ลงชื่อเข้าใช้เพื่อติดตามราคา/ }) });

// ───────────────────────── ป๊อปอัปตารางวันที่ / กราฟราคา ─────────────────────────
const priceDlg = (page: Page) => page.getByRole('dialog', { name: 'ข้อมูลเชิงลึกด้านราคา' });
const gridPanel = (dlg: Locator) => dlg.getByRole('tabpanel', { name: 'วันที่' });
const graphRegion = (dlg: Locator) => dlg.getByRole('region', { name: 'กราฟราคา' });
/** แท่งกราฟเป็น img aria-hidden ไม่มี role/ชื่อ → ใช้ attribute data-id (วันที่ ISO) ของแท่งแทน */
const graphBar = (dlg: Locator, iso: string) => graphRegion(dlg).locator(`path[data-id="${iso}"]`).first();

type GridCell = { iso: string; header: string; price: number | null; aria: string; star: boolean; selected: boolean; y: number; btn: Locator };

async function readGridOnce(dlg: Locator): Promise<GridCell[]> {
  const panel = gridPanel(dlg);
  const heads = panel.getByText(GRID_HEADER_RE);
  const hn = await heads.count().catch(() => 0);
  const hs: { text: string; cx: number }[] = [];
  for (let i = 0; i < hn; i++) {
    const h = heads.nth(i);
    const b = await h.boundingBox().catch(() => null);
    if (!b || b.width <= 0) continue;
    hs.push({ text: (await h.innerText().catch(() => '')).replace(/\s+/g, ' ').trim(), cx: b.x + b.width / 2 });
  }
  const btns = panel.getByRole('button', { name: /^฿\s*[\d,]+/ });
  const bn = await btns.count().catch(() => 0);
  const bs: { aria: string; x: number; w: number; y: number; loc: Locator }[] = [];
  for (let i = 0; i < bn; i++) {
    const loc = btns.nth(i);
    const b = await loc.boundingBox().catch(() => null);
    if (!b || b.width <= 0) continue;
    const aria = (await loc.getAttribute('aria-label').catch(() => null)) || (await loc.innerText().catch(() => ''));
    bs.push({ aria, x: b.x, w: b.width, y: b.y, loc });
  }
  const cells: GridCell[] = [];
  for (const h of hs) {
    const iso = parseThDayMon(h.text);
    if (!iso) continue;
    const b = bs.find((x) => h.cx >= x.x - 2 && h.cx <= x.x + x.w + 2);
    cells.push({
      iso, header: h.text, price: b ? priceIn(b.aria) : null, aria: b?.aria || '',
      star: !!b && /ราคาถูกที่สุด/.test(b.aria), selected: !!b && /เลือกแล้ว/.test(b.aria), y: b ? b.y : NaN,
      btn: b ? b.loc : panel.getByRole('button', { name: /^฿/ }).first(),
    });
  }
  return cells.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
}
/** อ่านตารางวันที่ (รอจนทุกคอลัมน์โหลดราคาแล้ว ≤ 25 วินาที) */
async function readGrid(dlg: Locator): Promise<GridCell[]> {
  const deadline = Date.now() + 25_000;
  let cells: GridCell[] = [];
  for (;;) {
    cells = await readGridOnce(dlg);
    if ((cells.length > 0 && cells.every((c) => c.price != null)) || Date.now() > deadline) return cells;
    await sleep(1500);
  }
}
async function readSummary(dlg: Locator) {
  const loc = dlg.getByText(/฿[\d,]+\s*·\s*เที่ยวเดียว/).first().locator('xpath=..');
  const text = (await loc.innerText({ timeout: 10_000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
  const m = text.match(/฿\s*([\d,]+)\s*·\s*(\S+)/);
  return { loc, text, iso: parseThDayMon(text), price: m ? num(m[1]) : null, type: m ? m[2] : '' };
}
/**
 * คลิกช่องในตารางวันที่: ปุ่มราคา (div role=button) ถูก <canvas role="grid" aria-label="ตารางวันที่"> ทับ
 * (คลิกปกติจะรอจนหมดเวลา "canvas intercepts pointer events") → คลิกเมาส์ที่ตำแหน่งของช่อง (canvas รับคลิกตามพิกัด
 * — ตรวจสดแล้วว่าเลือกช่องได้) แล้วรอจนช่องนั้นเป็น "เลือกแล้ว" หรือสรุปท้ายเป็นวันนั้น · ถ้าไม่เปลี่ยนเลย ส่ง click ให้ปุ่มของช่องโดยตรง 1 ครั้ง
 */
async function clickGridCell(gf: GF, dlg: Locator, cell: GridCell) {
  const picked = async (ms: number) => {
    const deadline = Date.now() + ms;
    for (;;) {
      if (/เลือกแล้ว/.test((await cell.btn.getAttribute('aria-label', { timeout: 2000 }).catch(() => null)) || '')) return true;
      if ((await readSummary(dlg)).iso === cell.iso) return true;
      if (Date.now() > deadline) return false;
      await sleep(1000);
    }
  };
  await forceClick(gf, cell.btn);
  if (await picked(8000)) return;
  await cell.btn.dispatchEvent('click').catch(() => {});
  await gf.pause();
  await picked(8000);
}
async function openGrid(gf: GF, page: Page) {
  await safeClick(gf, page.getByRole('button', { name: 'ตารางวันที่', exact: true }));
  const dlg = priceDlg(page);
  await dlg.waitFor({ state: 'visible', timeout: 15_000 });
  const tab = dlg.getByRole('tab', { name: 'วันที่' });
  if ((await tab.getAttribute('aria-selected').catch(() => null)) !== 'true') await gf.click(tab);
  return dlg;
}
async function openGraph(gf: GF, page: Page) {
  await safeClick(gf, page.getByRole('button', { name: 'กราฟราคา', exact: true }));
  const dlg = priceDlg(page);
  await dlg.waitFor({ state: 'visible', timeout: 15_000 });
  const tab = dlg.getByRole('tab', { name: 'กราฟราคา' });
  if ((await tab.getAttribute('aria-selected').catch(() => null)) !== 'true') await gf.click(tab);
  await graphRegion(dlg).locator('path[data-id]').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
  return dlg;
}
async function cancelDlg(gf: GF, page: Page) {
  const dlg = priceDlg(page);
  if (await dlg.isVisible().catch(() => false)) {
    await gf.click(dlg.getByRole('button', { name: 'ยกเลิก' }));
    await dlg.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  }
}
/**
 * อ่านราคา D-PRC-WIN (d ± 3 วัน) จากตารางวันที่ · กด < หรือ > ได้รวมไม่เกิน 2 ครั้งต่อการเปิดป๊อปอัป (ไม่นับเป็นการค้นหา)
 */
async function collectWindow(gf: GF, dlg: Locator, d: string, acc: Map<string, number>, presses: { n: number }) {
  const need = winDays(d);
  for (;;) {
    const cells = await readGrid(dlg);
    for (const c of cells) if (c.price != null) acc.set(c.iso, c.price);
    const shown = cells.map((c) => c.iso);
    const missing = need.filter((x) => !acc.has(x));
    if (!missing.length || presses.n >= 2 || !shown.length) return cells;
    const goLeft = missing.some((x) => x < shown[0]);
    const goRight = missing.some((x) => x > shown[shown.length - 1]);
    if (!goLeft && !goRight) return cells;
    presses.n++;
    await gf.click(dlg.getByRole('button', { name: goLeft ? 'เลื่อนไปทางซ้าย' : 'เลื่อนไปทางขวา' }));
  }
}
/** อ่าน tooltip ทั้งหมดในแท็บกราฟ ("<วัน> · เริ่มที่ ฿…") — tooltip ของวันที่เลือกค้างอยู่ และ tooltip ของแท่งที่ hover อาจซ้อนกัน */
async function graphTooltips(dlg: Locator): Promise<{ iso: string; price: number }[]> {
  const txt = await dlg.innerText({ timeout: 10_000 }).catch(() => '');
  const re = new RegExp(`(?:${WD_RE})\\s+(\\d{1,2}\\s+(?:${MON_RE}))\\s+เริ่มที่\\s*฿\\s*([\\d,]+)`, 'g');
  const out: { iso: string; price: number }[] = [];
  for (const m of txt.matchAll(re)) {
    const iso = parseThDayMon(m[1]);
    if (iso) out.push({ iso, price: num(m[2]) });
  }
  return out;
}
/** hover แท่งของวัน iso (ใกล้ฐานแท่งเพื่อไม่ชน tooltip) แล้วอ่านราคา tooltip ของวันนั้น */
async function hoverBar(gf: GF, dlg: Locator, iso: string): Promise<number | null> {
  const bar = graphBar(dlg, iso);
  for (let attempt = 0; attempt < 2; attempt++) {
    const box = await bar.boundingBox().catch(() => null);
    if (!box) return null;
    await bar.hover({ force: true, position: { x: box.width / 2, y: Math.max(1, box.height - 3 - attempt * 8) } }).catch(() => {});
    await gf.pause(1500, 2500);
    const hit = (await graphTooltips(dlg)).find((t) => t.iso === iso);
    if (hit) return hit.price;
  }
  return null;
}
async function barFills(dlg: Locator): Promise<{ iso: string; fill: string }[]> {
  return graphRegion(dlg).locator('path[data-id]').evaluateAll((els) =>
    els.map((e) => ({ iso: e.getAttribute('data-id') || '', fill: e.getAttribute('fill') || '' })),
  ).catch(() => []);
}

// ───────────────────────── การ์ดวันที่ถูกกว่า ─────────────────────────
type Card = { present: boolean; loc: Locator; text: string; iso: string | null; price: number | null };
async function readCard(page: Page, waitMs = 6000): Promise<Card> {
  const loc = page.getByText(CARD_RE).first();
  const deadline = Date.now() + waitMs;
  let present = false;
  do {
    present = await loc.isVisible().catch(() => false);
    if (present) break;
    await sleep(1000);
  } while (Date.now() < deadline);
  if (!present) return { present, loc, text: '', iso: null, price: null };
  const text = (await loc.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const after = text.split('เดินทางวันที่')[1] || text;
  return { present, loc, text, iso: parseThDayMon(after), price: priceIn(after) };
}

/** เปิดปฏิทิน ลบข้อความเดิม พิมพ์วัน กด Enter แล้วกด "เสร็จ" (= 1 การค้นหา) แล้วเลื่อนขึ้นบนสุด */
async function typeDateAndDone(gf: GF, page: Page, text: string, reason: string) {
  const cal = await openCalendar(gf, page);
  await gf.type(cal.getByRole('textbox', { name: 'ขาไป' }), text, { clear: true, enter: true });
  await gf.click(cal.getByRole('button', { name: /^เสร็จ/ }), { search: reason });
  await scrollTop(gf, page);
  await ensureResults(gf, page, `ค้นหา (${reason})`);
  await readTabPrice(page);
}

// ═════════════════════════════════════════ TESTS ═════════════════════════════════════════

test('TC-PRC-01 · ข้อมูลเชิงลึกด้านราคาและสวิตช์ติดตามราคา (ก่อนล็อกอิน)', {
  tag: ['@P2', '@5.4'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2–3) X = ราคาต่ำสุดในรายการ = ยอด "เริ่มที่" ในปฏิทิน และช่อง 15 ธ.ค. ในปฏิทิน = X ที่ความละเอียดของช่อง (จุดเทียบ R43)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 5) ราคาในประโยคของกล่องขยาย = X และราคาจุด "วันนี้" ในกราฟประวัติราคา = X (R89)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 4–5) คำป้ายสอดคล้องกับตำแหน่งของ X เทียบ Lo–Hi บนจอ: Lo ≤ X ≤ Hi → "ปกติ" · X > Hi → "สูง" · X < Lo → ป้ายต้องไม่ใช่ "ปกติ" และไม่ใช่ "สูง" · และคำป้ายในประโยคแบบย่อ = คำป้ายในกล่องขยาย (R90)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 6) ป้ายบนสวิตช์ระบุ 15 ธ.ค. และ aria มี "2026-12-15" · aria-checked = false ก่อนกด (R102)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 7) ระบบไม่เปิดการติดตามโดยไม่มีบัญชี: มีป๊อปอัปขอให้ลงชื่อเข้าใช้ (มีปุ่มลงชื่อเข้าใช้และปุ่มปิด) (R103)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 8–9) หลังปิด: ป๊อปอัปหาย สวิตช์ aria-checked = false (ไม่ค้าง checked) · URL ยังเป็น google.com/travel/flights/search… (ไม่ไป accounts.google.com) · หัวผลลัพธ์และ X ไม่เปลี่ยน (R103)' },
    { type: 'ที่มา', description: 'plan/5.4-เครื่องมือราคาและวันที่.md · TC-PRC-01 · R89 R90 R102 R103 (+R43 จุดเทียบ) · Invariant/Metamorphic · Equivalence partition · State · [R]' },
    { type: 'งบค้นหา', description: '1' },
  ],
}, async ({ page, gf }) => {
  const U1 = getU1();
  let X: number | null = null;
  let rows: number[] = [];
  let calFrom: number | null = null;
  let cal15: CalRead | null = null;
  let unit = 10;
  let collapsed = { loc: page.locator('body'), text: '', label: '' };
  let exp: Awaited<ReturnType<typeof readInsightExpanded>> | null = null;
  let today: { loc: Locator; price: number | null } | null = null;
  let startUrl = '';

  await test.step('1. เปิด U1 (การค้นหาครั้งที่ 1) รอ ≥ 10 วินาที ตรวจหัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.', async () => {
    await gf.goto(U1, { search: 'เปิด U1' });
    await ensureResults(gf, page, 'เปิด U1');
    await readTabPrice(page);
    startUrl = page.url();
    await gf.check('ตั้งต้น หัวผลลัพธ์ตรงโจทย์ U1 (15 ธ.ค.)', searchForm(page), async () => { await expectHeader(page, D_DATE); });
  });

  await test.step('2. snapshot: จดราคาบนแท็บ "ถูกที่สุด เริ่มต้น ฿X" และราคาทุกแถวในรายการ (ไม่กด "ดูเที่ยวบินเพิ่มเติม")', async () => {
    X = await readTabPrice(page);
    rows = await listPrices(page);
    await snap(page, 'ขั้น 2 แท็บถูกที่สุดและรายการ');
    note(`X (แท็บถูกที่สุด) = ${fmt(X)} · ราคาในรายการ ${rows.length} แถว: ${rows.map(fmt).join(', ')}`);
  });

  await test.step('3. คลิกช่อง "ขาไป" ให้ปฏิทินเปิด จดราคาช่อง 15 ธ.ค. และยอด "เริ่มที่ ฿…" มุมล่าง แล้วกด Esc', async () => {
    const cal = await openCalendar(gf, page);
    // ราคาในช่องปฏิทินโหลดตามหลัง → รอให้ทุกช่องใน D-PRC-WIN มีราคาก่อนจด
    const sample = await readCalCells(cal, winDays(D_DATE));
    cal15 = sample[3];
    unit = calUnit(sample);
    let from = cal.getByText(/^เริ่มที่\s*฿/).first();
    await from.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    if (!(await from.isVisible().catch(() => false))) {
      // ยอด "เริ่มที่" ขึ้นหลังเลือกวัน → คลิกช่อง 15 ธ.ค. เดิม (วันเดียวกับที่ค้นหาอยู่ ไม่เปลี่ยนวัน และไม่ค้นหาจนกว่าจะกด "เสร็จ")
      await gf.click(calCell(cal, D_DATE));
      from = cal.getByText(/^เริ่มที่\s*฿/).first();
      await from.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    }
    calFrom = priceIn(await from.innerText({ timeout: 8000 }).catch(() => ''));
    note(`ปฏิทิน: ช่อง 15 ธ.ค. แสดง ${fmt(cal15.display)} (aria ${fmt(cal15.full)}) · ความละเอียดช่อง ฿${cellUnit(cal15, unit)} · "เริ่มที่" = ${fmt(calFrom)}`);
    await gf.check('E1 X = ราคาต่ำสุดในรายการ = "เริ่มที่" ในปฏิทิน = ช่อง 15 ธ.ค.', [cheapestTab(page), cal15.loc, from], async () => {
      const minRow = rows.length ? Math.min(...rows) : null;
      expect.soft(X, 'อ่านราคาแท็บ "ถูกที่สุด" ได้').not.toBeNull();
      expect.soft(minRow, `X ${fmt(X)} = ราคาต่ำสุดในรายการ ${fmt(minRow)}`).toBe(X);
      expect.soft(calFrom, `X ${fmt(X)} = ยอด "เริ่มที่" ในปฏิทิน ${fmt(calFrom)}`).toBe(X);
      expect.soft(sameAtCell(cal15, unit, X),
        `ช่อง 15 ธ.ค. ในปฏิทิน ${fmt(cal15!.display)} = X ${fmt(X)} ที่ความละเอียดของช่อง (฿${cellUnit(cal15, unit)})`).toBe(true);
    });
    await closeCalendarEsc(gf, page);
  });

  await test.step('4. เลื่อนถึงกล่องข้อมูลเชิงลึกด้านราคา จดประโยคป้ายแบบย่อ แล้วกด "ดูประวัติราคา"', async () => {
    collapsed = await readInsightCollapsed(page);
    note(`ประโยคแบบย่อ: "${collapsed.text}" → ป้าย "${collapsed.label}"`);
    await shot(page, 'ขั้น 4 กล่องข้อมูลเชิงลึกแบบย่อ');
    await expandInsights(gf, page);
  });

  await test.step('5. จากกล่องขยาย จด Lo–Hi, ราคาในประโยค "฿… อยู่ในช่วงราคา …" และคำป้าย · hover จุดขวาสุด ("วันนี้") ของกราฟประวัติราคา จดราคาจาก tooltip/aria · ถ่าย screenshot', async () => {
    exp = await readInsightExpanded(page);
    today = await readHistoryToday(gf, page);
    note(`กล่องขยาย: Lo–Hi = ${fmt(exp.lo)}–${fmt(exp.hi)} · ประโยค "${exp.sentenceText}" · ป้าย "${exp.label}" · จุด "วันนี้" = ${fmt(today.price)}`);
    await shot(page, 'ขั้น 5 กล่องข้อมูลเชิงลึกแบบขยาย + hover วันนี้');
    await gf.check('E2 ราคาในประโยคกล่องขยาย = X และจุด "วันนี้" = X', [exp.sentenceLoc, today.loc], async () => {
      expect.soft(exp!.price, `ราคาในประโยค ${fmt(exp!.price)} = X ${fmt(X)}`).toBe(X);
      expect.soft(today!.price, `ราคาจุด "วันนี้" ${fmt(today!.price)} = X ${fmt(X)}`).toBe(X);
    });
    await gf.check('E3 ป้ายสอดคล้องกับ X เทียบ Lo–Hi และป้ายแบบย่อ = แบบขยาย', [exp.rangeLoc, exp.sentenceLoc, collapsed.loc], async () => {
      expectLabelConsistent(X, exp!.lo, exp!.hi, exp!.label, 'ป้ายในกล่องขยาย');
      expect.soft(collapsed.label, `ป้ายในประโยคแบบย่อ "${collapsed.label}" = ป้ายในกล่องขยาย "${exp!.label}"`).toBe(exp!.label);
    });
  });

  let swBefore = { aria: '', checked: null as string | null, label: '' };
  await test.step('6. ในส่วน "ติดตามราคา" จดป้ายบนสวิตช์ตัวแรกและ aria (aria-checked + "ออกเดินทางวันที่ …")', async () => {
    const t = await readTrack(page);
    swBefore = t;
    note(`สวิตช์ติดตามราคา: ป้าย "${t.label}" · aria "${t.aria}" · aria-checked=${t.checked}`);
    await gf.check('E4 สวิตช์ระบุ 15 ธ.ค. · aria มี 2026-12-15 · aria-checked = false', [trackLabel(page), t.sw], async () => {
      expect.soft(t.label, 'ป้ายบนสวิตช์ = 15 ธ.ค.').toBe(thShort(D_DATE));
      expect.soft(t.aria, 'aria ของสวิตช์มี "2026-12-15"').toContain(D_DATE);
      await expect.soft(t.sw, 'aria-checked = false ก่อนกด').toHaveAttribute('aria-checked', 'false');
    });
  });

  await test.step('7. กดสวิตช์วันที่ 1 ครั้ง · snapshot + screenshot ป๊อปอัปที่ขึ้น', async () => {
    await safeClick(gf, trackSwitch(page), { key: 'Space' });
    const dlg = signInDialog(page);
    await dlg.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await snap(page, 'ขั้น 7 ป๊อปอัปหลังกดสวิตช์');
    await shot(page, 'ขั้น 7 ป๊อปอัปหลังกดสวิตช์');
    await gf.check('E5 มีป๊อปอัปขอให้ลงชื่อเข้าใช้ (ปุ่มลงชื่อเข้าใช้ + ปุ่มปิด)', dlg, async () => {
      await expect.soft(dlg, 'ป๊อปอัป "ลงชื่อเข้าใช้เพื่อติดตามราคา" ขึ้น').toBeVisible();
      await expect.soft(
        dlg.getByRole('link', { name: /^ลงชื่อเข้าใช้$/ }).or(dlg.getByRole('button', { name: /^ลงชื่อเข้าใช้$/ })).first(),
        'มีปุ่มลงชื่อเข้าใช้').toBeVisible();
      await expect.soft(dlg.getByRole('button', { name: 'ปิด' }), 'มีปุ่มปิด').toBeVisible();
    });
  });

  await test.step('8. กด "ปิด" ในป๊อปอัป (ถ้าไม่มีปุ่มปิดให้กด Esc) ห้ามกด "ลงชื่อเข้าใช้" หรือลิงก์ใด ๆ ในป๊อปอัป', async () => {
    const close = signInDialog(page).getByRole('button', { name: 'ปิด' });
    if (await close.isVisible().catch(() => false)) await gf.click(close);
    else await gf.press('Escape');
  });

  await test.step('9. snapshot: อ่าน aria-checked ของสวิตช์, URL, หัวผลลัพธ์ และราคาบนแท็บอีกครั้ง', async () => {
    await snap(page, 'ขั้น 9 หลังปิดป๊อปอัป');
    const t = await readTrack(page);
    const X2 = await readTabPrice(page);
    const url = page.url();
    note(`หลังปิด: aria-checked=${t.checked} · URL ${url} · X = ${fmt(X2)}`);
    await gf.check('E6 หลังปิด: ป๊อปอัปหาย · ไม่ค้าง checked · URL เดิม · หัวผลลัพธ์และ X ไม่เปลี่ยน', [t.sw, searchForm(page), cheapestTab(page)], async () => {
      await expect.soft(signInDialog(page), 'ป๊อปอัปลงชื่อเข้าใช้หายไป').toBeHidden();
      await expect.soft(t.sw, 'สวิตช์ aria-checked = false (ไม่ค้าง checked)').toHaveAttribute('aria-checked', 'false');
      expect.soft(url, 'ไม่ไป accounts.google.com').not.toMatch(/accounts\.google\.com/);
      if (/\/travel\/flights\/search/.test(startUrl)) {
        expect.soft(url, 'URL ยังเป็น google.com/travel/flights/search…').toMatch(/^https:\/\/www\.google\.com\/travel\/flights\/search/);
      } else {
        expect.soft(url, `URL ยังเป็นหน้าผลลัพธ์เดิม (U1 ที่ใช้ไม่ใช่ /search: ${startUrl})`).toBe(startUrl);
      }
      await expectHeader(page, D_DATE);
      expect.soft(X2, `X ไม่เปลี่ยน (${fmt(X)} → ${fmt(X2)})`).toBe(X);
      expect.soft(t.label, 'ป้ายสวิตช์ยังเป็นวันเดิม').toBe(swBefore.label);
    });
  });

  gf.finishNA();
});

test('TC-PRC-02 · ตารางวันที่และกราฟราคา: ราคา ไฮไลต์ ✦ ยกเลิก/ตกลง', {
  tag: ['@P2', '@5.4'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 3) ตารางมีแถววันที่เพียงแถวเดียว (ไม่มีแกนวันกลับ) ช่องเป็นวันออกเดินทางติดกันเรียงจากเก่าไปใหม่ไม่ข้ามวัน (R93)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 3) ช่อง 15 ธ.ค. อยู่ในสถานะเลือกแล้ว (เพียงช่องเดียว) และสรุปท้ายป๊อปอัป = 15 ธ.ค. · ราคา X · เที่ยวเดียว (R97)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 2–3) ราคาทุกช่องในตาราง = ราคาปฏิทินของวันเดียวกัน ที่ความละเอียดของช่องปฏิทิน และช่อง 15 ธ.ค. = X (R94)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 3–4) ทุกช่องที่มี ✦ มีราคา = ค่าต่ำสุดของช่องที่แสดงในขณะนั้น และไม่มีช่องใดถูกกว่าช่อง ✦ · หลังกด > ตำแหน่ง ✦ ยังเป็นไปตามกฎนี้กับชุดช่องใหม่ (R96)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 5) คลิก D-PRC-ALT แล้วสรุปท้ายป๊อปอัปเปลี่ยนเป็นวัน D-PRC-ALT และราคาของช่องนั้น (R95)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 6) หลัง "ยกเลิก": ช่อง "ขาไป" = อังคาร 15 ธ.ค. · ราคาแท็บ = X · สวิตช์ = 15 ธ.ค. · tfs ใน URL = U1 (ไม่มีการค้นหาเกิดขึ้น) (R95)' },
    { type: 'คาดหวัง', description: 'E7: (ขั้น 7) แท่ง 15 ธ.ค. ไฮไลต์ต่างจากแท่งอื่น และ tooltip ที่ค้างระบุ 15 ธ.ค. กับราคา X (R97)' },
    { type: 'คาดหวัง', description: 'E8: (ขั้น 7) tooltip ทุกแท่งที่ hover มีราคา = ราคาในตารางของวันเดียวกัน (R94)' },
    { type: 'คาดหวัง', description: 'E9: (ขั้น 9) หลัง "ตกลง": หัวผลลัพธ์ยังเป็น เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว และวันที่ = D-PRC-ALT · ช่อง "ขาไป" = D-PRC-ALT · tfs ใน URL ต่างจาก U1 · Y = ราคาของ D-PRC-ALT ในตาราง/กราฟ (R95 R94 · จุดเทียบ R43)' },
    { type: 'คาดหวัง', description: 'E10: (ขั้น 9) ป้ายสวิตช์ติดตามราคา = D-PRC-ALT และ aria มีวันที่ ISO ของ D-PRC-ALT (R102) · ราคาในกล่องข้อมูลเชิงลึก = Y (R89)' },
    { type: 'คาดหวัง', description: 'E11: (ขั้น 10) ช่องที่เลือกแล้วในตาราง = D-PRC-ALT และสรุปท้าย = D-PRC-ALT · Y (R97)' },
    { type: 'ที่มา', description: 'plan/5.4-เครื่องมือราคาและวันที่.md · TC-PRC-02 · R93 R94 R95 R96 R97 R89 R102 (+R43 จุดเทียบ) · Invariant/Metamorphic · State · [R]' },
    { type: 'งบค้นหา', description: '2' },
  ],
}, async ({ page, gf }) => {
  const U1 = getU1();
  let X: number | null = null;
  let startUrl = '';
  const calMap = new Map<string, CalRead>();
  let unit = 10;
  const gridPrices = new Map<string, number>();
  let alt = '';
  let altPrice: number | null = null;
  const graphPrices = new Map<string, number | null>();

  await test.step('1. เปิด U1 (ค้นหาครั้งที่ 1) ตรวจหัวผลลัพธ์ตามโจทย์ จดราคาแท็บ "ถูกที่สุด เริ่มต้น ฿X"', async () => {
    await gf.goto(U1, { search: 'เปิด U1' });
    await ensureResults(gf, page, 'เปิด U1');
    X = await readTabPrice(page);
    startUrl = page.url();
    note(`X = ${fmt(X)} · URL เริ่มต้น ${startUrl}`);
    await gf.check('ตั้งต้น หัวผลลัพธ์ตรงโจทย์ U1 (15 ธ.ค.)', searchForm(page), async () => { await expectHeader(page, D_DATE); });
  });

  await test.step('2. คลิกช่อง "ขาไป" จดราคาปฏิทินวันที่ 11–20 ธ.ค. แล้วกด Esc', async () => {
    const cal = await openCalendar(gf, page);
    const days = Array.from({ length: 10 }, (_, i) => addDays('2026-12-11', i));
    // ราคาในช่องปฏิทินโหลดตามหลังการเปิด → รอให้ทั้ง 10 ช่องมีราคาก่อนจด
    const reads = await readCalCells(cal, days);
    days.forEach((d, i) => calMap.set(d, reads[i]));
    unit = calUnit([...calMap.values()]);
    note(`ปฏิทิน 11–20 ธ.ค.: ${days.map((d) => `${thShort(d)} ${fmt(calMap.get(d)!.display)}`).join(' · ')} · ความละเอียดช่อง ฿${unit}`);
    await shot(page, 'ขั้น 2 ปฏิทิน 11–20 ธ.ค.');
    await closeCalendarEsc(gf, page);
  });

  await test.step('3. กดปุ่ม "ตารางวันที่" · snapshot + screenshot: จดจำนวนแถววันที่ หัวคอลัมน์ทุกช่อง ราคาทุกช่อง ช่องที่มี ✦ ช่องที่อยู่ในสถานะเลือกแล้ว และข้อความสรุปท้ายป๊อปอัป', async () => {
    const dlg = await openGrid(gf, page);
    const cells = await readGrid(dlg);
    for (const c of cells) if (c.price != null) gridPrices.set(c.iso, c.price);
    const sum = await readSummary(dlg);
    await snap(page, 'ขั้น 3 ตารางวันที่');
    await shot(page, 'ขั้น 3 ตารางวันที่');
    note(`ตาราง: ${cells.map((c) => `${c.header} ${fmt(c.price)}${c.star ? '✦' : ''}${c.selected ? '[เลือก]' : ''}`).join(' · ')} · สรุป "${sum.text}"`);

    await gf.check('E1 ตารางมีแถวเดียว วันติดกันเรียงเก่า→ใหม่', gridPanel(dlg), async () => {
      expect.soft(cells.length, 'มีช่องวันที่ในตาราง').toBeGreaterThan(1);
      const ys = cells.map((c) => c.y).filter((y) => !Number.isNaN(y));
      expect.soft(ys.length > 0 && Math.max(...ys) - Math.min(...ys) <= 6,
        `ปุ่มราคาทุกช่องอยู่แถวเดียว ไม่มีแกนวันกลับ (y: ${ys.map((y) => Math.round(y)).join(',')})`).toBe(true);
      const allBtns = await gridPanel(dlg).getByRole('button', { name: /^฿\s*[\d,]+/ }).count();
      expect.soft(allBtns, `จำนวนปุ่มราคา ${allBtns} = จำนวนหัวคอลัมน์วันที่ ${cells.length} (แถวเดียว)`).toBe(cells.length);
      for (let i = 1; i < cells.length; i++) {
        expect.soft(diffDays(cells[i].iso, cells[i - 1].iso), `${cells[i - 1].header} → ${cells[i].header} ติดกัน ไม่ข้ามวัน`).toBe(1);
      }
    });
    await gf.check('E2 ช่อง 15 ธ.ค. เลือกแล้วช่องเดียว และสรุปท้าย = 15 ธ.ค. · X · เที่ยวเดียว', [cells.find((c) => c.selected)?.btn ?? gridPanel(dlg), sum.loc], async () => {
      const sel = cells.filter((c) => c.selected);
      expect.soft(sel.map((c) => c.iso), 'ช่องที่เลือกแล้ว = 15 ธ.ค. เพียงช่องเดียว').toEqual([D_DATE]);
      expect.soft(sum.iso, `สรุปท้ายป๊อปอัป "${sum.text}" วันที่ = 15 ธ.ค.`).toBe(D_DATE);
      expect.soft(sum.price, `สรุปท้ายป๊อปอัป ราคา = X ${fmt(X)}`).toBe(X);
      expect.soft(sum.type, 'สรุปท้ายป๊อปอัป = เที่ยวเดียว').toBe('เที่ยวเดียว');
    });
    await gf.check('E3 ราคาทุกช่องในตาราง = ปฏิทินวันเดียวกัน และช่อง 15 ธ.ค. = X', gridPanel(dlg), async () => {
      for (const c of cells) {
        const cr = calMap.get(c.iso);
        expect.soft(!!cr, `มีราคาปฏิทินของ ${c.header} (จดไว้ 11–20 ธ.ค.)`).toBe(true);
        if (!cr) continue;
        expect.soft(sameAtCell(cr, unit, c.price),
          `${c.header}: ตาราง ${fmt(c.price)} = ปฏิทิน ${fmt(cr.display)} ที่ความละเอียดช่อง ฿${cellUnit(cr, unit)}`).toBe(true);
      }
      expect.soft(gridPrices.get(D_DATE), `ช่อง 15 ธ.ค. ในตาราง = X ${fmt(X)}`).toBe(X);
    });
    await gf.check('E4 ✦ = ราคาต่ำสุดของช่องที่แสดง (ชุดแรก)', cells.filter((c) => c.star).map((c) => c.btn), async () => {
      const prices = cells.map((c) => c.price).filter((p): p is number => p != null);
      const min = Math.min(...prices);
      const stars = cells.filter((c) => c.star);
      expect.soft(stars.length, 'มีช่อง ✦ อย่างน้อย 1 ช่อง').toBeGreaterThan(0);
      for (const s of stars) expect.soft(s.price, `✦ ${s.header} ${fmt(s.price)} = ต่ำสุดที่แสดง ${fmt(min)}`).toBe(min);
      const starMin = stars.length ? Math.min(...stars.map((s) => s.price ?? Infinity)) : Infinity;
      for (const c of cells) expect.soft((c.price ?? Infinity) >= starMin, `${c.header} ${fmt(c.price)} ไม่ถูกกว่าช่อง ✦`).toBe(true);
    });
  });

  await test.step('4. กด > 1 ครั้ง รอราคาโหลด จดช่วงวันที่แสดง ราคา และตำแหน่ง ✦ ใหม่ แล้วกด < 1 ครั้งกลับ', async () => {
    const dlg = priceDlg(page);
    await gf.click(dlg.getByRole('button', { name: 'เลื่อนไปทางขวา' }));
    const cells = await readGrid(dlg);
    for (const c of cells) if (c.price != null && !gridPrices.has(c.iso)) gridPrices.set(c.iso, c.price);
    note(`หลังกด >: ${cells.map((c) => `${c.header} ${fmt(c.price)}${c.star ? '✦' : ''}`).join(' · ')}`);
    await gf.check('E4 ✦ หลังกด > ยังเป็นราคาต่ำสุดของชุดช่องใหม่', cells.filter((c) => c.star).map((c) => c.btn), async () => {
      const prices = cells.map((c) => c.price).filter((p): p is number => p != null);
      const min = Math.min(...prices);
      const stars = cells.filter((c) => c.star);
      expect.soft(stars.length, 'มีช่อง ✦ อย่างน้อย 1 ช่อง').toBeGreaterThan(0);
      for (const s of stars) expect.soft(s.price, `✦ ${s.header} ${fmt(s.price)} = ต่ำสุดที่แสดง ${fmt(min)}`).toBe(min);
      const starMin = stars.length ? Math.min(...stars.map((s) => s.price ?? Infinity)) : Infinity;
      for (const c of cells) expect.soft((c.price ?? Infinity) >= starMin, `${c.header} ${fmt(c.price)} ไม่ถูกกว่าช่อง ✦`).toBe(true);
    });
    await gf.click(dlg.getByRole('button', { name: 'เลื่อนไปทางซ้าย' }));
    await readGrid(dlg);
  });

  await test.step('5. เลือก D-PRC-ALT ตามนิยาม คลิกช่องนั้น จดข้อความสรุปท้ายป๊อปอัป แล้วกด "ยกเลิก"', async () => {
    const dlg = priceDlg(page);
    const cells = await readGrid(dlg);
    for (const c of cells) if (c.price != null) gridPrices.set(c.iso, c.price);
    const p15 = gridPrices.get(D_DATE);
    // D-PRC-ALT: วันแรกหลัง 15 ธ.ค. ที่ราคาต่าง → ถ้าไม่มี วันแรกก่อน 15 ธ.ค. ที่ราคาต่าง → ถ้าทุกวันเท่ากัน ใช้ 16 ธ.ค.
    for (const k of [1, 2, 3, -1, -2, -3]) {
      const d = addDays(D_DATE, k);
      const p = gridPrices.get(d);
      if (p != null && p !== p15) { alt = d; break; }
    }
    if (!alt) alt = addDays(D_DATE, 1);
    altPrice = gridPrices.get(alt) ?? null;
    note(`D-PRC-ALT = ${thShort(alt)} (${alt}) ราคาในตาราง ${fmt(altPrice)}`);
    const cell = cells.find((c) => c.iso === alt);
    expect(cell, `ช่อง D-PRC-ALT ${thShort(alt)} อยู่ในตารางที่แสดง`).toBeTruthy();
    await clickGridCell(gf, dlg, cell!);
    const sum = await readSummary(dlg);
    note(`สรุปท้ายหลังคลิก D-PRC-ALT: "${sum.text}"`);
    await gf.check('E5 คลิก D-PRC-ALT แล้วสรุปท้ายเปลี่ยนเป็นวันและราคาของช่องนั้น', [cell!.btn, sum.loc], async () => {
      expect.soft(sum.iso, `สรุปท้าย "${sum.text}" = ${thShort(alt)}`).toBe(alt);
      expect.soft(sum.price, `สรุปท้ายราคา = ราคาช่อง ${fmt(altPrice)}`).toBe(altPrice);
    });
    await cancelDlg(gf, page);
  });

  await test.step('6. snapshot: อ่านช่อง "ขาไป", ราคาแท็บ, ป้ายสวิตช์ติดตามราคา และ URL (เทียบ tfs กับ U1)', async () => {
    await snap(page, 'ขั้น 6 หลังยกเลิก');
    const Xn = await readTabPrice(page);
    const t = await readTrack(page);
    const url = page.url();
    note(`หลังยกเลิก: ขาไป "${await departBox(page).inputValue().catch(() => '')}" · X ${fmt(Xn)} · สวิตช์ "${t.label}" · URL ${url}`);
    await gf.check('E6 หลังยกเลิก: ขาไป 15 ธ.ค. · X เดิม · สวิตช์ 15 ธ.ค. · tfs = U1', [departBox(page), cheapestTab(page), trackLabel(page)], async () => {
      await expect.soft(departBox(page), 'ขาไป = อังคาร 15 ธ.ค.').toHaveValue(thWd(D_DATE));
      expect.soft(Xn, `ราคาแท็บ = X ${fmt(X)}`).toBe(X);
      expect.soft(t.label, 'ป้ายสวิตช์ = 15 ธ.ค.').toBe(thShort(D_DATE));
      expect.soft(t.aria, 'aria สวิตช์มี 2026-12-15').toContain(D_DATE);
      const want = tfsOf(U1) ?? tfsOf(startUrl);
      if (want) expect.soft(tfsOf(url), 'tfs ใน URL = U1 (ไม่มีการค้นหาเกิดขึ้น)').toBe(want);
      else expect.soft(url, 'URL = URL หลังเปิด U1 (ไม่มีการค้นหาเกิดขึ้น)').toBe(startUrl);
    });
  });

  await test.step('7. กดปุ่ม "กราฟราคา" · screenshot: แท่งที่ไฮไลต์และ tooltip ที่ค้างอยู่ · hover แท่ง D-PRC-ALT และอีก 2 วันใน D-PRC-WIN จด tooltip (วัน + "เริ่มที่ ฿…") จาก screenshot', async () => {
    const dlg = await openGraph(gf, page);
    // พักเมาส์ไว้บนแท็บ "กราฟราคา" เพื่อไม่ให้ไปค้างบนแท่งใดแท่งหนึ่ง
    await dlg.getByRole('tab', { name: 'กราฟราคา' }).hover().catch(() => {});
    await gf.pause(1500, 2500);
    await shot(page, 'ขั้น 7 กราฟราคา (แท่งไฮไลต์ + tooltip ค้าง)');
    const pinned = await graphTooltips(dlg);
    const fills = await barFills(dlg);
    note(`tooltip ค้าง: ${pinned.map((p) => `${thShort(p.iso)} ${fmt(p.price)}`).join(' · ')}`);
    await gf.check('E7 แท่ง 15 ธ.ค. ไฮไลต์ต่างจากแท่งอื่น และ tooltip ค้าง = 15 ธ.ค. · X', [graphBar(dlg, D_DATE), dlg.getByText(/^เริ่มที่ ฿/).first()], async () => {
      const f15 = fills.find((f) => f.iso === D_DATE)?.fill;
      expect.soft(f15, 'มีแท่ง 15 ธ.ค. ในกราฟ').toBeTruthy();
      const others = fills.filter((f) => f.iso !== D_DATE);
      expect.soft(others.length > 0 && others.every((f) => f.fill !== f15), `แท่ง 15 ธ.ค. (สี ${f15}) ต่างจากแท่งอื่นทุกแท่ง`).toBe(true);
      const p = pinned.find((x) => x.iso === D_DATE);
      expect.soft(p, 'tooltip ที่ค้างระบุ 15 ธ.ค.').toBeTruthy();
      expect.soft(p?.price, `tooltip ที่ค้างราคา = X ${fmt(X)}`).toBe(X);
    });
    const order = [1, -1, 2, -2, 3, -3].map((k) => addDays(D_DATE, k)).filter((d) => d !== alt && gridPrices.has(d));
    const targets = [alt, ...order.slice(0, 2)];
    for (const d of targets) {
      graphPrices.set(d, await hoverBar(gf, dlg, d));
      await shot(page, `ขั้น 7 hover แท่ง ${thShort(d)}`);
    }
    note(`tooltip ที่ hover: ${targets.map((d) => `${thShort(d)} ${fmt(graphPrices.get(d))}`).join(' · ')}`);
    await gf.check('E8 tooltip ทุกแท่งที่ hover = ราคาในตารางวันเดียวกัน', targets.map((d) => graphBar(dlg, d)), async () => {
      for (const d of targets) {
        expect.soft(graphPrices.get(d), `${thShort(d)}: tooltip ${fmt(graphPrices.get(d))} = ตาราง ${fmt(gridPrices.get(d))}`).toBe(gridPrices.get(d));
      }
    });
  });

  await test.step('8. คลิกแท่ง D-PRC-ALT แล้วกด "ตกลง" (ค้นหาครั้งที่ 2) รอ ≥ 10 วินาที เลื่อนขึ้นบนสุด', async () => {
    const dlg = priceDlg(page);
    const bar = graphBar(dlg, alt);
    // คลิกใกล้ฐานแท่ง (ไม่ชน tooltip ที่ลอยเหนือแท่ง) แล้วพักเมาส์ไว้บนแท็บ ให้เหลือแต่ tooltip ของแท่งที่เลือกค้างอยู่
    for (let attempt = 0; attempt < 2; attempt++) {
      const box = await bar.boundingBox().catch(() => null);
      await forceClick(gf, bar, box ? { x: box.width / 2, y: Math.max(1, attempt ? box.height / 2 : box.height - 3) } : undefined);
      await dlg.getByRole('tab', { name: 'กราฟราคา' }).hover().catch(() => {});
      await gf.pause(1500, 2500);
      if ((await graphTooltips(dlg)).some((p) => p.iso === alt)) break;
    }
    note(`หลังคลิกแท่ง: tooltip ${(await graphTooltips(dlg)).map((p) => `${thShort(p.iso)} ${fmt(p.price)}`).join(' · ')}`);
    await gf.click(dlg.getByRole('button', { name: 'ตกลง' }), { search: `กด "ตกลง" ในกราฟราคา → ${thShort(alt)}` });
    await scrollTop(gf, page);
    await ensureResults(gf, page, `กด "ตกลง" (${thShort(alt)})`);
  });

  let Y: number | null = null;
  await test.step('9. snapshot: อ่านหัวผลลัพธ์ ช่อง "ขาไป" ราคาแท็บ (เรียก Y) ป้าย/aria สวิตช์ติดตามราคา URL และราคาในกล่องข้อมูลเชิงลึก (กด "ดูประวัติราคา" ถ้าจำเป็น)', async () => {
    await snap(page, 'ขั้น 9 หลังตกลง');
    Y = await readTabPrice(page);
    const url = page.url();
    note(`หลังตกลง: Y = ${fmt(Y)} · URL ${url}`);
    await gf.check('E9 หัวผลลัพธ์ = D-PRC-ALT · tfs ต่างจาก U1 · Y = ราคา D-PRC-ALT ในตาราง/กราฟ', [searchForm(page), cheapestTab(page)], async () => {
      await expectHeader(page, alt);
      const u1tfs = tfsOf(U1) ?? tfsOf(startUrl);
      expect.soft(tfsOf(url), 'มี tfs ใน URL').toBeTruthy();
      expect.soft(tfsOf(url), 'tfs ใน URL ต่างจาก U1').not.toBe(u1tfs);
      expect.soft(Y, `Y = ราคา D-PRC-ALT ในตาราง ${fmt(gridPrices.get(alt))}`).toBe(gridPrices.get(alt));
      expect.soft(Y, `Y = ราคา D-PRC-ALT ในกราฟ ${fmt(graphPrices.get(alt))}`).toBe(graphPrices.get(alt));
    });
    const t = await readTrack(page);
    await expandInsights(gf, page);
    const ins = await readInsightExpanded(page);
    note(`สวิตช์ "${t.label}" aria "${t.aria}" · ข้อมูลเชิงลึก "${ins.sentenceText}"`);
    await gf.check('E10 สวิตช์ = D-PRC-ALT (aria ISO) · ราคาข้อมูลเชิงลึก = Y', [trackLabel(page), t.sw, ins.sentenceLoc], async () => {
      expect.soft(t.label, `ป้ายสวิตช์ = ${thShort(alt)}`).toBe(thShort(alt));
      expect.soft(t.aria, `aria สวิตช์มี ${alt}`).toContain(alt);
      expect.soft(ins.price, `ราคาในกล่องข้อมูลเชิงลึก = Y ${fmt(Y)}`).toBe(Y);
    });
  });

  await test.step('10. กด "ตารางวันที่" อีกครั้ง จดช่องที่อยู่ในสถานะเลือกแล้วและสรุปท้ายป๊อปอัป แล้วกด "ยกเลิก"', async () => {
    const dlg = await openGrid(gf, page);
    const cells = await readGrid(dlg);
    const sum = await readSummary(dlg);
    note(`ตารางหลังตกลง: ${cells.map((c) => `${c.header} ${fmt(c.price)}${c.selected ? '[เลือก]' : ''}`).join(' · ')} · สรุป "${sum.text}"`);
    await gf.check('E11 ช่องที่เลือก = D-PRC-ALT และสรุปท้าย = D-PRC-ALT · Y', [cells.find((c) => c.selected)?.btn ?? gridPanel(dlg), sum.loc], async () => {
      expect.soft(cells.filter((c) => c.selected).map((c) => c.iso), `ช่องที่เลือกแล้ว = ${thShort(alt)}`).toEqual([alt]);
      expect.soft(sum.iso, `สรุปท้าย = ${thShort(alt)}`).toBe(alt);
      expect.soft(sum.price, `สรุปท้ายราคา = Y ${fmt(Y)}`).toBe(Y);
    });
    await cancelDlg(gf, page);
  });

  gf.finishNA();
});

test('TC-PRC-03 · ⚠️ การ์ดวันที่ถูกกว่า: ขึ้นสม่ำเสมอ และ "เปลี่ยนวันที่" พาไปวันที่แนะนำ', {
  tag: ['@P2', '@5.4', '@known-defect'],
  annotation: [
    { type: 'กฎร่วม', description: 'กฎร่วม (R99) สำหรับวันค้นหา d ใด ๆ ที่มีราคาแท็บ P: ให้ m = ราคาต่ำสุดในตารางของวันใน D-PRC-WIN ของ d โดยไม่นับ d เอง · ถ้า m < P → ต้องมีการ์ดวันที่ถูกกว่า · ถ้า m ≥ P → ข้อนั้นเป็น N/A (ไม่ใช่ล้ม)' },
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2–3) ใช้กฎร่วมกับ d = 15 ธ.ค., P = P1 (R99)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 5–6) ใช้กฎร่วมกับ d = 31 ธ.ค., P = P2 (R99)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 6) ถ้ามีการ์ดที่ 31 ธ.ค.: หลังกด "เปลี่ยนวันที่" ต้องได้วัน D-PRC-CARD อย่างใดอย่างหนึ่ง: ค้นหาใหม่เป็นวัน D-PRC-CARD ทันที หรือเปิดตารางโดยช่องที่เลือกแล้ว = D-PRC-CARD และสรุปท้ายป๊อปอัป = D-PRC-CARD กับราคาบนการ์ด · ถ้าช่องที่เลือกยังเป็น 31 ธ.ค. = ล้ม · ถ้าไม่มีการ์ด = N/A (R101)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 7–8) ใช้กฎร่วมกับ d = D-PRC-3RD, P = P3 (R99)' },
    { type: 'ที่มา', description: 'plan/5.4-เครื่องมือราคาและวันที่.md · TC-PRC-03 · R99 ⚠️ R101 ⚠️ · Invariant/Metamorphic · Equivalence partition · State · [R]' },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, gf }) => {
  const U1 = getU1();

  /** กฎร่วม R99 → gf.check หรือ gf.na */
  async function applyR99(label: string, d: string, P: number | null, win: Map<string, number>, card: Card, targets: Locator[]) {
    const others = winDays(d).filter((x) => x !== d && win.has(x)).map((x) => ({ iso: x, p: win.get(x)! }));
    const m = others.length ? Math.min(...others.map((o) => o.p)) : null;
    note(`${label}: d = ${thShort(d)} · P = ${fmt(P)} · ราคา D-PRC-WIN: ${others.map((o) => `${thShort(o.iso)} ${fmt(o.p)}`).join(' · ')} · m = ${fmt(m)} · การ์ด ${card.present ? `มี ("${card.text}")` : 'ไม่มี'}`);
    if (m != null && P != null && m >= P) {
      gf.na(label, `m ${fmt(m)} ≥ P ${fmt(P)} (ไม่มีวันใกล้ ๆ ที่ถูกกว่า ${thShort(d)}) → N/A ตามกฎร่วม`);
      return;
    }
    await gf.check(label, targets, async () => {
      expect.soft(P, `อ่านราคาแท็บ P ของ ${thShort(d)} ได้`).not.toBeNull();
      expect.soft(others.length, `อ่านราคาวันใน D-PRC-WIN ของ ${thShort(d)} (ไม่นับ d) จากตารางได้`).toBeGreaterThan(0);
      expect.soft(card.present, `m ${fmt(m)} < P ${fmt(P)} → ต้องมีการ์ดวันที่ถูกกว่าที่ ${thShort(d)}`).toBe(true);
    });
  }

  let P1: number | null = null;
  let card1: Card = { present: false, loc: page.locator('body'), text: '', iso: null, price: null };
  await test.step('1. เปิด U1 (ค้นหาครั้งที่ 1) ตรวจหัวผลลัพธ์ จดราคาแท็บ P1', async () => {
    await gf.goto(U1, { search: 'เปิด U1' });
    P1 = await readTabPrice(page);
    note(`P1 = ${fmt(P1)}`);
    await gf.check('ตั้งต้น หัวผลลัพธ์ตรงโจทย์ U1 (15 ธ.ค.)', searchForm(page), async () => { await expectHeader(page, D_DATE); });
  });

  await test.step('2. snapshot ก่อนคลิกอะไร: หาการ์ดวันที่ถูกกว่าใต้ปุ่ม "ตารางวันที่" จดว่ามี/ไม่มี และวัน/ราคาบนการ์ด · screenshot', async () => {
    await page.getByRole('button', { name: 'ตารางวันที่', exact: true }).scrollIntoViewIfNeeded().catch(() => {});
    card1 = await readCard(page);
    await snap(page, 'ขั้น 2 การ์ดวันที่ถูกกว่า (15 ธ.ค.)');
    await shot(page, 'ขั้น 2 การ์ดวันที่ถูกกว่า (15 ธ.ค.)');
    note(`การ์ดที่ 15 ธ.ค.: ${card1.present ? `มี "${card1.text}"` : 'ไม่มี'}`);
  });

  await test.step('3. กดปุ่ม "ตารางวันที่" จดราคาทุกวันใน D-PRC-WIN ของ 15 ธ.ค. (กด < > ถ้าเห็นไม่ครบ) แล้วกด "ยกเลิก"', async () => {
    const dlg = await openGrid(gf, page);
    const win = new Map<string, number>();
    await collectWindow(gf, dlg, D_DATE, win, { n: 0 });
    await applyR99('E1 กฎร่วม R99 ที่ 15 ธ.ค. (มีวันใกล้ถูกกว่า ⇒ มีการ์ด)', D_DATE, P1, win, card1, [gridPanel(dlg)]);
    await cancelDlg(gf, page);
  });

  let P2: number | null = null;
  let card2: Card = card1;
  await test.step('4. คลิกช่อง "ขาไป" ลบข้อความเดิม พิมพ์ "31 ธ.ค. 2026" กด Enter แล้วกด "เสร็จ" (ค้นหาครั้งที่ 2) รอ ≥ 10 วินาที ตรวจหัวผลลัพธ์ = พฤหัส 31 ธ.ค. จดราคาแท็บ P2', async () => {
    await typeDateAndDone(gf, page, '31 ธ.ค. 2026', 'พิมพ์ "31 ธ.ค. 2026" + เสร็จ');
    P2 = await readTabPrice(page);
    note(`P2 = ${fmt(P2)}`);
    await gf.check('ตั้งต้น หัวผลลัพธ์ = พฤหัส 31 ธ.ค.', searchForm(page), async () => { await expectHeader(page, D_HIGH); });
  });

  await test.step('5. ทำซ้ำขั้น 2 (จด D-PRC-CARD ถ้ามีการ์ด)', async () => {
    await page.getByRole('button', { name: 'ตารางวันที่', exact: true }).scrollIntoViewIfNeeded().catch(() => {});
    card2 = await readCard(page);
    await snap(page, 'ขั้น 5 การ์ดวันที่ถูกกว่า (31 ธ.ค.)');
    await shot(page, 'ขั้น 5 การ์ดวันที่ถูกกว่า (31 ธ.ค.)');
    note(`การ์ดที่ 31 ธ.ค.: ${card2.present ? `มี "${card2.text}" → D-PRC-CARD = (${card2.iso}, ${fmt(card2.price)})` : 'ไม่มี'}`);
  });

  let d3 = D_PRC_3RD_FALLBACK;
  let cardSearched = false;
  let card3: Card | null = null;
  await test.step('6. ถ้ามีการ์ด: กด "เปลี่ยนวันที่" บนการ์ด · snapshot + screenshot: จดว่าเกิดการค้นหาใหม่หรือเปิดป๊อปอัปตาราง ถ้าเปิดตาราง จดช่องที่อยู่ในสถานะเลือกแล้วและสรุปท้ายป๊อปอัป แล้วจดราคาทุกวันใน D-PRC-WIN ของ 31 ธ.ค. · ถ้าไม่มีการ์ด: กดปุ่ม "ตารางวันที่" จดราคาใน D-PRC-WIN', async () => {
    const win31 = new Map<string, number>();
    const dlg = priceDlg(page);
    if (card2.present && card2.iso) {
      d3 = card2.iso;
      const before = page.url();
      await gf.click(page.getByRole('button', { name: 'เปลี่ยนวันที่' }));
      const opened = await dlg.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
      if (!opened && page.url() !== before) {
        cardSearched = true;
        await gf.searched(`กด "เปลี่ยนวันที่" บนการ์ดแล้วหน้าโหลดผลใหม่ (ค้นหาครั้งที่ 3 → ${thShort(card2.iso)})`);
        await scrollTop(gf, page);
      }
      await snap(page, 'ขั้น 6 หลังกด เปลี่ยนวันที่');
      await shot(page, 'ขั้น 6 หลังกด เปลี่ยนวันที่');
      if (opened) {
        const cells = await readGrid(dlg);
        const sum = await readSummary(dlg);
        const sel = cells.filter((c) => c.selected);
        note(`"เปลี่ยนวันที่" เปิดป๊อปอัปตาราง · ช่องที่เลือก ${sel.map((c) => c.header).join(', ') || '—'} · สรุป "${sum.text}"`);
        await gf.check('E3 หลังกด "เปลี่ยนวันที่" ได้วัน D-PRC-CARD (ช่องที่เลือก + สรุปท้าย)', [sel[0]?.btn ?? gridPanel(dlg), sum.loc], async () => {
          expect.soft(sel.map((c) => c.iso), `ช่องที่เลือกแล้ว = D-PRC-CARD ${thShort(card2.iso!)} (ถ้ายังเป็น 31 ธ.ค. = ล้ม)`).toEqual([card2.iso]);
          expect.soft(sum.iso, `สรุปท้าย "${sum.text}" = ${thShort(card2.iso!)}`).toBe(card2.iso);
          expect.soft(sum.price, `สรุปท้ายราคา = ราคาบนการ์ด ${fmt(card2.price)}`).toBe(card2.price);
        });
        await collectWindow(gf, dlg, D_HIGH, win31, { n: 0 });
      } else {
        note(`"เปลี่ยนวันที่" ${cardSearched ? 'ค้นหาใหม่ทันที' : 'ไม่เปิดตารางและไม่ค้นหา'}`);
        await gf.check('E3 หลังกด "เปลี่ยนวันที่" ค้นหาใหม่เป็นวัน D-PRC-CARD ทันที', [departBox(page)], async () => {
          expect.soft(cardSearched, 'เกิดการค้นหาใหม่ หรือเปิดตารางวันที่').toBe(true);
          await expect.soft(departBox(page), `ขาไป = ${thWd(card2.iso!)}`).toHaveValue(thWd(card2.iso!));
        });
        if (cardSearched) {
          // อยู่ที่ D-PRC-3RD แล้ว: อ่านการ์ดของวันนั้นก่อนคลิกอย่างอื่น (ใช้ในขั้น 8)
          await page.getByRole('button', { name: 'ตารางวันที่', exact: true }).scrollIntoViewIfNeeded().catch(() => {});
          card3 = await readCard(page);
          await shot(page, `ขั้น 8 การ์ดวันที่ถูกกว่า (${thShort(d3)})`);
        }
        const g = await openGrid(gf, page);
        await collectWindow(gf, g, D_HIGH, win31, { n: 0 });
      }
    } else {
      gf.na('E3 "เปลี่ยนวันที่" พาไปวัน D-PRC-CARD', 'ไม่มีการ์ดวันที่ถูกกว่าที่ 31 ธ.ค. → N/A ตามแผน');
      const g = await openGrid(gf, page);
      await collectWindow(gf, g, D_HIGH, win31, { n: 0 });
    }
    await applyR99('E2 กฎร่วม R99 ที่ 31 ธ.ค. (มีวันใกล้ถูกกว่า ⇒ มีการ์ด)', D_HIGH, P2, win31, card2, [gridPanel(priceDlg(page))]);
  });

  let P3: number | null = null;
  await test.step('7. ไปวันที่ D-PRC-3RD (ค้นหาครั้งที่ 3): ถ้าป๊อปอัปตารางเปิดอยู่และ D-PRC-3RD อยู่ในตาราง ให้คลิกช่องนั้นแล้วกด "ตกลง" · ไม่เช่นนั้นกด "ยกเลิก" แล้วพิมพ์วันในช่อง "ขาไป" แบบขั้น 4 · เลื่อนขึ้นบนสุด ตรวจหัวผลลัพธ์ = D-PRC-3RD จดราคาแท็บ P3', async () => {
    note(`D-PRC-3RD = ${thShort(d3)} (${d3})`);
    const dlg = priceDlg(page);
    if (cardSearched) {
      // "เปลี่ยนวันที่" ค้นหาเป็น D-PRC-CARD ไปแล้ว (นับเป็นการค้นหาครั้งที่ 3) → ไม่ค้นหาซ้ำ
      await cancelDlg(gf, page);
      await scrollTop(gf, page);
    } else {
      const open = await dlg.isVisible().catch(() => false);
      const cells = open ? await readGrid(dlg) : [];
      const cell = cells.find((c) => c.iso === d3 && c.price != null);
      if (open && cell) {
        await gf.click(cell.btn);
        await gf.click(dlg.getByRole('button', { name: 'ตกลง' }), { search: `กด "ตกลง" ในตารางวันที่ → D-PRC-3RD ${thShort(d3)}` });
        await scrollTop(gf, page);
      } else {
        await cancelDlg(gf, page);
        const dt = isoToDate(d3);
        await typeDateAndDone(gf, page, `${thShort(d3)} ${dt.getUTCFullYear()}`, `พิมพ์ "${thShort(d3)} ${dt.getUTCFullYear()}" + เสร็จ (D-PRC-3RD)`);
      }
    }
    P3 = await readTabPrice(page);
    note(`P3 = ${fmt(P3)}`);
    await gf.check(`ตั้งต้น หัวผลลัพธ์ = D-PRC-3RD ${thShort(d3)}`, searchForm(page), async () => { await expectHeader(page, d3); });
  });

  await test.step('8. ทำซ้ำขั้น 2 และขั้น 3 สำหรับ D-PRC-3RD (จดราคา D-PRC-WIN ของวันนั้น) แล้วกด "ยกเลิก"', async () => {
    if (!card3) {
      await page.getByRole('button', { name: 'ตารางวันที่', exact: true }).scrollIntoViewIfNeeded().catch(() => {});
      card3 = await readCard(page);
      await snap(page, `ขั้น 8 การ์ดวันที่ถูกกว่า (${thShort(d3)})`);
      await shot(page, `ขั้น 8 การ์ดวันที่ถูกกว่า (${thShort(d3)})`);
    }
    note(`การ์ดที่ ${thShort(d3)}: ${card3.present ? `มี "${card3.text}"` : 'ไม่มี'}`);
    const dlg = await openGrid(gf, page);
    const win = new Map<string, number>();
    await collectWindow(gf, dlg, d3, win, { n: 0 });
    await applyR99(`E4 กฎร่วม R99 ที่ D-PRC-3RD ${thShort(d3)} (มีวันใกล้ถูกกว่า ⇒ มีการ์ด)`, d3, P3, win, card3, [gridPanel(dlg)]);
    await cancelDlg(gf, page);
  });

  gf.finishNA();
});

test('TC-PRC-04 · ราคาบนการ์ดวันที่ถูกกว่า ป้าย "สูง" และช่วงราคาปกติ', {
  tag: ['@P2', '@5.4'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 4) ราคาในประโยคของกล่องขยาย = P (R89) และคำป้ายสอดคล้องกับ P เทียบ Lo31–Hi31: Lo ≤ P ≤ Hi → "ปกติ" · P > Hi → "สูง" · P < Lo → ไม่ใช่ "ปกติ" และไม่ใช่ "สูง" (R90)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 2) ประโยคใต้หัวระบุว่าช่วงราคาปกติอ้างอิงทริปที่คล้ายกันที่เดินทางสู่โตเกียว ไม่ใช่ประวัติของการค้นหานี้ [O-ยังไม่ยืนยัน] (R91)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 2, 4) Lo31–Hi31 = Lo15–Hi15 (ช่วงปกติไม่เปลี่ยนตามวันที่ค้นหา) [O-ยังไม่ยืนยัน] (R92) — ถ้าไม่เท่า บันทึกเป็นข้อสังเกตว่าพฤติกรรมเปลี่ยนจากวันสำรวจ ไม่ใช่ข้อบกพร่อง' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 5) Pc < P (R98)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 5) Dc ห่างจาก 31 ธ.ค. ไม่เกิน 3 วัน [O-ยังไม่ยืนยัน] (R100)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 6–7) ราคาปฏิทินของ Dc = Pc ที่ความละเอียดของช่องปฏิทิน และราคาช่อง Dc ในตาราง = Pc (R98) · ทุกช่อง ✦ มีราคา = ค่าต่ำสุดของช่องที่แสดง แม้ค่านั้นจะ > Hi31 (R96)' },
    { type: 'คาดหวัง', description: 'E7: (ขั้น 9) หัวผลลัพธ์และช่อง "ขาไป" = Dc (ส่วนอื่นเหมือนโจทย์) และ Q = Pc (R98)' },
    { type: 'คาดหวัง', description: 'E8: (ขั้น 10) ราคาในประโยคของกล่องขยาย = Q (R89) · คำป้ายสอดคล้องกับ Q เทียบ LoC–HiC ตามกฎ E1 (R90) · LoC–HiC = Lo15–Hi15 [O-ยังไม่ยืนยัน] (R92)' },
    { type: 'ที่มา', description: 'plan/5.4-เครื่องมือราคาและวันที่.md · TC-PRC-04 · R98 R100 R90 R91 R92 R96 R89 · Invariant/Metamorphic · Equivalence partition · State · [O-ยังไม่ยืนยัน] (E2 E3 E5 E8 บางส่วน)' },
    { type: 'งบค้นหา', description: '3 (2 ถ้าไม่มีการ์ด)' },
  ],
}, async ({ page, gf }) => {
  const U1 = getU1();
  let lo15: number | null = null;
  let hi15: number | null = null;
  let lo31: number | null = null;
  let hi31: number | null = null;
  let P: number | null = null;
  let card: Card = { present: false, loc: page.locator('body'), text: '', iso: null, price: null };
  let Dc = '';
  let Pc: number | null = null;
  let calDc: CalRead | null = null;
  let unit = 10;

  await test.step('1. เปิด U1 (ค้นหาครั้งที่ 1) ตรวจหัวผลลัพธ์', async () => {
    await gf.goto(U1, { search: 'เปิด U1' });
    await ensureResults(gf, page, 'เปิด U1');
    await readTabPrice(page);
    await gf.check('ตั้งต้น หัวผลลัพธ์ตรงโจทย์ U1 (15 ธ.ค.)', searchForm(page), async () => { await expectHeader(page, D_DATE); });
  });

  await test.step('2. กด "ดูประวัติราคา" จด Lo15–Hi15 และประโยคที่บอกที่มาของช่วงราคาปกติ · screenshot', async () => {
    await expandInsights(gf, page);
    const ins = await readInsightExpanded(page);
    lo15 = ins.lo; hi15 = ins.hi;
    note(`15 ธ.ค.: Lo15–Hi15 = ${fmt(lo15)}–${fmt(hi15)} · ประโยคที่มา "${ins.rangeText}"`);
    await shot(page, 'ขั้น 2 ข้อมูลเชิงลึก 15 ธ.ค.');
    await gf.check('E2 ช่วงปกติอ้างอิงทริปที่คล้ายกันที่เดินทางสู่โตเกียว [O]', ins.rangeLoc, async () => {
      expect.soft(ins.rangeText, 'ประโยคระบุ "ทริปที่คล้าย…"').toMatch(/ทริปที่คล้าย/);
      expect.soft(ins.rangeText, 'ประโยคระบุปลายทาง "โตเกียว"').toMatch(/โตเกียว/);
      expect.soft(ins.rangeText, 'ไม่ได้อ้างประวัติราคาของการค้นหานี้').not.toMatch(/ประวัติ|การค้นหานี้/);
    });
  });

  await test.step('3. คลิกช่อง "ขาไป" ลบข้อความเดิม พิมพ์ "31 ธ.ค. 2026" กด Enter แล้วกด "เสร็จ" (ค้นหาครั้งที่ 2) รอ ≥ 10 วินาที ตรวจหัวผลลัพธ์ = พฤหัส 31 ธ.ค. จดราคาแท็บ "ถูกที่สุด เริ่มต้น ฿P"', async () => {
    await typeDateAndDone(gf, page, '31 ธ.ค. 2026', 'พิมพ์ "31 ธ.ค. 2026" + เสร็จ');
    P = await readTabPrice(page);
    note(`P (31 ธ.ค.) = ${fmt(P)}`);
    await gf.check('ตั้งต้น หัวผลลัพธ์ = พฤหัส 31 ธ.ค.', searchForm(page), async () => { await expectHeader(page, D_HIGH); });
  });

  await test.step('4. กด "ดูประวัติราคา" จด Lo31–Hi31 คำป้าย และราคาในประโยค "฿… อยู่ในช่วงราคา …" · screenshot', async () => {
    await expandInsights(gf, page);
    const ins = await readInsightExpanded(page);
    lo31 = ins.lo; hi31 = ins.hi;
    note(`31 ธ.ค.: Lo31–Hi31 = ${fmt(lo31)}–${fmt(hi31)} · ประโยค "${ins.sentenceText}" · ป้าย "${ins.label}"`);
    await shot(page, 'ขั้น 4 ข้อมูลเชิงลึก 31 ธ.ค.');
    await gf.check('E1 ราคาในประโยค = P และป้ายสอดคล้องกับ P เทียบ Lo31–Hi31', [ins.sentenceLoc, ins.rangeLoc], async () => {
      expect.soft(ins.price, `ราคาในประโยค ${fmt(ins.price)} = P ${fmt(P)}`).toBe(P);
      expectLabelConsistent(P, lo31, hi31, ins.label, 'ป้าย 31 ธ.ค.');
    });
    await gf.check('E3 Lo31–Hi31 = Lo15–Hi15 [O]', ins.rangeLoc, async () => {
      expect.soft(lo31, `Lo31 ${fmt(lo31)} = Lo15 ${fmt(lo15)} (ถ้าไม่เท่า = ข้อสังเกต พฤติกรรมเปลี่ยนจากวันสำรวจ)`).toBe(lo15);
      expect.soft(hi31, `Hi31 ${fmt(hi31)} = Hi15 ${fmt(hi15)} (ถ้าไม่เท่า = ข้อสังเกต พฤติกรรมเปลี่ยนจากวันสำรวจ)`).toBe(hi15);
    });
  });

  await test.step('5. snapshot หาการ์ดวันที่ถูกกว่าใต้ปุ่ม "ตารางวันที่" (อย่ากดลิงก์ "เปลี่ยนวันที่" บนการ์ด) · ถ้ามี จด D-PRC-CARD = (Dc, Pc) · ถ้าไม่มี จบ test ที่ขั้นนี้', async () => {
    await page.getByRole('button', { name: 'ตารางวันที่', exact: true }).scrollIntoViewIfNeeded().catch(() => {});
    card = await readCard(page);
    await snap(page, 'ขั้น 5 การ์ดวันที่ถูกกว่า (31 ธ.ค.)');
    await shot(page, 'ขั้น 5 การ์ดวันที่ถูกกว่า (31 ธ.ค.)');
    if (!card.present || !card.iso) {
      note('ไม่มีการ์ดวันที่ถูกกว่าที่ 31 ธ.ค. → จบ test ที่ขั้น 5 (E4–E8 = N/A · ใช้งบค้นหา 2)');
      for (const e of ['E4 Pc < P', 'E5 Dc ห่างจาก 31 ธ.ค. ≤ 3 วัน', 'E6 ปฏิทิน/ตาราง Dc = Pc · ✦ = ต่ำสุด', 'E7 หัวผลลัพธ์ = Dc และ Q = Pc', 'E8 ข้อมูลเชิงลึกของ Dc']) {
        gf.na(e, 'วันรันไม่มีการ์ดวันที่ถูกกว่าที่ 31 ธ.ค. → N/A ตามเงื่อนไขก่อนเริ่มของแผน');
      }
      return;
    }
    Dc = card.iso; Pc = card.price;
    note(`D-PRC-CARD = (${Dc} ${thShort(Dc)}, ${fmt(Pc)}) · "${card.text}"`);
    await gf.check('E4 Pc < P', card.loc, async () => {
      expect.soft(Pc != null && P != null && Pc < P, `Pc ${fmt(Pc)} < P ${fmt(P)}`).toBe(true);
    });
    await gf.check('E5 Dc ห่างจาก 31 ธ.ค. ไม่เกิน 3 วัน [O]', card.loc, async () => {
      expect.soft(Math.abs(diffDays(Dc, D_HIGH)), `|${thShort(Dc)} − 31 ธ.ค.| ≤ 3 วัน`).toBeLessThanOrEqual(3);
    });
  });

  if (Dc) {
    await test.step('6. คลิกช่อง "ขาไป" จดราคาปฏิทินของ Dc แล้วกด Esc', async () => {
      // ขั้น 5 เลื่อนลงไปที่การ์ด → กลับขึ้นบนก่อนคลิกช่อง "ขาไป" · ราคาในช่องปฏิทินโหลดตามหลัง → รอให้ทุกช่องมีราคาก่อนจด
      await scrollTop(gf, page);
      const cal = await openCalendar(gf, page);
      const isos = [...new Set([...winDays(D_HIGH), Dc])];
      const reads = await readCalCells(cal, isos);
      unit = calUnit(reads.filter((_, i) => i < 7));
      calDc = reads[isos.indexOf(Dc)];
      note(`ปฏิทิน: ช่อง ${thShort(Dc)} แสดง ${fmt(calDc.display)} (aria ${fmt(calDc.full)}) · ความละเอียดช่อง ฿${cellUnit(calDc, unit)}`);
      await shot(page, `ขั้น 6 ปฏิทิน ${thShort(Dc)}`);
      await closeCalendarEsc(gf, page);
    });

    await test.step('7. กดปุ่ม "ตารางวันที่" (ปุ่มหลัก ไม่ใช่ลิงก์บนการ์ด) จดราคาช่อง Dc ราคาทุกช่อง และช่องที่มี ✦ · กด < หรือ > ถ้า Dc ไม่อยู่ในช่วงที่แสดง', async () => {
      const dlg = await openGrid(gf, page);
      let cells = await readGrid(dlg);
      for (let n = 0; n < 2 && cells.length && !cells.some((c) => c.iso === Dc); n++) {
        await gf.click(dlg.getByRole('button', { name: Dc < cells[0].iso ? 'เลื่อนไปทางซ้าย' : 'เลื่อนไปทางขวา' }));
        cells = await readGrid(dlg);
      }
      const cDc = cells.find((c) => c.iso === Dc);
      note(`ตาราง: ${cells.map((c) => `${c.header} ${fmt(c.price)}${c.star ? '✦' : ''}`).join(' · ')}`);
      await gf.check('E6 ปฏิทิน Dc = Pc · ตาราง Dc = Pc · ✦ = ต่ำสุดของช่องที่แสดง', [calDc!.loc, cDc?.btn ?? gridPanel(dlg), ...cells.filter((c) => c.star).map((c) => c.btn)], async () => {
        expect.soft(sameAtCell(calDc, unit, Pc), `ปฏิทิน ${thShort(Dc)} ${fmt(calDc!.display)} = Pc ${fmt(Pc)} ที่ความละเอียดช่อง ฿${cellUnit(calDc, unit)}`).toBe(true);
        expect.soft(cDc, `ช่อง ${thShort(Dc)} อยู่ในตาราง`).toBeTruthy();
        expect.soft(cDc?.price, `ตาราง ${thShort(Dc)} = Pc ${fmt(Pc)}`).toBe(Pc);
        const prices = cells.map((c) => c.price).filter((p): p is number => p != null);
        const min = Math.min(...prices);
        const stars = cells.filter((c) => c.star);
        expect.soft(stars.length, 'มีช่อง ✦ อย่างน้อย 1 ช่อง').toBeGreaterThan(0);
        for (const s of stars) {
          expect.soft(s.price, `✦ ${s.header} ${fmt(s.price)} = ต่ำสุดที่แสดง ${fmt(min)} (Hi31 ${fmt(hi31)}${min > (hi31 ?? Infinity) ? ' · ต่ำสุดนี้ > Hi31' : ''})`).toBe(min);
        }
      });
    });

    await test.step('8. คลิกช่อง Dc แล้วกด "ตกลง" (ค้นหาครั้งที่ 3) รอ ≥ 10 วินาที เลื่อนขึ้นบนสุด', async () => {
      const dlg = priceDlg(page);
      const cells = await readGrid(dlg);
      const cDc = cells.find((c) => c.iso === Dc);
      expect(cDc, `ช่อง ${thShort(Dc)} อยู่ในตารางที่แสดง`).toBeTruthy();
      await clickGridCell(gf, dlg, cDc!);
      await gf.click(dlg.getByRole('button', { name: 'ตกลง' }), { search: `กด "ตกลง" ในตารางวันที่ → Dc ${thShort(Dc)}` });
      await scrollTop(gf, page);
      await ensureResults(gf, page, `กด "ตกลง" (Dc ${thShort(Dc)})`);
    });

    let Q: number | null = null;
    await test.step('9. snapshot: หัวผลลัพธ์ ช่อง "ขาไป" ราคาแท็บ (เรียก Q)', async () => {
      await snap(page, 'ขั้น 9 หลังตกลง Dc');
      Q = await readTabPrice(page);
      note(`Q = ${fmt(Q)}`);
      await gf.check('E7 หัวผลลัพธ์และขาไป = Dc และ Q = Pc', [searchForm(page), cheapestTab(page)], async () => {
        await expectHeader(page, Dc);
        expect.soft(Q, `Q ${fmt(Q)} = Pc ${fmt(Pc)}`).toBe(Pc);
      });
    });

    await test.step('10. กด "ดูประวัติราคา" จด LoC–HiC คำป้าย และราคาในประโยค · screenshot', async () => {
      await expandInsights(gf, page);
      const ins = await readInsightExpanded(page);
      note(`${thShort(Dc)}: LoC–HiC = ${fmt(ins.lo)}–${fmt(ins.hi)} · ประโยค "${ins.sentenceText}" · ป้าย "${ins.label}"`);
      await shot(page, `ขั้น 10 ข้อมูลเชิงลึก ${thShort(Dc)}`);
      await gf.check('E8 ราคาในประโยค = Q · ป้ายสอดคล้องกับ LoC–HiC · LoC–HiC = Lo15–Hi15 [O]', [ins.sentenceLoc, ins.rangeLoc], async () => {
        expect.soft(ins.price, `ราคาในประโยค ${fmt(ins.price)} = Q ${fmt(Q)}`).toBe(Q);
        expectLabelConsistent(Q, ins.lo, ins.hi, ins.label, `ป้าย ${thShort(Dc)}`);
        expect.soft(ins.lo, `LoC ${fmt(ins.lo)} = Lo15 ${fmt(lo15)} [O-ยังไม่ยืนยัน]`).toBe(lo15);
        expect.soft(ins.hi, `HiC ${fmt(ins.hi)} = Hi15 ${fmt(hi15)} [O-ยังไม่ยืนยัน]`).toBe(hi15);
      });
    });
  }

  gf.finishNA();
});

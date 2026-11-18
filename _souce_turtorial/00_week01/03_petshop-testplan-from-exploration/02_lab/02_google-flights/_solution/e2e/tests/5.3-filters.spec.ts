/**
 * 5.3 ตัวกรอง (TC-FLT-01 … TC-FLT-07) · ที่มา: plan/5.3-ตัวกรอง.md
 *
 * หลักการร่วม (D-FLT-KEY / D-FLT-SET ท้ายไฟล์แผน)
 *  - เทียบแถวด้วย "คีย์แถว" ที่อ่านจาก aria-label ของแถว = สายการบิน (รวม codeshare / ดำเนินการโดย) + เวลาออก
 *    + เวลาถึง (+N) + สนามบินต้นทาง–ปลายทาง + จำนวนแวะพักและสนามบินที่แวะ · ไม่ใช้ราคาและป้ายชั้นเป็นคีย์
 *  - ชุด B = แถวชุดแรกก่อน "ดูเที่ยวบินเพิ่มเติม" (ไม่ใช่ชุดครบ) · ชุดครบ = หน้าไม่มีปุ่ม "ดูเที่ยวบินเพิ่มเติม"
 *  - ตรวจ "ชุดใหม่ ⊆ ชุดเดิม" เฉพาะเมื่อชุดเดิมครบ (ยกเว้น TC-FLT-07 E5 ที่ตั้งใจเทียบกับ B เพื่อตรวจ R62)
 *  - ตั้ง/ล้างตัวกรองจนรายการโหลดใหม่ = 1 การค้นหา (TEST-PLAN 2.3)
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect, getU1, type GF } from '../support/gf';

// ───────────────────────── ตัวช่วยทั่วไป ─────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const num = (s: string) => Number(String(s).replace(/[^\d]/g, ''));
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const note = (type: string, description: string) => test.info().annotations.push({ type, description });

// ───────────────────────── แถวผลลัพธ์ (D-FLT-KEY) ─────────────────────────
/** ชื่อ (aria-label) ของลิงก์แถวผลลัพธ์ เช่น "ราคาเริ่มต้นที่ 5900 บาทไทย เดินทางด้วย… ออกเดินทางจาก … เวลา 14:00 … เดินทางถึง … เวลา 01:00 … เลือกเที่ยวบิน" */
const ROW_NAME = /ออกเดินทางจาก .+ เวลา \d{1,2}:\d{2} .+เดินทางถึง .+ เวลา \d{1,2}:\d{2}/;
/** D-FLT-CLASS */
const CLASS_RE = /ชั้นธุรกิจ|ชั้นหนึ่ง|ประหยัดพรีเมียม|\bBusiness\b|\bFirst\b|Premium economy/i;

type Row = {
  key: string;
  label: string;
  text: string;
  price: number | null;
  stops: number;
  direct: boolean;
  airlines: string;
  operatedBy: string;
  dep: string;
  arr: string;
  plus: number;
  depAirport: string;
  arrAirport: string;
  durMin: number;
  stopSegs: string[];
  stopCodes: string[];
  co2: number | null;
  classHits: string[];
};

function parseRow(label: string, text: string): Row {
  const L = label.replace(/\s+/g, ' ').trim();
  const priceM = L.match(/ราคาเริ่มต้นที่ ([\d,]+)/);
  let price: number | null = priceM ? num(priceM[1]) : null;
  if (price === null && !/ไม่มีข้อมูลราคา/.test(text + L)) {
    const t = text.match(/฿\s*([\d,]+)/);
    if (t) price = num(t[1]);
  }
  const direct = /เที่ยวบินตรง/.test(L);
  const stopsM = L.match(/แวะพัก (\d+) ครั้ง/);
  const stops = direct ? 0 : stopsM ? Number(stopsM[1]) : NaN;
  const alM = L.match(/กับ (.+?)(?: ดำเนินการโดย (.+?)\.)? ออกเดินทางจาก/);
  const tm = L.match(
    /ออกเดินทางจาก (.+?) เวลา (\d{1,2}:\d{2}) ในวันที่ (.+?) และเดินทางถึง (.+?) เวลา (\d{1,2}:\d{2}) ในวันที่ (.+?) ระยะเวลารวม/,
  );
  const depDay = tm ? Number((tm[3].match(/(\d{1,2})\s*$/) || [])[1]) : NaN;
  const arrDay = tm ? Number((tm[6].match(/(\d{1,2})\s*$/) || [])[1]) : NaN;
  let plus = arrDay - depDay;
  if (plus < 0) plus += 31;
  if (!Number.isFinite(plus)) plus = 0;
  const durM = L.match(/ระยะเวลารวม\s+(?:(\d+)\s*ชม\.)?\s*(?:(\d+)\s*นาที)?/);
  const durMin = durM ? Number(durM[1] || 0) * 60 + Number(durM[2] || 0) : NaN;
  const stopSegs = [
    ...L.matchAll(/การแวะพัก \(ครั้งที่ \d+ จาก \d+\) ใช้เวลาแวะพัก (?:\d+ ชม\.)?\s*(?:\d+ นาที)?\s*(.+?)(?= การแวะพัก \(| เลือกเที่ยวบิน|$)/g),
  ].map((m) => m[1].trim());
  const codes = [...new Set(text.match(/\b[A-Z]{3}\b/g) || [])];
  const stopCodes = codes.slice(2);
  const co2M = text.replace(/[−–]/g, '-').match(/ปริมาณการปล่อยก๊าซ\s*([+-]?\d+)\s*%/);
  const co2 = co2M ? Number(co2M[1]) : /การปล่อยก๊าซ(โดย)?เฉลี่ย/.test(text) ? 0 : null;
  const classHits = [...new Set(((L + ' ' + text).match(new RegExp(CLASS_RE.source, 'gi')) || []).map(String))];
  const airlines = alM ? alM[1].trim() : '';
  const operatedBy = alM && alM[2] ? alM[2].trim() : '';
  const r: Row = {
    key: '',
    label: L,
    text,
    price,
    stops,
    direct,
    airlines,
    operatedBy,
    dep: tm ? tm[2].padStart(5, '0') : '',
    arr: tm ? tm[5].padStart(5, '0') : '',
    plus,
    depAirport: tm ? tm[1] : '',
    arrAirport: tm ? tm[4] : '',
    durMin,
    stopSegs,
    stopCodes,
    co2,
    classHits,
  };
  r.key = [
    airlines + (operatedBy ? ` (ดำเนินการโดย ${operatedBy})` : ''),
    `${r.dep}→${r.arr}${plus ? `+${plus}` : ''}`,
    `${r.depAirport}–${r.arrAirport}`,
    direct ? 'บินตรง' : `แวะ ${stops}: ${stopSegs.join(' | ')}`,
  ].join(' · ');
  return r;
}

/** อ่านแถวผลลัพธ์ที่มองเห็น (อ่านได้ทั้งตอนป๊อปอัปเปิดอยู่ ซึ่ง main ถูก aria-hidden) */
async function readRows(page: Page): Promise<Row[]> {
  const raw = await page
    .getByRole('link', { name: ROW_NAME, includeHidden: true })
    .evaluateAll((els) =>
      els.map((el) => {
        const li = (el.closest('li') || el.parentElement || el) as HTMLElement;
        const anyLi = li as unknown as { checkVisibility?: () => boolean };
        const visible = typeof anyLi.checkVisibility === 'function' ? anyLi.checkVisibility() : li.getClientRects().length > 0;
        return { label: el.getAttribute('aria-label') || el.textContent || '', text: li.innerText || '', visible };
      }),
    );
  return raw.filter((r) => r.visible).map((r) => parseRow(r.label, r.text));
}

/** รอให้แถวเข้าเงื่อนไข (ใช้ตอน snapshot ทันทีขณะป๊อปอัปเปิด) สูงสุด ms */
async function waitRows(page: Page, pred: (rows: Row[]) => boolean, ms = 8000): Promise<Row[]> {
  const t0 = Date.now();
  let rows = await readRows(page);
  while (!pred(rows) && Date.now() - t0 < ms) {
    await sleep(1000);
    rows = await readRows(page);
  }
  return rows;
}

const rowItems = (page: Page) =>
  page
    .getByRole('listitem', { includeHidden: true })
    .filter({ has: page.getByRole('link', { name: ROW_NAME, includeHidden: true }) })
    .filter({ visible: true });
const rowItemByLabel = (page: Page, label: string) =>
  page
    .getByRole('listitem', { includeHidden: true })
    .filter({ has: page.getByRole('link', { name: label, exact: true, includeHidden: true }) })
    .filter({ visible: true })
    .first();

const show = (rows: Row[], n = 8) =>
  rows.length === 0
    ? '(ไม่มี)'
    : rows
        .slice(0, n)
        .map((r) => `[${r.key} · ${r.price === null ? 'ไม่มีราคา' : '฿' + r.price}]`)
        .join(' ') + (rows.length > n ? ` …(+${rows.length - n})` : '');
const minPrice = (rows: Row[]) => {
  const ps = rows.map((r) => r.price).filter((p): p is number => p !== null);
  return ps.length ? Math.min(...ps) : null;
};
const keySet = (rows: Row[]) => new Set(rows.map((r) => r.key));
const notIn = (a: Row[], b: Row[]) => {
  const k = keySet(b);
  return a.filter((r) => !k.has(r.key));
};
/** แถวที่ต่างกันแบบนับซ้ำ (multiset) a − b */
function multisetMinus(a: Row[], b: Row[]): Row[] {
  const cnt = new Map<string, number>();
  for (const r of b) cnt.set(r.key, (cnt.get(r.key) || 0) + 1);
  const out: Row[] = [];
  for (const r of a) {
    const c = cnt.get(r.key) || 0;
    if (c > 0) cnt.set(r.key, c - 1);
    else out.push(r);
  }
  return out;
}
/** คีย์ที่อยู่ทั้งสองชุดแต่ราคาต่างกัน (ถ้าคีย์ซ้ำ เทียบรายการราคาที่เรียงแล้ว) */
function priceDiffs(a: Row[], b: Row[]): string[] {
  const group = (rows: Row[]) => {
    const m = new Map<string, (number | null)[]>();
    for (const r of rows) m.set(r.key, [...(m.get(r.key) || []), r.price]);
    for (const v of m.values()) v.sort((x, y) => (x ?? -1) - (y ?? -1));
    return m;
  };
  const ga = group(a);
  const gb = group(b);
  const out: string[] = [];
  for (const [k, pa] of ga) {
    const pb = gb.get(k);
    if (pb && JSON.stringify(pa) !== JSON.stringify(pb)) out.push(`${k}: ${JSON.stringify(pb)} → ${JSON.stringify(pa)}`);
  }
  return out;
}

// ───────────────────────── องค์ประกอบบนหน้า ─────────────────────────
const CHIP_STATE = '(ไม่ได้เลือก|เลือกแล้ว)$';
/** ชิปตัวกรองตามชื่อหมวด เช่น "จำนวนครั้งที่แวะพัก, ไม่ได้เลือก" / "บินตรง, จำนวนครั้งที่แวะพัก, เลือกแล้ว" */
const chip = (page: Page, cat: string) =>
  page
    .getByRole('button', { name: new RegExp(`(^|, )${cat}, ${CHIP_STATE}`), includeHidden: true })
    .filter({ visible: true })
    .first();
const allChips = (page: Page) =>
  page.getByRole('button', { name: new RegExp(`, ${CHIP_STATE}`), includeHidden: true }).filter({ visible: true });
/** ปุ่ม ✕ บนชิป (อยู่ในกลุ่มเดียวกับชิป) ชื่อ "ล้าง <หมวด>" */
const chipX = (page: Page, cat: string) =>
  chip(page, cat)
    .locator('xpath=..')
    .getByRole('button', { name: `ล้าง ${cat}`, exact: true, includeHidden: true })
    .filter({ visible: true });
const allFiltersBtn = (page: Page) =>
  page.getByRole('button', { name: /^ตัวกรองทั้งหมด/, includeHidden: true }).filter({ visible: true }).first();
const popup = (page: Page, heading: string) =>
  page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
    .filter({ visible: true })
    .first();
const allFiltersPanel = (page: Page) =>
  page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'ตัวกรอง', exact: true, level: 1 }) })
    .filter({ visible: true })
    .first();
const moreBtn = (page: Page) =>
  page.getByRole('button', { name: /ดูเที่ยวบินเพิ่มเติม/, includeHidden: true }).filter({ visible: true });
const cheapestTab = (page: Page) => page.getByRole('tab', { name: /ถูกที่สุด/, includeHidden: true }).filter({ visible: true }).first();
const resultCountText = (page: Page) => page.getByText(/มีผลลัพธ์ \d+ รายการ|ไม่มีผลลัพธ์|ไม่พบผลลัพธ์/).first();

async function readCheapest(page: Page): Promise<number | null> {
  const t = cheapestTab(page);
  if (!(await t.count())) return null;
  const s = `${(await t.getAttribute('aria-label').catch(() => '')) || ''} ${await t.innerText().catch(() => '')}`;
  const m = s.match(/เริ่มต้น\s*฿?\s*([\d,]+)/);
  return m ? num(m[1]) : null;
}
async function readCount(page: Page): Promise<{ text: string; n: number | null }> {
  const t = ((await resultCountText(page).textContent({ timeout: 3000 }).catch(() => '')) || '').trim();
  const m = t.match(/มีผลลัพธ์ (\d+) รายการ/);
  return { text: t, n: m ? Number(m[1]) : /ไม่มีผลลัพธ์|ไม่พบผลลัพธ์/.test(t) ? 0 : null };
}
const isComplete = async (page: Page) => (await moreBtn(page).count()) === 0;
const textOf = async (l: Locator) => ((await l.innerText({ timeout: 5000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const nameOf = async (l: Locator) => ((await l.getAttribute('aria-label', { timeout: 5000 }).catch(() => '')) || '').trim();
/**
 * ชื่อที่เข้าถึงได้ (accessible name) ของ element ที่ชื่อไม่ได้มาจาก attribute aria-label
 * (เช่น radio/checkbox ในป๊อปอัปที่ชื่อมาจาก <label> / aria-labelledby) · อ่านจาก ariaSnapshot ซึ่งคำนวณชื่อแบบเดียวกับ getByRole
 */
async function accName(l: Locator): Promise<string> {
  const direct = await nameOf(l);
  if (direct) return direct;
  const snapTxt = await l.ariaSnapshot({ timeout: 5000 }).catch(() => '');
  const m = snapTxt.match(/^\s*-\s*'?[a-z]+\s+"((?:[^"\\]|\\.)*)"/m);
  if (m && m[1].trim()) return m[1].replace(/\\(.)/g, '$1').replace(/\s+/g, ' ').trim();
  const viaDom = await l
    .evaluate((el) => {
      const byIds = (el.getAttribute('aria-labelledby') || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ');
      const lbls = (el as HTMLInputElement).labels;
      const byLabel = lbls && lbls.length ? Array.from(lbls).map((x) => x.textContent || '').join(' ') : '';
      return byIds || byLabel || el.closest('label')?.textContent || el.parentElement?.textContent || '';
    })
    .catch(() => '');
  return viaDom.replace(/\s+/g, ' ').trim();
}

type Snap = { rows: Row[]; complete: boolean; cheapest: number | null; count: { text: string; n: number | null }; at: string };
async function snap(page: Page, name: string): Promise<Snap> {
  const s: Snap = {
    rows: await readRows(page),
    complete: await isComplete(page),
    cheapest: await readCheapest(page),
    count: await readCount(page),
    at: new Date().toISOString(),
  };
  note(
    'snapshot',
    `${name} @${s.at}: ${s.rows.length} แถว · ${s.complete ? 'ครบ (ไม่มีปุ่มดูเพิ่ม)' : 'ไม่ครบ (มีปุ่ม "ดูเที่ยวบินเพิ่มเติม")'} · ถูกที่สุด ${s.cheapest ?? '-'} · "${s.count.text}"`,
  );
  return s;
}

/**
 * คลิกชิปที่ตั้งค่าแล้ว (มี ✕ ต่อท้าย) แบบคน · ชิปสั้น (เช่น "เวลา") พื้นที่กดของ ✕ "ล้าง <หมวด>" ทับกลางชิป
 * ทำให้คลิกกลางชิปโดน ✕ บัง (intercepts pointer events) → กดที่ขอบซ้ายของชิปซึ่งไกลจาก ✕
 * และเลื่อนชิปมากลางจอก่อน (ไม่ให้แถบหัวเว็บที่ติดด้านบนบัง) · ถ้ายังกดไม่ได้ ใช้คีย์บอร์ด (โฟกัสชิป → Enter)
 */
async function clickSelectedChip(gf: GF, page: Page, target: Locator) {
  await gf.assertNotBlocked();
  await target.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' })).catch(() => {});
  await sleep(rand(400, 800));
  const box = await target.boundingBox().catch(() => null);
  const pos = box ? { x: Math.max(3, Math.min(14, box.width / 5)), y: box.height / 2 } : undefined;
  await target.hover({ position: pos, timeout: 10_000 }).catch(() => {});
  await sleep(rand(400, 900));
  const clicked = await target
    .click({ position: pos, timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!clicked) {
    await target.focus();
    await sleep(rand(400, 800));
    await page.keyboard.press('Enter');
  }
  await gf.pause();
}

/** เปิดป๊อปอัปของชิป แล้วคืน dialog */
async function openChip(gf: GF, page: Page, cat: string, heading = cat): Promise<Locator> {
  const c = chip(page, cat);
  if (/เลือกแล้ว$/.test(await nameOf(c))) await clickSelectedChip(gf, page, c);
  else await gf.click(c);
  const d = popup(page, heading);
  await d.waitFor({ state: 'visible', timeout: 15_000 });
  return d;
}

/** ตั้ง slider ด้วยคีย์บอร์ด (โฟกัส slider แล้วกดลูกศรจนถึงค่าเป้าหมาย) */
async function setSlider(gf: GF, slider: Locator, target: number, fallback: { key: string; times: number }) {
  await slider.focus();
  await sleep(rand(500, 900));
  const read = async () => {
    const v = await slider.getAttribute('aria-valuenow');
    return v === null || v === '' ? null : Number(v);
  };
  let now = await read();
  if (now === null || !Number.isFinite(now)) {
    for (let i = 0; i < fallback.times; i++) {
      await slider.press(fallback.key);
      await sleep(rand(200, 400));
    }
  } else {
    for (let i = 0; i < 60 && now !== null && now !== target; i++) {
      await slider.press(now > target ? 'ArrowLeft' : 'ArrowRight');
      await sleep(rand(200, 400));
      now = await read();
    }
  }
  await gf.pause();
}

/** E1 · หัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค. */
async function checkHeader(gf: GF, page: Page, label: string, extra?: () => Promise<void>) {
  const tt = page.getByRole('combobox', { name: /ประเภทตั๋ว/, includeHidden: true }).first();
  const pax = page.getByRole('button', { name: /ผู้โดยสาร/, includeHidden: true }).first();
  const cab = page.getByRole('combobox', { name: /ชั้นโดยสาร/, includeHidden: true }).first();
  const from = page.getByRole('combobox', { name: /^ต้นทาง/, includeHidden: true }).first();
  const to = page.getByRole('combobox', { name: /^ปลายทาง/, includeHidden: true }).first();
  const date = page.getByRole('textbox', { name: /^ขาไป/, includeHidden: true }).first();
  await gf.check(label, [tt, pax, cab, from, to, date], async () => {
    await expect.soft(tt, 'ประเภทตั๋ว = เที่ยวเดียว').toHaveAccessibleName(/เที่ยวเดียว/);
    await expect.soft(pax, 'ผู้โดยสาร = 1').toHaveAccessibleName(/ผู้โดยสาร 1 คน/);
    await expect.soft(cab, 'ชั้นโดยสาร = ชั้นประหยัด').toHaveAccessibleName(/ชั้นประหยัด/);
    await expect.soft(from, 'ต้นทาง = กรุงเทพมหานคร').toHaveValue(/กรุงเทพมหานคร/);
    await expect.soft(to, 'ปลายทาง = โตเกียว').toHaveValue(/โตเกียว/);
    await expect.soft(date, 'ขาไป = อังคาร 15 ธ.ค.').toHaveValue(/อังคาร 15 ธ\.ค\./);
    if (extra) await extra();
  });
}

const E1_HEADER = 'E1: (ขั้น 1) หัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.';

// ═════════════════════════════════════════ TC-FLT-01 ═════════════════════════════════════════
test(
  'TC-FLT-01 · บินตรงเท่านั้น + กระเป๋าถือ 1 ใบ + "ล้าง" ในป๊อปอัป',
  {
    tag: ['@P1', '@5.3'],
    annotation: [
      { type: 'คาดหวัง', description: E1_HEADER },
      { type: 'คาดหวัง', description: 'E2: (ขั้น 2) snapshot ที่ถ่ายขณะป๊อปอัปเปิดเห็นรายการเปลี่ยนแล้วโดยไม่ได้กดยืนยัน · ชิปเปลี่ยนจากชื่อหมวดเป็นค่าที่เลือก (คำว่า "บินตรง") และมีปุ่ม ✕ (R64)' },
      { type: 'คาดหวัง', description: 'E3: (ขั้น 2) ทุกแถวใน D เป็นบินตรง (aria-label บอกบินตรง ไม่มีสนามบินแวะ) (R63)' },
      { type: 'คาดหวัง', description: 'E4: (ขั้น 2) ทุกแถวบินตรงใน B อยู่ใน D (เทียบคีย์แถว) = ตัวกรองไม่ตัดแถวบินตรงที่มีอยู่ (R63) · ตรวจเมื่อ D ครบ ถ้า D มีปุ่มดูเพิ่ม = N/A ข้อนี้ · ไม่ตรวจทิศ D ⊆ B เพราะ B ไม่ครบ' },
      { type: 'คาดหวัง', description: 'E5: (ขั้น 2) P1 = ราคาต่ำสุดของแถวใน D (ถ้า D ไม่ครบ: P1 ≤ ราคาต่ำสุดที่แสดง) และ P1 ≥ P0 เพราะการกรองทำให้ราคาเริ่มต้นถูกลงไม่ได้ (R65)' },
      { type: 'คาดหวัง', description: 'E6: (ขั้น 3) เมื่อกระเป๋าถือเป็น 1 ใบ ปุ่ม + ใช้ไม่ได้ และกดซ้ำแล้วจำนวนยังเป็น 1 · มีข้อความบอกว่าถึงขีดจำกัด [O-ยังไม่ยืนยัน: เพดาน 1 ใบ และข้อความ "ถึงขีดจำกัดสูงสุดแล้ว" มาจากผลสำรวจ] (R66)' },
      { type: 'คาดหวัง', description: 'E7: (ขั้น 3) D2 ⊆ D (ตรวจเมื่อ D ครบ) จำนวนแถว D2 ≤ D และทุกแถวใน D2 ยังเป็นบินตรง (R69)' },
      { type: 'คาดหวัง', description: 'E8: (ขั้น 3) ปุ่มเป็น "ตัวกรองทั้งหมด (2)" = จำนวนหมวดที่ตั้งอยู่ (แวะพัก + สัมภาระ) (R70)' },
      { type: 'คาดหวัง', description: 'E9: (ขั้น 4) ป๊อปอัปสัมภาระกลับเป็น 0 ใบ · ชิป "บินตรง" + ✕ ยังอยู่ · ปุ่มเปลี่ยนเป็น "(1)" (R74 R70)' },
      { type: 'คาดหวัง', description: 'E10: (ขั้น 4) D3 = D ทุกแถว (คีย์แถว) ราคาแต่ละแถวเท่าเดิม และราคาแท็บ "ถูกที่สุด" = P1 (R74)' },
      { type: 'ที่มา', description: 'plan/5.3-ตัวกรอง.md · TC-FLT-01 · R63 R64 R65 R66 R69 R70 R74 · Invariant/Metamorphic · Boundary · State · [O-ยังไม่ยืนยัน] (E6)' },
      { type: 'งบค้นหา', description: '4' },
    ],
  },
  async ({ page, gf }) => {
    let B!: Snap, D!: Snap, D2!: Snap, D3!: Snap;
    let P0: number | null = null;

    await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ · รอ ≥ 10 วินาที · snapshot → ชุด B พร้อมราคาและจำนวนแวะพัก · อ่านแท็บ "ถูกที่สุด" = P0 [ค้นหา 1]', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1 (TC-FLT-01 ขั้น 1)' });
      await checkHeader(gf, page, 'E1 หัวผลลัพธ์ตรงโจทย์');
      B = await snap(page, 'B');
      P0 = B.cheapest;
      note('P0', String(P0));
    });

    await test.step('2. กดชิปจำนวนครั้งที่แวะพัก → เลือก "บินตรงเท่านั้น" · snapshot ขณะป๊อปอัปเปิด · Esc · รอ ≥ 10 วินาที · snapshot → ชุด D · ปุ่มดูเพิ่ม · แท็บ "ถูกที่สุด" = P1 · ข้อความชิป [ค้นหา 2]', async () => {
      const dlg = await openChip(gf, page, 'จำนวนครั้งที่แวะพัก');
      await gf.click(dlg.getByRole('radio', { name: 'บินตรงเท่านั้น', exact: true }));
      const openRows = await waitRows(page, (rs) => rs.length > 0 && rs.every((r) => r.direct));
      const c = chip(page, 'จำนวนครั้งที่แวะพัก');
      await gf.check('E2 รายการเปลี่ยนขณะป๊อปอัปเปิด + ชิป "บินตรง" มี ✕', [rowItems(page), c, chipX(page, 'จำนวนครั้งที่แวะพัก')], async () => {
        await expect.soft(dlg, 'ป๊อปอัปยังเปิดอยู่ (ไม่ได้กดยืนยัน)').toBeVisible();
        const nonDirect = openRows.filter((r) => !r.direct);
        expect.soft(openRows.length, 'มีแถวแสดงขณะป๊อปอัปเปิด').toBeGreaterThan(0);
        expect.soft(nonDirect.length, `ขณะป๊อปอัปเปิด ยังมีแถวไม่บินตรง (รายการยังไม่เปลี่ยน): ${show(nonDirect)}`).toBe(0);
        if (B.rows.some((r) => !r.direct)) {
          expect.soft(keySet(openRows).size === keySet(B.rows).size && notIn(openRows, B.rows).length === 0 && notIn(B.rows, openRows).length === 0, 'รายการขณะป๊อปอัปเปิดต้องต่างจาก B').toBe(false);
        }
        expect.soft(await textOf(c), 'ชิปแสดงค่าที่เลือก "บินตรง"').toContain('บินตรง');
        expect.soft(await chipX(page, 'จำนวนครั้งที่แวะพัก').count(), 'ชิปมีปุ่ม ✕').toBeGreaterThan(0);
      });
      await gf.press('Escape', { search: 'ตั้ง บินตรงเท่านั้น (TC-FLT-01 ขั้น 2)' });
      D = await snap(page, 'D');
      note('P1', String(D.cheapest));
      note('ข้อความชิป', await textOf(chip(page, 'จำนวนครั้งที่แวะพัก')));

      await gf.check('E3 ทุกแถวใน D เป็นบินตรง', rowItems(page), async () => {
        const bad = D.rows.filter((r) => !r.direct || r.stopSegs.length > 0);
        expect.soft(D.rows.length, 'D มีแถว').toBeGreaterThan(0);
        expect.soft(bad.length, `แถวใน D ที่ไม่ใช่บินตรง: ${show(bad)}`).toBe(0);
      });

      if (D.complete) {
        await gf.check('E4 ทุกแถวบินตรงใน B อยู่ใน D', rowItems(page), async () => {
          const missing = notIn(B.rows.filter((r) => r.direct), D.rows);
          expect.soft(missing.length, `แถวบินตรงใน B ที่หายไปจาก D: ${show(missing)}`).toBe(0);
        });
      } else {
        gf.na('E4 ทุกแถวบินตรงใน B อยู่ใน D', 'D มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" (ชุดไม่ครบ) ตาม D-FLT-SET');
      }

      await gf.check('E5 P1 = ราคาต่ำสุดของ D และ P1 ≥ P0', [cheapestTab(page), rowItems(page)], async () => {
        const minD = minPrice(D.rows);
        const P1 = D.cheapest;
        expect.soft(P1, 'อ่านราคาแท็บ "ถูกที่สุด" (P1) ได้').not.toBeNull();
        if (P1 !== null && minD !== null) {
          if (D.complete) expect.soft(P1, `P1 (${P1}) = ราคาต่ำสุดใน D (${minD})`).toBe(minD);
          else expect.soft(P1, `P1 (${P1}) ≤ ราคาต่ำสุดที่แสดงใน D (${minD})`).toBeLessThanOrEqual(minD);
        }
        if (P1 !== null && P0 !== null) expect.soft(P1, `P1 (${P1}) ≥ P0 (${P0})`).toBeGreaterThanOrEqual(P0);
      });
    });

    await test.step('3. กดชิป "สัมภาระ" → กด + ของ "กระเป๋าถือขึ้นเครื่อง" 1 ครั้ง · รอผลโหลด · อ่านจำนวน/สถานะปุ่ม +/ข้อความ · กด + อีก 1 ครั้ง · Esc · snapshot → ชุด D2 และปุ่ม "ตัวกรองทั้งหมด" [ค้นหา 3]', async () => {
      const dlg = await openChip(gf, page, 'สัมภาระ');
      const plus = dlg.getByRole('button', { name: 'เพิ่มกระเป๋าถือขึ้นเครื่อง', exact: true });
      const readBags = async () => {
        const t = await textOf(dlg);
        const m = t.match(/เลือกกระเป๋าถือขึ้นเครื่องแล้ว (\d+) ใบ/);
        return { n: m ? Number(m[1]) : null, text: t };
      };
      await gf.click(plus, { search: 'ตั้งกระเป๋าถือ 1 ใบ (TC-FLT-01 ขั้น 3)' });
      const first = await readBags();
      const plusDisabledAfter1 =
        (await plus.isDisabled().catch(() => false)) || (await plus.getAttribute('aria-disabled').catch(() => null)) === 'true';
      note('สัมภาระหลังกด + ครั้งที่ 1', `จำนวน ${first.n} · ปุ่ม + ${plusDisabledAfter1 ? 'ใช้ไม่ได้' : 'ยังกดได้'} · "${first.text}"`);
      await gf.click(plus, { force: true });
      const second = await readBags();
      await gf.check('E6 กระเป๋าถือเพดาน 1 ใบ · ปุ่ม + ใช้ไม่ได้ · ข้อความถึงขีดจำกัด', [dlg, plus], async () => {
        expect.soft(first.n, 'จำนวนกระเป๋าถือหลังกด + ครั้งแรก = 1').toBe(1);
        expect.soft(plusDisabledAfter1, 'ปุ่ม + ใช้ไม่ได้เมื่อเป็น 1 ใบ (disabled / aria-disabled)').toBe(true);
        expect.soft(second.n, 'กด + ซ้ำแล้วจำนวนยังเป็น 1').toBe(1);
        expect.soft(`${first.text} ${second.text}`, 'มีข้อความบอกว่าถึงขีดจำกัด').toMatch(/ถึงขีดจำกัด/);
      });
      await gf.press('Escape');
      await gf.pause(5000, 7000);
      D2 = await snap(page, 'D2');
      const af = await textOf(allFiltersBtn(page));
      note('ปุ่มตัวกรองทั้งหมด', af);

      await gf.check('E7 D2 ⊆ D · |D2| ≤ |D| · ทุกแถวใน D2 บินตรง', rowItems(page), async () => {
        expect.soft(D2.rows.length, `|D2| (${D2.rows.length}) ≤ |D| (${D.rows.length})`).toBeLessThanOrEqual(D.rows.length);
        const bad = D2.rows.filter((r) => !r.direct);
        expect.soft(bad.length, `แถวใน D2 ที่ไม่ใช่บินตรง: ${show(bad)}`).toBe(0);
        if (D.complete) {
          const extra = notIn(D2.rows, D.rows);
          expect.soft(extra.length, `แถวใน D2 ที่ไม่อยู่ใน D: ${show(extra)}`).toBe(0);
        } else {
          note('E7', 'ไม่ตรวจ D2 ⊆ D เพราะ D ไม่ครบ (D-FLT-SET)');
        }
      });
      await gf.check('E8 ปุ่ม "ตัวกรองทั้งหมด (2)"', allFiltersBtn(page), async () => {
        expect.soft(af, 'ข้อความปุ่ม').toMatch(/ตัวกรองทั้งหมด\s*\(2\)/);
      });
    });

    await test.step('4. กดชิป "สัมภาระ" อีกครั้ง → กด "ล้าง" ในป๊อปอัป · Esc · รอ ≥ 10 วินาที · snapshot → ชุด D3 พร้อมราคา · อ่านข้อความชิปทุกตัวและปุ่ม "ตัวกรองทั้งหมด" [ค้นหา 4]', async () => {
      const dlg = await openChip(gf, page, 'สัมภาระ');
      await gf.click(dlg.getByRole('button', { name: /^ล้าง/ }).first());
      const bagText = await textOf(dlg);
      const bagN = (bagText.match(/เลือกกระเป๋าถือขึ้นเครื่องแล้ว (\d+) ใบ/) || [])[1];
      await gf.check('E9 ป๊อปอัปสัมภาระกลับเป็น 0 ใบ', dlg, async () => {
        expect.soft(bagN === undefined ? null : Number(bagN), `จำนวนกระเป๋าถือหลัง "ล้าง" ("${bagText}")`).toBe(0);
      });
      await gf.press('Escape', { search: 'ล้างสัมภาระในป๊อปอัป (TC-FLT-01 ขั้น 4)' });
      D3 = await snap(page, 'D3');
      const chipsTxt: string[] = [];
      for (const c of await allChips(page).all()) chipsTxt.push(await nameOf(c));
      note('ชิปทุกตัว', chipsTxt.join(' | '));
      const af = await textOf(allFiltersBtn(page));
      const stopChip = chip(page, 'จำนวนครั้งที่แวะพัก');
      await gf.check('E9 ชิป "บินตรง" + ✕ ยังอยู่ · ปุ่ม "(1)"', [stopChip, chipX(page, 'จำนวนครั้งที่แวะพัก'), allFiltersBtn(page)], async () => {
        expect.soft(await textOf(stopChip), 'ชิปแวะพักยังเป็น "บินตรง"').toContain('บินตรง');
        expect.soft(await chipX(page, 'จำนวนครั้งที่แวะพัก').count(), 'ชิป "บินตรง" ยังมี ✕').toBeGreaterThan(0);
        expect.soft(af, 'ปุ่มตัวกรองทั้งหมด').toMatch(/ตัวกรองทั้งหมด\s*\(1\)/);
      });
      await gf.check('E10 D3 = D ทุกแถว ราคาเท่าเดิม · ถูกที่สุด = P1', [rowItems(page), cheapestTab(page)], async () => {
        const gone = multisetMinus(D.rows, D3.rows);
        const added = multisetMinus(D3.rows, D.rows);
        expect.soft(gone.length, `แถวใน D ที่ไม่อยู่ใน D3: ${show(gone)}`).toBe(0);
        expect.soft(added.length, `แถวใน D3 ที่ไม่อยู่ใน D: ${show(added)}`).toBe(0);
        const pd = priceDiffs(D3.rows, D.rows);
        expect.soft(pd.length, `แถวที่ราคาเปลี่ยน: ${pd.slice(0, 6).join(' | ')}`).toBe(0);
        expect.soft(D3.cheapest, `ถูกที่สุด (${D3.cheapest}) = P1 (${D.cheapest})`).toBe(D.cheapest);
      });
    });
    gf.finishNA();
  },
);

// ═════════════════════════════════════════ TC-FLT-02 ═════════════════════════════════════════
/** หาแถวรายการสายการบินในป๊อปอัป (D-FLT-AIRLINE: เอเอ็นเอ · ไม่มีใช้สายแรกที่มี codeshare ใน B) */
async function pickAirline(dlg: Locator, B: Row[]): Promise<{ name: string; item: Locator } | null> {
  // locator ใน `has` ถูกค้นภายในแต่ละ listitem จึงต้องเริ่มจาก page (ถ้าเริ่มจาก dlg จะไปหา dialog ซ้อนใน listitem → ไม่เจอเสมอ)
  const itemOf = (name: string) =>
    dlg.getByRole('listitem').filter({ has: dlg.page().getByRole('checkbox', { name, exact: true }) }).first();
  if (await itemOf('เอเอ็นเอ').count()) return { name: 'เอเอ็นเอ', item: itemOf('เอเอ็นเอ') };
  for (const r of B) {
    if (!(r.operatedBy || / และ/.test(r.airlines))) continue;
    for (const n of r.airlines.split(/\s*(?:และ|,|·)\s*/).filter(Boolean)) {
      if (await itemOf(n).count()) return { name: n, item: itemOf(n) };
    }
  }
  return null;
}
async function clickOnly(gf: GF, page: Page, item: Locator) {
  await item.scrollIntoViewIfNeeded().catch(() => {});
  await item.hover();
  await gf.pause(1500, 2500);
  await gf.click(item.getByText('เท่านั้น', { exact: true }).first());
}

test(
  'TC-FLT-02 · ⚠️ ชั้นโดยสารปนเมื่อกรองสายการบิน + ตัวกรองสัมภาระ',
  {
    tag: ['@P1', '@5.3', '@known-defect'],
    annotation: [
      { type: 'คาดหวัง', description: 'E1: (ขั้น 1) หัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค. และไม่มีแถวใดใน B มีป้าย "ชั้นธุรกิจ" / "ชั้นหนึ่ง" / "ประหยัดพรีเมียม" (R72)' },
      { type: 'คาดหวัง', description: 'E2: (ขั้น 2) ป๊อปอัปสัมภาระมีตัวเลือกกระเป๋าโหลดให้ตั้งจำนวนได้ นอกเหนือจากกระเป๋าถือขึ้นเครื่อง (R68)' },
      { type: 'คาดหวัง', description: 'E3: (ขั้น 2) ลูกค้าแยกได้ว่าราคาใน G รวมกระเป๋าถือ 1 ใบแล้ว: ถ้าทุกแถวใน G อยู่ใน B ด้วยราคาเท่าเดิม ต้องมีข้อความบนหน้าหรือในแถวบอกว่าราคารวมกระเป๋าถือ 1 ใบแล้ว และข้อความหัวรายการต้องไม่ใช่ข้อความเดิมก่อนตั้งตัวกรอง ("อาจมีค่าธรรมเนียมสัมภาระ") · ถ้าราคาแถวใดเปลี่ยน ราคาใหม่ต้องสูงกว่าเดิม (บวกค่ากระเป๋า) ไม่ใช่ต่ำลง (R67)' },
      { type: 'คาดหวัง', description: 'E4: (ขั้น 2–3) หัวผลลัพธ์ยังเป็น "ชั้นประหยัด" และไม่มีแถวใดใน G และ A มีป้าย "ชั้นธุรกิจ" / "ชั้นหนึ่ง" / "ประหยัดพรีเมียม" (R72)' },
      { type: 'ที่มา', description: 'plan/5.3-ตัวกรอง.md · TC-FLT-02 · R72 R67 R68 · Invariant/Metamorphic · Negative · [R] · ⚠️ ข้อบกพร่องที่รู้แล้ว (ผลสำรวจ 2026-11-03 คาดว่าจะล้ม E2 E3 และอาจล้ม E4)' },
      { type: 'งบค้นหา', description: '3' },
    ],
  },
  async ({ page, gf }) => {
    let B!: Snap, G!: Snap, A!: Snap;
    let headB = '';
    const headerNote = () => page.getByText(/ราคารวมภาษี/).filter({ visible: true }).first();
    const cabin = () => page.getByRole('combobox', { name: /ชั้นโดยสาร/, includeHidden: true }).first();

    await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ · รอ ≥ 10 วินาที · snapshot → ชุด B พร้อมราคา · ค้นคำใน D-FLT-CLASS ทุกแถวของ B · จดข้อความหัวรายการเรื่องสัมภาระ [ค้นหา 1]', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1 (TC-FLT-02 ขั้น 1)' });
      await checkHeader(gf, page, 'E1 หัวผลลัพธ์ตรงโจทย์');
      B = await snap(page, 'B');
      headB = await textOf(headerNote());
      note('หัวรายการ B', headB);
      await gf.check('E1 ไม่มีป้ายชั้นอื่นในแถวของ B', rowItems(page), async () => {
        const bad = B.rows.filter((r) => r.classHits.length > 0);
        expect.soft(B.rows.length, 'B มีแถว').toBeGreaterThan(0);
        expect.soft(bad.length, `แถวใน B ที่มีป้ายชั้นอื่น: ${bad.map((r) => `[${r.key} · ฿${r.price} · ${r.classHits.join('+')}]`).join(' ')}`).toBe(0);
      });
    });

    await test.step('2. กดชิป "สัมภาระ" → snapshot ตัวเลือกที่ตั้งจำนวนได้ · กด + ของ "กระเป๋าถือขึ้นเครื่อง" 1 ครั้ง · Esc · รอ ≥ 10 วินาที · snapshot → ชุด G ราคา หัวรายการ และคำใน D-FLT-CLASS [ค้นหา 2]', async () => {
      const dlg = await openChip(gf, page, 'สัมภาระ');
      const addBtns = dlg.getByRole('button', { name: /^เพิ่ม/ });
      const addNames: string[] = [];
      for (const b of await addBtns.all()) addNames.push(await nameOf(b));
      const dlgText = await textOf(dlg);
      note('ตัวเลือกในป๊อปอัปสัมภาระ', `${addNames.join(' | ')} · "${dlgText}"`);
      await gf.check('E2 ป๊อปอัปสัมภาระมีตัวเลือกกระเป๋าโหลด', dlg, async () => {
        const checked = addNames.filter((n) => !/กระเป๋าถือขึ้นเครื่อง/.test(n));
        expect.soft(checked.length, `ตัวนับนอกเหนือจากกระเป๋าถือขึ้นเครื่อง (พบ: ${addNames.join(', ') || '-'})`).toBeGreaterThan(0);
        expect.soft(dlgText, 'มีตัวเลือกกระเป๋าโหลด').toMatch(/กระเป๋าโหลด|โหลดใต้ท้อง|กระเป๋าเดินทางที่โหลด|checked bag/i);
      });
      await gf.click(dlg.getByRole('button', { name: 'เพิ่มกระเป๋าถือขึ้นเครื่อง', exact: true }));
      await gf.press('Escape', { search: 'ตั้งกระเป๋าถือ 1 ใบ (TC-FLT-02 ขั้น 2)' });
      G = await snap(page, 'G');
      const headG = await textOf(headerNote());
      note('หัวรายการ G', headG);
      const mainText = await textOf(page.getByRole('main'));

      await gf.check('E3 แยกได้ว่าราคาใน G รวมกระเป๋าถือ 1 ใบแล้ว', [headerNote(), rowItems(page)], async () => {
        const bByKey = new Map<string, number | null>();
        for (const r of B.rows) if (!bByKey.has(r.key)) bByKey.set(r.key, r.price);
        const matched = G.rows.filter((r) => bByKey.has(r.key));
        const changed = matched.filter((r) => bByKey.get(r.key) !== r.price);
        note('E3 เทียบ G กับ B', `G ${G.rows.length} แถว · อยู่ใน B ${matched.length} · ราคาเปลี่ยน ${changed.length} · ไม่อยู่ใน B ${G.rows.length - matched.length}`);
        if (changed.length > 0) {
          const lower = changed.filter((r) => r.price !== null && (bByKey.get(r.key) ?? 0) > r.price);
          expect.soft(lower.length, `แถวที่ราคาต่ำลงหลังตั้งกระเป๋าถือ: ${lower.map((r) => `[${r.key}: ${bByKey.get(r.key)} → ${r.price}]`).join(' ')}`).toBe(0);
        } else if (matched.length > 0) {
          expect.soft(`${headG} ${mainText}`, 'มีข้อความบอกว่าราคารวมกระเป๋าถือ 1 ใบแล้ว').toMatch(/(?<!ไม่)รวม(ค่า)?(กระเป๋าถือ|สัมภาระถือ)/);
          expect.soft(headG, 'ข้อความหัวรายการต้องไม่ใช่ข้อความเดิมก่อนตั้งตัวกรอง').not.toBe(headB);
          expect.soft(headG, 'ข้อความหัวรายการยังเป็น "อาจมี…ค่าธรรมเนียมสัมภาระ"').not.toMatch(/อาจมีการเรียกเก็บเงินเพิ่มเติมและ\s*ค่าธรรมเนียมสัมภาระ/);
        }
      });
      await gf.check('E4 (ขั้น 2) ยังเป็นชั้นประหยัด · ไม่มีป้ายชั้นอื่นใน G', [cabin(), rowItems(page)], async () => {
        await expect.soft(cabin(), 'หัวผลลัพธ์ = ชั้นประหยัด').toHaveAccessibleName(/ชั้นประหยัด/);
        const bad = G.rows.filter((r) => r.classHits.length > 0);
        expect.soft(bad.length, `แถวใน G ที่มีป้ายชั้นอื่น: ${bad.map((r) => `[${r.key} · ฿${r.price} · ${r.classHits.join('+')}]`).join(' ')}`).toBe(0);
      });
    });

    await test.step('3. กดชิป "สายการบิน" → ชี้ที่ "เอเอ็นเอ" แล้วกด "เท่านั้น" · Esc · รอ ≥ 10 วินาที · snapshot → ชุด A · ตรวจหัวผลลัพธ์ · ค้นคำใน D-FLT-CLASS · ถ้าพบ ขยายแถว (˅) จดหลักฐาน [ค้นหา 3]', async () => {
      const dlg = await openChip(gf, page, 'สายการบิน');
      const al = await pickAirline(dlg, B.rows);
      if (!al) throw new Error('ไม่พบ "เอเอ็นเอ" หรือสายการบินที่มี codeshare ในป๊อปอัปสายการบิน (D-FLT-AIRLINE) → เว็บเปลี่ยน');
      note('D-FLT-AIRLINE', al.name);
      await clickOnly(gf, page, al.item);
      await gf.press('Escape', { search: `${al.name} เท่านั้น (TC-FLT-02 ขั้น 3)` });
      A = await snap(page, 'A');
      const hits = A.rows.filter((r) => r.classHits.length > 0);
      for (const r of hits.slice(0, 2)) {
        const li = rowItemByLabel(page, r.label);
        const exp = li.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first();
        if (await exp.count()) await gf.click(exp);
        const detail = await textOf(li);
        const inB = B.rows.filter((b) => b.key === r.key).map((b) => b.price);
        note('หลักฐาน Q17 (R72)', `แถว ${r.key} · ฿${r.price} · ป้าย ${r.classHits.join('+')} · ใน B ราคา ${inB.length ? inB.join('/') : 'ไม่อยู่ใน B'} · รายละเอียด: ${detail.slice(0, 600)}`);
      }
      await gf.check('E4 (ขั้น 3) ยังเป็นชั้นประหยัด · ไม่มีป้ายชั้นอื่นใน A', [cabin(), hits.length ? rowItems(page).filter({ hasText: CLASS_RE }) : rowItems(page)], async () => {
        await expect.soft(cabin(), 'หัวผลลัพธ์ = ชั้นประหยัด').toHaveAccessibleName(/ชั้นประหยัด/);
        expect.soft(hits.length, `แถวใน A ที่มีป้ายชั้นอื่น${A.complete ? '' : ' (A ไม่ครบ ตรวจเฉพาะแถวที่แสดง)'}: ${hits.map((r) => `[${r.key} · ฿${r.price} · ${r.classHits.join('+')}]`).join(' ')}`).toBe(0);
      });
    });
    gf.finishNA();
  },
);

// ═════════════════════════════════════════ TC-FLT-03 ═════════════════════════════════════════
test(
  'TC-FLT-03 · สายการบิน "เท่านั้น" รวม codeshare + ✕ บนชิป',
  {
    tag: ['@P2', '@5.3'],
    annotation: [
      { type: 'คาดหวัง', description: E1_HEADER },
      { type: 'คาดหวัง', description: 'E2: (ขั้น 2) รายการโหลดใหม่ขณะป๊อปอัปยังเปิด · ชิปแสดงชื่อสายการบินที่เลือกแทนชื่อหมวด พร้อม ✕ (R64)' },
      { type: 'คาดหวัง', description: 'E3: (ขั้น 2) ทุกแถวใน A มี "เอเอ็นเอ" ในข้อความสายการบินของแถวสรุปหรือแถวขยาย ทั้งแบบบินเองและแบบ codeshare (R71)' },
      { type: 'คาดหวัง', description: 'E4: (ขั้น 2) ทุกแถวใน B_ANA อยู่ใน A (เทียบคีย์แถวเท่านั้น ไม่เทียบราคาและป้ายชั้น) (R71) · ตรวจเมื่อ A ครบ ถ้า A มีปุ่มดูเพิ่ม = N/A ข้อนี้' },
      { type: 'คาดหวัง', description: 'E5: (ขั้น 2) ถ้า B_ANA มีแถว codeshare ที่ผู้ให้บริการจริงไม่ใช่เอเอ็นเอ A ต้องมีแถวแบบนี้อย่างน้อย 1 แถว (R71)' },
      { type: 'คาดหวัง', description: 'E6: (ขั้น 2) PA = ราคาต่ำสุดของแถวใน A (ถ้า A ไม่ครบ: PA ≤ ราคาต่ำสุดที่แสดง) และ PA ≥ P0 (R65)' },
      { type: 'คาดหวัง', description: 'E7: (ขั้น 3) ชิปกลับเป็นชื่อหมวด "สายการบิน" ไม่มี ✕ · C = B ทุกแถว (คีย์แถว) ราคาแต่ละแถวเท่าเดิม และแท็บ "ถูกที่สุด" = P0 (R73)' },
      { type: 'ที่มา', description: 'plan/5.3-ตัวกรอง.md · TC-FLT-03 · R64 R65 R71 R73 · Invariant/Metamorphic · Equivalence partition (บินเอง / codeshare) · State · [R]' },
      { type: 'งบค้นหา', description: '3' },
    ],
  },
  async ({ page, gf }) => {
    let B!: Snap, A!: Snap, C!: Snap;
    let al = 'เอเอ็นเอ';
    const hasAl = (r: Row) => r.airlines.includes(al) || r.operatedBy.includes(al) || r.text.includes(al);
    const foreignOp = (r: Row) => {
      const list = r.airlines.split(/\s*(?:และ|,|·)\s*/).filter(Boolean);
      return hasAl(r) && ((r.operatedBy !== '' && !r.operatedBy.includes(al)) || (list.length > 1 && !list[0].includes(al)));
    };
    let BANA: Row[] = [];

    await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ · รอ ≥ 10 วินาที · snapshot → ชุด B พร้อมราคา · แท็บ "ถูกที่สุด" = P0 · จดแถวที่มี "เอเอ็นเอ" = B_ANA [ค้นหา 1]', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1 (TC-FLT-03 ขั้น 1)' });
      await checkHeader(gf, page, 'E1 หัวผลลัพธ์ตรงโจทย์');
      B = await snap(page, 'B');
      BANA = B.rows.filter(hasAl);
      note('B_ANA', show(BANA, 20));
    });

    await test.step('2. กดชิป "สายการบิน" → ที่ "เอเอ็นเอ" กด "เท่านั้น" · snapshot ขณะป๊อปอัปเปิด · Esc · รอ ≥ 10 วินาที · snapshot → ชุด A · ปุ่มดูเพิ่ม · แท็บ "ถูกที่สุด" = PA · ข้อความชิป · ขยาย (˅) 1 แถวที่ไม่ได้มีแค่เอเอ็นเอ [ค้นหา 2]', async () => {
      const dlg = await openChip(gf, page, 'สายการบิน');
      const pick = await pickAirline(dlg, B.rows);
      if (!pick) throw new Error('ไม่พบ "เอเอ็นเอ" หรือสายการบินที่มี codeshare ในป๊อปอัปสายการบิน (D-FLT-AIRLINE) → เว็บเปลี่ยน');
      if (pick.name !== al) {
        al = pick.name;
        BANA = B.rows.filter(hasAl);
        note('D-FLT-AIRLINE (สำรอง)', `${al} · B_ANA ใหม่: ${show(BANA, 20)}`);
      }
      await clickOnly(gf, page, pick.item);
      const bKeys = [...keySet(B.rows)].sort().join('\n');
      const openRows = await waitRows(page, (rs) => [...keySet(rs)].sort().join('\n') !== bKeys);
      const c = chip(page, 'สายการบิน');
      await gf.check('E2 รายการโหลดใหม่ขณะป๊อปอัปเปิด · ชิปเป็นชื่อสายการบิน + ✕', [rowItems(page), c, chipX(page, 'สายการบิน')], async () => {
        await expect.soft(dlg, 'ป๊อปอัปยังเปิดอยู่').toBeVisible();
        expect.soft([...keySet(openRows)].sort().join('\n') !== bKeys, 'รายการขณะป๊อปอัปเปิดเปลี่ยนจาก B แล้ว').toBe(true);
        const t = await textOf(c);
        expect.soft(t, `ชิปแสดงชื่อสายการบินที่เลือก (${al})`).toContain(al);
        expect.soft(t, 'ชิปไม่ได้แสดงแค่ชื่อหมวด').not.toBe('สายการบิน');
        expect.soft(await chipX(page, 'สายการบิน').count(), 'ชิปมีปุ่ม ✕').toBeGreaterThan(0);
      });
      await gf.press('Escape', { search: `${al} เท่านั้น (TC-FLT-03 ขั้น 2)` });
      A = await snap(page, 'A');
      note('ข้อความชิป', await textOf(chip(page, 'สายการบิน')));
      const mixed = A.rows.find((r) => r.airlines !== al || r.operatedBy !== '');
      if (mixed) {
        const li = rowItemByLabel(page, mixed.label);
        const exp = li.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first();
        if (await exp.count()) await gf.click(exp);
        note('แถวขยาย (ผู้ให้บริการจริง)', `${mixed.key}: ${(await textOf(li)).slice(0, 600)}`);
        // อ่านข้อความแถวใหม่ (รวมส่วนที่ขยาย) แต่คงชุดแถว A เดิมไว้ เผื่อแถวที่ขยายเปลี่ยนโครงลิงก์จนอ่านไม่ได้
        const again = new Map((await readRows(page)).map((r) => [r.label, r.text] as const));
        A.rows = A.rows.map((r) => {
          const t = again.get(r.label);
          return t && t.length > r.text.length ? { ...r, text: t } : r;
        });
      }

      await gf.check(`E3 ทุกแถวใน A มี "${al}"`, rowItems(page), async () => {
        const bad = A.rows.filter((r) => !hasAl(r));
        expect.soft(A.rows.length, 'A มีแถว').toBeGreaterThan(0);
        expect.soft(bad.length, `แถวใน A ที่ไม่มี "${al}": ${show(bad)}`).toBe(0);
      });
      if (A.complete) {
        await gf.check('E4 ทุกแถวใน B_ANA อยู่ใน A', rowItems(page), async () => {
          const missing = notIn(BANA, A.rows);
          expect.soft(missing.length, `แถวใน B_ANA ที่ไม่อยู่ใน A: ${show(missing)}`).toBe(0);
        });
      } else {
        gf.na('E4 ทุกแถวใน B_ANA อยู่ใน A', 'A มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" (ชุดไม่ครบ)');
      }
      const bForeign = BANA.filter(foreignOp);
      if (bForeign.length > 0) {
        await gf.check('E5 A มีแถว codeshare ที่ผู้ให้บริการจริงไม่ใช่สายที่เลือก', rowItems(page), async () => {
          const aForeign = A.rows.filter(foreignOp);
          expect.soft(aForeign.length, `แถว codeshare ใน A (ใน B_ANA มี: ${show(bForeign)})`).toBeGreaterThanOrEqual(1);
        });
      } else {
        gf.na('E5 A มีแถว codeshare ที่ผู้ให้บริการจริงไม่ใช่สายที่เลือก', 'วันรัน B_ANA ไม่มีแถว codeshare ที่ผู้ให้บริการจริงไม่ใช่สายที่เลือก');
      }
      await gf.check('E6 PA = ราคาต่ำสุดของ A และ PA ≥ P0', [cheapestTab(page), rowItems(page)], async () => {
        const PA = A.cheapest;
        const minA = minPrice(A.rows);
        expect.soft(PA, 'อ่านราคาแท็บ "ถูกที่สุด" (PA) ได้').not.toBeNull();
        if (PA !== null && minA !== null) {
          if (A.complete) expect.soft(PA, `PA (${PA}) = ราคาต่ำสุดใน A (${minA})`).toBe(minA);
          else expect.soft(PA, `PA (${PA}) ≤ ราคาต่ำสุดที่แสดง (${minA})`).toBeLessThanOrEqual(minA);
        }
        if (PA !== null && B.cheapest !== null) expect.soft(PA, `PA (${PA}) ≥ P0 (${B.cheapest})`).toBeGreaterThanOrEqual(B.cheapest);
      });
    });

    await test.step('3. กด ✕ บนชิปสายการบิน · รอ ≥ 10 วินาที · snapshot → ชุด C พร้อมราคา · แท็บ "ถูกที่สุด" · ข้อความชิป [ค้นหา 3]', async () => {
      await gf.click(chipX(page, 'สายการบิน').first(), { search: 'ล้างสายการบินด้วย ✕ (TC-FLT-03 ขั้น 3)' });
      C = await snap(page, 'C');
      const c = chip(page, 'สายการบิน');
      await gf.check('E7 ชิปกลับเป็น "สายการบิน" ไม่มี ✕ · C = B · ถูกที่สุด = P0', [c, rowItems(page), cheapestTab(page)], async () => {
        expect.soft(await nameOf(c), 'ชิปกลับเป็นชื่อหมวด').toMatch(/^สายการบิน, ไม่ได้เลือก$/);
        expect.soft(await chipX(page, 'สายการบิน').count(), 'ชิปไม่มี ✕').toBe(0);
        const gone = multisetMinus(B.rows, C.rows);
        const added = multisetMinus(C.rows, B.rows);
        expect.soft(gone.length, `แถวใน B ที่ไม่อยู่ใน C: ${show(gone)}`).toBe(0);
        expect.soft(added.length, `แถวใน C ที่ไม่อยู่ใน B: ${show(added)}`).toBe(0);
        const pd = priceDiffs(C.rows, B.rows);
        expect.soft(pd.length, `แถวที่ราคาเปลี่ยน: ${pd.slice(0, 6).join(' | ')}`).toBe(0);
        expect.soft(C.cheapest, `ถูกที่สุด (${C.cheapest}) = P0 (${B.cheapest})`).toBe(B.cheapest);
      });
    });
    gf.finishNA();
  },
);

// ═════════════════════════════════════════ TC-FLT-04 ═════════════════════════════════════════
/** อ่านค่าราคาสูงสุดจากป๊อปอัป/slider ราคา */
async function readPriceX(dlg: Locator, slider: Locator): Promise<number | null> {
  const t = await textOf(dlg);
  const m = t.match(/฿\s*([\d,]+)/);
  if (m) return num(m[1]);
  const v = (await slider.getAttribute('aria-valuetext').catch(() => null)) || (await slider.getAttribute('aria-valuenow').catch(() => null));
  return v ? num(v) : null;
}

test(
  'TC-FLT-04 · ราคาสูงสุด + การปล่อยก๊าซต่ำเท่านั้น + "ล้างทั้งหมด" ในแผง',
  {
    tag: ['@P2', '@5.3'],
    annotation: [
      { type: 'คาดหวัง', description: E1_HEADER },
      { type: 'คาดหวัง', description: 'E2: (ขั้น 2) ทุกแถวที่มีราคาใน P ราคา ≤ X · ชิปราคาแสดงค่า X (R77) · แถว "ไม่มีข้อมูลราคา" ไม่นับในข้อนี้ (ตรวจใน TC-FLT-07)' },
      { type: 'คาดหวัง', description: 'E3: (ขั้น 2) ทุกแถวใน B ที่ราคา ≤ X อยู่ใน P (ตรวจเมื่อ P ครบ) (R77) · แถวใน P ที่ไม่อยู่ใน B ไม่นับว่าล้มในข้อนี้เพราะ B ไม่ครบ ให้จดไว้เป็นหลักฐานของ R62' },
      { type: 'คาดหวัง', description: 'E4: (ขั้น 2) แท็บ "ถูกที่สุด" = ราคาต่ำสุดใน P (ถ้า P ไม่ครบ: ≤ ราคาต่ำสุดที่แสดง) · ถ้า P0 ≤ X ต้องเท่ากับ P0 (R65)' },
      { type: 'คาดหวัง', description: 'E5: (ขั้น 3) ทุกแถวใน E มีค่าการปล่อยก๊าซเป็น % ติดลบ (R85)' },
      { type: 'คาดหวัง', description: 'E6: (ขั้น 3) E ⊆ P (ตรวจเมื่อ P ครบ) · ทุกแถวใน P ที่ % ติดลบอยู่ใน E และแถวใน P ที่ % เป็นบวกไม่อยู่ใน E ไม่ว่าแถวนั้นบินตรงหรือแวะ (R85 R69) · แท็บ "ถูกที่สุด" = ราคาต่ำสุดใน E (R65)' },
      { type: 'คาดหวัง', description: 'E7: (ขั้น 3) ปุ่มเป็น "ตัวกรองทั้งหมด (2)" (R70)' },
      { type: 'คาดหวัง', description: 'E8: (ขั้น 4) ชิปทุกตัวกลับเป็นชื่อหมวด ปุ่มตัวกรองทั้งหมดไม่มีตัวเลขในวงเล็บ · C = B ทุกแถว (คีย์แถว) ราคาแต่ละแถวเท่าเดิม และแท็บ "ถูกที่สุด" = P0 (R75)' },
      { type: 'ที่มา', description: 'plan/5.3-ตัวกรอง.md · TC-FLT-04 · R65 R69 R70 R75 R77 R85 · Invariant/Metamorphic · Boundary (ค่าต่ำสุดของ slider) · State · [R]' },
      { type: 'งบค้นหา', description: '4' },
    ],
  },
  async ({ page, gf }) => {
    let B!: Snap, P!: Snap, E!: Snap, C!: Snap;
    let X: number | null = null;

    await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ · รอ ≥ 10 วินาที · snapshot → ชุด B พร้อมราคาและค่า % การปล่อยก๊าซ · แท็บ "ถูกที่สุด" = P0 [ค้นหา 1]', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1 (TC-FLT-04 ขั้น 1)' });
      await checkHeader(gf, page, 'E1 หัวผลลัพธ์ตรงโจทย์');
      B = await snap(page, 'B');
    });

    await test.step('2. กดชิป "ราคา" → โฟกัส slider → กด Home · อ่านค่าที่ป้าย = X · Esc · รอ ≥ 10 วินาที · snapshot → ชุด P · ปุ่มดูเพิ่ม · แท็บ "ถูกที่สุด" · ข้อความชิปราคา [ค้นหา 2]', async () => {
      const dlg = await openChip(gf, page, 'ราคา');
      const slider = dlg.getByRole('slider', { name: /ราคาสูงสุด/ });
      await slider.focus();
      await gf.press('Home');
      X = await readPriceX(dlg, slider);
      note('X (ราคาสูงสุดต่ำสุดที่ slider เลื่อนได้)', String(X));
      await gf.press('Escape', { search: 'ตั้งราคาสูงสุด = ค่าต่ำสุดของ slider (TC-FLT-04 ขั้น 2)' });
      P = await snap(page, 'P');
      const priceChip = chip(page, 'ราคา');
      const chipTxt = await textOf(priceChip);
      note('ข้อความชิปราคา', chipTxt);
      const newInP = notIn(P.rows, B.rows);
      if (newInP.length) note('หลักฐาน R62 (แถวใน P ที่ไม่อยู่ใน B)', show(newInP, 20));

      await gf.check('E2 ทุกแถวที่มีราคาใน P ≤ X · ชิปแสดง X', [rowItems(page), priceChip], async () => {
        expect.soft(X, 'อ่านค่า X ได้').not.toBeNull();
        if (X !== null) {
          const over = P.rows.filter((r) => r.price !== null && r.price > (X as number));
          expect.soft(over.length, `แถวใน P ที่ราคาเกิน X (${X}): ${show(over)}`).toBe(0);
          expect.soft(chipTxt.replace(/[^\d]/g, ''), `ชิปราคา ("${chipTxt}") แสดงค่า X`).toContain(String(X));
        }
      });
      if (P.complete) {
        await gf.check('E3 ทุกแถวใน B ที่ราคา ≤ X อยู่ใน P', rowItems(page), async () => {
          const missing = notIn(B.rows.filter((r) => r.price !== null && X !== null && r.price <= X), P.rows);
          expect.soft(missing.length, `แถวใน B ที่ราคา ≤ X แต่ไม่อยู่ใน P: ${show(missing)}`).toBe(0);
        });
      } else {
        gf.na('E3 ทุกแถวใน B ที่ราคา ≤ X อยู่ใน P', 'P มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" (ชุดไม่ครบ)');
      }
      await gf.check('E4 ถูกที่สุด = ราคาต่ำสุดใน P (และ = P0 ถ้า P0 ≤ X)', [cheapestTab(page), rowItems(page)], async () => {
        const minP = minPrice(P.rows);
        expect.soft(P.cheapest, 'อ่านราคาแท็บ "ถูกที่สุด" ได้').not.toBeNull();
        if (P.cheapest !== null && minP !== null) {
          if (P.complete) expect.soft(P.cheapest, `ถูกที่สุด (${P.cheapest}) = ราคาต่ำสุดใน P (${minP})`).toBe(minP);
          else expect.soft(P.cheapest, `ถูกที่สุด (${P.cheapest}) ≤ ราคาต่ำสุดที่แสดง (${minP})`).toBeLessThanOrEqual(minP);
        }
        if (B.cheapest !== null && X !== null && B.cheapest <= X) expect.soft(P.cheapest, `P0 (${B.cheapest}) ≤ X (${X}) จึงต้อง = P0`).toBe(B.cheapest);
      });
    });

    await test.step('3. กดชิป "การปล่อยก๊าซ" → เลือก "ต่ำเท่านั้น" · Esc · รอ ≥ 10 วินาที · snapshot → ชุด E · แท็บ "ถูกที่สุด" · ข้อความปุ่ม "ตัวกรองทั้งหมด" [ค้นหา 3]', async () => {
      const dlg = await openChip(gf, page, 'การปล่อยก๊าซ');
      await gf.click(dlg.getByRole('radio', { name: /ต่ำเท่านั้น/ }));
      await gf.press('Escape', { search: 'การปล่อยก๊าซต่ำเท่านั้น (TC-FLT-04 ขั้น 3)' });
      E = await snap(page, 'E');
      const af = await textOf(allFiltersBtn(page));
      note('ปุ่มตัวกรองทั้งหมด', af);
      if (E.rows.length === 0) {
        note('หน้าไม่พบผล (ขั้น 3)', (await textOf(page.getByRole('main'))).slice(0, 400));
        gf.na('E5 ทุกแถวใน E มี % ติดลบ', 'หลังขั้น 3 ไม่เหลือแถว (ตามเงื่อนไขก่อนเริ่ม)');
        gf.na('E6 E ⊆ P · แถว % ติดลบอยู่ใน E · ถูกที่สุด = ต่ำสุดใน E', 'หลังขั้น 3 ไม่เหลือแถว (ตามเงื่อนไขก่อนเริ่ม)');
      } else {
        await gf.check('E5 ทุกแถวใน E มี % การปล่อยก๊าซติดลบ', rowItems(page), async () => {
          const bad = E.rows.filter((r) => r.co2 === null || r.co2 >= 0);
          expect.soft(bad.length, `แถวใน E ที่ % ไม่ติดลบ: ${bad.map((r) => `[${r.key} · ${r.co2 ?? '?'}%]`).join(' ')}`).toBe(0);
        });
        if (P.complete) {
          await gf.check('E6 E ⊆ P · แถว % ติดลบใน P อยู่ใน E · แถว % บวกใน P ไม่อยู่ใน E', rowItems(page), async () => {
            const extra = notIn(E.rows, P.rows);
            expect.soft(extra.length, `แถวใน E ที่ไม่อยู่ใน P: ${show(extra)}`).toBe(0);
            const missingNeg = notIn(P.rows.filter((r) => r.co2 !== null && r.co2 < 0), E.rows);
            expect.soft(missingNeg.length, `แถวใน P ที่ % ติดลบแต่ไม่อยู่ใน E: ${show(missingNeg)}`).toBe(0);
            const eKeys = keySet(E.rows);
            const posIn = P.rows.filter((r) => r.co2 !== null && r.co2 > 0 && eKeys.has(r.key));
            expect.soft(posIn.length, `แถวใน P ที่ % เป็นบวกแต่อยู่ใน E: ${show(posIn)}`).toBe(0);
          });
        } else {
          gf.na('E6 E ⊆ P · แถว % ติดลบใน P อยู่ใน E', 'P มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" (ชุดไม่ครบ)');
        }
        await gf.check('E6 ถูกที่สุด = ราคาต่ำสุดใน E', [cheapestTab(page), rowItems(page)], async () => {
          const minE = minPrice(E.rows);
          expect.soft(E.cheapest, 'อ่านราคาแท็บ "ถูกที่สุด" ได้').not.toBeNull();
          if (E.cheapest !== null && minE !== null) {
            if (E.complete) expect.soft(E.cheapest, `ถูกที่สุด (${E.cheapest}) = ราคาต่ำสุดใน E (${minE})`).toBe(minE);
            else expect.soft(E.cheapest, `ถูกที่สุด (${E.cheapest}) ≤ ราคาต่ำสุดที่แสดง (${minE})`).toBeLessThanOrEqual(minE);
          }
        });
      }
      await gf.check('E7 ปุ่ม "ตัวกรองทั้งหมด (2)"', allFiltersBtn(page), async () => {
        expect.soft(af, 'ข้อความปุ่ม').toMatch(/ตัวกรองทั้งหมด\s*\(2\)/);
      });
    });

    await test.step('4. กด "ตัวกรองทั้งหมด" → กด "ล้างทั้งหมด" ในแผง · ปิดแผง · รอ ≥ 10 วินาที · snapshot → ชุด C พร้อมราคา · แท็บ "ถูกที่สุด" · ข้อความชิปทุกตัวและปุ่ม "ตัวกรองทั้งหมด" [ค้นหา 4]', async () => {
      await gf.click(allFiltersBtn(page));
      const panel = allFiltersPanel(page);
      await panel.waitFor({ state: 'visible', timeout: 15_000 });
      await gf.click(panel.getByRole('button', { name: 'ล้างทั้งหมด', exact: true }));
      await gf.press('Escape', { search: 'ล้างทั้งหมดในแผงตัวกรองทั้งหมด (TC-FLT-04 ขั้น 4)' });
      C = await snap(page, 'C');
      const chipNames: string[] = [];
      for (const c of await allChips(page).all()) chipNames.push(await nameOf(c));
      const af = await textOf(allFiltersBtn(page));
      note('ชิปทุกตัว', chipNames.join(' | '));
      await gf.check('E8 ชิปทุกตัวเป็นชื่อหมวด · ปุ่มไม่มีตัวเลข · C = B · ถูกที่สุด = P0', [allChips(page), allFiltersBtn(page), rowItems(page), cheapestTab(page)], async () => {
        const selected = chipNames.filter((n) => /เลือกแล้ว$/.test(n));
        expect.soft(chipNames.length, 'อ่านชิปได้').toBeGreaterThan(0);
        expect.soft(selected.length, `ชิปที่ยังตั้งค่าค้าง: ${selected.join(' | ')}`).toBe(0);
        expect.soft(af, 'ปุ่ม "ตัวกรองทั้งหมด" ไม่มีตัวเลขในวงเล็บ').not.toMatch(/\(\d+\)/);
        const gone = multisetMinus(B.rows, C.rows);
        const added = multisetMinus(C.rows, B.rows);
        expect.soft(gone.length, `แถวใน B ที่ไม่อยู่ใน C: ${show(gone)}`).toBe(0);
        expect.soft(added.length, `แถวใน C ที่ไม่อยู่ใน B: ${show(added)}`).toBe(0);
        const pd = priceDiffs(C.rows, B.rows);
        expect.soft(pd.length, `แถวที่ราคาเปลี่ยน: ${pd.slice(0, 6).join(' | ')}`).toBe(0);
        expect.soft(C.cheapest, `ถูกที่สุด (${C.cheapest}) = P0 (${B.cheapest})`).toBe(B.cheapest);
      });
    });
    gf.finishNA();
  },
);

// ═════════════════════════════════════════ TC-FLT-05 ═════════════════════════════════════════
test(
  'TC-FLT-05 · เวลาถึง / เวลาออก ตามเวลาท้องถิ่น จนไม่พบผล',
  {
    tag: ['@P2', '@5.3'],
    annotation: [
      { type: 'คาดหวัง', description: E1_HEADER },
      { type: 'คาดหวัง', description: 'E2: (ขั้น 2) ทุกแถวใน A มีเวลาถึงที่แสดงในแถว (เวลาท้องถิ่นโตเกียว ตาม R40) อยู่ใน 00:00–08:00 ไม่ว่ามี +1 หรือไม่ (R80) · แถวที่ถึง 08:00 พอดีไม่นับในข้อนี้ (ขอบ ตรวจใน TC-FLT-07)' },
      { type: 'คาดหวัง', description: 'E3: (ขั้น 2) แถวใน B ที่ถึง 08:01–10:00 ตามเวลาโตเกียว (ซึ่งเท่ากับไม่เกิน 08:00 ถ้าอ่านเป็นเวลาไทย) ไม่อยู่ใน A = ตัวกรองใช้เวลาโตเกียว ไม่ใช่เวลาไทย (R80 · K-TZ)' },
      { type: 'คาดหวัง', description: 'E4: (ขั้น 2) ทุกแถวใน B ที่ถึง 00:00–07:59 อยู่ใน A (ตรวจเมื่อ A ครบ) (R80)' },
      { type: 'คาดหวัง', description: 'E5: (ขั้น 3) ทุกแถวใน T มีเวลาออกที่แสดง (เวลาไทย) อยู่ใน 06:00–12:00 และเวลาถึงยังอยู่ใน 00:00–08:00 · T ⊆ A (ตรวจเมื่อ A ครบ) · ปุ่มยังเป็น "ตัวกรองทั้งหมด (1)" เพราะเวลาออกกับเวลาถึงเป็นหมวดเดียวกัน (R69 R70)' },
      { type: 'คาดหวัง', description: 'E6: (ขั้น 3) ตามตรรกะ K-TZ ทุกแถวใน T ต้อง (ก) ถึงวันถัดไปขึ้นไป (มี +1 หรือ +2) (ข) ระยะเวลา ≥ 10 ชม. (ค) แวะพัก ≥ 1 ครั้ง · เหตุผล: ออกช้าสุด 12:00 เวลาไทย = 14:00 เวลาโตเกียว และถึงเร็วสุด 00:00 ของวันถัดไป จึงต้องบิน ≥ 10 ชม. ซึ่งบินตรงกรุงเทพ–โตเกียวทำไม่ได้ (R69 R80 R40)' },
      { type: 'คาดหวัง', description: 'E7: (ขั้น 4) ไม่มีแถวเที่ยวบิน · มีข้อความบอกว่าไม่พบตัวเลือกที่ตรงกับ **ตัวกรอง** (บอกสาเหตุว่าเป็นตัวกรอง ไม่ใช่แค่ชวนเปลี่ยนวันที่) · มีปุ่ม "ล้างตัวกรองทั้งหมด" · ชิปยังแสดงตัวกรองที่ตั้งไว้ · ปุ่มเป็น "ตัวกรองทั้งหมด (2)" (R81 R70 R75)' },
      { type: 'คาดหวัง', description: 'E8: (ขั้น 4) มีการ์ด "ลองวันที่อื่นๆ" [O-ยังไม่ยืนยัน] · ข้อความตอนสำรวจ "ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ" ใช้เป็นตัวอย่าง ไม่ต้องตรงทุกคำ (R81)' },
      { type: 'ที่มา', description: 'plan/5.3-ตัวกรอง.md · TC-FLT-05 · R69 R70 R80 R81 (R75 เฉพาะการมีปุ่ม) · Invariant/Metamorphic · Negative (เงื่อนไขที่ไม่มีแถวไหนผ่านได้) · [O-ยังไม่ยืนยัน] (E8)' },
      { type: 'งบค้นหา', description: '4' },
    ],
  },
  async ({ page, gf }) => {
    let B!: Snap, A!: Snap, T!: Snap;
    let step4Done = false;

    await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ · รอ ≥ 10 วินาที · snapshot → ชุด B พร้อมเวลาออก เวลาถึง (+N) ระยะเวลา และจำนวนแวะพักของทุกแถว [ค้นหา 1]', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1 (TC-FLT-05 ขั้น 1)' });
      await checkHeader(gf, page, 'E1 หัวผลลัพธ์ตรงโจทย์');
      B = await snap(page, 'B');
      note('B (เวลา)', B.rows.map((r) => `${r.dep}→${r.arr}${r.plus ? '+' + r.plus : ''} ${Math.round(r.durMin / 6) / 10}ชม. แวะ${r.stops}`).join(' | '));
    });

    await test.step('2. กดชิป "เวลา" → ตั้ง slider "เวลาถึง" เป็น 00:00 – 08:00 (D-FLT-ARR) · snapshot ป๊อปอัป (จดว่ามีการบอกเขตเวลาหรือไม่) · Esc · รอ ≥ 10 วินาที · snapshot → ชุด A · ปุ่มดูเพิ่ม [ค้นหา 2]', async () => {
      const dlg = await openChip(gf, page, 'เวลา');
      await setSlider(gf, dlg.getByRole('slider', { name: 'เวลาถึงที่ช้าที่สุด' }), 8, { key: 'ArrowLeft', times: 16 });
      const t = await textOf(dlg);
      note('ป๊อปอัปเวลา (ขั้น 2)', `"${t}" · บอกเขตเวลา: ${/เวลาท้องถิ่น|เขตเวลา|GMT|UTC/.test(t) ? 'มี' : 'ไม่มี'}`);
      await gf.press('Escape', { search: 'ตั้งเวลาถึง 00:00–08:00 (TC-FLT-05 ขั้น 2)' });
      A = await snap(page, 'A');

      await gf.check('E2 ทุกแถวใน A ถึงใน 00:00–08:00 (เวลาโตเกียว)', rowItems(page), async () => {
        const bad = A.rows.filter((r) => toMin(r.arr) > 480);
        expect.soft(bad.length, `แถวใน A ที่ถึงหลัง 08:00: ${show(bad)}`).toBe(0);
      });
      const b0810 = B.rows.filter((r) => toMin(r.arr) >= 481 && toMin(r.arr) <= 600);
      if (b0810.length) {
        await gf.check('E3 แถวใน B ที่ถึง 08:01–10:00 ไม่อยู่ใน A (ใช้เวลาโตเกียว)', rowItems(page), async () => {
          const aKeys = keySet(A.rows);
          const leaked = b0810.filter((r) => aKeys.has(r.key));
          expect.soft(leaked.length, `แถวที่ถึง 08:01–10:00 แต่อยู่ใน A: ${show(leaked)}`).toBe(0);
        });
      } else {
        gf.na('E3 แถวใน B ที่ถึง 08:01–10:00 ไม่อยู่ใน A', 'วันรัน B ไม่มีแถวที่ถึง 08:01–10:00');
      }
      if (A.complete) {
        await gf.check('E4 ทุกแถวใน B ที่ถึง 00:00–07:59 อยู่ใน A', rowItems(page), async () => {
          const missing = notIn(B.rows.filter((r) => toMin(r.arr) <= 479), A.rows);
          expect.soft(missing.length, `แถวใน B ที่ถึง 00:00–07:59 แต่ไม่อยู่ใน A: ${show(missing)}`).toBe(0);
        });
      } else {
        gf.na('E4 ทุกแถวใน B ที่ถึง 00:00–07:59 อยู่ใน A', 'A มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" (ชุดไม่ครบ)');
      }
    });

    await test.step('3. กดชิป "เวลา" → ตั้ง slider "เวลาออกเดินทาง" เป็น 06:00 – 12:00 (D-FLT-DEP) · Esc · รอ ≥ 10 วินาที · snapshot → ชุด T · ข้อความปุ่ม "ตัวกรองทั้งหมด" [ค้นหา 3]', async () => {
      const dlg = await openChip(gf, page, 'เวลา');
      await setSlider(gf, dlg.getByRole('slider', { name: 'เวลาออกเดินทางที่เร็วที่สุด' }), 6, { key: 'ArrowRight', times: 6 });
      await setSlider(gf, dlg.getByRole('slider', { name: 'เวลาออกเดินทางที่ช้าที่สุด' }), 12, { key: 'ArrowLeft', times: 12 });
      note('ป๊อปอัปเวลา (ขั้น 3)', await textOf(dlg));
      await gf.press('Escape', { search: 'ตั้งเวลาออก 06:00–12:00 (TC-FLT-05 ขั้น 3)' });
      T = await snap(page, 'T');
      const af = await textOf(allFiltersBtn(page));
      note('ปุ่มตัวกรองทั้งหมด', af);

      await gf.check('E5 แถวใน T ออก 06:00–12:00 ถึง 00:00–08:00 · ปุ่ม "(1)"', [rowItems(page), allFiltersBtn(page)], async () => {
        const badDep = T.rows.filter((r) => toMin(r.dep) < 360 || toMin(r.dep) > 720);
        const badArr = T.rows.filter((r) => toMin(r.arr) > 480);
        expect.soft(badDep.length, `แถวใน T ที่ออกนอก 06:00–12:00: ${show(badDep)}`).toBe(0);
        expect.soft(badArr.length, `แถวใน T ที่ถึงหลัง 08:00: ${show(badArr)}`).toBe(0);
        expect.soft(af, 'ปุ่มยังเป็น "ตัวกรองทั้งหมด (1)"').toMatch(/ตัวกรองทั้งหมด\s*\(1\)/);
      });
      if (A.complete) {
        await gf.check('E5 T ⊆ A', rowItems(page), async () => {
          const extra = notIn(T.rows, A.rows);
          expect.soft(extra.length, `แถวใน T ที่ไม่อยู่ใน A: ${show(extra)}`).toBe(0);
        });
      } else {
        gf.na('E5 T ⊆ A', 'A มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" (ชุดไม่ครบ)');
      }
      await gf.check('E6 ทุกแถวใน T ถึงวันถัดไป · ระยะเวลา ≥ 10 ชม. · แวะพัก ≥ 1 (K-TZ)', rowItems(page), async () => {
        const bad = T.rows.filter((r) => !(r.plus >= 1) || !(r.durMin >= 600) || !(r.stops >= 1));
        expect.soft(bad.length, `แถวใน T ที่ขัดตรรกะ K-TZ: ${bad.map((r) => `[${r.key} · +${r.plus} · ${r.durMin} นาที · แวะ ${r.stops}]`).join(' ')}`).toBe(0);
      });
    });

    await test.step('4. ถ้า T ยังมีแถว: กดชิปจำนวนครั้งที่แวะพัก → "บินตรงเท่านั้น" · Esc · รอ ≥ 10 วินาที · snapshot หน้าที่ได้ [ค้นหา 4] · ถ้า T ว่างตั้งแต่ขั้น 3 ข้ามขั้นนี้ แล้วตรวจ E7–E8 กับหน้าขั้น 3 · ไม่กด "ลองวันที่อื่นๆ" และไม่กด "ล้างตัวกรองทั้งหมด"', async () => {
      if (T.rows.length > 0) {
        const dlg = await openChip(gf, page, 'จำนวนครั้งที่แวะพัก');
        await gf.click(dlg.getByRole('radio', { name: 'บินตรงเท่านั้น', exact: true }));
        await gf.press('Escape', { search: 'บินตรงเท่านั้น (TC-FLT-05 ขั้น 4)' });
        step4Done = true;
      } else {
        note('ขั้น 4', 'T ว่างตั้งแต่ขั้น 3 → ข้ามขั้น 4 (ใช้งบจริง 3) · ตรวจ E7–E8 กับหน้าขั้น 3');
      }
      const rows = await readRows(page);
      const main = page.getByRole('main');
      const mainText = await textOf(main);
      const clearAll = page.getByRole('button', { name: /ล้างตัวกรองทั้งหมด/ }).filter({ visible: true });
      const timeChip = chip(page, 'เวลา');
      const stopChip = chip(page, 'จำนวนครั้งที่แวะพัก');
      const af = await textOf(allFiltersBtn(page));
      // ผลที่คาดหวังตามแผน E7: "ตัวกรองทั้งหมด (2)" เสมอ (แผนไม่แยกกรณีข้ามขั้น 4 — ห้ามปรับเอง)
      const expectedN = 2;
      await gf.check('E7 หน้าไม่พบผลบอกว่าเกิดจากตัวกรอง + ปุ่มล้างตัวกรองทั้งหมด + ชิปยังแสดง + ปุ่มตัวกรองทั้งหมด', [main, clearAll, timeChip, stopChip, allFiltersBtn(page)], async () => {
        expect.soft(rows.length, `ไม่มีแถวเที่ยวบิน (พบ: ${show(rows)})`).toBe(0);
        expect.soft(mainText, 'ข้อความบอกว่าไม่พบตัวเลือกที่ตรงกับตัวกรอง').toMatch(/ไม่พบ.{0,30}ตัวกรอง/);
        expect.soft(await clearAll.count(), 'มีปุ่ม "ล้างตัวกรองทั้งหมด"').toBeGreaterThan(0);
        expect.soft(await nameOf(timeChip), 'ชิปเวลายังแสดงว่าตั้งค่าไว้').toMatch(/เลือกแล้ว$/);
        if (step4Done) expect.soft(await textOf(stopChip), 'ชิปแวะพักยังเป็น "บินตรง"').toContain('บินตรง');
        expect.soft(af, `ปุ่มเป็น "ตัวกรองทั้งหมด (${expectedN})"`).toMatch(new RegExp(`ตัวกรองทั้งหมด\\s*\\(${expectedN}\\)`));
      });
      const otherDates = page.getByText(/ลองวันที่อื่น/).filter({ visible: true }).first();
      await gf.check('E8 มีการ์ด "ลองวันที่อื่นๆ"', otherDates, async () => {
        await expect.soft(otherDates, 'การ์ด "ลองวันที่อื่นๆ"').toBeVisible();
      });
    });
    gf.finishNA();
  },
);

// ═════════════════════════════════════════ TC-FLT-06 ═════════════════════════════════════════
test(
  'TC-FLT-06 · ตัวเลือกแวะพัก + ตัดสนามบินต่อเครื่อง + slider ระยะเวลา',
  {
    tag: ['@P2', '@5.3'],
    annotation: [
      { type: 'คาดหวัง', description: 'E1: (ขั้น 1) หัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค. · ตัวเลือกแวะพักมี ไม่จำกัด / บินตรงเท่านั้น / ≤1 / ≤2 และไม่มีตัวเลือกสำหรับ ≥3 ครั้ง (แถวแวะ 3 ครั้งจึงเห็นได้เฉพาะตอน "ไม่จำกัด") [O-ยังไม่ยืนยัน] (R84) · ป้าย slider ระยะเวลาที่ค่าเริ่มต้น = "ไม่จำกัด" [O-ยังไม่ยืนยัน] (R88)' },
      { type: 'คาดหวัง', description: 'E2: (ขั้น 3) ไม่มีแถวใดใน H ที่แวะพักที่ H0 (R86)' },
      { type: 'คาดหวัง', description: 'E3: (ขั้น 3) H = แถวใน A ที่ไม่แวะ H0 ทุกแถว (คีย์แถว เท่ากันทั้งสองทิศ ตรวจเมื่อ A และ H ครบ) · โดยเฉพาะทุกแถวบินตรงใน A ต้องอยู่ใน H (R86 R69)' },
      { type: 'คาดหวัง', description: 'E4: (ขั้น 3) ชิปบอกเป็นรายการที่ไม่รวม โดยมีชื่อ H0 เช่น "ไม่รวม: <ชื่อ H0>" [O-ยังไม่ยืนยัน: คำว่า "ไม่รวม:" มาจากผลสำรวจ] (R87)' },
      { type: 'คาดหวัง', description: 'E5: (ขั้น 4) ป้าย slider เปลี่ยนจาก "ไม่จำกัด" เป็นไม่เกิน 40 ชม. (เลื่อน 1 ขั้น = 1 ชม.) [O-ยังไม่ยืนยัน: ค่าสูงสุด 41 = ไม่จำกัด มาจากผลสำรวจ] (R88)' },
      { type: 'คาดหวัง', description: 'E6: (ขั้น 4) ทุกแถวใน L มีระยะเวลา ≤ 40 ชม. · L ⊆ H (ตรวจเมื่อ H ครบ) และทุกแถวใน H ที่ระยะเวลา ≤ 40 ชม. อยู่ใน L (R88 R69)' },
      { type: 'คาดหวัง', description: 'E7: (ขั้น 4) ปุ่มเป็น "ตัวกรองทั้งหมด (3)" (เวลา + สนามบินต่อเครื่อง + ระยะเวลา) (R70)' },
      { type: 'ที่มา', description: 'plan/5.3-ตัวกรอง.md · TC-FLT-06 · R69 R70 R84 R86 R87 R88 · Invariant/Metamorphic · Boundary (ค่าสูงสุดของ slider − 1 ขั้น) · [O-ยังไม่ยืนยัน] (E1 E4 E5)' },
      { type: 'งบค้นหา', description: '4' },
    ],
  },
  async ({ page, gf }) => {
    let B!: Snap, A!: Snap, H!: Snap, L!: Snap;
    let H0 = { name: '', code: '', city: '' };
    const viaH0 = (r: Row) =>
      !r.direct &&
      ((H0.code !== '' && r.stopCodes.includes(H0.code)) || (r.stopCodes.length === 0 && H0.city !== '' && r.stopSegs.some((s) => s.includes(H0.city))));

    await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ · รอ ≥ 10 วินาที · กดชิปจำนวนครั้งที่แวะพัก → snapshot ตัวเลือก → Esc · กดชิป "ระยะเวลา" → snapshot ป้าย slider ค่าเริ่มต้น → Esc · จดว่า B มีแถวแวะ ≥ 3 ครั้งหรือไม่ [ค้นหา 1]', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1 (TC-FLT-06 ขั้น 1)' });
      await checkHeader(gf, page, 'E1 หัวผลลัพธ์ตรงโจทย์');
      B = await snap(page, 'B');
      note('B มีแถวแวะ ≥ 3 ครั้ง', String(B.rows.some((r) => r.stops >= 3)));

      const sd = await openChip(gf, page, 'จำนวนครั้งที่แวะพัก');
      const radios = sd.getByRole('radio');
      const names: string[] = [];
      // radio ไม่มี attribute aria-label (ชื่อมาจากป้ายข้าง ๆ) → อ่านชื่อที่เข้าถึงได้
      for (const r of await radios.all()) names.push(await accName(r));
      note('ตัวเลือกแวะพัก', names.join(' | '));
      await gf.check('E1 ตัวเลือกแวะพัก ไม่จำกัด / บินตรง / ≤1 / ≤2 และไม่มี ≥3', sd.getByRole('radiogroup'), async () => {
        const all = names.join(' | ');
        expect.soft(all, 'มี "ไม่จำกัด"').toMatch(/ไม่จำกัด/);
        expect.soft(all, 'มี "บินตรงเท่านั้น"').toMatch(/บินตรงเท่านั้น/);
        expect.soft(all, 'มี "แวะพัก 1 ครั้งหรือน้อยกว่า"').toMatch(/แวะพัก 1 ครั้ง/);
        expect.soft(all, 'มี "แวะพัก 2 ครั้งหรือน้อยกว่า"').toMatch(/แวะพัก 2 ครั้ง/);
        expect.soft(all, 'ไม่มีตัวเลือกสำหรับ ≥ 3 ครั้ง').not.toMatch(/แวะพัก ([3-9]|\d{2}) ครั้ง/);
        expect.soft(names.length, 'มี 4 ตัวเลือก').toBe(4);
      });
      await gf.press('Escape');

      const dd = await openChip(gf, page, 'ระยะเวลา');
      // อ่านเฉพาะป้าย "ระยะเวลาบิน · …" (ข้อความทั้งป๊อปอัปมีคำ "ไม่จำกัดระยะเวลา" ที่ไม่ใช่ป้ายปนอยู่ ซึ่งจะทำให้ผ่านเสมอ)
      const durLblEl = dd.getByText(/^\s*ระยะเวลาบิน\s*·/).first();
      const durLabel = (await durLblEl.count()) ? await textOf(durLblEl) : await textOf(dd);
      note('ป้าย slider ระยะเวลา (ค่าเริ่มต้น)', `${durLabel} · ป๊อปอัป: "${await textOf(dd)}"`);
      await gf.check('E1 ป้าย slider ระยะเวลาเริ่มต้น = "ไม่จำกัด"', dd, async () => {
        expect.soft(durLabel, 'ป้าย slider ระยะเวลา').toMatch(/ระยะเวลาบิน\s*·\s*ไม่จำกัด|ไม่จำกัด/);
      });
      await gf.press('Escape');
    });

    await test.step('2. กดชิป "เวลา" → ตั้ง slider "เวลาถึง" 00:00 – 08:00 · Esc · รอ ≥ 10 วินาที · snapshot → ชุด A พร้อมจำนวนแวะ สนามบินที่แวะ และระยะเวลา · ปุ่มดูเพิ่ม [ค้นหา 2]', async () => {
      const dlg = await openChip(gf, page, 'เวลา');
      await setSlider(gf, dlg.getByRole('slider', { name: 'เวลาถึงที่ช้าที่สุด' }), 8, { key: 'ArrowLeft', times: 16 });
      await gf.press('Escape', { search: 'ตั้งเวลาถึง 00:00–08:00 (TC-FLT-06 ขั้น 2)' });
      A = await snap(page, 'A');
      note('A (แวะ/ระยะเวลา)', A.rows.map((r) => `${r.key} [${r.stopCodes.join(',')}] ${r.durMin}นาที`).join(' | '));
    });

    await test.step('3. กดชิป "สนามบินสำหรับต่อเครื่อง" → เอาเครื่องหมายออกจากสนามบินตาม D-FLT-HUB-A (จดชื่อและรหัส = H0) · Esc · รอ ≥ 10 วินาที · snapshot → ชุด H · ข้อความชิป · ปุ่มดูเพิ่ม [ค้นหา 3]', async () => {
      const dlg = await openChip(gf, page, 'สนามบินสำหรับต่อเครื่อง');
      const boxes = dlg.getByRole('checkbox', { name: /\([A-Z]{3}\)\s*$/ });
      const list: { name: string; code: string; city: string }[] = [];
      await boxes.first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
      for (const b of await boxes.all()) {
        // checkbox ไม่มี attribute aria-label (ชื่อมาจากป้าย) → อ่านชื่อที่เข้าถึงได้
        const n = await accName(b);
        const m = n.match(/^(.*?)\s*\(([A-Z]{3})\)\s*$/);
        if (m) list.push({ name: n, code: m[2], city: m[1] });
      }
      const connecting = A.rows.filter((r) => !r.direct);
      const pick =
        list.find((h) => connecting.some((r) => r.stopCodes.includes(h.code) || (r.stopCodes.length === 0 && r.stopSegs.some((s) => s.includes(h.city))))) ||
        list[0];
      if (!pick) throw new Error('ไม่พบรายการสนามบินในป๊อปอัป "สนามบินสำหรับต่อเครื่อง" → เว็บเปลี่ยน');
      H0 = pick;
      note('H0 (D-FLT-HUB-A)', `${H0.name}${connecting.length ? '' : ' · A ไม่มีแถวต่อเครื่อง จึงใช้ D-FLT-HUB (สนามบินแรกในรายการ)'}`);
      await gf.click(dlg.getByRole('checkbox', { name: H0.name, exact: true }));
      await gf.press('Escape', { search: `ไม่รวมสนามบินต่อเครื่อง ${H0.code} (TC-FLT-06 ขั้น 3)` });
      H = await snap(page, 'H');
      const hubChip = chip(page, 'สนามบินสำหรับต่อเครื่อง');
      const chipTxt = await textOf(hubChip);
      note('ข้อความชิปสนามบินต่อเครื่อง', chipTxt);

      await gf.check(`E2 ไม่มีแถวใน H ที่แวะ ${H0.code}`, rowItems(page), async () => {
        const bad = H.rows.filter(viaH0);
        expect.soft(bad.length, `แถวใน H ที่แวะ H0 (${H0.name}): ${show(bad)}`).toBe(0);
      });
      if (connecting.length === 0) {
        gf.na('E3 H = แถวใน A ที่ไม่แวะ H0', 'ชุด A ไม่มีแถวต่อเครื่องเลย (ตามเงื่อนไขก่อนเริ่ม)');
      } else if (!A.complete || !H.complete) {
        gf.na('E3 H = แถวใน A ที่ไม่แวะ H0', `${!A.complete ? 'A' : 'H'} มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" (ชุดไม่ครบ)`);
      } else {
        await gf.check('E3 H = แถวใน A ที่ไม่แวะ H0 (ทั้งสองทิศ) · แถวบินตรงใน A อยู่ใน H ครบ', rowItems(page), async () => {
          const expected = A.rows.filter((r) => !viaH0(r));
          const missing = notIn(expected, H.rows);
          const extra = notIn(H.rows, expected);
          const directMissing = notIn(A.rows.filter((r) => r.direct), H.rows);
          expect.soft(directMissing.length, `แถวบินตรงใน A ที่หายจาก H: ${show(directMissing)}`).toBe(0);
          expect.soft(missing.length, `แถวใน A ที่ไม่แวะ H0 แต่ไม่อยู่ใน H: ${show(missing)}`).toBe(0);
          expect.soft(extra.length, `แถวใน H ที่ไม่อยู่ในชุด "A ที่ไม่แวะ H0": ${show(extra)}`).toBe(0);
        });
      }
      await gf.check('E4 ชิปบอก "ไม่รวม: <ชื่อ H0>"', hubChip, async () => {
        expect.soft(chipTxt, 'ชิปบอกเป็นรายการที่ไม่รวม').toMatch(/ไม่รวม/);
        expect.soft(chipTxt, `ชิปมีชื่อ H0 (${H0.city})`).toContain(H0.city);
      });
    });

    await test.step('4. กดชิป "ระยะเวลา" → โฟกัส slider → กด ← 1 ครั้ง · อ่านป้าย · Esc · รอ ≥ 10 วินาที · snapshot → ชุด L · ข้อความปุ่ม "ตัวกรองทั้งหมด" [ค้นหา 4]', async () => {
      const dlg = await openChip(gf, page, 'ระยะเวลา');
      const slider = dlg.getByRole('slider', { name: 'ระยะเวลา', exact: true });
      await slider.focus();
      await gf.press('ArrowLeft');
      // ป้าย slider = ข้อความ "ระยะเวลาบิน · …" · ข้อความทั้งป๊อปอัปมีคำ "ไม่จำกัดระยะเวลา" ที่ไม่ใช่ป้าย (ไม่อยู่ใน accessibility tree) ปนอยู่ จึงไม่ใช้ทั้งป๊อปอัปเป็นป้าย
      const lblEl = dlg.getByText(/^\s*ระยะเวลาบิน\s*·/).first();
      const dlgTxt = await textOf(dlg);
      const lbl = (await lblEl.count()) ? await textOf(lblEl) : dlgTxt;
      note('ป้าย slider ระยะเวลา (หลัง ← 1)', `${lbl} · ค่า ${await slider.getAttribute('aria-valuenow').catch(() => null)} · ป๊อปอัป: "${dlgTxt}"`);
      await gf.check('E5 ป้าย slider เป็น "ไม่เกิน 40 ชม."', dlg, async () => {
        expect.soft(lbl, 'ป้ายไม่ใช่ "ไม่จำกัด" แล้ว').not.toMatch(/ไม่จำกัด/);
        expect.soft(lbl, 'ป้าย = ไม่เกิน 40 ชม.').toMatch(/ไม่เกิน\s*40\s*ชม/);
      });
      await gf.press('Escape', { search: 'ตั้งระยะเวลา ← 1 ขั้น (TC-FLT-06 ขั้น 4)' });
      L = await snap(page, 'L');
      const af = await textOf(allFiltersBtn(page));
      note('ปุ่มตัวกรองทั้งหมด', af);

      await gf.check('E6 ทุกแถวใน L ระยะเวลา ≤ 40 ชม.', rowItems(page), async () => {
        const bad = L.rows.filter((r) => !(r.durMin <= 2400));
        expect.soft(bad.length, `แถวใน L ที่ยาวเกิน 40 ชม.: ${bad.map((r) => `[${r.key} · ${r.durMin} นาที]`).join(' ')}`).toBe(0);
      });
      if (H.complete) {
        await gf.check('E6 L ⊆ H และแถวใน H ที่ ≤ 40 ชม. อยู่ใน L', rowItems(page), async () => {
          const extra = notIn(L.rows, H.rows);
          const missing = notIn(H.rows.filter((r) => r.durMin <= 2400), L.rows);
          expect.soft(extra.length, `แถวใน L ที่ไม่อยู่ใน H: ${show(extra)}`).toBe(0);
          expect.soft(missing.length, `แถวใน H ที่ ≤ 40 ชม. แต่ไม่อยู่ใน L: ${show(missing)}`).toBe(0);
        });
      } else {
        gf.na('E6 L ⊆ H และแถวใน H ที่ ≤ 40 ชม. อยู่ใน L', 'H มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" (ชุดไม่ครบ)');
      }
      await gf.check('E7 ปุ่ม "ตัวกรองทั้งหมด (3)"', allFiltersBtn(page), async () => {
        expect.soft(af, 'ข้อความปุ่ม').toMatch(/ตัวกรองทั้งหมด\s*\(3\)/);
      });
    });
    gf.finishNA();
  },
);

// ═════════════════════════════════════════ TC-FLT-07 ═════════════════════════════════════════
test(
  'TC-FLT-07 · ⚠️ ตั๋วแยก · slider ราคา · แถวไม่มีราคา · ชิปเวลา · ขอบ 08:00 · สับเซตเทียบชุดแรก',
  {
    tag: ['@P2', '@5.3', '@known-defect'],
    annotation: [
      { type: 'คาดหวัง', description: E1_HEADER },
      { type: 'คาดหวัง', description: 'E2: (ขั้น 1) ค่าเริ่มต้นของสวิตช์ตั๋วแยก = ซ่อน หรือถ้าค่าเริ่มต้นเป็น "แสดง" ต้องมีชิปในแถวชิปที่บอกสถานะนี้โดยไม่ต้องเปิดแผง (R76)' },
      { type: 'คาดหวัง', description: 'E3: (ขั้น 2) X ≤ P0 = slider ราคาเลื่อนลงได้ถึงหรือต่ำกว่าราคาถูกสุด (R79)' },
      { type: 'คาดหวัง', description: 'E4: (ขั้น 2) ไม่มีแถว "ไม่มีข้อมูลราคา" (แถวที่ไม่แสดงราคา) ใน P · ถ้ามี จดคีย์แถวและว่าอยู่ใน B หรือไม่ (Q20) (R78)' },
      { type: 'คาดหวัง', description: 'E5: (ขั้น 2) ทุกแถวใน P อยู่ใน B (ผลเดิมที่หน้าบอกว่ามีทั้งหมด N รายการ) และ N\' ≤ N · ถ้า P มีแถวที่ไม่อยู่ใน B = ข้อความ N ไม่ได้นับทุกเที่ยวบินที่ตรงเงื่อนไข (R62 · Q13)' },
      { type: 'คาดหวัง', description: 'E6: (ขั้น 3) ชิปเวลาแสดงค่าที่ตั้ง (มีช่วงเวลา หรืออย่างน้อย "08:00") เหมือนชิปอื่นที่แสดงค่า ไม่ใช่แค่คำว่า "เวลา" (R82)' },
      { type: 'คาดหวัง', description: 'E7: (ขั้น 3) ป้าย slider แสดงช่วง 00:00 – 08:00 และ r08 (ถึง 08:00 พอดี) อยู่ใน T เพราะขอบบนที่ป้ายแสดงต้องรวมค่านั้น (R83)' },
      { type: 'ที่มา', description: 'plan/5.3-ตัวกรอง.md · TC-FLT-07 · R62 R76 R78 R79 R82 R83 · Invariant/Metamorphic · Boundary (ขอบ 08:00, ค่าต่ำสุดของ slider) · Negative (แถวไม่มีราคา) · [R] · ⚠️ ข้อบกพร่องที่รู้แล้ว (ผลสำรวจ 2026-11-03 คาดว่าจะล้ม E2–E7)' },
      { type: 'งบค้นหา', description: '3' },
    ],
  },
  async ({ page, gf }) => {
    let B!: Snap, P!: Snap, T!: Snap;
    let X: number | null = null;
    let r08: Row[] = [];
    let arrLabel = '';

    await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ · รอ ≥ 10 วินาที · snapshot → ชุด B (|B|) · ข้อความ "มีผลลัพธ์ N รายการ" = N · แท็บ "ถูกที่สุด" = P0 · กด "ตัวกรองทั้งหมด" → จดค่าสวิตช์ "ตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" → ปิดแผงโดยไม่เปลี่ยน · snapshot แถวชิป [ค้นหา 1]', async () => {
      await gf.goto(getU1(), { search: 'เปิด U1 (TC-FLT-07 ขั้น 1)' });
      await checkHeader(gf, page, 'E1 หัวผลลัพธ์ตรงโจทย์');
      B = await snap(page, 'B');
      note('|B| / N', `${B.rows.length} / ${B.count.n}`);

      await gf.click(allFiltersBtn(page));
      const panel = allFiltersPanel(page);
      await panel.waitFor({ state: 'visible', timeout: 15_000 });
      const group = panel.getByRole('radiogroup', { name: /ตั๋วแยก/ });
      await group.scrollIntoViewIfNeeded().catch(() => {});
      await gf.pause(1500, 2500);
      const showChecked = await panel.getByRole('radio', { name: /^แสดงตั๋วแยก/ }).isChecked().catch(() => false);
      const hideChecked = await panel.getByRole('radio', { name: /^ซ่อนตั๋วแยก/ }).isChecked().catch(() => false);
      const shot = test.info().outputPath('flt07-separate-tickets-panel.png');
      await page.screenshot({ path: shot }).catch(() => {});
      await test.info().attach('แผงตัวกรองทั้งหมด: สวิตช์ตั๋วแยก (ค่าเริ่มต้น)', { path: shot, contentType: 'image/png' }).catch(() => {});
      note('สวิตช์ตั๋วแยก (ค่าเริ่มต้น)', hideChecked ? 'ซ่อน' : showChecked ? 'แสดง' : 'อ่านไม่ได้');
      await gf.press('Escape');

      const chipNames: string[] = [];
      for (const c of await allChips(page).all()) chipNames.push(await nameOf(c));
      const sepChip = page
        .getByRole('button', { name: /ตั๋วแยก|เปลี่ยนเครื่องด้วยตนเอง/, includeHidden: true })
        .filter({ visible: true });
      const sepChipCount = await sepChip.count();
      note('แถวชิป', chipNames.join(' | '));
      await gf.check('E2 ค่าเริ่มต้นตั๋วแยก = ซ่อน หรือมีชิปบอกสถานะ', [allChips(page), sepChip], async () => {
        expect.soft(hideChecked || showChecked, 'อ่านค่าสวิตช์ตั๋วแยกได้').toBe(true);
        expect.soft(hideChecked || (showChecked && sepChipCount > 0), `ค่าเริ่มต้น = ${hideChecked ? 'ซ่อน' : 'แสดง'} · ชิปตั๋วแยกในแถวชิป ${sepChipCount} ตัว (ชิป: ${chipNames.join(' | ')})`).toBe(true);
      });
    });

    await test.step('2. กดชิป "ราคา" → โฟกัส slider → กด Home · อ่านค่าที่ป้าย = X · Esc · รอ ≥ 10 วินาที · snapshot → ชุด P (แถวไม่มีราคาแยกไว้) · "มีผลลัพธ์ N\' รายการ" · r08 · ปุ่มดูเพิ่ม [ค้นหา 2]', async () => {
      const dlg = await openChip(gf, page, 'ราคา');
      const slider = dlg.getByRole('slider', { name: /ราคาสูงสุด/ });
      await slider.focus();
      await gf.press('Home');
      X = await readPriceX(dlg, slider);
      note('X', String(X));
      await gf.press('Escape', { search: 'ตั้งราคาสูงสุด = ค่าต่ำสุดของ slider (TC-FLT-07 ขั้น 2)' });
      P = await snap(page, 'P');
      const noPrice = P.rows.filter((r) => r.price === null);
      if (noPrice.length) note('แถวไม่มีราคาใน P (Q20)', noPrice.map((r) => `${r.key} · ${keySet(B.rows).has(r.key) ? 'อยู่ใน B' : 'ไม่อยู่ใน B'}`).join(' | '));
      r08 = P.rows.filter((r) => r.arr === '08:00');
      note('r08', show(r08));

      await gf.check('E3 X ≤ P0 (slider ราคาลงได้ถึงราคาถูกสุด)', [chip(page, 'ราคา'), cheapestTab(page)], async () => {
        expect.soft(X, 'อ่านค่า X ได้').not.toBeNull();
        expect.soft(B.cheapest, 'อ่าน P0 ได้').not.toBeNull();
        if (X !== null && B.cheapest !== null) expect.soft(X, `X (${X}) ≤ P0 (${B.cheapest})`).toBeLessThanOrEqual(B.cheapest);
      });
      if (P.rows.length === 0) {
        note('หน้าไม่พบผล (ขั้น 2)', (await textOf(page.getByRole('main'))).slice(0, 400));
        gf.na('E4 ไม่มีแถว "ไม่มีข้อมูลราคา" ใน P', 'หลังขั้น 2 ไม่เหลือแถว (ตามเงื่อนไขก่อนเริ่ม)');
        gf.na('E5 ทุกแถวใน P อยู่ใน B และ N\' ≤ N', 'หลังขั้น 2 ไม่เหลือแถว (ตามเงื่อนไขก่อนเริ่ม)');
      } else {
        await gf.check('E4 ไม่มีแถว "ไม่มีข้อมูลราคา" ใน P', noPrice.length ? rowItems(page).filter({ hasText: /ไม่มีข้อมูลราคา/ }) : rowItems(page), async () => {
          expect.soft(noPrice.length, `แถวไม่มีราคาใน P: ${noPrice.map((r) => `[${r.key} · ${keySet(B.rows).has(r.key) ? 'อยู่ใน B' : 'ไม่อยู่ใน B'}]`).join(' ')}`).toBe(0);
        });
        await gf.check('E5 ทุกแถวใน P อยู่ใน B และ N\' ≤ N', [rowItems(page), resultCountText(page)], async () => {
          const extra = notIn(P.rows, B.rows);
          expect.soft(extra.length, `แถวใน P ที่ไม่อยู่ใน B (ข้อความ N = ${B.count.n} ไม่ได้นับทุกเที่ยวบิน): ${show(extra)}`).toBe(0);
          expect.soft(P.count.n, 'อ่าน N\' ได้').not.toBeNull();
          if (P.count.n !== null && B.count.n !== null) expect.soft(P.count.n, `N' (${P.count.n}) ≤ N (${B.count.n})`).toBeLessThanOrEqual(B.count.n);
        });
      }
    });

    await test.step('3. กดชิป "เวลา" → ตั้ง slider "เวลาถึง" 00:00 – 08:00 · snapshot ป้าย slider · Esc · รอ ≥ 10 วินาที · snapshot → ชุด T · ข้อความชิปเวลาเทียบกับชิปราคา [ค้นหา 3]', async () => {
      const dlg = await openChip(gf, page, 'เวลา');
      await setSlider(gf, dlg.getByRole('slider', { name: 'เวลาถึงที่ช้าที่สุด' }), 8, { key: 'ArrowLeft', times: 16 });
      arrLabel = await textOf(dlg);
      note('ป้าย slider เวลาถึง', arrLabel);
      const labelOk = /00:00\s*[-–]\s*08:00/.test(arrLabel);
      if (r08.length > 0) {
        await gf.check('E7 ป้าย slider แสดง 00:00 – 08:00', dlg, async () => {
          expect.soft(labelOk, `ป้าย slider ("${arrLabel}") แสดงช่วง 00:00 – 08:00`).toBe(true);
        });
      }
      await gf.press('Escape', { search: 'ตั้งเวลาถึง 00:00–08:00 (TC-FLT-07 ขั้น 3)' });
      T = await snap(page, 'T');
      const timeChip = chip(page, 'เวลา');
      const priceChip = chip(page, 'ราคา');
      const timeTxt = await textOf(timeChip);
      const priceTxt = await textOf(priceChip);
      note('ชิปเวลา / ชิปราคา', `"${timeTxt}" / "${priceTxt}"`);

      await gf.check('E6 ชิปเวลาแสดงค่าที่ตั้ง (ไม่ใช่แค่ "เวลา")', [timeChip, priceChip], async () => {
        expect.soft(timeTxt, `ชิปเวลาไม่ใช่แค่คำว่า "เวลา" (ชิปราคา: "${priceTxt}")`).not.toBe('เวลา');
        expect.soft(timeTxt, 'ชิปเวลามีช่วงเวลาหรืออย่างน้อย "08:00"').toMatch(/\d{1,2}:\d{2}/);
      });
      if (r08.length > 0) {
        await gf.check('E7 r08 (ถึง 08:00 พอดี) อยู่ใน T', rowItems(page), async () => {
          const missing = notIn(r08, T.rows);
          expect.soft(missing.length, `แถวที่ถึง 08:00 พอดีแต่ไม่อยู่ใน T (ขอบบนไม่รวม 08:00): ${show(missing)}`).toBe(0);
        });
      } else {
        gf.na('E7 ป้าย 00:00 – 08:00 และ r08 อยู่ใน T', P.rows.length === 0 ? 'หลังขั้น 2 ไม่เหลือแถว (ตามเงื่อนไขก่อนเริ่ม)' : 'วันรัน P ไม่มีแถวที่ถึง 08:00 พอดี');
      }
    });
    gf.finishNA();
  },
);

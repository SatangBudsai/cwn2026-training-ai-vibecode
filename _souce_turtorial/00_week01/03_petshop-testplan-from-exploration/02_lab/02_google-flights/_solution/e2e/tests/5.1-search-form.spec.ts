/**
 * 5.1 ฟอร์มค้นหา — TC-SRCH-01 … TC-SRCH-10
 * ที่มา: plan/5.1-ฟอร์มค้นหา.md (ผลที่คาดหวังคัดจากแผนเท่านั้น) · หลักฐาน label/role: exploration/C1.md + C1/.playwright-cli/*.yml
 *
 * หมายเหตุตัวระบุ element
 *  - ปุ่ม < > ข้างช่องวันที่ และปุ่ม ± ระยะทริปในปฏิทินเป็น button [aria-hidden] ไม่มีชื่อ (C1 K08) จึงหาโดยตำแหน่งข้างช่องวันที่
 *    แล้วติด data-e2e-* (attribute ของชุดทดสอบเอง) ไว้คลิก/ตรวจ
 *  - ไอคอนผู้โดยสารเสียชื่อขณะป๊อปอัปเปิด (C1 snapshot 00-44-00) จึงติด data-e2e="pax-icon" ไว้ก่อนเปิด
 */
import { test, expect, U0, getU1, saveState, type GF } from '../support/gf';
import type { Locator, Page } from '@playwright/test';

// ───────────────────────── ข้อมูลทดสอบ ─────────────────────────
const D_DATE_TXT = '15 ธ.ค. 2026';
const D_DATE1_TXT = '16 ธ.ค. 2026';
const RE_DATE15 = /อังคาร\s*15\s*ธ\.ค\./;
const RE_DATE16 = /พุธ\s*16\s*ธ\.ค\./;
const BKK_SET = ['BKK', 'DMK'];
const TYO_SET = ['HND', 'NRT'];
const CELLTOL = 50; // D-SRCH-CELLTOL
const CUTOFF_MIN = 60; // D-SRCH-CUTOFF

const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_MON_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_WEEKDAY_FORMS = [
  ['อาทิตย์', 'อา.'], ['จันทร์', 'จ.'], ['อังคาร', 'อ.'], ['พุธ', 'พ.'],
  ['พฤหัสบดี', 'พฤหัสฯ', 'พฤหัส', 'พฤ.'], ['ศุกร์', 'ศ.'], ['เสาร์', 'ส.'],
];
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ABBR_RE = TH_MON_ABBR.map(reEsc).join('|');
const MON_RE = TH_MONTHS.join('|');

// ───────────────────────── วันที่ (เวลาไทย) ─────────────────────────
type YMD = { y: number; m: number; d: number };
function bkkNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: g('year'), m: g('month'), d: g('day'), hh: g('hour') % 24, mm: g('minute') };
}
function addDays(a: YMD, n: number): YMD {
  const dt = new Date(Date.UTC(a.y, a.m - 1, a.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
const weekdayOf = (a: YMD) => new Date(Date.UTC(a.y, a.m - 1, a.d)).getUTCDay();
const ymdStr = (a: YMD) => `${a.y}-${String(a.m).padStart(2, '0')}-${String(a.d).padStart(2, '0')}`;
const sameYMD = (a?: YMD | null, b?: YMD | null) => !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d;
function weekdayOfText(text: string): number {
  let best = -1, len = 0;
  TH_WEEKDAY_FORMS.forEach((forms, i) => forms.forEach((f) => {
    if (text.trim().startsWith(f) && f.length > len) { best = i; len = f.length; }
  }));
  return best;
}
/** "อังคาร 15 ธ.ค." / "2 พ.ย. 2026" → { d, m, y? } */
function parseShortDate(text: string): { d: number; m: number; y?: number } | null {
  const mm = text.match(new RegExp(`(\\d{1,2})\\s*(${ABBR_RE})\\s*(\\d{4})?`));
  if (!mm) return null;
  return { d: Number(mm[1]), m: TH_MON_ABBR.indexOf(mm[2]) + 1, y: mm[3] ? Number(mm[3]) : undefined };
}
/** "15 ธันวาคม ค.ศ. 2026" → { d, m, y? } */
function parseLongDate(text: string): { d: number; m: number; y?: number } | null {
  const mm = text.match(new RegExp(`(\\d{1,2})\\s+(${MON_RE})(?:\\s+ค\\.ศ\\.\\s*(\\d{4}))?`));
  if (!mm) return null;
  return { d: Number(mm[1]), m: TH_MONTHS.indexOf(mm[2]) + 1, y: mm[3] ? Number(mm[3]) : undefined };
}
const shortTxt = (a: YMD) => `${a.d} ${TH_MON_ABBR[a.m - 1]} ${a.y}`; // D-SRCH-YEST-TXT

// ───────────────────────── ราคา ─────────────────────────
/** "฿5,900" → 5900 · "฿14.8K" → 14800 */
function parseBaht(text: string | undefined | null): { value: number; k: boolean } | null {
  const m = (text || '').match(/฿\s*([\d,]+(?:\.\d+)?)\s*(K)?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return { value: m[2] ? Math.round(n * 1000) : n, k: !!m[2] };
}

// ───────────────────────── บันทึกค่าในรายงาน ─────────────────────────
function note(type: string, description: string) {
  test.info().annotations.push({ type, description });
}
const hhmm = () => { const n = bkkNow(); return `${String(n.hh).padStart(2, '0')}:${String(n.mm).padStart(2, '0')}`; };

// ───────────────────────── ฟอร์มหลัก ─────────────────────────
const isResults = (page: Page) => /\/travel\/flights\/search/.test(page.url());
function form(page: Page) {
  return {
    trip: page.getByRole('combobox', { name: /^เปลี่ยนประเภทตั๋ว/ }).first(),
    pax: page.getByRole('button', { name: /^ผู้โดยสาร \d+ คน/ }).first(),
    cabin: page.getByRole('combobox', { name: /^เปลี่ยนชั้นโดยสาร/ }).first(),
    origin: page.getByRole('combobox', { name: /^ต้นทาง/ }).first(),
    dest: page.getByRole('combobox', { name: /^ปลายทาง/ }).first(),
    swap: page.getByRole('button', { name: 'สลับต้นทางกับปลายทาง' }).first(),
    date: page.getByRole('textbox', { name: /^ขาไป/ }).first(),
    ret: page.getByRole('textbox', { name: /^ขากลับ/ }).first(),
  };
}
const searchBtn = (page: Page) => page.getByRole('button', { name: 'ค้นหา', exact: true }).first();
/** ปุ่มหลักใต้ฟอร์ม ("ค้นหา" หรือ "สำรวจ") */
const mainBtn = (page: Page) => page.getByRole('search').first().getByRole('button', { name: /^(ค้นหา$|สำรวจ)/ }).first();
const headerTargets = (page: Page) => { const f = form(page); return [f.trip, f.pax, f.cabin, f.origin, f.dest, f.date]; };

type HeaderExp = { trip?: string; pax?: number; cabin?: string; origin?: string; dest?: string; date?: RegExp };
async function assertHeader(page: Page, exp: HeaderExp) {
  const f = form(page);
  if (exp.trip) await expect.soft(f.trip, `ประเภทตั๋ว = ${exp.trip}`).toHaveAccessibleName(new RegExp(reEsc(exp.trip)));
  if (exp.pax !== undefined) {
    await expect.soft(f.pax, `ผู้โดยสาร = ${exp.pax}`).toHaveAccessibleName(new RegExp(`^ผู้โดยสาร ${exp.pax} คน`));
    await expect.soft(f.pax, `ตัวเลขบนไอคอนผู้โดยสาร = ${exp.pax}`).toHaveText(new RegExp(`(^|\\D)${exp.pax}(\\D|$)`));
  }
  if (exp.cabin) await expect.soft(f.cabin, `ชั้นโดยสาร = ${exp.cabin}`).toHaveAccessibleName(new RegExp(reEsc(exp.cabin)));
  if (exp.origin) await expect.soft(f.origin, `ต้นทาง = ${exp.origin}`).toHaveValue(new RegExp(`^\\s*${reEsc(exp.origin)}`));
  if (exp.dest) await expect.soft(f.dest, `ปลายทาง = ${exp.dest}`).toHaveValue(new RegExp(`^\\s*${reEsc(exp.dest)}`));
  if (exp.date) await expect.soft(f.date, `ขาไป ${exp.date}`).toHaveValue(exp.date);
}
const U1_HEADER: HeaderExp = { trip: 'เที่ยวเดียว', pax: 1, cabin: 'ชั้นประหยัด', origin: 'กรุงเทพมหานคร', dest: 'โตเกียว', date: RE_DATE15 };

/** ชื่อ (accessible name) และค่าจาก aria snapshot ของ element เดียว */
async function ariaOf(loc: Locator): Promise<{ name: string; value: string }> {
  const raw = await loc.ariaSnapshot({ timeout: 5000 }).catch(() => '');
  const first = raw.split('\n')[0] || '';
  const m = first.match(/^\s*-\s*'?[\w-]+(?:\s+"((?:[^"\\]|\\.)*)")?[^:]*(?::\s*(.*))?$/);
  let name = m?.[1] || '';
  try { name = JSON.parse(`"${name}"`); } catch { /* ใช้ค่าดิบ */ }
  return { name, value: (m?.[2] || '').replace(/^"|"$/g, '').trim() };
}
/** aria-label / aria-labelledby / aria-describedby ของช่อง (สำหรับอ่าน "aria-label ของช่อง") */
async function ariaTextOf(loc: Locator): Promise<string> {
  return loc.evaluate((el) => {
    const ids = (a: string) => (el.getAttribute(a) || '').split(/\s+/).filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent || '').join(' ');
    return [el.getAttribute('aria-label') || '', ids('aria-labelledby'), ids('aria-describedby')].join(' | ');
  }).catch(() => '');
}

async function ensureTripType(gf: GF, page: Page, want: 'เที่ยวเดียว' | 'ไป-กลับ', always = false) {
  const f = form(page);
  const name = (await ariaOf(f.trip)).name;
  if (!always && name.includes(want)) return;
  await gf.click(f.trip);
  await gf.click(page.getByRole('option', { name: want, exact: true }).first());
}

// ── ป๊อปอัปต้นทาง/ปลายทาง ──
const placeDlg = (page: Page, which: 'origin' | 'dest') =>
  page.getByRole('dialog', { name: which === 'origin' ? 'ป้อนต้นทาง' : 'ป้อนปลายทาง' }).first();
async function openPlace(gf: GF, page: Page, which: 'origin' | 'dest') {
  const f = form(page);
  await gf.click(which === 'origin' ? f.origin : f.dest);
  return placeDlg(page, which);
}
const placeInput = (dlg: Locator) => dlg.getByRole('combobox').first();
const suggestList = (dlg: Locator) => dlg.getByRole('listbox').last();
async function typePlace(gf: GF, dlg: Locator, term: string, clear = true) {
  await gf.type(placeInput(dlg), term, { clear });
  await dlg.getByRole('option').first().waitFor({ timeout: 8000 }).catch(() => {});
}
/** เปิดช่อง → พิมพ์ → เลือกแถว (บนหน้าผลลัพธ์ การเลือก = ค้นหาใหม่อัตโนมัติ R30) */
async function choosePlace(gf: GF, page: Page, which: 'origin' | 'dest', term: string, option: RegExp, searchReason?: string) {
  const dlg = await openPlace(gf, page, which);
  await typePlace(gf, dlg, term);
  const opt = dlg.getByRole('option', { name: option }).first();
  await gf.click(opt, isResults(page) && searchReason ? { search: searchReason } : {});
}
async function ensureOrigin(gf: GF, page: Page) {
  const f = form(page);
  const v = (await f.origin.inputValue().catch(() => '')).trim();
  const nm = (await ariaOf(f.origin)).name;
  if (v.startsWith('กรุงเทพมหานคร') && !/\b(BKK|DMK)\b/.test(nm)) return;
  await choosePlace(gf, page, 'origin', 'กรุงเทพ', /^กรุงเทพมหานคร/);
}

type Opt = { kind: string; name: string; selected: boolean; checked: boolean; text: string; code?: string; km?: number; city: boolean };
function parseList(yaml: string): Opt[] {
  const out: (Opt & { indent: number })[] = [];
  let base = -1;
  let cur: (Opt & { indent: number }) | null = null;
  for (const line of yaml.split('\n')) {
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const m = line.match(/^\s*-\s*'?(option|checkbox|button)\s+"((?:[^"\\]|\\.)*)"(.*)$/);
    if (m && (base < 0 || indent <= base)) {
      base = indent;
      let name = m[2];
      try { name = JSON.parse(`"${m[2]}"`); } catch { /* ใช้ค่าดิบ */ }
      cur = { kind: m[1], name, selected: /\[selected\]/.test(m[3]), checked: /\[checked\]/.test(m[3]), text: '', city: false, indent };
      const c = name.match(/\(([A-Z]{3})\)/);
      if (c) cur.code = c[1];
      out.push(cur);
      continue;
    }
    if (cur && indent > base) cur.text += ' ' + line.trim();
  }
  for (let i = 0; i < out.length; i++) {
    const o = out[i];
    const km = o.text.match(/ห่างจากจุดหมาย\s*([\d,.]+)\s*กม/);
    if (km) o.km = Number(km[1].replace(/,/g, ''));
    const nx = out[i + 1];
    const base = o.name.replace(/,\s*จากประวัติการค้นหา$/, '');
    if (o.kind !== 'button' && nx && nx.kind === 'button' && nx.name.startsWith('สลับปุ่มเพื่อแสดงรายการสนามบินที่อยู่ใกล้เคียงกับ') && nx.name.includes(base)) o.city = true;
  }
  return out.filter((o) => o.kind !== 'button').map(({ indent, ...o }) => o);
}
async function readList(lb: Locator): Promise<Opt[]> {
  return parseList(await lb.ariaSnapshot({ timeout: 8000 }).catch(() => ''));
}
const listSummary = (opts: Opt[]) =>
  opts.map((o) => `${o.city ? '[เมือง]' : o.code ? `[${o.code}]` : '[อื่น]'}${o.name}${o.km !== undefined ? ` ${o.km}กม.` : ''}${o.selected ? ' ✓sel' : ''}${o.checked ? ' ✓chk' : ''}`).join(' · ');
/** แถวสนามบินที่อยู่ติดกันใต้แถวเมือง (หยุดเมื่อเจอแถวที่ไม่ใช่สนามบิน) */
function airportsUnderCity(opts: Opt[], cityIdx: number): Opt[] {
  const res: Opt[] = [];
  for (let i = cityIdx + 1; i < opts.length && opts[i].code && !opts[i].city; i++) res.push(opts[i]);
  return res;
}

// ── ปฏิทิน ──
const calDlg = (page: Page) => page.getByRole('dialog').filter({ has: page.getByRole('grid') }).first();
const calDone = (dlg: Locator) => dlg.getByRole('button', { name: /^เสร็จ/ }).first();
const calPrev = (dlg: Locator) => dlg.getByRole('button', { name: 'ก่อนหน้า', exact: true }).first();
const calNext = (dlg: Locator) => dlg.getByRole('button', { name: 'ถัดไป', exact: true }).first();
const calDepart = (dlg: Locator) => dlg.getByRole('textbox', { name: /^ขาไป/ }).first();
const calReturn = (dlg: Locator) => dlg.getByRole('textbox', { name: /^ขากลับ/ }).first();
function dayBtn(dlg: Locator, a: YMD) {
  return dlg.getByRole('button', { name: new RegExp(`^วัน\\S*ที่ ${a.d} ${TH_MONTHS[a.m - 1]} ค\\.ศ\\. ${a.y}`) }).first();
}
async function clickable(loc: Locator) {
  return (await loc.isVisible().catch(() => false)) && (await loc.isEnabled().catch(() => false));
}

type CalCell = { day: number; text: string; isButton: boolean; label: string };
type CalGroup = { header: string; left: number; visible: boolean; cells: CalCell[] };
async function calInfo(dlg: Locator): Promise<CalGroup[]> {
  return dlg.evaluate((root) => {
    const dr = root.getBoundingClientRect();
    const labelOf = (e: Element) => e.getAttribute('aria-label')
      || Array.from(e.querySelectorAll('[aria-label]')).map((x) => x.getAttribute('aria-label')).join('');
    return Array.from(root.querySelectorAll('[role="rowgroup"]')).map((g) => {
      const r = g.getBoundingClientRect();
      const header = ((g.firstElementChild?.textContent || '').trim() || ((g as HTMLElement).innerText || '').split('\n')[0] || '').trim();
      const visible = r.width > 0 && r.height > 0 && r.left >= dr.left - 2 && r.right <= dr.right + 2 && r.top < dr.bottom && r.bottom > dr.top;
      const cells = Array.from(g.querySelectorAll('[role="gridcell"]')).map((c) => {
        const btn = c.querySelector('[role="button"], button');
        const text = ((c as HTMLElement).innerText || c.textContent || '').trim();
        const dm = text.match(/\d{1,2}/);
        return { day: dm ? Number(dm[0]) : NaN, text, isButton: !!btn, label: btn ? labelOf(btn) : labelOf(c) };
      });
      return { header, left: r.left, visible, cells };
    });
  }).catch(() => [] as CalGroup[]);
}
/** หัวเดือน → ดัชนีเดือน (ปีไม่แสดง = ปีปัจจุบัน ตามที่เว็บแสดง R13) */
function hdr(header: string, curY: number): { mi: number; y: number; hasYear: boolean; idx: number } | null {
  const mi = TH_MONTHS.findIndex((n) => header.trim().startsWith(n));
  if (mi < 0) return null;
  const ym = header.match(/(\d{4})/);
  const y = ym ? Number(ym[1]) : curY;
  return { mi, y, hasYear: !!ym, idx: y * 12 + mi };
}
async function visibleMonths(dlg: Locator, curY: number) {
  const g = (await calInfo(dlg)).filter((x) => x.visible).sort((a, b) => a.left - b.left);
  return g.map((x) => ({ ...x, h: hdr(x.header, curY) }));
}
/** เลื่อนปฏิทินด้วย < > จนเห็นเดือนที่ต้องการ */
async function showMonth(gf: GF, dlg: Locator, a: YMD, curY: number): Promise<boolean> {
  const target = a.y * 12 + (a.m - 1);
  for (let i = 0; i < 14; i++) {
    const vis = (await visibleMonths(dlg, curY)).map((v) => v.h?.idx).filter((n): n is number => n !== undefined);
    if (vis.includes(target)) return true;
    if (!vis.length) return false;
    const btn = target < Math.min(...vis) ? calPrev(dlg) : calNext(dlg);
    if (!(await clickable(btn))) return false;
    await gf.click(btn);
  }
  return false;
}
/** ติด data-e2e-cell บนช่องวัน (ใช้กับช่องที่ไม่เป็นปุ่ม เช่น เมื่อวาน) */
async function markCell(dlg: Locator, a: YMD, curY: number, tag: string): Promise<boolean> {
  return dlg.evaluate((root, { name, y, curY, d, tag }) => {
    document.querySelectorAll(`[data-e2e-cell="${tag}"]`).forEach((e) => e.removeAttribute('data-e2e-cell'));
    for (const g of Array.from(root.querySelectorAll('[role="rowgroup"]'))) {
      const h = (g.firstElementChild?.textContent || '').trim();
      if (!h.startsWith(name)) continue;
      const yy = h.match(/(\d{4})/);
      if ((yy ? Number(yy[1]) : curY) !== y) continue;
      for (const c of Array.from(g.querySelectorAll('[role="gridcell"]'))) {
        const t = ((c as HTMLElement).innerText || c.textContent || '').trim().match(/\d{1,2}/);
        if (t && Number(t[0]) === d) { c.setAttribute('data-e2e-cell', tag); return true; }
      }
    }
    return false;
  }, { name: TH_MONTHS[a.m - 1], y: a.y, curY, d: a.d, tag }).catch(() => false);
}
async function cellPrice(dlg: Locator, a: YMD): Promise<{ text: string; label: string; shown: number | null; full: number | null }> {
  const b = dayBtn(dlg, a);
  const text = ((await b.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  const label = (await ariaOf(b)).name;
  const full = label.match(/([\d,]+)\s*บาทไทย/);
  return { text, label, shown: parseBaht(text)?.value ?? null, full: full ? Number(full[1].replace(/,/g, '')) : null };
}
async function typeDate(gf: GF, page: Page, txt: string) {
  const f = form(page);
  await gf.click(f.date);
  const dlg = calDlg(page);
  await gf.type(calDepart(dlg), txt, { clear: true, enter: true });
  return dlg;
}

// ── ปุ่ม < > ข้างช่องวันที่ (button [aria-hidden] ไม่มีชื่อ) ──
async function dateNav(page: Page) {
  await form(page).date.evaluate((el) => {
    document.querySelectorAll('[data-e2e-datenav]').forEach((e) => e.removeAttribute('data-e2e-datenav'));
    let p: HTMLElement | null = el.parentElement;
    while (p && p.querySelectorAll('button, [role="button"]').length < 2) p = p.parentElement;
    if (!p) return;
    const btns = (Array.from(p.querySelectorAll('button, [role="button"]')) as HTMLElement[])
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    btns[0].setAttribute('data-e2e-datenav', 'prev');
    btns[btns.length - 1].setAttribute('data-e2e-datenav', 'next');
  }).catch(() => {});
  return { prev: page.locator('[data-e2e-datenav="prev"]'), next: page.locator('[data-e2e-datenav="next"]') };
}

// ── ตัวปรับระยะทริปในปฏิทิน ("7 วัน") ──
async function ensureTripLen(gf: GF, dlg: Locator, want: number): Promise<number | null> {
  const box = dlg.getByText(/สำหรับการเดินทาง/).first();
  for (let i = 0; i < 25; i++) {
    const t = await box.innerText().catch(() => '');
    const m = t.match(/(\d+)\s*วัน/);
    if (!m) return null;
    const n = Number(m[1]);
    if (n === want) return n;
    await box.evaluate((el) => {
      const btns = (Array.from(el.querySelectorAll('button, [role="button"]')) as HTMLElement[])
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      if (btns.length >= 2) { btns[0].setAttribute('data-e2e-triplen', 'minus'); btns[btns.length - 1].setAttribute('data-e2e-triplen', 'plus'); }
    }).catch(() => {});
    await gf.click(dlg.locator(`[data-e2e-triplen="${n > want ? 'minus' : 'plus'}"]`));
  }
  return null;
}

// ── ป๊อปอัปผู้โดยสาร ──
const paxDlg = (page: Page) => page.getByRole('dialog', { name: 'จำนวนผู้โดยสาร' }).first();
const PAX = {
  adult: { group: /จำนวนผู้โดยสารที่เป็นผู้ใหญ่/, add: /^เพิ่มผู้ใหญ่/, rem: /^นำผู้ใหญ่ออก/ },
  child: { group: /จำนวนเด็ก/, add: /^เพิ่มเด็ก/, rem: /^นำเด็ก/ },
  seat: { group: /จำนวนทารกที่โดยสารในที่นั่ง/, add: /^เพิ่มทารกที่โดยสารบนที่นั่ง/, rem: /^นำทารกที่โดยสารบนที่นั่งออก/ },
  lap: { group: /จำนวนทารกที่โดยสารบนตัก/, add: /^เพิ่มทารกที่โดยสารบนตัก/, rem: /^นำทารกที่โดยสารบนตักออก/ },
} as const;
type PaxKind = keyof typeof PAX;
const paxBtn = (page: Page, k: PaxKind, op: 'add' | 'rem') => paxDlg(page).getByRole('button', { name: PAX[k][op] }).first();
const paxDone = (page: Page) => paxDlg(page).getByRole('button', { name: 'เสร็จ', exact: true }).first();
const paxCancel = (page: Page) => paxDlg(page).getByRole('button', { name: 'ยกเลิก', exact: true }).first();
const paxAlert = (page: Page) => paxDlg(page).getByRole('alert').first();
async function paxCount(page: Page, k: PaxKind): Promise<number> {
  return paxDlg(page).getByLabel(PAX[k].group).first().evaluate((el) => {
    const leaf = Array.from(el.querySelectorAll('*')).find((e) => e.children.length === 0 && /^\d+$/.test((e.textContent || '').trim()));
    return leaf ? Number((leaf.textContent || '').trim()) : NaN;
  }).catch(() => NaN);
}
async function markPaxIcon(page: Page) {
  await page.getByRole('button', { name: /^ผู้โดยสาร \d+ คน/ }).first()
    .evaluate((el) => {
      document.querySelectorAll('[data-e2e="pax-icon"]').forEach((e) => e.removeAttribute('data-e2e'));
      el.setAttribute('data-e2e', 'pax-icon');
    }).catch(() => {});
}
const paxIcon = (page: Page) => page.locator('[data-e2e="pax-icon"]').first();
async function paxIconValue(page: Page): Promise<string> {
  let t = await paxIcon(page).innerText({ timeout: 3000 }).catch(() => '');
  if (!t) t = await form(page).pax.innerText({ timeout: 3000 }).catch(() => '');
  return (t.match(/\d+/) || [''])[0];
}
async function openPax(gf: GF, page: Page) {
  await markPaxIcon(page);
  await gf.click(paxIcon(page));
  await paxDlg(page).waitFor({ timeout: 10_000 }).catch(() => {});
}
/** สถานะยืนยันไม่ได้ = ปุ่ม "เสร็จ" หายหรือใช้ไม่ได้ */
async function paxDoneUsable(page: Page) {
  return clickable(paxDone(page));
}

// ── ผลลัพธ์ ──
type Row = { label: string; text: string; from?: string; to?: string; price?: number; time?: string; mon?: number; day?: number; airline?: string };
const rowItems = (page: Page) =>
  page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('link', { name: /ออกเดินทางจาก/ }) });
function parseRow(r: { label: string; text: string }): Row {
  const row: Row = { ...r };
  const codes = r.text.match(/\b([A-Z]{3})\s*[–\-]\s*([A-Z]{3})\b/);
  if (codes) { row.from = codes[1]; row.to = codes[2]; }
  const p = r.label.match(/ราคาเริ่มต้นที่\s*([\d,]+)\s*บาทไทย/) || r.text.match(/฿\s*([\d,]+)/);
  if (p) row.price = Number(p[1].replace(/,/g, ''));
  const t = r.label.match(new RegExp(`ออกเดินทางจาก.*?เวลา\\s*(\\d{1,2}:\\d{2})\\s*ในวันที่\\s*[^,]*,\\s*(${MON_RE})\\s+(\\d{1,2})`));
  if (t) { row.time = t[1]; row.mon = TH_MONTHS.indexOf(t[2]) + 1; row.day = Number(t[3]); }
  const a = r.label.match(/กับ\s+(.+?)\s+ออกเดินทางจาก/);
  if (a) row.airline = a[1].trim();
  return row;
}
async function readRows(page: Page): Promise<Row[]> {
  const raw = await rowItems(page).evaluateAll((els) => els.map((el) => {
    const a = el.querySelector('[aria-label*="ออกเดินทางจาก"]');
    return { label: a?.getAttribute('aria-label') || '', text: (el as HTMLElement).innerText || '' };
  })).catch(() => [] as { label: string; text: string }[]);
  return raw.map(parseRow);
}
async function waitResults(page: Page) {
  await rowItems(page).first().or(page.getByRole('heading', { name: /ไม่พบตัวเลือก/ }).first())
    .waitFor({ timeout: 25_000 }).catch(() => {});
}
const moreBtn = (page: Page) => page.getByRole('button', { name: /^ดูเที่ยวบินเพิ่มเติม/ }).first();
const noResHeading = (page: Page) => page.getByRole('heading', { name: /ไม่พบ/ }).first();
async function noResText(page: Page): Promise<string> {
  if (!(await noResHeading(page).isVisible().catch(() => false))) return '';
  return (await noResHeading(page).locator('xpath=..').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}
const rowsSummary = (rows: Row[]) => rows.map((r) => `${r.from || '?'}-${r.to || '?'} ${r.time || '?'} ${r.airline || '?'} ฿${r.price ?? '?'}`).join(' | ');
const minPrice = (rows: Row[]) => { const ps = rows.map((r) => r.price).filter((n): n is number => typeof n === 'number'); return ps.length ? Math.min(...ps) : null; };
const tfsOf = (url: string) => { try { return new URL(url).searchParams.get('tfs') || ''; } catch { return ''; } };
async function cheapestTabPrice(page: Page): Promise<number | null> {
  const tab = page.getByRole('tab', { name: /^ถูกที่สุด/ }).first();
  const nm = (await ariaOf(tab)).name;
  const m = nm.match(/เริ่มต้น\s*([\d,]+)/);
  if (m) return Number(m[1].replace(/,/g, ''));
  return parseBaht(await tab.innerText().catch(() => ''))?.value ?? null;
}
/** ข้อความในฟอร์ม/ป๊อปอัป/alert (ไม่รวมเนื้อหาส่วนอื่นของหน้า เพื่อเลี่ยงคำบังเอิญใน FAQ) */
async function formMessages(page: Page): Promise<string> {
  const s = await page.getByRole('search').first().innerText({ timeout: 5000 }).catch(() => '');
  const alerts = (await page.getByRole('alert').allInnerTexts().catch(() => [] as string[])).join(' | ');
  return `${s} | ${alerts}`.replace(/\s+/g, ' ');
}

// ═════════════════════════════════════════ TESTS ═════════════════════════════════════════

test('TC-SRCH-01 · Happy path กรอกฟอร์มโจทย์ลูกค้า', {
  tag: ['@P1', '@5.1'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 6) ช่องขาไปแสดง "อังคาร 15 ธ.ค." — วันในสัปดาห์เป็น "อังคาร" ตรงกับปฏิทินจริงของ 15 ธ.ค. 2026 · ถ้าบนจอไม่แสดงปี aria-label ของช่องต้องมีปี 2026 (R17)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 7) "เสร็จ" บนหน้าแรกแค่ปิดปฏิทิน: URL ยังไม่มี `/travel/flights/search` ยังไม่มีรายการผลลัพธ์ และปุ่ม "ค้นหา" ยังอยู่ ค่าทุกช่องคงเดิม (R19)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 8) URL เป็น `/travel/flights/search?tfs=…` และหัวผลลัพธ์/ฟอร์มแสดงทุกค่าตรงกับที่กรอก: เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค. และข้อความราคาระบุว่าเป็นราคาสำหรับผู้ใหญ่ 1 ท่าน (R32)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 8) มีแถวผลลัพธ์ ≥ 1 แถว และทุกแถวในชุดแรกมีสนามบินต้นทาง ∈ {BKK, DMK} และปลายทาง ∈ {HND, NRT} (R31)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 8) ในชุดแรกมีสนามบินปลายทางมากกว่า 1 แห่ง (พบทั้ง HND และ NRT) · ถ้าชุดแรกมีแห่งเดียว ให้กด "ดูเที่ยวบินเพิ่มเติม" แล้วตรวจซ้ำ ถ้ายังมีแห่งเดียว = ข้าม E5 (N/A) ไม่ใช่ล้ม (R31)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 9) URL ที่คัดลอกขึ้นต้นด้วย `https://www.google.com/travel/flights/search?tfs=` และมี `hl=th` กับ `curr=THB`' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-01 · R17 R19 R31 R32 · Happy path · [R]' },
    { type: 'งบค้นหา', description: '1' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  let dlg!: Locator;

  await test.step('1. เปิด U0 รอโหลด · จดค่าเริ่มต้นของ ประเภทตั๋ว / ต้นทาง / ผู้โดยสาร / ชั้นโดยสาร (ข้อมูลประกอบ F05 ไม่ตัดสิน)', async () => {
    await gf.goto(U0);
    await f.origin.waitFor({ timeout: 20_000 }).catch(() => {});
    const trip = (await ariaOf(f.trip)).name;
    const origin = await f.origin.inputValue().catch(() => '');
    const pax = (await ariaOf(f.pax)).name;
    const cabin = (await ariaOf(f.cabin)).name;
    note('ข้อมูลประกอบ F05', `ค่าเริ่มต้น: ${trip} · ต้นทาง "${origin}" · ${pax} · ${cabin}`);
  });

  await test.step('2. เปิด dropdown ประเภทตั๋ว เลือก "เที่ยวเดียว"', async () => {
    await ensureTripType(gf, page, 'เที่ยวเดียว', true);
  });

  await test.step('3. ถ้าช่องต้นทางไม่ใช่ "กรุงเทพมหานคร" ให้คลิกช่อง พิมพ์ "กรุงเทพ" แล้วเลือกแถวเมือง "กรุงเทพมหานคร"', async () => {
    await ensureOrigin(gf, page);
  });

  await test.step('4. คลิกช่องปลายทาง พิมพ์ "โตเกียว" รอ 3 วินาที เลือกแถวเมือง "โตเกียว ญี่ปุ่น" (แถวบนสุด ไม่ใช่แถวสนามบิน)', async () => {
    await choosePlace(gf, page, 'dest', 'โตเกียว', /^โตเกียว ญี่ปุ่น/);
  });

  await test.step('5. ตรวจผู้โดยสาร = 1 (ผู้ใหญ่ 1) และชั้น = "ชั้นประหยัด" ถ้าไม่ใช่ให้ตั้งให้ตรง', async () => {
    if (!/^ผู้โดยสาร 1 คน/.test((await ariaOf(f.pax)).name)) {
      await openPax(gf, page);
      for (let i = 0; i < 9 && (await paxCount(page, 'adult')) > 1; i++) await gf.click(paxBtn(page, 'adult', 'rem'));
      for (const k of ['child', 'seat', 'lap'] as PaxKind[]) {
        for (let i = 0; i < 9 && (await paxCount(page, k)) > 0; i++) await gf.click(paxBtn(page, k, 'rem'));
      }
      await gf.click(paxDone(page));
    }
    if (!/ชั้นประหยัด/.test((await ariaOf(f.cabin)).name)) {
      await gf.click(f.cabin);
      await gf.click(page.getByRole('option', { name: 'ชั้นประหยัด', exact: true }).first());
    }
  });

  await test.step('6. คลิกช่อง "ขาไป" พิมพ์ "15 ธ.ค. 2026" กด Enter · snapshot อ่านข้อความในช่องและ aria-label ของช่อง', async () => {
    dlg = await typeDate(gf, page, D_DATE_TXT);
    const box = calDepart(dlg);
    const value = await box.inputValue().catch(() => '');
    const aria = await ariaTextOf(box);
    note('ขั้น 6', `ช่องขาไป "${value}" · aria "${aria}"`);
    const wd = weekdayOf({ y: 2026, m: 12, d: 15 });
    await gf.check('E1 ช่องขาไปแสดง "อังคาร 15 ธ.ค." และมีปี 2026 บนจอหรือใน aria-label', box, async () => {
      await expect.soft(box, 'ช่องขาไปแสดง อังคาร 15 ธ.ค.').toHaveValue(RE_DATE15);
      expect.soft(weekdayOfText(value), `วันในสัปดาห์ในช่อง ("${value}") ตรงกับปฏิทินจริงของ 15 ธ.ค. 2026 (${TH_WEEKDAY_FORMS[wd][0]})`).toBe(wd);
      if (!/2026/.test(value)) expect.soft(aria, 'บนจอไม่แสดงปี → aria-label ของช่องต้องมีปี 2026').toMatch(/2026/);
    });
  });

  await test.step('7. กด "เสร็จ" ในปฏิทิน · snapshot อ่าน URL ปุ่ม "ค้นหา" และดูว่ามีรายการผลลัพธ์หรือยัง', async () => {
    await gf.click(calDone(dlg));
    const url = page.url();
    const nRows = await rowItems(page).count();
    note('ขั้น 7', `URL ${url} · แถวผลลัพธ์ ${nRows}`);
    await gf.check('E2 "เสร็จ" บนหน้าแรกแค่ปิดปฏิทิน ไม่ค้นหา ค่าทุกช่องคงเดิม', [searchBtn(page), ...headerTargets(page)], async () => {
      expect.soft(url, 'URL ยังไม่มี /travel/flights/search').not.toMatch(/\/travel\/flights\/search/);
      expect.soft(nRows, 'ยังไม่มีรายการผลลัพธ์').toBe(0);
      await expect.soft(searchBtn(page), 'ปุ่ม "ค้นหา" ยังอยู่').toBeVisible();
      await expect.soft(calDlg(page), 'ปฏิทินปิดแล้ว').toBeHidden();
      await assertHeader(page, U1_HEADER);
    });
  });

  let rows: Row[] = [];
  await test.step('8. กด "ค้นหา" รอ ≥ 10 วินาที · snapshot อ่านหัวผลลัพธ์/ฟอร์ม ข้อความราคา "สำหรับ…" และ aria-label ของทุกแถวในชุดแรก · screenshot', async () => {
    await gf.click(searchBtn(page), { search: 'TC-SRCH-01 กด "ค้นหา" ตามโจทย์ลูกค้า' });
    await waitResults(page);
    rows = await readRows(page);
    note('ขั้น 8', `${hhmm()} · ${rows.length} แถว · ${rowsSummary(rows)}`);
    const priceFor = page.getByText(/สำหรับผู้ใหญ่\s*1\s*ท่าน/).first();
    await gf.check('E3 URL ผลค้นหาและหัวผลลัพธ์ตรงกับที่กรอก + ราคาสำหรับผู้ใหญ่ 1 ท่าน', [...headerTargets(page), priceFor], async () => {
      expect.soft(page.url(), 'URL เป็น /travel/flights/search?tfs=…').toMatch(/\/travel\/flights\/search\?(.*&)?tfs=/);
      await assertHeader(page, U1_HEADER);
      await expect.soft(priceFor, 'ข้อความราคาระบุผู้ใหญ่ 1 ท่าน').toBeVisible();
    });
    await gf.check('E4 มีแถว ≥ 1 และทุกแถวในชุดแรก ต้นทาง ∈ {BKK, DMK} ปลายทาง ∈ {HND, NRT}', rowItems(page), async () => {
      expect.soft(rows.length, 'จำนวนแถวผลลัพธ์').toBeGreaterThanOrEqual(1);
      const bad = rows.filter((r) => !(BKK_SET.includes(r.from || '') && TYO_SET.includes(r.to || '')));
      expect.soft(bad.map((r) => `${r.from}-${r.to} ${r.time}`), 'แถวที่สนามบินไม่อยู่ในชุดเมือง').toEqual([]);
    });
    let dests = new Set(rows.map((r) => r.to).filter(Boolean));
    if (dests.size <= 1 && (await moreBtn(page).isVisible().catch(() => false))) {
      await gf.click(moreBtn(page));
      rows = await readRows(page);
      dests = new Set(rows.map((r) => r.to).filter(Boolean));
      note('ขั้น 8 (ดูเพิ่ม)', `${rows.length} แถว · ปลายทาง ${[...dests].join(',')}`);
    }
    if (dests.size <= 1) gf.na('E5 ชุดแรกมีปลายทางมากกว่า 1 แห่ง', `ปลายทางที่พบมีแห่งเดียว (${[...dests].join(',') || '-'}) แม้หลัง "ดูเที่ยวบินเพิ่มเติม" → N/A ตามแผน`);
    else {
      await gf.check('E5 ชุดแรกมีปลายทางมากกว่า 1 แห่ง (พบทั้ง HND และ NRT)', rowItems(page), async () => {
        expect.soft([...dests].sort(), 'สนามบินปลายทางที่พบ').toEqual(expect.arrayContaining(['HND', 'NRT']));
      });
    }
  });

  await test.step('9. คัดลอก URL จากแถบที่อยู่เก็บเป็น U1', async () => {
    const u1 = page.url();
    note('U1', u1);
    await gf.check('E6 URL ขึ้นต้น https://www.google.com/travel/flights/search?tfs= และมี hl=th กับ curr=THB', f.date, async () => {
      expect.soft(u1, 'ขึ้นต้นด้วย .../travel/flights/search?tfs=').toMatch(/^https:\/\/www\.google\.com\/travel\/flights\/search\?tfs=/);
      expect.soft(u1, 'มี hl=th').toMatch(/[?&]hl=th(&|$)/);
      expect.soft(u1, 'มี curr=THB').toMatch(/[?&]curr=THB(&|$)/);
    });
    if (/\/travel\/flights\/search\?(.*&)?tfs=/.test(u1)) saveState('U1', u1);
    else note('EN6', 'ไม่ได้ U1 จากหน้าผลลัพธ์ → test อื่นจะใช้ U1q');
  });
  gf.finishNA();
});

test('TC-SRCH-02 · เปลี่ยนไป-กลับ → เที่ยวเดียวในปฏิทิน', {
  tag: ['@P1', '@5.1'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 4) ช่อง/ปุ่มขากลับหายไปจากปฏิทิน (R15)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 4) ช่องขาไปยังเป็น "อังคาร 15 ธ.ค." ไม่ถูกล้างหรือเลื่อน (R15)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 4) P_OW ≠ P_RT — ราคาในช่องวันเปลี่ยนตามประเภทตั๋ว (R16)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 5) ฟอร์มหลักแสดงประเภทตั๋ว "เที่ยวเดียว" ไม่มีช่องขากลับ และขาไป "อังคาร 15 ธ.ค." (R15)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 6) หัวผลลัพธ์: เที่ยวเดียว · 1 · ชั้นประหยัด · อังคาร 15 ธ.ค. (R32)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 6) P_min ปัดตามรูปแบบที่ช่องปฏิทินใช้ (D-SRCH-CELLTOL) แล้วเท่ากับ P_OW — ราคาปฏิทินหลังเปลี่ยนเป็นราคาเที่ยวเดียวจริง ไม่ใช่ราคาทั้งทริป (R16)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-02 · R15 R16 R32 · State, Invariant/Metamorphic · [R]' },
    { type: 'งบค้นหา', description: '1' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  const D15: YMD = { y: 2026, m: 12, d: 15 };
  const T = bkkNow();
  let dlg!: Locator;
  let pRT: Awaited<ReturnType<typeof cellPrice>> | null = null;
  let pOW: Awaited<ReturnType<typeof cellPrice>> | null = null;

  await test.step('1. เปิด U0 · ประเภทตั๋ว = "ไป-กลับ" (ตั้งให้ถ้าไม่ใช่) · ต้นทาง "กรุงเทพมหานคร" · ปลายทางพิมพ์ "โตเกียว" เลือก "โตเกียว ญี่ปุ่น"', async () => {
    await gf.goto(U0);
    await f.origin.waitFor({ timeout: 20_000 }).catch(() => {});
    await ensureTripType(gf, page, 'ไป-กลับ');
    await ensureOrigin(gf, page);
    await choosePlace(gf, page, 'dest', 'โตเกียว', /^โตเกียว ญี่ปุ่น/);
  });

  await test.step('2. คลิกช่อง "ขาไป" เปิดปฏิทิน · ตั้งตัวปรับระยะทริปเป็น "7 วัน" ถ้ายังไม่ใช่ · คลิกช่อง 15 ธ.ค. เป็นขาไป (ไม่เลือกขากลับ)', async () => {
    await gf.click(f.date);
    dlg = calDlg(page);
    await dlg.waitFor({ timeout: 10_000 }).catch(() => {});
    const len = await ensureTripLen(gf, dlg, 7);
    note('ขั้น 2', `ระยะทริป ${len ?? 'อ่านไม่ได้'} วัน`);
    await showMonth(gf, dlg, D15, T.y);
    await gf.click(dayBtn(dlg, D15));
  });

  await test.step('3. snapshot อ่านราคาในช่อง 15 ธ.ค. (ข้อความบนจอและ aria-label) จดเป็น P_RT', async () => {
    pRT = await cellPrice(dlg, D15);
    note('P_RT', `${hhmm()} · บนจอ "${pRT.text}" · aria "${pRT.label}"`);
  });

  await test.step('4. เปลี่ยน dropdown ประเภทตั๋ว ในปฏิทิน เป็น "เที่ยวเดียว" · snapshot อ่านช่องขากลับ ช่องขาไป และราคาช่อง 15 ธ.ค. จดเป็น P_OW', async () => {
    await gf.click(dlg.getByRole('combobox', { name: /^เลือกประเภทตั๋ว/ }));
    await gf.click(page.getByRole('option', { name: 'เที่ยวเดียว', exact: true }).first());
    await gf.pause(3000, 4000); // ให้ราคาในช่องวันโหลดตามประเภทตั๋วใหม่
    pOW = await cellPrice(dlg, D15);
    note('P_OW', `${hhmm()} · บนจอ "${pOW.text}" · aria "${pOW.label}"`);
    await gf.check('E1 ช่อง/ปุ่มขากลับหายไปจากปฏิทิน', calDepart(dlg), async () => {
      await expect.soft(calReturn(dlg), 'ช่องขากลับในปฏิทิน').toBeHidden();
    });
    await gf.check('E2 ช่องขาไปยังเป็น "อังคาร 15 ธ.ค."', calDepart(dlg), async () => {
      await expect.soft(calDepart(dlg)).toHaveValue(RE_DATE15);
    });
    await gf.check('E3 P_OW ≠ P_RT (ราคาช่อง 15 ธ.ค. เปลี่ยนตามประเภทตั๋ว)', dayBtn(dlg, D15), async () => {
      const a = pOW!.full ?? pOW!.shown;
      const b = pRT!.full ?? pRT!.shown;
      expect.soft(a, 'อ่านราคา P_OW ได้').not.toBeNull();
      expect.soft(b, 'อ่านราคา P_RT ได้').not.toBeNull();
      expect.soft(a, `P_OW (${pOW!.text}) ต้องไม่เท่ากับ P_RT (${pRT!.text})`).not.toBe(b);
    });
  });

  await test.step('5. กด "เสร็จ" · snapshot ฟอร์มหลัก (ประเภทตั๋ว ช่องขากลับ ช่องขาไป)', async () => {
    await gf.click(calDone(dlg));
    await gf.check('E4 ฟอร์มหลัก: เที่ยวเดียว ไม่มีช่องขากลับ ขาไป "อังคาร 15 ธ.ค."', [f.trip, f.date], async () => {
      await expect.soft(f.trip).toHaveAccessibleName(/เที่ยวเดียว/);
      await expect.soft(f.ret, 'ช่องขากลับในฟอร์มหลัก').toBeHidden();
      await expect.soft(f.date).toHaveValue(RE_DATE15);
    });
  });

  await test.step('6. กด "ค้นหา" รอ ≥ 10 วินาที · snapshot หัวผลลัพธ์ และราคาทุกแถวในชุดแรก จดราคาต่ำสุดเป็น P_min (บันทึกเวลาของขั้น 4 และขั้น 6)', async () => {
    await gf.click(searchBtn(page), { search: 'TC-SRCH-02 กด "ค้นหา" เที่ยวเดียว 15 ธ.ค.' });
    await waitResults(page);
    const rows = await readRows(page);
    const pMin = minPrice(rows);
    note('P_min', `${hhmm()} · ฿${pMin ?? '-'} · ${rowsSummary(rows)}`);
    await gf.check('E5 หัวผลลัพธ์: เที่ยวเดียว · 1 · ชั้นประหยัด · อังคาร 15 ธ.ค.', headerTargets(page), async () => {
      await assertHeader(page, { trip: 'เที่ยวเดียว', pax: 1, cabin: 'ชั้นประหยัด', date: RE_DATE15 });
    });
    await gf.check('E6 P_min ปัดตามรูปแบบช่องปฏิทินแล้วเท่ากับ P_OW (D-SRCH-CELLTOL ≤ ฿50)', rowItems(page), async () => {
      expect.soft(pMin, 'อ่านราคาต่ำสุดของชุดแรกได้').not.toBeNull();
      expect.soft(pOW!.shown, `อ่านราคาบนจอของช่อง 15 ธ.ค. ได้ ("${pOW!.text}")`).not.toBeNull();
      if (pMin !== null && pOW!.shown !== null) {
        expect.soft(Math.abs(pMin - pOW!.shown), `|P_min ฿${pMin} − P_OW ${pOW!.text}| ≤ ฿${CELLTOL}`).toBeLessThanOrEqual(CELLTOL);
      }
    });
  });
  gf.finishNA();
});

test('TC-SRCH-03 · เลื่อนเดือนในปฏิทินและวันสุดท้าย', {
  tag: ['@P1', '@5.1'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2) ปุ่ม "เสร็จ" ใช้ได้ทั้งที่ช่องขากลับยังว่าง [O-ยังไม่ยืนยัน] (R18)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 4) A2 = A1 — ราคาช่อง 15 ธ.ค. เท่าเดิมเมื่อเลื่อนมุมมอง (R14)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 4) หัวเดือนเลื่อนไป 1 เดือนพอดี (ธ.ค. → ม.ค.) เดือนมกราคมมีปีที่มากกว่า 2026 อยู่ 1 ปี และระบบปีบนหัวเดือนตรงกับปีใน aria-label ของช่อง 1 ม.ค. (R13)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 4) ปีแสดงเป็น ค.ศ. "2027" (ไม่ใช่ พ.ศ. 2570) แม้ใช้ภาษาไทย [O-ยังไม่ยืนยัน] (R13)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 5) ทุกครั้งที่กด > หัวเดือนเลื่อนทีละ 1 เดือน ไม่ข้ามและไม่ซ้ำ (R13)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 5) D-LAST = T + 329 วัน (330 วันที่กดได้รวมวันนี้) [O-ยังไม่ยืนยัน] (R12)' },
    { type: 'คาดหวัง', description: 'E7: (ขั้น 5) ทุกวันหลัง D-LAST ในมุมมองสุดท้ายไม่เป็นปุ่มและไม่มีราคา (R12)' },
    { type: 'คาดหวัง', description: 'E8: (ขั้น 6) หัวผลลัพธ์: เที่ยวเดียว · อังคาร 15 ธ.ค. — การเลื่อนเดือนไปมาไม่เปลี่ยนวันที่เลือกไว้ (R13 R14)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-03 · R12 R13 R14 R18 · Boundary, Invariant/Metamorphic · [O-ยังไม่ยืนยัน] (E1 E4 E6)' },
    { type: 'งบค้นหา', description: '1' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  const T = bkkNow();
  const TD: YMD = { y: T.y, m: T.m, d: T.d };
  note('T', `วันที่รันจริง ${ymdStr(TD)} ${hhmm()} (เวลาไทย)`);
  const D15: YMD = { y: 2026, m: 12, d: 15 };
  let dlg!: Locator;
  let a1: Awaited<ReturnType<typeof cellPrice>> | null = null;
  let before: Awaited<ReturnType<typeof visibleMonths>> = [];

  await test.step('1. เปิด U0 · ประเภทตั๋ว "ไป-กลับ" · ต้นทาง "กรุงเทพมหานคร" · ปลายทาง "โตเกียว ญี่ปุ่น"', async () => {
    await gf.goto(U0);
    await f.origin.waitFor({ timeout: 20_000 }).catch(() => {});
    await ensureTripType(gf, page, 'ไป-กลับ');
    await ensureOrigin(gf, page);
    await choosePlace(gf, page, 'dest', 'โตเกียว', /^โตเกียว ญี่ปุ่น/);
  });

  await test.step('2. คลิกช่อง "ขาไป" · คลิกช่อง 15 ธ.ค. เป็นขาไปอย่างเดียว · snapshot อ่านสถานะปุ่ม "เสร็จ" และช่องขากลับ', async () => {
    await gf.click(f.date);
    dlg = calDlg(page);
    await dlg.waitFor({ timeout: 10_000 }).catch(() => {});
    await showMonth(gf, dlg, D15, T.y);
    await gf.click(dayBtn(dlg, D15));
    await gf.check('E1 ปุ่ม "เสร็จ" ใช้ได้ทั้งที่ช่องขากลับยังว่าง', [calDone(dlg), calReturn(dlg)], async () => {
      await expect.soft(calReturn(dlg), 'ช่องขากลับยังว่าง').toHaveValue('');
      await expect.soft(calDone(dlg), 'ปุ่ม "เสร็จ" ใช้ได้').toBeEnabled();
    });
  });

  await test.step('3. ให้ ธ.ค. 2026 อยู่คอลัมน์ขวาของมุมมอง (ถ้าอยู่คอลัมน์ซ้ายให้กด < 1 ครั้งถ้ากดได้) · อ่านหัวเดือนทั้งสองคอลัมน์ และราคาช่อง 15 ธ.ค. จดเป็น A1', async () => {
    const decIdx = 2026 * 12 + 11;
    before = await visibleMonths(dlg, T.y);
    if (before[0]?.h?.idx === decIdx && (await clickable(calPrev(dlg)))) {
      await gf.click(calPrev(dlg));
      before = await visibleMonths(dlg, T.y);
    }
    a1 = await cellPrice(dlg, D15);
    note('ขั้น 3', `หัวเดือน [${before.map((b) => b.header).join(' | ')}] · A1 "${a1.text}" (${a1.label})`);
  });

  await test.step('4. กด > 1 ครั้ง · อ่านหัวเดือนทั้งสองคอลัมน์ ราคาช่อง 15 ธ.ค. จดเป็น A2 และ aria-label ของช่อง 1 ม.ค.', async () => {
    await gf.click(calNext(dlg));
    const after = await visibleMonths(dlg, T.y);
    const a2 = await cellPrice(dlg, D15);
    const jan = dlg.getByRole('button', { name: /^วัน\S*ที่ 1 มกราคม ค\.ศ\. \d{4}/ }).first();
    const janLabel = (await ariaOf(jan)).name;
    const janAriaYear = Number((janLabel.match(/ค\.ศ\.\s*(\d{4})/) || [])[1] || NaN);
    const janHdr = after.find((g) => g.h?.mi === 0);
    const janHdrYear = Number((janHdr?.header.match(/(\d{4})/) || [])[1] || NaN);
    note('ขั้น 4', `หัวเดือน [${after.map((b) => b.header).join(' | ')}] · A2 "${a2.text}" (${a2.label}) · ช่อง 1 ม.ค. "${janLabel}"`);
    await gf.check('E2 A2 = A1 ราคาช่อง 15 ธ.ค. เท่าเดิมเมื่อเลื่อนมุมมอง', dayBtn(dlg, D15), async () => {
      expect.soft(a2.text, `ราคาบนจอ A2 "${a2.text}" = A1 "${a1!.text}"`).toBe(a1!.text);
      expect.soft(a2.full, 'ราคาใน aria-label A2 = A1').toBe(a1!.full);
    });
    await gf.check('E3 หัวเดือนเลื่อน 1 เดือนพอดี (ธ.ค. → ม.ค.) ม.ค. ปี = 2026 + 1 และตรงกับ aria-label ช่อง 1 ม.ค.', [dlg.getByRole('grid'), jan], async () => {
      expect.soft(after[0]?.h?.idx, 'คอลัมน์ซ้ายใหม่ = คอลัมน์ขวาเดิม (ธ.ค. 2026)').toBe(before[1]?.h?.idx);
      expect.soft(after[0]?.h?.mi, 'คอลัมน์ซ้ายเป็นธันวาคม').toBe(11);
      expect.soft(after[1]?.h?.mi, 'คอลัมน์ขวาเป็นมกราคม').toBe(0);
      expect.soft(janHdrYear, `ปีบนหัวเดือนมกราคม ("${janHdr?.header}") = 2027`).toBe(2027);
      expect.soft(janAriaYear, 'ปีใน aria-label ช่อง 1 ม.ค. = ปีบนหัวเดือน').toBe(janHdrYear);
    });
    await gf.check('E4 ปีแสดงเป็น ค.ศ. "2027" ไม่ใช่ พ.ศ. 2570', dlg.getByRole('grid'), async () => {
      expect.soft(janHdr?.header || '', 'หัวเดือนมกราคม').toMatch(/2027/);
      expect.soft(after.map((g) => g.header).join(' '), 'ไม่มี พ.ศ. 2570').not.toMatch(/2570/);
    });
    before = after;
  });

  await test.step('5. กด > ต่อไปทีละครั้งจนปุ่ม > หาย · จดหัวเดือนทุกครั้ง · ในมุมมองสุดท้ายอ่านวันสุดท้ายที่เป็นปุ่ม (มีราคา) จดเป็น D-LAST และสถานะของวันถัดจากนั้น', async () => {
    const steps: string[] = [];
    const shifts: { from: (number | undefined)[]; to: (number | undefined)[] }[] = [];
    let cur = before;
    for (let i = 0; i < 14 && (await clickable(calNext(dlg))); i++) {
      await gf.click(calNext(dlg));
      const nx = await visibleMonths(dlg, T.y);
      steps.push(nx.map((g) => g.header).join(' | '));
      shifts.push({ from: cur.map((g) => g.h?.idx), to: nx.map((g) => g.h?.idx) });
      cur = nx;
    }
    note('ขั้น 5 หัวเดือน', steps.join(' → '));
    await gf.check('E5 ทุกครั้งที่กด > หัวเดือนเลื่อนทีละ 1 เดือน ไม่ข้ามและไม่ซ้ำ', dlg.getByRole('grid'), async () => {
      expect.soft(shifts.length, 'กด > ได้อย่างน้อย 1 ครั้ง').toBeGreaterThan(0);
      const bad = shifts.filter((s) => s.to.length < 2 || s.from.length < 2 || s.to[0] !== (s.from[0] ?? NaN) + 1 || s.to[1] !== (s.from[1] ?? NaN) + 1);
      expect.soft(bad.length, `ครั้งที่เลื่อนไม่เท่ากับ 1 เดือน: ${JSON.stringify(bad)}`).toBe(0);
    });
    // วันสุดท้ายที่เป็นปุ่มในมุมมองสุดท้าย
    const cells: (CalCell & { mi: number; y: number })[] = [];
    for (const g of cur) for (const c of g.cells) if (g.h) cells.push({ ...c, mi: g.h.mi, y: g.h.y });
    let lastIdx = -1;
    cells.forEach((c, i) => { if (c.isButton) lastIdx = i; });
    const last = lastIdx >= 0 ? cells[lastIdx] : null;
    const lp = last ? parseLongDate(last.label) : null;
    const dLast: YMD | null = last ? { y: lp?.y ?? last.y, m: lp?.m ?? last.mi + 1, d: lp?.d ?? last.day } : null;
    const after = cells.slice(lastIdx + 1).filter((c) => !Number.isNaN(c.day));
    const expLast = addDays(TD, 329);
    note('D-LAST', `${dLast ? ymdStr(dLast) : '-'} (คาด ${ymdStr(expLast)}) · ช่อง "${last?.label}" มีราคา: ${/฿/.test(last?.text || '')} · วันถัดไป: ${after[0] ? `"${after[0].text}" ปุ่ม=${after[0].isButton}` : 'ไม่มีในมุมมอง'}`);
    const lastLoc = dLast ? dayBtn(dlg, dLast) : dlg.getByRole('grid');
    await gf.check('E6 D-LAST = T + 329 วัน', lastLoc, async () => {
      expect.soft(dLast ? ymdStr(dLast) : null, `D-LAST (T = ${ymdStr(TD)})`).toBe(ymdStr(expLast));
    });
    await gf.check('E7 ทุกวันหลัง D-LAST ในมุมมองสุดท้ายไม่เป็นปุ่มและไม่มีราคา', dlg.getByRole('grid'), async () => {
      expect.soft(after.filter((c) => c.isButton).map((c) => c.text), 'วันหลัง D-LAST ที่เป็นปุ่ม').toEqual([]);
      expect.soft(after.filter((c) => /฿/.test(c.text)).map((c) => c.text), 'วันหลัง D-LAST ที่มีราคา').toEqual([]);
    });
  });

  await test.step('6. กด "เสร็จ" · เปลี่ยน dropdown ประเภทตั๋วในฟอร์มหลักเป็น "เที่ยวเดียว" · กด "ค้นหา" รอ ≥ 10 วินาที · snapshot หัวผลลัพธ์', async () => {
    await gf.click(calDone(dlg));
    await ensureTripType(gf, page, 'เที่ยวเดียว', true);
    await gf.click(searchBtn(page), { search: 'TC-SRCH-03 กด "ค้นหา" หลังเลื่อนเดือน' });
    await waitResults(page);
    await gf.check('E8 หัวผลลัพธ์: เที่ยวเดียว · อังคาร 15 ธ.ค.', headerTargets(page), async () => {
      await assertHeader(page, { trip: 'เที่ยวเดียว', date: RE_DATE15 });
    });
  });
  gf.finishNA();
});

test('TC-SRCH-04 · ป๊อปอัปผู้โดยสาร', {
  tag: ['@P1', '@5.1'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2) ผู้ใหญ่ = 1 แล้วปุ่ม "นำผู้ใหญ่ออก" ใช้ไม่ได้ (disabled) (R20)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 3) มีข้อความผิดพลาดเรื่องทารกบนตักต้องมีผู้ใหญ่ดูแล (ไม่ต้องตรงคำต่อคำ) และยืนยันค่านี้ไม่ได้ (ปุ่ม "เสร็จ" หายหรือใช้ไม่ได้) (R21)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 4) ทารกบนตัก = ผู้ใหญ่ (2 = 2): ข้อความผิดพลาดหาย ปุ่ม "เสร็จ" ใช้ได้ (R21)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 5) รวม 9 คน: ไม่มีข้อความผิดพลาด ปุ่ม "เสร็จ" ใช้ได้ [O-ยังไม่ยืนยัน: เพดาน 9 คน] (R22)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 6) รวม 10 คน: มีข้อความว่าไม่รองรับผู้โดยสารเกินเพดาน และยืนยันค่านี้ไม่ได้ [O-ยังไม่ยืนยัน: เพดาน 9 คน] (R22)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 3–6) ตัวเลขบนไอคอนผู้โดยสารในฟอร์มยังเป็น "1" ตลอดที่ป๊อปอัปเปิด (R25)' },
    { type: 'คาดหวัง', description: 'E7: (ขั้น 7) Esc ปิดป๊อปอัป ไอคอนเป็น "1" และเปิดใหม่ได้ ผู้ใหญ่ 1 ทารกบนตัก 0 (R24)' },
    { type: 'คาดหวัง', description: 'E8: (ขั้น 8) "ยกเลิก" แล้วไอคอนเป็น "1" และเปิดใหม่ได้ ผู้ใหญ่ 1 เด็ก 0 (R24)' },
    { type: 'คาดหวัง', description: 'E9: (ขั้น 9) กด "เสร็จ" ที่ผู้ใหญ่ 2 แล้วไอคอนเป็น "2" · ลดเป็น 1 แล้ว "เสร็จ" ไอคอนกลับเป็น "1" (R25)' },
    { type: 'คาดหวัง', description: 'E10: (ขั้น 10) หัวผลลัพธ์แสดงผู้โดยสาร 1 และข้อความราคาระบุผู้ใหญ่ 1 ท่าน (R32)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-04 · R20 R21 R22 R24 R25 R32 · Boundary, Negative, State · [O-ยังไม่ยืนยัน] (E4 E5)' },
    { type: 'งบค้นหา', description: '1' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  const iconReadings: string[] = [];

  await test.step('1. เปิด U0 · ประเภทตั๋ว "เที่ยวเดียว" · ปลายทาง "โตเกียว ญี่ปุ่น" · ขาไปพิมพ์ "15 ธ.ค. 2026" Enter แล้วกด "เสร็จ"', async () => {
    await gf.goto(U0);
    await f.origin.waitFor({ timeout: 20_000 }).catch(() => {});
    await ensureTripType(gf, page, 'เที่ยวเดียว');
    await ensureOrigin(gf, page); // D-ROUTE (หน้าแรกอาจจำค่าเก่า A03)
    await choosePlace(gf, page, 'dest', 'โตเกียว', /^โตเกียว ญี่ปุ่น/);
    const dlg = await typeDate(gf, page, D_DATE_TXT);
    await gf.click(calDone(dlg));
  });

  await test.step('2. คลิกไอคอนผู้โดยสาร · snapshot อ่านสถานะปุ่ม "นำผู้ใหญ่ออก"', async () => {
    await openPax(gf, page);
    const adults = await paxCount(page, 'adult');
    await gf.check('E1 ผู้ใหญ่ = 1 แล้วปุ่ม "นำผู้ใหญ่ออก" ใช้ไม่ได้', paxBtn(page, 'adult', 'rem'), async () => {
      expect.soft(adults, 'ผู้ใหญ่').toBe(1);
      await expect.soft(paxBtn(page, 'adult', 'rem'), 'ปุ่ม "นำผู้ใหญ่ออก"').toBeDisabled();
    });
  });

  await test.step('3. กด + ทารกบนตัก 2 ครั้ง (D-PAX-LAPX) · snapshot อ่านข้อความสีแดง ปุ่ม "เสร็จ"/"ยกเลิก" และตัวเลขบนไอคอนผู้โดยสารในฟอร์ม', async () => {
    await gf.click(paxBtn(page, 'lap', 'add'));
    await gf.click(paxBtn(page, 'lap', 'add'));
    const alertTxt = await paxAlert(page).innerText({ timeout: 3000 }).catch(() => '');
    const doneOk = await paxDoneUsable(page);
    const cancelOk = await clickable(paxCancel(page));
    iconReadings.push(`ขั้น3=${await paxIconValue(page)}`);
    note('ขั้น 3', `ผู้ใหญ่ ${await paxCount(page, 'adult')} · ทารกบนตัก ${await paxCount(page, 'lap')} · ข้อความ "${alertTxt}" · เสร็จใช้ได้=${doneOk} · ยกเลิกใช้ได้=${cancelOk}`);
    await gf.check('E2 มีข้อความผิดพลาดเรื่องทารกบนตักต้องมีผู้ใหญ่ และยืนยันค่าไม่ได้', [paxAlert(page), paxDlg(page)], async () => {
      expect.soft(alertTxt, 'ข้อความผิดพลาดพูดถึงผู้ใหญ่กับทารกบนตัก').toMatch(/ผู้ใหญ่[\s\S]*ทารก|ทารก[\s\S]*ผู้ใหญ่/);
      expect.soft(doneOk, 'ปุ่ม "เสร็จ" หายหรือใช้ไม่ได้').toBe(false);
    });
  });

  await test.step('4. กด + ผู้ใหญ่ 1 ครั้ง (D-PAX-LAPOK) · snapshot', async () => {
    await gf.click(paxBtn(page, 'adult', 'add'));
    const alertVisible = await paxAlert(page).isVisible().catch(() => false);
    iconReadings.push(`ขั้น4=${await paxIconValue(page)}`);
    await gf.check('E3 ทารกบนตัก = ผู้ใหญ่ (2 = 2): ข้อความผิดพลาดหาย ปุ่ม "เสร็จ" ใช้ได้', [paxDlg(page), paxDone(page)], async () => {
      expect.soft(await paxCount(page, 'adult'), 'ผู้ใหญ่').toBe(2);
      expect.soft(await paxCount(page, 'lap'), 'ทารกบนตัก').toBe(2);
      expect.soft(alertVisible, 'ข้อความผิดพลาดหาย').toBe(false);
      await expect.soft(paxDone(page), 'ปุ่ม "เสร็จ"').toBeEnabled();
    });
  });

  await test.step('5. กด + ผู้ใหญ่จนเป็น 7 (D-PAX-9 รวม 9 คน) · snapshot', async () => {
    for (let i = 0; i < 8 && (await paxCount(page, 'adult')) < 7; i++) await gf.click(paxBtn(page, 'adult', 'add'));
    const alertVisible = await paxAlert(page).isVisible().catch(() => false);
    iconReadings.push(`ขั้น5=${await paxIconValue(page)}`);
    await gf.check('E4 รวม 9 คน: ไม่มีข้อความผิดพลาด ปุ่ม "เสร็จ" ใช้ได้', [paxDlg(page), paxDone(page)], async () => {
      expect.soft(await paxCount(page, 'adult'), 'ผู้ใหญ่').toBe(7);
      expect.soft(alertVisible, 'ไม่มีข้อความผิดพลาด').toBe(false);
      await expect.soft(paxDone(page), 'ปุ่ม "เสร็จ"').toBeEnabled();
    });
  });

  await test.step('6. กด + ผู้ใหญ่อีก 1 ครั้ง (D-PAX-10 รวม 10 คน) · snapshot อ่านข้อความ ปุ่ม และตัวเลขบนไอคอน (ไม่ตัดสินสถานะปุ่ม + ในข้อนี้)', async () => {
    await gf.click(paxBtn(page, 'adult', 'add'));
    const alertTxt = await paxAlert(page).innerText({ timeout: 3000 }).catch(() => '');
    const doneOk = await paxDoneUsable(page);
    iconReadings.push(`ขั้น6=${await paxIconValue(page)}`);
    note('ขั้น 6', `ผู้ใหญ่ ${await paxCount(page, 'adult')} · ข้อความ "${alertTxt}" · เสร็จใช้ได้=${doneOk}`);
    await gf.check('E5 รวม 10 คน: มีข้อความไม่รองรับผู้โดยสารเกินเพดาน และยืนยันค่าไม่ได้', [paxAlert(page), paxDlg(page)], async () => {
      expect.soft(alertTxt, 'ข้อความเรื่องเพดานจำนวนผู้โดยสาร').toMatch(/ไม่รองรับ|เกิน|มากกว่า/);
      expect.soft(doneOk, 'ปุ่ม "เสร็จ" หายหรือใช้ไม่ได้').toBe(false);
    });
    await gf.check('E6 ตัวเลขบนไอคอนผู้โดยสารยังเป็น "1" ตลอดที่ป๊อปอัปเปิด (ขั้น 3–6)', paxIcon(page), async () => {
      expect.soft(iconReadings, 'ค่าที่อ่านได้ระหว่างขั้น 3–6').toEqual(['ขั้น3=1', 'ขั้น4=1', 'ขั้น5=1', 'ขั้น6=1']);
    });
  });

  await test.step('7. กด Esc · snapshot ตัวเลขบนไอคอน · เปิดป๊อปอัปอีกครั้ง อ่านค่าทุกประเภท', async () => {
    await gf.press('Escape');
    const closed = !(await paxDlg(page).isVisible().catch(() => false));
    const icon = await paxIconValue(page);
    await openPax(gf, page);
    const c = { adult: await paxCount(page, 'adult'), child: await paxCount(page, 'child'), seat: await paxCount(page, 'seat'), lap: await paxCount(page, 'lap') };
    note('ขั้น 7', `ป๊อปอัปปิด=${closed} · ไอคอน "${icon}" · เปิดใหม่ ${JSON.stringify(c)}`);
    await gf.check('E7 Esc ปิดป๊อปอัป ไอคอน "1" เปิดใหม่ ผู้ใหญ่ 1 ทารกบนตัก 0', [paxIcon(page), paxDlg(page)], async () => {
      expect.soft(closed, 'Esc ปิดป๊อปอัป').toBe(true);
      expect.soft(icon, 'ไอคอนหลัง Esc').toBe('1');
      expect.soft(c.adult, 'ผู้ใหญ่เมื่อเปิดใหม่').toBe(1);
      expect.soft(c.lap, 'ทารกบนตักเมื่อเปิดใหม่').toBe(0);
    });
  });

  await test.step('8. ตั้งผู้ใหญ่ 2 + เด็ก 1 (D-PAX-CANCEL) กด "ยกเลิก" · snapshot ไอคอน · เปิดอีกครั้งอ่านค่า แล้วปิดด้วย "ยกเลิก"', async () => {
    if (!(await paxDlg(page).isVisible().catch(() => false))) await openPax(gf, page);
    await gf.click(paxBtn(page, 'adult', 'add'));
    await gf.click(paxBtn(page, 'child', 'add'));
    await gf.click(paxCancel(page));
    const icon = await paxIconValue(page);
    await openPax(gf, page);
    const adult = await paxCount(page, 'adult');
    const child = await paxCount(page, 'child');
    await gf.check('E8 "ยกเลิก" แล้วไอคอน "1" เปิดใหม่ ผู้ใหญ่ 1 เด็ก 0', [paxIcon(page), paxDlg(page)], async () => {
      expect.soft(icon, 'ไอคอนหลัง "ยกเลิก"').toBe('1');
      expect.soft(adult, 'ผู้ใหญ่เมื่อเปิดใหม่').toBe(1);
      expect.soft(child, 'เด็กเมื่อเปิดใหม่').toBe(0);
    });
    await gf.click(paxCancel(page));
  });

  await test.step('9. เปิดป๊อปอัป ตั้งผู้ใหญ่ 2 (D-PAX-2) กด "เสร็จ" · snapshot ไอคอน · เปิดอีกครั้ง ลดผู้ใหญ่เป็น 1 กด "เสร็จ" · snapshot ไอคอน', async () => {
    await openPax(gf, page);
    await gf.click(paxBtn(page, 'adult', 'add'));
    await gf.click(paxDone(page));
    await markPaxIcon(page);
    const icon2 = await paxIconValue(page);
    await openPax(gf, page);
    await gf.click(paxBtn(page, 'adult', 'rem'));
    await gf.click(paxDone(page));
    await markPaxIcon(page);
    const icon1 = await paxIconValue(page);
    await gf.check('E9 "เสร็จ" ที่ผู้ใหญ่ 2 → ไอคอน "2" · ลดเป็น 1 แล้ว "เสร็จ" → ไอคอน "1"', paxIcon(page), async () => {
      expect.soft(icon2, 'ไอคอนหลัง "เสร็จ" ที่ผู้ใหญ่ 2').toBe('2');
      expect.soft(icon1, 'ไอคอนหลังลดเป็น 1 แล้ว "เสร็จ"').toBe('1');
    });
  });

  await test.step('10. กด "ค้นหา" รอ ≥ 10 วินาที · snapshot หัวผลลัพธ์และข้อความราคา "สำหรับ…"', async () => {
    await gf.click(searchBtn(page), { search: 'TC-SRCH-04 กด "ค้นหา" หลังคืนเป็น 1 คน' });
    await waitResults(page);
    const priceFor = page.getByText(/สำหรับผู้ใหญ่\s*1\s*ท่าน/).first();
    await gf.check('E10 หัวผลลัพธ์ผู้โดยสาร 1 และข้อความราคาระบุผู้ใหญ่ 1 ท่าน', [f.pax, priceFor], async () => {
      await assertHeader(page, { pax: 1 });
      await expect.soft(priceFor, 'ข้อความราคา "สำหรับผู้ใหญ่ 1 ท่าน"').toBeVisible();
    });
  });
  gf.finishNA();
});

test('TC-SRCH-05 · รายการแนะนำต้นทาง/ปลายทาง', {
  tag: ['@P1', '@5.1'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 1) ปลายทางว่าง: ปุ่ม ⇄ ใช้ไม่ได้ (R01)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 1) ปุ่มหลักเป็น "สำรวจ" ไม่ใช่ "ค้นหา" [O-ยังไม่ยืนยัน] (R02)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 2) แถวเมือง "กรุงเทพมหานคร" และทุกแถวสนามบินใต้เมือง (BKK, DMK) อยู่ในสถานะ selected (R06)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 3) ทั้ง "กรุงเทพ" และ "Bangkok": แถวแรกเป็นแถวเมือง "กรุงเทพมหานคร" ตามด้วยแถวสนามบิน BKK และ DMK (R08)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 4) "DMK" และ "BKK": แถวแรกเป็นแถวสนามบินที่รหัสตรงกับคำที่พิมพ์ ไม่มีแถวเมือง "กรุงเทพมหานคร" อยู่เหนือ · เลือก BKK แล้วช่องต้นทางเป็นสนามบิน BKK แห่งเดียว ไม่ขยายเป็น "กรุงเทพมหานคร" (R07)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 5) ติ๊กครบ BKK + DMK แล้วชิปรวมเป็น "กรุงเทพมหานคร" และ checkbox แถวเมืองถูกติ๊กเอง (R29)' },
    { type: 'คาดหวัง', description: 'E7: (ขั้น 6) ทั้ง "โตเกียว" "Tokyo" "TYO": แถวแรกเป็น "โตเกียว ญี่ปุ่น" และชุดแถวสนามบินใต้เมือง (รหัสและลำดับ) เหมือนกันทั้ง 3 คำ (R03)' },
    { type: 'คาดหวัง', description: 'E8: (ขั้น 6) ลำดับประเภทในรายการ: แถวเมืองก่อน → ทุกแถวสนามบิน → สถานที่อื่น · ไม่มีแถวที่ไม่ใช่สนามบินอยู่ก่อนแถวสนามบินใด แม้ระยะ กม. น้อยกว่า (R05)' },
    { type: 'คาดหวัง', description: 'E9: (ขั้น 7) มีปลายทางแล้ว ปุ่ม ⇄ ใช้ได้ และปุ่มหลักเป็น "ค้นหา" (R01 R02)' },
    { type: 'คาดหวัง', description: 'E10: (ขั้น 8) หัวผลลัพธ์ กรุงเทพมหานคร → โตเกียว · เที่ยวเดียว · 1 · ชั้นประหยัด · อังคาร 15 ธ.ค. และทุกแถวในชุดแรกมีต้นทาง ∈ {BKK, DMK} ปลายทาง ∈ {HND, NRT} (R06 R29 R32)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-05 · R01 R02 R03 R05 R06 R07 R08 R29 R32 · Equivalence partition, State · [O-ยังไม่ยืนยัน] (E2)' },
    { type: 'งบค้นหา', description: '1' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  let dlg!: Locator;

  await test.step('1. เปิด U0 (ปลายทางว่าง) · snapshot อ่านสถานะปุ่ม ⇄ และชื่อปุ่มหลักใต้ฟอร์ม (ไม่ต้องกด)', async () => {
    await gf.goto(U0);
    await f.origin.waitFor({ timeout: 20_000 }).catch(() => {});
    const destVal = await f.dest.inputValue().catch(() => '');
    note('ขั้น 1', `ปลายทาง "${destVal}" · ปุ่มหลัก "${(await mainBtn(page).innerText().catch(() => '')).trim()}"`);
    await gf.check('E1 ปลายทางว่าง: ปุ่ม ⇄ ใช้ไม่ได้', [f.swap, f.dest], async () => {
      expect.soft(destVal, 'ช่องปลายทางว่าง').toBe('');
      await expect.soft(f.swap, 'ปุ่ม "สลับต้นทางกับปลายทาง"').toBeDisabled();
    });
    await gf.check('E2 ปุ่มหลักเป็น "สำรวจ" ไม่ใช่ "ค้นหา"', mainBtn(page), async () => {
      await expect.soft(mainBtn(page), 'ปุ่มหลักใต้ฟอร์ม').toHaveText(/^\s*สำรวจ\s*$/);
      await expect.soft(searchBtn(page), 'ไม่มีปุ่ม "ค้นหา"').toBeHidden();
    });
  });

  await test.step('2. คลิกช่องต้นทาง · snapshot อ่านสถานะ selected ของแถวเมือง "กรุงเทพมหานคร" และแถวสนามบินใต้เมือง', async () => {
    dlg = await openPlace(gf, page, 'origin');
    const opts = await readList(suggestList(dlg));
    note('ขั้น 2', listSummary(opts));
    const city = opts.find((o) => /^กรุงเทพมหานคร/.test(o.name));
    const bkk = opts.find((o) => o.code === 'BKK');
    const dmk = opts.find((o) => o.code === 'DMK');
    await gf.check('E3 แถวเมือง "กรุงเทพมหานคร" + BKK + DMK อยู่ในสถานะ selected', suggestList(dlg), async () => {
      expect.soft(city?.selected, 'แถวเมือง "กรุงเทพมหานคร" selected').toBe(true);
      expect.soft(bkk?.selected, 'แถว BKK selected').toBe(true);
      expect.soft(dmk?.selected, 'แถว DMK selected').toBe(true);
    });
  });

  await test.step('3. ลบข้อความ พิมพ์ "กรุงเทพ" รอ 3 วินาที snapshot · ลบแล้วพิมพ์ "Bangkok" snapshot (อ่านลำดับแถวและประเภทของแต่ละแถว)', async () => {
    for (const term of ['กรุงเทพ', 'Bangkok']) {
      await typePlace(gf, dlg, term);
      const opts = await readList(suggestList(dlg));
      note(`ขั้น 3 "${term}"`, listSummary(opts));
      await gf.check(`E4 "${term}": แถวแรกเป็นเมือง "กรุงเทพมหานคร" ตามด้วย BKK และ DMK`, suggestList(dlg), async () => {
        expect.soft(opts[0]?.name || '', 'แถวแรก').toMatch(/^กรุงเทพมหานคร/);
        expect.soft(opts[0]?.city, 'แถวแรกเป็นแถวเมือง').toBe(true);
        expect.soft([opts[1]?.code, opts[2]?.code].sort(), 'แถวที่ 2–3 เป็นสนามบิน BKK และ DMK').toEqual(['BKK', 'DMK']);
      });
    }
  });

  await test.step('4. ลบแล้วพิมพ์ "DMK" snapshot · ลบแล้วพิมพ์ "BKK" snapshot · เลือกแถวสนามบิน BKK · snapshot อ่านข้อความในช่องต้นทาง', async () => {
    for (const term of ['DMK', 'BKK']) {
      await typePlace(gf, dlg, term);
      const opts = await readList(suggestList(dlg));
      note(`ขั้น 4 "${term}"`, listSummary(opts));
      await gf.check(`E5 "${term}": แถวแรกเป็นสนามบิน ${term} ไม่มีแถวเมืองอยู่เหนือ`, suggestList(dlg), async () => {
        expect.soft(opts[0]?.code, 'รหัสสนามบินของแถวแรก').toBe(term);
        expect.soft(opts[0]?.city, 'แถวแรกไม่ใช่แถวเมือง').toBe(false);
      });
    }
    await gf.click(dlg.getByRole('option', { name: /\(BKK\)/ }).first());
    const a = await ariaOf(f.origin);
    const v = await f.origin.inputValue().catch(() => '');
    const around = await f.origin.locator('xpath=..').innerText().catch(() => '');
    note('ขั้น 4 ช่องต้นทาง', `name "${a.name}" · value "${v}" · ข้อความ "${around}"`);
    await gf.check('E5 เลือก BKK แล้วช่องต้นทางเป็นสนามบิน BKK แห่งเดียว ไม่ขยายเป็นเมือง', f.origin, async () => {
      const all = `${a.name} ${v} ${around}`;
      expect.soft(all, 'ช่องต้นทางระบุ BKK').toMatch(/BKK|สุวรรณภูมิ/);
      expect.soft(all, 'ช่องต้นทางไม่มี DMK').not.toMatch(/DMK|ดอนเมือง/);
    });
  });

  await test.step('5. คลิกช่องต้นทางอีกครั้ง กดปุ่ม "+" (โหมดเลือกหลายสนามบิน) ติ๊ก DMK เพิ่ม (BKK ติ๊กอยู่แล้ว) · snapshot อ่านชิปและ checkbox ของแถวเมือง · กดยืนยันปิดป๊อปอัป', async () => {
    dlg = await openPlace(gf, page, 'origin');
    await gf.click(dlg.getByRole('button', { name: /เลือกสนามบินหลายแห่ง/ }).first());
    let dmk = dlg.getByRole('checkbox', { name: /\(DMK\)/ }).first();
    if (!(await dmk.isVisible().catch(() => false))) {
      await gf.type(placeInput(dlg), 'กรุงเทพ'); // ไม่ล้าง: Backspace ในช่องว่างอาจลบชิป BKK
      dmk = dlg.getByRole('checkbox', { name: /\(DMK\)/ }).first();
    }
    await gf.click(dmk);
    const lists = dlg.getByRole('listbox');
    const chips = await readList(lists.first());
    const sugg = await readList(lists.last());
    note('ขั้น 5', `ชิป: ${listSummary(chips)} · รายการ: ${listSummary(sugg)}`);
    const cityCb = sugg.find((o) => o.kind === 'checkbox' && /^กรุงเทพมหานคร/.test(o.name));
    await gf.check('E6 ชิปรวมเป็น "กรุงเทพมหานคร" และ checkbox แถวเมืองถูกติ๊กเอง', [lists.first(), dlg.getByRole('checkbox', { name: /^กรุงเทพมหานคร/ }).first()], async () => {
      const chipNames = chips.filter((o) => o.kind === 'option').map((o) => o.name);
      expect.soft(chipNames, 'ชิปที่เลือก').toEqual(['กรุงเทพมหานคร']);
      expect.soft(cityCb?.checked, 'checkbox แถวเมือง "กรุงเทพมหานคร"').toBe(true);
    });
    await gf.click(dlg.getByRole('button', { name: 'เสร็จ', exact: true }).first());
  });

  const lists6: Record<string, Opt[]> = {};
  await test.step('6. คลิกช่องปลายทาง พิมพ์ "โตเกียว" รอ 3 วินาที snapshot (ลำดับแถว ประเภท ระยะ กม.) · ลบแล้วพิมพ์ "Tokyo" snapshot · ลบแล้วพิมพ์ "TYO" snapshot', async () => {
    dlg = await openPlace(gf, page, 'dest');
    for (const term of ['โตเกียว', 'Tokyo', 'TYO']) {
      await typePlace(gf, dlg, term);
      lists6[term] = await readList(suggestList(dlg));
      note(`ขั้น 6 "${term}"`, listSummary(lists6[term]));
      if (term === 'โตเกียว') {
        const o = lists6[term];
        await gf.check('E8 ลำดับ เมือง → ทุกแถวสนามบิน → สถานที่อื่น ("โตเกียว")', suggestList(dlg), async () => {
          expect.soft(o[0]?.city, 'แถวแรกเป็นแถวเมือง').toBe(true);
          const firstOther = o.findIndex((x, i) => i > 0 && !x.code && !x.city);
          const airportAfterOther = firstOther < 0 ? [] : o.slice(firstOther + 1).filter((x) => x.code).map((x) => x.name);
          expect.soft(airportAfterOther, `แถวสนามบินที่อยู่หลังสถานที่อื่น ("${o[firstOther]?.name}")`).toEqual([]);
        });
      }
    }
    const sig = (term: string) => {
      const o = lists6[term] || [];
      return { first: o[0]?.name || '', firstCity: !!o[0]?.city, airports: airportsUnderCity(o, 0).map((x) => x.code).join(',') };
    };
    const s = { 'โตเกียว': sig('โตเกียว'), Tokyo: sig('Tokyo'), TYO: sig('TYO') };
    await gf.check('E7 "โตเกียว" "Tokyo" "TYO": แถวแรก "โตเกียว ญี่ปุ่น" และชุดสนามบินใต้เมืองเหมือนกัน', suggestList(dlg), async () => {
      for (const [k, v] of Object.entries(s)) {
        expect.soft(v.first, `"${k}" แถวแรก`).toMatch(/^โตเกียว ญี่ปุ่น/);
        expect.soft(v.firstCity, `"${k}" แถวแรกเป็นแถวเมือง`).toBe(true);
      }
      expect.soft(s.Tokyo.airports, 'ชุดสนามบิน "Tokyo" = "โตเกียว"').toBe(s['โตเกียว'].airports);
      expect.soft(s.TYO.airports, 'ชุดสนามบิน "TYO" = "โตเกียว"').toBe(s['โตเกียว'].airports);
      expect.soft(s['โตเกียว'].airports, 'มีสนามบินใต้เมือง').not.toBe('');
    });
  });

  await test.step('7. เลือกแถว "โตเกียว ญี่ปุ่น" · snapshot อ่านสถานะปุ่ม ⇄ และชื่อปุ่มหลัก', async () => {
    await gf.click(dlg.getByRole('option', { name: /^โตเกียว ญี่ปุ่น/ }).first());
    await gf.check('E9 มีปลายทางแล้ว ปุ่ม ⇄ ใช้ได้ และปุ่มหลักเป็น "ค้นหา"', [f.swap, mainBtn(page)], async () => {
      await expect.soft(f.swap, 'ปุ่ม ⇄').toBeEnabled();
      await expect.soft(mainBtn(page), 'ปุ่มหลัก').toHaveText(/^\s*ค้นหา\s*$/);
    });
  });

  await test.step('8. ประเภทตั๋ว "เที่ยวเดียว" · ขาไปพิมพ์ "15 ธ.ค. 2026" Enter · "เสร็จ" · กด "ค้นหา" รอ ≥ 10 วินาที · snapshot หัวผลลัพธ์และสนามบินต้นทาง–ปลายทางของทุกแถวในชุดแรก', async () => {
    await ensureTripType(gf, page, 'เที่ยวเดียว', true);
    const cal = await typeDate(gf, page, D_DATE_TXT);
    await gf.click(calDone(cal));
    await gf.click(searchBtn(page), { search: 'TC-SRCH-05 กด "ค้นหา" หลังทดสอบรายการแนะนำ' });
    await waitResults(page);
    const rows = await readRows(page);
    note('ขั้น 8', `${rows.length} แถว · ${rowsSummary(rows)}`);
    await gf.check('E10 หัวผลลัพธ์ตรงโจทย์ และทุกแถวต้นทาง ∈ {BKK, DMK} ปลายทาง ∈ {HND, NRT}', [...headerTargets(page), rowItems(page)], async () => {
      await assertHeader(page, U1_HEADER);
      expect.soft(rows.length, 'จำนวนแถวผลลัพธ์').toBeGreaterThanOrEqual(1);
      const bad = rows.filter((r) => !(BKK_SET.includes(r.from || '') && TYO_SET.includes(r.to || '')));
      expect.soft(bad.map((r) => `${r.from}-${r.to} ${r.time}`), 'แถวที่สนามบินไม่อยู่ในชุดเมือง').toEqual([]);
    });
  });
  gf.finishNA();
});

test('TC-SRCH-06 · หน้าผลลัพธ์ค้นหาใหม่อัตโนมัติ', {
  tag: ['@P1', '@5.1'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2) ผลโหลดใหม่โดยไม่ต้องกด "ค้นหา": ค่า tfs ใน URL เปลี่ยน และหัวผลลัพธ์เป็น "พุธ 16 ธ.ค." (R19 R30)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 2) aria-label ของทุกแถวในชุดแรก (ถ้ามีวันที่) เป็นวันออก 16 ธ.ค. ไม่มีแถวของ 15 ธ.ค. ค้างอยู่ (R19)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 3) วันที่กลับเป็น "อังคาร 15 ธ.ค." (ถอย 1 วันพอดี) และผลโหลดใหม่ทันที (R33 R30)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 3) P15b = P15 และชุดแถวเหมือนขั้น 1 — เลื่อนวันไปแล้วกลับมาได้ผลเดิม (R33)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 4) หัวผลลัพธ์เป็น โตเกียว → กรุงเทพมหานคร · ค่าอื่นคงเดิม: เที่ยวเดียว · 1 · ชั้นประหยัด · อังคาร 15 ธ.ค. · ผลโหลดใหม่ทันที (R26 R30)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 4) ต้นทางใหม่มี HND และ NRT selected ครบ · ปลายทางใหม่มี BKK และ DMK selected ครบ (R26)' },
    { type: 'คาดหวัง', description: 'E7: (ขั้น 4) ทุกแถวในชุดแรกมีต้นทาง ∈ {HND, NRT} และปลายทาง ∈ {BKK, DMK} (R26 R31)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-06 · R19 R26 R30 R31 R33 · State, Invariant/Metamorphic · [R]' },
    { type: 'งบค้นหา', description: '4' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  let p15: number | null = null;
  let set15: string[] = [];
  let tfs2 = '';
  const rowKeys = (rows: Row[]) => rows.map((r) => `${r.time || '?'} ${r.airline || '?'}`).sort();

  await test.step('1. เปิด U1 รอ ≥ 10 วินาที · ตรวจหัวผลลัพธ์ตามนิยาม U1 · snapshot ราคาทุกแถวในชุดแรก จดราคาต่ำสุดเป็น P15 และจดชุดแถว (เวลาออก + สายการบิน)', async () => {
    await gf.goto(getU1(), { search: 'TC-SRCH-06 เปิด U1' });
    await waitResults(page);
    await gf.check('ก่อนเริ่ม: หัวผลลัพธ์ตรงนิยาม U1', headerTargets(page), async () => { await assertHeader(page, U1_HEADER); });
    const rows = await readRows(page);
    p15 = minPrice(rows);
    set15 = rowKeys(rows);
    note('P15', `${hhmm()} · ฿${p15 ?? '-'} · ${rowsSummary(rows)}`);
  });

  await test.step('2. คลิกช่อง "ขาไป" (ปฏิทินเปิด) พิมพ์ "16 ธ.ค. 2026" Enter แล้วกด "เสร็จ" · ไม่กดปุ่มอื่น รอ ≥ 10 วินาที · snapshot URL หัวผลลัพธ์ และ aria-label ของแถว', async () => {
    const tfs1 = tfsOf(page.url());
    const dlg = await typeDate(gf, page, D_DATE1_TXT);
    if (await calDone(dlg).isVisible().catch(() => false)) await gf.click(calDone(dlg), { search: 'TC-SRCH-06 "เสร็จ" 16 ธ.ค.' });
    else await gf.searched('TC-SRCH-06 Enter ในปฏิทินปิดแล้วค้นหา 16 ธ.ค.');
    await waitResults(page);
    tfs2 = tfsOf(page.url());
    const rows = await readRows(page);
    note('ขั้น 2', `${hhmm()} · ${page.url()} · ${rowsSummary(rows)}`);
    await gf.check('E1 ผลโหลดใหม่เอง: tfs เปลี่ยน และหัวผลลัพธ์ "พุธ 16 ธ.ค."', f.date, async () => {
      expect.soft(tfs2, 'ค่า tfs ใน URL เปลี่ยน').not.toBe(tfs1);
      await expect.soft(f.date, 'หัวผลลัพธ์').toHaveValue(RE_DATE16);
    });
    await gf.check('E2 aria-label ทุกแถว (ที่มีวันที่) เป็นวันออก 16 ธ.ค.', rowItems(page), async () => {
      expect.soft(rows.length, 'มีแถวผลลัพธ์').toBeGreaterThan(0);
      const dated = rows.filter((r) => r.day !== undefined);
      expect.soft(dated.filter((r) => !(r.mon === 12 && r.day === 16)).map((r) => `${r.time} ${r.day}/${r.mon}`), 'แถวที่ไม่ใช่ 16 ธ.ค.').toEqual([]);
    });
  });

  await test.step('3. กดปุ่ม < ข้างช่องวันที่ 1 ครั้ง (ปุ่ม aria-hidden ไม่มีชื่อ: ใช้ปุ่มทางซ้ายช่องวันที่) · รอ ≥ 10 วินาที · snapshot หัวผลลัพธ์และราคาทุกแถว จดราคาต่ำสุดเป็น P15b และชุดแถว', async () => {
    const nav = await dateNav(page);
    await gf.click(nav.prev, { search: 'TC-SRCH-06 ปุ่ม < ข้างวันที่ 16 → 15 ธ.ค.' });
    await waitResults(page);
    const tfs3 = tfsOf(page.url());
    const rows = await readRows(page);
    const p15b = minPrice(rows);
    const set15b = rowKeys(rows);
    note('P15b', `${hhmm()} · ฿${p15b ?? '-'} · ${rowsSummary(rows)}`);
    await gf.check('E3 วันที่กลับเป็น "อังคาร 15 ธ.ค." และผลโหลดใหม่ทันที', f.date, async () => {
      await expect.soft(f.date, 'หัวผลลัพธ์').toHaveValue(RE_DATE15);
      expect.soft(tfs3, 'ค่า tfs ใน URL เปลี่ยนจากขั้น 2').not.toBe(tfs2);
    });
    await gf.check('E4 P15b = P15 และชุดแถวเหมือนขั้น 1', rowItems(page), async () => {
      expect.soft(p15b, `P15b (ขั้น 1 P15 = ฿${p15})`).toBe(p15);
      expect.soft(set15b, 'ชุดแถว (เวลาออก + สายการบิน) เทียบขั้น 1').toEqual(set15);
    });
  });

  await test.step('4. กด ⇄ · รอ ≥ 10 วินาที · snapshot หัวผลลัพธ์ และสนามบินต้นทาง–ปลายทางของทุกแถวในชุดแรก · คลิกช่องต้นทางอ่านสนามบินที่ selected แล้ว Esc · คลิกช่องปลายทางอ่านสนามบินที่ selected แล้ว Esc (ไม่เปลี่ยนค่า)', async () => {
    const tfsBefore = tfsOf(page.url());
    await gf.click(f.swap, { search: 'TC-SRCH-06 กด ⇄ สลับต้นทาง/ปลายทาง' });
    await waitResults(page);
    const rows = await readRows(page);
    note('ขั้น 4', `${hhmm()} · ${rowsSummary(rows)}`);
    await gf.check('E5 หัวผลลัพธ์ โตเกียว → กรุงเทพมหานคร ค่าอื่นคงเดิม และผลโหลดใหม่ทันที', headerTargets(page), async () => {
      await assertHeader(page, { trip: 'เที่ยวเดียว', pax: 1, cabin: 'ชั้นประหยัด', origin: 'โตเกียว', dest: 'กรุงเทพมหานคร', date: RE_DATE15 });
      expect.soft(tfsOf(page.url()), 'ค่า tfs ใน URL เปลี่ยน').not.toBe(tfsBefore);
    });
    await gf.check('E7 ทุกแถวต้นทาง ∈ {HND, NRT} ปลายทาง ∈ {BKK, DMK}', rowItems(page), async () => {
      expect.soft(rows.length, 'มีแถวผลลัพธ์').toBeGreaterThan(0);
      const bad = rows.filter((r) => !(TYO_SET.includes(r.from || '') && BKK_SET.includes(r.to || '')));
      expect.soft(bad.map((r) => `${r.from}-${r.to} ${r.time}`), 'แถวที่สนามบินไม่อยู่ในชุดเมือง').toEqual([]);
    });
    let dlg = await openPlace(gf, page, 'origin');
    const o = await readList(suggestList(dlg));
    note('ขั้น 4 ต้นทาง', listSummary(o));
    await gf.check('E6 ต้นทางใหม่มี HND และ NRT selected ครบ', suggestList(dlg), async () => {
      expect.soft(o.filter((x) => x.selected && x.code).map((x) => x.code).sort(), 'สนามบินต้นทางที่ selected').toEqual(expect.arrayContaining(['HND', 'NRT']));
    });
    await gf.press('Escape');
    dlg = await openPlace(gf, page, 'dest');
    const d = await readList(suggestList(dlg));
    note('ขั้น 4 ปลายทาง', listSummary(d));
    await gf.check('E6 ปลายทางใหม่มี BKK และ DMK selected ครบ', suggestList(dlg), async () => {
      expect.soft(d.filter((x) => x.selected && x.code).map((x) => x.code).sort(), 'สนามบินปลายทางที่ selected').toEqual(expect.arrayContaining(['BKK', 'DMK']));
    });
    await gf.press('Escape');
  });
  gf.finishNA();
});

test('TC-SRCH-07 · ขอบ "วันนี้" ในปฏิทินและปุ่ม <', {
  tag: ['@P1', '@5.1'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2) ช่อง D-YEST ไม่เป็นปุ่มและไม่มีราคา · ช่อง D-TODAY เป็นปุ่มและมีราคา (R11)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 3) คลิก D-YEST แล้วช่องขาไปยังเป็น "อังคาร 15 ธ.ค." ไม่เปลี่ยน (R11)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 4) X เป็นตัวเลขเต็ม (ไม่ใช่รูปแบบ K) และ P_cell เท่ากับ X ที่ปัดตาม D-SRCH-CELLTOL (R37)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 5) หัวผลลัพธ์แสดงวันที่ = D-TODAY พร้อมวันในสัปดาห์ที่ถูกต้อง (R11)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 5) ปุ่ม < ข้างวันที่ใช้ไม่ได้ (disabled) และปุ่ม > ใช้ได้ (R34)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 5) X = ราคาต่ำสุดในชุดแรก = ราคาบนแท็บ "ถูกที่สุด" (R37) · ถ้าวันรันไม่มีเที่ยวบินเหลือในวันนี้ (ไม่มีแถว) = ข้าม E3 E6 (N/A)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-07 · R11 R34 R37 · Boundary, Invariant/Metamorphic · [R]' },
    { type: 'งบค้นหา', description: '2' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  const T = bkkNow();
  const TD: YMD = { y: T.y, m: T.m, d: T.d };
  const YD = addDays(TD, -1);
  note('T', `D-TODAY ${ymdStr(TD)} · D-YEST ${ymdStr(YD)} · ${hhmm()} (เวลาไทย)`);
  let dlg!: Locator;
  let X: { value: number; k: boolean } | null = null;
  let xText = '';
  let pCell: Awaited<ReturnType<typeof cellPrice>> | null = null;

  await test.step('1. เปิด U1 รอ ≥ 10 วินาที · ตรวจหัวผลลัพธ์ตามนิยาม U1', async () => {
    await gf.goto(getU1(), { search: 'TC-SRCH-07 เปิด U1' });
    await waitResults(page);
    await gf.check('ก่อนเริ่ม: หัวผลลัพธ์ตรงนิยาม U1', headerTargets(page), async () => { await assertHeader(page, U1_HEADER); });
  });

  await test.step('2. คลิกช่อง "ขาไป" · กด < ในปฏิทินจนเห็นเดือนของ D-TODAY และ D-YEST · snapshot อ่านว่าช่อง D-YEST และ D-TODAY เป็นปุ่มไหม มีราคาไหม', async () => {
    await gf.click(f.date);
    dlg = calDlg(page);
    await dlg.waitFor({ timeout: 10_000 }).catch(() => {});
    await showMonth(gf, dlg, TD, T.y);
    if (YD.m !== TD.m) await showMonth(gf, dlg, YD, T.y);
    const groups = await visibleMonths(dlg, T.y);
    const cellOf = (a: YMD) => {
      const g = groups.find((x) => x.h && x.h.mi === a.m - 1 && x.h.y === a.y);
      return g ? g.cells.find((c) => c.day === a.d) ?? null : null;
    };
    const y = cellOf(YD);
    const t = cellOf(TD);
    note('ขั้น 2', `เดือนที่เห็น [${groups.map((g) => g.header).join(' | ')}] · D-YEST ${y ? `"${y.text}" ปุ่ม=${y.isButton}` : 'ไม่อยู่ในปฏิทิน'} · D-TODAY ${t ? `"${t.text}" ปุ่ม=${t.isButton} (${t.label})` : 'ไม่พบ'}`);
    await gf.check('E1 D-YEST ไม่เป็นปุ่มและไม่มีราคา · D-TODAY เป็นปุ่มและมีราคา', dlg.getByRole('grid'), async () => {
      expect.soft(y?.isButton ?? false, 'ช่อง D-YEST เป็นปุ่ม').toBe(false);
      expect.soft(/฿/.test(y?.text || ''), 'ช่อง D-YEST มีราคา').toBe(false);
      expect.soft(t?.isButton, 'ช่อง D-TODAY เป็นปุ่ม').toBe(true);
      expect.soft(/฿/.test(t?.text || '') || /บาทไทย/.test(t?.label || ''), 'ช่อง D-TODAY มีราคา').toBe(true);
    });
  });

  await test.step('3. คลิกช่อง D-YEST · snapshot อ่านข้อความในช่องขาไป', async () => {
    if (await markCell(dlg, YD, T.y, 'yest')) await gf.click(dlg.locator('[data-e2e-cell="yest"]'), { force: true });
    else note('ขั้น 3', 'ช่อง D-YEST ไม่ได้แสดงในปฏิทิน จึงคลิกไม่ได้');
    await gf.check('E2 คลิก D-YEST แล้วช่องขาไปยังเป็น "อังคาร 15 ธ.ค."', calDepart(dlg), async () => {
      await expect.soft(calDepart(dlg)).toHaveValue(RE_DATE15);
    });
  });

  await test.step('4. คลิกช่อง D-TODAY · snapshot อ่านราคาในช่อง จดเป็น P_cell และข้อความ "เริ่มที่ ฿…" มุมล่าง จดเป็น X', async () => {
    await gf.click(dayBtn(dlg, TD));
    await gf.pause(3000, 4000);
    pCell = await cellPrice(dlg, TD);
    xText = (await dlg.getByText(/เริ่มที่\s*฿/).first().innerText({ timeout: 5000 }).catch(() => '')).trim();
    X = parseBaht(xText);
    note('ขั้น 4', `${hhmm()} · P_cell "${pCell.text}" (${pCell.label}) · X "${xText}"`);
    if (X) {
      await gf.check('E3 X เป็นตัวเลขเต็ม (ไม่ใช่ K) และ P_cell = X ที่ปัด (≤ ฿50)', [dayBtn(dlg, TD), dlg.getByText(/เริ่มที่\s*฿/).first()], async () => {
        expect.soft(X!.k, `X "${xText}" ไม่ใช่รูปแบบ K`).toBe(false);
        expect.soft(xText, 'X เป็นตัวเลขเต็ม (ไม่มีทศนิยม)').not.toMatch(/฿\s*[\d,]*\.\d/);
        expect.soft(pCell!.shown, `อ่านราคาในช่องได้ ("${pCell!.text}")`).not.toBeNull();
        if (pCell!.shown !== null) expect.soft(Math.abs(pCell!.shown - X!.value), `|P_cell ${pCell!.text} − X ${xText}| ≤ ฿${CELLTOL}`).toBeLessThanOrEqual(CELLTOL);
      });
    }
  });

  await test.step('5. กด "เสร็จ" รอ ≥ 10 วินาที · snapshot อ่านหัวผลลัพธ์ สถานะปุ่ม < และ > ข้างวันที่ ราคาทุกแถวในชุดแรก และราคาบนแท็บ "ถูกที่สุด"', async () => {
    await gf.click(calDone(dlg), { search: 'TC-SRCH-07 "เสร็จ" ค้นหาวันนี้' });
    await waitResults(page);
    const rows = await readRows(page);
    const min = minPrice(rows);
    const tab = await cheapestTabPrice(page);
    const val = await f.date.inputValue().catch(() => '');
    note('ขั้น 5', `${hhmm()} · ขาไป "${val}" · ${rows.length} แถว · ต่ำสุด ฿${min ?? '-'} · แท็บถูกที่สุด ฿${tab ?? '-'}`);
    await gf.check('E4 หัวผลลัพธ์แสดงวันที่ = D-TODAY พร้อมวันในสัปดาห์ที่ถูกต้อง', f.date, async () => {
      const p = parseShortDate(val);
      expect.soft(p ? `${p.d}/${p.m}` : val, 'วันที่ในหัวผลลัพธ์').toBe(`${TD.d}/${TD.m}`);
      expect.soft(weekdayOfText(val), `วันในสัปดาห์ ("${val}") = ${TH_WEEKDAY_FORMS[weekdayOf(TD)][0]}`).toBe(weekdayOf(TD));
    });
    const nav = await dateNav(page);
    await gf.check('E5 ปุ่ม < ข้างวันที่ใช้ไม่ได้ และปุ่ม > ใช้ได้', [nav.prev, nav.next], async () => {
      await expect.soft(nav.prev, 'ปุ่ม < ข้างวันที่').toBeDisabled();
      await expect.soft(nav.next, 'ปุ่ม > ข้างวันที่').toBeEnabled();
    });
    if (rows.length === 0) {
      if (!X) gf.na('E3 X เป็นตัวเลขเต็มและ P_cell = X ที่ปัด', 'วันรันไม่มีเที่ยวบินเหลือในวันนี้ (ไม่มีแถว) → N/A ตามแผน');
      gf.na('E6 X = ราคาต่ำสุดในชุดแรก = ราคาบนแท็บ "ถูกที่สุด"', 'วันรันไม่มีเที่ยวบินเหลือในวันนี้ (ไม่มีแถว) → N/A ตามแผน');
    } else {
      if (!X) {
        await gf.check('E3 X เป็นตัวเลขเต็มและ P_cell = X ที่ปัด', null, async () => {
          expect.soft(xText, 'อ่านข้อความ "เริ่มที่ ฿…" ในปฏิทินได้ (ขั้น 4) ทั้งที่วันนี้มีแถว').not.toBe('');
        });
      }
      await gf.check('E6 X = ราคาต่ำสุดในชุดแรก = ราคาบนแท็บ "ถูกที่สุด"', [rowItems(page), page.getByRole('tab', { name: /^ถูกที่สุด/ }).first()], async () => {
        expect.soft(X?.value ?? null, `X ("${xText}") = ราคาต่ำสุดในชุดแรก`).toBe(min);
        expect.soft(tab, 'ราคาบนแท็บ "ถูกที่สุด" = X').toBe(X?.value ?? null);
      });
    }
  });
  gf.finishNA();
});

test('TC-SRCH-08 · ⚠️ ฟอร์มยอมค่าที่ควรเตือน', {
  tag: ['@P1', '@5.1', '@known-defect'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2) รายการแนะนำมี "โตเกียว ญี่ปุ่น" หรือมีข้อความแนะนำทำนอง "หมายถึง Tokyo?" (R04)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 3) มีข้อความเตือนว่าต้นทางกับปลายทางเหมือนกัน (เนื้อความใดก็ได้ที่บอกเหตุ) ไม่ใช่ล้างช่องเงียบ ๆ (R27)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 4) ในทั้งสองเมือง แถวสนามบินใต้เมืองเรียงระยะ กม. จากน้อยไปมาก (ค่า กม. ของแถวถัดไป ≥ แถวก่อนหน้า) และใช้เกณฑ์เดียวกันทั้งสองเมือง (R09)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 5) เมื่อถึงจำนวนสูงสุดที่ระบบยอมรับ ปุ่ม + ทุกประเภทใช้ไม่ได้ · ถ้ากด + ได้จนเกิดข้อความแดงเรื่องเพดานจำนวนคน = ล้ม (ปุ่มควรถูกปิดก่อนเข้าสถานะผิด) (R23)' },
    { type: 'คาดหวัง', description: 'E5: (ขั้น 6) มีข้อความบอกว่าต้องเลือกวันที่ (เนื้อความใดก็ได้ที่บอกเหตุ) (R10)' },
    { type: 'คาดหวัง', description: 'E6: (ขั้น 7) หัวผลลัพธ์: เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค. (ยืนยันว่าการค้นหาจบได้หลังค่าผิดทั้งหมด)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-08 · R04 R09 R10 R23 R27 · Negative, Boundary · [R] · ⚠️ ข้อบกพร่องที่รู้แล้ว (คาดว่าจะล้ม E1–E5)' },
    { type: 'งบค้นหา', description: '2' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  let dlg!: Locator;
  const SAME_RE = /(ต้นทาง|ปลายทาง|จุดหมาย).{0,40}(เหมือนกัน|ซ้ำ|เดียวกัน)|(เหมือนกัน|ซ้ำ|เดียวกัน).{0,40}(ต้นทาง|ปลายทาง|จุดหมาย)/;
  const NEED_DATE_RE = /(เลือก|ระบุ|ใส่|กรอก|เพิ่ม).{0,20}วันที่|วันที่.{0,20}(ว่าง|จำเป็น|ต้อง|ไม่ถูกต้อง)/;

  await test.step('1. เปิด U0 · ประเภทตั๋ว "เที่ยวเดียว" · ต้นทาง "กรุงเทพมหานคร"', async () => {
    await gf.goto(U0);
    await f.origin.waitFor({ timeout: 20_000 }).catch(() => {});
    await ensureTripType(gf, page, 'เที่ยวเดียว');
    await ensureOrigin(gf, page);
  });

  await test.step('2. คลิกช่องปลายทาง พิมพ์ "Tokio" รอ 3 วินาที · snapshot อ่านรายการแนะนำ/ข้อความ', async () => {
    dlg = await openPlace(gf, page, 'dest');
    await typePlace(gf, dlg, 'Tokio');
    const opts = await readList(suggestList(dlg));
    const msg = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ');
    note('ขั้น 2', `รายการ: ${listSummary(opts)} · ข้อความ "${msg}"`);
    await gf.check('E1 "Tokio": รายการมี "โตเกียว ญี่ปุ่น" หรือมีคำแนะนำ "หมายถึง Tokyo?"', dlg, async () => {
      const hasTokyo = opts.some((o) => /^โตเกียว ญี่ปุ่น/.test(o.name));
      const didYouMean = /หมายถึง|Did you mean|Tokyo\s*\?/i.test(msg);
      expect.soft(hasTokyo || didYouMean, `มี "โตเกียว ญี่ปุ่น" หรือคำแนะนำ (ที่เห็น: ${listSummary(opts) || msg})`).toBe(true);
    });
  });

  await test.step('3. ลบแล้วพิมพ์ "กรุงเทพ" เลือกแถวเมือง "กรุงเทพมหานคร" (ปลายทาง = ต้นทาง) · snapshot อ่านข้อความเตือน ช่องปลายทาง และชื่อปุ่มหลัก', async () => {
    await typePlace(gf, dlg, 'กรุงเทพ');
    await gf.click(dlg.getByRole('option', { name: /^กรุงเทพมหานคร/ }).first());
    const msgs = await formMessages(page);
    const destVal = await f.dest.inputValue().catch(() => '');
    const btn = (await mainBtn(page).innerText().catch(() => '')).trim();
    note('ขั้น 3', `ปลายทาง "${destVal}" · ปุ่มหลัก "${btn}" · ข้อความ "${msgs.slice(0, 400)}"`);
    await gf.check('E2 มีข้อความเตือนว่าต้นทางกับปลายทางเหมือนกัน ไม่ใช่ล้างช่องเงียบ ๆ', [f.dest, mainBtn(page)], async () => {
      expect.soft(SAME_RE.test(msgs), `มีข้อความเตือนต้นทาง = ปลายทาง (ช่องปลายทาง "${destVal}" · ปุ่ม "${btn}")`).toBe(true);
    });
  });

  await test.step('4. คลิกช่องปลายทาง พิมพ์ "โตเกียว" · snapshot อ่านระยะ กม. ของแถวสนามบินใต้เมืองตามลำดับ · เลือก "โตเกียว ญี่ปุ่น" · คลิกช่องต้นทาง snapshot อ่านระยะ กม. ของแถวสนามบินใต้ "กรุงเทพมหานคร" ตามลำดับ แล้ว Esc', async () => {
    dlg = await openPlace(gf, page, 'dest');
    await typePlace(gf, dlg, 'โตเกียว');
    const t = await readList(suggestList(dlg));
    const tCity = t.findIndex((o) => o.city && /^โตเกียว ญี่ปุ่น/.test(o.name));
    const tKm = airportsUnderCity(t, tCity < 0 ? 0 : tCity).map((o) => ({ code: o.code, km: o.km }));
    await gf.check('E3 (โตเกียว) แถวสนามบินใต้เมืองเรียงระยะ กม. จากน้อยไปมาก', suggestList(dlg), async () => {
      const kms = tKm.map((x) => x.km ?? NaN);
      expect.soft(kms.length, 'มีแถวสนามบินใต้เมืองโตเกียว').toBeGreaterThan(0);
      expect.soft(kms, `ลำดับ ${JSON.stringify(tKm)}`).toEqual([...kms].sort((a, b) => a - b));
    });
    await gf.click(dlg.getByRole('option', { name: /^โตเกียว ญี่ปุ่น/ }).first());
    dlg = await openPlace(gf, page, 'origin');
    const b = await readList(suggestList(dlg));
    const bCity = b.findIndex((o) => o.city && /^กรุงเทพมหานคร/.test(o.name));
    const bKm = airportsUnderCity(b, bCity < 0 ? 0 : bCity).map((o) => ({ code: o.code, km: o.km }));
    note('ขั้น 4', `โตเกียว ${JSON.stringify(tKm)} · กรุงเทพมหานคร ${JSON.stringify(bKm)}`);
    await gf.check('E3 (กรุงเทพมหานคร) แถวสนามบินใต้เมืองเรียงระยะ กม. จากน้อยไปมาก (เกณฑ์เดียวกับโตเกียว)', suggestList(dlg), async () => {
      const kms = bKm.map((x) => x.km ?? NaN);
      expect.soft(kms.length, 'มีแถวสนามบินใต้เมืองกรุงเทพมหานคร').toBeGreaterThan(0);
      expect.soft(kms, `ลำดับ ${JSON.stringify(bKm)}`).toEqual([...kms].sort((a, b2) => a - b2));
    });
    await gf.press('Escape');
  });

  await test.step('5. คลิกไอคอนผู้โดยสาร ตั้ง D-PAX-9 (ผู้ใหญ่ 7 + ทารกบนตัก 2) · snapshot อ่านสถานะปุ่ม + ทุกประเภท · ถ้าปุ่ม + ผู้ใหญ่กดได้ ให้กด 1 ครั้ง (D-PAX-10) แล้ว snapshot · กด Esc ตรวจว่าไอคอนกลับเป็น "1"', async () => {
    await openPax(gf, page);
    for (let i = 0; i < 8 && (await paxCount(page, 'adult')) < 7; i++) await gf.click(paxBtn(page, 'adult', 'add'));
    for (let i = 0; i < 3 && (await paxCount(page, 'lap')) < 2; i++) await gf.click(paxBtn(page, 'lap', 'add'));
    const kinds: PaxKind[] = ['adult', 'child', 'seat', 'lap'];
    const enabled9: Record<string, boolean> = {};
    for (const k of kinds) enabled9[k] = await paxBtn(page, k, 'add').isEnabled().catch(() => false);
    note('ขั้น 5 (9 คน)', `ผู้ใหญ่ ${await paxCount(page, 'adult')} · ทารกบนตัก ${await paxCount(page, 'lap')} · ปุ่ม + ใช้ได้ ${JSON.stringify(enabled9)}`);
    let alert10 = '';
    if (enabled9.adult) {
      await gf.click(paxBtn(page, 'adult', 'add'));
      alert10 = await paxAlert(page).innerText({ timeout: 3000 }).catch(() => '');
      note('ขั้น 5 (กด + ผู้ใหญ่อีก 1)', `ผู้ใหญ่ ${await paxCount(page, 'adult')} · ข้อความ "${alert10}"`);
    }
    await gf.check('E4 ถึงจำนวนสูงสุดแล้ว ปุ่ม + ทุกประเภทใช้ไม่ได้ (ไม่เข้าสถานะข้อความแดงเรื่องเพดาน)', [paxDlg(page), ...kinds.map((k) => paxBtn(page, k, 'add'))], async () => {
      expect.soft(enabled9, 'สถานะปุ่ม + ที่ 9 คน (true = ยังกดได้)').toEqual({ adult: false, child: false, seat: false, lap: false });
      expect.soft(alert10, 'กด + ได้จนเกิดข้อความแดงเรื่องเพดานจำนวนคน').toBe('');
    });
    await gf.press('Escape');
    await markPaxIcon(page);
    const icon = await paxIconValue(page);
    await gf.check('ขั้น 5 Esc แล้วไอคอนผู้โดยสารกลับเป็น "1"', f.pax, async () => {
      expect.soft(icon, 'ไอคอนผู้โดยสารหลัง Esc').toBe('1');
    });
  });

  await test.step('6. ช่องขาไปยังว่าง กด "ค้นหา" · snapshot อ่านข้อความบนหน้า URL และสิ่งที่เปิดขึ้น', async () => {
    const before = await f.date.inputValue().catch(() => '');
    note('ขั้น 6 ก่อนกด', `ช่องขาไป "${before}"`);
    await gf.click(searchBtn(page), { search: 'TC-SRCH-08 กด "ค้นหา" ขณะไม่มีวันที่' });
    const msgs = await formMessages(page);
    const calOpen = await calDlg(page).isVisible().catch(() => false);
    note('ขั้น 6', `URL ${page.url()} · ปฏิทินเปิด=${calOpen} · ข้อความ "${msgs.slice(0, 400)}"`);
    await gf.check('E5 มีข้อความบอกว่าต้องเลือกวันที่', [calDlg(page), f.date], async () => {
      expect.soft(NEED_DATE_RE.test(msgs), 'มีข้อความบอกว่าต้องเลือกวันที่').toBe(true);
    });
  });

  await test.step('7. ในปฏิทินพิมพ์ "15 ธ.ค. 2026" Enter · "เสร็จ" · กด "ค้นหา" (ถ้าหน้ายังไม่ไปหน้าผลลัพธ์) รอ ≥ 10 วินาที · snapshot หัวผลลัพธ์', async () => {
    let dlgCal = calDlg(page);
    if (await dlgCal.isVisible().catch(() => false)) await gf.type(calDepart(dlgCal), D_DATE_TXT, { clear: true, enter: true });
    else dlgCal = await typeDate(gf, page, D_DATE_TXT);
    if (await calDone(dlgCal).isVisible().catch(() => false)) await gf.click(calDone(dlgCal));
    if (isResults(page)) await gf.searched('TC-SRCH-08 "เสร็จ" แล้วหน้าโหลดผลลัพธ์');
    else await gf.click(searchBtn(page), { search: 'TC-SRCH-08 กด "ค้นหา" หลังใส่วันที่' });
    await waitResults(page);
    await gf.check('E6 หัวผลลัพธ์: เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.', headerTargets(page), async () => {
      expect.soft(page.url(), 'อยู่หน้าผลลัพธ์').toMatch(/\/travel\/flights\/search/);
      await assertHeader(page, U1_HEADER);
    });
  });
  gf.finishNA();
});

test('TC-SRCH-09 · ⚠️ ไม่พบผลจากเงื่อนไขค้นหา', {
  tag: ['@P1', '@5.1', '@known-defect'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2) ก่อนค้นหามีข้อความเตือนว่าต้นทางกับปลายทางซ้อนกัน หรือปุ่ม "ค้นหา" ใช้ไม่ได้ (R28)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 3) ถ้าระบบยอมค้นหา ข้อความไม่พบผลต้องบอกสาเหตุที่เส้นทาง/สถานที่ซ้อนกัน ไม่ใช่แนะนำให้เปลี่ยนวันที่ (R28 F32)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 5) "Tokyo Station" ไม่อยู่ในรายการแนะนำปลายทาง หรือเลือกแล้วช่องปลายทางกลายเป็นสนามบินใกล้เคียง/เมืองโตเกียว (HND, NRT หรือ "โตเกียว" ระดับเมือง) (R38)' },
    { type: 'คาดหวัง', description: 'E4: (ขั้น 5) ผลลัพธ์มีแถว ≥ 1 ที่ปลายทาง ∈ {HND, NRT} (เพราะขั้น 4 ยืนยันแล้วว่ามีเที่ยวบินวันเดียวกัน) หรือถ้าไม่พบผล ข้อความต้องบอกว่าปลายทางไม่ใช่สนามบิน ไม่ใช่แนะนำให้เปลี่ยนวันที่ (R38 F32) · ถ้ารายการไม่มีแถว Tokyo Station ให้ข้าม E4 (N/A)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-09 · R28 R38 · Negative, Invariant/Metamorphic · [R] · ⚠️ ข้อบกพร่องที่รู้แล้ว (คาดว่าจะล้ม E1–E4)' },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  const OVERLAP_RE = /(ต้นทาง|ปลายทาง|จุดหมาย|สถานที่|เส้นทาง|สนามบิน).{0,40}(ซ้อน|ซ้ำ|เหมือน|เดียวกัน|ทับ)|(ซ้อน|ซ้ำ|เหมือน|เดียวกัน|ทับ).{0,40}(ต้นทาง|ปลายทาง|จุดหมาย|สถานที่|เส้นทาง|สนามบิน)/;
  const NOT_AIRPORT_RE = /ไม่ใช่สนามบิน|ไม่มีสนามบิน|ไม่ได้เป็นสนามบิน|สถานีรถไฟ|ไม่รองรับ.{0,20}(ปลายทาง|จุดหมาย|สถานที่)/;
  const CHANGE_DATE_RE = /เปลี่ยนวันที่/;
  let searched3 = false;

  await test.step('1. เปิด U0 · ประเภทตั๋ว "เที่ยวเดียว" · คลิกช่องต้นทาง พิมพ์ "โตเกียว" เลือกแถวเมือง "โตเกียว ญี่ปุ่น" (HND + NRT)', async () => {
    await gf.goto(U0);
    await f.origin.waitFor({ timeout: 20_000 }).catch(() => {});
    await ensureTripType(gf, page, 'เที่ยวเดียว');
    await choosePlace(gf, page, 'origin', 'โตเกียว', /^โตเกียว ญี่ปุ่น/);
  });

  await test.step('2. คลิกช่องปลายทาง พิมพ์ "HND" เลือกแถวสนามบิน HND · snapshot อ่านข้อความเตือนและสถานะปุ่ม "ค้นหา"', async () => {
    await choosePlace(gf, page, 'dest', 'HND', /\(HND\)/);
    const msgs = await formMessages(page);
    const btnUsable = await clickable(searchBtn(page));
    note('ขั้น 2', `ปลายทาง "${(await ariaOf(f.dest)).name}" · ปุ่มค้นหาใช้ได้=${btnUsable} · ข้อความ "${msgs.slice(0, 300)}"`);
    await gf.check('E1 ก่อนค้นหามีข้อความเตือนว่าต้นทาง/ปลายทางซ้อนกัน หรือปุ่ม "ค้นหา" ใช้ไม่ได้', [f.origin, f.dest, searchBtn(page)], async () => {
      expect.soft(OVERLAP_RE.test(msgs) || !btnUsable, 'มีข้อความเตือนการซ้อน หรือปุ่ม "ค้นหา" ใช้ไม่ได้').toBe(true);
    });
  });

  await test.step('3. ขาไปพิมพ์ "15 ธ.ค. 2026" Enter · "เสร็จ" · กด "ค้นหา" (ถ้ากดได้) รอ ≥ 10 วินาที · snapshot อ่านข้อความบนหน้า (หัวข้อไม่พบผลและคำแนะนำ)', async () => {
    const dlg = await typeDate(gf, page, D_DATE_TXT);
    await gf.click(calDone(dlg));
    if (await clickable(searchBtn(page))) {
      await gf.click(searchBtn(page), { search: 'TC-SRCH-09 ค้นหา โตเกียว → HND' });
      searched3 = true;
      await waitResults(page);
    }
    const msg = await noResText(page);
    const nRows = (await readRows(page)).length;
    note('ขั้น 3', `ค้นหาแล้ว=${searched3} · แถว ${nRows} · ข้อความไม่พบผล "${msg}"`);
    if (!searched3) gf.na('E2 ข้อความไม่พบผลบอกสาเหตุที่การซ้อน', 'ระบบไม่ยอมค้นหา (ปุ่ม "ค้นหา" ใช้ไม่ได้) → เงื่อนไข "ถ้าระบบยอมค้นหา" ไม่เกิด');
    else if (!msg && nRows > 0) gf.na('E2 ข้อความไม่พบผลบอกสาเหตุที่การซ้อน', `ระบบค้นหาแล้วพบ ${nRows} แถว ไม่มีหน้าไม่พบผลให้ตรวจ`);
    else {
      await gf.check('E2 ข้อความไม่พบผลบอกสาเหตุที่เส้นทาง/สถานที่ซ้อนกัน ไม่ใช่แนะนำให้เปลี่ยนวันที่', noResHeading(page).locator('xpath=..'), async () => {
        expect.soft(msg, 'ข้อความบอกสาเหตุการซ้อนของเส้นทาง/สถานที่').toMatch(OVERLAP_RE);
        expect.soft(msg, 'ไม่แนะนำให้เปลี่ยนวันที่').not.toMatch(CHANGE_DATE_RE);
      });
    }
  });

  await test.step('4. คลิกช่องต้นทาง พิมพ์ "กรุงเทพ" เลือก "กรุงเทพมหานคร" (ถ้าขั้น 3 ไม่ได้ค้นหา ให้กด "ค้นหา" ต่อ) รอ ≥ 10 วินาที · snapshot จำนวนแถวและสนามบินปลายทาง — ขั้นอ้างอิง ไม่ตัดสิน', async () => {
    await choosePlace(gf, page, 'origin', 'กรุงเทพ', /^กรุงเทพมหานคร/, 'TC-SRCH-09 เปลี่ยนต้นทางเป็นกรุงเทพมหานคร (อ้างอิง)');
    if (!isResults(page)) await gf.click(searchBtn(page), { search: 'TC-SRCH-09 กด "ค้นหา" กรุงเทพ → HND (อ้างอิง)' });
    await waitResults(page);
    const rows = await readRows(page);
    note('ขั้น 4 อ้างอิง', `${hhmm()} · กรุงเทพ → HND ${rows.length} แถว · ปลายทาง ${[...new Set(rows.map((r) => r.to))].join(',') || '-'}${rows.length ? '' : ' → ใช้ TC-SRCH-01 E4 เป็นฐานแทน'}`);
  });

  await test.step('5. คลิกช่องปลายทาง ลบค่าเดิม พิมพ์ "Tokyo Station" รอ 3 วินาที · snapshot อ่านรายการแนะนำ · เลือกแถวนั้นถ้ามี รอ ≥ 10 วินาที · snapshot อ่านข้อความในช่องปลายทาง หัวผลลัพธ์ และข้อความบนหน้า', async () => {
    const dlg = await openPlace(gf, page, 'dest');
    await typePlace(gf, dlg, 'Tokyo Station');
    const opts = await readList(suggestList(dlg));
    const station = opts.find((o) => /Tokyo Station/i.test(o.name));
    note('ขั้น 5 รายการ', listSummary(opts));
    if (!station) {
      await gf.check('E3 "Tokyo Station" ไม่อยู่ในรายการแนะนำปลายทาง', suggestList(dlg), async () => {
        expect.soft(station, 'ไม่มีแถว Tokyo Station').toBeUndefined();
      });
      gf.na('E4 ผลลัพธ์มีแถวปลายทาง HND/NRT หรือข้อความบอกว่าปลายทางไม่ใช่สนามบิน', 'รายการไม่มีแถว Tokyo Station → N/A ตามแผน');
      await gf.press('Escape');
    } else {
      await gf.click(dlg.getByRole('option', { name: /Tokyo Station/i }).first(), isResults(page) ? { search: 'TC-SRCH-09 เลือกปลายทาง Tokyo Station' } : {});
      if (!isResults(page)) await gf.click(searchBtn(page), { search: 'TC-SRCH-09 กด "ค้นหา" ปลายทาง Tokyo Station' });
      await waitResults(page);
      const a = await ariaOf(f.dest);
      const v = await f.dest.inputValue().catch(() => '');
      const rows = await readRows(page);
      const msg = await noResText(page);
      note('ขั้น 5', `${hhmm()} · ช่องปลายทาง name "${a.name}" value "${v}" · ${rows.length} แถว · ข้อความ "${msg}"`);
      await gf.check('E3 เลือก Tokyo Station แล้วช่องปลายทางเป็น HND/NRT หรือ "โตเกียว" ระดับเมือง', f.dest, async () => {
        const shown = a.name.replace(/^ปลายทาง\s*/, '').trim();
        const ok = /\b(HND|NRT)\b/.test(a.name) || (shown === '' && /^\s*โตเกียว\s*$/.test(v));
        expect.soft(ok, `ช่องปลายทางแสดง "${shown || v}" (ชื่อ "${a.name}")`).toBe(true);
      });
      await gf.check('E4 มีแถว ≥ 1 ที่ปลายทาง ∈ {HND, NRT} หรือข้อความไม่พบผลบอกว่าปลายทางไม่ใช่สนามบิน', [rowItems(page), noResHeading(page)], async () => {
        const good = rows.filter((r) => TYO_SET.includes(r.to || ''));
        if (good.length === 0) {
          expect.soft(msg, 'ไม่พบผล: ข้อความบอกว่าปลายทางไม่ใช่สนามบิน').toMatch(NOT_AIRPORT_RE);
          expect.soft(msg, 'ไม่พบผล: ไม่แนะนำให้เปลี่ยนวันที่').not.toMatch(CHANGE_DATE_RE);
        }
        expect.soft(good.length > 0 || (NOT_AIRPORT_RE.test(msg) && !CHANGE_DATE_RE.test(msg)), `แถวปลายทาง HND/NRT = ${good.length}`).toBe(true);
      });
    }
  });
  gf.finishNA();
});

test('TC-SRCH-10 · ⚠️ ค้นหาวันนี้', {
  tag: ['@P1', '@5.1', '@known-defect'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ขั้น 2) ไม่มีแถวที่เวลาออกก่อน T_now + D-SRCH-CUTOFF หรือแถวเหล่านั้นมีป้ายเตือนว่าใกล้เวลาออก/อาจจองไม่ทัน · ถ้าไม่มีแถวใดออกภายใน T_now + 3 ชม. (ไม่มีกรณีให้ตรวจ) = ข้าม E1 (N/A) (R36)' },
    { type: 'คาดหวัง', description: 'E2: (ขั้น 3–4) มีข้อความเตือนว่าวันที่ผ่านมาแล้ว/เลือกไม่ได้ หรือข้อความในช่องขาไปเปลี่ยนกลับเป็นวันที่ที่ใช้ค้นหาจริง (R35)' },
    { type: 'คาดหวัง', description: 'E3: (ขั้น 3–4) วันที่ที่ช่องขาไปแสดง = วันที่ในหัวผลลัพธ์/aria-label ของช่องและของแถว — ไม่มีสภาพที่ช่องแสดงวันหนึ่งแต่ผลเป็นของอีกวัน (R35)' },
    { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-SRCH-10 · R35 R36 · Negative, Boundary, State · [R] · ⚠️ ข้อบกพร่องที่รู้แล้ว (คาดว่าจะล้ม E1 ถ้ามีกรณี และ E2–E3)' },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, gf }) => {
  const f = form(page);
  const T = bkkNow();
  const TD: YMD = { y: T.y, m: T.m, d: T.d };
  const YD = addDays(TD, -1);
  const yestTxt = shortTxt(YD);
  note('T', `D-TODAY ${ymdStr(TD)} · D-YEST ${ymdStr(YD)} · D-SRCH-YEST-TXT "${yestTxt}"`);
  const WARN_ROW_RE = /ใกล้เวลา|จองไม่ทัน|ออกเดินทางเร็ว|เร็ว ?ๆ ?นี้|ออกเดินทางแล้ว|ปิดรับ/;
  const PAST_RE = /ผ่านมาแล้ว|ผ่านไปแล้ว|เลือกไม่ได้|ไม่สามารถเลือก|ไม่ถูกต้อง|ไม่พร้อมใช้งาน/;
  let warnSeen = false;
  let field3 = '';
  let actual3: { d: number; m: number } | null = null;

  await test.step('1. เปิด U1 รอ ≥ 10 วินาที · ตรวจหัวผลลัพธ์ตามนิยาม U1', async () => {
    await gf.goto(getU1(), { search: 'TC-SRCH-10 เปิด U1' });
    await waitResults(page);
    await gf.check('ก่อนเริ่ม: หัวผลลัพธ์ตรงนิยาม U1', headerTargets(page), async () => { await assertHeader(page, U1_HEADER); });
  });

  await test.step('2. คลิกช่อง "ขาไป" เลือก D-TODAY กด "เสร็จ" รอ ≥ 10 วินาที · จดเวลาปัจจุบัน T_now · กด "ดูเที่ยวบินเพิ่มเติม" ถ้ามี · snapshot อ่านเวลาออกของทุกแถว และป้ายเตือนในแถว', async () => {
    await gf.click(f.date);
    const dlg = calDlg(page);
    await dlg.waitFor({ timeout: 10_000 }).catch(() => {});
    await showMonth(gf, dlg, TD, T.y);
    await gf.click(dayBtn(dlg, TD));
    await gf.click(calDone(dlg), { search: 'TC-SRCH-10 "เสร็จ" ค้นหาวันนี้' });
    await waitResults(page);
    const now = bkkNow();
    const nowMin = now.hh * 60 + now.mm;
    if (await moreBtn(page).isVisible().catch(() => false)) await gf.click(moreBtn(page));
    const rows = (await readRows(page)).filter((r) => r.mon === TD.m && r.day === TD.d && r.time);
    const mins = (r: Row) => { const [h, m] = (r.time || '0:0').split(':').map(Number); return h * 60 + m; };
    const within3h = rows.filter((r) => mins(r) <= nowMin + 180);
    const early = rows.filter((r) => mins(r) < nowMin + CUTOFF_MIN);
    const noWarn = early.filter((r) => !WARN_ROW_RE.test(`${r.label} ${r.text}`));
    note('ขั้น 2', `T_now ${String(now.hh).padStart(2, '0')}:${String(now.mm).padStart(2, '0')} · แถววันนี้ ${rows.length} · ออกภายใน 3 ชม. ${within3h.length} · ออกก่อน T_now+${CUTOFF_MIN} นาที: ${early.map((r) => `${r.from}${r.time}`).join(', ') || '-'}`);
    if (within3h.length === 0) gf.na('E1 ไม่มีแถวที่ออกก่อน T_now + 60 นาที (หรือมีป้ายเตือน)', 'ไม่มีแถวใดออกภายใน T_now + 3 ชม. (ไม่มีกรณีให้ตรวจ) → N/A ตามแผน');
    else {
      await gf.check('E1 ไม่มีแถวที่เวลาออกก่อน T_now + 60 นาที หรือแถวเหล่านั้นมีป้ายเตือน', rowItems(page), async () => {
        expect.soft(noWarn.map((r) => `${r.from || '?'} ${r.time} ${r.airline || ''}`), `แถวที่ออกก่อน T_now + ${CUTOFF_MIN} นาทีโดยไม่มีป้ายเตือน`).toEqual([]);
      });
    }
  });

  let calOpen4 = false;
  await test.step('3. คลิกช่อง "ขาไป" ลบข้อความ พิมพ์ D-SRCH-YEST-TXT กด Enter รอ ≥ 10 วินาที · snapshot อ่านข้อความในช่อง aria-label ของช่อง ข้อความเตือน (ถ้ามี) หัวผลลัพธ์ และวันที่ใน aria-label ของแถว', async () => {
    const dlg = await typeDate(gf, page, yestTxt);
    calOpen4 = await dlg.isVisible().catch(() => false);
    if (calOpen4) await gf.pause(10_000, 12_000);
    else await gf.searched('TC-SRCH-10 Enter วันที่ผ่านมาแล้ว ปฏิทินปิดและโหลดผล');
    const box = calOpen4 ? calDepart(dlg) : f.date;
    field3 = await box.inputValue().catch(() => '');
    const aria = await ariaTextOf(box);
    const doneName = calOpen4 ? (await ariaOf(calDone(dlg))).name : '';
    const msgs = await formMessages(page);
    if (PAST_RE.test(msgs)) warnSeen = true;
    const rows = await readRows(page);
    const rowDates = [...new Set(rows.filter((r) => r.day !== undefined).map((r) => `${r.day}/${r.mon}`))];
    const doneDate = parseLongDate(doneName);
    actual3 = doneDate ? { d: doneDate.d, m: doneDate.m } : rowDates.length === 1 ? { d: Number(rowDates[0].split('/')[0]), m: Number(rowDates[0].split('/')[1]) } : null;
    note('ขั้น 3', `${hhmm()} · ช่องขาไป "${field3}" · aria "${aria}" · ปุ่มเสร็จ "${doneName}" · วันที่ในแถว [${rowDates.join(', ')}] · เตือน=${warnSeen}`);
    const fd = parseShortDate(field3);
    await gf.check('E3 (ขั้น 3) วันที่ที่ช่องขาไปแสดง = วันที่ที่ใช้ค้นหาจริง (หัวผลลัพธ์/aria-label ของช่องและของแถว)', [box, calOpen4 ? calDone(dlg) : rowItems(page)], async () => {
      expect.soft(fd ? `${fd.d}/${fd.m}` : field3, 'วันที่ในช่องขาไป').toBe(actual3 ? `${actual3.d}/${actual3.m}` : '(อ่านวันที่ที่ใช้ค้นหาไม่ได้)');
      for (const rd of rowDates) expect.soft(rd, 'วันที่ใน aria-label ของแถว = ช่องขาไป').toBe(fd ? `${fd.d}/${fd.m}` : field3);
    });
  });

  await test.step('4. ถ้าปฏิทินยังเปิดอยู่ กด "เสร็จ" รอ ≥ 10 วินาที · snapshot ชุดเดียวกับขั้น 3 อีกครั้ง', async () => {
    if (calOpen4 && (await calDone(calDlg(page)).isVisible().catch(() => false))) {
      await gf.click(calDone(calDlg(page)), { search: 'TC-SRCH-10 "เสร็จ" หลังพิมพ์วันที่ผ่านมาแล้ว' });
      await waitResults(page);
      const val = await f.date.inputValue().catch(() => '');
      const aria = await ariaTextOf(f.date);
      const msgs = await formMessages(page);
      if (PAST_RE.test(msgs)) warnSeen = true;
      const rows = await readRows(page);
      const rowDates = [...new Set(rows.filter((r) => r.day !== undefined).map((r) => `${r.day}/${r.mon}`))];
      note('ขั้น 4', `${hhmm()} · ช่องขาไป "${val}" · aria "${aria}" · วันที่ในแถว [${rowDates.join(', ')}] · เตือน=${warnSeen}`);
      const fd = parseShortDate(val);
      await gf.check('E3 (ขั้น 4) วันที่ที่ช่องขาไปแสดง = วันที่ใน aria-label ของแถว', [f.date, rowItems(page)], async () => {
        for (const rd of rowDates) expect.soft(rd, 'วันที่ใน aria-label ของแถว = ช่องขาไป').toBe(fd ? `${fd.d}/${fd.m}` : val);
      });
    } else note('ขั้น 4', 'ปฏิทินปิดแล้ว ไม่ต้องกด "เสร็จ"');
    const fd3 = parseShortDate(field3);
    await gf.check('E2 มีข้อความเตือนว่าวันที่ผ่านมาแล้ว หรือช่องขาไปเปลี่ยนกลับเป็นวันที่ที่ใช้ค้นหาจริง', f.date, async () => {
      const reverted = !!fd3 && !!actual3 && fd3.d === actual3.d && fd3.m === actual3.m;
      expect.soft(warnSeen || reverted, `ช่องขาไปขั้น 3 "${field3}" · วันที่ใช้ค้นหาจริง ${actual3 ? `${actual3.d}/${actual3.m}` : '?'} · มีเตือน=${warnSeen}`).toBe(true);
    });
  });
  gf.finishNA();
});

/**
 * 5.5 เลือกเที่ยวบินและหน้า booking (TC-BKG-01 … TC-BKG-06)
 * ที่มา: plan/5.5-เลือกเที่ยวบินและหน้าbooking.md (ผลที่คาดหวังคัดจากแผนเท่านั้น)
 *
 * ข้อปฏิบัติร่วม (จากแผน)
 *  - ห้ามคลิก "ดำเนินการต่อ" / "ดูตัวเลือก" / ลิงก์นโยบายสัมภาระ / รายการในกล่องค่าธรรมเนียมสัมภาระ / Facebook / X
 *    → ก่อนคลิกปุ่มใดในหน้า booking ตรวจ href ก่อนเสมอ (safeClick) ถ้าออกนอก google.com ตาม D-BKG-EXT = ไม่คลิก
 *  - นับการค้นหา: เปิด U1 · ← / Back / รีเฟรช ที่ได้หน้าผลลัพธ์ · เปลี่ยนผู้โดยสารแล้วกด "เสร็จ"
 *    ไม่นับ: เปิดหน้า booking (นับแยกเป็นหน้า booking) · Back ที่ได้หน้า booking · กดแท็บ "ถูกที่สุด" (ยกเว้นโหลดผลใหม่)
 *  - ทุก test ใช้ context ใหม่ → TC-BKG-05 ใช้ทางสำรองตามแผน (เปิด UB ในแท็บใหม่ → 2 คน → ←) แล้วเริ่มขั้น 1
 */
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { test, expect, getU1, saveState, loadState, type GF } from '../support/gf';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const PLAN = 'plan/5.5-เลือกเที่ยวบินและหน้าbooking.md';
const E1_TEXT = 'E1 (ขั้น 1) หัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.';
const E1_LABEL = 'E1 หัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.';
const BOOKING_PATH = '/travel/flights/booking';
const SEARCH_PATH = '/travel/flights/search';
const ROW_LINK = /^ราคาเริ่มต้นที่/;
const CONTINUE = /^ดำเนินการต่อเพื่อจองกับ/;
/** สายการบินต้นทุนต่ำ (ใช้จัดลำดับก่อนในการเลือกแถว S ของ TC-BKG-02) */
const LCC = /แอร์เอเชีย|AirAsia|เวียดเจ็ท|เวียตเจ็ท|เวียดเจ๊ท|Vietjet|ไทยไลอ้อน|Lion|ZIPAIR|สกู๊ต|Scoot|Peach|พีช|เจ็ทสตาร์|Jetstar|นกแอร์|เซบู|Cebu|ฮ่องกงเอ็กซ์เพรส|HK Express|สปริง|Spring/i;
/** ชื่อสายการบิน (ไทย/อังกฤษ) → รหัส IATA ที่นำหน้าเลขเที่ยวบิน (ใช้ตรวจ codeshare TC-BKG-03 E2) */
const AIRLINE_IATA: [RegExp, string[]][] = [
  [/เจเอแอล|เจแปนแอร์ไลน์|Japan Airlines|\bJAL\b/i, ['JL']],
  [/บางกอกแอร์เวย์ส|Bangkok Airways/i, ['PG']],
  [/การบินไทย|Thai Airways/i, ['TG']],
  [/ไทยสมายล์|Thai Smile/i, ['WE', 'TG']],
  [/เอเอ็นเอ|ออล นิปปอน|All Nippon|\bANA\b/i, ['NH']],
  [/Air Japan|แอร์เจแปน/i, ['NQ']],
  [/แอร์เอเชีย|AirAsia/i, ['FD', 'XJ', 'D7', 'AK', 'Z2', 'QZ']],
  [/ไทยเวียดเจ๊ท|ไทยเวียดเจ็ท|Thai Vietjet/i, ['VZ']],
  [/เวียดเจ็ท|เวียตเจ็ท|Vietjet/i, ['VJ', 'VZ']],
  [/ไทยไลอ้อน|Thai Lion/i, ['SL']],
  [/ZIPAIR/i, ['ZG']],
  [/คาเธ่ย์|Cathay/i, ['CX']],
  [/ฮ่องกงเอ็กซ์เพรส|HK Express/i, ['UO']],
  [/ไชนาเซาเทิร์น|ไชน่าเซาเทิร์น|China Southern/i, ['CZ']],
  [/ไชน่าแอร์ไลน์|ไชนาแอร์ไลน์|China Airlines/i, ['CI']],
  [/ไชน่าอีสเทิร์น|ไชนาอีสเทิร์น|China Eastern/i, ['MU']],
  [/แอร์ไชน่า|แอร์ไชนา|Air China/i, ['CA']],
  [/อีวีเอ|EVA Air/i, ['BR']],
  [/สตาร์ลักซ์|STARLUX/i, ['JX']],
  [/สิงคโปร์แอร์ไลน์|Singapore Airlines/i, ['SQ']],
  [/สกู๊ต|Scoot/i, ['TR']],
  [/เวียดนามแอร์ไลน์|Vietnam Airlines/i, ['VN']],
  [/โคเรียนแอร์|Korean Air/i, ['KE']],
  [/เอเชียน่า|Asiana/i, ['OZ']],
  [/ฟิลิปปินส์|Philippine/i, ['PR']],
  [/มาเลเซีย|Malaysia/i, ['MH']],
  [/การูด้า|Garuda/i, ['GA']],
  [/Peach|พีช/i, ['MM']],
  [/เจ็ทสตาร์|Jetstar/i, ['GK', 'JQ', '3K']],
  [/ไห่หนาน|Hainan/i, ['HU']],
  [/เซียะเหมิน|Xiamen/i, ['MF']],
];

// ───────────────────────── ชนิดข้อมูล ─────────────────────────
type Flight = {
  dep: string; arr: string; arrDay: string; depDay: string; plus: string;
  airlines: string[]; primary: string; duration: string; stops: number | null;
  layovers: string[]; from: string; to: string; co2: number | null; price: number | null; text: string;
};
type Segment = { dep: string; arr: string; airports: string[]; flightNos: string[]; airline: string };
type Vendor = {
  name: string; price: number | null; text: string; labels: string; feeNotes: string[]; fees: number[];
  contInBlock: number; pricesInBlock: number; extra: string[];
};
type Booking = {
  url: string; H: number | null; vendors: Vendor[]; ranking: boolean; pax: number | null; adults: number | null;
  range: [number, number] | null; optionHeadings: number;
};
type Ident = { dep: string; airline: string; group?: string };
type HrefClass = 'ใน google.com' | 'ออกนอก' | 'ไม่มี href';

// ───────────────────────── ตัวช่วยทั่วไป ─────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const money = (s: string | null | undefined): number | null => {
  const m = (s || '').match(/฿\s?([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
};
const minOf = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number');
  return v.length ? Math.min(...v) : null;
};
const note = (type: string, description: string) => test.info().annotations.push({ type, description });

async function until(fn: () => Promise<boolean>, timeout = 30_000, step = 1000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn().catch(() => false)) return true;
    await sleep(step);
  }
  return false;
}

function urlParts(u: string) {
  try {
    const x = new URL(u);
    const p = x.searchParams;
    return { host: x.hostname, path: x.pathname, tfs: p.get('tfs') || '', tfu: p.get('tfu') || '', hl: p.get('hl') || '', curr: p.get('curr') || '' };
  } catch {
    return { host: '', path: '', tfs: '', tfu: '', hl: '', curr: '' };
  }
}

/** D-BKG-EXT: จัด href เป็น ใน google.com / ออกนอก / ไม่มี href */
function classifyHref(href: string | null): HrefClass {
  if (!href) return 'ไม่มี href';
  const isG = (h: string) => /(^|\.)google\.com$/i.test(h);
  try {
    const u = new URL(href);
    if (!/^https?:$/.test(u.protocol)) return u.protocol === 'javascript:' ? 'ไม่มี href' : 'ออกนอก';
    if (!isG(u.hostname)) return 'ออกนอก';
    if (u.pathname === '/url') {
      const t = u.searchParams.get('q') || u.searchParams.get('url');
      if (t) {
        try { if (!isG(new URL(t, href).hostname)) return 'ออกนอก'; } catch { return 'ออกนอก'; }
      }
    }
    return 'ใน google.com';
  } catch {
    return 'ออกนอก';
  }
}

/** อ่าน href ของ element (ตัวเอง / a ที่ครอบ / a ข้างใน) จาก DOM โดยไม่คลิก */
async function hrefOf(loc: Locator): Promise<string | null> {
  return loc.evaluate((el) => {
    const a = (el.matches('[href]') ? el : null) || el.closest('a[href]') || el.querySelector('a[href]');
    const raw = a ? a.getAttribute('href') : null;
    if (!raw) return null;
    try { return new URL(raw, location.href).href; } catch { return raw; }
  }, undefined, { timeout: 5000 }).catch(() => null);
}

async function hrefTable(loc: Locator, max = 40) {
  const n = Math.min(await loc.count(), max);
  const out: { name: string; href: string | null; cls: HrefClass }[] = [];
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    const name = ((await el.getAttribute('aria-label').catch(() => null)) || (await el.innerText().catch(() => '')) || '').trim().slice(0, 90);
    const href = await hrefOf(el);
    out.push({ name, href, cls: classifyHref(href) });
  }
  return out;
}

/** คลิกเฉพาะเมื่อ href ไม่ออกนอก google.com (อ่านจาก DOM ก่อนทุกครั้ง) */
async function safeClick(gf: GF, loc: Locator, opts: { search?: string; booking?: string } = {}) {
  const href = await hrefOf(loc);
  if (classifyHref(href) === 'ออกนอก') throw new Error(`ไม่คลิก: href ออกนอก google.com (${href})`);
  await gf.click(loc, opts);
}

/** Back ของเบราว์เซอร์ (จังหวะแบบคน) */
async function browserBack(gf: GF, page: Page, opts: { search?: string } = {}) {
  await gf.pause(800, 1500);
  await page.goBack({ waitUntil: 'commit', timeout: 30_000 }).catch(() => null);
  if (opts.search) await gf.searched(opts.search);
  else await gf.pause(10_000, 12_000);
}

// ───────────────────────── หน้าผลลัพธ์ ─────────────────────────
const rowLink = (page: Page) => page.getByRole('link', { name: ROW_LINK });
const allRows = (page: Page) => page.getByRole('listitem').filter({ has: rowLink(page) });
function groupRows(page: Page, group: 'เที่ยวบินยอดนิยม' | 'เที่ยวบินอื่นๆ') {
  return page.getByRole('heading', { name: group, exact: true }).first()
    .locator('xpath=following::*[self::ul or @role="list"][1]')
    .locator('xpath=./*[self::li or @role="listitem"]')
    .filter({ has: rowLink(page) });
}
const expandBtn = (scope: Locator) => scope.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first();
const rowBody = (row: Locator) => row.getByLabel(/^เวลาออกเดินทาง: /).first();
const backBtn = (page: Page) => page.getByRole('button', { name: 'ย้อนกลับ', exact: true });
const cheapestTab = (page: Page) => page.getByRole('tab', { name: /^ถูกที่สุด/ }).first();

async function waitRows(page: Page) {
  const ok = await until(async () => (await rowLink(page).count()) > 0, 30_000);
  if (!ok) throw new Error('ไม่พบแถวผลลัพธ์ในหน้า (หน้าผลลัพธ์ไม่โหลด)');
}

function identFromLabel(label: string): Ident {
  const dep = label.match(/ออกเดินทางจาก\s+.+?\s+เวลา\s+(\d{1,2}:\d{2})/)?.[1] || '';
  const airline = label.match(/กับ\s+(.+?)\s+(?:ดำเนินการโดย[^]*?\s+)?ออกเดินทางจาก/)?.[1]?.trim() || '';
  return { dep, airline };
}

async function rowLabels(rows: Locator): Promise<string[]> {
  return rows.evaluateAll((els) => els.map((e) => e.querySelector('[aria-label^="ราคาเริ่มต้นที่"]')?.getAttribute('aria-label') || ''));
}

/** หาแถวที่เวลาออก + ชื่อสายการบินตรงกับตัวตนที่จดไว้ */
async function findRow(rows: Locator, id: Ident): Promise<{ row: Locator; index: number } | null> {
  const labels = await rowLabels(rows).catch(() => [] as string[]);
  for (let i = 0; i < labels.length; i++) {
    const x = identFromLabel(labels[i]);
    if (x.dep === id.dep && x.airline && (x.airline === id.airline || x.airline.includes(id.airline) || id.airline.includes(x.airline))) {
      return { row: rows.nth(i), index: i };
    }
  }
  return null;
}

/** อ่านค่าของเที่ยวบินจากแถวผลลัพธ์ / ส่วน "เที่ยวบินที่เลือก" ในหน้า booking (aria-label + ข้อความบนจอ) */
async function readFlight(loc: Locator): Promise<Flight> {
  const raw = await loc.evaluate((root) => {
    const el = root as HTMLElement;
    const nodes = [el, ...Array.from(el.querySelectorAll<HTMLElement>('[aria-label]'))];
    const labels: string[] = [];
    for (const e of nodes) { const a = e.getAttribute('aria-label'); if (a) labels.push(a.trim()); }
    let airlineText = '';
    for (const e of nodes) {
      const a = e.getAttribute('aria-label') || '';
      if (/ออกเดินทางจาก/.test(a) && e.querySelector('[aria-label^="เวลาออกเดินทาง:"]')) {
        // หน้าผลลัพธ์: ชื่อสายการบินอยู่ถัดจาก span นี้ทันที · หน้า booking: span ถูกห่อด้วย div ที่มีข้อความเดียวกัน
        // → ไต่ขึ้นตัวห่อ (ข้อความเท่ากัน ไม่มีพี่น้องถัดไป) แล้วอ่านพี่น้องถัดไปของตัวห่อ
        let x: HTMLElement = e;
        while (!x.nextElementSibling && x.parentElement && x.parentElement !== el
          && (x.parentElement.innerText || '').trim() === (x.innerText || '').trim()) x = x.parentElement;
        const sib = x.nextElementSibling as HTMLElement | null;
        if (sib && sib.innerText.trim()) { airlineText = sib.innerText.trim(); break; }
      }
    }
    if (!airlineText) {
      const t = el.querySelector('[aria-label^="เวลาออกเดินทาง:"]');
      const sib = t?.parentElement?.nextElementSibling as HTMLElement | null | undefined;
      if (sib) airlineText = sib.innerText.trim();
    }
    return { text: el.innerText || '', labels, airlineText };
  });
  const L = raw.labels.join('\n');
  const first = (re: RegExp, s = L) => s.match(re)?.[1]?.trim() ?? '';
  const link = raw.labels.find((a) => ROW_LINK.test(a)) || '';
  const linkAirline = identFromLabel(link).airline;
  const airlines = raw.airlineText.split(/[·\n]/).map((s) => s.trim()).filter((s) => s && !/\d/.test(s));
  const durLabel = raw.labels.find((a) => /^ระยะเวลารวม/.test(a));
  const stopLabel = raw.labels.find((a) => /^เที่ยวบินตรง$|^เที่ยวบินแบบหยุดพัก/.test(a)) || '';
  let stops: number | null = null;
  if (/^เที่ยวบินตรง$/.test(stopLabel)) stops = 0;
  else if (/หยุดพัก\s*(\d+)\s*ครั้ง/.test(stopLabel)) stops = Number(stopLabel.match(/หยุดพัก\s*(\d+)/)![1]);
  else if (/เที่ยวบินตรงกับ/.test(link)) stops = 0;
  else if (/แวะพัก\s*(\d+)\s*ครั้ง/.test(link)) stops = Number(link.match(/แวะพัก\s*(\d+)\s*ครั้ง/)![1]);
  const layovers = Array.from(new Set(raw.labels.filter((a) => /^การแวะพัก \(ครั้งที่/.test(a))
    .map((a) => a.match(/ที่สนามบิน\s+(.+?)\s+ใน/)?.[1] || a)));
  const ft = raw.text.match(/\b([A-Z]{3})\s*[–-]\s*([A-Z]{3})\b/);
  const co2 = raw.text.match(/CO2e\s*([\d,]+)\s*กก/);
  const priceLink = link.match(/ราคาเริ่มต้นที่\s+(\d+)/);
  return {
    dep: first(/เวลาออกเดินทาง:\s*(\d{1,2}:\d{2})/) || first(/ออกเดินทางจาก\s+.+?\s+เวลา\s+(\d{1,2}:\d{2})/),
    arr: first(/เวลาถึง:\s*(\d{1,2}:\d{2})/) || first(/เดินทางถึง\s+.+?\s+เวลา\s+(\d{1,2}:\d{2})/),
    depDay: first(/ออกเดินทางจาก\s+.+?\s+เวลา\s+\d{1,2}:\d{2}\s+ในวันที่\s+(\S+,\s*\S+\s+\d+)/),
    arrDay: first(/เดินทางถึง\s+.+?\s+เวลา\s+\d{1,2}:\d{2}\s+ในวันที่\s+(\S+,\s*\S+\s+\d+)/),
    plus: raw.text.match(/\d{1,2}:\d{2}\s*\+(\d)/)?.[1] ? `+${raw.text.match(/\d{1,2}:\d{2}\s*\+(\d)/)![1]}` : '',
    airlines: airlines.length ? airlines : linkAirline ? [linkAirline] : [],
    primary: linkAirline || airlines[0] || '',
    duration: durLabel ? durLabel.replace(/^ระยะเวลารวม\s*/, '').trim() : first(/ระยะเวลารวม\s+(.+?)(?:\s+การแวะพัก|\s+เลือกเที่ยวบิน|$)/m),
    stops,
    layovers,
    from: ft?.[1] || '',
    to: ft?.[2] || '',
    co2: co2 ? Number(co2[1].replace(/,/g, '')) : null,
    price: money(raw.text) ?? (priceLink ? Number(priceLink[1]) : null),
    text: raw.text,
  };
}

/**
 * อ่านทุกช่วงบินจากรายละเอียด ˅ ที่ขยายแล้ว (เวลา สนามบิน เลขเที่ยวบิน สายการบิน)
 * โครงสร้างจริง (ตรวจจาก DOM แถวผลลัพธ์ + หน้า booking):
 *  - aria-label "เวลาออกเดินทาง:"/"เวลาถึง:" ซ้อนกัน 2 ชั้น (span ครอบ span role=text ชื่อเดียวกัน) + มีชุดที่ซ่อนอยู่ → ใช้เฉพาะตัวนอกสุดที่มองเห็น
 *  - เลขเที่ยวบินแยก span "VJ" / "804" และ innerText ต่อชิดกัน ("Airbus A321VJ 804") ไม่มี "·" → อ่านทีละ text node แล้วต่อด้วยช่องว่าง
 *  - ชื่อสายการบินของช่วง = ข้อความก่อนชั้นโดยสาร ("ชั้น…")
 */
async function readSegments(loc: Locator): Promise<Segment[]> {
  await loc.getByText(/เวลาเดินทาง:/).first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  return loc.evaluate((root) => {
    const vis = (e: Element) => (typeof (e as any).checkVisibility === 'function' ? (e as any).checkVisibility() : e.getClientRects().length > 0);
    const DEP = '[aria-label^="เวลาออกเดินทาง:"]';
    const ARR = '[aria-label^="เวลาถึง:"]';
    const outer = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel)).filter((e) => {
      if (!vis(e)) return false;
      const up = e.parentElement ? e.parentElement.closest(sel) : null;
      return !(up && root.contains(up));
    });
    const deps = outer(DEP);
    const arrs = outer(ARR);
    const depsIn = (b: Element) => deps.filter((d) => b.contains(d)).length;
    const tokens = (b: Element) => {
      const toks: string[] = [];
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = w.nextNode())) {
        const p = n.parentElement;
        const t = (n.nodeValue || '').replace(/[\s​-‍⁠﻿]+/g, ' ').trim();
        if (!t || !p || !vis(p) || /^[·•]$/.test(t)) continue;
        toks.push(t);
      }
      return toks;
    };
    const out: { dep: string; arr: string; airports: string[]; flightNos: string[]; airline: string }[] = [];
    for (const d of deps) {
      // กล่องของช่วงบิน = บรรพบุรุษสูงสุด (ไม่เกิน root) ที่มีเวลาออกที่มองเห็นเพียง 1 ตัว
      let b: HTMLElement = d;
      while (b !== root && b.parentElement && depsIn(b.parentElement) === 1) b = b.parentElement;
      const toks = tokens(b);
      const joined = ` ${toks.join(' ')} `;
      const arrEl = arrs.find((a) => b.contains(a));
      const cls = toks.findIndex((t) => /^ชั้น/.test(t));
      out.push({
        dep: (d.getAttribute('aria-label') || '').match(/(\d{1,2}:\d{2})/)?.[1] || '',
        arr: (arrEl?.getAttribute('aria-label') || '').match(/(\d{1,2}:\d{2})/)?.[1] || '',
        airports: Array.from(joined.matchAll(/\(\s*([A-Z]{3})\s*\)/g)).map((m) => m[1]),
        flightNos: Array.from(new Set(Array.from(joined.matchAll(/\s((?:[A-Z]{2}|[A-Z]\d|\d[A-Z]))\s+(\d{1,4})(?=\s)/g)).map((m) => `${m[1]} ${m[2]}`))),
        airline: cls > 0 ? toks[cls - 1] : '',
      });
    }
    return out;
  });
}

/** E1 หัวผลลัพธ์ของหน้าผลลัพธ์ */
async function checkResultsHeader(gf: GF, page: Page, label: string, pax = 1) {
  const trip = page.getByRole('combobox', { name: /ประเภทตั๋ว/ }).first();
  const paxB = page.getByRole('button', { name: /^ผู้โดยสาร \d+ คน/ }).first();
  const cls = page.getByRole('combobox', { name: /ชั้นโดยสาร/ }).first();
  const from = page.getByRole('combobox', { name: 'ต้นทาง', exact: true }).first();
  const to = page.getByRole('combobox', { name: 'ปลายทาง', exact: true }).first();
  const date = page.getByRole('textbox', { name: 'ขาไป', exact: true }).first();
  const val = async (l: Locator) => (await l.inputValue({ timeout: 5000 }).catch(async () => l.innerText({ timeout: 5000 }).catch(() => ''))).trim();
  await gf.check(label, [trip, paxB, cls, from, to, date], async () => {
    expect.soft(await trip.getAttribute('aria-label').catch(() => '') + ' ' + (await trip.innerText().catch(() => '')), 'ประเภทตั๋ว').toMatch(/เที่ยวเดียว/);
    expect.soft(await readPax(page), 'ปุ่มผู้โดยสาร').toBe(pax);
    expect.soft(await cls.getAttribute('aria-label').catch(() => '') + ' ' + (await cls.innerText().catch(() => '')), 'ชั้นโดยสาร').toMatch(/ชั้นประหยัด/);
    expect.soft(await val(from), 'ต้นทาง').toMatch(/กรุงเทพมหานคร/);
    expect.soft(await val(to), 'ปลายทาง').toMatch(/โตเกียว/);
    expect.soft(await val(date), 'วันที่ขาไป').toMatch(/อังคาร 15 ธ\.ค\./);
  });
}

// ───────────────────────── หน้า booking ─────────────────────────
const bookingFlight = (page: Page) =>
  page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }) }).first();
const paxButton = (page: Page) => page.getByRole('button', { name: /^ผู้โดยสาร \d+ คน/ }).first();
const lowestPrice = (page: Page) => page.getByText('ราคารวมที่ต่ำที่สุด', { exact: true }).first().locator('xpath=..');
const shareBtn = (page: Page) => page.getByRole('button', { name: 'แชร์เที่ยวบินนี้' }).first();

async function readPax(page: Page): Promise<number | null> {
  const b = paxButton(page);
  const s = ((await b.getAttribute('aria-label', { timeout: 5000 }).catch(() => null)) || (await b.innerText({ timeout: 5000 }).catch(() => '')) || '');
  const m = s.match(/ผู้โดยสาร\s*(\d+)\s*คน/);
  return m ? Number(m[1]) : null;
}
async function readAdults(page: Page): Promise<number | null> {
  const s = await page.getByText(/ผู้ใหญ่\s*\d+\s*ท่าน/).first().innerText({ timeout: 5000 }).catch(() => '');
  const m = s.match(/ผู้ใหญ่\s*(\d+)\s*ท่าน/);
  return m ? Number(m[1]) : null;
}

async function waitBooking(page: Page) {
  await page.waitForURL((u) => u.pathname.startsWith(BOOKING_PATH), { timeout: 30_000 }).catch(() => {});
  await until(async () => (await page.getByRole('button', { name: CONTINUE }).count()) > 0, 30_000);
}

async function readBooking(page: Page): Promise<Booking> {
  const hTxt = await lowestPrice(page).innerText({ timeout: 10_000 }).catch(() => '');
  const btns = page.getByRole('button', { name: CONTINUE });
  const n = await btns.count();
  const vendors: Vendor[] = [];
  for (let i = 0; i < n; i++) {
    const b = btns.nth(i);
    const label = (await b.getAttribute('aria-label').catch(() => null)) || '';
    const block = b.locator('xpath=ancestor::*[contains(normalize-space(.), "จองกับ")][1]');
    const text = (await block.innerText({ timeout: 5000 }).catch(() => '')) || '';
    const blockLabels = await block.evaluate((el) =>
      Array.from(el.querySelectorAll('[aria-label]')).map((e) => e.getAttribute('aria-label') || '').join(' | '), undefined, { timeout: 5000 }).catch(() => '');
    const contInBlock = await block.getByRole('button', { name: /^ดำเนินการต่อ/ }).count().catch(() => 0);
    const m = label.match(/^ดำเนินการต่อเพื่อจองกับ\s*(?:สายการบิน\s+)?(.+?)\s+ในราคา\s+([\d,]+)\s*บาทไทย/);
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    const feeNotes = lines.filter((l) => /ค่าธรรมเนียม/.test(l));
    const priceLines = lines.filter((l) => /฿\s?[\d,]+/.test(l) && !/ค่าธรรมเนียม|มูลค่า/.test(l));
    const nameFromText = (lines.find((l) => /^จองกับ/.test(l)) || '').replace(/^จองกับ\s*/, '').trim();
    vendors.push({
      name: m ? m[1].trim() : nameFromText,
      price: m ? Number(m[2].replace(/,/g, '')) : money(priceLines[0]),
      text,
      labels: blockLabels,
      feeNotes,
      fees: feeNotes.map((l) => money(l)).filter((x): x is number => x !== null),
      contInBlock,
      pricesInBlock: priceLines.length,
      extra: lines.filter((l) => !/^จองกับ|^สายการบิน$|ค่าธรรมเนียม|^฿\s?[\d,]+$|^ดำเนินการต่อ$|^ดูตัวเลือก$/.test(l)),
    });
  }
  const rangeTxt = await page.getByText(/ระหว่าง\s*฿\s?[\d,]+\s*[–-]\s*฿?\s?[\d,]+/).first().innerText({ timeout: 3000 }).catch(() => '');
  const rm = rangeTxt.match(/ระหว่าง\s*฿\s?([\d,]+)\s*[–-]\s*฿?\s?([\d,]+)/);
  const ranking = (await page.getByText('วิธีจัดอันดับตัวเลือก').count()) > 0
    || (await page.getByRole('button', { name: 'ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกการจอง' }).count()) > 0;
  return {
    url: page.url(),
    H: money(hTxt),
    vendors,
    ranking,
    pax: await readPax(page),
    adults: await readAdults(page),
    range: rm ? [Number(rm[1].replace(/,/g, '')), Number(rm[2].replace(/,/g, ''))] : null,
    optionHeadings: await page.getByRole('heading', { name: 'ตัวเลือกการจอง', exact: true }).count(),
  };
}

/** บันทึกทุกหน้า booking ที่เปิด (ข้อปฏิบัติร่วม) + อัปเดต D-BKG-MULTI + ข้อสังเกต F53 */
function recordBooking(where: string, id: Ident, bk: Booking) {
  const fees = bk.vendors.filter((v) => v.feeNotes.length).map((v) => `${v.name}: ${v.feeNotes.join(' / ')}`);
  const fare = bk.vendors.filter((v) => v.extra.length).map((v) => `${v.name}: ${v.extra.join(' / ')}`);
  note('บันทึก booking', `${where} · แถว ${id.dep} ${id.airline} (${id.group || '-'}) · N=${bk.vendors.length} · `
    + `ผู้ขาย: ${bk.vendors.map((v) => `${v.name} ฿${v.price}`).join(', ')} · ⓘ วิธีจัดอันดับตัวเลือก=${bk.ranking ? 'มี' : 'ไม่มี'} · `
    + `หมายเหตุค่าธรรมเนียม: ${fees.join('; ') || 'ไม่มี'} · URL ${bk.url}`);
  note('ข้อสังเกต F53', `${where}: ชื่อประเภทค่าโดยสารในแถวผู้ขาย = ${fare.length ? fare.join('; ') : 'ไม่พบ'} (อ่านจากข้อความบนจอ ไม่กด "ดูตัวเลือก")`);
  if (bk.vendors.length >= 2) {
    const list = loadState<Ident[]>('D-BKG-MULTI') || [];
    if (!list.some((x) => x.dep === id.dep && x.airline === id.airline)) list.push(id);
    saveState('D-BKG-MULTI', list);
  }
}

function expectFlightReadable(f: Flight, who: string) {
  expect.soft(f.dep, `${who}: อ่านเวลาออกได้`).toMatch(/^\d{1,2}:\d{2}$/);
  expect.soft(f.airlines.length, `${who}: อ่านชื่อสายการบินได้`).toBeGreaterThan(0);
}
function expectSameFlight(a: Flight, e: Flight, who: string) {
  expectFlightReadable(e, `${who} (ค่าอ้างอิง)`);
  expect.soft(a.dep, `${who}: เวลาออก`).toBe(e.dep);
  expect.soft(a.arr, `${who}: เวลาถึง`).toBe(e.arr);
  expect.soft(a.plus, `${who}: +วัน ของเวลาถึง`).toBe(e.plus);
  expect.soft(a.airlines, `${who}: ชื่อสายการบิน`).toEqual(e.airlines);
  expect.soft(a.duration, `${who}: ระยะเวลา`).toBe(e.duration);
  expect.soft(a.stops, `${who}: จำนวนแวะ`).toBe(e.stops);
  expect.soft(a.layovers, `${who}: สนามบินที่แวะ`).toEqual(e.layovers);
  expect.soft(`${a.from}–${a.to}`, `${who}: สนามบินต้นทาง/ปลายทาง`).toBe(`${e.from}–${e.to}`);
  expect.soft(a.co2, `${who}: CO2e`).toBe(e.co2);
}
function expectSameSegments(a: Segment[], e: Segment[], who: string) {
  expect.soft(e.length, `${who}: อ่านช่วงบินจาก ˅ ได้`).toBeGreaterThan(0);
  expect.soft(a.map((s) => s.flightNos.join('+')), `${who}: เลขเที่ยวบินแต่ละช่วง`).toEqual(e.map((s) => s.flightNos.join('+')));
  expect.soft(a.map((s) => `${s.dep}→${s.arr}`), `${who}: เวลาแต่ละช่วง`).toEqual(e.map((s) => `${s.dep}→${s.arr}`));
}

/** หัวสรุปหน้า booking: เที่ยวเดียว · ผู้ใหญ่ N · 15 ธ.ค. · กรุงเทพ → โตเกียว (หรือสนามบินคู่เดียวกับแถว) */
async function expectBookingHeader(page: Page, pax: number, f: Flight, row?: Flight) {
  const main = page.getByRole('main');
  expect.soft(await main.getByText('เที่ยวเดียว').count(), 'หัวสรุป: เที่ยวเดียว').toBeGreaterThan(0);
  expect.soft(await readPax(page), 'หัวสรุป: ปุ่มผู้โดยสาร').toBe(pax);
  expect.soft(await readAdults(page), 'หัวสรุป: ข้อความผู้ใหญ่ N ท่าน').toBe(pax);
  expect.soft(f.text, 'หัวสรุป: วันที่ 15 ธ.ค.').toMatch(/15 ธ\.ค\./);
  const route = (await main.getByLabel(/ไปยัง/).first().getAttribute('aria-label').catch(() => '')) || '';
  const sameAirports = !!row && !!f.from && f.from === row.from && f.to === row.to;
  expect.soft(/กรุงเทพ.*ไปยัง.*โตเกียว/.test(route) || sameAirports, `หัวสรุป: เส้นทาง "${route}" / ${f.from}–${f.to}`).toBe(true);
}

function codesFor(name: string): string[] {
  const out = new Set<string>();
  for (const [re, codes] of AIRLINE_IATA) if (re.test(name)) codes.forEach((c) => out.add(c));
  return [...out];
}
const prefixOf = (fn: string) => fn.split(/\s/)[0];
const sameName = (a: string, b: string) => !!a && !!b && (a === b || a.includes(b) || b.includes(a));

function normTimes(text: string): string[] {
  return Array.from(text.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/g)).map((m) => {
    let h = Number(m[1]);
    const ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m[2]}`;
  });
}

async function inViewport(loc: Locator): Promise<boolean> {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
  }, undefined, { timeout: 5000 }).catch(() => false);
}

async function tabCount(context: BrowserContext) { return context.pages().length; }

// ═════════════════════════════════════════ TESTS ═════════════════════════════════════════

test('TC-BKG-01 · เลือกด้วยปุ่ม "เลือกเที่ยวบิน" + คัดลอก UB + เปิดซ้ำในแท็บใหม่', {
  tag: ['@P1', '@5.5'],
  annotation: [
    { type: 'คาดหวัง', description: E1_TEXT },
    { type: 'คาดหวัง', description: 'E2 (ขั้น 4) จำนวนแท็บยังเท่าเดิม (1) · URL host = www.google.com · path ขึ้นต้น `/travel/flights/booking` · มีทั้งพารามิเตอร์ `tfs=` และ `tfu=`' },
    { type: 'คาดหวัง', description: 'E3 (ขั้น 6) หัวสรุป = เที่ยวเดียว · ผู้ใหญ่ 1 · 15 ธ.ค. · เส้นทางกรุงเทพ → โตเกียว (หรือสนามบินคู่เดียวกับแถว A) · เวลาออก เวลาถึง (+1) ชื่อสายการบิน ระยะเวลา จำนวนแวะ สนามบิน CO2e ในหน้า booking = ค่าที่จดในขั้น 2 ทุกค่า · เลขเที่ยวบินและเวลาแต่ละช่วงใน ˅ ของหน้า booking = ค่าที่จดในขั้น 3' },
    { type: 'คาดหวัง', description: 'E4 (ขั้น 6) H = Pa และ H = ราคาต่ำสุดในชุด S0' },
    { type: 'คาดหวัง', description: 'E5 (ขั้น 7) แท็บใหม่ได้เที่ยวบินเดิม: เวลา สายการบิน เลขเที่ยวบิน วันที่ เส้นทาง และ "ผู้ใหญ่ 1" ตรงกับ E3 ทุกค่า' },
    { type: 'คาดหวัง', description: 'E6 (ขั้น 7) H\' = H และชุดชื่อผู้ขาย S1 = S0 [O-ยังไม่ยืนยัน] (เกณฑ์: เปิดภายใน 5 นาที · ถ้าราคาต่างแต่ H\' = ราคาต่ำสุดในชุด S1 ให้จดเป็น "ราคาสดเปลี่ยน" และจัดประเภทตามหัวข้อ 6.4 ไม่ใช่เว็บผิด)' },
    { type: 'คาดหวัง', description: 'E7 (ขั้น 8) แท็บใหม่ไม่ถูกปิด (ยังมี 2 แท็บ) · URL path = `/travel/flights/search` มี `tfs=` · หัวผลลัพธ์ = E1 · มีแถวที่เวลาออก + ชื่อสายการบินตรงกับแถว A' },
    { type: 'ที่มา', description: `${PLAN} · TC-BKG-01 · R104 (ปุ่ม) R105 R106 R113 R114 · Happy path · Invariant/Metamorphic · State · [O-ยังไม่ยืนยัน] (เฉพาะ E6)` },
    { type: 'งบค้นหา', description: '2' },
  ],
}, async ({ page, context, gf }) => {
  // ค่าที่ส่งต่อใน 5.5 เริ่มใหม่ทุกครั้งที่รันชุด (กันค่าค้างจากรอบก่อน)
  saveState('UB', '');
  saveState('D-BKG-MULTI', []);
  saveState('BKG-FEES', []);

  let tabs0 = 0;
  const rowA = groupRows(page, 'เที่ยวบินยอดนิยม').first();
  let fA!: Flight;
  let segA: Segment[] = [];
  let idA!: Ident;
  let UB = '';
  let t0 = 0;
  let fB!: Flight;
  let segB: Segment[] = [];
  let bk0!: Booking;
  let p2!: Page;

  await test.step('1. เปิด U1 ตรง รอ ≥ 10 วินาที อ่านหัวผลลัพธ์และนับจำนวนแท็บ', async () => {
    await gf.goto(getU1(), { search: 'เปิด U1' });
    await waitRows(page);
    tabs0 = await tabCount(context);
    note('จำนวนแท็บ', `ขั้น 1: ${tabs0}`);
    await checkResultsHeader(gf, page, E1_LABEL, 1);
  });

  await test.step('2. อ่าน aria-label ของแถว A (แถวแรกของ "เที่ยวบินยอดนิยม") จดเวลาออก เวลาถึง ชื่อสายการบิน ระยะเวลา แวะ สนามบิน CO2e ราคา (= Pa)', async () => {
    fA = await readFlight(rowA);
    idA = { dep: fA.dep, airline: fA.primary, group: 'เที่ยวบินยอดนิยม' };
    note('แถว A', `${fA.dep}–${fA.arr}${fA.plus} · ${fA.airlines.join(' · ')} · ${fA.duration} · แวะ ${fA.stops} ${fA.layovers.join(', ')} · ${fA.from}–${fA.to} · CO2e ${fA.co2} · Pa ฿${fA.price}`);
    saveState('BKG-01-rowA', { ...idA, price: fA.price });
  });

  const selectBtn = rowA.getByRole('button', { name: 'เลือกเที่ยวบิน', exact: true });
  await test.step('3. กด ˅ ท้ายแถว A จดของทุกช่วงบิน: เวลาออก/ถึง สนามบิน เลขเที่ยวบิน สายการบิน · ยืนยันว่ามีปุ่ม "เลือกเที่ยวบิน"', async () => {
    await gf.click(expandBtn(rowA));
    segA = await readSegments(rowA);
    note('ช่วงบินแถว A', JSON.stringify(segA));
    await expect(selectBtn, 'ต้องมีปุ่ม "เลือกเที่ยวบิน" ในแถวที่ขยาย (เงื่อนไขของขั้นตอน)').toBeVisible();
  });

  await test.step('4. กด "เลือกเที่ยวบิน" รอโหลด อ่านจำนวนแท็บและ URL', async () => {
    await gf.click(selectBtn, { booking: 'กด "เลือกเที่ยวบิน" แถว A' });
    await waitBooking(page);
    const u = urlParts(page.url());
    await gf.check('E2 แท็บเท่าเดิม (1) · URL www.google.com/travel/flights/booking มี tfs= และ tfu=', page.getByRole('heading', { name: 'สรุปแผนการเดินทาง' }), async () => {
      expect.soft(await tabCount(context), 'จำนวนแท็บ').toBe(tabs0);
      expect.soft(await tabCount(context), 'จำนวนแท็บ = 1').toBe(1);
      expect.soft(u.host, 'URL host').toBe('www.google.com');
      expect.soft(u.path.startsWith(BOOKING_PATH), `path ขึ้นต้น ${BOOKING_PATH} (ได้ ${u.path})`).toBe(true);
      expect.soft(u.tfs, 'มี tfs=').not.toBe('');
      expect.soft(u.tfu, 'มี tfu=').not.toBe('');
    });
  });

  await test.step('5. คัดลอก URL หน้า booking จากแถบ URL เก็บเป็น UB และจดเวลา t0', async () => {
    UB = page.url();
    t0 = Date.now();
    saveState('UB', UB);
    note('UB', `${UB} · t0 = ${new Date(t0).toISOString()}`);
  });

  await test.step('6. อ่านหน้า booking: หัวสรุป · เที่ยวบินที่เลือก · กด ˅ อ่านเลขเที่ยวบิน · "ราคารวมที่ต่ำที่สุด" (= H) · ผู้ขายทุกเจ้า (= S0, N)', async () => {
    const summary = bookingFlight(page);
    fB = await readFlight(summary);
    await safeClick(gf, expandBtn(summary));
    segB = await readSegments(summary);
    bk0 = await readBooking(page);
    recordBooking('TC-BKG-01', idA, bk0);
    const fees = bk0.vendors.filter((v) => v.feeNotes.length)
      .map((v) => ({ vendor: v.name, notes: v.feeNotes, fees: v.fees, price: v.price, from: 'TC-BKG-01' }));
    saveState('BKG-FEES', fees);

    await gf.check('E3 หัวสรุป + เที่ยวบินในหน้า booking = แถว A (ขั้น 2) · เลขเที่ยวบิน/เวลาใน ˅ = ขั้น 3',
      [page.getByRole('main').getByLabel(/ไปยัง/).first(), paxButton(page), summary], async () => {
        await expectBookingHeader(page, 1, fB, fA);
        expectSameFlight(fB, fA, 'booking vs แถว A');
        expectSameSegments(segB, segA, 'booking ˅ vs แถว A ˅');
      });
    await gf.check('E4 H = Pa และ H = ราคาต่ำสุดในชุด S0', [lowestPrice(page), page.getByRole('button', { name: CONTINUE })], async () => {
      expect.soft(bk0.H, 'H (ราคารวมที่ต่ำที่สุด)').not.toBeNull();
      expect.soft(bk0.H, 'H = Pa').toBe(fA.price);
      expect.soft(bk0.H, 'H = ราคาต่ำสุดใน S0').toBe(minOf(bk0.vendors.map((v) => v.price)));
    });
  });

  let fB2!: Flight;
  let segB2: Segment[] = [];
  let bk1!: Booking;
  await test.step('7. ภายใน 5 นาทีหลัง t0 (D-BKG-T5): เปิดแท็บใหม่ วาง UB รอโหลด อ่านค่าชุดเดียวกับขั้น 6 (H\', S1)', async () => {
    p2 = await context.newPage();
    gf.use(p2);
    await gf.pause(5000, 8000); // คนเปิดแท็บใหม่แล้ววาง URL
    let tOpen = Date.now();
    await gf.goto(UB, { booking: 'เปิด UB ในแท็บใหม่' });
    await waitBooking(p2);
    const summary2 = bookingFlight(p2);
    const ready = async () => (await p2.getByRole('button', { name: CONTINUE }).count()) > 0 && (await summary2.count()) > 0;
    if (!(await ready())) {
      // รอบก่อนแท็บใหม่ขึ้น "อ๊ะ มีบางอย่างผิดพลาด" + ปุ่ม "โหลดซ้ำ" → ทำแบบคน: กด "โหลดซ้ำ" 1 ครั้ง (หน้า booking ที่ 3 ของ test ≤ 3 ตามแผน)
      const oops = (await p2.getByText('อ๊ะ มีบางอย่างผิดพลาด').count()) > 0;
      note('แท็บใหม่โหลดไม่สำเร็จ (ครั้งแรก)', `${oops ? 'ขึ้น "อ๊ะ มีบางอย่างผิดพลาด"' : 'ไม่พบเที่ยวบินที่เลือก/ปุ่ม "ดำเนินการต่อ"'} · URL ${p2.url()} → โหลดซ้ำ 1 ครั้ง`);
      await gf.pause(8000, 12_000);
      const reload = p2.getByRole('button', { name: 'โหลดซ้ำ', exact: true }).first();
      tOpen = Date.now();
      if (await reload.count()) await safeClick(gf, reload, { booking: 'กด "โหลดซ้ำ" หน้า UB ในแท็บใหม่ (ครั้งแรกโหลดไม่สำเร็จ)' });
      else await gf.goto(UB, { booking: 'เปิด UB ในแท็บใหม่อีกครั้ง (ครั้งแรกโหลดไม่สำเร็จ)' });
      await waitBooking(p2);
    }
    const loaded = await ready();
    note('D-BKG-T5', `คัดลอก ${new Date(t0).toISOString()} · เปิด ${new Date(tOpen).toISOString()} · ห่าง ${Math.round((tOpen - t0) / 1000)} วินาที`);
    if (!loaded) {
      const why = `หน้า booking ในแท็บใหม่ไม่แสดงเที่ยวบิน/ผู้ขาย หลังเปิด UB + โหลดซ้ำ 1 ครั้ง (URL ${p2.url()})`;
      await gf.check('E5 แท็บใหม่ได้เที่ยวบินเดิม: เวลา สายการบิน เลขเที่ยวบิน วันที่ เส้นทาง "ผู้ใหญ่ 1" = E3', null, async () => {
        expect.soft(loaded, why).toBe(true);
      });
      await gf.check('E6 H\' = H และชุดชื่อผู้ขาย S1 = S0 [O-ยังไม่ยืนยัน] (เปิดภายใน 5 นาที)', null, async () => {
        expect.soft(tOpen - t0, 'เปิด UB ภายใน 5 นาทีหลังคัดลอก (D-BKG-T5)').toBeLessThanOrEqual(5 * 60_000);
        expect.soft(loaded, why).toBe(true);
      });
      return;
    }
    fB2 = await readFlight(summary2);
    await safeClick(gf, expandBtn(summary2));
    segB2 = await readSegments(summary2);
    bk1 = await readBooking(p2);
    recordBooking('TC-BKG-01 (แท็บใหม่ UB)', idA, bk1);

    await gf.check('E5 แท็บใหม่ได้เที่ยวบินเดิม: เวลา สายการบิน เลขเที่ยวบิน วันที่ เส้นทาง "ผู้ใหญ่ 1" = E3',
      [p2.getByRole('main').getByLabel(/ไปยัง/).first(), paxButton(p2), summary2], async () => {
        await expectBookingHeader(p2, 1, fB2, fA);
        expectFlightReadable(fB2, 'แท็บใหม่');
        expect.soft(fB2.dep, 'เวลาออก').toBe(fB.dep);
        expect.soft(fB2.arr, 'เวลาถึง').toBe(fB.arr);
        expect.soft(fB2.plus, '+วัน').toBe(fB.plus);
        expect.soft(fB2.airlines, 'สายการบิน').toEqual(fB.airlines);
        expect.soft(fB2.depDay, 'วันที่').toBe(fB.depDay);
        expect.soft(`${fB2.from}–${fB2.to}`, 'เส้นทาง (สนามบิน)').toBe(`${fB.from}–${fB.to}`);
        expectSameSegments(segB2, segB, 'แท็บใหม่ ˅ vs แท็บแรก ˅');
      });

    await gf.check('E6 H\' = H และชุดชื่อผู้ขาย S1 = S0 [O-ยังไม่ยืนยัน] (เปิดภายใน 5 นาที)', [lowestPrice(p2), p2.getByRole('button', { name: CONTINUE })], async () => {
      expect.soft(tOpen - t0, 'เปิด UB ภายใน 5 นาทีหลังคัดลอก (D-BKG-T5)').toBeLessThanOrEqual(5 * 60_000);
      const s0 = bk0.vendors.map((v) => v.name).sort();
      const s1 = bk1.vendors.map((v) => v.name).sort();
      expect.soft(s1, 'ชุดชื่อผู้ขาย S1 = S0').toEqual(s0);
      const minS1 = minOf(bk1.vendors.map((v) => v.price));
      if (bk1.H !== bk0.H && bk1.H !== null && bk1.H === minS1) {
        note('ราคาสดเปลี่ยน', `H = ฿${bk0.H} → H' = ฿${bk1.H} (H' = ราคาต่ำสุดใน S1) · จัดประเภทตามหัวข้อ 6.4 ไม่ใช่เว็บผิด`);
      } else {
        expect.soft(bk1.H, 'H\' = H').toBe(bk0.H);
      }
    });
  });

  await test.step('8. ในแท็บใหม่ กดปุ่ม ← มุมซ้ายบน รอ ≥ 10 วินาที อ่านจำนวนแท็บ URL หัวผลลัพธ์ และหาแถวที่ตรงกับแถว A', async () => {
    await safeClick(gf, backBtn(p2), { search: '← ในแท็บใหม่ (หน้าผลลัพธ์จาก tfs)' });
    await waitRows(p2).catch(() => {});
    const u = urlParts(p2.url());
    await gf.check('E7 แท็บใหม่ไม่ถูกปิด (2 แท็บ) · URL /travel/flights/search มี tfs=', null, async () => {
      expect.soft(p2.isClosed(), 'แท็บใหม่ไม่ถูกปิด').toBe(false);
      expect.soft(await tabCount(context), 'จำนวนแท็บ').toBe(2);
      expect.soft(u.path, 'URL path').toBe(SEARCH_PATH);
      expect.soft(u.tfs, 'มี tfs=').not.toBe('');
    });
    await checkResultsHeader(gf, p2, 'E7 หัวผลลัพธ์ในแท็บใหม่ = E1', 1);
    const hit = await findRow(allRows(p2), idA);
    await gf.check(`E7 มีแถวที่เวลาออก + ชื่อสายการบินตรงกับแถว A (${idA.dep} ${idA.airline})`, hit ? hit.row : null, async () => {
      expect.soft(hit, `พบแถว ${idA.dep} ${idA.airline}`).not.toBeNull();
    });
  });

  await test.step('9. ปิดแท็บใหม่ กลับแท็บแรก', async () => {
    await p2.close();
    gf.use(page);
    await page.bringToFront();
    await gf.pause();
  });
  gf.finishNA();
});

test('TC-BKG-02 · กดตัวแถวต่อเครื่องสายการบินเดียว + ตรวจผู้ขาย ลิงก์ออกนอก Google สัมภาระ แชร์', {
  tag: ['@P1', '@5.5'],
  annotation: [
    { type: 'คาดหวัง', description: E1_TEXT },
    { type: 'คาดหวัง', description: 'E2 (ขั้น 3) จำนวนแท็บเท่าเดิม · URL host = www.google.com · path ขึ้นต้น `/travel/flights/booking` มี `tfs=` และ `tfu=`' },
    { type: 'คาดหวัง', description: 'E3 (ขั้น 4–5) เวลาออก เวลาถึง (+1) ชื่อสายการบิน ระยะเวลา จำนวนแวะ + สนามบินที่แวะ CO2e ในหน้า booking = ค่าที่จดในขั้น 2' },
    { type: 'คาดหวัง', description: 'E4 (ขั้น 5) H = Ps = ราคาต่ำสุดในตัวเลือกการจอง' },
    { type: 'คาดหวัง', description: 'E5 (ขั้น 4–5) แถวต่อเครื่องสายการบินเดียว: มีส่วน "ตัวเลือกการจอง" ชุดเดียวสำหรับทั้งเส้นทาง (ไม่แยกการจองต่อช่วงบิน) · ผู้ขายแต่ละเจ้ามีราคาเดียวและปุ่ม "ดำเนินการต่อ" 1 ปุ่ม ครอบคลุมทุกช่วงบิน' },
    { type: 'คาดหวัง', description: 'E6 (ขั้น 5) ทุกผู้ขายที่มีหมายเหตุค่าธรรมเนียม ระบุจำนวนเงินเป็น "฿N" ชัดเจน โดย 0 < N < ราคาของผู้ขายนั้น · ถ้าไม่มีผู้ขายรายใดมีหมายเหตุในหน้านี้ ให้ใช้หน้า booking ที่เปิดใน TC-BKG-01/03 แทน ถ้ายังไม่มี = N/A' },
    { type: 'คาดหวัง', description: 'E7 (ขั้น 6) ⓘ ทุกตัว ปุ่มแชร์ ปุ่มผู้โดยสาร และ ˅ ไม่มี href หรือ href อยู่ใน google.com ที่ไม่ใช่ `/url?q=` ไปเว็บอื่น' },
    { type: 'คาดหวัง', description: 'E8 (ขั้น 6) "ดำเนินการต่อ" ทุกผู้ขาย และลิงก์นโยบายสัมภาระ จัดเป็น "ออกนอก" ตาม `D-BKG-EXT` [O-ยังไม่ยืนยัน] (ถ้าไม่มี href ให้จด "ตรวจปลายทางไม่ได้โดยไม่คลิก" และถือว่าออกนอก ไม่นับว่าล้ม) · ไม่มีขั้นตอนใดคลิกตัวที่ออกนอก' },
    { type: 'คาดหวัง', description: 'E9 (ขั้น 7) กระเป๋าถือและกระเป๋าโหลดมีสถานะทั้งคู่ แต่ละอันเป็นแบบใดแบบหนึ่ง: ฟรี / มีค่าธรรมเนียมพร้อมจำนวนเงิน ฿ หรือช่วง ฿a–฿b ที่ a ≤ b / ข้อความว่าไม่ทราบค่าธรรมเนียม · ไม่มีช่องว่างเปล่า' },
    { type: 'คาดหวัง', description: 'E10 (ขั้น 8) กล่องแชร์มี "คัดลอกลิงก์" · `D-BKG-SHARE` มี host = www.google.com · path ขึ้นต้น `/travel/flights/s/` [O-ยังไม่ยืนยัน] · Facebook / X มี href ออกนอก google.com' },
    { type: 'คาดหวัง', description: 'E11 (ขั้น 9) ถ้า N ≥ 2 มี ⓘ "วิธีจัดอันดับตัวเลือก" · ถ้า N = 1 ไม่มี ⓘ นี้ [O-ยังไม่ยืนยัน]' },
    { type: 'ที่มา', description: `${PLAN} · TC-BKG-02 · R104 (ตัวแถว) R105 R106 R108 R109 R110 R119 · Happy path · Equivalence partition (ผู้ขาย 1 เจ้า vs ≥ 2 เจ้า · ปุ่มใน Google vs ออกนอก) · Invariant/Metamorphic · [O-ยังไม่ยืนยัน] (E8 E10 E11)` },
    { type: 'งบค้นหา', description: '2' },
  ],
}, async ({ page, context, gf }) => {
  let tabs0 = 0;
  let cands: Ident[] = [];
  let noCandidate = false;
  let fallback: Ident | null = null;
  let fS!: Flight;
  let idS!: Ident;
  let segS: Segment[] = [];
  let single = false;
  let bk!: Booking;
  let fBk!: Flight;

  await test.step('1. เปิด U1 ตรง รอ ≥ 10 วินาที อ่านหัวผลลัพธ์', async () => {
    await gf.goto(getU1(), { search: 'เปิด U1' });
    await waitRows(page);
    tabs0 = await tabCount(context);
    await checkResultsHeader(gf, page, E1_LABEL, 1);
  });

  await test.step('2. หาแถว S (แวะพัก ≥ 1 ครั้ง + ชื่อสายการบินเดียว · ลำดับก่อนกับสายการบินต้นทุนต่ำ) อ่าน aria-label จดค่าทุกช่อง ราคา = Ps', async () => {
    const rows = allRows(page);
    const n = await rows.count();
    const flights: Flight[] = [];
    for (let i = 0; i < n; i++) flights.push(await readFlight(rows.nth(i)));
    const ok = flights.filter((f) => (f.stops ?? 0) >= 1 && f.airlines.length === 1);
    const ordered = [...ok.filter((f) => LCC.test(f.airlines[0])), ...ok.filter((f) => !LCC.test(f.airlines[0]))];
    cands = ordered.map((f) => ({ dep: f.dep, airline: f.primary }));
    if (!cands.length) {
      noCandidate = true;
      const f = flights.find((x) => (x.stops ?? 0) >= 1);
      fallback = f ? { dep: f.dep, airline: f.primary } : null;
      note('N/A', 'วันรันไม่มีแถวต่อเครื่องสายการบินเดียว → ใช้แถวแรกที่แวะพัก ≥ 1 ครั้งตรวจข้ออื่นแทน');
    }
    note('ผู้สมัครแถว S', cands.map((c) => `${c.dep} ${c.airline}`).join(' | ') || '(ไม่มี)');
    if (!cands.length && !fallback) throw new Error('ไม่พบแถวที่แวะพัก ≥ 1 ครั้งในหน้าผลลัพธ์');
  });

  const tryList: Ident[] = noCandidate ? [fallback!] : cands.slice(0, 2);
  for (let attempt = 0; attempt < tryList.length; attempt++) {
    const id = tryList[attempt];
    if (attempt > 0) {
      await test.step('4ข. ไม่ใช่สายการบินเดียว → กด ← แล้วลองแถวถัดไปที่เข้าเงื่อนไข (อีก 1 แถว) และอ่านค่าแถวตามขั้น 2', async () => {
        await safeClick(gf, backBtn(page), { search: '← เพื่อลองแถว S ถัดไป' });
        await waitRows(page);
      });
    }
    await test.step(`3. กดที่ตัวแถว S (${id.dep} ${id.airline}) บริเวณเวลา/ชื่อสายการบิน รอโหลด อ่านจำนวนแท็บและ URL`, async () => {
      const hit = await findRow(allRows(page), id);
      if (!hit) throw new Error(`หาแถว ${id.dep} ${id.airline} ไม่พบ`);
      fS = await readFlight(hit.row);
      idS = { ...id, group: hit.index < (await groupRows(page, 'เที่ยวบินยอดนิยม').count()) ? 'เที่ยวบินยอดนิยม' : 'เที่ยวบินอื่นๆ' };
      note('แถว S', `${fS.dep}–${fS.arr}${fS.plus} · ${fS.airlines.join(' · ')} · ${fS.duration} · แวะ ${fS.stops} ${fS.layovers.join(', ')} · ${fS.from}–${fS.to} · CO2e ${fS.co2} · Ps ฿${fS.price}`);
      await gf.click(rowBody(hit.row), { booking: `กดตัวแถว S ${id.dep} ${id.airline}` });
      await waitBooking(page);
      const u = urlParts(page.url());
      await gf.check('E2 แท็บเท่าเดิม · URL www.google.com/travel/flights/booking มี tfs= และ tfu=', page.getByRole('heading', { name: 'สรุปแผนการเดินทาง' }), async () => {
        expect.soft(await tabCount(context), 'จำนวนแท็บเท่าเดิม').toBe(tabs0);
        expect.soft(u.host, 'URL host').toBe('www.google.com');
        expect.soft(u.path.startsWith(BOOKING_PATH), `path ขึ้นต้น ${BOOKING_PATH} (ได้ ${u.path})`).toBe(true);
        expect.soft(u.tfs, 'มี tfs=').not.toBe('');
        expect.soft(u.tfu, 'มี tfu=').not.toBe('');
      });
    });
    await test.step('4. กด ˅ ของเที่ยวบินในหน้า booking อ่านทุกช่วงบิน · ตรวจว่าทุกช่วงเป็นสายการบินเดียวกัน (รหัสนำหน้าเลขเที่ยวบินเดียวกัน)', async () => {
      const summary = bookingFlight(page);
      fBk = await readFlight(summary);
      await safeClick(gf, expandBtn(summary));
      segS = await readSegments(summary);
      const prefixes = new Set(segS.flatMap((s) => s.flightNos.map(prefixOf)));
      single = segS.length >= 2 && prefixes.size === 1;
      note('ช่วงบินแถว S', `${JSON.stringify(segS)} → ${single ? 'สายการบินเดียว' : 'ไม่ใช่สายการบินเดียว'}`);
    });
    if (single || noCandidate) break;
  }

  await test.step('5. อ่าน "ราคารวมที่ต่ำที่สุด" (= H) · "ตัวเลือกการจอง" ทุกแถวตามลำดับ: ชื่อผู้ขาย ราคา หมายเหตุ ปุ่ม · นับส่วนการจองและ N', async () => {
    bk = await readBooking(page);
    recordBooking('TC-BKG-02', idS, bk);
    await gf.check('E3 เวลาออก/ถึง (+1) สายการบิน ระยะเวลา แวะ + สนามบินที่แวะ CO2e ในหน้า booking = ขั้น 2', bookingFlight(page), async () => {
      expectFlightReadable(fBk, 'booking');
      expectSameFlight(fBk, fS, 'booking vs แถว S');
    });
    await gf.check('E4 H = Ps = ราคาต่ำสุดในตัวเลือกการจอง', [lowestPrice(page), page.getByRole('button', { name: CONTINUE })], async () => {
      expect.soft(bk.H, 'H = Ps').toBe(fS.price);
      expect.soft(bk.H, 'H = ราคาต่ำสุดในตัวเลือกการจอง').toBe(minOf(bk.vendors.map((v) => v.price)));
    });
    if (noCandidate) {
      gf.na('E5 ต่อเครื่องสายการบินเดียว = ตัวเลือกการจองชุดเดียว', 'วันรันไม่มีแถวต่อเครื่องสายการบินเดียว (ตามเงื่อนไขก่อนเริ่มในแผน)');
    } else if (!single) {
      gf.na('E5 ต่อเครื่องสายการบินเดียว = ตัวเลือกการจองชุดเดียว', 'แถวที่ลองครบ 2 แถวตามแผน ตรวจจาก ˅ แล้วไม่ใช่สายการบินเดียว = ไม่มีแถวแบบนี้ในวันรัน');
    } else {
      await gf.check('E5 ตัวเลือกการจองชุดเดียวทั้งเส้นทาง · ผู้ขายแต่ละเจ้ามีราคาเดียว + ปุ่ม "ดำเนินการต่อ" 1 ปุ่ม',
        [page.getByRole('heading', { name: 'ตัวเลือกการจอง', exact: true }), page.getByRole('button', { name: CONTINUE })], async () => {
          expect.soft(bk.optionHeadings, 'จำนวนส่วน "ตัวเลือกการจอง"').toBe(1);
          expect.soft(bk.vendors.length, 'มีผู้ขายอย่างน้อย 1 เจ้า').toBeGreaterThan(0);
          const names = bk.vendors.map((v) => v.name);
          expect.soft(new Set(names).size, 'ผู้ขายแต่ละเจ้ามีปุ่ม "ดำเนินการต่อ" 1 ปุ่ม (ชื่อไม่ซ้ำ)').toBe(names.length);
          for (const v of bk.vendors) {
            expect.soft(v.contInBlock, `${v.name}: ปุ่ม "ดำเนินการต่อ" ในแถวผู้ขาย`).toBe(1);
            expect.soft(v.pricesInBlock, `${v.name}: ราคาเดียว`).toBe(1);
          }
        });
    }
    const withFee = bk.vendors.filter((v) => v.feeNotes.length);
    if (withFee.length) {
      await gf.check('E6 หมายเหตุค่าธรรมเนียมระบุ "฿N" โดย 0 < N < ราคาผู้ขาย', page.getByText(/ค่าธรรมเนียม.*฿|รวมค่าธรรมเนียม/), async () => {
        for (const v of withFee) {
          expect.soft(v.fees.length, `${v.name}: หมายเหตุ "${v.feeNotes.join(' / ')}" มีจำนวนเงิน ฿N`).toBeGreaterThan(0);
          for (const f of v.fees) {
            expect.soft(f, `${v.name}: N > 0`).toBeGreaterThan(0);
            expect.soft(f, `${v.name}: N < ราคา ฿${v.price}`).toBeLessThan(v.price ?? 0);
          }
        }
      });
    } else {
      const prev = (loadState<{ vendor: string; notes: string[]; fees: number[]; price: number | null; from: string }[]>('BKG-FEES') || []);
      if (prev.length) {
        await gf.check(`E6 (ใช้หน้า booking ของ ${prev[0].from} แทน) หมายเหตุค่าธรรมเนียมระบุ "฿N" โดย 0 < N < ราคา`, null, async () => {
          for (const v of prev) {
            expect.soft(v.fees.length, `${v.vendor}: หมายเหตุ "${v.notes.join(' / ')}" มีจำนวนเงิน ฿N`).toBeGreaterThan(0);
            for (const f of v.fees) {
              expect.soft(f, `${v.vendor}: N > 0`).toBeGreaterThan(0);
              expect.soft(f, `${v.vendor}: N < ราคา ฿${v.price}`).toBeLessThan(v.price ?? 0);
            }
          }
        });
      } else {
        gf.na('E6 หมายเหตุค่าธรรมเนียม ฿N', 'ไม่มีผู้ขายรายใดมีหมายเหตุค่าธรรมเนียมในหน้านี้ และหน้า booking ของ TC-BKG-01 (03 ยังไม่รัน) ก็ไม่มี');
      }
    }
  });

  await test.step('6. อ่าน snapshot (ไม่คลิก) จด href ของ "ดำเนินการต่อ" นโยบายสัมภาระ "ค่าธรรมเนียมสัมภาระ" ⓘ แชร์ ผู้โดยสาร ˅ แล้วจัดตาม D-BKG-EXT', async () => {
    const main = page.getByRole('main');
    const infoL = main.getByRole('button', { name: /ข้อมูลเพิ่มเติม/ });
    const contL = page.getByRole('button', { name: /^ดำเนินการต่อ/ });
    const bagL = page.getByRole('link', { name: /^นโยบายสัมภาระของ/ });
    const bagFeeL = page.getByRole('button', { name: 'ค่าธรรมเนียมสัมภาระ' });
    const expL = main.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ });
    const internal = [
      ...(await hrefTable(infoL)).map((x) => ({ ...x, kind: 'ⓘ' })),
      ...(await hrefTable(shareBtn(page))).map((x) => ({ ...x, kind: 'แชร์' })),
      ...(await hrefTable(paxButton(page))).map((x) => ({ ...x, kind: 'ผู้โดยสาร' })),
      ...(await hrefTable(expL)).map((x) => ({ ...x, kind: '˅' })),
    ];
    const external = [
      ...(await hrefTable(contL)).map((x) => ({ ...x, kind: 'ดำเนินการต่อ' })),
      ...(await hrefTable(bagL)).map((x) => ({ ...x, kind: 'นโยบายสัมภาระ' })),
    ];
    const bagFee = await hrefTable(bagFeeL);
    note('href (D-BKG-EXT)', [...internal, ...external].map((x) => `[${x.kind}] ${x.name} → ${x.href || '-'} = ${x.cls}`).join('\n'));
    note('href ปุ่ม "ค่าธรรมเนียมสัมภาระ"', bagFee.map((x) => `${x.href || '-'} = ${x.cls}`).join(', ') || 'ไม่พบปุ่ม');
    for (const x of external.filter((e) => e.cls === 'ไม่มี href')) note('ตรวจปลายทางไม่ได้โดยไม่คลิก', `[${x.kind}] ${x.name} (ถือว่าออกนอก)`);
    if (!(await bagL.count())) note('บันทึก', 'หน้านี้ไม่มีลิงก์ "นโยบายสัมภาระของ …"');

    await gf.check('E7 ⓘ ทุกตัว แชร์ ผู้โดยสาร ˅ ไม่มี href หรือ href อยู่ใน google.com (ไม่ใช่ /url?q= ไปเว็บอื่น)', [infoL, shareBtn(page), paxButton(page), expL], async () => {
      expect.soft(internal.length, 'อ่านปุ่มได้').toBeGreaterThan(0);
      for (const x of internal) expect.soft(x.cls, `[${x.kind}] ${x.name} → ${x.href}`).not.toBe('ออกนอก');
    });
    await gf.check('E8 "ดำเนินการต่อ" ทุกผู้ขาย + ลิงก์นโยบายสัมภาระ = ออกนอก (ไม่มี href = ตรวจปลายทางไม่ได้ ถือว่าออกนอก) · ไม่มีการคลิกตัวที่ออกนอก [O-ยังไม่ยืนยัน]', [contL, bagL], async () => {
      expect.soft(external.filter((x) => x.kind === 'ดำเนินการต่อ').length, 'พบปุ่ม "ดำเนินการต่อ"').toBeGreaterThan(0);
      for (const x of external) expect.soft(['ออกนอก', 'ไม่มี href'], `[${x.kind}] ${x.name} → ${x.href}`).toContain(x.cls);
      for (const p of context.pages()) expect.soft(urlParts(p.url()).host, `แท็บ ${p.url()} ยังอยู่ใน google.com`).toMatch(/(^|\.)google\.com$/);
    });
  });

  await test.step('7. อ่านแถบสัมภาระ: สถานะกระเป๋าถือขึ้นเครื่อง และกระเป๋าโหลด', async () => {
    const main = page.getByRole('main');
    const carry = main.getByRole('listitem').filter({ hasText: /นำขึ้นเครื่อง|ถือขึ้นเครื่อง/ }).first();
    const checked = main.getByRole('listitem').filter({ hasText: /โหลดใต้ท้องเครื่อง|สัมภาระที่โหลด|กระเป๋าโหลด/ }).first();
    const readBag = async (l: Locator) => l.evaluate((el) => {
      const own = [(el as HTMLElement).innerText || '', el.getAttribute('aria-label') || '',
        ...Array.from(el.querySelectorAll('[aria-label]')).map((e) => e.getAttribute('aria-label') || '')].join(' ');
      const sec = (el.closest('ul,[role="list"]')?.parentElement as HTMLElement | null)?.innerText || '';
      return { own: own.trim(), sec };
    }, undefined, { timeout: 5000 }).catch(() => ({ own: '', sec: '' }));
    const classify = (b: { own: string; sec: string }) => {
      const t = b.own;
      if (!t) return { ok: false, kind: 'ว่างเปล่า/ไม่พบ' };
      if (/ฟรี|ไม่มีค่าธรรมเนียม/.test(t)) return { ok: true, kind: 'ฟรี' };
      const r = t.match(/฿\s?([\d,]+)\s*[–-]\s*฿?\s?([\d,]+)/) || t.match(/ระหว่าง\s*([\d,]+)\s*บาทไทย\s*และ\s*([\d,]+)/);
      if (r) {
        const a = Number(r[1].replace(/,/g, '')), b2 = Number(r[2].replace(/,/g, ''));
        return { ok: a <= b2, kind: `ช่วง ฿${a}–฿${b2}${a <= b2 ? '' : ' (a > b)'}` };
      }
      if (/฿\s?[\d,]+|\d[\d,]*\s*บาทไทย/.test(t)) return { ok: true, kind: 'มีค่าธรรมเนียมพร้อมจำนวนเงิน' };
      if (/ไม่ทราบค่าธรรมเนียม/.test(t) || /ไม่ทราบค่าธรรมเนียม/.test(b.sec)) return { ok: true, kind: 'ไม่ทราบค่าธรรมเนียม' };
      return { ok: false, kind: `ไม่เข้าแบบใด: "${t.slice(0, 80)}"` };
    };
    const c1 = await readBag(carry);
    const c2 = await readBag(checked);
    const k1 = classify(c1), k2 = classify(c2);
    note('สัมภาระ', `กระเป๋าถือ: ${c1.own || '-'} → ${k1.kind} · กระเป๋าโหลด: ${c2.own || '-'} → ${k2.kind}`);
    await gf.check('E9 กระเป๋าถือ + กระเป๋าโหลดมีสถานะ: ฟรี / ค่าธรรมเนียม ฿ หรือช่วง a ≤ b / ไม่ทราบค่าธรรมเนียม · ไม่ว่าง', [carry, checked], async () => {
      expect.soft(k1.ok, `กระเป๋าถือ: ${k1.kind}`).toBe(true);
      expect.soft(k2.ok, `กระเป๋าโหลด: ${k2.kind}`).toBe(true);
    });
  });

  await test.step('8. กดปุ่มแชร์ (ยืนยันแล้วว่าไม่ออกนอก) อ่านกล่อง "แชร์เที่ยวบินนี้" href ของ Facebook / X (ไม่กด) · กด "คัดลอกลิงก์" เก็บ D-BKG-SHARE · ปิดด้วย Esc (ไม่เปิดลิงก์)', async () => {
    await safeClick(gf, shareBtn(page));
    const dlg = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'แชร์เที่ยวบินนี้' }) }).first();
    const copy = dlg.getByRole('button', { name: 'คัดลอกลิงก์', exact: true }).first();
    const fb = dlg.getByRole('button', { name: /Facebook/ }).or(dlg.getByRole('link', { name: /Facebook/ })).first();
    const x = dlg.getByRole('button', { name: /^X\b|Twitter/ }).or(dlg.getByRole('link', { name: /^X\b|Twitter/ })).first();
    const fbHref = await hrefOf(fb);
    const xHref = await hrefOf(x);
    const copyCount = await copy.count();
    if (copyCount) await safeClick(gf, copy);
    const shown = await dlg.locator('input').first().inputValue({ timeout: 3000 }).catch(() => '');
    const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    const share = (shown || clip).trim();
    saveState('D-BKG-SHARE', share);
    note('D-BKG-SHARE', `ในกล่อง: ${shown || '-'} · clipboard: ${clip || '-'} · Facebook href: ${fbHref || '-'} · X href: ${xHref || '-'}`);
    const su = urlParts(share);
    await gf.check('E10 กล่องแชร์มี "คัดลอกลิงก์" · D-BKG-SHARE = www.google.com/travel/flights/s/… [O-ยังไม่ยืนยัน] · Facebook / X มี href ออกนอก', [copy, fb, x], async () => {
      expect.soft(copyCount, 'มีปุ่ม "คัดลอกลิงก์"').toBeGreaterThan(0);
      expect.soft(su.host, `D-BKG-SHARE host (${share})`).toBe('www.google.com');
      expect.soft(su.path.startsWith('/travel/flights/s/'), `D-BKG-SHARE path ขึ้นต้น /travel/flights/s/ (${su.path})`).toBe(true);
      expect.soft(classifyHref(fbHref), `Facebook href: ${fbHref || 'ไม่มี href (ตรวจปลายทางไม่ได้โดยไม่คลิก)'}`).toBe('ออกนอก');
      expect.soft(classifyHref(xHref), `X href: ${xHref || 'ไม่มี href (ตรวจปลายทางไม่ได้โดยไม่คลิก)'}`).toBe('ออกนอก');
    });
    await gf.press('Escape');
  });

  await test.step('9. ตรวจว่ามี ⓘ "วิธีจัดอันดับตัวเลือก" ในส่วนตัวเลือกการจองหรือไม่ เทียบกับ N', async () => {
    const ranking = await readBooking(page).then((b) => b.ranking).catch(() => bk.ranking);
    const N = bk.vendors.length;
    await gf.check(`E11 N = ${N} → ${N >= 2 ? 'ต้องมี' : 'ต้องไม่มี'} ⓘ "วิธีจัดอันดับตัวเลือก" [O-ยังไม่ยืนยัน]`,
      [page.getByRole('heading', { name: 'ตัวเลือกการจอง', exact: true }), page.getByText('วิธีจัดอันดับตัวเลือก')], async () => {
        expect.soft(ranking, `N = ${N}: มี ⓘ "วิธีจัดอันดับตัวเลือก"`).toBe(N >= 2);
      });
  });
  gf.finishNA();
});

test('TC-BKG-03 · แถว codeshare + ← / Back คืนเงื่อนไขและแท็บ', {
  tag: ['@P1', '@5.5'],
  annotation: [
    { type: 'คาดหวัง', description: E1_TEXT },
    { type: 'คาดหวัง', description: 'E2 (ขั้น 3) ชื่อสายการบินในแถว C มี 2 ชื่อคั่นด้วย "·" · ทุกช่วงบินใน ˅ มีเลขเที่ยวบินอย่างน้อย 1 เลข และรหัสนำหน้าเป็นของสายใดสายหนึ่งใน 2 ชื่อนั้น' },
    { type: 'คาดหวัง', description: 'E3 (ขั้น 3–4) แต่ละช่วงบินแสดงเลขเที่ยวบินเดียวของผู้ให้บริการจริง ไม่มีเลขเที่ยวบินของอีกสาย [O-ยังไม่ยืนยัน]' },
    { type: 'คาดหวัง', description: 'E4 (ขั้น 4) หน้า booking แสดงชื่อสายการบินทั้ง 2 ชื่อเหมือนในแถว C (ลำดับเดียวกัน) · เลขเที่ยวบินใน ˅ ของหน้า booking = ที่จดในขั้น 3 · เวลา ระยะเวลา แวะ = แถว C' },
    { type: 'คาดหวัง', description: 'E5 (ขั้น 5) URL path = `/travel/flights/search` และ tfs = T0 · หัวผลลัพธ์ = E1 · แท็บ "ถูกที่สุด" ยังถูกเลือก' },
    { type: 'คาดหวัง', description: 'E6 (ขั้น 6) Back 1 ครั้งย้อนกลับ 1 ขั้นพอดี: ได้หน้าผลลัพธ์ (ไม่ใช่หน้าแรกหรือหน้าก่อนหน้านั้น) · tfs = T0 · หัวผลลัพธ์ = E1 · แท็บ "ถูกที่สุด" ยังถูกเลือก → ผลของ ← (E5) และ Back (E6) เหมือนกัน' },
    { type: 'ที่มา', description: `${PLAN} · TC-BKG-03 · R120 R105 R104 R111 R39 · State · Invariant/Metamorphic · [O-ยังไม่ยืนยัน] (เฉพาะ E3)` },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, gf }) => {
  let T0 = '';
  let codeshare = false;
  let fC!: Flight;
  let idC!: Ident;
  let segC: Segment[] = [];
  let fBk!: Flight;
  let segBk: Segment[] = [];
  let e5 = { path: '', tfs: '', tab: '' };

  await test.step('1. เปิด U1 ตรง รอ ≥ 10 วินาที อ่านหัวผลลัพธ์ จด URL (ค่า tfs = T0)', async () => {
    await gf.goto(getU1(), { search: 'เปิด U1' });
    await waitRows(page);
    T0 = urlParts(page.url()).tfs;
    note('T0', page.url());
    await checkResultsHeader(gf, page, E1_LABEL, 1);
  });

  await test.step('2. กดแท็บ "ถูกที่สุด" อ่านว่าแท็บนี้ถูกเลือก (aria-selected)', async () => {
    const before = urlParts(page.url()).tfs;
    await gf.click(cheapestTab(page));
    await gf.pause(4000, 6000);
    if (urlParts(page.url()).tfs !== before) await gf.searched('แท็บ "ถูกที่สุด" โหลดผลใหม่ (tfs เปลี่ยน)', 0);
    await waitRows(page);
    note('แท็บ "ถูกที่สุด"', `aria-selected = ${await cheapestTab(page).getAttribute('aria-selected')} · URL ${page.url()}`);
  });

  await test.step('3. หาแถว C (แถวแรกที่ชื่อสายการบินเป็น 2 ชื่อคั่นด้วย "·") อ่าน aria-label จดชื่อสายการบิน เวลา ระยะเวลา แวะ ราคา · กด ˅ จดเลขเที่ยวบินและสายการบินทุกช่วง', async () => {
    const rows = allRows(page);
    const n = await rows.count();
    let idx = -1;
    let first: Flight | null = null;
    for (let i = 0; i < n; i++) {
      const f = await readFlight(rows.nth(i));
      if (i === 0) first = f;
      if (f.airlines.length >= 2) { idx = i; fC = f; break; }
    }
    codeshare = idx >= 0;
    if (!codeshare) {
      idx = 0;
      fC = first!;
      note('N/A', 'วันรันไม่มีแถว codeshare → ใช้แถวแรกของรายการเป็นแถว C เพื่อตรวจ E5–E6');
    }
    idC = { dep: fC.dep, airline: fC.primary };
    const row = rows.nth(idx);
    note('แถว C', `${fC.dep}–${fC.arr}${fC.plus} · ${fC.airlines.join(' · ')} · ${fC.duration} · แวะ ${fC.stops} · ฿${fC.price}`);
    await gf.click(expandBtn(row));
    segC = await readSegments(row);
    note('ช่วงบินแถว C', JSON.stringify(segC));
    if (codeshare) {
      await gf.check('E2 แถว C มี 2 ชื่อคั่นด้วย "·" · ทุกช่วงใน ˅ มีเลขเที่ยวบิน ≥ 1 และรหัสนำหน้าเป็นของ 1 ใน 2 สาย', row, async () => {
        expect.soft(fC.airlines.length, `ชื่อสายการบิน: ${fC.airlines.join(' · ')}`).toBe(2);
        expect.soft(segC.length, 'อ่านช่วงบินจาก ˅ ได้').toBeGreaterThan(0);
        const known = fC.airlines.flatMap(codesFor);
        for (const s of segC) {
          expect.soft(s.flightNos.length, `ช่วง ${s.dep}→${s.arr}: มีเลขเที่ยวบิน`).toBeGreaterThan(0);
          for (const fn of s.flightNos) {
            const okByCode = known.length > 0 && known.includes(prefixOf(fn));
            const okByName = fC.airlines.some((a) => sameName(a, s.airline));
            expect.soft(okByCode || okByName, `ช่วง ${s.dep}→${s.arr}: ${fn} (สาย "${s.airline}") เป็นของ ${fC.airlines.join(' หรือ ')}`).toBe(true);
          }
        }
      });
    } else {
      gf.na('E2 แถว codeshare: 2 ชื่อ + เลขเที่ยวบินของ 1 ใน 2 สาย', 'วันรันไม่มีแถว codeshare (ตามเงื่อนไขก่อนเริ่มในแผน)');
    }
  });

  await test.step('4. กด "เลือกเที่ยวบิน" รอโหลด อ่านชื่อสายการบินในส่วนเที่ยวบินที่เลือก · กด ˅ อ่านเลขเที่ยวบินทุกช่วง · บันทึกตามข้อปฏิบัติร่วม', async () => {
    const hit = await findRow(allRows(page), idC);
    const row = hit ? hit.row : allRows(page).first();
    const sel = row.getByRole('button', { name: 'เลือกเที่ยวบิน', exact: true });
    if (!(await sel.isVisible().catch(() => false))) await gf.click(expandBtn(row));
    await gf.click(sel, { booking: `กด "เลือกเที่ยวบิน" แถว C ${idC.dep} ${idC.airline}` });
    await waitBooking(page);
    const summary = bookingFlight(page);
    fBk = await readFlight(summary);
    await safeClick(gf, expandBtn(summary));
    segBk = await readSegments(summary);
    const bk = await readBooking(page);
    recordBooking('TC-BKG-03', { ...idC, group: 'แท็บถูกที่สุด' }, bk);
    note('ช่วงบินในหน้า booking', JSON.stringify(segBk));
    if (codeshare) {
      await gf.check('E3 แต่ละช่วงบินแสดงเลขเที่ยวบินเดียวของผู้ให้บริการจริง ไม่มีเลขเที่ยวบินของอีกสาย [O-ยังไม่ยืนยัน]', summary, async () => {
        for (const [who, segs] of [['แถว C ˅', segC], ['booking ˅', segBk]] as [string, Segment[]][]) {
          expect.soft(segs.length, `${who}: อ่านช่วงบินได้`).toBeGreaterThan(0);
          for (const s of segs) {
            expect.soft(s.flightNos, `${who} ช่วง ${s.dep}→${s.arr}: เลขเที่ยวบินเดียว`).toHaveLength(1);
            const op = s.airline;
            const others = fC.airlines.filter((a) => !sameName(a, op)).flatMap(codesFor);
            const opCodes = codesFor(op);
            for (const fn of s.flightNos) {
              if (others.length && !others.every((c) => opCodes.includes(c))) {
                expect.soft(others.includes(prefixOf(fn)) && !opCodes.includes(prefixOf(fn)), `${who}: ${fn} ไม่ใช่เลขของอีกสาย`).toBe(false);
              }
            }
          }
        }
      });
      await gf.check('E4 หน้า booking แสดง 2 ชื่อเหมือนแถว C (ลำดับเดียวกัน) · เลขเที่ยวบินใน ˅ = ขั้น 3 · เวลา ระยะเวลา แวะ = แถว C', summary, async () => {
        expect.soft(fBk.airlines, 'ชื่อสายการบิน (ลำดับ)').toEqual(fC.airlines);
        expectSameSegments(segBk, segC, 'booking ˅ vs แถว C ˅');
        expect.soft(fBk.dep, 'เวลาออก').toBe(fC.dep);
        expect.soft(fBk.arr, 'เวลาถึง').toBe(fC.arr);
        expect.soft(fBk.plus, '+วัน').toBe(fC.plus);
        expect.soft(fBk.duration, 'ระยะเวลา').toBe(fC.duration);
        expect.soft(fBk.stops, 'จำนวนแวะ').toBe(fC.stops);
        expect.soft(fBk.layovers, 'สนามบินที่แวะ').toEqual(fC.layovers);
      });
    } else {
      gf.na('E3 เลขเที่ยวบินเดียวของผู้ให้บริการจริง', 'วันรันไม่มีแถว codeshare (ตามเงื่อนไขก่อนเริ่มในแผน)');
      gf.na('E4 หน้า booking แสดง 2 ชื่อเหมือนแถว C', 'วันรันไม่มีแถว codeshare (ตามเงื่อนไขก่อนเริ่มในแผน)');
    }
  });

  await test.step('5. กดปุ่ม ← มุมซ้ายบน รอ ≥ 10 วินาที อ่าน URL หัวผลลัพธ์ แท็บที่ถูกเลือก', async () => {
    await safeClick(gf, backBtn(page), { search: '← จากหน้า booking แถว C' });
    await waitRows(page).catch(() => {});
    const u = urlParts(page.url());
    const sel = (await cheapestTab(page).getAttribute('aria-selected').catch(() => null)) || '';
    e5 = { path: u.path, tfs: u.tfs, tab: sel };
    await gf.check('E5 URL /travel/flights/search และ tfs = T0 · แท็บ "ถูกที่สุด" ยังถูกเลือก', cheapestTab(page), async () => {
      expect.soft(u.path, 'URL path').toBe(SEARCH_PATH);
      expect.soft(u.tfs, 'tfs = T0').toBe(T0);
      expect.soft(sel, 'แท็บ "ถูกที่สุด" aria-selected').toBe('true');
    });
    await checkResultsHeader(gf, page, 'E5 หัวผลลัพธ์ = E1 (หลัง ←)', 1);
  });

  await test.step('6. กดที่ตัวแถว C อีกครั้ง (ได้หน้า booking ของเที่ยวบินเดิม) แล้วกด Back ของเบราว์เซอร์ 1 ครั้ง รอ ≥ 10 วินาที อ่าน URL หัวผลลัพธ์ แท็บที่ถูกเลือก', async () => {
    const hit = await findRow(allRows(page), idC);
    if (!hit) throw new Error(`หาแถว C (${idC.dep} ${idC.airline}) หลัง ← ไม่พบ`);
    await gf.click(rowBody(hit.row), { booking: `กดตัวแถว C อีกครั้ง ${idC.dep} ${idC.airline}` });
    await waitBooking(page);
    const again = await readFlight(bookingFlight(page));
    note('หน้า booking ครั้งที่ 2', `${again.dep}–${again.arr} ${again.airlines.join(' · ')} · URL ${page.url()}`);
    await browserBack(gf, page, { search: 'Back เบราว์เซอร์จากหน้า booking แถว C' });
    await waitRows(page).catch(() => {});
    const u = urlParts(page.url());
    const sel = (await cheapestTab(page).getAttribute('aria-selected').catch(() => null)) || '';
    await gf.check('E6 Back 1 ครั้ง = หน้าผลลัพธ์ · tfs = T0 · แท็บ "ถูกที่สุด" ยังถูกเลือก · ผลเหมือน ← (E5)', cheapestTab(page), async () => {
      expect.soft(u.path, 'ได้หน้าผลลัพธ์ (ไม่ใช่หน้าแรก/หน้าอื่น)').toBe(SEARCH_PATH);
      expect.soft(u.tfs, 'tfs = T0').toBe(T0);
      expect.soft(sel, 'แท็บ "ถูกที่สุด" aria-selected').toBe('true');
      expect.soft({ path: u.path, tfs: u.tfs, tab: sel }, 'ผลของ Back = ผลของ ← (E5)').toEqual(e5);
    });
    await checkResultsHeader(gf, page, 'E6 หัวผลลัพธ์ = E1 (หลัง Back)', 1);
  });
  gf.finishNA();
});

test('TC-BKG-04 · ผู้ใหญ่ 2 คนในหน้า booking: ราคา = 2 × และติดกลับหน้าผลลัพธ์', {
  tag: ['@P1', '@5.5'],
  annotation: [
    { type: 'คาดหวัง', description: E1_TEXT },
    { type: 'คาดหวัง', description: 'E2 (ขั้น 3) H1 = P1 และ H1 = ราคาผู้ขายต่ำสุด · ปุ่มผู้โดยสารแสดง 1 · ช่วงราคาปกติอยู่ในรูป ฿a1–฿b1 โดย a1 < b1' },
    { type: 'คาดหวัง', description: 'E3 (ขั้น 5) ปุ่มผู้โดยสารแสดง 2 และข้อความระบุผู้ใหญ่ 2 ท่าน · `D-BKG-B2` ≠ `D-BKG-B1` (สถานะใหม่อยู่ใน URL)' },
    { type: 'คาดหวัง', description: 'E4 (ขั้น 5) H2 = 2 × H1 ตรงตัว · ผู้ขายที่ชื่อเดียวกับขั้น 3 มีราคาใหม่ = 2 × ราคาเดิมของผู้ขายนั้น ทุกเจ้า · H2 = ราคาผู้ขายต่ำสุดในหน้า' },
    { type: 'คาดหวัง', description: 'E5 (ขั้น 5) ช่วงราคาปกติเปลี่ยนเป็นหน่วยเดียวกับราคารวม 2 คน: a2 > a1 และ b2 > b1 และ a2 < b2' },
    { type: 'คาดหวัง', description: 'E6 (ขั้น 6) หน้าผลลัพธ์แสดงผู้โดยสาร 2 (ปุ่ม/หัวผลลัพธ์/ข้อความผู้ใหญ่ 2 ท่าน) · เงื่อนไขอื่นคงเดิม: เที่ยวเดียว · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.' },
    { type: 'คาดหวัง', description: 'E7 (ขั้น 6) ทุกแถวที่ตัวตนตรงกับขั้น 2 มีราคา = 2 × Pi ตรงตัว (ต้องพบอย่างน้อย 1 แถว · แถวที่หายไปให้ข้าม)' },
    { type: 'ที่มา', description: `${PLAN} · TC-BKG-04 · R116 R118 R106 · Invariant/Metamorphic (1 คน → 2 คน ราคาคูณ 2) · State · [R]` },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, gf }) => {
  const top: (Ident & { price: number | null })[] = [];
  let B1 = '';
  let B2 = '';
  let bk1!: Booking;
  let bk2!: Booking;

  await test.step('1. เปิด U1 ตรง รอ ≥ 10 วินาที อ่านหัวผลลัพธ์', async () => {
    await gf.goto(getU1(), { search: 'เปิด U1' });
    await waitRows(page);
    await checkResultsHeader(gf, page, E1_LABEL, 1);
  });

  await test.step('2. จดตัวตน (เวลาออก + ชื่อสายการบิน) และราคา 1 คนของ 3 แถวแรกในกลุ่ม "เที่ยวบินยอดนิยม" = P1 P2 P3', async () => {
    const rows = groupRows(page, 'เที่ยวบินยอดนิยม');
    const n = Math.min(await rows.count(), 3);
    for (let i = 0; i < n; i++) {
      const f = await readFlight(rows.nth(i));
      top.push({ dep: f.dep, airline: f.primary, group: 'เที่ยวบินยอดนิยม', price: f.price });
    }
    note('P1 P2 P3', top.map((t, i) => `P${i + 1} = ${t.dep} ${t.airline} ฿${t.price}`).join(' · '));
    if (!top.length) throw new Error('ไม่พบแถวในกลุ่ม "เที่ยวบินยอดนิยม"');
  });

  await test.step('3. กดตัวแถวของแถวที่ 1 รอโหลด · จด URL = D-BKG-B1 · H1 · ราคาผู้ขายทุกเจ้า · ช่วงราคาปกติ ฿a1–฿b1 · ปุ่มผู้โดยสาร และข้อความจำนวนผู้ใหญ่', async () => {
    const row = groupRows(page, 'เที่ยวบินยอดนิยม').first();
    await gf.click(rowBody(row), { booking: `กดตัวแถวที่ 1 ${top[0].dep} ${top[0].airline}` });
    await waitBooking(page);
    B1 = page.url();
    saveState('D-BKG-B1', B1);
    bk1 = await readBooking(page);
    recordBooking('TC-BKG-04 (1 คน)', top[0], bk1);
    note('D-BKG-B1', `${B1} · H1 ฿${bk1.H} · ช่วงปกติ ${JSON.stringify(bk1.range)} · ผู้โดยสาร ${bk1.pax} · ผู้ใหญ่ ${bk1.adults} ท่าน`);
    await gf.check('E2 H1 = P1 = ราคาผู้ขายต่ำสุด · ปุ่มผู้โดยสาร = 1 · ช่วงราคาปกติ ฿a1–฿b1 โดย a1 < b1',
      [lowestPrice(page), paxButton(page), page.getByText(/ระหว่าง\s*฿/).first()], async () => {
        expect.soft(bk1.H, 'H1 = P1').toBe(top[0].price);
        expect.soft(bk1.H, 'H1 = ราคาผู้ขายต่ำสุด').toBe(minOf(bk1.vendors.map((v) => v.price)));
        expect.soft(bk1.pax, 'ปุ่มผู้โดยสาร').toBe(1);
        expect.soft(bk1.range, 'มีช่วงราคาปกติ ฿a1–฿b1').not.toBeNull();
        if (bk1.range) expect.soft(bk1.range[0], 'a1 < b1').toBeLessThan(bk1.range[1]);
      });
  });

  await test.step('4. กดปุ่มผู้โดยสารในหน้า booking (ยืนยันว่าไม่มี href ออกนอก) กด + ของผู้ใหญ่ 1 ครั้ง (1 → 2) แล้วกด "เสร็จ" รอโหลด ≥ 10 วินาที', async () => {
    await safeClick(gf, paxButton(page));
    const dlg = page.getByRole('dialog', { name: 'จำนวนผู้โดยสาร' });
    await safeClick(gf, dlg.getByRole('button', { name: 'เพิ่มผู้ใหญ่' }));
    await safeClick(gf, dlg.getByRole('button', { name: 'เสร็จ', exact: true }), { search: 'เปลี่ยนผู้ใหญ่ 1 → 2 ในหน้า booking แล้วกด "เสร็จ"' });
    await until(async () => page.url() !== B1 && (await readPax(page)) === 2, 20_000);
    await gf.pause();
  });

  await test.step('5. จด URL = D-BKG-B2 · H2 · ราคาผู้ขายทุกเจ้า · ช่วงราคาปกติ ฿a2–฿b2 · ปุ่มผู้โดยสาร และข้อความจำนวนผู้ใหญ่', async () => {
    B2 = page.url();
    saveState('D-BKG-B2', B2);
    bk2 = await readBooking(page);
    recordBooking('TC-BKG-04 (2 คน)', top[0], bk2);
    saveState('BKG-04', { H1: bk1.H, H2: bk2.H, P1: top[0].price, row1: top[0] });
    note('D-BKG-B2', `${B2} · H2 ฿${bk2.H} · ช่วงปกติ ${JSON.stringify(bk2.range)} · ผู้โดยสาร ${bk2.pax} · ผู้ใหญ่ ${bk2.adults} ท่าน`);
    await gf.check('E3 ปุ่มผู้โดยสาร = 2 · ข้อความผู้ใหญ่ 2 ท่าน · D-BKG-B2 ≠ D-BKG-B1', [paxButton(page), page.getByText(/ผู้ใหญ่\s*\d+\s*ท่าน/).first()], async () => {
      expect.soft(bk2.pax, 'ปุ่มผู้โดยสาร').toBe(2);
      expect.soft(bk2.adults, 'ข้อความผู้ใหญ่ N ท่าน').toBe(2);
      expect.soft(B2, 'D-BKG-B2 ≠ D-BKG-B1').not.toBe(B1);
    });
    await gf.check('E4 H2 = 2 × H1 · ผู้ขายชื่อเดิมราคาใหม่ = 2 × ราคาเดิม ทุกเจ้า · H2 = ราคาผู้ขายต่ำสุด', [lowestPrice(page), page.getByRole('button', { name: CONTINUE })], async () => {
      expect.soft(bk2.H, 'H2 = 2 × H1').toBe(bk1.H === null ? -1 : 2 * bk1.H);
      const same = bk1.vendors.filter((v) => bk2.vendors.some((w) => w.name === v.name));
      expect.soft(same.length, 'มีผู้ขายชื่อเดียวกับขั้น 3').toBeGreaterThan(0);
      for (const v of same) {
        const w = bk2.vendors.find((x) => x.name === v.name)!;
        expect.soft(w.price, `${v.name}: ราคาใหม่ = 2 × ฿${v.price}`).toBe(v.price === null ? -1 : 2 * v.price);
      }
      expect.soft(bk2.H, 'H2 = ราคาผู้ขายต่ำสุด').toBe(minOf(bk2.vendors.map((v) => v.price)));
    });
    await gf.check('E5 ช่วงราคาปกติเป็นราคารวม 2 คน: a2 > a1 · b2 > b1 · a2 < b2', page.getByText(/ระหว่าง\s*฿/).first(), async () => {
      expect.soft(bk2.range, 'มีช่วงราคาปกติ ฿a2–฿b2').not.toBeNull();
      expect.soft(bk1.range, 'มีช่วงราคาปกติ ฿a1–฿b1 (ขั้น 3)').not.toBeNull();
      if (bk1.range && bk2.range) {
        expect.soft(bk2.range[0], 'a2 > a1').toBeGreaterThan(bk1.range[0]);
        expect.soft(bk2.range[1], 'b2 > b1').toBeGreaterThan(bk1.range[1]);
        expect.soft(bk2.range[0], 'a2 < b2').toBeLessThan(bk2.range[1]);
      }
    });
  });

  await test.step('6. กดปุ่ม ← รอ ≥ 10 วินาที อ่านหัวผลลัพธ์/ฟอร์ม และราคาของแถวที่ตัวตนตรงกับ 3 แถวในขั้น 2 · หยุดที่หน้านี้ ไม่กด Back', async () => {
    await safeClick(gf, backBtn(page), { search: '← จากหน้า booking 2 คน' });
    await waitRows(page).catch(() => {});
    await checkResultsHeader(gf, page, 'E6 หน้าผลลัพธ์แสดงผู้โดยสาร 2 · เที่ยวเดียว · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.', 2);
    const found: { id: Ident; P: number | null; now: number | null; row: Locator }[] = [];
    for (const t of top) {
      const hit = await findRow(allRows(page), t);
      if (hit) found.push({ id: t, P: t.price, now: (await readFlight(hit.row)).price, row: hit.row });
      else note('แถวหายไป (ข้าม)', `${t.dep} ${t.airline}`);
    }
    await gf.check('E7 แถวที่ตัวตนตรงกับขั้น 2 มีราคา = 2 × Pi ตรงตัว (พบ ≥ 1 แถว)', found.map((f) => f.row), async () => {
      expect.soft(found.length, 'พบแถวที่ตัวตนตรงกับขั้น 2 อย่างน้อย 1 แถว').toBeGreaterThan(0);
      for (const f of found) expect.soft(f.now, `${f.id.dep} ${f.id.airline}: ราคา = 2 × ฿${f.P}`).toBe(f.P === null ? -1 : 2 * f.P);
    });
  });
  gf.finishNA();
});

test('TC-BKG-05 · ⚠️ หลังเปลี่ยนผู้โดยสารแล้วกด Back จอต้องตรงกับ URL', {
  tag: ['@P1', '@5.5', '@known-defect'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1 (ขั้น 1) URL = `D-BKG-B2` และจอแสดงผู้โดยสาร 2 · ข้อความผู้ใหญ่ 2 ท่าน · ราคา = H2' },
    { type: 'คาดหวัง', description: 'E2 (ขั้น 2) URL = `D-BKG-B1` (สถานะผู้ใหญ่ 1 คน) และจอต้องแสดงผู้โดยสาร 1 · ข้อความผู้ใหญ่ 1 ท่าน · ราคา = H1 (= H2 ÷ 2)' },
    { type: 'คาดหวัง', description: 'E3 (ขั้น 3) หน้าผลลัพธ์แสดงผู้โดยสาร 1 และราคาของแถวที่ 1 = P1 (ราคา 1 คน) · เงื่อนไขอื่น = เที่ยวเดียว · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.' },
    { type: 'ที่มา', description: `${PLAN} · TC-BKG-05 · R117 ⚠️ · State · [R] · คาดว่าจะล้มที่ E2 (ข้อบกพร่องที่รู้แล้ว ตาราง 6.5)` },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, gf }) => {
  // context ใหม่ทุก test → ประวัติแท็บของ TC-BKG-04 ไม่ต่อมาถึงข้อนี้ = ใช้ทางสำรองตามเงื่อนไขก่อนเริ่มในแผน
  const UB = loadState<string>('UB') || '';
  const useUB = !!UB;
  const start = useUB ? UB : (loadState<string>('D-BKG-B1') || '');
  const rowRef = useUB
    ? loadState<Ident & { price: number | null }>('BKG-01-rowA')
    : (() => { const s = loadState<{ P1: number | null; row1: Ident }>('BKG-04'); return s ? { ...s.row1, price: s.P1 } : undefined; })();
  if (!start) throw new Error('ไม่มี UB (TC-BKG-01) และไม่มี D-BKG-B1 (TC-BKG-04) → ตั้งต้นข้อนี้ไม่ได้');
  note('ทางสำรอง', `TC-BKG-04 ไม่ได้จบที่สถานะนี้ในแท็บนี้ (context ใหม่ต่อ test) → เปิด ${useUB ? 'UB' : 'D-BKG-B1 (ไม่มี UB)'} ในแท็บใหม่ ตั้ง D-BKG-B1 = ค่านั้น`);

  let B1 = '';
  let B2 = '';
  let H1: number | null = null;
  let H2: number | null = null;
  const P1 = rowRef?.price ?? null;

  await test.step('เงื่อนไขก่อนเริ่ม (ทางสำรอง): เปิด UB ในแท็บใหม่ ตั้ง D-BKG-B1 = UB และ H1 = "ราคารวมที่ต่ำที่สุด"', async () => {
    await gf.goto(start, { booking: 'เปิด UB (ตั้งต้น TC-BKG-05)' });
    await waitBooking(page);
    B1 = page.url();
    H1 = (await readBooking(page)).H;
    note('D-BKG-B1 / H1', `${B1} · H1 ฿${H1}`);
  });
  await test.step('เงื่อนไขก่อนเริ่ม (ทางสำรอง): เปลี่ยนผู้ใหญ่เป็น 2 กด "เสร็จ" (+1) จด D-BKG-B2 และ H2', async () => {
    await safeClick(gf, paxButton(page));
    const dlg = page.getByRole('dialog', { name: 'จำนวนผู้โดยสาร' });
    await safeClick(gf, dlg.getByRole('button', { name: 'เพิ่มผู้ใหญ่' }));
    await safeClick(gf, dlg.getByRole('button', { name: 'เสร็จ', exact: true }), { search: 'เปลี่ยนผู้ใหญ่ 1 → 2 แล้วกด "เสร็จ" (ตั้งต้น)' });
    await until(async () => page.url() !== B1 && (await readPax(page)) === 2, 20_000);
    B2 = page.url();
    H2 = (await readBooking(page)).H;
    note('D-BKG-B2 / H2', `${B2} · H2 ฿${H2}`);
  });
  await test.step('เงื่อนไขก่อนเริ่ม (ทางสำรอง): กด ← (+1) ได้หน้าผลลัพธ์ 2 คน', async () => {
    await safeClick(gf, backBtn(page), { search: '← ไปหน้าผลลัพธ์ 2 คน (ตั้งต้น)' });
    await waitRows(page).catch(() => {});
    note('ประวัติแท็บ', `${B1} → ${B2} → ${page.url()}`);
  });

  const sameState = (a: string, b: string) => {
    const x = urlParts(a), y = urlParts(b);
    return x.path === y.path && x.tfs === y.tfs;
  };

  await test.step('1. กด Back ของเบราว์เซอร์ 1 ครั้ง รอโหลด อ่าน URL ตัวเลขบนปุ่มผู้โดยสาร ข้อความจำนวนผู้ใหญ่ และ "ราคารวมที่ต่ำที่สุด" · ถ่าย screenshot', async () => {
    await browserBack(gf, page);
    const url = page.url();
    const pax = await readPax(page);
    const adults = await readAdults(page);
    const H = money(await lowestPrice(page).innerText({ timeout: 10_000 }).catch(() => ''));
    note('ขั้น 1', `URL ${url} · ผู้โดยสาร ${pax} · ผู้ใหญ่ ${adults} ท่าน · ฿${H}`);
    await gf.check('E1 URL = D-BKG-B2 · จอแสดงผู้โดยสาร 2 · ผู้ใหญ่ 2 ท่าน · ราคา = H2', [paxButton(page), lowestPrice(page)], async () => {
      expect.soft(sameState(url, B2), `URL = D-BKG-B2 (path+tfs)\nได้   ${url}\nคาด  ${B2}`).toBe(true);
      expect.soft(pax, 'ปุ่มผู้โดยสาร').toBe(2);
      expect.soft(adults, 'ข้อความผู้ใหญ่ N ท่าน').toBe(2);
      expect.soft(H, 'ราคา = H2').toBe(H2);
    });
  });

  await test.step('2. กด Back อีก 1 ครั้ง รอโหลด อ่านค่าชุดเดียวกับขั้น 1 · ถ่าย screenshot (ห้ามรีเฟรช)', async () => {
    await browserBack(gf, page);
    const url = page.url();
    const pax = await readPax(page);
    const adults = await readAdults(page);
    const H = money(await lowestPrice(page).innerText({ timeout: 10_000 }).catch(() => ''));
    note('ขั้น 2', `URL ${url} · ผู้โดยสาร ${pax} · ผู้ใหญ่ ${adults} ท่าน · ฿${H}`);
    await gf.check('E2 URL = D-BKG-B1 (ผู้ใหญ่ 1) · จอต้องแสดงผู้โดยสาร 1 · ผู้ใหญ่ 1 ท่าน · ราคา = H1 (= H2 ÷ 2)', [paxButton(page), lowestPrice(page)], async () => {
      expect.soft(sameState(url, B1), `URL = D-BKG-B1 (path+tfs)\nได้   ${url}\nคาด  ${B1}`).toBe(true);
      expect.soft(pax, 'ปุ่มผู้โดยสาร').toBe(1);
      expect.soft(adults, 'ข้อความผู้ใหญ่ N ท่าน').toBe(1);
      expect.soft(H, 'ราคา = H1').toBe(H1);
      expect.soft(H1, 'H1 = H2 ÷ 2').toBe(H2 === null ? -1 : H2 / 2);
    });
  });

  await test.step('3. กดปุ่ม ← ในหน้านั้น รอ ≥ 10 วินาที อ่านหัวผลลัพธ์/ปุ่มผู้โดยสาร และราคาของแถวที่ตัวตนตรงกับแถวที่ 1', async () => {
    await safeClick(gf, backBtn(page), { search: '← หลัง Back 2 ครั้ง' });
    await waitRows(page).catch(() => {});
    await checkResultsHeader(gf, page, 'E3 หน้าผลลัพธ์แสดงผู้โดยสาร 1 · เที่ยวเดียว · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.', 1);
    const hit = rowRef ? await findRow(allRows(page), rowRef) : null;
    const now = hit ? (await readFlight(hit.row)).price : null;
    await gf.check(`E3 ราคาของแถวที่ 1 (${rowRef?.dep} ${rowRef?.airline}) = P1 ฿${P1} (ราคา 1 คน)`, hit ? hit.row : null, async () => {
      expect.soft(hit, 'พบแถวที่ตัวตนตรงกับแถวที่ 1').not.toBeNull();
      expect.soft(now, 'ราคา = P1').toBe(P1);
    });
  });
  gf.finishNA();
});

test('TC-BKG-06 · ⚠️ ผู้ขายราคาถูกสุดต้องเห็นชัด · ลิงก์แชร์คงภาษา/สกุลเงิน · กลับมาที่แถวเดิม', {
  tag: ['@P1', '@5.5', '@known-defect'],
  annotation: [
    { type: 'คาดหวัง', description: E1_TEXT },
    { type: 'คาดหวัง', description: 'E2 (ขั้น 5) ลูกค้าเห็นผู้ขายราคาถูกสุดชัดเจน = ข้อใดข้อหนึ่งเป็นจริง: (ก) ผู้ขายลำดับที่ 1 (บนสุด) มีราคา ≤ ราคาของผู้ขายทุกเจ้า หรือ (ข) แถวผู้ขายราคาต่ำสุดมีป้ายข้อความที่อ่านได้ใน snapshot (เช่น "ถูกที่สุด" / "ราคาต่ำสุด") · สีเขียวอย่างเดียวไม่นับ' },
    { type: 'คาดหวัง', description: 'E3 (ขั้น 7) ลิงก์แชร์เปิดได้เที่ยวบินเดิม (เวลาออก/ถึงเท่ากับที่ผู้แชร์เห็น)' },
    { type: 'คาดหวัง', description: 'E4 (ขั้น 7) ผู้รับลิงก์เห็นภาษาและสกุลเงินเดียวกับผู้แชร์: URL ปลายทางมี `hl=th` และ `curr=THB` หรือ (ถ้าไม่มีพารามิเตอร์) หัวข้อ/ปุ่มเป็นภาษาไทยและราคาใช้สัญลักษณ์ "฿" เหมือนหน้าผู้แชร์' },
    { type: 'คาดหวัง', description: 'E5 (ขั้น 8 และขั้น 4 ถ้ามี) หลังกด ← แถว X (เวลาออก + ชื่อสายการบิน) อยู่ใน screenshot ทันทีโดยไม่ต้องเลื่อน' },
    { type: 'ที่มา', description: `${PLAN} · TC-BKG-06 · R107 ⚠️ R115 ⚠️ R112 ⚠️ · Equivalence partition (ผู้ขาย ≥ 2 เจ้า) · State · [R] · คาดว่าจะล้มที่ E2 E4 E5 (ข้อบกพร่องที่รู้แล้ว ตาราง 6.5)` },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, context, gf }) => {
  let usedReserve = false;
  let order: Ident[] = [];
  let idX!: Ident;
  let fX!: Flight;
  let bk!: Booking;
  let share = '';

  await test.step('1. เปิด U1 ตรง รอ ≥ 10 วินาที อ่านหัวผลลัพธ์ (ต้องเป็นผู้โดยสาร 1 · ถ้าไม่ใช่ จดผลกระทบ R117 แล้วรีเฟรช 1 ครั้งด้วยงบสำรองของขั้น 4)', async () => {
    await gf.goto(getU1(), { search: 'เปิด U1' });
    await waitRows(page);
    await checkResultsHeader(gf, page, E1_LABEL, 1);
    if ((await readPax(page)) !== 1) {
      note('ผลกระทบ R117', `เปิด U1 แล้วผู้โดยสาร = ${await readPax(page)} → รีเฟรช 1 ครั้ง (ใช้งบสำรองขั้น 4 · ลองแถวที่ 2 ไม่ได้)`);
      usedReserve = true;
      await gf.pause();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await gf.searched('รีเฟรช U1 (งบสำรองขั้น 4)');
      await waitRows(page);
    }
    note('ภาษาเบราว์เซอร์', await page.evaluate(() => `${navigator.language} (${navigator.languages.join(', ')})`));
  });

  const openX = async (id: Ident, round: number) => {
    await test.step(`2. เลื่อนลงไปกลุ่ม "เที่ยวบินอื่นๆ" หาแถว X (${id.dep} ${id.airline}) จดตัวตนและลำดับในกลุ่ม · กด ˅ ขยายแถว X · ถ่าย screenshot ให้เห็นแถว X${round > 1 ? ' (รอบที่ 2)' : ''}`, async () => {
      const heading = page.getByRole('heading', { name: 'เที่ยวบินอื่นๆ', exact: true }).first();
      await heading.scrollIntoViewIfNeeded().catch(() => {});
      await gf.pause();
      const hit = await findRow(groupRows(page, 'เที่ยวบินอื่นๆ'), id);
      if (!hit) throw new Error(`หาแถว X (${id.dep} ${id.airline}) ในกลุ่ม "เที่ยวบินอื่นๆ" ไม่พบ`);
      fX = await readFlight(hit.row);
      idX = { dep: fX.dep, airline: fX.primary, group: 'เที่ยวบินอื่นๆ' };
      note('แถว X', `${fX.dep}–${fX.arr}${fX.plus} · ${fX.airlines.join(' · ')} · ลำดับที่ ${hit.index + 1} ของกลุ่ม "เที่ยวบินอื่นๆ" · ฿${fX.price}`);
      await gf.click(expandBtn(hit.row));
      await test.info().attach(`ขั้น 2: แถว X ${id.dep} ${id.airline} ในจอ`, { body: await page.screenshot(), contentType: 'image/png' });
    });
    await test.step(`3. กด "เลือกเที่ยวบิน" รอโหลด · อ่าน "ตัวเลือกการจอง" จากบนลงล่าง จดลำดับ ชื่อผู้ขาย ราคา ข้อความ/ป้ายของแต่ละแถว · N = จำนวนผู้ขาย${round > 1 ? ' (รอบที่ 2)' : ''}`, async () => {
      const hit = await findRow(groupRows(page, 'เที่ยวบินอื่นๆ'), idX);
      const row = hit ? hit.row : groupRows(page, 'เที่ยวบินอื่นๆ').nth(4);
      const sel = row.getByRole('button', { name: 'เลือกเที่ยวบิน', exact: true });
      if (!(await sel.isVisible().catch(() => false))) await gf.click(expandBtn(row));
      await gf.click(sel, { booking: `กด "เลือกเที่ยวบิน" แถว X ${idX.dep} ${idX.airline}` });
      await waitBooking(page);
      bk = await readBooking(page);
      recordBooking('TC-BKG-06', idX, bk);
      note('ตัวเลือกการจอง (บน → ล่าง)', bk.vendors.map((v, i) => `${i + 1}) ${v.name} ฿${v.price} [${v.text.replace(/\n/g, ' / ')}]`).join('\n'));
    });
  };

  const checkBackRow = async (label: string) => {
    // ห้ามเลื่อนหน้า: ตรวจตำแหน่งก่อน แล้วค่อยไฮไลต์เฉพาะเมื่ออยู่ในจออยู่แล้ว (ไฮไลต์จะไม่เลื่อนหน้า)
    const hit = await findRow(allRows(page), idX);
    const target = hit ? rowBody(hit.row) : null;
    const inView = target ? await inViewport(target) : false;
    const scrollY = await page.evaluate(() => window.scrollY);
    note('ตำแหน่งหลัง ←', `${idX.dep} ${idX.airline}: ${hit ? `พบแถว (ลำดับ ${hit.index + 1})` : 'ไม่พบแถว'} · อยู่ในจอ=${inView} · scrollY=${scrollY}`);
    await gf.check(label, inView ? target : null, async () => {
      expect.soft(hit, `พบแถว X ${idX.dep} ${idX.airline} ในหน้าผลลัพธ์`).not.toBeNull();
      expect.soft(inView, `แถว X ${idX.dep} ${idX.airline} อยู่ในภาพหน้าจอทันทีโดยไม่เลื่อน (scrollY=${scrollY})`).toBe(true);
    });
  };

  await test.step('เลือกแถว X: กลุ่ม "เที่ยวบินอื่นๆ" ลำดับที่ ≥ 5 · (ก) D-BKG-MULTI (ข) แถว codeshare แรก (ค) แถวที่ 5', async () => {
    const rows = groupRows(page, 'เที่ยวบินอื่นๆ');
    const n = await rows.count();
    if (n < 5) throw new Error(`กลุ่ม "เที่ยวบินอื่นๆ" มี ${n} แถว (< 5) เลือกแถว X ตามแผนไม่ได้`);
    const flights: { f: Flight; i: number }[] = [];
    for (let i = 4; i < n; i++) flights.push({ f: await readFlight(rows.nth(i)), i });
    const multi = loadState<Ident[]>('D-BKG-MULTI') || [];
    const a = flights.filter(({ f }) => multi.some((m) => m.dep === f.dep && sameName(m.airline, f.primary)));
    const b = flights.filter(({ f }) => f.airlines.length >= 2);
    const c = flights;
    const seen = new Set<number>();
    for (const x of [...a, ...b, ...c]) if (!seen.has(x.i)) { seen.add(x.i); order.push({ dep: x.f.dep, airline: x.f.primary }); }
    note('ลำดับแถว X', `D-BKG-MULTI=${JSON.stringify(multi)} · (ก) ${a.length} (ข) ${b.length} · ลำดับ: ${order.slice(0, 3).map((o) => `${o.dep} ${o.airline}`).join(' | ')}`);
  });

  await openX(order[0], 1);

  if (bk.vendors.length === 1 && !usedReserve && order.length > 1) {
    await test.step('4. N = 1: กด ← ไปตรวจ E5 กับแถวนี้ แล้วเลือกแถวถัดไปตามลำดับ ทำขั้น 2–3 ซ้ำ 1 ครั้ง', async () => {
      await safeClick(gf, backBtn(page), { search: '← (N = 1) ไปตรวจ E5 และลองแถวถัดไป' });
      await waitRows(page).catch(() => {});
      await checkBackRow(`E5 (ขั้น 4) หลังกด ← แถว X (${idX.dep} ${idX.airline}) อยู่ในจอทันทีโดยไม่เลื่อน`);
    });
    await openX(order[1], 2);
  } else if (bk.vendors.length === 1) {
    note('ขั้น 4', usedReserve ? 'ใช้งบสำรองไปแล้วในขั้น 1 → ลองแถวที่ 2 ไม่ได้' : 'ไม่มีแถวถัดไปให้ลอง');
  }

  await test.step('5. (N ≥ 2) เทียบราคาผู้ขายลำดับที่ 1 กับราคาต่ำสุดของทุกเจ้า และหาป้ายข้อความของผู้ขายราคาต่ำสุด', async () => {
    if (bk.vendors.length < 2) {
      gf.na('E2 ผู้ขายราคาถูกสุดเห็นชัด', `แถวที่ลองมีผู้ขาย ${bk.vendors.length} เจ้า = วันรันไม่มีแถวที่มีผู้ขาย ≥ 2 เจ้า (ตามเงื่อนไขก่อนเริ่มในแผน)`);
      return;
    }
    const min = minOf(bk.vendors.map((v) => v.price));
    const firstV = bk.vendors[0];
    const cheapest = bk.vendors.filter((v) => v.price === min);
    const LABEL = /ถูกที่สุด|ราคาต่ำสุด|ต่ำที่สุด|ราคาดีที่สุด|ประหยัดที่สุด|cheapest|lowest/i;
    const tagged = cheapest.filter((v) => LABEL.test(`${v.text} ${v.labels}`.replace(/ราคารวมที่ต่ำที่สุด/g, '')));
    const okA = firstV.price !== null && min !== null && firstV.price <= min;
    note('E2 รายละเอียด', `ลำดับ 1: ${firstV.name} ฿${firstV.price} · ต่ำสุด ฿${min} (${cheapest.map((v) => v.name).join(', ')}) · ป้ายข้อความที่ผู้ขายถูกสุด: ${tagged.length ? 'มี' : 'ไม่มี'}`);
    const cheapBtns = cheapest.map((v) => page.getByRole('button', { name: new RegExp(`^ดำเนินการต่อเพื่อจองกับ.*${v.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first());
    await gf.check('E2 (ก) ผู้ขายบนสุดราคา ≤ ทุกเจ้า หรือ (ข) ผู้ขายราคาต่ำสุดมีป้ายข้อความ (สีเขียวอย่างเดียวไม่นับ)',
      [page.getByRole('button', { name: CONTINUE }).first(), ...cheapBtns], async () => {
        expect.soft(okA || tagged.length > 0,
          `(ก) ${firstV.name} ฿${firstV.price} ≤ ต่ำสุด ฿${min}: ${okA} · (ข) ป้ายข้อความที่ผู้ขายราคาต่ำสุด: ${tagged.length > 0}`).toBe(true);
      });
  });

  let sharerTimes: string[] = [];
  let sharerUnit = '';
  await test.step('6. กดปุ่มแชร์ → "คัดลอกลิงก์" อ่านลิงก์ในกล่อง (= D-BKG-SHARE) · ปิดกล่องด้วย Esc · จดชื่อสายการบินและหน่วยราคาที่ผู้แชร์เห็น', async () => {
    const sum = await readFlight(bookingFlight(page));
    sharerTimes = [sum.dep, sum.arr];
    sharerUnit = (await lowestPrice(page).innerText().catch(() => '')).match(/฿|THB|[A-Z]{3}/)?.[0] || '';
    note('ผู้แชร์เห็น', `${sum.airlines.join(' · ')} · ${sum.dep}–${sum.arr} · หน่วยราคา "${sharerUnit}" · URL ${page.url()}`);
    await safeClick(gf, shareBtn(page));
    const dlg = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'แชร์เที่ยวบินนี้' }) }).first();
    await safeClick(gf, dlg.getByRole('button', { name: 'คัดลอกลิงก์', exact: true }).first());
    const shown = await dlg.locator('input').first().inputValue({ timeout: 3000 }).catch(() => '');
    const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    share = (shown || clip).trim();
    saveState('D-BKG-SHARE', share);
    note('D-BKG-SHARE', `ในกล่อง: ${shown || '-'} · clipboard: ${clip || '-'}`);
    await gf.press('Escape');
    if (!share) throw new Error('อ่านลิงก์แชร์ไม่ได้');
  });

  await test.step('7. เปิดแท็บใหม่ วาง D-BKG-SHARE รอโหลด อ่าน URL ปลายทางหลัง redirect (hl, curr) ภาษาหัวข้อ/ปุ่ม หน่วยราคา เวลาออก/ถึง · ปิดแท็บนี้กลับแท็บแรก', async () => {
    const p3 = await context.newPage();
    gf.use(p3);
    try {
      await gf.goto(share, { booking: 'เปิดลิงก์แชร์ D-BKG-SHARE ในแท็บใหม่' });
      await until(async () => (await p3.getByRole('main').count()) > 0 && /\d{1,2}:\d{2}/.test(await p3.getByRole('main').innerText().catch(() => '')), 20_000);
      const final = p3.url();
      const u = urlParts(final);
      const main = p3.getByRole('main');
      const mainText = await main.innerText().catch(() => '');
      const h1 = await p3.getByRole('heading', { level: 1 }).first().innerText().catch(() => '');
      const btnNames = (await main.getByRole('button').evaluateAll((els) => els.slice(0, 15).map((e) => e.getAttribute('aria-label') || (e as HTMLElement).innerText || ''))).join(' | ');
      const thai = /[฀-๿]/;
      const times = normTimes(mainText);
      note('ลิงก์แชร์ปลายทาง', `${final} · hl=${u.hl || '(ไม่มี)'} · curr=${u.curr || '(ไม่มี)'} · h1="${h1}" · ราคา ${mainText.match(/(฿|THB)\s?[\d,]+/)?.[0] || '-'}`);
      await gf.check(`E3 ลิงก์แชร์เปิดได้เที่ยวบินเดิม (เวลาออก ${sharerTimes[0]} / ถึง ${sharerTimes[1]})`, main, async () => {
        expect.soft(times, 'มีเวลาออกเท่ากับที่ผู้แชร์เห็น').toContain(sharerTimes[0]);
        expect.soft(times, 'มีเวลาถึงเท่ากับที่ผู้แชร์เห็น').toContain(sharerTimes[1]);
      });
      await gf.check('E4 ผู้รับเห็นภาษา/สกุลเงินเดียวกับผู้แชร์: URL มี hl=th และ curr=THB หรือ หัวข้อ/ปุ่มภาษาไทย + ราคาใช้ "฿"',
        [p3.getByRole('heading', { level: 1 }).first(), p3.getByText(/(฿|THB)\s?[\d,]+/).first()], async () => {
          const byParam = u.hl === 'th' && u.curr === 'THB';
          const byPage = thai.test(h1) && thai.test(btnNames) && /฿\s?[\d,]+/.test(mainText);
          expect.soft(byParam || byPage,
            `URL hl=${u.hl || '-'} curr=${u.curr || '-'} · หัวข้อ "${h1}" ไทย=${thai.test(h1)} · ปุ่มไทย=${thai.test(btnNames)} · ราคาใช้ ฿=${/฿\s?[\d,]+/.test(mainText)}`).toBe(true);
        });
    } finally {
      await p3.close().catch(() => {});
      gf.use(page);
      await page.bringToFront();
      await gf.pause();
    }
  });

  await test.step('8. ในหน้า booking กดปุ่ม ← รอ ≥ 10 วินาที ไม่เลื่อนหน้า ถ่าย screenshot ทันที', async () => {
    await safeClick(gf, backBtn(page), { search: '← จากหน้า booking แถว X' });
    await checkBackRow(`E5 (ขั้น 8) หลังกด ← แถว X (${idX.dep} ${idX.airline}) อยู่ใน screenshot ทันทีโดยไม่เลื่อน`);
  });
  gf.finishNA();
});

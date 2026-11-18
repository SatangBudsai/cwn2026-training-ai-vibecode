/**
 * 5.2 ผลลัพธ์และการจัดอันดับ (TC-RES-01 … TC-RES-07)
 * แหล่งความจริง: plan/5.2-ผลลัพธ์และการจัดอันดับ.md · งบค้นหารวม 19 ครั้ง
 *
 * โครงสร้างหน้าที่อ้างอิง (จาก exploration/C2.md, C5.md และ snapshot ใน .playwright-cli/*.yml):
 *  - แถวผลลัพธ์ = listitem ใน main ที่มีปุ่ม "รายละเอียดเที่ยวบิน …" (˅) · แถวสรุปมี role=link aria-label
 *    "ราคาเริ่มต้นที่ N บาทไทย เดินทางด้วยเที่ยวบิน… กับ <สายการบิน> ออกเดินทางจาก <สนามบิน> เวลา HH:MM ในวันที่ วัน<ชื่อวัน>, ธันวาคม D
 *     และเดินทางถึง … ระยะเวลารวม … การแวะพัก (ครั้งที่ i จาก n) ใช้เวลาแวะพัก … เลือกเที่ยวบิน"
 *  - แท็บ "ถูกที่สุด" ซ่อนอีกชุดแถวไว้ใน tabpanel ที่มองไม่เห็น → อ่านเฉพาะแถวที่มองเห็น
 *  - ไอคอนเตือนในแถวสรุป = svg ข้าง "หยุดพัก N ครั้ง" + aria-describedby ชี้ข้อความซ่อน (เช่น "แวะพักนาน")
 *  - แถวขยาย: aria-label "เวลาออกเดินทาง: HH:MM [วันที่ วัน…, ธันวาคม D]" / "เวลาถึง: …", ข้อความ "เวลาเดินทาง: …",
 *    รหัส "(BKK)", ป้าย "ข้ามคืน", จุดแวะ "หยุดพักนาน X · เมือง (SGN) · แวะพักนาน" / "… · เปลี่ยนจาก KIX ไปยัง ITM"
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect, getU1, SuiteStopError, type GF } from '../support/gf';

const PLAN = 'plan/5.2-ผลลัพธ์และการจัดอันดับ.md';

// ───────────────────────── ข้อมูลทดสอบ ─────────────────────────
/** D-RES-TZ (นาทีจาก UTC) · ธ.ค. ไม่มี DST */
const TZ: Record<string, number> = {
  BKK: 420, DMK: 420,
  HND: 540, NRT: 540, KIX: 540, ITM: 540, NGO: 540, FUK: 540, CTS: 540,
  ICN: 540, GMP: 540, PUS: 540,
  SGN: 420, HAN: 420, DAD: 420, PNH: 420, VTE: 420,
  RGN: 390,
  TPE: 480, KHH: 480, HKG: 480, MFM: 480,
  PVG: 480, SHA: 480, PEK: 480, PKX: 480, CAN: 480, SZX: 480, XMN: 480, CTU: 480, KMG: 480,
  MNL: 480, KUL: 480, SIN: 480,
  DEL: 330, BOM: 330, DXB: 240, AUH: 240, DOH: 180,
};
/** D-RES-LONG = แวะพักครั้งเดียว ≥ 12 ชม. */
const LONG = 12 * 60;
/** D-RES-LCC */
const LCC = /แอร์เอเชีย|air ?asia|เวียดเจ็ท|เวียดเจ๊ท|vietjet|ไทยไลอ้อน|thai lion|lion air|zipair|ซิปแอร์|hk express|ฮ่องกงเอ็กซ์เพรส|peach|พีช|scoot|สกู๊ต|jetstar|เจ็ทสตาร์|cebu|เซบู/i;

const WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const wdOf = (d: number) => WD[new Date(Date.UTC(2026, 11, d)).getUTCDay()];
const hm = (s: string) => { const m = /(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
const durMin = (s: string) => {
  const h = /(\d+)\s*ชม/.exec(s || ''); const m = /(\d+)\s*นาที/.exec(s || '');
  return h || m ? (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0) : NaN;
};
const mod = (n: number) => ((n % 1440) + 1440) % 1440;
const fmt = (n: number) => `${String(Math.floor(mod(n) / 60)).padStart(2, '0')}:${String(mod(n) % 60).padStart(2, '0')}`;
const fmtDur = (n: number) => (isNaN(n) ? '?' : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`);
const num = (s: string | undefined) => (s ? Number(s.replace(/[^\d]/g, '')) : NaN);
const top = (a: string[], n = 15) => (a.length > n ? [...a.slice(0, n), `… อีก ${a.length - n} รายการ`] : a);
const note = (type: string, description: string) => test.info().annotations.push({ type, description });

// ───────────────────────── ตัวระบุองค์ประกอบ ─────────────────────────
const MAIN = (page: Page) => page.getByRole('main').first();
const ROWS = (page: Page) =>
  MAIN(page).getByRole('listitem').filter({ has: page.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }) });
const MORE = (page: Page) => page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม', exact: true });
const CHEAP_TAB = (page: Page) => page.getByRole('tab', { name: /^ถูกที่สุด/ }).first();
const BEST_TAB = (page: Page) => page.getByRole('tab').filter({ hasText: 'ดีที่สุด' }).first();
const SORT_BTN = (page: Page) => page.getByRole('button', { name: /^จัดเรียงตาม.*เปลี่ยนลำดับการจัดเรียง/ }).first();
const RANK_INFO = /^ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ$/;
const COUNT_TEXT = (page: Page) => page.getByText(/มีผลลัพธ์\s*[\d,]+\s*รายการ/);

// ───────────────────────── อ่านแถวสรุป ─────────────────────────
type RawRow = {
  label: string; detail: string; arrText: string; text: string;
  warn: boolean; warnText: string; group: string; stopsLabel: string;
};
type Lay = { min: number; place: string; change: boolean };
type Row = {
  idx: number; label: string; detail: string; text: string; group: string;
  price: number | null; airline: string;
  origName: string; destName: string; orig: string; dest: string;
  depTime: string; depMin: number; depDay: number; depWd: string;
  arrTime: string; arrMin: number; arrDay: number; arrWd: string; arrN: number;
  sup: number; durMin: number; stops: number; layovers: Lay[]; maxLay: number;
  warn: boolean; warnText: string; key: string;
};

function parseRow(r: RawRow, idx: number): Row {
  const L = r.label || '';
  const src = /ออกเดินทางจาก/.test(L) ? L : r.detail;
  const price = /ราคาเริ่มต้นที่\s*([\d,]+)\s*บาทไทย/.exec(L);
  const airline = (/กับ\s+(.+?)\s+ออกเดินทางจาก/.exec(L)?.[1] || '').trim();
  const dep = /ออกเดินทางจาก\s+(.+?)\s+เวลา\s+(\d{1,2}:\d{2})\s+ในวันที่\s+วัน([^\s,]+),\s*ธันวาคม\s+(\d+)/.exec(src);
  const arr = /เดินทางถึง\s+(.+?)\s+เวลา\s+(\d{1,2}:\d{2})\s+ในวันที่\s+วัน([^\s,]+),\s*ธันวาคม\s+(\d+)/.exec(src);
  const dur = /ระยะเวลารวม\s+((?:\d+\s*ชม\.)?\s*(?:\d+\s*นาที)?)/.exec(L);
  let stops = NaN;
  const st = /แวะพัก\s+(\d+)\s+ครั้ง/.exec(L) || /หยุดพัก\s+(\d+)\s+ครั้ง/.exec(r.stopsLabel);
  if (st) stops = +st[1];
  else if (/เที่ยวบินตรง/.test(L + ' ' + r.stopsLabel)) stops = 0;
  const layovers: Lay[] = [];
  const re = /การแวะพัก \(ครั้งที่ \d+ จาก \d+\) ใช้เวลาแวะพัก\s+((?:\d+\s*ชม\.)?\s*(?:\d+\s*นาที)?)\s*(.*?)(?=\s*การแวะพัก \(|\s*เลือกเที่ยวบิน|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(L))) layovers.push({ min: durMin(m[1]), place: m[2].trim(), change: /เปลี่ยนจาก/.test(m[2]) });
  const codes = /\b([A-Z]{3})\s*[–\-]\s*([A-Z]{3})\b/.exec(r.text);
  const sup = /\+\s*(\d)/.exec(r.arrText);
  const depDay = dep ? +dep[4] : NaN;
  const arrDay = arr ? +arr[4] : NaN;
  const row: Row = {
    idx, label: L, detail: r.detail, text: r.text, group: r.group,
    price: price ? num(price[1]) : null, airline,
    origName: dep?.[1] || '', destName: arr?.[1] || '', orig: codes?.[1] || '', dest: codes?.[2] || '',
    depTime: dep?.[2] || '', depMin: hm(dep?.[2] || ''), depDay, depWd: dep?.[3] || '',
    arrTime: arr?.[2] || '', arrMin: hm(arr?.[2] || ''), arrDay, arrWd: arr?.[3] || '', arrN: arrDay - 15,
    sup: sup ? +sup[1] : 0, durMin: dur ? durMin(dur[1]) : NaN, stops, layovers,
    maxLay: layovers.length ? Math.max(...layovers.map((l) => l.min)) : 0,
    warn: r.warn || /เตือน/.test(L), warnText: r.warnText, key: '',
  };
  // D-RES-KEY: สายการบิน + เวลาออก + เวลาถึงพร้อมตัวยก + ระยะเวลารวม + จำนวนและสนามบินแวะพัก (ไม่รวมราคา)
  // + สนามบินต้น/ปลาย และเวลาแวะแต่ละจุด เพื่อไม่ให้แถวที่ต่างกันแค่เวลาแวะพักถูกนับเป็นแถวซ้ำ
  row.key = [airline, row.origName, row.depTime, row.destName, `${row.arrTime}+${row.arrN}`, row.durMin, stops,
    layovers.map((l) => `${l.place}/${l.min}`).join(';')].join('|');
  return row;
}

const desc = (r: Row) =>
  `#${r.idx + 1} ${r.airline || '?'} ${r.orig}${r.depTime}→${r.dest}${r.arrTime}${r.arrN > 0 ? '+' + r.arrN : ''} ` +
  `(${fmtDur(r.durMin)}, แวะ ${r.stops}) ${r.price != null ? '฿' + r.price.toLocaleString('en-US') : 'ไม่มีข้อมูลราคา'}`;

/** อ่านทุกแถวที่มองเห็นในรายการ (ตามลำดับบนจอ) */
async function readRows(page: Page): Promise<Row[]> {
  const raws: RawRow[] = await ROWS(page).evaluateAll((els) => {
    const vis = (e: Element) => (typeof (e as any).checkVisibility === 'function' ? (e as any).checkVisibility() : true);
    const FOLLOWING = 4;
    const heads = Array.from(document.querySelectorAll('h2, h3, [role="heading"]')).filter(vis);
    return els.filter(vis).map((li) => {
      const btn = li.querySelector('[aria-label^="รายละเอียดเที่ยวบิน"]');
      const before = (e: Element) => !btn || !!(e.compareDocumentPosition(btn) & FOLLOWING);
      const labeled = Array.from(li.querySelectorAll('[aria-label]')).filter((e) => e !== btn && before(e));
      const lab = (e: Element) => e.getAttribute('aria-label') || '';
      const link = labeled.find((e) => (e.getAttribute('role') === 'link' || e.tagName === 'A') && /ออกเดินทางจาก/.test(lab(e)))
        || labeled.find((e) => /ราคา.*ออกเดินทางจาก|ออกเดินทางจาก.*ระยะเวลารวม/.test(lab(e)));
      const arr = labeled.find((e) => /^เวลาถึง:/.test(lab(e)) && vis(e)) as HTMLElement | undefined;
      const stops = labeled.find((e) => /^เที่ยวบินแบบหยุดพัก|^เที่ยวบินตรง/.test(lab(e)));
      const cell = stops ? stops.parentElement : null;
      let warn = !!(cell && cell.querySelector('svg'));
      let warnText = '';
      const scope = cell ? cell.parentElement || cell : null;
      if (scope) {
        scope.querySelectorAll('[aria-describedby]').forEach((d) => {
          (d.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).forEach((id) => {
            const t = (document.getElementById(id)?.textContent || '').trim();
            if (t) warnText += t + ' ';
          });
          if (d.querySelector('svg')) warn = true;
        });
      }
      let group = '';
      for (const h of heads) if (!li.contains(h) && h.compareDocumentPosition(li) & FOLLOWING) group = (h.textContent || '').trim();
      return {
        label: link ? lab(link) : '', detail: btn ? lab(btn) : '', arrText: arr ? arr.innerText : '',
        text: (li as HTMLElement).innerText || '', warn, warnText: warnText.trim(), group, stopsLabel: stops ? lab(stops) : '',
      };
    });
  });
  return raws.map((r, i) => parseRow(r, i));
}

/** หัวข้อ (h2/h3) ที่มองเห็นใน main ตามลำดับ */
async function listHeadings(page: Page): Promise<string[]> {
  return MAIN(page).evaluate((root) => {
    const vis = (e: Element) => (typeof (e as any).checkVisibility === 'function' ? (e as any).checkVisibility() : true);
    return Array.from(root.querySelectorAll('h2, h3, [role="heading"]')).filter(vis).map((h) => (h.textContent || '').trim());
  }).catch(() => [] as string[]);
}

// ───────────────────────── อ่านแถวขยาย ─────────────────────────
type Tok = { k: 'dep' | 'arr' | 'code' | 'dur' | 'night' | 'lay'; label?: string; text: string };
type Leg = {
  depTime: string; depMin: number; depSup: number; depDay: number | null; depCode: string;
  arrTime: string; arrMin: number; arrSup: number; arrDay: number | null; arrCode: string;
  durMin: number; night: boolean;
};
type XLay = { text: string; min: number; from: string; to: string };
type Expanded = { legs: Leg[]; lays: XLay[] };

async function readLegTokens(li: Locator): Promise<Tok[]> {
  return li.evaluate((root) => {
    const vis = (e: Element) => (typeof (e as any).checkVisibility === 'function' ? (e as any).checkVisibility() : true);
    const FOLLOWING = 4;
    const btn = root.querySelector('[aria-label^="รายละเอียดเที่ยวบิน"]');
    const after = (e: Element) => !btn || !!(btn.compareDocumentPosition(e) & FOLLOWING);
    const norm = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
    const toks: { k: any; label?: string; text: string }[] = [];
    const layEls: Element[] = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      const e = n as HTMLElement;
      if (!after(e) || (btn && btn.contains(e)) || !vis(e)) continue;
      const al = e.getAttribute('aria-label') || '';
      const parentAl = e.parentElement?.getAttribute('aria-label') || '';
      if (/^เวลาออกเดินทาง:/.test(al) && parentAl !== al) { toks.push({ k: 'dep', label: al, text: e.innerText }); continue; }
      if (/^เวลาถึง:/.test(al) && parentAl !== al) { toks.push({ k: 'arr', label: al, text: e.innerText }); continue; }
      if (layEls.some((l) => l.contains(e))) continue;
      const tc = norm(e.textContent);
      const ptc = norm(e.parentElement?.textContent);
      if (/^(หยุดพัก|แวะพัก)/.test(tc) && /\d/.test(tc) && !/^(หยุดพัก|แวะพัก)/.test(ptc)) { layEls.push(e); toks.push({ k: 'lay', text: tc }); continue; }
      if (/^\(\s*[A-Z]{3}\s*\)$/.test(tc)) { toks.push({ k: 'code', text: tc.replace(/[^A-Z]/g, '') }); continue; }
      if (/^เวลาเดินทาง:/.test(tc) && !/^เวลาเดินทาง:/.test(ptc)) { toks.push({ k: 'dur', text: tc }); continue; }
      if (/^ข้ามคืน/.test(tc) && tc.length < 20) toks.push({ k: 'night', text: tc });
    }
    return toks;
  }) as Promise<Tok[]>;
}

function assemble(toks: Tok[]): Expanded {
  const legs: Leg[] = []; const lays: XLay[] = [];
  let cur: Leg | null = null; let pending: 'dep' | 'arr' | null = null;
  const t = (x: Tok) => ({
    time: /:\s*(\d{1,2}:\d{2})/.exec(x.label || '')?.[1] || '',
    day: /ธันวาคม\s+(\d+)/.exec(x.label || '') ? +/ธันวาคม\s+(\d+)/.exec(x.label || '')![1] : null,
    sup: /\+\s*(\d)/.exec(x.text || '') ? +/\+\s*(\d)/.exec(x.text || '')![1] : 0,
  });
  for (const x of toks) {
    if (x.k === 'dep') {
      const v = t(x);
      cur = { depTime: v.time, depMin: hm(v.time), depSup: v.sup, depDay: v.day, depCode: '', arrTime: '', arrMin: NaN, arrSup: 0, arrDay: null, arrCode: '', durMin: NaN, night: false };
      legs.push(cur); pending = 'dep';
    } else if (x.k === 'arr' && cur) {
      const v = t(x);
      cur.arrTime = v.time; cur.arrMin = hm(v.time); cur.arrSup = v.sup; cur.arrDay = v.day; pending = 'arr';
    } else if (x.k === 'code' && cur) {
      if (pending === 'dep' && !cur.depCode) cur.depCode = x.text;
      else if (pending === 'arr' && !cur.arrCode) cur.arrCode = x.text;
      pending = null;
    } else if (x.k === 'dur' && cur) {
      cur.durMin = durMin(x.text.replace(/^เวลาเดินทาง:/, ''));
    } else if (x.k === 'night' && cur) {
      cur.night = true;
    } else if (x.k === 'lay') {
      const ch = /เปลี่ยนจาก\s*([A-Z]{3})\s*ไปยัง\s*([A-Z]{3})/.exec(x.text);
      lays.push({ text: x.text, min: durMin(x.text.split('·')[0]), from: ch?.[1] || '', to: ch?.[2] || '' });
      pending = null;
    }
  }
  return { legs, lays };
}

/** หาแถวเดิมในรายการปัจจุบัน (ตามลำดับ แล้วยืนยันด้วยชื่อปุ่ม ˅) */
async function rowLocator(page: Page, r: Row): Promise<Locator> {
  const li = ROWS(page).nth(r.idx);
  const d = await li.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first().getAttribute('aria-label').catch(() => null);
  if (d === r.detail) return li;
  return ROWS(page).filter({ has: page.getByRole('button', { name: r.detail, exact: true }) }).first();
}

/** กด ˅ ท้ายแถว แล้วอ่านขาบิน/จุดแวะในแถวขยาย */
async function expandRow(page: Page, gf: GF, r: Row): Promise<{ li: Locator; x: Expanded }> {
  const li = await rowLocator(page, r);
  await gf.click(li.getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first());
  await li.getByText(/เวลาเดินทาง:/).first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  const x = assemble(await readLegTokens(li));
  note('แถวขยาย', `${desc(r)} → ${x.legs.map((g) => `${g.depCode} ${g.depTime}${g.depSup ? '+' + g.depSup : ''}–${g.arrCode} ${g.arrTime}${g.arrSup ? '+' + g.arrSup : ''} (${fmtDur(g.durMin)}${g.night ? ', ข้ามคืน' : ''})`).join(' | ')} · แวะ: ${x.lays.map((l) => l.text).join(' | ') || '-'}`);
  return { li, x };
}

// ───────────────────────── ขั้นตอนร่วม ─────────────────────────
/** เปิด U1 (1 การค้นหา) + ตรวจหัวผลลัพธ์ตามโจทย์ลูกค้า · ไม่ตรง = หยุด test (ปัญหาข้อมูลทดสอบ) */
async function openU1(page: Page, gf: GF) {
  await gf.goto(getU1(), { search: 'เปิด U1' });
  const typeBox = page.getByRole('combobox', { name: /ประเภทตั๋ว/ }).first();
  const pax = page.getByRole('button', { name: /เปลี่ยนจำนวนผู้โดยสาร/ }).first();
  const cls = page.getByRole('combobox', { name: /ชั้นโดยสาร/ }).first();
  const from = page.getByRole('combobox', { name: 'ต้นทาง', exact: true }).first();
  const to = page.getByRole('combobox', { name: 'ปลายทาง', exact: true }).first();
  const date = page.getByRole('textbox', { name: 'ขาไป', exact: true }).first();
  await from.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  await ROWS(page).first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  const v = {
    ประเภทตั๋ว: (await typeBox.innerText().catch(() => '')).trim(),
    ผู้โดยสาร: ((await pax.getAttribute('aria-label').catch(() => null)) || (await pax.innerText().catch(() => ''))).trim(),
    ชั้นโดยสาร: (await cls.innerText().catch(() => '')).trim(),
    ต้นทาง: await from.inputValue().catch(() => ''),
    ปลายทาง: await to.inputValue().catch(() => ''),
    ขาไป: await date.inputValue().catch(() => ''),
  };
  const ok = /เที่ยวเดียว/.test(v.ประเภทตั๋ว) && (/ผู้โดยสาร 1 คน/.test(v.ผู้โดยสาร) || v.ผู้โดยสาร === '1')
    && /ชั้นประหยัด/.test(v.ชั้นโดยสาร) && /กรุงเทพมหานคร/.test(v.ต้นทาง) && /โตเกียว/.test(v.ปลายทาง) && /อังคาร 15 ธ\.ค\./.test(v.ขาไป);
  await gf.check('ก่อนเริ่ม หัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค.', [typeBox, pax, cls, from, to, date], async () => {
    expect.soft(ok, `หัวผลลัพธ์ต้องตรงนิยาม U1 · อ่านได้ ${JSON.stringify(v)}`).toBe(true);
  });
  if (!ok) {
    note('ปัญหาข้อมูลทดสอบ', `หัวผลลัพธ์ไม่ตรง U1: ${JSON.stringify(v)}`);
    throw new Error('หัวผลลัพธ์ไม่ตรงโจทย์ U1 → หยุด test นี้ (บันทึกเป็นปัญหาข้อมูลทดสอบ)');
  }
}

/** กด "ดูเที่ยวบินเพิ่มเติม" (1 การค้นหา) · คืน false ถ้าไม่มีปุ่ม */
async function loadMore(page: Page, gf: GF, reason: string): Promise<boolean> {
  const btn = MORE(page).first();
  if ((await MORE(page).count()) === 0) return false;
  const before = await ROWS(page).count();
  await gf.click(btn, { search: reason });
  for (let i = 0; i < 20 && (await ROWS(page).count()) <= before; i++) await page.waitForTimeout(1000);
  return true;
}

/** เปลี่ยนการเรียง (1 การค้นหา) */
async function sortBy(page: Page, gf: GF, option: string, reason: string) {
  await gf.click(SORT_BTN(page));
  await gf.click(page.getByRole('menuitemradio', { name: option, exact: true }), { search: reason });
  await ROWS(page).first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
}

async function readPTab(page: Page): Promise<{ p: number | null; raw: string }> {
  const tab = CHEAP_TAB(page);
  const raw = `${(await tab.getAttribute('aria-label').catch(() => null)) || ''} ${(await tab.innerText().catch(() => '')).replace(/\s+/g, ' ')}`;
  const m = /เริ่มต้น\s*฿?\s*([\d,]+)/.exec(raw);
  return { p: m ? num(m[1]) : null, raw: raw.trim() };
}

async function readCount(page: Page): Promise<number | null> {
  const texts = await COUNT_TEXT(page).allTextContents().catch(() => [] as string[]);
  const m = texts.map((t) => /มีผลลัพธ์\s*([\d,]+)\s*รายการ/.exec(t)).find(Boolean);
  return m ? num(m[1]) : null;
}

/** คลิกที่อาจกดไม่ติด (ⓘ ทับพื้นที่คลิก Q10/Q14) — คืนข้อความ error แทนการล้มทั้ง test · ไม่กลืน SuiteStopError */
async function tryClick(gf: GF, loc: Locator): Promise<string | null> {
  try { await gf.click(loc); return null; } catch (e) {
    if (e instanceof SuiteStopError) throw e;
    return String((e as Error)?.message || e).split('\n')[0];
  }
}

async function visibleDialogText(page: Page): Promise<{ n: number; text: string }> {
  const dlg = page.getByRole('dialog');
  const n = await dlg.count();
  const texts: string[] = [];
  for (let i = 0; i < n; i++) texts.push(await dlg.nth(i).innerText().catch(() => ''));
  return { n, text: texts.join(' ').replace(/ปิดกล่องโต้ตอบ|ดูข้อมูลเพิ่มเติม/g, '').replace(/\s+/g, ' ').trim() };
}

async function closeDialog(page: Page, gf: GF) {
  await gf.press('Escape');
  const close = page.getByRole('dialog').getByRole('button', { name: 'ปิดกล่องโต้ตอบ' });
  if ((await page.getByRole('dialog').count()) > 0 && (await close.count()) > 0) await tryClick(gf, close.first());
}

// ───────────────────────── ตัวช่วยตรวจลำดับ/ชุด ─────────────────────────
/** คู่ (ก่อน, ถัดไป) ที่ค่าลดลง */
function decreasing(rows: Row[], val: (r: Row) => number, show: (r: Row) => string): string[] {
  const bad: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const a = val(rows[i - 1]), b = val(rows[i]);
    if (!isNaN(a) && !isNaN(b) && b < a) bad.push(`${desc(rows[i - 1])} [${show(rows[i - 1])}] → ${desc(rows[i])} [${show(rows[i])}]`);
  }
  return bad;
}
/** ตัวตัดสิน: คู่ติดกันที่ค่าหลักเท่ากัน ค่ารองต้องไม่ลดลง */
function tieBreak(rows: Row[], same: (a: Row, b: Row) => boolean, second: (r: Row) => number): { pairs: number; bad: string[] } {
  let pairs = 0; const bad: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (!same(a, b)) continue;
    const x = second(a), y = second(b);
    if (isNaN(x) || isNaN(y)) continue;
    pairs++;
    if (y < x) bad.push(`${desc(a)} → ${desc(b)}`);
  }
  return { pairs, bad };
}
function compareSets(base: Row[], other: Row[]) {
  const baseKeys = new Map(base.map((r) => [r.key, r]));
  const seen = new Map<string, number>();
  other.forEach((r) => seen.set(r.key, (seen.get(r.key) || 0) + 1));
  const missing = base.filter((r) => !seen.has(r.key)).map(desc);
  const extra = other.filter((r) => !baseKeys.has(r.key)).map(desc);
  const dups = other.filter((r) => (seen.get(r.key) || 0) > 1).map(desc);
  const priceChanged = other.filter((r) => baseKeys.has(r.key) && baseKeys.get(r.key)!.price !== r.price)
    .map((r) => `${desc(r)} (เดิม ฿${baseKeys.get(r.key)!.price})`);
  return { missing, extra, dups, priceChanged };
}
const priced = (rows: Row[]) => rows.filter((r) => r.price != null);
const priceOf = (r: Row) => (r.price == null ? NaN : r.price);

/** K-TZ / D-RES-TZ: เวลาถึงที่คาด และ +N ที่คาด ต่อแถวสรุป */
function timeAudit(rows: Row[]) {
  const e1: string[] = [], e2: string[] = [], e3: string[] = [], skip: string[] = [];
  for (const r of rows) {
    if (!(r.depDay === 15 && r.depWd === 'อังคาร')) e3.push(`${desc(r)} · aria วันออก = วัน${r.depWd || '?'} ${r.depDay} ธ.ค.`);
    const oz = TZ[r.orig || 'BKK'], dz = TZ[r.dest || 'HND'];
    if (oz == null || dz == null) { skip.push(`${desc(r)} · สนามบิน ${r.orig}/${r.dest} ไม่อยู่ใน D-RES-TZ`); continue; }
    if (isNaN(r.depMin) || isNaN(r.durMin) || isNaN(r.arrMin)) { e1.push(`${desc(r)} · อ่านเวลา/ระยะเวลาจาก aria ไม่ได้`); continue; }
    const exp = r.depMin + r.durMin + (dz - oz);
    const expN = Math.floor(exp / 1440);
    if (mod(exp) !== r.arrMin) e1.push(`${desc(r)} · ถึงบนจอ ${r.arrTime} คาด ${fmt(exp)}`);
    if (r.sup !== expN || r.arrDay !== 15 + expN || r.arrWd !== wdOf(15 + expN)) {
      e2.push(`${desc(r)} · บนจอ +${r.sup} / aria วัน${r.arrWd} ${r.arrDay} ธ.ค. · คาด +${expN} / วัน${wdOf(15 + expN)} ${15 + expN} ธ.ค.`);
    }
  }
  return { e1, e2, e3, skip };
}

/** R42: ตรวจรายขาของแถวขยาย (E5–E8 ของ TC-RES-01) */
function legAudit(r: Row, x: Expanded) {
  const e5: string[] = [], e6: string[] = [], e7: string[] = [], e8: string[] = [], skip: string[] = [];
  const L = x.legs;
  const tag = (i: number) => `${desc(r)} ขา ${i + 1} ${L[i]?.depCode || '?'}→${L[i]?.arrCode || '?'}`;
  if (!L.length) { const m = `${desc(r)} · อ่านขาบินในแถวขยายไม่ได้`; e5.push(m); e6.push(m); e7.push(m); e8.push(m); return { e5, e6, e7, e8, skip }; }
  const f = L[0], l = L[L.length - 1];
  if (f.depCode !== r.orig || f.depTime !== r.depTime) e5.push(`${desc(r)} · ขาแรกออก ${f.depCode} ${f.depTime} ≠ แถวสรุป ${r.orig} ${r.depTime}`);
  if (l.arrCode !== r.dest || l.arrTime !== r.arrTime || l.arrSup !== r.sup) e5.push(`${desc(r)} · ขาสุดท้ายถึง ${l.arrCode} ${l.arrTime}+${l.arrSup} ≠ แถวสรุป ${r.dest} ${r.arrTime}+${r.sup}`);
  // E6
  const layMin = (i: number) => (!isNaN(x.lays[i]?.min ?? NaN) ? x.lays[i].min : r.layovers[i]?.min ?? NaN);
  const sum = L.reduce((s, g) => s + g.durMin, 0) + L.slice(0, -1).reduce((s, _g, i) => s + layMin(i), 0);
  if (sum !== r.durMin) e6.push(`${desc(r)} · ขาบิน ${L.map((g) => fmtDur(g.durMin)).join(' + ')} + แวะ ${L.slice(0, -1).map((_g, i) => fmtDur(layMin(i))).join(' + ') || '0'} = ${fmtDur(sum)} ≠ ${fmtDur(r.durMin)}`);
  // E7/E8 — ห่วงโซ่เวลาท้องถิ่นนับจาก 15 ธ.ค.
  const supOk = (sup: number, day: number | null, what: string, i: number) => {
    if (day != null && day - 15 !== sup) e8.push(`${tag(i)} ${what}: ตัวยก +${sup} แต่ aria วันที่ ${day} ธ.ค.`);
    if (day == null && sup !== 0) e8.push(`${tag(i)} ${what}: ตัวยก +${sup} แต่ aria ไม่มีวันที่ (= 15 ธ.ค.)`);
  };
  if (f.depSup !== 0) e8.push(`${tag(0)} เวลาออกขาแรกมีตัวยก +${f.depSup} (ต้องออก 15 ธ.ค.)`);
  let depAbs = f.depSup * 1440 + f.depMin;
  for (let i = 0; i < L.length; i++) {
    const g = L[i];
    supOk(g.depSup, g.depDay, 'ออก', i); supOk(g.arrSup, g.arrDay, 'ถึง', i);
    const dz = TZ[g.depCode], az = TZ[g.arrCode];
    let arrAbs: number;
    if (dz == null || az == null || isNaN(g.durMin)) {
      skip.push(`${tag(i)} · รหัสสนามบิน ${[g.depCode, g.arrCode].filter((c) => TZ[c] == null).join(', ') || '?'} ไม่อยู่ใน D-RES-TZ (ข้าม E7 ของขานี้)`);
      arrAbs = g.arrSup * 1440 + g.arrMin;
    } else {
      arrAbs = depAbs + g.durMin + (az - dz);
      if (mod(arrAbs) !== g.arrMin) e7.push(`${tag(i)} · ถึงบนจอ ${g.arrTime} คาด ${fmt(arrAbs)} (ออก ${fmt(depAbs)} + ${fmtDur(g.durMin)} ${az - dz >= 0 ? '+' : ''}${(az - dz) / 60} ชม.)`);
      if (Math.floor(arrAbs / 1440) !== g.arrSup) e8.push(`${tag(i)} · เวลาถึงตัวยก +${g.arrSup} คาด +${Math.floor(arrAbs / 1440)}`);
    }
    if (i < L.length - 1) {
      const nx = L[i + 1]; const lay = layMin(i);
      const nz = TZ[nx.depCode];
      if (nz == null || az == null || isNaN(lay)) {
        skip.push(`${tag(i + 1)} · ต่อจากจุดแวะ ${g.arrCode}/${nx.depCode} ไม่อยู่ใน D-RES-TZ หรืออ่านเวลาแวะไม่ได้`);
        depAbs = nx.depSup * 1440 + nx.depMin;
      } else {
        depAbs = arrAbs + lay + (nz - az);
        if (mod(depAbs) !== nx.depMin) e7.push(`${tag(i + 1)} · ออกบนจอ ${nx.depTime} คาด ${fmt(depAbs)} (ถึงขาก่อน + แวะ ${fmtDur(lay)})`);
        if (Math.floor(depAbs / 1440) !== nx.depSup) e8.push(`${tag(i + 1)} · เวลาออกตัวยก +${nx.depSup} คาด +${Math.floor(depAbs / 1440)}`);
      }
    }
  }
  if (l.arrSup !== r.sup) e8.push(`${desc(r)} · ตัวยกขาสุดท้าย +${l.arrSup} ≠ ตัวยกแถวสรุป +${r.sup}`);
  return { e5, e6, e7, e8, skip };
}

// ═════════════════════════ TESTS ═════════════════════════

test('TC-RES-01 · เวลาออก–ถึง และ +N ทุกแถว', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ข้อ 3) ทุกแถวในชุดแรก: เวลาถึงบนจอ = เวลาถึงที่คาด ตรงถึงนาที' },
    { type: 'คาดหวัง', description: 'E2: (ข้อ 3) ทุกแถว: ตัวยกบนจอ = +N ที่คาด (N = 0 ต้องไม่มีตัวยก) และวันที่ถึงใน aria = 15 ธ.ค. + N วัน โดยชื่อวันตรงกับวันที่ (16 = พุธ, 17 = พฤหัสบดี)' },
    { type: 'คาดหวัง', description: 'E3: (ข้อ 2) วันที่ออกใน aria ของทุกแถว = อังคาร 15 ธ.ค.' },
    { type: 'คาดหวัง', description: 'E4: (ข้อ 4) E1–E3 เป็นจริงกับทุกแถวหลังดูเพิ่ม (นับจำนวนแถวที่ตรวจและจำนวนแถวที่ไม่ตรงเป็น 0)' },
    { type: 'คาดหวัง', description: 'E5: (ข้อ 5) แถวขยาย: ขาแรกออกจากสนามบินและเวลาเดียวกับแถวสรุป · ขาสุดท้ายถึงสนามบินและเวลา (รวม +N) เดียวกับแถวสรุป' },
    { type: 'คาดหวัง', description: 'E6: (ข้อ 6) ผลรวมระยะเวลาขาบิน + ผลรวมแวะพัก = ระยะเวลารวมในแถวสรุป ตรงถึงนาที' },
    { type: 'คาดหวัง', description: 'E7: (ข้อ 6) ทุกขา: เวลาถึงบนจอ = เวลาถึงที่คาดของขานั้น · เวลาออกของขาถัดไป = เวลาถึงขาก่อน + เวลาแวะพัก' },
    { type: 'คาดหวัง', description: 'E8: (ข้อ 5) ตัวยกของทุกเวลาในแถวขยาย = จำนวนวันที่ผ่านไปนับจาก 15 ธ.ค. ตามเวลาท้องถิ่นของสนามบินนั้น และตัวยกของขาสุดท้าย = ตัวยกในแถวสรุป' },
    { type: 'ที่มา', description: `${PLAN} · TC-RES-01 · R40 R41 R42 · Invariant/Metamorphic · [R]` },
    { type: 'งบค้นหา', description: '2' },
  ],
}, async ({ page, gf }) => {
  let rows0: Row[] = [];
  let rowsAll: Row[] = [];
  let more = false;
  const expanded: { r: Row; li: Locator; x: Expanded }[] = [];

  await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ = เที่ยวเดียว · 1 · ชั้นประหยัด · กรุงเทพมหานคร → โตเกียว · อังคาร 15 ธ.ค. · รอ ≥ 10 วินาที', async () => {
    await openU1(page, gf);
  });

  await test.step('2. อ่าน aria-label ทุกแถว (กลุ่มยอดนิยมและอื่นๆ): เวลาออก/ถึง + วันที่, ตัวยก +N, ระยะเวลารวม, จำนวนแวะพัก, สนามบินออก/ถึง', async () => {
    rows0 = await readRows(page);
    note('ชุดแรก', `${rows0.length} แถว`);
    const a = timeAudit(rows0);
    await gf.check('E3 วันที่ออกใน aria ทุกแถว = อังคาร 15 ธ.ค.', ROWS(page), async () => {
      expect.soft(rows0.length, 'ต้องมีแถวผลลัพธ์ในชุดแรก').toBeGreaterThan(0);
      expect.soft(top(a.e3), `แถวที่วันออกใน aria ไม่ใช่ วันอังคาร 15 ธ.ค. (ตรวจ ${rows0.length} แถว)`).toEqual([]);
    });
  });

  await test.step('3. คำนวณต่อแถว: นาทีถึงที่คาด = เวลาออก + ระยะเวลารวม + 120 (หรือส่วนต่าง D-RES-TZ) · เวลาถึง = mod 1440 · N = ⌊/1440⌋', async () => {
    const a = timeAudit(rows0);
    if (a.skip.length) note('ส่งต่อ 5.1', `ต้นทาง/ปลายทางไม่อยู่ใน D-RES-TZ: ${a.skip.join(' · ')}`);
    await gf.check('E1 เวลาถึงบนจอ = เวลาออก + ระยะเวลา + 2 ชม. ทุกแถวชุดแรก', ROWS(page), async () => {
      expect.soft(rows0.length - a.skip.length, 'จำนวนแถวที่ตรวจได้').toBeGreaterThan(0);
      expect.soft(top(a.e1), `แถวที่เวลาถึงไม่ตรงเวลาที่คาด (ตรวจ ${rows0.length - a.skip.length} แถว)`).toEqual([]);
    });
    await gf.check('E2 ตัวยก +N และวันที่/ชื่อวันใน aria ตรงกับวันที่ข้าม', ROWS(page), async () => {
      expect.soft(top(a.e2), `แถวที่ตัวยกหรือวันที่ถึงไม่ตรง (ตรวจ ${rows0.length - a.skip.length} แถว)`).toEqual([]);
    });
  });

  await test.step('4. กด "ดูเที่ยวบินเพิ่มเติม" (ค้นหาครั้งที่ 2) · รอ ≥ 10 วินาที · ทำข้อ 2–3 กับทุกแถวในรายการใหม่', async () => {
    more = await loadMore(page, gf, 'ดูเที่ยวบินเพิ่มเติม');
    if (!more) { gf.na('E4 E1–E3 ทุกแถวหลังดูเพิ่ม', 'ไม่มีปุ่ม "ดูเที่ยวบินเพิ่มเติม"'); return; }
    rowsAll = await readRows(page);
    const a = timeAudit(rowsAll);
    note('หลังดูเพิ่ม', `${rowsAll.length} แถว · ตรวจได้ ${rowsAll.length - a.skip.length} · ไม่ตรง E1 ${a.e1.length} / E2 ${a.e2.length} / E3 ${a.e3.length}`);
    if (a.skip.length) note('ส่งต่อ 5.1', `ต้นทาง/ปลายทางไม่อยู่ใน D-RES-TZ: ${top(a.skip).join(' · ')}`);
    await gf.check(`E4 E1–E3 ทุกแถวหลังดูเพิ่ม (${rowsAll.length} แถว) ไม่ตรง = 0`, ROWS(page), async () => {
      expect.soft(rowsAll.length - a.skip.length, `จำนวนแถวที่ตรวจหลังดูเพิ่ม (ชุดแรก ${rows0.length} แถว)`).toBeGreaterThan(0);
      expect.soft(top(a.e1), 'E1 หลังดูเพิ่ม: แถวที่เวลาถึงไม่ตรง').toEqual([]);
      expect.soft(top(a.e2), 'E2 หลังดูเพิ่ม: แถวที่ตัวยก/วันที่ถึงไม่ตรง').toEqual([]);
      expect.soft(top(a.e3), 'E3 หลังดูเพิ่ม: แถวที่วันออกไม่ใช่ อังคาร 15 ธ.ค.').toEqual([]);
    });
  });

  await test.step('5. เลือกแถวขยาย ≤ 3 แถว: (ก) แวะมากที่สุด (ข) แถว +2 หรือระยะเวลานานที่สุด (ค) บินตรงถึง +1 หรือบินตรงแรก · กด ˅ · จดรายขา', async () => {
    const pool = more ? rowsAll : rows0;
    const valid = pool.filter((r) => !isNaN(r.stops));
    const maxStops = Math.max(...valid.map((r) => r.stops));
    const picks: Row[] = [];
    const add = (r: Row | undefined, why: string) => { if (r && !picks.some((p) => p.idx === r.idx)) { picks.push(r); note('เลือกแถวขยาย', `${why}: ${desc(r)}`); } };
    add(valid.find((r) => r.stops === maxStops), '(ก) แวะพักมากที่สุด');
    add(valid.find((r) => r.arrN === 2) ?? [...valid].sort((a, b) => b.durMin - a.durMin)[0], '(ข) +2 / ระยะเวลานานที่สุด');
    add(valid.find((r) => r.stops === 0 && r.arrN === 1) ?? valid.find((r) => r.stops === 0), '(ค) บินตรง +1 / บินตรงแรก');
    for (const r of picks) expanded.push({ r, ...(await expandRow(page, gf, r)) });
    const audits = expanded.map((e) => legAudit(e.r, e.x));
    await gf.check('E5 ขาแรก/ขาสุดท้ายในแถวขยาย = สนามบินและเวลาในแถวสรุป', expanded.map((e) => e.li), async () => {
      expect.soft(expanded.length, 'จำนวนแถวที่ขยาย').toBeGreaterThan(0);
      expect.soft(audits.flatMap((a) => a.e5), 'แถวขยายที่ขาแรก/ขาสุดท้ายไม่ตรงแถวสรุป').toEqual([]);
    });
    await gf.check('E8 ตัวยกทุกเวลาในแถวขยาย = วันที่ผ่านไปจาก 15 ธ.ค. (เวลาท้องถิ่น) · ขาสุดท้าย = แถวสรุป', expanded.map((e) => e.li), async () => {
      expect.soft(audits.flatMap((a) => a.e8), 'ตัวยกในแถวขยายที่ไม่ตรง').toEqual([]);
    });
  });

  await test.step('6. คำนวณต่อแถวขยาย: ผลรวมขาบิน + แวะพัก และเวลาถึงที่คาดของแต่ละขา (D-RES-TZ)', async () => {
    const audits = expanded.map((e) => legAudit(e.r, e.x));
    const skips = audits.flatMap((a) => a.skip);
    if (skips.length) note('ข้อสังเกต', `สนามบินไม่อยู่ใน D-RES-TZ: ${skips.join(' · ')}`);
    const anyLay = expanded.some((e) => e.x.legs.length > 1);
    if (!anyLay) gf.na('E6–E7 ส่วนแวะพัก', 'ไม่มีแถวแวะพักในแถวที่ขยาย (ตรวจแถวบินตรงอย่างเดียว)');
    await gf.check('E6 ขาบิน + แวะพัก = ระยะเวลารวมในแถวสรุป', expanded.map((e) => e.li), async () => {
      expect.soft(expanded.length, 'จำนวนแถวที่ขยาย').toBeGreaterThan(0);
      expect.soft(audits.flatMap((a) => a.e6), 'แถวที่ผลรวมระยะเวลาไม่ตรง').toEqual([]);
    });
    const legsTotal = expanded.reduce((s, e) => s + e.x.legs.length, 0);
    const legsSkipped = audits.reduce((s, a) => s + a.skip.filter((t) => /ข้าม E7 ของขานี้/.test(t)).length, 0);
    if (legsTotal > 0 && legsSkipped >= legsTotal) {
      gf.na('E7 เวลาถึงรายขา', 'ทุกขามีสนามบินที่ไม่อยู่ใน D-RES-TZ');
    } else {
      await gf.check('E7 เวลาถึงรายขา = ออก + ระยะเวลาขา + ส่วนต่าง UTC · ออกขาถัดไป = ถึงขาก่อน + แวะพัก', expanded.map((e) => e.li), async () => {
        expect.soft(audits.flatMap((a) => a.e7), 'ขาที่เวลาไม่ตรงที่คาด').toEqual([]);
      });
    }
  });
  gf.finishNA();
});

test('TC-RES-02 · แท็บดีที่สุด ราคาบนแท็บ ⓘ และข้อความเงื่อนไขราคา', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ข้อ 2) P_tab = ราคาต่ำสุดในบรรดาทุกแถวที่มีราคาบนหน้า' },
    { type: 'คาดหวัง', description: 'E2: (ข้อ 5) "เริ่มที่ ฿…" ในปฏิทิน = P_tab · ราคาในช่อง 15 ธ.ค. = P_tab หรือเป็น P_tab ที่ปัดเศษหลักร้อย [O-ยังไม่ยืนยัน: รูปแบบการปัดในช่องปฏิทินมาจาก R37/Q08]' },
    { type: 'คาดหวัง', description: 'E3: (ข้อ 2) แท็บดีที่สุดมีกลุ่ม "เที่ยวบินยอดนิยม" (≥ 1 แถว) อยู่ก่อนกลุ่ม "เที่ยวบินอื่นๆ" [O-ยังไม่ยืนยัน: ชื่อและโครงสร้างกลุ่ม]' },
    { type: 'คาดหวัง', description: 'E4: (ข้อ 2) ในกลุ่ม "เที่ยวบินอื่นๆ" ราคาแถวถัดไป ≥ แถวก่อนหน้าทุกคู่ [O-ยังไม่ยืนยัน: เกณฑ์เรียงของกลุ่มนี้มาจากผลสำรวจ]' },
    { type: 'คาดหวัง', description: 'E5: (ข้อ 4) ป๊อปอัป ⓘ เปิดขึ้นและมีข้อความอธิบายเกณฑ์จัดอันดับที่ไม่ว่าง · ข้อความระบุว่า "ดีที่สุด" พิจารณาทั้งราคาและความสะดวก ไม่ใช่ราคาอย่างเดียว [O-ยังไม่ยืนยัน: เนื้อหาข้อความ]' },
    { type: 'คาดหวัง', description: 'E6: (ข้อ 3) ข้อความใต้หัวรายการบอกครบ 3 เรื่อง: ราคารวมภาษีและค่าธรรมเนียม · ราคาต่อผู้ใหญ่ 1 ท่าน (ตรง D-PAX-1) · ไม่รวมค่าสัมภาระ/อาจมีค่าธรรมเนียมสัมภาระ' },
    { type: 'คาดหวัง', description: 'E7: (ข้อ 3) ข้อความท้ายหน้าบอกว่าข้อมูลราคาอาจไม่เป็นปัจจุบัน (อัปเดตไม่เกิน 24 ชม.) และสกุลเงินที่ชำระจริงอาจต่างจาก THB ที่แสดง [O-ยังไม่ยืนยัน: รอบ 24 ชม. และถ้อยคำ]' },
    { type: 'ที่มา', description: `${PLAN} · TC-RES-02 · R43 R44 R45 R61 · Invariant/Metamorphic · Happy path · [O-ยังไม่ยืนยัน]` },
    { type: 'งบค้นหา', description: '1' },
  ],
}, async ({ page, gf }) => {
  let P: number | null = null;
  let rows: Row[] = [];

  await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ตามโจทย์ลูกค้า · รอ ≥ 10 วินาที · อยู่แท็บ "ดีที่สุด" (ค่าเริ่มต้น ห้ามกดแท็บอื่น)', async () => {
    await openU1(page, gf);
    const sel = await BEST_TAB(page).getAttribute('aria-selected').catch(() => null);
    note('แท็บที่เลือก', `ดีที่สุด aria-selected = ${sel}`);
  });

  await test.step('2. จดราคาจากชื่อแท็บ "ถูกที่สุด" (P_tab) · จดหัวกลุ่มตามลำดับ และราคาทุกแถวในแต่ละกลุ่ม (ข้ามแถว "ไม่มีข้อมูลราคา")', async () => {
    const t = await readPTab(page);
    P = t.p;
    rows = await readRows(page);
    const heads = await listHeadings(page);
    note('P_tab', `${t.raw} → ${P}`);
    note('หัวข้อตามลำดับ', heads.join(' › '));
    const pr = priced(rows);
    const min = pr.length ? Math.min(...pr.map((r) => r.price!)) : NaN;
    await gf.check('E1 ราคาบนแท็บ "ถูกที่สุด" = ราคาต่ำสุดในรายการ', [CHEAP_TAB(page), ROWS(page)], async () => {
      expect.soft(P, `อ่านราคาจากแท็บ "ถูกที่สุด" ได้ (${t.raw})`).not.toBeNull();
      expect.soft(P, `P_tab ต้อง = ราคาต่ำสุดของ ${pr.length} แถวที่มีราคา (${pr.filter((r) => r.price === min).map(desc).join(', ')})`).toBe(min);
    });
    const popular = rows.filter((r) => /เที่ยวบินยอดนิยม/.test(r.group));
    const others = rows.filter((r) => /เที่ยวบินอื่น/.test(r.group));
    const iPop = heads.findIndex((h) => /^เที่ยวบินยอดนิยม/.test(h));
    const iOth = heads.findIndex((h) => /^เที่ยวบินอื่น/.test(h));
    await gf.check('E3 กลุ่ม "เที่ยวบินยอดนิยม" (≥ 1 แถว) อยู่ก่อนกลุ่ม "เที่ยวบินอื่นๆ"', [page.getByRole('heading', { name: /^เที่ยวบินยอดนิยม|^เที่ยวบินอื่น/ })], async () => {
      expect.soft(popular.length, 'จำนวนแถวในกลุ่ม "เที่ยวบินยอดนิยม"').toBeGreaterThanOrEqual(1);
      expect.soft(iPop, `มีหัวกลุ่ม "เที่ยวบินยอดนิยม" (หัวข้อ: ${heads.join(' › ')})`).toBeGreaterThanOrEqual(0);
      expect.soft(iOth, `มีหัวกลุ่ม "เที่ยวบินอื่นๆ" (หัวข้อ: ${heads.join(' › ')})`).toBeGreaterThanOrEqual(0);
      expect.soft(iPop >= 0 && iOth >= 0 && iPop < iOth, '"เที่ยวบินยอดนิยม" ต้องมาก่อน "เที่ยวบินอื่นๆ"').toBe(true);
    });
    const othersPriced = priced(others);
    await gf.check('E4 กลุ่ม "เที่ยวบินอื่นๆ" ราคาไม่ลดลงทุกคู่', ROWS(page).filter({ hasNot: page.getByText('ไม่มีข้อมูลราคา') }), async () => {
      expect.soft(othersPriced.length, 'จำนวนแถวมีราคาในกลุ่ม "เที่ยวบินอื่นๆ"').toBeGreaterThan(0);
      expect.soft(top(decreasing(othersPriced, priceOf, (r) => `฿${r.price}`)), 'คู่ที่ราคาลดลงในกลุ่ม "เที่ยวบินอื่นๆ"').toEqual([]);
    });
  });

  await test.step('3. อ่านข้อความใต้หัวรายการ และข้อความท้ายหน้าผลลัพธ์ จดคำต่อคำ', async () => {
    const headLoc = MAIN(page).getByText(/ราคารวมภาษี/).first();
    const headText = ((await headLoc.locator('xpath=..').innerText().catch(() => '')) || (await headLoc.innerText().catch(() => ''))).replace(/\s+/g, ' ');
    const footLoc = page.getByText(/ราคานี้เป็นราคาสุดท้าย/).first();
    const curLoc = page.getByText(/สกุลเงินที่แสดง/).first();
    const footText = (await footLoc.innerText().catch(() => '')).replace(/\s+/g, ' ');
    const curText = (await curLoc.innerText().catch(() => '')).replace(/\s+/g, ' ');
    note('ข้อความใต้หัวรายการ', headText || '(ไม่พบ)');
    note('ข้อความท้ายหน้า', `${curText} || ${footText}` || '(ไม่พบ)');
    await gf.check('E6 ข้อความใต้หัวรายการ: รวมภาษี+ค่าธรรมเนียม · ผู้ใหญ่ 1 ท่าน · ค่าสัมภาระ', headLoc, async () => {
      expect.soft(headText, 'บอกว่าราคารวมภาษีและค่าธรรมเนียม').toMatch(/รวมภาษี.*ค่าธรรมเนียม/);
      expect.soft(headText, 'บอกว่าเป็นราคาต่อผู้ใหญ่ 1 ท่าน (D-PAX-1)').toMatch(/ผู้ใหญ่\s*1\s*ท่าน/);
      expect.soft(headText, 'บอกว่าไม่รวมค่าสัมภาระ/อาจมีค่าธรรมเนียมสัมภาระ').toMatch(/สัมภาระ/);
    });
    await gf.check('E7 ข้อความท้ายหน้า: อัปเดตไม่เกิน 24 ชม. · สกุลเงินที่ชำระอาจต่างจาก THB', [footLoc, curLoc], async () => {
      expect.soft(footText, 'บอกว่าข้อมูลราคาอาจไม่เป็นปัจจุบัน (อัปเดตไม่เกิน 24 ชม.)').toMatch(/24\s*(ชั่วโมง|ชม)/);
      expect.soft(curText, 'บอกว่าสกุลเงินที่ชำระจริงอาจต่างจากที่แสดง').toMatch(/สกุลเงิน.*(แตกต่าง|ต่างจาก)/);
    });
  });

  await test.step('4. กด ⓘ ข้างแท็บ · อ่านข้อความในป๊อปอัป · ปิดด้วย Esc/ปุ่มปิด', async () => {
    const info = BEST_TAB(page).getByRole('button', { name: RANK_INFO }).first();
    const err = await tryClick(gf, info);
    if (err) note('ข้อสังเกต', `กด ⓘ ข้างแท็บไม่ติด: ${err}`);
    const d = await visibleDialogText(page);
    note('ข้อความ ⓘ', d.text || '(ว่าง)');
    await gf.check('E5 ป๊อปอัป ⓘ อธิบายการจัดอันดับ: ทั้งราคาและความสะดวก', d.n ? page.getByRole('dialog') : info, async () => {
      expect.soft(d.n, 'ป๊อปอัป ⓘ เปิดขึ้น').toBeGreaterThan(0);
      expect.soft(d.text.length, 'ข้อความอธิบายไม่ว่าง').toBeGreaterThan(0);
      expect.soft(d.text, 'ข้อความกล่าวถึงราคา').toMatch(/ราคา/);
      expect.soft(d.text, 'ข้อความกล่าวถึงความสะดวก (ไม่ใช่ราคาอย่างเดียว)').toMatch(/สะดวก|ระยะเวลา|หยุดพัก|แวะพัก/);
    });
    if (d.n) await closeDialog(page, gf);
  });

  await test.step('5. คลิกช่อง "ขาไป" เปิดปฏิทิน · อ่านราคาช่อง 15 ธ.ค. และ "เริ่มที่ ฿…" · Esc ปิดปฏิทิน (ห้ามกด "เสร็จ") · ตรวจว่าหัวผลลัพธ์ยังเป็นวันเดิม', async () => {
    const urlBefore = page.url();
    const firstBefore = rows[0]?.detail || '';
    const dateBox = page.getByRole('textbox', { name: 'ขาไป', exact: true }).first();
    await gf.click(dateBox);
    const cal = page.getByRole('dialog').filter({ has: page.getByRole('gridcell') }).first();
    const day = cal.getByRole('button', { name: /^วัน\S+ที่ 15 ธันวาคม ค\.ศ\. 2026/ }).first();
    await day.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    let startLoc = cal.getByText(/เริ่มที่\s*฿/);
    if ((await startLoc.count()) === 0) {
      // ยอด "เริ่มที่" มุมล่างขึ้นหลังเลือกวัน — กดวันเดิม (15 ธ.ค. ที่เลือกอยู่แล้ว) ไม่ใช่ปุ่ม "เสร็จ"
      await tryClick(gf, day);
      startLoc = cal.getByText(/เริ่มที่\s*฿/);
    }
    const dayText = await day.evaluate((el) => [el.getAttribute('aria-label') || '',
      ...Array.from(el.querySelectorAll('[aria-label]')).map((x) => x.getAttribute('aria-label') || ''), (el as HTMLElement).innerText].join(' ')).catch(() => '');
    const cellPrice = num(/([\d,]+)\s*บาทไทย/.exec(dayText)?.[1] || /฿\s*([\d,]+)/.exec(dayText)?.[1]);
    const startText = (await startLoc.first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    const startPrice = num(/เริ่มที่\s*฿\s*([\d,]+)/.exec(startText)?.[1]);
    note('ปฏิทิน 15 ธ.ค.', `${dayText.replace(/\s+/g, ' ')} · ${startText || '(ไม่พบ "เริ่มที่")'}`);
    await gf.check('E2 ปฏิทิน: "เริ่มที่ ฿…" = P_tab · ช่อง 15 ธ.ค. = P_tab หรือปัดเศษหลักร้อย', [day, startLoc.first()], async () => {
      expect.soft(startPrice, `"เริ่มที่ ฿…" ในปฏิทิน (${startText || 'ไม่พบ'}) = P_tab`).toBe(P);
      const ok = P != null && (cellPrice === P || cellPrice === Math.round(P / 100) * 100);
      expect.soft(ok, `ราคาช่อง 15 ธ.ค. ${cellPrice} ต้อง = P_tab ${P} หรือ ${P != null ? Math.round(P / 100) * 100 : '?'}`).toBe(true);
    });
    await gf.press('Escape');
    const firstAfter = (await readRows(page))[0]?.detail || '';
    await gf.check('ข้อ 5 ปิดปฏิทินแล้วหัวผลลัพธ์ยังเป็นวันเดิมและไม่โหลดใหม่', dateBox, async () => {
      await expect.soft(page.getByRole('dialog').filter({ has: page.getByRole('gridcell') }), 'ปฏิทินปิดแล้ว').toHaveCount(0);
      await expect.soft(dateBox, 'ช่องขาไปยังเป็นวันเดิม').toHaveValue(/อังคาร 15 ธ\.ค\./);
      expect.soft(page.url(), 'URL ไม่เปลี่ยน (ไม่ค้นหาใหม่)').toBe(urlBefore);
      expect.soft(firstAfter, 'แถวแรกยังเป็นแถวเดิม (ไม่โหลดใหม่)').toBe(firstBefore);
    });
  });
  gf.finishNA();
});

test('TC-RES-03 · เรียงตามราคา และเวลาออกเดินทาง', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ข้อ 2) L1: ราคาแถวถัดไป ≥ แถวก่อนหน้าทุกคู่ และราคาแถวแรก = P_tab' },
    { type: 'คาดหวัง', description: 'E2: (ข้อ 2) รายการไม่ถูกแบ่งเป็นกลุ่มยอดนิยม/อื่นๆ อีก มีหัวรายการเดียว ("เที่ยวบินทั้งหมด" [O-ยังไม่ยืนยัน: ถ้อยคำหัวรายการ])' },
    { type: 'คาดหวัง', description: 'E3: (ข้อ 2) L1 แถวที่ราคาเท่ากัน: เวลาออกเร็วกว่าอยู่ก่อน [O-ยังไม่ยืนยัน: ตัวตัดสินมาจากผลสำรวจ]' },
    { type: 'คาดหวัง', description: 'E4: (ข้อ 2) จำนวนแถว L1 = n0 และชุดคีย์ L1 = S0 (ไม่มีแถวหาย ไม่มีแถวซ้ำ)' },
    { type: 'คาดหวัง', description: 'E5: (ข้อ 3) L2: เวลาออกแถวถัดไป ≥ แถวก่อนหน้าทุกคู่ (ทุกแถวออกวันที่ 15 ธ.ค.)' },
    { type: 'คาดหวัง', description: 'E6: (ข้อ 3) L2 แถวที่เวลาออกเท่ากัน: ราคาถูกกว่าอยู่ก่อน [O-ยังไม่ยืนยัน: ตัวตัดสินมาจากผลสำรวจ]' },
    { type: 'คาดหวัง', description: 'E7: (ข้อ 3) จำนวนแถว L2 = n0 และชุดคีย์ L2 = S0' },
    { type: 'ที่มา', description: `${PLAN} · TC-RES-03 · R48 R49 R50 R51 R52 R43 · Invariant/Metamorphic · State · [O-ยังไม่ยืนยัน]` },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, gf }) => {
  let S0: Row[] = []; let P: number | null = null;

  await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ตามโจทย์ลูกค้า · รอ ≥ 10 วินาที · จดชุดแถว S0 (D-RES-KEY + ราคา), n0 และ P_tab', async () => {
    await openU1(page, gf);
    S0 = await readRows(page);
    P = (await readPTab(page)).p;
    note('S0', `n0 = ${S0.length} · P_tab = ${P}`);
  });

  await test.step('2. กด "จัดเรียงตามเที่ยวบินยอดนิยม" → เลือก "ราคา" (ค้นหาครั้งที่ 2) · รอ ≥ 10 วินาที · จดหัวรายการและ L1 (คีย์ + ราคา + เวลาออก)', async () => {
    await sortBy(page, gf, 'ราคา', 'จัดเรียงตามราคา');
    const L1 = await readRows(page);
    const heads = await listHeadings(page);
    note('L1', `${L1.length} แถว · หัวข้อ: ${heads.join(' › ')}`);
    await gf.check('E1 L1 ราคาไม่ลดลงทุกคู่ และแถวแรก = P_tab', ROWS(page), async () => {
      expect.soft(L1.length, 'มีแถวหลังเรียงตามราคา').toBeGreaterThan(0);
      expect.soft(top(decreasing(priced(L1), priceOf, (r) => `฿${r.price}`)), 'คู่ที่ราคาลดลง').toEqual([]);
      expect.soft(L1[0]?.price ?? null, `ราคาแถวแรก (${L1[0] ? desc(L1[0]) : '-'}) = P_tab`).toBe(P);
    });
    const groups = [...new Set(L1.map((r) => r.group))];
    await gf.check('E2 ไม่แบ่งกลุ่มยอดนิยม/อื่นๆ มีหัวรายการเดียว "เที่ยวบินทั้งหมด"', page.getByRole('heading', { name: /^เที่ยวบิน/ }), async () => {
      expect.soft(heads.filter((h) => /^เที่ยวบินยอดนิยม|^เที่ยวบินอื่น/.test(h)), 'ต้องไม่มีหัวกลุ่มยอดนิยม/อื่นๆ').toEqual([]);
      expect.soft(groups, 'ทุกแถวอยู่ใต้หัวรายการเดียว "เที่ยวบินทั้งหมด"').toEqual([expect.stringMatching(/^เที่ยวบินทั้งหมด/)]);
    });
    const tb = tieBreak(priced(L1), (a, b) => a.price === b.price, (r) => r.depMin);
    if (tb.pairs === 0) gf.na('E3 ราคาเท่ากัน → เวลาออกเร็วกว่าอยู่ก่อน', 'ไม่มีแถวราคาซ้ำ');
    else await gf.check(`E3 ราคาเท่ากัน (${tb.pairs} คู่) → เวลาออกเร็วกว่าอยู่ก่อน`, ROWS(page), async () => {
      expect.soft(top(tb.bad), 'คู่ราคาเท่ากันที่เวลาออกช้ากว่าอยู่ก่อน').toEqual([]);
    });
    const cs = compareSets(S0, L1);
    if (cs.priceChanged.length) note('ราคาเปลี่ยน (ข้อมูลสด 6.4)', top(cs.priceChanged).join(' · '));
    await gf.check('E4 จำนวนแถว L1 = n0 และชุดคีย์ = S0', ROWS(page), async () => {
      expect.soft(L1.length, 'จำนวนแถว L1 = n0').toBe(S0.length);
      expect.soft(top(cs.missing), 'แถวใน S0 ที่หายจาก L1').toEqual([]);
      expect.soft(top(cs.extra), 'แถวใน L1 ที่ไม่อยู่ใน S0').toEqual([]);
      expect.soft(top(cs.dups), 'แถวซ้ำใน L1').toEqual([]);
    });
  });

  await test.step('3. กดปุ่มจัดเรียงอีกครั้ง → เลือก "เวลาออกเดินทาง" (ค้นหาครั้งที่ 3) · รอ ≥ 10 วินาที · จด L2 (คีย์ + เวลาออก + ราคา)', async () => {
    await sortBy(page, gf, 'เวลาออกเดินทาง', 'จัดเรียงตามเวลาออกเดินทาง');
    const L2 = await readRows(page);
    note('L2', `${L2.length} แถว`);
    await gf.check('E5 L2 เวลาออกไม่ลดลงทุกคู่ และทุกแถวออก 15 ธ.ค.', ROWS(page), async () => {
      expect.soft(L2.length, 'มีแถวหลังเรียงตามเวลาออก').toBeGreaterThan(0);
      expect.soft(top(decreasing(L2, (r) => r.depMin, (r) => r.depTime)), 'คู่ที่เวลาออกลดลง').toEqual([]);
      expect.soft(top(L2.filter((r) => r.depDay !== 15).map(desc)), 'แถวที่ไม่ได้ออกวันที่ 15 ธ.ค.').toEqual([]);
    });
    const tb = tieBreak(L2, (a, b) => a.depMin === b.depMin, priceOf);
    if (tb.pairs === 0) gf.na('E6 เวลาออกเท่ากัน → ราคาถูกกว่าอยู่ก่อน', 'ไม่มีแถวเวลาออกซ้ำ');
    else await gf.check(`E6 เวลาออกเท่ากัน (${tb.pairs} คู่) → ราคาถูกกว่าอยู่ก่อน`, ROWS(page), async () => {
      expect.soft(top(tb.bad), 'คู่เวลาออกเท่ากันที่ราคาแพงกว่าอยู่ก่อน').toEqual([]);
    });
    const cs = compareSets(S0, L2);
    if (cs.priceChanged.length) note('ราคาเปลี่ยน (ข้อมูลสด 6.4)', top(cs.priceChanged).join(' · '));
    await gf.check('E7 จำนวนแถว L2 = n0 และชุดคีย์ = S0', ROWS(page), async () => {
      expect.soft(L2.length, 'จำนวนแถว L2 = n0').toBe(S0.length);
      expect.soft(top(cs.missing), 'แถวใน S0 ที่หายจาก L2').toEqual([]);
      expect.soft(top(cs.extra), 'แถวใน L2 ที่ไม่อยู่ใน S0').toEqual([]);
      expect.soft(top(cs.dups), 'แถวซ้ำใน L2').toEqual([]);
    });
  });
  gf.finishNA();
});

test('TC-RES-04 · เรียงตามเวลาถึง / ระยะเวลา และดูเพิ่มคงการเรียง', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ข้อ 2) L3 เรียงตามคู่ (N, เวลาถึง) ไม่ลดลง: แถวที่ไม่มีตัวยกทั้งหมดอยู่ก่อนแถว +1 และแถว +1 ทั้งหมดอยู่ก่อนแถว +2 · ภายในวันเดียวกันเวลาถึงไม่ลดลง' },
    { type: 'คาดหวัง', description: 'E2: (ข้อ 2) L3 แถวที่ (N, เวลาถึง) เท่ากัน: ราคาถูกกว่าอยู่ก่อน [O-ยังไม่ยืนยัน: ตัวตัดสินมาจากผลสำรวจ]' },
    { type: 'คาดหวัง', description: 'E3: (ข้อ 3) L4: ระยะเวลาแถวถัดไป ≥ แถวก่อนหน้าทุกคู่ · แถวที่ระยะเวลาเท่ากัน: ราคาถูกกว่าอยู่ก่อน [O-ยังไม่ยืนยัน: ตัวตัดสิน]' },
    { type: 'คาดหวัง', description: 'E4: (ข้อ 2–3) จำนวนแถว L3 = L4 = n0 และชุดคีย์ของทั้งสอง = S0' },
    { type: 'คาดหวัง', description: 'E5: (ข้อ 4) ทุกแถวของ L4 อยู่ใน L5 · จำนวนแถว L5 ≥ L4 · ไม่มีคีย์ซ้ำใน L5' },
    { type: 'คาดหวัง', description: 'E6: (ข้อ 4) L5 ทั้งรายการยังเรียงระยะเวลาไม่ลดลง (แถวใหม่แทรกตามลำดับ ไม่ต่อท้ายแบบไม่เรียง)' },
    { type: 'คาดหวัง', description: 'E7: (ข้อ 4) หลังโหลดเพิ่มแล้วปุ่ม "ดูเที่ยวบินเพิ่มเติม" หายไป [O-ยังไม่ยืนยัน: ผลสำรวจโหลดครบในครั้งเดียว]' },
    { type: 'ที่มา', description: `${PLAN} · TC-RES-04 · R53 R54 R49 R50 R57 · Invariant/Metamorphic · Boundary (ขอบเที่ยงคืน +1/+2) · State · [O-ยังไม่ยืนยัน]` },
    { type: 'งบค้นหา', description: '4' },
  ],
}, async ({ page, gf }) => {
  let S0: Row[] = []; let L3: Row[] = []; let L4: Row[] = [];

  await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ตามโจทย์ลูกค้า · รอ ≥ 10 วินาที · จดชุดแถว S0 (D-RES-KEY) และจำนวนแถว n0', async () => {
    await openU1(page, gf);
    S0 = await readRows(page);
    note('S0', `n0 = ${S0.length}`);
  });

  await test.step('2. กด "จัดเรียงตามเที่ยวบินยอดนิยม" → เลือก "เวลาถึง" (ค้นหาครั้งที่ 2) · รอ ≥ 10 วินาที · จด L3 (คีย์ + เวลาถึง + ตัวยก +N + ราคา)', async () => {
    await sortBy(page, gf, 'เวลาถึง', 'จัดเรียงตามเวลาถึง');
    L3 = await readRows(page);
    const nKey = (r: Row) => r.arrN * 1440 + r.arrMin;
    const plus = L3.filter((r) => r.arrN >= 1).length;
    note('L3', `${L3.length} แถว · +1 ${L3.filter((r) => r.arrN === 1).length} · +2 ${L3.filter((r) => r.arrN === 2).length}`);
    if (plus === 0) gf.na('E1 ส่วนขอบวัน +1/+2', 'ไม่มีแถว +1 หรือ +2 (ยังตรวจลำดับเวลาภายในวัน)');
    await gf.check('E1 L3 เรียงตาม (N, เวลาถึง) ไม่ลดลง: ไม่มีตัวยก → +1 → +2', ROWS(page), async () => {
      expect.soft(L3.length, 'มีแถวหลังเรียงตามเวลาถึง').toBeGreaterThan(0);
      expect.soft(top(decreasing(L3, nKey, (r) => `${r.arrTime}+${r.arrN}`)), 'คู่ที่ (N, เวลาถึง) ลดลง').toEqual([]);
    });
    const tb = tieBreak(L3, (a, b) => nKey(a) === nKey(b), priceOf);
    if (tb.pairs === 0) gf.na('E2 (N, เวลาถึง) เท่ากัน → ราคาถูกกว่าอยู่ก่อน', 'ไม่มีค่าซ้ำ');
    else await gf.check(`E2 (N, เวลาถึง) เท่ากัน (${tb.pairs} คู่) → ราคาถูกกว่าอยู่ก่อน`, ROWS(page), async () => {
      expect.soft(top(tb.bad), 'คู่เวลาถึงเท่ากันที่ราคาแพงกว่าอยู่ก่อน').toEqual([]);
    });
  });

  await test.step('3. กดปุ่มจัดเรียง → เลือก "ระยะเวลา" (ค้นหาครั้งที่ 3) · รอ ≥ 10 วินาที · จด L4 (คีย์ + ระยะเวลา + ราคา)', async () => {
    await sortBy(page, gf, 'ระยะเวลา', 'จัดเรียงตามระยะเวลา');
    L4 = await readRows(page);
    note('L4', `${L4.length} แถว`);
    const tb = tieBreak(L4, (a, b) => a.durMin === b.durMin, priceOf);
    if (tb.pairs === 0) gf.na('E3 ส่วนตัวตัดสิน (ระยะเวลาเท่ากัน → ราคาถูกกว่าก่อน)', 'ไม่มีค่าซ้ำ');
    await gf.check('E3 L4 ระยะเวลาไม่ลดลงทุกคู่ · ระยะเวลาเท่ากัน → ราคาถูกกว่าอยู่ก่อน', ROWS(page), async () => {
      expect.soft(L4.length, 'มีแถวหลังเรียงตามระยะเวลา').toBeGreaterThan(0);
      expect.soft(top(decreasing(L4, (r) => r.durMin, (r) => fmtDur(r.durMin))), 'คู่ที่ระยะเวลาลดลง').toEqual([]);
      if (tb.pairs > 0) expect.soft(top(tb.bad), `คู่ระยะเวลาเท่ากัน (${tb.pairs} คู่) ที่ราคาแพงกว่าอยู่ก่อน`).toEqual([]);
    });
    const c3 = compareSets(S0, L3), c4 = compareSets(S0, L4);
    const changed = [...c3.priceChanged, ...c4.priceChanged];
    if (changed.length) note('ราคาเปลี่ยน (ข้อมูลสด 6.4)', top(changed).join(' · '));
    await gf.check('E4 จำนวนแถว L3 = L4 = n0 และชุดคีย์ = S0', ROWS(page), async () => {
      expect.soft(L3.length, 'จำนวนแถว L3 = n0').toBe(S0.length);
      expect.soft(L4.length, 'จำนวนแถว L4 = n0').toBe(S0.length);
      expect.soft(top([...c3.missing, ...c3.extra.map((s) => 'เกิน: ' + s), ...c3.dups.map((s) => 'ซ้ำ: ' + s)]), 'L3 ต่างจาก S0').toEqual([]);
      expect.soft(top([...c4.missing, ...c4.extra.map((s) => 'เกิน: ' + s), ...c4.dups.map((s) => 'ซ้ำ: ' + s)]), 'L4 ต่างจาก S0').toEqual([]);
    });
  });

  await test.step('4. กด "ดูเที่ยวบินเพิ่มเติม" (ค้นหาครั้งที่ 4) · รอ ≥ 10 วินาที · จด L5 และตรวจว่ายังมีปุ่ม "ดูเที่ยวบินเพิ่มเติม" หรือไม่', async () => {
    const more = await loadMore(page, gf, 'ดูเที่ยวบินเพิ่มเติม (เรียงตามระยะเวลา)');
    if (!more) {
      gf.na('E5 L4 ⊆ L5 · ไม่มีคีย์ซ้ำ', 'ไม่มีปุ่ม "ดูเที่ยวบินเพิ่มเติม"');
      gf.na('E6 L5 เรียงระยะเวลาไม่ลดลง', 'ไม่มีปุ่ม "ดูเที่ยวบินเพิ่มเติม"');
      gf.na('E7 ปุ่มดูเพิ่มหายไป', 'ไม่มีปุ่ม "ดูเที่ยวบินเพิ่มเติม"');
      return;
    }
    const L5 = await readRows(page);
    note('L5 (Q12)', `${L5.length} แถว`);
    const c = compareSets(L4, L5);
    await gf.check('E5 ทุกแถว L4 อยู่ใน L5 · L5 ≥ L4 · ไม่มีคีย์ซ้ำ', ROWS(page), async () => {
      expect.soft(top(c.missing), 'แถวใน L4 ที่หายจาก L5').toEqual([]);
      expect.soft(L5.length, 'จำนวนแถว L5 ≥ L4').toBeGreaterThanOrEqual(L4.length);
      expect.soft(top(c.dups), 'คีย์ซ้ำใน L5').toEqual([]);
    });
    await gf.check('E6 L5 ทั้งรายการเรียงระยะเวลาไม่ลดลง', ROWS(page), async () => {
      expect.soft(top(decreasing(L5, (r) => r.durMin, (r) => fmtDur(r.durMin))), 'คู่ที่ระยะเวลาลดลงใน L5').toEqual([]);
    });
    await gf.check('E7 หลังโหลดเพิ่ม ปุ่ม "ดูเที่ยวบินเพิ่มเติม" หายไป', MAIN(page), async () => {
      await expect.soft(MORE(page), 'ไม่มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" แล้ว').toHaveCount(0);
    });
  });
  gf.finishNA();
});

test('TC-RES-05 · ป้ายเตือนแวะนาน / เปลี่ยนสนามบิน / ข้ามคืน', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ข้อ 3) แถวสรุปของแถวแวะนานมีไอคอนเตือน (หรือ aria มีคำเตือน) ข้างข้อมูลแวะพัก' },
    { type: 'คาดหวัง', description: 'E2: (ข้อ 3) แถวขยายมีข้อความกำกับที่จุดแวะพักนั้น ("แวะพักนาน" [O-ยังไม่ยืนยัน: ถ้อยคำ])' },
    { type: 'คาดหวัง', description: 'E3: (ข้อ 4) ในแท็บดีที่สุด แถวที่แวะ ≥ D-RES-LONG อยู่ต่ำกว่าแถวราคาเท่ากันที่แวะสั้น/บินตรง และมีไอคอนเตือนขณะที่แถวแวะสั้นไม่มี' },
    { type: 'คาดหวัง', description: 'E4: (ข้อ 5) แถวสรุปมีไอคอนเตือน + ข้อความบอกว่ามีการเปลี่ยนสนามบิน ("มีการเปลี่ยนสนามบิน" [O-ยังไม่ยืนยัน: ถ้อยคำ])' },
    { type: 'คาดหวัง', description: 'E5: (ข้อ 5) แถวขยายระบุรหัสสนามบินต้นและปลายของการเปลี่ยน (รูปแบบ "เปลี่ยนจาก A ไปยัง B") โดย A = สนามบินถึงของขาก่อน, B = สนามบินออกของขาถัดไป และ A ≠ B' },
    { type: 'คาดหวัง', description: 'E6: (ข้อ 7) ทุกแถวที่ขยายแล้วพบ สนามบินถึงขา i ≠ สนามบินออกขา i+1 ต้องมีข้อความเปลี่ยนสนามบินในแถวสรุปด้วย (ไม่มีกรณีเปลี่ยนสนามบินที่ไม่เตือน)' },
    { type: 'คาดหวัง', description: 'E7: (ข้อ 6) ขาที่ตรง D-RES-RED มีป้าย "ข้ามคืน" ในแถวขยาย [O-ยังไม่ยืนยัน: ถ้อยคำและเกณฑ์ของ Google]' },
    { type: 'คาดหวัง', description: 'E8: (ข้อ 6) ขาบินกลางวันที่ไม่ข้ามเที่ยงคืนไม่มีป้าย "ข้ามคืน"' },
    { type: 'ที่มา', description: `${PLAN} · TC-RES-05 · R46 R58 R60 · Equivalence partition (แถวปกติ / แวะนาน / เปลี่ยนสนามบิน / ข้ามคืน) · Invariant/Metamorphic · [O-ยังไม่ยืนยัน]` },
    { type: 'งบค้นหา', description: '2' },
  ],
}, async ({ page, gf }) => {
  let rows0: Row[] = []; let rowsAll: Row[] = [];
  const expanded: { r: Row; li: Locator; x: Expanded }[] = [];
  const expand = async (r: Row) => {
    const hit = expanded.find((e) => e.r.idx === r.idx);
    if (hit) return hit;
    const e = { r, ...(await expandRow(page, gf, r)) };
    expanded.push(e);
    return e;
  };

  await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ตามโจทย์ลูกค้า · รอ ≥ 10 วินาที · จดลำดับแถวชุดแรกแท็บดีที่สุด (คีย์ + ราคา + เวลาแวะพัก + ไอคอน/ข้อความเตือน)', async () => {
    await openU1(page, gf);
    rows0 = await readRows(page);
    note('ชุดแรก', rows0.map((r) => `${desc(r)}${r.maxLay ? ' แวะสูงสุด ' + fmtDur(r.maxLay) : ''}${r.warn ? ' ⚠' : ''}`).join(' · '));
  });

  await test.step('2. กด "ดูเที่ยวบินเพิ่มเติม" (ค้นหาครั้งที่ 2) · รอ ≥ 10 วินาที', async () => {
    const more = await loadMore(page, gf, 'ดูเที่ยวบินเพิ่มเติม');
    if (!more) note('ข้อสังเกต', 'ไม่มีปุ่ม "ดูเที่ยวบินเพิ่มเติม" — ใช้ชุดแรก');
    rowsAll = await readRows(page);
    note('หลังดูเพิ่ม', `${rowsAll.length} แถว`);
  });

  await test.step('3. (ก) แถวแวะนาน: เลือกแถวที่แวะพักครั้งใดครั้งหนึ่ง ≥ D-RES-LONG (นานที่สุด) · จดไอคอน/ข้อความเตือน · กด ˅ จดข้อความที่จุดแวะพัก', async () => {
    const longRows = rowsAll.filter((r) => r.maxLay >= LONG).sort((a, b) => b.maxLay - a.maxLay);
    if (!longRows.length) {
      gf.na('E1 ไอคอนเตือนแถวแวะนาน', 'ไม่มีแถวแวะ ≥ D-RES-LONG (12 ชม.)');
      gf.na('E2 ข้อความ "แวะพักนาน" ในแถวขยาย', 'ไม่มีแถวแวะ ≥ D-RES-LONG (12 ชม.)');
      return;
    }
    const r = longRows[0];
    note('แถวแวะนาน', `${desc(r)} · แวะ ${fmtDur(r.maxLay)} · ไอคอน ${r.warn} · ${r.warnText}`);
    const li = await rowLocator(page, r);
    await gf.check('E1 แถวสรุปของแถวแวะนานมีไอคอนเตือน (หรือ aria มีคำเตือน)', li, async () => {
      expect.soft(r.warn || /เตือน|แวะพักนาน/.test(r.warnText), `${desc(r)} ต้องมีไอคอน/คำเตือนข้างข้อมูลแวะพัก (aria-describedby: "${r.warnText}")`).toBe(true);
    });
    const e = await expand(r);
    const lay = [...e.x.lays].sort((a, b) => b.min - a.min)[0];
    await gf.check('E2 แถวขยายมีข้อความ "แวะพักนาน" ที่จุดแวะนั้น', e.li.getByText(/หยุดพัก|แวะพัก/).first(), async () => {
      expect.soft(lay?.text ?? '(อ่านจุดแวะไม่ได้)', 'ข้อความที่จุดแวะพักนาน').toMatch(/แวะพักนาน/);
    });
  });

  await test.step('4. (ข) คู่ราคาเท่ากัน: ในชุดแรก หาคู่ที่แถวหนึ่งแวะ ≥ D-RES-LONG และอีกแถวแวะ < 3 ชม. หรือบินตรง · จดตำแหน่งทั้งสองแถว', async () => {
    const pairs: { long: Row; short: Row }[] = [];
    for (const a of rows0) for (const b of rows0) {
      if (a.price != null && a.price === b.price && a.maxLay >= LONG && (b.stops === 0 || (b.stops > 0 && b.maxLay < 180))) pairs.push({ long: a, short: b });
    }
    if (!pairs.length) { gf.na('E3 แถวแวะนานอยู่ต่ำกว่าแถวราคาเท่ากันที่แวะสั้น + ไอคอน', 'ไม่มีคู่ราคาเท่ากันตามข้อ 4'); return; }
    note('คู่ราคาเท่ากัน', pairs.map((p) => `แวะนาน ${desc(p.long)} (ลำดับ ${p.long.idx + 1}) · แวะสั้น ${desc(p.short)} (ลำดับ ${p.short.idx + 1})`).join(' || '));
    const locs: Locator[] = [];
    for (const p of pairs.slice(0, 3)) locs.push(await rowLocator(page, p.long), await rowLocator(page, p.short));
    await gf.check('E3 แถวแวะนานอยู่ต่ำกว่าแถวราคาเท่ากันที่แวะสั้น/บินตรง และมีไอคอนเตือนขณะที่แถวแวะสั้นไม่มี', locs, async () => {
      expect.soft(pairs.filter((p) => !(p.long.idx > p.short.idx)).map((p) => `${desc(p.long)} อยู่เหนือ ${desc(p.short)}`), 'แถวแวะนานต้องอยู่ต่ำกว่า').toEqual([]);
      expect.soft(pairs.filter((p) => !p.long.warn).map((p) => desc(p.long)), 'แถวแวะนานต้องมีไอคอนเตือน').toEqual([]);
      expect.soft(pairs.filter((p) => p.short.warn).map((p) => desc(p.short)), 'แถวแวะสั้น/บินตรงต้องไม่มีไอคอนเตือน').toEqual([]);
    });
  });

  await test.step('5. (ค) แถวเปลี่ยนสนามบิน: ค้นคำ "เปลี่ยนสนามบิน" ในแถวสรุป · เลือกแถวแรก · จดไอคอนเตือน · กด ˅ จดข้อความเปลี่ยนสนามบินและสนามบินของขาก่อน/ขาถัดไป', async () => {
    const r = rowsAll.find((x) => /เปลี่ยนสนามบิน/.test(x.text));
    if (!r) {
      gf.na('E4 แถวสรุปมีไอคอน + "มีการเปลี่ยนสนามบิน"', 'ไม่พบ "เปลี่ยนสนามบิน" ในแถวใด');
      gf.na('E5 แถวขยาย "เปลี่ยนจาก A ไปยัง B"', 'ไม่พบ "เปลี่ยนสนามบิน" ในแถวใด');
      return;
    }
    note('แถวเปลี่ยนสนามบิน', `${desc(r)} · ไอคอน ${r.warn} · ${r.layovers.map((l) => l.place).join(' / ')}`);
    const li = await rowLocator(page, r);
    await gf.check('E4 แถวสรุปมีไอคอนเตือน + "มีการเปลี่ยนสนามบิน"', li, async () => {
      expect.soft(r.warn, `${desc(r)} ต้องมีไอคอนเตือนในแถวสรุป`).toBe(true);
      expect.soft(r.text.replace(/\s+/g, ' '), 'ข้อความในแถวสรุป').toMatch(/มีการเปลี่ยนสนามบิน/);
    });
    const e = await expand(r);
    const bad: string[] = [];
    const ch = e.x.lays.map((l, i) => ({ l, i })).filter(({ l }) => /เปลี่ยนจาก/.test(l.text));
    if (!ch.length) bad.push(`${desc(r)} · แถวขยายไม่มีข้อความ "เปลี่ยนจาก A ไปยัง B" (จุดแวะ: ${e.x.lays.map((l) => l.text).join(' | ') || '-'})`);
    for (const { l, i } of ch) {
      const A = e.x.legs[i]?.arrCode, B = e.x.legs[i + 1]?.depCode;
      if (!l.from || !l.to) bad.push(`${desc(r)} · ไม่มีรหัสสนามบินใน "${l.text}"`);
      if (l.from !== A) bad.push(`${desc(r)} · A = ${l.from} ≠ สนามบินถึงขาก่อน ${A}`);
      if (l.to !== B) bad.push(`${desc(r)} · B = ${l.to} ≠ สนามบินออกขาถัดไป ${B}`);
      if (l.from && l.from === l.to) bad.push(`${desc(r)} · A = B = ${l.from}`);
    }
    await gf.check('E5 แถวขยาย "เปลี่ยนจาก A ไปยัง B": A = ถึงขาก่อน, B = ออกขาถัดไป, A ≠ B', e.li.getByText(/เปลี่ยนจาก/).first(), async () => {
      expect.soft(bad, 'ข้อความเปลี่ยนสนามบินในแถวขยาย').toEqual([]);
    });
  });

  await test.step('6. (ง) ขาข้ามคืน: เลือกแถวบินตรงที่ตรง D-RES-RED · กด ˅ จดป้าย · และแถวบินตรงกลางวัน (ออก 08:00–14:00 ไม่มี +1) กด ˅ เป็นตัวเทียบ', async () => {
    const red = rowsAll.find((r) => r.stops === 0 && r.depMin >= 21 * 60 && r.depMin <= 23 * 60 + 59 && r.arrN === 1 && r.arrMin >= 4 * 60 && r.durMin >= 240);
    if (!red) gf.na('E7 ป้าย "ข้ามคืน" ขา D-RES-RED', 'ไม่มีแถวบินตรงตรง D-RES-RED');
    else {
      const e = await expand(red);
      await gf.check('E7 ขาที่ตรง D-RES-RED มีป้าย "ข้ามคืน" ในแถวขยาย', e.li, async () => {
        expect.soft(e.x.legs.length, 'อ่านขาบินในแถวขยายได้').toBeGreaterThan(0);
        expect.soft(e.x.legs[0]?.night ?? false, `${desc(red)} ต้องมีป้าย "ข้ามคืน"`).toBe(true);
      });
    }
    const day = rowsAll.find((r) => r.stops === 0 && r.depMin >= 8 * 60 && r.depMin <= 14 * 60 && r.arrN === 0);
    if (!day) gf.na('E8 ขากลางวันไม่มีป้าย "ข้ามคืน"', 'ไม่มีแถวบินตรงกลางวัน (ออก 08:00–14:00 ไม่มี +1)');
    else {
      const e = await expand(day);
      await gf.check('E8 ขาบินกลางวันที่ไม่ข้ามเที่ยงคืนไม่มีป้าย "ข้ามคืน"', e.li, async () => {
        expect.soft(e.x.legs.length, 'อ่านขาบินในแถวขยายได้').toBeGreaterThan(0);
        expect.soft(e.x.legs.filter((g) => g.night).map((g) => `${g.depCode} ${g.depTime}→${g.arrCode} ${g.arrTime}`), `${desc(day)} ต้องไม่มีป้าย "ข้ามคืน"`).toEqual([]);
      });
    }
  });

  await test.step('7. ตรวจทุกแถวที่ขยายในข้อ 3–6: เทียบสนามบินถึงของขา i กับสนามบินออกของขา i+1', async () => {
    if (!expanded.length) { gf.na('E6 เปลี่ยนสนามบินต้องเตือนในแถวสรุป', 'ไม่มีแถวที่ขยายในข้อ 3–6'); return; }
    const bad: string[] = []; let changes = 0;
    for (const e of expanded) {
      for (let i = 0; i < e.x.legs.length - 1; i++) {
        const A = e.x.legs[i].arrCode, B = e.x.legs[i + 1].depCode;
        if (A && B && A !== B) {
          changes++;
          if (!/เปลี่ยนสนามบิน|เปลี่ยนจาก/.test(e.r.text + ' ' + e.r.label)) bad.push(`${desc(e.r)} · ถึง ${A} แล้วออก ${B} แต่แถวสรุปไม่มีข้อความเปลี่ยนสนามบิน`);
        }
      }
    }
    note('E6', `ขยาย ${expanded.length} แถว · พบการเปลี่ยนสนามบิน ${changes} จุด`);
    await gf.check(`E6 ทุกจุดที่สนามบินถึงขา i ≠ ออกขา i+1 (${changes} จุด) มีข้อความเปลี่ยนสนามบินในแถวสรุป`, expanded.map((e) => e.li), async () => {
      expect.soft(bad, 'การเปลี่ยนสนามบินที่ไม่เตือนในแถวสรุป').toEqual([]);
    });
  });
  gf.finishNA();
});

test('TC-RES-06 · ⚠️ แท็บถูกที่สุด + ข้อความจำนวนผล + สับเซตหลังเพิ่มตัวกรอง', {
  tag: ['@P2', '@5.2', '@known-defect'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ข้อ 3) Lc: ราคาแถวถัดไป ≥ แถวก่อนหน้าทุกคู่ และราคาแถวแรก = P_tab' },
    { type: 'คาดหวัง', description: 'E2: (ข้อ 3) ชุดคีย์ของ Lc = S0 (แท็บเปลี่ยนแค่ลำดับ ไม่เปลี่ยนชุด)' },
    { type: 'คาดหวัง', description: 'E3: (ข้อ 2) ⓘ เปิดป๊อปอัปคำอธิบายที่มีข้อความไม่ว่าง' },
    { type: 'คาดหวัง', description: 'E4: (ข้อ 1, 4) N0 = M (ตัวเลขจำนวนผลนับทุกเที่ยวบินที่ตรงเงื่อนไข ไม่ใช่แค่ชุดแรก)' },
    { type: 'คาดหวัง', description: 'E5: (ข้อ 4) หลังโหลดเพิ่มยังมีข้อความ "มีผลลัพธ์ N รายการ" และ N = จำนวนแถวที่แสดงอยู่ (M)' },
    { type: 'คาดหวัง', description: 'E6: (ข้อ 5) N1 ≤ N0 และทุกแถวใน S1 อยู่ใน S0 (ผลหลังเพิ่มตัวกรองที่ลูกค้าเห็นไม่มีแถวที่ไม่เคยอยู่ในผลก่อนกรอง)' },
    { type: 'ที่มา', description: `${PLAN} · TC-RES-06 · R47 R59 R62 · Invariant/Metamorphic · State · [R]` },
    { type: 'งบค้นหา', description: '4' },
  ],
}, async ({ page, gf }) => {
  let S0: Row[] = []; let P: number | null = null; let N0: number | null = null;
  let SM: Row[] = []; let M = 0;

  await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ตามโจทย์ลูกค้า · รอ ≥ 10 วินาที · จด S0 (D-RES-KEY + ราคา), n0, P_tab และข้อความ "มีผลลัพธ์ N รายการ" = N0', async () => {
    await openU1(page, gf);
    S0 = await readRows(page);
    P = (await readPTab(page)).p;
    N0 = await readCount(page);
    note('S0', `n0 = ${S0.length} · P_tab = ${P} · N0 = ${N0}`);
  });

  await test.step('2. ถ้ามีข้อความ "จัดอันดับตามราคาและความสะดวก" พร้อม ⓘ ให้กด ⓘ นั้น · อ่านป๊อปอัป · ปิดด้วย Esc', async () => {
    const txt = page.getByRole('tabpanel').getByText(/จัดอันดับตามราคาและความสะดวก/).first();
    const info = page.getByRole('tabpanel').getByRole('button', { name: RANK_INFO }).first();
    if ((await txt.count()) === 0 || (await info.count()) === 0) { gf.na('E3 ⓘ ข้าง "จัดอันดับตามราคาและความสะดวก"', 'ไม่มีข้อความ/ⓘ นี้ในหน้า'); return; }
    const err = await tryClick(gf, info);
    if (err) note('ข้อสังเกต Q10', `กด ⓘ ไม่ติด: ${err}`);
    const d = await visibleDialogText(page);
    note('ข้อความ ⓘ', d.text || '(ไม่เปิด/ว่าง)');
    await gf.check('E3 ⓘ ข้าง "จัดอันดับตามราคาและความสะดวก" เปิดป๊อปอัปที่มีข้อความ', d.n ? page.getByRole('dialog') : info, async () => {
      expect.soft(d.n, 'ป๊อปอัปเปิดขึ้น').toBeGreaterThan(0);
      expect.soft(d.text.length, 'ข้อความคำอธิบายไม่ว่าง').toBeGreaterThan(0);
    });
    if (d.n) await closeDialog(page, gf);
  });

  await test.step('3. กดแท็บ "ถูกที่สุด" (ค้นหาครั้งที่ 2) · รอ 15 วินาที · จดรายการ Lc ตามลำดับ (คีย์ + ราคา)', async () => {
    await gf.click(CHEAP_TAB(page));
    await gf.searched('กดแท็บถูกที่สุด', 15_000);
    const Lc = await readRows(page);
    note('Lc', `${Lc.length} แถว · ${Lc.slice(0, 8).map((r) => '฿' + r.price).join(' → ')}`);
    await gf.check('E1 Lc ราคาไม่ลดลงทุกคู่ และแถวแรก = P_tab', [CHEAP_TAB(page), ROWS(page)], async () => {
      expect.soft(Lc.length, 'มีแถวในแท็บถูกที่สุด').toBeGreaterThan(0);
      expect.soft(top(decreasing(priced(Lc), priceOf, (r) => `฿${r.price}`)), 'คู่ที่ราคาลดลงในแท็บ "ถูกที่สุด"').toEqual([]);
      expect.soft(Lc[0]?.price ?? null, 'ราคาแถวแรก = P_tab').toBe(P);
    });
    const c = compareSets(S0, Lc);
    if (c.priceChanged.length) note('ราคาเปลี่ยน (ข้อมูลสด 6.4)', top(c.priceChanged).join(' · '));
    await gf.check('E2 ชุดคีย์ Lc = S0', ROWS(page), async () => {
      expect.soft(top(c.missing), 'แถวใน S0 ที่ไม่อยู่ใน Lc').toEqual([]);
      expect.soft(top(c.extra), 'แถวใน Lc ที่ไม่อยู่ใน S0').toEqual([]);
      expect.soft(top(c.dups), 'แถวซ้ำใน Lc').toEqual([]);
    });
  });

  await test.step('4. กด "ดูเที่ยวบินเพิ่มเติม" (ค้นหาครั้งที่ 3) · รอ ≥ 10 วินาที · จดจำนวนแถว M ชุด SM และค้นคำ "มีผลลัพธ์" อีกครั้ง', async () => {
    const more = await loadMore(page, gf, 'ดูเที่ยวบินเพิ่มเติม (แท็บถูกที่สุด)');
    SM = await readRows(page);
    M = SM.length;
    const Nafter = await readCount(page);
    const countLoc = COUNT_TEXT(page);
    note('หลังดูเพิ่ม', `ปุ่มดูเพิ่ม ${more ? 'มี' : 'ไม่มี'} · M = ${M} · "มีผลลัพธ์" = ${Nafter}`);
    const expected = more ? M : S0.length;
    await gf.check(`E4 N0 = ${more ? 'M' : 'n0 (ไม่มีปุ่มดูเพิ่ม)'}`, [countLoc, ROWS(page)], async () => {
      expect.soft(N0, `"มีผลลัพธ์ N รายการ" ก่อนดูเพิ่ม (N0) = ${more ? 'M' : 'n0'} = ${expected}`).toBe(expected);
    });
    if (!more) { gf.na('E5 ข้อความจำนวนผลหลังดูเพิ่ม = M', 'ไม่มีปุ่ม "ดูเที่ยวบินเพิ่มเติม"'); return; }
    await gf.check('E5 หลังดูเพิ่มยังมี "มีผลลัพธ์ N รายการ" และ N = M', [countLoc, ROWS(page)], async () => {
      expect.soft(Nafter, 'ยังมีข้อความ "มีผลลัพธ์ N รายการ" หลังดูเพิ่ม').not.toBeNull();
      expect.soft(Nafter, `N = จำนวนแถวที่แสดงอยู่ M = ${M}`).toBe(M);
    });
  });

  await test.step('5. เปิดชิปตัวกรองราคา ตั้งตาม D-FLT-PRICE (กด Home บน slider จดค่า X) (ค้นหาครั้งที่ 4) · ปิดป๊อปอัป · รอ ≥ 10 วินาที · จด S1 (ชุดแรก) และ N1', async () => {
    await gf.click(page.getByRole('button', { name: /^ราคา,/ }).first());
    const dlg = page.getByRole('dialog').filter({ has: page.getByRole('slider', { name: 'ราคาสูงสุด' }) }).first();
    const slider = dlg.getByRole('slider', { name: 'ราคาสูงสุด' });
    await slider.waitFor({ state: 'visible', timeout: 15_000 });
    await slider.focus();
    await gf.press('Home', { search: 'ตัวกรองราคา: Home บน slider ราคาสูงสุด' });
    const X = `${(await slider.getAttribute('aria-valuenow').catch(() => null)) || ''} ${(await slider.getAttribute('aria-valuetext').catch(() => null)) || ''} · ${(await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120)}`;
    note('D-FLT-PRICE X', X);
    await gf.click(dlg.getByRole('button', { name: 'ปิดกล่องโต้ตอบ' }).first());
    await gf.pause(10_000, 12_000);
    await ROWS(page).first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    const S1 = await readRows(page);
    const N1 = await readCount(page);
    const keys0 = new Set(S0.map((r) => r.key));
    const notIn0 = S1.filter((r) => !keys0.has(r.key)).map(desc);
    note('S1', `${S1.length} แถว · N1 = ${N1}`);
    const keysM = new Set(SM.map((r) => r.key));
    const notInM = S1.filter((r) => !keysM.has(r.key)).map(desc);
    note('บันทึกเพิ่ม Q13 (ไม่นับผ่าน/ล้ม)', notInM.length ? `แถวใน S1 ที่ไม่อยู่ใน SM: ${top(notInM).join(' · ')}` : 'ทุกแถวใน S1 อยู่ใน SM (สาเหตุ = N/ผลฐานนับแค่ชุดแรก)');
    await gf.check('E6 N1 ≤ N0 และทุกแถวใน S1 อยู่ใน S0', [COUNT_TEXT(page), ROWS(page)], async () => {
      expect.soft(N1, 'อ่าน N1 ได้').not.toBeNull();
      expect.soft(N0 != null && N1 != null && N1 <= N0, `N1 (${N1}) ≤ N0 (${N0})`).toBe(true);
      expect.soft(top(notIn0), 'แถวใน S1 ที่ไม่เคยอยู่ใน S0').toEqual([]);
    });
  });
  gf.finishNA();
});

test('TC-RES-07 · ⚠️ ข้อมูลกระเป๋าในแถว + เตือนแวะนานในหน้า booking', {
  tag: ['@P2', '@5.2', '@known-defect'],
  annotation: [
    { type: 'คาดหวัง', description: 'E1: (ข้อ 2) แถวโลว์คอสต์มีข้อมูลกระเป๋ารายเที่ยวบินในแถวสรุปหรือแถวขยาย (ไอคอนหรือข้อความว่ากระเป๋าถือ/โหลดรวมหรือไม่รวม) ไม่ใช่มีแค่ข้อความรวมที่หัวรายการ' },
    { type: 'คาดหวัง', description: 'E2: (ข้อ 3) แถวสายการบินบริการเต็มมีข้อมูลกระเป๋ารายเที่ยวบินแบบเดียวกัน เพื่อให้เทียบกับแถวโลว์คอสต์ได้ในหน้ารายการ' },
    { type: 'คาดหวัง', description: 'E3: (ข้อ 5) หน้า booking มี **ข้อความ** เตือนแวะพักนานที่จุดแวะนั้น (ไม่ใช่มีแค่ไอคอน + ระยะเวลา + รหัสสนามบิน)' },
    { type: 'คาดหวัง', description: 'E4: (ข้อ 4–5) ถ้าช่วงแวะพักคร่อมเวลา 00:00–05:00 ของสนามบินแวะ หน้า booking (หรือแถวขยาย) บอกว่าเป็นการแวะพัก/ค้างคืน' },
    { type: 'คาดหวัง', description: 'E5: (ข้อ 5) หน้า booking มีข้อความแจ้งเรื่องการผ่านแดน/วีซ่าผ่านแดน หรือการต้องออกจากพื้นที่ต่อเครื่อง สำหรับการแวะ ≥ D-RES-LONG' },
    { type: 'ที่มา', description: `${PLAN} · TC-RES-07 · R56 R55 · Equivalence partition (โลว์คอสต์ / บริการเต็ม) · State (ผลลัพธ์ → booking) · [R]` },
    { type: 'งบค้นหา', description: '3' },
  ],
}, async ({ page, gf }) => {
  let rows0: Row[] = [];
  const BAG = /กระเป๋า|สัมภาระ/;
  const bagInfo = async (li: Locator) => li.evaluate((root) => {
    const labels = Array.from(root.querySelectorAll('[aria-label], img[alt], [title]'))
      .map((e) => `${e.getAttribute('aria-label') || ''} ${e.getAttribute('alt') || ''} ${e.getAttribute('title') || ''}`.trim()).filter(Boolean);
    return { text: (root as HTMLElement).innerText.replace(/\s+/g, ' '), labels: labels.join(' | ') };
  }).catch(() => ({ text: '', labels: '' }));

  await test.step('1. เปิด U1 · ตรวจหัวผลลัพธ์ตามโจทย์ลูกค้า · รอ ≥ 10 วินาที', async () => {
    await openU1(page, gf);
    rows0 = await readRows(page);
    note('ชุดแรก', `${rows0.length} แถว`);
  });

  await test.step('2. เลือกแถวแรกที่สายการบินอยู่ใน D-RES-LCC · อ่าน aria-label และข้อความ/ไอคอนรอบราคา · กด ˅ อ่านแถวขยายหาข้อมูลกระเป๋า', async () => {
    const r = rows0.find((x) => LCC.test(x.airline));
    if (!r) { gf.na('E1 ข้อมูลกระเป๋าในแถวโลว์คอสต์', 'ไม่มีแถว D-RES-LCC'); return; }
    const { li } = await expandRow(page, gf, r);
    const info = await bagInfo(li);
    const hit = BAG.exec(`${info.text} ${info.labels}`);
    note('แถวโลว์คอสต์', `${desc(r)} · พบคำกระเป๋า: ${hit ? hit[0] : 'ไม่พบ'}`);
    await gf.check(`E1 แถวโลว์คอสต์ (${r.airline}) มีข้อมูลกระเป๋าในแถวสรุป/แถวขยาย`, li, async () => {
      expect.soft(hit ? hit[0] : '(ไม่มีข้อมูลกระเป๋าในแถว)', `${desc(r)} ต้องมีไอคอน/ข้อความกระเป๋าถือ/โหลดในแถว`).toMatch(BAG);
    });
  });

  await test.step('3. เลือกแถวแรกของสายการบินแบบบริการเต็ม (การบินไทย, JAL, ANA หรือสายที่ไม่อยู่ใน D-RES-LCC) ทำแบบข้อ 2', async () => {
    const r = rows0.find((x) => x.airline && !LCC.test(x.airline));
    if (!r) { gf.na('E2 ข้อมูลกระเป๋าในแถวบริการเต็ม', 'ไม่มีแถวบริการเต็ม'); return; }
    const { li } = await expandRow(page, gf, r);
    const info = await bagInfo(li);
    const hit = BAG.exec(`${info.text} ${info.labels}`);
    note('แถวบริการเต็ม', `${desc(r)} · พบคำกระเป๋า: ${hit ? hit[0] : 'ไม่พบ'}`);
    await gf.check(`E2 แถวบริการเต็ม (${r.airline}) มีข้อมูลกระเป๋าแบบเดียวกัน`, li, async () => {
      expect.soft(hit ? hit[0] : '(ไม่มีข้อมูลกระเป๋าในแถว)', `${desc(r)} ต้องมีไอคอน/ข้อความกระเป๋าถือ/โหลดในแถว`).toMatch(BAG);
    });
  });

  let target: Row | undefined;
  await test.step('4. หาแถวที่แวะพัก ≥ D-RES-LONG ในชุดแรก · ถ้าไม่มี กด "ดูเที่ยวบินเพิ่มเติม" (ค้นหาครั้งที่ 2) แล้วหาอีกครั้ง · จดเวลาเริ่ม–สิ้นสุดการแวะพัก', async () => {
    target = rows0.filter((r) => r.maxLay >= LONG).sort((a, b) => b.maxLay - a.maxLay)[0];
    if (!target && (await loadMore(page, gf, 'ดูเที่ยวบินเพิ่มเติม (หาแถวแวะนาน)'))) {
      target = (await readRows(page)).filter((r) => r.maxLay >= LONG).sort((a, b) => b.maxLay - a.maxLay)[0];
    }
    note('แถวแวะนาน', target ? `${desc(target)} · แวะ ${fmtDur(target.maxLay)}` : 'ไม่พบแม้หลังดูเพิ่ม');
  });

  await test.step('5. กด ˅ ที่แถวนั้น → กด "เลือกเที่ยวบิน" (หน้า booking ใน google.com นับ 1 การค้นหา) · รอ ≥ 10 วินาที · อ่านข้อความที่จุดแวะพักในรายละเอียดเที่ยวบิน', async () => {
    if (!target) {
      gf.na('E3 ข้อความเตือนแวะพักนานในหน้า booking', 'ไม่มีแถวแวะ ≥ D-RES-LONG แม้หลังดูเพิ่ม');
      gf.na('E4 แวะพักคร่อม 00:00–05:00 บอกว่าค้างคืน', 'ไม่มีแถวแวะ ≥ D-RES-LONG แม้หลังดูเพิ่ม');
      gf.na('E5 ข้อความผ่านแดน/วีซ่าในหน้า booking', 'ไม่มีแถวแวะ ≥ D-RES-LONG แม้หลังดูเพิ่ม');
      return;
    }
    const r = target;
    const { li, x } = await expandRow(page, gf, r);
    // ช่วงแวะพักนาน (เวลาท้องถิ่นของสนามบินแวะ นับนาทีจาก 00:00 ของ 15 ธ.ค.)
    const iLong = x.lays.length ? x.lays.reduce((b, l, i, a) => (l.min > a[b].min ? i : b), 0) : r.layovers.findIndex((l) => l.min === r.maxLay);
    const legA = x.legs[iLong], legB = x.legs[iLong + 1];
    const start = legA ? legA.arrSup * 1440 + legA.arrMin : NaN;
    const end = legB ? legB.depSup * 1440 + legB.depMin : NaN;
    let night = false;
    for (let d = 0; d <= 3 && !isNaN(start) && !isNaN(end); d++) if (Math.max(start, d * 1440) <= Math.min(end, d * 1440 + 300)) night = true;
    const resultLayText = x.lays[iLong]?.text || '';
    note('ช่วงแวะพัก', `${legA?.arrCode || '?'} ${fmt(start)}+${Math.floor(start / 1440)} → ${fmt(end)}+${Math.floor(end / 1440)} · คร่อม 00:00–05:00: ${night}`);

    await gf.click(li.getByRole('button', { name: 'เลือกเที่ยวบิน', exact: true }).first(), { booking: 'เลือกเที่ยวบินแถวแวะพักนาน' });
    await page.waitForURL(/\/travel\/flights\/booking/, { timeout: 30_000 }).catch(() => {});
    const detailBtn = MAIN(page).getByRole('button', { name: /^รายละเอียดเที่ยวบิน/ }).first();
    if ((await detailBtn.count()) > 0) await gf.click(detailBtn);
    const bLi = ROWS(page).first();
    const bx = assemble(await readLegTokens(bLi).catch(() => [] as Tok[]));
    const mainText = (await MAIN(page).innerText().catch(() => '')).replace(/\s+/g, ' ');
    const bLay = bx.lays.length ? [...bx.lays].sort((a, b) => b.min - a.min)[0].text : '';
    note('หน้า booking', `URL ${page.url().split('?')[0]} · จุดแวะ: ${bx.lays.map((l) => l.text).join(' | ') || '(ไม่พบในรายละเอียด)'}`);
    const stopLoc = (bx.lays.length ? MAIN(page).getByText(/หยุดพัก|แวะพัก/).first() : MAIN(page).getByText(/หยุดพัก \d+ ครั้ง/).first());

    await gf.check('E3 หน้า booking มีข้อความเตือนแวะพักนานที่จุดแวะนั้น', stopLoc, async () => {
      const where = bLay || mainText;
      expect.soft(/แวะพักนาน|ต่อเครื่องนาน/.test(where) ? 'มีข้อความเตือน' : `(ไม่มีข้อความเตือน: ${bLay || 'มีแค่ไอคอน/ระยะเวลา/รหัสสนามบิน'})`, 'ข้อความเตือนแวะพักนานในหน้า booking').toBe('มีข้อความเตือน');
    });
    if (!night) gf.na('E4 แวะพักคร่อม 00:00–05:00 บอกว่าค้างคืน', 'ช่วงแวะไม่คร่อม 00:00–05:00');
    else await gf.check('E4 แวะพักคร่อม 00:00–05:00: หน้า booking (หรือแถวขยาย) บอกว่าเป็นการแวะพัก/ค้างคืน', stopLoc, async () => {
      const found = /ค้างคืน|ข้ามคืน/.test(bLay) || /ค้างคืน|ข้ามคืน/.test(resultLayText);
      expect.soft(found, `ข้อความจุดแวะ booking "${bLay}" / แถวขยาย "${resultLayText}" ต้องบอกว่าค้างคืน`).toBe(true);
    });
    await gf.check('E5 หน้า booking แจ้งเรื่องผ่านแดน/วีซ่าผ่านแดน/ต้องออกจากพื้นที่ต่อเครื่อง', MAIN(page), async () => {
      const m = /ผ่านแดน|วีซ่า|ตรวจคนเข้าเมือง|ออกจากพื้นที่|ออกนอกสนามบิน|transit/i.exec(mainText);
      expect.soft(m ? m[0] : '(ไม่มีข้อความผ่านแดน/วีซ่า)', 'ข้อความเรื่องผ่านแดนในหน้า booking').toMatch(/ผ่านแดน|วีซ่า|ตรวจคนเข้าเมือง|ออกจากพื้นที่|ออกนอกสนามบิน|transit/i);
    });
  });
  gf.finishNA();
});

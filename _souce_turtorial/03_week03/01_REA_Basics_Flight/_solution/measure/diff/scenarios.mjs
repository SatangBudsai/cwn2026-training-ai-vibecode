// สถานการณ์เดียวกันสำหรับต้นฉบับ (o = diff/lib/original.mjs) และโคลน (c = diff/lib/clone.mjs)
// orig(page) → "เฉลย" ที่ดึงจากต้นฉบับตอนรัน · clone(page, oracle) → ผลของโคลน · compare(oracle, got) → คำตัดสิน
// ไม่มีจำนวน/ราคาคาดหวังฝังในไฟล์นี้ ค่าที่เป็นพารามิเตอร์ของสถานการณ์ (การบินไทย, ฿10,000, 23:00) มาจากโจทย์
import * as o from './lib/original.mjs';
import * as c from './lib/clone.mjs';
import { parseRow, parseDetail, compareLists, describeList, priceOf } from './lib/parse.mjs';

const rows = (raw) => raw.map(parseRow);
const baht = (n) => (n == null || Number.isNaN(n) ? '—' : `฿${n.toLocaleString('en-US')}`);
const listVerdict = (exp, got) => { const cmp = compareLists(exp, got.rows); return { ok: cmp.ok, detail: describeList(cmp), cmp }; };
// เฉลยอนุมาน: S4 พิสูจน์ว่าการกรองรายการ 300 ใบได้ "ชุด" ตรงกับผลสด แต่ Google จัดอันดับใหม่หลังกรอง ลำดับจึงเชื่อไม่ได้
// → ตัดสินจากจำนวน + ชุดเที่ยวบิน (เวลาออก|สายการบิน|ราคา) ส่วนลำดับรายงานเป็นข้อมูล
const setVerdict = (exp, got) => {
  const cmp = compareLists(exp, got.rows);
  const ok = cmp.count[0] === cmp.count[1] && cmp.sameSet;
  if (cmp.ok) return { ok, detail: describeList(cmp) + ' (ลำดับตรงด้วย)', cmp };
  if (ok) return { ok, detail: `ตรง (${cmp.count[1]} ใบ ชุดเที่ยวบินตรง · ลำดับต่างจากเฉลยอนุมาน ซึ่งไม่ใช้ตัดสิน)`, cmp };
  return { ok, detail: describeList(cmp), cmp };
};

// ต้นฉบับ: เปิด → ดูเพิ่มเติม → 300 ใบ (ฐานของเฉลยอนุมาน)
async function origAll(page) { await o.open(page); await o.more(page); return rows(await o.rawRows(page)); }
// สถานการณ์ที่ HAR ไม่มี response ของตัวกรอง: เฉลย = กรองรายการ 300 ใบของต้นฉบับด้วยเงื่อนไขเดียวกัน (คงลำดับเดิม)
// วิธีนี้ตรวจสอบได้ด้วยสถานการณ์ "บินตรง" ที่ HAR มี response จริง (ดู S4 nonstop.methodCheck)
function derived(pred, why) {
  return async (page) => {
    const all = await origAll(page);
    const keep = all.map((r, i) => (pred(r) ? i : -1)).filter((i) => i >= 0);
    const exp = keep.map((i) => all[i]);
    await o.showDerived(page, keep, `เฉลยอนุมานจากต้นฉบับ 300 ใบ: ${why} → ${exp.length} ใบ (HAR ไม่มีคำตอบของตัวกรองนี้)`);
    return { source: 'derived', from: all.length, rows: exp };
  };
}
const SUMMARY = (O) => O.source === 'derived' ? `${O.rows.length} ใบ (อนุมานจาก ${O.from} ใบของต้นฉบับ)` : `${O.rows.length} ใบ`;
const topPrices = (rs, n = 5) => rs.slice(0, n).map((r) => baht(r.price)).join(' · ');

export const AIRLINE = 'การบินไทย';
export const PRICE_MAX = 10000;
export const DEPART_FROM = 23;

export const SCENARIOS = [
  {
    id: 'S1', key: 'initial', title: 'รายการเริ่มต้น',
    orig: async (page) => { await o.open(page); return { rows: rows(await o.rawRows(page)) }; },
    clone: async (page) => { await c.open(page); return { rows: rows(await c.rawRows(page)), shown: await c.shownCount(page) }; },
    summary: (O) => `${SUMMARY(O)} · 5 ราคาแรก ${topPrices(O.rows)}`,
    compare: (O, G) => listVerdict(O.rows, G),
  },
  {
    id: 'S2', key: 'cheapest', title: 'แท็บถูกที่สุด',
    // HAR ไม่มี response ของแท็บนี้ (คลิกแล้วต้นฉบับได้ 0 แถว) → เฉลยจากต้นฉบับ: ป้ายแท็บ "เริ่มต้น ฿x" (ของจริง) + ราคาต่ำสุดในรายการ
    orig: async (page) => {
      await o.open(page);
      const label = await o.tabLabel(page);
      const init = rows(await o.rawRows(page));
      const labelPrice = priceOf(label);
      const minIdx = init.reduce((b, r, i) => (r.price < init[b].price ? i : b), 0);
      await page.getByRole('tab', { name: /ถูกที่สุด/ }).hover();
      await o.showDerived(page, null, `ป้ายแท็บต้นฉบับ: "${label.replace(/\n/g, ' ')}" · HAR ไม่มีรายการของแท็บนี้ → เทียบป้าย + ใบแรกต้องเป็นราคาต่ำสุด`);
      return { source: 'label', label, labelPrice, min: init[minIdx].price, cheapestRow: init[minIdx] };
    },
    clone: async (page) => { await c.open(page); const r = await c.cheapest(page); return { ...r, rows: rows(await c.rawRows(page)) }; },
    summary: (O) => `ป้าย "${O.label.replace(/\n/g, ' ')}" · ใบแรกต้อง ${baht(O.labelPrice)} (${O.cheapestRow.dep} ${O.cheapestRow.airline}) · ราคาเรียงจากน้อยไปมาก`,
    compare: (O, G) => {
      const bad = [];
      const lp = G.label ? priceOf(G.label) : null;
      if (G.label == null) bad.push(G.note || 'ไม่มีป้ายราคาแท็บ');
      else if (lp !== O.labelPrice) bad.push(`ป้ายแท็บ ${baht(lp)} แทน ${baht(O.labelPrice)}`);
      const f = G.rows[0];
      if (!f || f.price !== O.labelPrice) bad.push(`ใบแรก ${f ? `${f.dep} ${f.airline} ${baht(f.price)}` : '—'} แทน ${baht(O.labelPrice)}`);
      const unsorted = G.rows.findIndex((r, i) => i && r.price < G.rows[i - 1].price);
      if (unsorted > 0) bad.push(`ราคาไม่เรียงที่ #${unsorted + 1} (${baht(G.rows[unsorted - 1].price)} → ${baht(G.rows[unsorted].price)})`);
      const tail = `${G.rows.length} ใบ · 5 ราคาแรก ${topPrices(G.rows)}`;
      return { ok: !bad.length, detail: bad.length ? `ไม่ตรง: ${bad.join(' · ')} · (${tail})` : `ตรง (${tail})` };
    },
  },
  {
    id: 'S3', key: 'more', title: 'ดูเที่ยวบินเพิ่มเติม',
    orig: async (page) => ({ rows: await origAll(page) }),
    clone: async (page) => { await c.open(page); await c.more(page); return { rows: rows(await c.rawRows(page)), shown: await c.shownCount(page) }; },
    summary: (O) => `${SUMMARY(O)} · 5 ราคาแรก ${topPrices(O.rows)}`,
    compare: (O, G) => listVerdict(O.rows, G),
  },
  {
    id: 'S4', key: 'nonstop', title: 'บินตรง',
    // HAR มี response จริง (ดูเพิ่มเติม → บินตรง) ใช้ผลสดของต้นฉบับ และใช้ตรวจวิธี "เฉลยอนุมาน" ไปด้วย
    orig: async (page) => {
      const all = await origAll(page);
      await o.nonstop(page);
      const live = rows(await o.rawRows(page));
      const methodCheck = compareLists(all.filter((r) => r.stops === 0), live);
      return { rows: live, methodCheck: { ok: methodCheck.ok, detail: describeList(methodCheck) } };
    },
    clone: async (page) => { await c.open(page); await c.more(page).catch(() => {}); await c.nonstop(page); return { rows: rows(await c.rawRows(page)), shown: await c.shownCount(page) }; },
    summary: (O) => `${SUMMARY(O)} (ผลสดจาก HAR) · 5 ราคาแรก ${topPrices(O.rows)}`,
    compare: (O, G) => listVerdict(O.rows, G),
  },
  {
    id: 'S5', key: 'airline', title: `สายการบินเดียว (${AIRLINE})`,
    orig: derived((r) => r.airline === AIRLINE, `สายการบิน = "${AIRLINE}" อย่างเดียว`),
    clone: async (page) => { await c.open(page); await c.more(page).catch(() => {}); await c.airlineOnly(page, AIRLINE); return { rows: rows(await c.rawRows(page)), shown: await c.shownCount(page) }; },
    summary: (O) => `${SUMMARY(O)} · ${O.rows.map((r) => `${r.dep} ${baht(r.price)}`).join(' · ')}`,
    compare: (O, G) => setVerdict(O.rows, G),
  },
  {
    id: 'S6', key: 'price', title: `ราคาไม่เกิน ${baht(PRICE_MAX)}`,
    orig: derived((r) => r.price <= PRICE_MAX, `ราคา ≤ ${baht(PRICE_MAX)}`),
    clone: async (page) => { await c.open(page); await c.more(page).catch(() => {}); const v = await c.priceMax(page); return { slider: v, rows: rows(await c.rawRows(page)), shown: await c.shownCount(page) }; },
    summary: (O) => `${SUMMARY(O)} · ${topPrices(O.rows, 10)}`,
    compare: (O, G) => {
      const r = setVerdict(O.rows, G);
      const v = priceOf('฿' + (G.slider ?? ''));
      if (G.slider != null && v !== PRICE_MAX) { r.ok = false; r.detail += ` · slider ตั้งได้ ${G.slider} ไม่ใช่ ${PRICE_MAX}`; }
      return r;
    },
  },
  {
    id: 'S7', key: 'depart', title: 'ออกเดินทาง 23:00–24:00',
    orig: derived((r) => Number(r.dep?.slice(0, 2)) >= DEPART_FROM, `เวลาออก ${DEPART_FROM}:00–24:00`),
    clone: async (page) => { await c.open(page); await c.more(page).catch(() => {}); const v = await c.departLate(page); return { slider: v, rows: rows(await c.rawRows(page)), shown: await c.shownCount(page) }; },
    summary: (O) => `${SUMMARY(O)} · เวลาออก ${[...new Set(O.rows.map((r) => r.dep))].sort().join(', ')}`,
    compare: (O, G) => setVerdict(O.rows, G),
  },
  {
    id: 'S8', key: 'detail', title: 'รายละเอียดเที่ยวบินที่แวะพัก',
    // เลือกแถวแรกในรายการเริ่มต้นของต้นฉบับที่แวะพัก ≥ 1 ครั้ง แล้วขยายแถวเดียวกัน (เวลาออก + สายการบิน) ในโคลน
    orig: async (page) => {
      await o.open(page);
      const init = rows(await o.rawRows(page));
      const idx = init.findIndex((r) => r.stops >= 1);
      const text = await o.expandDetail(page, idx);
      return { pick: init[idx], detail: parseDetail(text) };
    },
    clone: async (page, O) => { await c.open(page); const text = await c.expandDetail(page, O.pick); return { detail: parseDetail(text) }; },
    summary: (O) => `${O.pick.dep} ${O.pick.airline} ${baht(O.pick.price)} · ${O.detail.points.join(' → ')} · ${O.detail.flights.join(', ')} · แวะ ${O.detail.layovers.join(', ')} · ${[...new Set(O.detail.aircraft)].join(', ')} · ที่วางขา ${[...new Set(O.detail.legroom)].join('/')} ซม.`,
    compare: (O, G) => {
      const label = { points: 'เวลา/สนามบิน', flights: 'เลขเที่ยวบิน', layovers: 'การแวะพัก', aircraft: 'เครื่องบิน', legroom: 'ที่วางขา' };
      const bad = Object.keys(label).filter((k) => JSON.stringify(O.detail[k]) !== JSON.stringify(G.detail[k]))
        .map((k) => `${label[k]}: ${G.detail[k].join(', ') || '—'} แทน ${O.detail[k].join(', ')}`);
      return { ok: !bad.length, detail: bad.length ? `ไม่ตรง: ${bad.join(' · ')}` : `ตรง (${G.detail.points.join(' → ')} · ${G.detail.flights.join(', ')} · แวะ ${G.detail.layovers.join(', ')})` };
    },
  },
];

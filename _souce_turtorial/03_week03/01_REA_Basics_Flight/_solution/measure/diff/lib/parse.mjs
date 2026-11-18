// แปลงข้อความของแถวเที่ยวบิน (ทั้งต้นฉบับและโคลน) ให้เป็นข้อมูลชุดเดียวกัน แล้วเทียบกัน
// ไม่มีค่าคาดหวังฝังในไฟล์นี้ — ค่าคาดหวังทุกตัวมาจากผลที่ดึงจากต้นฉบับตอนรัน

const TIME = /\b(\d{2}):(\d{2})\b/;

// raw = { text, name? } · text = innerText ของแถว, name = aria-label ของแถว (ถ้ามี)
export function parseRow({ text, name }) {
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const flat = lines.join(' ');
  const times = [...flat.matchAll(/\b\d{2}:\d{2}\b/g)].map((m) => m[0]);
  const price = Number((flat.match(/฿\s?([\d,]+)/)?.[1] ?? '').replace(/,/g, '')) || null;
  const stopsM = flat.match(/(?:แวะพัก|หยุดพัก)\s*(\d+)\s*ครั้ง/);
  const stops = /บินตรง/.test(flat) ? 0 : stopsM ? Number(stopsM[1]) : null;
  let airline = null;
  const fromName = name?.match(/^เที่ยวบิน (.+?) ราคา/);
  if (fromName) airline = fromName[1];
  else {
    const durIdx = lines.findIndex((l) => /^\d+ (ชม\.|นาที)/.test(l));
    const firstTimeIdx = lines.findIndex((l) => TIME.test(l));
    // รูปแบบรายการธรรมดา: ชื่อสายการบินอยู่ก่อนเวลาออก (ข้ามอักษรโลโก้ 1–2 ตัว และป้าย เช่น "ถูกสุด")
    const before = lines.slice(0, Math.max(firstTimeIdx, 0)).filter((l) => l.length > 2 && !/^(ถูกสุด|เร็วสุด|ดีที่สุด|แนะนำ)$/.test(l));
    if (before.length) airline = before.at(-1);
    // ต้นฉบับ: บรรทัดก่อนระยะเวลา ("8 ชม. 5 นาที") คือสายการบิน
    else if (durIdx > 0 && firstTimeIdx >= 0 && firstTimeIdx < durIdx && !TIME.test(lines[durIdx - 1])) airline = lines[durIdx - 1];
  }
  return { dep: times[0] ?? null, arr: times[1] ?? null, airline, price, stops };
}

// รายละเอียดเที่ยวบินที่ขยายแล้ว → ขาบิน เลขเที่ยวบิน การแวะพัก เครื่องบิน
export function parseDetail(text) {
  const flat = text.replace(/\s+/g, ' ');
  const points = [...flat.matchAll(/(\d{2}:\d{2})[^()]{0,80}?\(([A-Z]{3})\)/g)].map((m) => `${m[1]} ${m[2]}`);
  const flights = [...new Set([...flat.matchAll(/(?<![A-Z])([A-Z]{2}|[A-Z]\d|\d[A-Z]) (\d{1,4})(?![\d:])/g)].map((m) => `${m[1]} ${m[2]}`))];
  const layovers = [...flat.matchAll(/(?:หยุดพัก|แวะพัก)(?:นาน)?\s*((?:\d+ ชม\.)?\s*(?:\d+ นาที)?)[^()]{0,80}?\(([A-Z]{3})\)/g)]
    .map((m) => `${m[1].trim()} @${m[2]}`);
  const aircraft = [...flat.matchAll(/(Boeing \d{3}|Airbus A?\d{3}|A\d{3}(?:neo)?|Embraer \d+|ATR \d+)/g)].map((m) => m[1].replace(/^A(\d)/, 'Airbus A$1'));
  const legroom = [...flat.matchAll(/\((\d{2}) ซม\.\)/g)].map((m) => m[1]);
  return { points, flights, layovers, aircraft, legroom };
}

const fmt = (r) => r ? `${r.dep ?? '?'} ${r.airline ?? '?'} ฿${r.price?.toLocaleString('en-US') ?? '?'}` : '—';
const key = (r) => `${r.dep}|${r.airline}|${r.price}`;

// เทียบรายการเที่ยวบิน: จำนวน + ลำดับราคา + สายการบิน + เวลาออก (ทั้งลำดับ)
export function compareLists(exp, act) {
  const fields = { price: 'ราคา', airline: 'สายการบิน', dep: 'เวลาออก' };
  const out = { count: [exp.length, act.length], fields: {}, ok: exp.length === act.length };
  for (const [f, label] of Object.entries(fields)) {
    const n = Math.max(exp.length, act.length);
    let first = -1, diffs = 0;
    for (let i = 0; i < n; i++) if (exp[i]?.[f] !== act[i]?.[f]) { diffs++; if (first < 0) first = i; }
    out.fields[f] = { label, ok: diffs === 0, diffs, first, exp: exp[first]?.[f] ?? null, act: act[first]?.[f] ?? null };
    if (diffs) out.ok = false;
  }
  // ชุดเที่ยวบินเหมือนกันไหม (ไม่สนลำดับ) — ช่วยแยก "ข้อมูลต่าง" กับ "เรียงต่าง"
  const ek = exp.map(key), ak = act.map(key);
  const missing = ek.filter((k) => !ak.includes(k)), extra = ak.filter((k) => !ek.includes(k));
  out.sameSet = !missing.length && !extra.length;
  out.missing = missing.length; out.extra = extra.length;
  out.missingSample = exp.filter((r) => !ak.includes(key(r))).slice(0, 3).map(fmt);
  out.extraSample = act.filter((r) => !ek.includes(key(r))).slice(0, 3).map(fmt);
  return out;
}

// สรุปความต่างเป็นข้อความสั้นสำหรับรายงาน
export function describeList(c) {
  if (c.ok) return `ตรง (${c.count[1]} ใบ ลำดับราคา/สายการบิน/เวลาออกตรงทุกตำแหน่ง)`;
  const parts = [];
  if (c.count[0] !== c.count[1]) parts.push(`จำนวน ${c.count[1]} (ต้นฉบับ ${c.count[0]})`);
  for (const f of Object.values(c.fields)) {
    if (f.ok) continue;
    const show = (v) => (typeof v === 'number' ? `฿${v.toLocaleString('en-US')}` : v ?? '—');
    parts.push(`${f.label}ต่าง ${f.diffs} ตำแหน่ง เริ่มที่ #${f.first + 1}: ${show(f.act)} แทน ${show(f.exp)}`);
  }
  if (c.sameSet && c.count[0] === c.count[1]) parts.push('ชุดเที่ยวบินเหมือนกัน ต่างแค่ลำดับ');
  else {
    if (c.missing) parts.push(`ขาด ${c.missing} ใบ เช่น ${c.missingSample.join(' / ')}`);
    if (c.extra) parts.push(`เกิน/ไม่ตรง ${c.extra} ใบ เช่น ${c.extraSample.join(' / ')}`);
  }
  return 'ไม่ตรง: ' + parts.join(' · ');
}

export const priceOf = (s) => Number((s ?? '').match(/฿\s?([\d,]+)/)?.[1]?.replace(/,/g, '') ?? NaN);

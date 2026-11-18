// เทียบโครงสร้าง accessibility (ariaSnapshot) ของต้นฉบับแช่แข็งกับ v1 v2 v3
// อ่าน structure/snapshots/*.yml (จาก capture.mjs) → structure/metrics.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SNAP = path.join(DIR, 'snapshots');
const VERSIONS = ['v1', 'v2', 'v3'];
// LAB 3 (rea-flight-v3/SCOREBOARD.md): pixel diff และ acceptance 82 ข้อ — ใช้เป็นเกณฑ์อ้างอิงว่า "ครบ" แค่ไหน
const VISUAL = { v1: 27.88, v2: 8.19, v3: 8.32 };
const ACCEPT = { v1: 0 / 82, v2: 51 / 82, v3: 74 / 82 };

// ---------- แปลง YAML ของ ariaSnapshot เป็นรายการ node {role, name, text, url, landmark} ----------
function parse(yml) {
  const nodes = [], stack = [];
  for (const raw of yml.split('\n')) {
    const m = raw.match(/^(\s*)- (.*)$/);
    if (!m) continue;
    const depth = m[1].length / 2;
    let body = m[2];
    if (body.startsWith("'")) body = body.slice(1).replace(/'(:.*)?$/, '$1').replace(/''/g, "'");
    while (stack.length && stack.at(-1).depth >= depth) stack.pop();
    const parent = stack.at(-1)?.node;
    if (body.startsWith('/url:')) { if (parent) parent.url = body.slice(5).trim(); continue; }
    const r = body.match(/^([a-z]+)(?: "((?:[^"\\]|\\.)*)")?([^:]*)(?::\s*(.*))?$/);
    if (!r) continue;
    const node = { role: r[1], name: (r[2] ?? '').replace(/\\"/g, '"'), text: (r[4] ?? '').replace(/^"|"$/g, ''),
      landmark: depth === 0 ? r[1] : stack[0]?.node.landmark, parent };
    nodes.push(node);
    stack.push({ depth, node });
  }
  return nodes;
}

// ---------- ตัดสิ่งที่ตั้งใจให้ต่าง ----------
// banner ทั้งก้อน (โลโก้ Google/SkyThai, เมนู Google: สำรวจ/โรงแรม/ที่พักให้เช่า/แอป Google/เข้าสู่ระบบ, เมนูของแบรนด์โคลน)
// ลิงก์ไปโดเมนของ Google (เกี่ยวกับ Google Travel / ความเป็นส่วนตัว / ข้อกำหนด / ศูนย์ช่วยเหลือ / disclaimer สกุลเงิน / ความคิดเห็น)
// ชื่อที่มีแบรนด์ (Google, SkyThai) · กล่องหมายเหตุ "ข้อมูลจำลอง" และ alert ว่างของโคลน (เป็นข้อกำหนดของ LAB ไม่ใช่ของต้นฉบับ)
const GOOGLE_URL = /(^|\/\/|\.)(google|gstatic|about\.google|policies\.google|support\.google)\b|^\.\/#0$/i;
const BRAND = /google|skythai/i;
const excluded = (n) => n.landmark === 'banner' || n.role === 'banner'
  || (n.role === 'link' && n.url && GOOGLE_URL.test(n.url))
  || (n.parent?.role === 'paragraph' && n.landmark === 'contentinfo' && n.role === 'link')
  || BRAND.test(n.name) || ['note', 'alert'].includes(n.role)
  || (n.role === 'link' && /^(ความคิดเห็น|ศูนย์ช่วยเหลือ|ความเป็นส่วนตัว|ข้อกำหนด)$/.test(n.name));

// ---------- โทเคน role+ชื่อ ----------
// node ที่นับเป็น "องค์ประกอบ": มีชื่อ หรือเป็น landmark/โครงที่ไม่มีชื่อ (ไม่นับ text/img เปล่า/option/listitem/paragraph ฯลฯ)
const STRUCTURAL = new Set(['main', 'search', 'contentinfo', 'navigation', 'region', 'tablist', 'tabpanel', 'list', 'dialog', 'form', 'complementary', 'grid', 'table']);
const SKIP = new Set(['text', 'option', 'listitem', 'paragraph', 'strong', 'emphasis', 'superscript', 'subscript', 'generic', 'separator', 'group']);
const isElement = (n) => !SKIP.has(n.role) && (n.name || STRUCTURAL.has(n.role));
// ทำชื่อให้เป็นมาตรฐาน: ตัดสัญลักษณ์ตกแต่ง (▾ ☰ 🔍 📅 ⇄ ˅ ✕ ⓘ · , :) ตัดสถานะ "ไม่ได้เลือก" ของชิปตัวกรอง ตัวเลข → #
const norm = (s) => s.normalize('NFC').replace(/[^\p{L}\p{M}\p{N}฿\s]/gu, ' ').replace(/\bไม่ได้เลือก\s*$/u, '')
  .replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
// strict = role + ชื่อเต็ม (ข้อมูลตัวเลขเป็น #)   key = กลุ่ม role + คำแรกของชื่อ (ไม่สนว่าเป็น combobox หรือ button, ไม่สนคำต่อท้าย)
const FAMILY = { button: 'control', combobox: 'control', textbox: 'control', searchbox: 'control', switch: 'switch', checkbox: 'control', radio: 'control', slider: 'control', spinbutton: 'control' };
const strictTok = (n) => `${n.role}|${norm(n.name)}`;
const keyTok = (n) => `${FAMILY[n.role] ?? n.role}|${norm(n.name).replace(/[#฿]/g, ' ').trim().split(' ')[0] ?? ''}`;
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); const inter = [...A].filter((x) => B.has(x)).length; return { inter, union: new Set([...A, ...B]).size, j: inter / new Set([...A, ...B]).size }; };

// ---------- องค์ประกอบสำคัญของหน้าผลค้นหา (จากต้นฉบับ) — ตรวจแบบไม่ผูก role ตายตัวถ้าความหมายเดียวกัน ----------
const CTRL = ['button', 'combobox', 'textbox', 'searchbox', 'link'];
const has = (roles, re, min = 1) => (ns) => ns.filter((n) => roles.includes(n.role) && re.test(n.name)).length >= min;
const hasText = (re) => (ns) => ns.some((n) => re.test(n.name) || re.test(n.text));
const KEY = [
  ['landmark search (ฟอร์มค้นหา)', (ns) => ns.some((n) => n.role === 'search')],
  ['ประเภทตั๋ว', has(CTRL, /ประเภทตั๋ว/)],
  ['ผู้โดยสาร', has(CTRL, /^ผู้โดยสาร/)],
  ['ชั้นโดยสาร', has(CTRL, /ชั้นโดยสาร/)],
  ['ช่องต้นทาง', has(CTRL, /^ต้นทาง/)],
  ['ช่องปลายทาง', has(CTRL, /^ปลายทาง/)],
  ['สลับต้นทาง/ปลายทาง', has(CTRL, /สลับต้นทาง/)],
  ['ช่องวันที่ขาไป', has(CTRL, /^ขาไป/)],
  ['ตัวกรองทั้งหมด', has(CTRL, /ตัวกรองทั้งหมด/)],
  ...['จำนวนครั้งที่แวะพัก', 'สายการบิน', 'สัมภาระ', 'ราคา', 'เวลา', 'การปล่อยก๊าซ', 'สนามบินสำหรับต่อเครื่อง', 'ระยะเวลา']
    .map((f) => [`ชิปตัวกรอง${f}`, has(['button'], new RegExp(`^${f}(\\s|,|$)`))]),
  ['แท็บดีที่สุด', has(['tab'], /^ดีที่สุด/)],
  ['แท็บถูกที่สุด (มีราคาเริ่มต้น)', has(['tab'], /^ถูกที่สุด.*\d/)],
  ['tabpanel ของแท็บ', (ns) => ns.some((n) => n.role === 'tabpanel')],
  ['คำอธิบายการจัดอันดับ', has(['button'], /ข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ/)],
  ['ข้อความจำนวนผลลัพธ์', hasText(/มีผลลัพธ์ \d+ รายการ/)],
  ['หัวข้อ "เที่ยวบินยอดนิยม"', has(['heading'], /เที่ยวบินยอดนิยม/)],
  ['หัวข้อ "เที่ยวบินอื่นๆ"', has(['heading'], /เที่ยวบินอื่น/)],
  ['ตัวเลือกการจัดเรียง', has(CTRL, /จัดเรียง/)],
  ['ปุ่มค่าธรรมเนียมสัมภาระ', has(CTRL, /ค่าธรรมเนียมสัมภาระ/)],
  ['ใบเที่ยวบินอยู่ใน list', (ns) => ns.filter((n) => n.role === 'listitem' && n.parent?.role === 'list').length >= 10],
  ['ลิงก์ใบเที่ยวบิน ≥ 22 ใบ', has(['link'], /฿|บาท/, 22)],
  ['ปุ่มรายละเอียดเที่ยวบิน ≥ 22 ใบ', has(['button'], /^รายละเอียดเที่ยวบิน/, 22)],
  ['ปุ่มการปล่อยก๊าซต่อใบ', has(['button'], /ปล่อยก๊าซคาร์บอน|CO2/, 22)],
  ['หัวข้อข้อมูลเชิงลึกด้านราคา', has(['heading'], /ข้อมูลเชิงลึกด้านราคา|ราคา.*(สูง|ต่ำ|ปกติ)/)],
  ['ปุ่มดูประวัติราคา', has(CTRL, /ประวัติราคา/)],
  ['สวิตช์ติดตามราคา ×2', has(['switch'], /ติดตามราคา/, 2)],
  ['ปุ่มตารางวันที่', has(CTRL, /ตารางวันที่/)],
  ['ปุ่มกราฟราคา', has(CTRL, /กราฟราคา/)],
  ['การ์ดวันที่ถูกกว่า (เปลี่ยนวันที่)', has(CTRL, /เปลี่ยนวันที่/)],
  ['ปุ่มดูเที่ยวบินเพิ่มเติม', has(CTRL, /ดูเที่ยวบินเพิ่มเติม/)],
  ['ปุ่มภาษา/สถานที่ตั้ง/สกุลเงิน', (ns) => ['ภาษา', 'สถานที่ตั้ง', 'สกุลเงิน'].every((w) => ns.some((n) => n.role === 'button' && n.name.startsWith(w)))],
];

// ---------- คำนวณ ----------
const load = (v) => {
  const all = parse(fs.readFileSync(path.join(SNAP, `${v}.yml`), 'utf8'));
  const kept = all.filter((n) => !excluded(n));
  return { all, kept, elems: kept.filter(isElement), excludedCount: all.filter(isElement).length - kept.filter(isElement).length };
};
const orig = load('original');
const origKey = KEY.filter(([, f]) => f(orig.kept));
if (origKey.length !== KEY.length) throw new Error(`ต้นฉบับขาด key: ${KEY.filter(([, f]) => !f(orig.kept)).map(([l]) => l)}`);
const out = { original: { elements: orig.elems.length, excluded: orig.excludedCount, strictUnique: new Set(orig.elems.map(strictTok)).size, keyUnique: new Set(orig.elems.map(keyTok)).size }, versions: {} };
const roleCount = (es) => es.reduce((m, n) => ((m[n.role] = (m[n.role] || 0) + 1), m), {});
for (const v of VERSIONS) {
  const c = load(v);
  const s = jaccard(orig.elems.map(strictTok), c.elems.map(strictTok));
  const k = jaccard(orig.elems.map(keyTok), c.elems.map(keyTok));
  const missing = KEY.filter(([, f]) => !f(c.kept)).map(([l]) => l);
  // สัดส่วนชนิดองค์ประกอบ (role) — Σmin / Σmax ของจำนวนแต่ละ role (weighted Jaccard ของ role)
  const ro = roleCount(orig.elems), rc = roleCount(c.elems);
  const roles = new Set([...Object.keys(ro), ...Object.keys(rc)]);
  let mn = 0, mx = 0;
  for (const r of roles) { mn += Math.min(ro[r] || 0, rc[r] || 0); mx += Math.max(ro[r] || 0, rc[r] || 0); }
  const keyCov = (KEY.length - missing.length) / KEY.length;
  out.versions[v] = {
    elements: c.elems.length, excluded: c.excludedCount,
    strictJaccard: s, keyJaccard: k, roleWeightedJaccard: mn / mx,
    keyCoverage: keyCov, keyFound: KEY.length - missing.length, keyTotal: KEY.length, missing,
    // ความเหมือนของโครงสร้างรวม = ค่าเฉลี่ยของ key Jaccard (role+ชื่อ) กับ ความครบขององค์ประกอบสำคัญ
    structure: (k.j + keyCov) / 2,
    roles: rc,
    visualDiff: VISUAL[v], visualSimilarity: 100 - VISUAL[v], acceptance: ACCEPT[v],
    onlyInOriginalKey: [...new Set(orig.elems.map(keyTok))].filter((t) => !new Set(c.elems.map(keyTok)).has(t)),
  };
}
out.originalRoles = roleCount(orig.elems);
// สอดคล้องกับ acceptance แค่ไหน: ลำดับ (Spearman ของ 3 เวอร์ชัน) และ Pearson
const rank = (o) => { const e = Object.entries(o).sort((a, b) => a[1] - b[1]); return Object.fromEntries(e.map(([k], i) => [k, i + 1])); };
const spearman = (a, b) => { const ra = rank(a), rb = rank(b); const n = VERSIONS.length; return 1 - 6 * VERSIONS.reduce((s, v) => s + (ra[v] - rb[v]) ** 2, 0) / (n * (n * n - 1)); };
const pearson = (a, b) => { const xs = VERSIONS.map((v) => a[v]), ys = VERSIONS.map((v) => b[v]); const mx = xs.reduce((p, q) => p + q) / 3, my = ys.reduce((p, q) => p + q) / 3; const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0); return sxy / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0)); };
const metric = (f) => Object.fromEntries(VERSIONS.map((v) => [v, f(out.versions[v])]));
out.agreementWithAcceptance = Object.fromEntries(Object.entries({
  structure: metric((x) => x.structure), keyJaccard: metric((x) => x.keyJaccard.j), strictJaccard: metric((x) => x.strictJaccard.j),
  keyCoverage: metric((x) => x.keyCoverage), roleWeighted: metric((x) => x.roleWeightedJaccard), visualSimilarity: metric((x) => x.visualSimilarity),
}).map(([k, m]) => [k, { spearman: spearman(m, ACCEPT), pearson: pearson(m, ACCEPT) }]));
fs.writeFileSync(path.join(DIR, 'metrics.json'), JSON.stringify(out, null, 2));
const pct = (x) => (x * 100).toFixed(1) + '%';
for (const v of VERSIONS) { const x = out.versions[v]; console.log(v, { el: x.elements, ex: x.excluded, strict: pct(x.strictJaccard.j), key: pct(x.keyJaccard.j), role: pct(x.roleWeightedJaccard), cov: `${x.keyFound}/${x.keyTotal}`, structure: pct(x.structure) }, '\n  missing:', x.missing.join(' · ')); }
console.log('original', out.original);
console.log(out.agreementWithAcceptance);

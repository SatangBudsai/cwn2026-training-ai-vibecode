// node structure/compare.mjs <yml ของแอป> [original.yml]
// → { pct, jaccard, keyFound, keyTotal, missing[], extra[] }
// โครงสร้าง% = ½ × (Jaccard ของชุด "role|ชื่อ" + ชิ้นสำคัญที่มี ÷ ชิ้นสำคัญทั้งหมด) × 100
import fs from 'node:fs';

const D = new URL('.', import.meta.url).pathname;

// สิ่งที่ตั้งใจให้ต่าง (ตัดทั้งต้นไม้ย่อย): โลโก้/ชื่อแบรนด์ · ลิงก์บริการอื่นของ Google · บัญชีผู้ใช้ · ลิงก์องค์กร/นโยบายของ Google ท้ายหน้า
export const EXCLUDE = [
  /^(link|img|button|text)\|.*\bGoogle\b/i,                         // "Google" (โลโก้), "แอป Google", "เกี่ยวกับ Google Travel"
  /^link\|(สำรวจ|เที่ยวบิน|โรงแรม|ที่พักให้เช่า)$/,                   // แท็บบริการของ Google บนแถบหัว
  /^button\|เมนูหลัก$/,                                               // ลิ้นชักบริการ Google
  /^(link|button)\|(เข้าสู่ระบบ|ลงชื่อเข้าใช้|บัญชี Google|ออกจากระบบ)/, // บัญชีผู้ใช้
  /^(link|button)\|(ความเป็นส่วนตัว|ข้อกำหนด|ความคิดเห็น|ศูนย์ช่วยเหลือ)$/, // ลิงก์องค์กรท้ายหน้า
  /^button\|ความคิดเห็นเกี่ยวกับการช่วยเหลือพิเศษ$/,                   // ส่งความคิดเห็นถึง Google
];

export const norm = s => s
  .replace(/\\"/g, '"')
  .replace(/[\d๐-๙]+(?:[.,][\d๐-๙]+)*/g, '#')   // ราคา เวลา จำนวน วันที่ → #
  .replace(/\s+/g, ' ').trim();

// แปลง ariaSnapshot (yml) เป็นรายการ "role|ชื่อ" ที่ normalize แล้ว
export function items(yml) {
  const out = [];
  let skipIndent = -1;                                   // > -1 = กำลังข้ามต้นไม้ย่อยของโหนดที่ถูกตัด
  for (const raw of yml.split('\n')) {
    const indent = raw.search(/\S/);
    let line = raw.trim();
    if (!line.startsWith('- ')) continue;                  // คอมเมนต์ # และบรรทัดว่าง
    if (skipIndent >= 0) { if (indent > skipIndent) continue; skipIndent = -1; }
    if (line.startsWith('- /')) continue;                  // property เช่น /url:
    let s = line.slice(2);
    if (s.startsWith("'")) { const j = s.lastIndexOf("'"); s = s.slice(1, j).replace(/''/g, "'") + s.slice(j + 1); }
    let m = s.match(/^([a-z]+)\s+"((?:[^"\\]|\\.)*)"/);
    let role, name;
    if (m) { role = m[1]; name = m[2]; }
    else if ((m = s.match(/^([a-z]+)(?:\s*\[[^\]]*\])*\s*:\s*(.*)$/))) { role = m[1]; name = m[2].replace(/^"(.*)"$/, '$1'); }
    else if ((m = s.match(/^([a-z]+)/))) { role = m[1]; name = ''; }
    else continue;
    const it = `${role}|${norm(name)}`;
    if (EXCLUDE.some(re => re.test(it))) { skipIndent = indent; continue; }
    out.push(it);
  }
  return out;
}

// ชิ้นสำคัญ: { id, role, name } ตรงตัว (หลัง normalize) หรือ { id, role, pattern } เป็น regex กับชื่อที่ normalize แล้ว
export function keyHit(k, set) {
  const re = k.pattern ? new RegExp(k.pattern) : null;
  for (const it of set) {
    const i = it.indexOf('|'), role = it.slice(0, i), name = it.slice(i + 1);
    if (role !== k.role) continue;
    if (re ? re.test(name) : name === norm(k.name)) return true;
  }
  return false;
}

export function compare(appYml, origYml, key) {
  const A = new Set(items(appYml)), O = new Set(items(origYml));
  const inter = [...O].filter(x => A.has(x)).length;
  const union = new Set([...O, ...A]).size;
  const jaccard = union ? inter / union : 1;
  const found = key.filter(k => keyHit(k, A));
  const keyFrac = key.length ? found.length / key.length : 1;
  return {
    pct: +(50 * (jaccard + keyFrac)).toFixed(2),
    jaccard: +jaccard.toFixed(4),
    keyFound: found.length,
    keyTotal: key.length,
    missing: key.filter(k => !keyHit(k, A)).map(k => k.id),
    extra: [...A].filter(x => !O.has(x)),
    missingItems: [...O].filter(x => !A.has(x)),
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const app = process.argv[2];
  if (!app) { console.error('ใช้: node structure/compare.mjs <yml ของแอป> [original.yml]'); process.exit(2); }
  const orig = process.argv[3] || D + 'original.yml';
  const key = JSON.parse(fs.readFileSync(D + 'key.json', 'utf8')).keys;
  console.log(JSON.stringify(compare(fs.readFileSync(app, 'utf8'), fs.readFileSync(orig, 'utf8'), key), null, 2));
}

#!/usr/bin/env node
// ตรวจ SPEC.md + TEST-PLAN.md ก่อนส่งต่อ (ไม่แก้ไฟล์ แค่รายงาน)
// ใช้: node check-spec.mjs <โฟลเดอร์ที่มี SPEC.md และ TEST-PLAN.md>
// exit 0 = ผ่าน · exit 1 = มีปัญหาที่ต้องแก้
//
// ตรวจ 4 เรื่อง
//  1. ทุก FR-/NFR- ใน SPEC มี test อย่างน้อย 1 ข้อใน TEST-PLAN (คอลัมน์ "อ้างอิง")
//     รองรับรูปย่อ "FR-BKG-05, 06" = FR-BKG-05 และ FR-BKG-06
//  2. รหัส requirement / test ไม่ซ้ำ และ test อ้างถึง requirement ที่มีจริง
//  3. ตาราง test มีคอลัมน์ที่ test-from-plan อ่านได้ (#, ID, โมดูล, สิ่งที่ทดสอบ, ระดับ, ผลที่คาดหวัง) และระดับเป็น P1–P3
//  4. ไม่มีข้อมูลส่วนบุคคลแบบเต็ม: เบอร์มือถือไทย, เลขบัตรประชาชน 13 หลัก (customer-data-policy ข้อ 2–3)
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? '.');
const read = f => { const p = path.join(dir, f); if (!fs.existsSync(p)) { console.error(`❌ ไม่พบ ${p}`); process.exit(1); } return fs.readFileSync(p, 'utf8'); };
const spec = read('SPEC.md');
const plan = read('TEST-PLAN.md');
const problems = [];
const warn = [];

// ---- 1–2 requirement ids ----
const reqRow = /^\|\s*((?:FR|NFR)-[A-Z]+-\d+)\s*\|/gm;
const reqs = [...spec.matchAll(reqRow)].map(m => m[1]);
const dupReq = reqs.filter((id, i) => reqs.indexOf(id) !== i);
if (dupReq.length) problems.push(`รหัส requirement ซ้ำ: ${[...new Set(dupReq)].join(', ')}`);

const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
const lines = plan.split(/\r?\n/);
const hi = lines.findIndex((l, i) => l.trim().startsWith('|') && /ID/.test(l) && /คาดหวัง|expected/i.test(l) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? ''));
if (hi < 0) { console.error('❌ ไม่พบตาราง test case ที่มีคอลัมน์ ID และ ผลที่คาดหวัง'); process.exit(1); }
const head = cells(lines[hi]);
const col = re => head.findIndex(h => re.test(h));
const need = { '#': /^#$/, ID: /^id$/i, 'โมดูล': /โมดูล|module/i, 'สิ่งที่ทดสอบ': /ทดสอบ/, 'ระดับ': /ระดับ|priority/i, 'ผลที่คาดหวัง': /คาดหวัง|expected/i };
for (const [name, re] of Object.entries(need)) if (col(re) < 0) problems.push(`ตาราง test ขาดคอลัมน์ "${name}"`);
const cId = col(/^id$/i), cP = col(/ระดับ|priority/i), cRef = col(/อ้างอิง|ref|trace/i);
if (cRef < 0) problems.push('ตาราง test ขาดคอลัมน์ "อ้างอิง" (ใช้ตรวจว่าทุก requirement มี test)');

const tests = [];
for (let j = hi + 2; j < lines.length && lines[j].trim().startsWith('|'); j++) {
  const c = cells(lines[j]);
  tests.push({ id: c[cId], p: c[cP] ?? '', ref: cRef >= 0 ? c[cRef] ?? '' : '' });
}
const tIds = tests.map(t => t.id);
const dupT = tIds.filter((id, i) => tIds.indexOf(id) !== i);
if (dupT.length) problems.push(`รหัส test ซ้ำ: ${[...new Set(dupT)].join(', ')}`);
for (const t of tests) {
  if (!/^TC-[A-Z]+-\d+$/.test(t.id)) problems.push(`รหัส test ผิดรูปแบบ: "${t.id}" (ใช้ TC-<โมดูล>-NN)`);
  if (!/^P[123]$/.test(t.p)) problems.push(`${t.id}: ระดับต้องเป็น P1/P2/P3 (ได้ "${t.p}")`);
}

const covered = new Set();
const refRe = /((?:FR|NFR)-[A-Z]+)-(\d+)((?:\s*,\s*\d+\b)*)/g;
for (const t of tests) for (const m of t.ref.matchAll(refRe)) {
  const nums = [m[2], ...(m[3].match(/\d+/g) ?? [])];
  for (const n of nums) {
    const id = `${m[1]}-${n.padStart(2, '0')}`;
    covered.add(id);
    if (!reqs.includes(id)) problems.push(`${t.id} อ้างถึง ${id} ซึ่งไม่มีใน SPEC`);
  }
}
// หัวข้อ "## Requirement ที่ตรวจด้วยวิธีอื่น" นับว่าครอบคลุม (ตรวจด้วย review/เอกสาร/pilot)
const other = plan.split(/^## /m).find(s => /^Requirement ที่ตรวจด้วยวิธีอื่น/.test(s)) ?? '';
const byOther = new Set();
for (const m of other.matchAll(/(?:FR|NFR)-[A-Z]+-\d+/g)) {
  if (!reqs.includes(m[0])) problems.push(`หัวข้อตรวจด้วยวิธีอื่น อ้างถึง ${m[0]} ซึ่งไม่มีใน SPEC`);
  byOther.add(m[0]);
}
const uncovered = reqs.filter(r => !covered.has(r) && !byOther.has(r));

// ---- 4 PII ----
const pii = [
  [/(?<![\dX])0[689]\d-?\d{3}-?\d{4}(?![\d])/g, 'เบอร์มือถือเต็ม → ตัดทิ้ง หรือ 08X-XXX-1234'],
  [/(?<!\d)\d-?\d{4}-?\d{5}-?\d{2}-?\d(?!\d)/g, 'เลขบัตรประชาชนเต็ม → 1-XXXX-XXXXX-XX-3'],
];
for (const [name, text] of [['SPEC.md', spec], ['TEST-PLAN.md', plan]])
  for (const [re, fix] of pii) for (const m of text.matchAll(re)) problems.push(`${name}: พบ "${m[0]}" — ${fix}`);

// ---- open questions ----
const qs = [...spec.matchAll(/^\|\s*(Q-\d+)\s*\|/gm)].length;
if (!qs) warn.push('ไม่พบตาราง open questions (Q-xx) — TOR แทบไม่เคยครบ ตรวจ references/forgotten-topics.md อีกรอบ');
const gaps = (spec.match(/\bGAP\b/g) ?? []).length;

// ---- report ----
console.log(`requirement ${reqs.length} ข้อ (มี test ${reqs.filter(r => covered.has(r)).length}, ตรวจด้วยวิธีอื่น ${reqs.filter(r => !covered.has(r) && byOther.has(r)).length}) · test ${tests.length} ข้อ (P1 ${tests.filter(t => t.p === 'P1').length}) · open questions ${qs} · GAP ${gaps}`);
if (uncovered.length) warn.push(`requirement ที่ยังไม่มี test (${uncovered.length}): ${uncovered.join(', ')} — ถ้าตั้งใจ (เช่น ตรวจด้วยเอกสาร) ให้บอกผู้ใช้`);
warn.forEach(w => console.log(`⚠️  ${w}`));
problems.forEach(p => console.log(`❌ ${p}`));
if (problems.length) process.exit(1);
console.log('✅ ผ่าน');

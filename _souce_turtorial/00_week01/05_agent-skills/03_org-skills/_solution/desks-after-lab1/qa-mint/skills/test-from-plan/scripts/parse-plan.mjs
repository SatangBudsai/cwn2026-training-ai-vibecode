#!/usr/bin/env node
// อ่าน TEST-PLAN.md แล้วเขียน plan.json ที่สคริปต์อื่นใช้ร่วมกัน
// ใช้: node parse-plan.mjs [--plan ../TEST-PLAN.md] [--out plan.json]   (รันใน e2e/)
//
// กติกา black-box: หัวข้อที่เป็น "เฉลย / สำหรับผู้สอน / solution / answer" จะถูกข้ามทั้งหัวข้อ
// สคริปต์นี้ไม่พิมพ์เนื้อหาของหัวข้อเหล่านั้นออกมาเด็ดขาด (พิมพ์แค่ชื่อหัวข้อที่ข้าม)
import fs from 'node:fs';
import path from 'node:path';

const arg = (name, def) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };
const planFile = path.resolve(arg('--plan', '../TEST-PLAN.md'));
const outFile = path.resolve(arg('--out', 'plan.json'));
if (!fs.existsSync(planFile)) { console.error(`ไม่พบไฟล์แผน: ${planFile}`); process.exit(1); }

const FORBIDDEN = /เฉลย|ผู้สอน|solution|answer|instructor|bug.?mode/i;
const text = fs.readFileSync(planFile, 'utf8');

// แบ่งตามหัวข้อระดับ ## (หัวข้อ # บนสุดคือชื่อแผน)
const sections = [];
let cur = { title: '(intro)', lines: [] };
for (const line of text.split(/\r?\n/)) {
  if (/^##\s+/.test(line)) { sections.push(cur); cur = { title: line.replace(/^##\s+/, '').trim(), lines: [] }; }
  else cur.lines.push(line);
}
sections.push(cur);
const allowed = sections.filter(s => !FORBIDDEN.test(s.title));
const skipped = sections.filter(s => FORBIDDEN.test(s.title)).map(s => s.title);
const allowedText = allowed.map(s => `## ${s.title}\n${s.lines.join('\n')}`).join('\n');
const find = re => allowed.find(s => re.test(s.title));

// ---------- URL ----------
const url = (allowedText.match(/https?:\/\/[^\s`)<>|*]+/) ?? [])[0]?.replace(/[.,;:]+$/, '');
let baseURL = null, healthPath = null;
if (url) { const u = new URL(url); baseURL = (u.origin + u.pathname).replace(/\/+$/, ''); }
const healthM = allowedText.match(/`?(\/[\w/.-]*health[\w/.-]*)`?/i);
if (healthM) healthPath = healthM[1];
const resetM = allowedText.match(/(POST)\s+`?(\/[\w/.-]+)`?/i) ?? allowedText.match(/`(\/[\w/.-]*reset[\w/.-]*)`/i);
const resetPath = resetM ? (resetM[2] ?? resetM[1]) : null;

// ---------- ตาราง test cases ----------
const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
const COLS = {
  no: /^#$|^no\.?$|ลำดับ/i,
  id: /^id$|รหัส/i,
  module: /โมดูล|module|feature|ส่วน/i,
  what: /สิ่งที่ทดสอบ|ทดสอบ|title|scenario|test ?case|รายละเอียด/i,
  priority: /ระดับ|priority|ความสำคัญ|^p$/i,
  expected: /คาดหวัง|expected/i,
};
const cases = [];
for (const s of allowed) {
  const ls = s.lines;
  for (let i = 0; i < ls.length - 1; i++) {
    if (!ls[i].trim().startsWith('|') || !/^\s*\|?\s*:?-{2,}/.test(ls[i + 1])) continue;
    const head = cells(ls[i]);
    const map = {};
    head.forEach((h, k) => { for (const [key, re] of Object.entries(COLS)) if (map[key] === undefined && re.test(h)) { map[key] = k; break; } });
    if (map.id === undefined || map.expected === undefined) continue;
    for (let j = i + 2; j < ls.length && ls[j].trim().startsWith('|'); j++) {
      const c = cells(ls[j]);
      const id = (c[map.id] ?? '').replace(/[*`]/g, '').trim();
      if (!/^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/.test(id)) continue;
      const clean = v => (v ?? '').replace(/\*\*/g, '').replace(/`/g, '').trim();
      cases.push({
        no: map.no !== undefined ? Number(clean(c[map.no])) || cases.length + 1 : cases.length + 1,
        id,
        module: clean(c[map.module]) || id.split('-').slice(0, -1).join('-'),
        what: clean(c[map.what]),
        priority: (clean(c[map.priority]).match(/P\d/i) ?? ['P?'])[0].toUpperCase(),
        expected: clean(c[map.expected]),
        section: s.title,
      });
    }
  }
}
if (!cases.length) { console.error('ไม่พบตาราง test case (ต้องมีคอลัมน์ ID และ ผลที่คาดหวัง/Expected)'); process.exit(1); }
const dup = cases.map(c => c.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dup.length) console.warn('⚠️ รหัสซ้ำในแผน:', [...new Set(dup)].join(', '));

// ---------- เกณฑ์ผ่าน ----------
const exitSec = find(/เกณฑ์|criteria|exit/i);
const exitText = exitSec ? exitSec.lines.join('\n') : '';
const rateM = exitText.match(/(\d+(?:\.\d+)?)\s*%/);
const mustPass = [...new Set([
  ...[...exitText.matchAll(/(P\d)[^\n]{0,30}?(ผ่านทั้งหมด|ผ่านครบ|all pass|must pass|100\s*%)/gi)].map(m => m[1]),
  ...[...exitText.matchAll(/(?:all|every)\s+(P\d)/gi)].map(m => m[1]),
].map(s => s.toUpperCase()))];
const exit = {
  passRate: rateM ? Number(rateM[1]) : 95,
  mustPass: mustPass.length ? mustPass : ['P1'],
  text: exitText.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^\s*-\s*/, '').replace(/\*\*/g, '')),
  fromPlan: !!rateM,
};

// ---------- โมดูล → ไฟล์ spec ----------
const modules = [];
for (const c of cases) {
  let m = modules.find(x => x.name === c.module);
  if (!m) {
    const prefix = c.id.split('-').slice(0, -1).join('-');
    const slug = prefix.replace(/^TC-/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    m = { name: c.module, slug, spec: `tests/${slug}.spec.ts`, ids: [] };
    modules.push(m);
  }
  c.spec = m.spec;
  m.ids.push(c.id);
}

const plan = {
  planFile: (() => { const rel = path.relative(process.cwd(), planFile); return (rel.match(/\.\./g) ?? []).length > 2 ? planFile : rel; })().split(path.sep).join('/'),
  parsedAt: new Date().toISOString(),
  baseURL, healthPath, resetPath,
  exit,
  priorities: [...new Set(cases.map(c => c.priority))].sort(),
  sections: { allowed: allowed.map(s => s.title).filter(t => t !== '(intro)'), skipped },
  testDataSection: find(/ข้อมูลทดสอบ|test data/i)?.title ?? null,
  modules,
  cases,
};
fs.writeFileSync(outFile, JSON.stringify(plan, null, 2));

console.log(`แผน: ${plan.planFile}`);
console.log(`URL: ${baseURL ?? '❌ ไม่พบ — ต้องถามผู้ใช้'} · health: ${healthPath ?? '-'} · reset: ${resetPath ? 'POST ' + resetPath : '-'}`);
console.log(`test cases: ${cases.length} ข้อ · ${plan.priorities.map(p => `${p} ${cases.filter(c => c.priority === p).length}`).join(' · ')}`);
console.log(`เกณฑ์ผ่าน: ${exit.mustPass.join(',')} ผ่านทั้งหมด และอัตราผ่าน ≥ ${exit.passRate}%${exit.fromPlan ? '' : ' (ค่าเริ่มต้น — แผนไม่ได้ระบุ)'}`);
console.log(`โมดูล ${modules.length}: ${modules.map(m => `${m.name}(${m.ids.length})→${m.spec}`).join(' · ')}`);
console.log(`หัวข้อที่อ่านได้: ${plan.sections.allowed.join(' | ')}`);
if (skipped.length) console.log(`🔒 หัวข้อที่ข้าม (ห้ามอ่าน): ${skipped.join(' | ')}`);
console.log(`→ เขียน ${path.relative(process.cwd(), outFile)}`);

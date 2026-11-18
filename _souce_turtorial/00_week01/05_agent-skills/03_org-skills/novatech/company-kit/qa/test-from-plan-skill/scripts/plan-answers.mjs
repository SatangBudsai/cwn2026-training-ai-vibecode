#!/usr/bin/env node
// หาคำตอบของเจ้าของแผนที่เคยให้ไว้ (references/plan-answers/*.json) ที่ใช้กับแผน "นี้" ได้จริง
// ใช้: node plan-answers.mjs [--write]      (cwd = e2e, หลัง parse-plan.mjs)
//
// กันใช้ผิดแผน: ไฟล์คำตอบจะถูกใช้เฉพาะเมื่อ scope ตรงทุกข้อ (ชื่อแผนในหัวเรื่องบรรทัดแรก, baseURL, จำนวน test)
// และคำตอบแต่ละข้อใช้ได้เฉพาะเมื่อ test ID นั้นมีอยู่ และข้อความ planText ยังอยู่ในแถวของ test นั้น (สิ่งที่ทดสอบ/ผลที่คาดหวัง)
// ถ้าแผนเปลี่ยนถ้อยคำ → คำตอบข้อนั้น "หมดอายุ" ต้องถามเจ้าของแผนใหม่ (ห้ามเดาว่ายังใช้ได้)
//
// --write: เติมคำตอบแบบ interpretation ลง test-report/interpretations.json (ฟิลด์ answer → รายงานย้ายไปตาราง "ตอบแล้ว")
//          และสร้างร่าง test-report/observations.json จากคำตอบแบบ observation (ต้องตรวจกับเว็บรอบนี้แล้วเติม detail/evidence เอง)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlan } from './_lib.mjs';

const plan = loadPlan();
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'references', 'plan-answers');
const planPath = path.resolve(plan.planFile);
const title = fs.readFileSync(planPath, 'utf8').split(/\r?\n/).find(l => /^#\s/.test(l)) ?? '';
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [];

const matched = [];
for (const f of files) {
  const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const s = a.scope ?? {};
  const why = [];
  if (!s.planTitleIncludes || !title.includes(s.planTitleIncludes)) why.push(`ชื่อแผนไม่มี "${s.planTitleIncludes}"`);
  if (s.baseURL && s.baseURL !== plan.baseURL) why.push(`baseURL ${plan.baseURL} ≠ ${s.baseURL}`);
  if (s.caseCount && s.caseCount !== plan.cases.length) why.push(`จำนวน test ${plan.cases.length} ≠ ${s.caseCount}`);
  if (why.length) { console.log(`⏭  ${f}: ไม่ใช่แผนนี้ (${why.join(', ')}) — ไม่ใช้`); continue; }
  matched.push({ f, a });
}
if (!matched.length) { console.log('ไม่มีคำตอบเดิมสำหรับแผนนี้ → จุดกำกวมทุกจุดต้องลองอีกแบบและถามผู้ใช้ตามปกติ'); process.exit(0); }

const valid = [], stale = [];
for (const { f, a } of matched) {
  for (const x of a.answers) {
    const c = plan.cases.find(k => k.id === x.test);
    const ok = c && `${c.what} ${c.expected}`.includes(x.planText);
    (ok ? valid : stale).push({ ...x, file: f, answeredBy: a.answeredBy, answeredAt: a.answeredAt });
  }
}
console.log(`✅ ใช้คำตอบเดิม ${valid.length} ข้อ (จาก ${matched.map(m => m.f).join(', ')}):`);
for (const v of valid) console.log(`   ${v.test} [${v.kind}] ${v.answer}`);
if (stale.length) {
  console.log(`⚠️ หมดอายุ ${stale.length} ข้อ (แผนเปลี่ยนถ้อยคำหรือไม่มี test นี้แล้ว) — ต้องถามใหม่:`);
  for (const s of stale) console.log(`   ${s.test}: "${s.planText}"`);
}

if (process.argv.includes('--write')) {
  fs.mkdirSync('test-report', { recursive: true });
  const iFile = 'test-report/interpretations.json';
  const interps = fs.existsSync(iFile) ? JSON.parse(fs.readFileSync(iFile, 'utf8')) : [];
  for (const v of valid.filter(v => v.kind === 'interpretation')) {
    const e = interps.find(i => i.test === v.test && !i.answer) ?? interps.find(i => i.test === v.test);
    const fields = { wording: v.wording, chosen: v.chosen, answer: v.answer, answeredBy: v.answeredBy, answeredAt: v.answeredAt };
    if (e) { Object.assign(e, fields); delete e.chosenResult; delete e.alternative; delete e.altResult; delete e.altEvidence; delete e.question; }
    else interps.push({ test: v.test, ...fields });
  }
  const oFile = 'test-report/observations.json';
  const obs = fs.existsSync(oFile) ? JSON.parse(fs.readFileSync(oFile, 'utf8')) : [];
  let n = obs.length;
  for (const v of valid.filter(v => v.kind === 'observation')) {
    // ถ้ารอบนี้มีคำถามเรื่องเดียวกันใน interpretations อยู่แล้ว → ปิดคำถามด้วยคำตอบ (ย้ายไปเป็นข้อสังเกต)
    const q = interps.find(i => i.test === v.test && !i.answer);
    if (q) { Object.assign(q, { answer: v.answer, answeredBy: v.answeredBy, answeredAt: v.answeredAt }); }
    if (obs.some(o => o.test === v.test && o.title === v.title)) continue;
    obs.push({ id: `OBS-${String(++n).padStart(2, '0')}`, test: v.test, flag: v.flag, title: v.title,
      detail: `TODO ตรวจกับเว็บรอบนี้: ${v.check}`, evidence: 'TODO' });
  }
  fs.writeFileSync(iFile, JSON.stringify(interps, null, 2));
  fs.writeFileSync(oFile, JSON.stringify(obs, null, 2));
  console.log(`→ เขียน ${iFile} และ ${oFile} (แก้ TODO ใน observations ด้วยผลที่ตรวจจริงรอบนี้)`);
}

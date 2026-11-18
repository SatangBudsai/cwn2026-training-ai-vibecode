#!/usr/bin/env node
// สร้าง test-report/TEST-REPORT.md 7 ส่วน จากผลรันล่าสุดเท่านั้น (ไม่รันใหม่ ไม่แก้ test)
// ส่วนที่ 6 "ข้อที่ต้องถามผู้ใช้" มาจาก test-report/interpretations.json (ต้องมีทุกรอบ; ไม่มีจุดกำกวม = [])
// ใช้: node build-report.mjs [--env "BUG_MODE=0, container petshop healthy"]   (รันใน e2e/)
// ข้อมูล: plan.json · test-report/results.json · test-report/run-info.json (global-setup เขียน)
//         test-report/bugs.json (คนหรือ agent หลักเขียน หลังดูหลักฐานแล้ว — ดูรูปแบบใน SKILL.md)
//         test-report/gifs.json (make-gifs เขียน) · test-report/results-round1.json (ถ้ามี = ผลรอบแรกก่อนแก้ test)
// การตัดสิน "ปล่อยได้/ยังไม่ปล่อย" คำนวณจากเกณฑ์ใน plan.json (หัวข้อเกณฑ์ของแผน) ไม่ได้ตั้งค่าตายตัว
import fs from 'node:fs';
import { loadPlan, loadResults, gifSeconds, playwright, arg } from './_lib.mjs';

const plan = loadPlan();
const { results, byId } = loadResults(plan);
const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const runInfo = readJson('test-report/run-info.json', null);
const bugs = readJson('test-report/bugs.json', []);
const interpFile = 'test-report/interpretations.json';
const interps = readJson(interpFile, null);
if (interps === null) console.warn(`⚠️ ไม่มี ${interpFile} — ต้องไล่จุดที่แผนกำกวมแล้วบันทึก (ไม่มีจริงให้เขียน []) ก่อนส่งรายงาน`);
const round1 = fs.existsSync('test-report/results-round1.json') ? loadResults(plan, 'test-report/results-round1.json').byId : null;

const { chromium } = playwright();
const browser = await chromium.launch();
const chromiumVersion = browser.version();
await browser.close();

const rows = plan.cases.map(c => {
  const r = byId.get(c.id);
  return { ...c, ok: !!r?.ok, status: r?.status ?? 'missing', sec: gifSeconds(`test-report/gifs/${c.id}.gif`), first: round1?.get(c.id)?.status };
});
const N = rows.length, P = rows.filter(r => r.ok).length, F = N - P;
const pct = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '-');
const pIcon = { P1: '🔴', P2: '🟡', P3: '🟢' };
const byP = plan.priorities.map(k => { const x = rows.filter(r => r.priority === k); const ok = x.filter(r => r.ok).length; return { k, n: x.length, ok, f: x.length - ok }; });
const mods = plan.modules.map(m => { const x = rows.filter(r => r.module === m.name); const ok = x.filter(r => r.ok).length; return { m: m.name, n: x.length, ok, f: x.length - ok }; });
const start = new Date(results.stats.startTime);
const secs = rows.map(r => r.sec).filter(Boolean);

// ---- เกณฑ์ ----
const criteria = rs => {
  const n = rs.length, ok = rs.filter(r => r.ok).length;
  const out = [];
  if (runInfo?.health) out.push({ name: `เริ่มทดสอบได้: ${runInfo.health.path} ตอบปกติ`, actual: `${runInfo.health.status} ${runInfo.health.body}`, ok: runInfo.health.ok, entry: true });
  for (const k of plan.exit.mustPass) { const x = rs.filter(r => r.priority === k); const xo = x.filter(r => r.ok).length; out.push({ name: `${k} ผ่านทั้งหมด`, actual: `${xo} / ${x.length}`, ok: xo === x.length }); }
  out.push({ name: `อัตราผ่านรวม ≥ ${plan.exit.passRate}%`, actual: `${ok} / ${n} = ${pct(ok, n)}`, ok: ok / n * 100 >= plan.exit.passRate });
  return out;
};
const crit = criteria(rows);
const release = crit.every(c => c.ok);
const allowFail = Math.floor(N * (1 - plan.exit.passRate / 100) + 1e-9);

// ---- ข้อที่ต้องถามผู้ใช้: ถ้าตีความอีกแบบทุกข้อ ผลและคำตัดสินเป็นอย่างไร ----
// ข้อที่มีฟิลด์ "answer" = เจ้าของแผนตอบแล้ว → ไม่นับเป็นความเสี่ยงต่อคำตัดสิน แสดงในตาราง "คำตอบจากเจ้าของแผน"
const allInterps = interps ?? [];
const answered = allInterps.filter(i => i.answer);
const iList = allInterps.filter(i => !i.answer);
// ข้อสังเกตนอกแผน (ไม่นับในผล/คำตัดสิน) — test-report/observations.json
const observations = readJson('test-report/observations.json', []);
// คำตัดสินพลิกได้จริงไหม: ลองกรณีที่ "เอื้อให้พลิกที่สุด" (ไม่ใช่ใช้อีกแบบทุกข้อ ซึ่งบางข้อดึงไปคนละทาง)
//  - ตอนนี้ "ยังไม่ปล่อย" → ทุกข้อที่อีกแบบผ่านได้ (passed หรือ unknown) ให้ถือว่าผ่าน แล้วดูว่าผ่านเกณฑ์ไหม
//  - ตอนนี้ "ปล่อยได้"   → ทุกข้อที่อีกแบบล้มได้ (failed หรือ unknown) ให้ถือว่าล้ม แล้วดูว่ายังผ่านเกณฑ์ไหม
// ถ้ากรณีนั้นยังได้คำตัดสินเดิม = เด็ดขาด (เช่น P1 ที่ล้มโดยไม่มีการตีความอื่นช่วยได้)
const curOf = i => i.chosenResult ?? byId.get(i.test)?.status;
const isUnknown = i => !['passed', 'failed'].includes(i.altResult);
const changes = i => isUnknown(i) || i.altResult !== curOf(i);
const want = release ? 'failed' : 'passed';                       // ทิศที่ทำให้คำตัดสินพลิก
const pushes = i => changes(i) && (isUnknown(i) || i.altResult === want);
const flipTests = new Set(iList.filter(pushes).map(i => i.test));
const altRows = rows.map(r => (flipTests.has(r.id) ? { ...r, ok: !release } : r));
const altRelease = criteria(altRows).every(c => c.ok);
const verdictAtRisk = altRelease !== release;
const unknownAlt = iList.filter(isUnknown);
// ถามผู้ใช้เฉพาะ: (ก) ข้อที่คำตอบพลิกคำตัดสินได้ หรือ (ข) ข้อ P1 ที่ผลจะเปลี่ยน/ยังไม่รู้
// ข้ออื่น: ใช้แบบตรงตัวอักษรที่สุด แล้วจดในตารางสั้นท้ายรายงาน ไม่ต้องถาม
const prioOf = id => rows.find(r => r.id === id)?.priority;
const askReason = i => {
  const why = [];
  if (verdictAtRisk && flipTests.has(i.test) && pushes(i)) why.push('พลิกคำตัดสินได้');
  if (plan.exit.mustPass.includes(prioOf(i.test)) && changes(i)) why.push(`ผลข้อ ${prioOf(i.test)} เปลี่ยน`);
  return why;
};
const askList = iList.filter(i => askReason(i).length);
const selfList = iList.filter(i => !askReason(i).length);
const resTh = s => ({ passed: '✅ ผ่าน', failed: '❌ ล้ม' }[s] ?? '❔ ยังไม่รู้');
const answeredSection = answered.length ? `### คำตอบจากเจ้าของแผน (ตัดสินแล้ว ไม่ต้องถามซ้ำ)

| test | คำในแผน | คำตอบ | ใช้ใน test → ผล |
|---|---|---|---|
${answered.map(i => `| ${i.test} | "${i.wording}" | ${i.answer}${i.answeredBy ? ` — ${i.answeredBy}${i.answeredAt ? ` ${i.answeredAt}` : ''}` : ''} | ${i.chosen} → ${resTh(i.chosenResult ?? byId.get(i.test)?.status)} |`).join('\n')}

### ยังต้องถาม

` : '';
const interpSection = answeredSection + (interps === null
  ? '> ⚠️ **ยังไม่ได้ตรวจจุดกำกวมของแผน** (ไม่มี `interpretations.json`) — รายงานนี้ยังไม่สมบูรณ์'
  : !iList.length
    ? (answered.length ? 'ไม่มี — ทุกจุดกำกวมได้คำตอบจากเจ้าของแผนแล้ว' : 'ไม่พบจุดที่แผนเขียนกำกวมในรอบนี้ (ตรวจแล้ว)')
    : `ถามเฉพาะข้อที่คำตอบ **พลิกคำตัดสินได้** หรือ **เปลี่ยนผลข้อ ${plan.exit.mustPass.join('/')}** (ข้ออื่นตีความตรงตัวอักษรเองแล้ว ดูตารางท้ายรายงาน)

${askList.length ? `| test | ระดับ | คำถาม | ตีความแบบที่ใช้ → ผล | ถ้าตีความอีกแบบ → ผล | ทำไมต้องถาม |
|---|---|---|---|---|---|
${askList.map(i => `| ${i.test} | ${prioOf(i.test)} | ${i.question ?? '-'} | ${i.chosen} → ${resTh(curOf(i))} | ${i.alternative} → ${resTh(i.altResult)}${i.altEvidence ? ` (${i.altEvidence})` : ''} | ${askReason(i).join(' · ')} |`).join('\n')}` : 'ไม่มีข้อที่ต้องถาม'}

**ผลต่อคำตัดสิน:** กรณีที่เอื้อให้พลิกที่สุด (ทุกข้อที่ตีความอีกแบบแล้ว${release ? 'ล้ม' : 'ผ่าน'}ได้ ถือว่า${release ? 'ล้ม' : 'ผ่าน'}) ผ่าน ${altRows.filter(r => r.ok).length}/${N} (${pct(altRows.filter(r => r.ok).length, N)}) → **${altRelease ? 'ปล่อยได้' : 'ยังไม่ปล่อย'}** ${altRelease === release ? '— คำตัดสินเหมือนเดิม **ไม่ว่าจะตอบแบบไหน**' : '— ⚠️ **คำตัดสินพลิกได้** ต้องให้ผู้ใช้/เจ้าของแผนตอบก่อน'}`);
const selfSection = selfList.length ? `

## ภาคผนวก: จุดกำกวมที่ตีความเอง (ไม่ต้องถาม — ไม่พลิกคำตัดสิน และไม่เปลี่ยนผลข้อ ${plan.exit.mustPass.join('/')})

| test | คำในแผน | ใช้แบบ → ผล | อีกแบบ → ผล |
|---|---|---|---|
${selfList.map(i => `| ${i.test} | "${i.wording}" | ${i.chosen} → ${resTh(curOf(i))} | ${i.alternative} → ${resTh(i.altResult)} |`).join('\n')}
` : '';
const obsSection = observations.length ? `

### ข้อสังเกตนอกแผน (ไม่นับในผลและคำตัดสิน)

พบระหว่างทดสอบ แต่ไม่อยู่ในแผน — ไม่ได้เขียน test เพิ่ม ส่งให้ทีมพิจารณา

| รหัส | เกี่ยวกับ | เรื่อง | รายละเอียด | หลักฐาน |
|---|---|---|---|---|
${observations.map(o => `| ${o.id} | ${o.test ?? '-'} | ${o.flag ? `**${o.flag}** ` : ''}${o.title} | ${o.detail} | ${o.evidence ?? '-'} |`).join('\n')}` : '';

// ---- ข้อบกพร่อง: ทุกข้อที่ล้มต้องมีใน bugs.json ----
const failed = rows.filter(r => !r.ok);
const unclassified = failed.filter(r => !bugs.some(b => b.test === r.id));
if (unclassified.length) console.warn(`⚠️ ข้อที่ล้มแต่ยังไม่มีใน bugs.json: ${unclassified.map(r => r.id).join(', ')} — ดูหลักฐานแล้วจัดประเภทก่อนส่งรายงาน`);
const bugRows = bugs.length
  ? bugs.map(b => `| ${b.bug} | ${b.test} | ${b.severity} | ${b.symptom} | [${b.test}.gif](gifs/${b.test}.gif)${b.evidence ? ' · ' + b.evidence : ''} |`).join('\n')
  : '| - | - | - | ไม่พบข้อบกพร่อง | - |';
const bugNotes = bugs.map(b => [
  `### ${b.bug} · ${b.test}`,
  b.why ? `**ทำไมเป็น "เว็บผิด" ไม่ใช่ "test ผิด":** ${b.why}` : '',
  b.repro?.length ? `**ขั้นตอนทำซ้ำ:** ${b.repro.map((s, i) => `${i + 1}) ${s}`).join(' → ')}` : '',
  b.expected ? `**ผลที่คาดหวัง:** ${b.expected}` : '',
  b.actual ? `**ผลจริง:** ${b.actual}` : '',
].filter(Boolean).join('\n\n')).join('\n\n');

const md = `# รายงานผลการทดสอบ (Test Report)

> สร้างจากผลการรันล่าสุด \`test-report/results.json\` เท่านั้น (ไม่ได้รันใหม่และไม่ได้แก้ test ระหว่างทำรายงาน)

## 1. ข้อมูลรอบทดสอบ

| รายการ | ค่า |
|---|---|
| วันที่ทดสอบ | ${start.toLocaleDateString('th-TH', { dateStyle: 'long' })} เวลา ${start.toLocaleTimeString('th-TH')} (รันขนาน ${(results.stats.duration / 1000).toFixed(1)} วินาที) |
| เว็บที่ทดสอบ | \`${plan.baseURL}\`${arg('--env') ? ` (${arg('--env')})` : ''} |
| Entry criteria | ${runInfo?.health ? `\`${runInfo.health.path}\` → ${runInfo.health.status} \`${runInfo.health.body}\` ${runInfo.health.ok ? '✅' : '❌'}` : 'ไม่มีข้อมูล'} · ล้างข้อมูลก่อนรัน: ${typeof runInfo?.reset === 'object' ? `POST \`${runInfo.reset.path}\` → ${runInfo.reset.status} ✅` : runInfo?.reset ?? '-'} |
| เบราว์เซอร์ | Chromium ${chromiumVersion} (Playwright ${results.config.version}, headless, ${results.config.metadata?.actualWorkers ?? results.config.workers ?? '-'} workers ขนาน) |
| จำนวน test | ${N} ข้อ ตาม ${plan.planFile} (${byP.map(x => `${x.k} ${x.n}`).join(' · ')}) |
| แหล่งข้อมูล test | แผนการทดสอบ (เฉพาะหัวข้อที่อนุญาต) และหน้าเว็บจริงเท่านั้น (black-box) |
| หลักฐาน | GIF ทุกข้อที่ \`test-report/gifs/\`${secs.length ? ` (ยาว ${Math.min(...secs).toFixed(1)}–${Math.max(...secs).toFixed(1)} วินาที)` : ''} · หน้ารวม \`test-report/index.html\` |

## 2. สรุปผล

| | ทั้งหมด | ผ่าน | ล้ม | อัตราผ่าน |
|---|---|---|---|---|
| **รวม** | **${N}** | **${P}** | **${F}** | **${pct(P, N)}** |
${byP.map(x => `| ${pIcon[x.k] ?? ''} ${x.k} | ${x.n} | ${x.ok} | ${x.f} | ${pct(x.ok, x.n)} |`).join('\n')}

## 3. ผลตามโมดูล

| โมดูล | ทั้งหมด | ผ่าน | ล้ม |
|---|---|---|---|
${mods.map(x => `| ${x.m} | ${x.n} | ${x.ok} | ${x.f}${x.f ? ' ❌' : ''} |`).join('\n')}
| **รวม** | **${N}** | **${P}** | **${F}** |

## 4. ผลราย test case

| # | รหัส | ระดับ | สิ่งที่ทดสอบ |${round1 ? ' รอบแรก |' : ''} ผล | GIF |
|---|---|---|---|${round1 ? '---|' : ''}---|---|
${rows.map(r => `| ${r.no} | ${r.id} | ${r.priority} | ${r.what} |${round1 ? ` ${r.first === 'passed' ? '✅' : r.first ? '❌' : '-'} |` : ''} ${r.ok ? '✅ ผ่าน' : r.status === 'missing' ? '⚪ ไม่ได้รัน' : '❌ ล้ม'} | ${r.sec ? `[${r.id}.gif](gifs/${r.id}.gif) (${r.sec.toFixed(1)} วิ)` : '-'} |`).join('\n')}

## 5. ข้อบกพร่อง

| รหัสบั๊ก | test | ความรุนแรง | อาการ | หลักฐาน |
|---|---|---|---|---|
${bugRows}

${bugNotes}${obsSection}

## 6. ข้อที่ต้องถามผู้ใช้

${interpSection}

## 7. การตัดสิน

เทียบเกณฑ์ในแผน (หัวข้อ "${plan.sections.allowed.find(t => /เกณฑ์|criteria|exit/i.test(t)) ?? 'เกณฑ์'}") ทีละข้อ${plan.exit.fromPlan ? '' : ' — ⚠️ แผนไม่ได้ระบุอัตราผ่าน ใช้ค่าเริ่มต้น 95%'}

| เกณฑ์ | ผลจริง | ผ่านเกณฑ์ |
|---|---|---|
${crit.map(c => `| ${c.name} | ${c.actual} | ${c.ok ? '✅' : '❌'} |`).join('\n')}

### สรุป: **${release ? '✅ ปล่อยได้' : '⛔ ยังไม่ปล่อย'}**${verdictAtRisk ? ' (ยังไม่เด็ดขาด — รอคำตอบในหัวข้อ 6)' : interps === null ? '' : ' (เด็ดขาด — ไม่ว่าจะตอบคำถามในหัวข้อ 6 แบบไหน)'}
${verdictAtRisk ? `\n> ⚠️ ถ้าตีความแผนอีกแบบ (หัวข้อ 6) คำตัดสินจะเป็น **${altRelease ? 'ปล่อยได้' : 'ยังไม่ปล่อย'}** ให้ผู้ใช้ตอบคำถามในหัวข้อ 6 ก่อนปล่อยจริง\n`
  : !release && interps !== null ? `\n> ข้อที่ล้มและไม่มีการตีความใดช่วยให้ผ่านได้: ${failed.filter(r => plan.exit.mustPass.includes(r.priority) && !flipTests.has(r.id)).map(r => r.id).join(', ') || '-'}${iList.length ? ' — คำตอบในหัวข้อ 6 เปลี่ยนจำนวนข้อที่ผ่านได้ แต่ไม่พลิกคำตัดสิน' : ''}\n` : ''}
${release
  ? `เหตุผล: ${plan.exit.mustPass.join(', ')} ผ่านครบทุกข้อ และอัตราผ่านรวม ${pct(P, N)} ไม่ต่ำกว่าเกณฑ์ ${plan.exit.passRate}%${F ? ` ข้อที่ล้ม ${F} ข้อไม่ใช่ระดับที่ต้องผ่านทั้งหมด จึงบันทึกเป็นบั๊กให้แก้ในรอบถัดไป` : ''}

ข้อควรระวัง
${F ? `- ต้องส่ง ${bugs.map(b => b.bug).join(', ') || 'บั๊กที่พบ'} ให้ทีมพัฒนาแก้ในรอบถัดไป\n` : ''}- ส่วนเผื่อ: ${N} ข้อ ล้มได้ไม่เกิน ${allowFail} ข้อ${allowFail - F >= 0 ? ` ถ้าล้มเพิ่มอีก ${allowFail - F + 1} ข้อ` : ''} หรือ ${plan.exit.mustPass.join('/')} ล้มแม้ 1 ข้อ จะไม่ผ่านเกณฑ์ทันที`
  : `เหตุผล: ไม่ผ่านเกณฑ์ ${crit.filter(c => !c.ok).map(c => `"${c.name}" (ได้ ${c.actual})`).join(' และ ')} ต้องแก้ ${failed.filter(r => plan.exit.mustPass.includes(r.priority)).map(r => r.id).join(', ') || 'ข้อที่ล้ม'} แล้วทดสอบใหม่`}
${selfSection}`;
fs.writeFileSync('test-report/TEST-REPORT.md', md);
console.log(`TEST-REPORT.md: ${N} ข้อ · ผ่าน ${P} · ล้ม ${F} · ${pct(P, N)} → ${release ? 'ปล่อยได้' : 'ยังไม่ปล่อย'}`);
console.log(interps === null ? '⚠️ ข้อที่ต้องถามผู้ใช้: ยังไม่ได้ตรวจ' : `ตอบแล้ว ${answered.length} ข้อ · ข้อสังเกตนอกแผน ${observations.length} ข้อ · ข้อที่ต้องถามผู้ใช้: ${askList.length} ข้อ${askList.length ? ` (${askList.map(i => i.test).join(', ')})` : ''} · ตีความเอง ${selfList.length} ข้อ (ภาคผนวก) · คำตัดสิน${verdictAtRisk ? ' ⚠️ พลิกได้ — รอคำตอบ' : ' เด็ดขาด'}`);

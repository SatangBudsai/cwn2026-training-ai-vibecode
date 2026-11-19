// สร้างไฟล์ส่งตามขั้น 1/3 ของ PROMPTS: plan/blocks.json, gantt-plan.png, gantt-actual.png, compare.png, plan/REPORT.md
// หมายเหตุ: ไม่มี dag-planner ในเครื่อง → "เวลาแผน" เป็นค่าสมมติที่ผู้ทำตั้งเอง (โควตา 4 บัญชีสมมติ) ไม่ใช่ผลจากสกิล
// ใช้: node make-plan-files.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const IMG = path.join(ROOT, 'docs', 'img');
const PLAN = path.join(ROOT, 'plan');

// ---- บล็อก (10–14 บล็อก) ----
const B = [
  { id: 'B01', name: 'โครงโปรเจกต์ + Docker + SQLite + seed + นาฬิกาจำลอง + test hook', skill: 'backend', diff: 'กลาง', deps: [], plan: 3, out: ['app/server.js', 'app/src/store.js', 'app/src/vault.js', 'app/src/time.js', 'app/Dockerfile', 'app/docker-compose.yml'], done: 'GET /api/health ตอบ 200, PUT /api/test/clock และ reset ทำงาน', reads: ['CONTRACT.md', 'TEST-DATA.md'], fr: ['FR-28'] },
  { id: 'B02', name: 'ยืนยันตัวตน ThaiD/OTP/ล็อก + SSO เจ้าหน้าที่ + RBAC', skill: 'backend', diff: 'กลาง', deps: ['B01'], plan: 3, out: ['app/src/routes.js (auth)'], done: 'TC-AUTH ผ่าน, RBAC 403 ถูกบทบาท', reads: ['REQUIREMENTS.md', 'CONTRACT.md'], fr: ['FR-01', 'FR-02', 'FR-03'] },
  { id: 'B03', name: 'ร่าง ค่าธรรมเนียม แนบไฟล์ (magic bytes) ชำระ QR เลขคำขอ', skill: 'backend', diff: 'สูง', deps: ['B01', 'B02'], plan: 5, out: ['app/src/routes.js (drafts/files/payments)'], done: 'TC-FEE/SUBMIT/UPLOAD/PAY ผ่าน', reads: ['REQUIREMENTS.md', 'TEST-DATA.md', 'DECISIONS.md'], fr: ['FR-04', 'FR-05', 'FR-06', 'FR-07', 'FR-08'], review: true },
  { id: 'B04', name: 'SLA วันทำการ ระดับเตือน แจ้งเตือน ยกเลิกอัตโนมัติ', skill: 'backend', diff: 'สูง (กฎตัวเลข)', deps: ['B01'], plan: 4, out: ['app/src/time.js (sla)', 'app/src/routes.js (notify)'], done: 'TC-SLA/NOTI ผ่าน', reads: ['REQUIREMENTS.md', 'DECISIONS.md', 'TEST-DATA.md'], fr: ['FR-19', 'FR-20'], review: true },
  { id: 'B05', name: 'Workflow: รับเรื่อง ตีกลับ ส่งต่อ อนุมัติ ออกเอกสาร ลายเซ็น PDF /verify ไฟล์แนบ', skill: 'backend', diff: 'สูง', deps: ['B03', 'B04'], plan: 5, out: ['app/src/routes.js (cases/documents)', 'app/src/exports.js (pdf)'], done: 'TC-QUEUE/WORKFLOW/DOC ผ่าน', reads: ['REQUIREMENTS.md', 'DECISIONS.md'], fr: ['FR-09', 'FR-10', 'FR-11', 'FR-12', 'FR-13', 'FR-14', 'FR-15', 'FR-16', 'FR-17', 'FR-18', 'FR-29'] },
  { id: 'B06', name: 'PDPA: ปิดบังเลขบัตร unmask เข้ารหัส AES-GCM + blind index', skill: 'backend', diff: 'กลาง', deps: ['B01'], plan: 2, out: ['app/src/vault.js'], done: 'TC-PDPA ผ่าน, ไม่มีเลขบัตรเต็มใน DB', reads: ['REQUIREMENTS.md'], fr: ['FR-21'] },
  { id: 'B07', name: 'Dashboard + ส่งออก xlsx/pdf + Audit CSV + Admin (ค่าธรรมเนียม/SLA/วันหยุด/ผู้ใช้)', skill: 'backend', diff: 'กลาง (กฎตัวเลข)', deps: ['B05'], plan: 3, out: ['app/src/routes.js (reports/audit/admin)', 'app/src/exports.js'], done: 'TC-DASH/AUDIT ผ่าน', reads: ['REQUIREMENTS.md', 'TEST-DATA.md'], fr: ['FR-22', 'FR-23', 'FR-24', 'FR-25', 'FR-26', 'FR-27'], review: true },
  { id: 'F01', name: 'หน้าเว็บ 17 หน้า ตาม CONTRACT + ธีมน้ำเงินเข้ม', skill: 'frontend', diff: 'สูง', deps: [], plan: 8, out: ['app/public/**'], done: 'ทุกหน้ามี data-testid ตรง CONTRACT, มือถือ 375px ไม่ scroll แนวนอน', reads: ['CONTRACT.md', 'USER-STORIES.md'], fr: ['FR-01', 'FR-02', 'FR-03', 'FR-04', 'FR-05', 'FR-06', 'FR-07', 'FR-08', 'FR-09', 'FR-10', 'FR-11', 'FR-12', 'FR-13', 'FR-14', 'FR-15', 'FR-16', 'FR-17', 'FR-18', 'FR-19', 'FR-20', 'FR-21', 'FR-22', 'FR-23', 'FR-24', 'FR-25', 'FR-26', 'FR-27', 'FR-29'] },
  { id: 'T01', name: 'Playwright A: lib + AUTH FEE SUBMIT UPLOAD PAY', skill: 'playwright', diff: 'กลาง', deps: [], plan: 5, out: ['e2e/lib/common.js', 'e2e/tests/auth…pay'], done: 'ทุก TC ในกลุ่มมี test ชื่อขึ้นต้นรหัส TC', reads: ['TEST-PLAN.md', 'CONTRACT.md', 'TEST-DATA.md'], fr: [] },
  { id: 'T02', name: 'Playwright B: QUEUE SLA NOTI WORKFLOW DOC', skill: 'playwright', diff: 'กลาง', deps: ['T01'], plan: 5, out: ['e2e/tests/queue…doc'], done: 'เช่นเดียวกัน', reads: ['TEST-PLAN.md', 'CONTRACT.md', 'TEST-DATA.md'], fr: [] },
  { id: 'T03', name: 'Playwright C: PDPA DASH AUDIT RBAC NFR', skill: 'playwright', diff: 'กลาง', deps: ['T01'], plan: 5, out: ['e2e/tests/pdpa…nfr'], done: 'เช่นเดียวกัน', reads: ['TEST-PLAN.md', 'CONTRACT.md', 'TEST-DATA.md'], fr: [] },
  { id: 'I01', name: 'รวม + รันชุด Playwright เต็ม 51 TC (ไม่ตั้ง BUG_MODE) 🔒', skill: 'integrate', diff: 'สูง', deps: ['B05', 'B06', 'B07', 'F01', 'T02', 'T03'], plan: 10, out: ['e2e/test-report/'], done: 'ผ่านครบ 51 TC', reads: ['TEST-PLAN.md'], fr: [], exclusive: true },
  { id: 'X01', name: 'BUG_MODE B01–B12 ทีละตัว + ตาราง BUG-HUNT 🔒', skill: 'integrate', diff: 'สูง', deps: ['I01'], plan: 30, out: ['app/src/time.js (bug helper)', 'BUG-HUNT.md'], done: 'ตาราง 12 แถว เทียบ BUGS.md', reads: ['BUGS.md'], fr: [], exclusive: true },
];

// ---- จัดตาราง (สมมติ 4 บัญชี) ----
const ACC = { B01: 'acc1', B02: 'acc1', B03: 'acc1', B05: 'acc1', B07: 'acc1', F01: 'acc2', T01: 'acc3', T02: 'acc3', B04: 'acc4', B06: 'acc4', T03: 'acc4', I01: 'acc1', X01: 'acc1' };
const byId = Object.fromEntries(B.map((b) => [b.id, b]));
const accFree = {};
const done = new Set();
let guard = 0;
while (done.size < B.length && guard++ < 100) {
  for (const b of B) {
    if (done.has(b.id) || !b.deps.every((d) => done.has(d))) continue;
    const ready = Math.max(0, ...b.deps.map((d) => byId[d].end));
    b.acc = ACC[b.id];
    b.start = Math.max(ready, accFree[b.acc] || 0);
    b.end = b.start + b.plan;
    accFree[b.acc] = b.end;
    done.add(b.id);
  }
}
// rank = ความยาวสายวิกฤตจากบล็อกนั้นถึงปลาย
const rank = (id) => byId[id].plan + Math.max(0, ...B.filter((x) => x.deps.includes(id)).map((x) => rank(x.id)));
B.forEach((b) => { b.rank = rank(b.id); });
const total = Math.max(...B.map((b) => b.end));

// ตรวจ: ทุก FR มีบล็อกทำ, ไม่มีสองบล็อกเขียนไฟล์เดียวกัน (ยกเว้นไฟล์รวมที่ระบุส่วนต่างกันในวงเล็บ)
const allFR = Array.from({ length: 29 }, (_, i) => 'FR-' + String(i + 1).padStart(2, '0'));
const covered = new Set(B.filter((b) => b.skill === 'backend').flatMap((b) => b.fr));
const missing = allFR.filter((f) => !covered.has(f));
if (missing.length) throw new Error('FR ไม่มีบล็อก backend: ' + missing.join(','));

fs.writeFileSync(path.join(PLAN, 'blocks.json'), JSON.stringify({ plan: 'egov-eservice', maxAgents: 4, quota: 'สมมติ 4 บัญชี (ไม่ได้ใช้ dag-planner)', blocks: B.map(({ id, name, skill, diff, deps, plan, out, done, reads, fr, review, exclusive, acc, start, end, rank }) => ({ id, name, skill, difficulty: diff, needs: deps, output: out, doneWhen: done, reads, fr, reviewBy: review ? 'อีกฝั่งตรวจกฎตัวเลข' : undefined, exclusive: exclusive || undefined, account: acc, startMin: start, endMin: end, rank })) }, null, 2));

// ---- Gantt ----
const COL = { backend: '#0B2559', frontend: '#146C2E', playwright: '#8A5A00', integrate: '#B01E24' };
const accs = ['acc1', 'acc2', 'acc3', 'acc4'];
const gantt = (title, rows, max, note) => {
  const LX = 120, SC = 1000 / max, RH = 56, T = 80;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${T + accs.length * RH + 90}" font-family="Segoe UI,Tahoma,sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="30" y="34" font-size="22" font-weight="600" fill="#262626">${title}</text>`;
  for (let m = 0; m <= max; m += 5) s += `<line x1="${LX + m * SC}" y1="${T - 12}" x2="${LX + m * SC}" y2="${T + accs.length * RH}" stroke="#eee"/><text x="${LX + m * SC - 6}" y="${T - 18}" font-size="12" fill="#595959">${m}</text>`;
  accs.forEach((a, i) => { s += `<text x="30" y="${T + i * RH + 32}" font-size="14" fill="#262626">${a}</text>`; });
  for (const r of rows) {
    const i = accs.indexOf(r.acc), y = T + i * RH + 8;
    s += `<rect x="${LX + r.s * SC}" y="${y}" width="${Math.max(2, (r.e - r.s) * SC - 2)}" height="38" fill="${COL[r.skill]}"/><text x="${LX + r.s * SC + 6}" y="${y + 24}" font-size="12" fill="#fff">${r.l}</text>`;
  }
  s += `<text x="30" y="${T + accs.length * RH + 30}" font-size="12.5" fill="#595959">${note}</text></svg>`;
  return s;
};
const planRows = B.map((b) => ({ acc: b.acc, s: b.start, e: b.end, skill: b.skill, l: b.id }));
const gPlan = gantt('Gantt แผน (นาที · โควตา 4 บัญชี "สมมติ" · ตั้งค่าเวลาเอง ไม่ใช่ผลจาก dag-planner)', planRows, 65, `รวมตามแผน ${total} นาที · สายวิกฤต B01→B02→B03→B05→B07→I01→X01`);

// เวลาจริงที่วัดได้ (นาที จาก duration ที่เอเจนต์รายงาน) แต่ละเอเจนต์ = หลายบล็อกในกลุ่มเดียว
const ACT = [
  { acc: 'acc1', s: 0, e: 13.9, skill: 'backend', l: 'B01–B07 backend (13.9)', g: 'Backend' },
  { acc: 'acc2', s: 0, e: 10.4, skill: 'frontend', l: 'F01 (10.4)', g: 'Frontend' },
  { acc: 'acc3', s: 0, e: 8.0, skill: 'playwright', l: 'T01 (8.0)', g: 'Playwright A' },
  { acc: 'acc4', s: 0, e: 13.5, skill: 'playwright', l: 'T02 (13.5)', g: 'Playwright B' },
  { acc: 'acc3', s: 8.0, e: 19.2, skill: 'playwright', l: 'T03 (11.2)', g: 'Playwright C' },
  { acc: 'acc1', s: 22, e: 81.8, skill: 'integrate', l: 'X01 BUG_MODE (59.8)', g: 'BUG_MODE' },
];
const gAct = gantt('Gantt จริง (นาที · เวลาที่เอเจนต์รายงานตอนจบงาน)', ACT, 85, 'I01 (รวม+แก้) ไม่ได้จับเวลา จึงไม่วาด · ตำแหน่งเริ่มของ T03 และ X01 เป็นลำดับโดยประมาณ ไม่ใช่เวลานาฬิกาที่วัด');

// compare: แผน vs จริง ต่อกลุ่ม (นาที)
const grp = [
  ['Backend B01–B07', B.filter((b) => b.skill === 'backend').reduce((a, b) => a + b.plan, 0), 13.9, 'backend'],
  ['Frontend F01', 8, 10.4, 'frontend'],
  ['Playwright A (T01)', 5, 8.0, 'playwright'],
  ['Playwright B (T02)', 5, 13.5, 'playwright'],
  ['Playwright C (T03)', 5, 11.2, 'playwright'],
  ['BUG_MODE X01', 30, 59.8, 'integrate'],
];
let cmp = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${100 + grp.length * 62 + 70}" font-family="Segoe UI,Tahoma,sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="30" y="34" font-size="22" font-weight="600" fill="#262626">แผน vs จริง (นาที, ต่อเอเจนต์)</text>
<rect x="30" y="52" width="14" height="14" fill="#bfbfbf"/><text x="50" y="64" font-size="13" fill="#262626">แผน (สมมติ)</text><rect x="170" y="52" width="14" height="14" fill="#0B2559"/><text x="190" y="64" font-size="13" fill="#262626">จริง</text>`;
const mx = 62, CS = 640 / mx;
grp.forEach(([l, p, a, k], i) => {
  const y = 90 + i * 62;
  cmp += `<text x="30" y="${y + 20}" font-size="14" fill="#262626">${l}</text><rect x="260" y="${y}" width="${p * CS}" height="22" fill="#bfbfbf"/><text x="${264 + p * CS}" y="${y + 16}" font-size="12" fill="#262626">${p}</text><rect x="260" y="${y + 26}" width="${a * CS}" height="22" fill="${COL[k]}"/><text x="${264 + a * CS}" y="${y + 42}" font-size="12" fill="#262626">${a} (${a > p ? '+' : ''}${(((a - p) / p) * 100).toFixed(0)}%)</text>`;
});
cmp += `<text x="30" y="${100 + grp.length * 62 + 30}" font-size="12.5" fill="#595959">เวลาแผนเป็นค่าสมมติที่ตั้งหลังทำเสร็จ (ไม่มี dag-planner) จึงอ่านเป็นแนวโน้มเท่านั้น ไม่ใช่การวัดความแม่นของ planner</text></svg>`;

(async () => {
  const br = await chromium.launch();
  const draw = async (name, markup, w, h) => {
    const p = await br.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<body style="margin:0">${markup}</body>`);
    await p.screenshot({ path: path.join(IMG, name) });
    await p.close();
  };
  await draw('gantt-plan.png', gPlan, 1200, 80 + accs.length * 56 + 90);
  await draw('gantt-actual.png', gAct, 1200, 80 + accs.length * 56 + 90);
  await draw('compare.png', cmp, 1200, 100 + grp.length * 62 + 70);
  await br.close();

  const row = (b) => `| ${b.id} | ${b.name} | ${b.skill} | ${b.diff} | ${b.deps.join(', ') || '–'} | ${b.rank} | ${b.acc} | ${b.start}–${b.end} |`;
  const md = `# REPORT: แผน vs จริง (e-Service กลาง)

> ข้อจำกัด: เครื่องนี้ไม่มีสกิล \`dag-planner\` และ container \`multi-account\` จึง **ไม่ได้ export/run ผ่านสกิล** เวลา "แผน" ด้านล่างเป็นค่าสมมติที่ตั้งเอง (ตั้งหลังทำเสร็จ ตามทางเลือก "โควตาสมมติ" ใน PROMPTS ขั้น 1) ส่วน "จริง" คือ duration ที่ระบบรายงานตอนเอเจนต์ Claude Code จบงานแต่ละตัว

## แผน (blocks.json)

| บล็อก | งาน | สกิล | ความยาก | ต้องรอ | rank | บัญชี | เริ่ม–จบ (นาที) |
|---|---|---|---|---|---|---|---|
${B.map(row).join('\n')}

สายวิกฤต: B01 → B02 → B03 → B05 → B07 → I01 → X01 (backend มีกฎตัวเลขเยอะและต่อกันเป็นลูกโซ่) · รวมตามแผน ${total} นาที

![Gantt แผน](../docs/img/gantt-plan.png)

## จริง

| กลุ่ม | สถานะ | เวลาแผน (นาที) | เวลาจริง (นาที) |
|---|---|---|---|
${grp.map(([l, p, a]) => `| ${l} | เสร็จ | ${p} | ${a} |`).join('\n')}
| รวม + แก้ (I01) | เสร็จ (61/61 ผ่าน) | 10 | ไม่ได้จับเวลา |

บล็อกที่ล้ม: ไม่มีบล็อกที่ล้มถาวร ข้อที่ล้มระหว่างรวม (I01) และวิธีแก้ ดูตารางสาเหตุใน README

![Gantt จริง](../docs/img/gantt-actual.png)
![แผน vs จริง](../docs/img/compare.png)

## ตรวจแผนตามขั้น 2

| ตรวจ | ผล |
|---|---|
| ทุก FR (FR-01..29) มีบล็อก backend รับผิดชอบ | ✅ สคริปต์ make-plan-files.js ตรวจแล้ว ไม่มี FR ตก |
| Playwright ไม่มีลูกศรจากบล็อกเว็บ | ✅ T01–T03 ไม่มี needs ที่เป็น B/F |
| บล็อกสุดท้ายเป็นรวม+ทดสอบ 🔒 | ✅ I01, X01 exclusive |
| ไม่มีสองบล็อกเขียนไฟล์เดียวกัน | ⚠️ ไฟล์ \`routes.js\` และ \`time.js\` แบ่งตามส่วน (ระบุในวงเล็บ) เพราะลดไฟล์ให้ง่ายตอนรัน ในแผนจริงควรแยกไฟล์ |
| ทุกบล็อกมีบัญชีรับ | ✅ |
`;
  fs.writeFileSync(path.join(PLAN, 'REPORT.md'), md);
  console.log('ok total plan', total, 'min');
})();

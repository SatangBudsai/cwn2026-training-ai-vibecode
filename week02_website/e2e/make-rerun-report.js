// สร้าง gantt-actual.png, compare.png และ plan/REPORT.md จากเวลาจริงของการรันแผน (rerun/timing/*.json)
// ใช้: node make-rerun-report.js   (หลังรันแผนเสร็จและมี rerun/timing ครบ)
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const ROOT = path.resolve(__dirname, '..');
const IMG = path.join(ROOT, 'docs', 'img');
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan', 'blocks.json'), 'utf8')).blocks.map((b) => ({ ...b, plan: b.endMin - b.startMin, skill: b.skill }));
const T = {};
for (const f of fs.readdirSync(path.join(ROOT, 'rerun', 'timing'))) {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'rerun', 'timing', f), 'utf8').replace(/^﻿/, ''));
  T[t.block] = t;
}
const t0 = Math.min(...Object.values(T).map((t) => t.startMs));
const m = (ms) => (ms - t0) / 60000;
// บัญชีที่ทำจริง (เอเจนต์แยกตามบัญชีสมมติ บนบัญชี Claude เดียว): T01-T03 นำของรอบก่อนมาใช้ซ้ำ จึงไม่มีเวลา
const ACC = { B01: 'acc1', B02: 'acc1', B03: 'acc1', B05: 'acc1', B07: 'acc1', I01: 'acc1', X01: 'acc1', F01: 'acc2', B04: 'acc4', B06: 'acc4' };
const COL = { backend: '#0B2559', frontend: '#146C2E', playwright: '#8A5A00', integrate: '#B01E24' };
const skillOf = (id) => plan.find((b) => b.id === id).skill;
const rows = Object.keys(T).filter((k) => plan.some((b) => b.id === k)).map((id) => ({ id, acc: ACC[id], s: m(T[id].startMs), e: m(T[id].endMs), skill: skillOf(id), d: (T[id].endMs - T[id].startMs) / 60000 }));
const total = Math.max(...rows.map((r) => r.e));
const accs = ['acc1', 'acc2', 'acc3', 'acc4'];

const LX = 120, RH = 56, TOP = 80, MAX = Math.ceil(total / 5) * 5 + 2, SC = 1000 / MAX;
let g = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${TOP + 4 * RH + 90}" font-family="Segoe UI,Tahoma,sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="30" y="34" font-size="22" font-weight="600" fill="#262626">Gantt จริง (นาที · เวลาจากไฟล์ timing ของแต่ละบล็อก · รวม ${total.toFixed(1)} นาที)</text>`;
for (let x = 0; x <= MAX; x += 5) g += `<line x1="${LX + x * SC}" y1="${TOP - 12}" x2="${LX + x * SC}" y2="${TOP + 4 * RH}" stroke="#eee"/><text x="${LX + x * SC - 6}" y="${TOP - 18}" font-size="12" fill="#595959">${x}</text>`;
accs.forEach((a, i) => { g += `<text x="30" y="${TOP + i * RH + 32}" font-size="14" fill="#262626">${a}</text>`; });
for (const r of rows) {
  const y = TOP + accs.indexOf(r.acc) * RH + 8;
  g += `<rect x="${LX + r.s * SC}" y="${y}" width="${Math.max(3, (r.e - r.s) * SC - 2)}" height="38" fill="${COL[r.skill]}"/><text x="${LX + r.s * SC + 4}" y="${y + 24}" font-size="12" fill="#fff">${r.id}</text>`;
}
g += `<text x="30" y="${TOP + 4 * RH + 30}" font-size="12.5" fill="#595959">T01–T03 (Playwright) ใช้ชุดที่เขียนไว้รอบก่อนซ้ำ จึงไม่มีแท่งเวลาและ acc3 ว่าง · ช่องว่างระหว่างบล็อกคือเวลารอและส่งงานต่อ</text></svg>`;

const cmpRows = plan.filter((b) => T[b.id]).map((b) => ({ id: b.id, p: b.plan, a: (T[b.id].endMs - T[b.id].startMs) / 60000, skill: b.skill }));
const mx = Math.max(...cmpRows.flatMap((r) => [r.p, r.a]));
const CS = 640 / mx;
let c = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${100 + cmpRows.length * 56 + 60}" font-family="Segoe UI,Tahoma,sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="30" y="34" font-size="22" font-weight="600" fill="#262626">แผน vs จริง (นาที ต่อบล็อก)</text><rect x="30" y="52" width="14" height="14" fill="#bfbfbf"/><text x="50" y="64" font-size="13">แผน (blocks.json)</text><rect x="190" y="52" width="14" height="14" fill="#0B2559"/><text x="210" y="64" font-size="13">จริง</text>`;
cmpRows.forEach((r, i) => {
  const y = 90 + i * 56;
  c += `<text x="30" y="${y + 22}" font-size="14">${r.id}</text><rect x="120" y="${y}" width="${r.p * CS}" height="20" fill="#bfbfbf"/><text x="${124 + r.p * CS}" y="${y + 15}" font-size="12">${r.p}</text><rect x="120" y="${y + 24}" width="${Math.max(2, r.a * CS)}" height="20" fill="${COL[r.skill]}"/><text x="${124 + r.a * CS}" y="${y + 39}" font-size="12">${r.a.toFixed(1)} (${r.a >= r.p ? '+' : ''}${(((r.a - r.p) / r.p) * 100).toFixed(0)}%)</text>`;
});
c += `<text x="30" y="${100 + cmpRows.length * 56 + 30}" font-size="12.5" fill="#595959">แผนตั้งไว้ก่อนรันรอบนี้ (ค่าสมมติ ไม่ใช่ผลจาก dag-planner) · B05 รวมเวลาอ่านโจทย์ · I01 และ X01 รวมเวลารอรันชุดทดสอบ</text></svg>`;

(async () => {
  const b = await chromium.launch();
  const draw = async (name, markup, w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } }); await p.setContent(`<body style="margin:0">${markup}</body>`); await p.screenshot({ path: path.join(IMG, name) }); await p.close(); };
  await draw('gantt-actual.png', g, 1200, TOP + 4 * RH + 90);
  await draw('compare.png', c, 1200, 100 + cmpRows.length * 56 + 60);
  await b.close();
  const sum = (ids) => ids.reduce((a, id) => a + (T[id] ? (T[id].endMs - T[id].startMs) / 60000 : 0), 0);
  const md = fs.readFileSync(path.join(ROOT, 'plan', 'REPORT.md'), 'utf8').split('## จริง')[0];
  const out = md.replace(/> ข้อจำกัด:[\s\S]*?\n\n/, `> ข้อจำกัด: เครื่องนี้ไม่มีสกิล \`dag-planner\` และ container \`multi-account\` จึงไม่ได้ export/run ผ่านสกิล **แต่รันแผนจริงตาม blocks.json** ด้วยเอเจนต์ Claude Code แยกตามบัญชีสมมติ (acc1, acc2, acc4) บนบัญชีเดียว สร้างเว็บใหม่จากโจทย์ในโฟลเดอร์ \`rerun/\` โดยไม่ลอกโค้ดรอบก่อน เวลา "แผน" เป็นค่าสมมติที่ตั้งก่อนรันรอบนี้ ส่วน "จริง" คือ timestamp ที่เอเจนต์บันทึก (\`rerun/timing/*.json\`) · T01–T03 ใช้ชุด Playwright รอบก่อนซ้ำ\n\n`) +
    `## จริง\n\n| บล็อก | สถานะ | เวลาแผน (นาที) | เวลาจริง (นาที) | บัญชี |\n|---|---|---|---|---|\n` +
    plan.map((b) => `| ${b.id} | ${T[b.id] ? 'เสร็จ' : 'ใช้ซ้ำจากรอบก่อน'} | ${b.plan} | ${T[b.id] ? ((T[b.id].endMs - T[b.id].startMs) / 60000).toFixed(1) : '–'} | ${ACC[b.id] || '–'} |`).join('\n') +
    `\n\nรวมเวลาจริงตั้งแต่เริ่มบล็อกแรกถึงจบ X01: ${total.toFixed(1)} นาที (รวมเวลารอ) · ผลบล็อกรวม: I01 ผ่าน 61/61 (รอบแรก 49 ผ่าน/12 ล้ม ทั้งหมดเป็นเว็บผิด) · X01 จับบั๊กได้ 12/12 ดู [BUG-HUNT](../rerun/BUG-HUNT.md)\n\n![Gantt จริง](../docs/img/gantt-actual.png)\n![แผน vs จริง](../docs/img/compare.png)\n`;
  fs.writeFileSync(path.join(ROOT, 'plan', 'REPORT.md'), out);
  console.log('ok total', total.toFixed(1), 'min; backend sum', sum(['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07']).toFixed(1));
})();


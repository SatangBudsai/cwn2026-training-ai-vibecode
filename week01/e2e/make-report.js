// สร้าง test-report/TEST-REPORT.md จากผลรันล่าสุด (test-report/gifs.json จาก make-gifs.js)
// ไม่รัน test ใหม่ และไม่แก้ test
const fs = require('fs');

const tests = JSON.parse(fs.readFileSync('test-report/gifs.json', 'utf8'));
const results = JSON.parse(fs.readFileSync('test-report/results.json', 'utf8'));
const MODULES = { HOME: 'หน้าแรก', CAT: 'ค้นหา', PRD: 'หน้าสินค้า', WISH: 'รายการโปรด', CART: 'ตะกร้า', CPN: 'คูปอง', AUTH: 'สมาชิก', CHK: 'สั่งซื้อ', REC: 'แนะนำ', MOB: 'มือถือ', API: 'API', MY: 'เพิ่มเอง' };
const mod = (id) => MODULES[id.split('-')[1]] || id;
const ok = (t) => t.status === 'pass';
const rate = (a) => (a.length ? ((a.filter(ok).length / a.length) * 100).toFixed(1) : '-');

const total = tests.length, passed = tests.filter(ok).length, failed = total - passed;
const byPrio = (p) => tests.filter((t) => t.prio === p);

const failMsg = {};
const walk = (s) => {
  (s.specs || []).forEach((sp) => {
    const r = sp.tests[0].results.slice(-1)[0];
    if (r.status !== 'passed') failMsg[(sp.title.match(/TC-[A-Z]+-\d+/) || [])[0]] = ((r.error && r.error.message) || '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 3).join(' ');
  });
  (s.suites || []).forEach(walk);
};
results.suites.forEach(walk);

const p1 = byPrio('P1'), p1Fail = p1.filter((t) => !ok(t));
const overall = (passed / total) * 100;
const c1 = p1Fail.length === 0, c2 = overall >= 95;

let md = `# รายงานผลการทดสอบ PawPantry\n\n## 1. ข้อมูลรอบทดสอบ\n| | |\n|---|---|\n| วันที่ | ${new Date().toISOString().slice(0, 10)} |\n| เว็บ | http://localhost:3000 (Docker, BUG_MODE=0) |\n| เบราว์เซอร์ | Chromium (Playwright 1.61.1) |\n| จำนวน test | ${total} |\n\n`;
md += `## 2. สรุปผล\n| ระดับ | ทั้งหมด | ผ่าน | ล้ม | อัตราผ่าน |\n|---|---|---|---|---|\n`;
for (const p of ['P1', 'P2', 'P3']) { const a = byPrio(p); md += `| ${p} | ${a.length} | ${a.filter(ok).length} | ${a.filter((t) => !ok(t)).length} | ${rate(a)}% |\n`; }
md += `| **รวม** | **${total}** | **${passed}** | **${failed}** | **${rate(tests)}%** |\n\n`;
md += `## 3. ผลตามโมดูล\n| โมดูล | ทั้งหมด | ผ่าน | ล้ม |\n|---|---|---|---|\n`;
for (const m of [...new Set(tests.map((t) => mod(t.id)))]) { const a = tests.filter((t) => mod(t.id) === m); md += `| ${m} | ${a.length} | ${a.filter(ok).length} | ${a.filter((t) => !ok(t)).length} |\n`; }
md += `\n## 4. ผลราย test case\n| รหัส | ระดับ | ผล | GIF |\n|---|---|---|---|\n`;
for (const t of tests) md += `| ${t.id} | ${t.prio} | ${ok(t) ? '✅ ผ่าน' : '❌ ล้ม'} | ${t.gifSeconds ? `[gifs/${t.id}.gif](gifs/${t.id}.gif)` : '- (test API ไม่มีวิดีโอ)'} |\n`;
md += `\n## 5. ข้อบกพร่อง\n`;
const bad = tests.filter((t) => !ok(t));
if (!bad.length) md += 'ไม่พบข้อบกพร่อง\n';
else {
  md += `| รหัสบั๊ก | test | ความรุนแรง | อาการ | หลักฐาน |\n|---|---|---|---|---|\n`;
  bad.forEach((t, i) => (md += `| BUG-${String(i + 1).padStart(2, '0')} | ${t.id} | ${t.prio === 'P1' ? 'สูง (P1)' : t.prio === 'P2' ? 'ปานกลาง (P2)' : 'ต่ำ (P3)'} | ${failMsg[t.id] || ''} | [gifs/${t.id}.gif](gifs/${t.id}.gif) |\n`));
}
md += `\n## 6. การตัดสิน\n| เกณฑ์ (หัวข้อ 6) | ผลจริง | |\n|---|---|---|\n| P1 ผ่านทั้งหมด | ${p1.length - p1Fail.length} / ${p1.length} | ${c1 ? '✅' : '❌'} |\n| อัตราผ่านรวม ≥ 95% | ${passed} / ${total} = ${overall.toFixed(1)}% | ${c2 ? '✅' : '❌'} |\n\n**สรุป: ${c1 && c2 ? 'ปล่อยได้' : 'ยังไม่ปล่อย'}**`;
md += c1 && c2 ? ` — ผ่านเกณฑ์ทั้ง 2 ข้อ แต่ต้องบันทึกบั๊กที่ล้มไว้แก้รอบถัดไป\n` : ` — ไม่ผ่านเกณฑ์อย่างน้อย 1 ข้อ\n`;
fs.writeFileSync('test-report/TEST-REPORT.md', md);
console.log(md.split('\n').slice(0, 24).join('\n'));

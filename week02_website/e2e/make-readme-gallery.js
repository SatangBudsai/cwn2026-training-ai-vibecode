// แทรกส่วน "ภาพประกอบ" ลงใน README (ทั้งของโฟลเดอร์ week02_website และ README นอกสุด)
// ใช้: node make-readme-gallery.js   (หลัง make-docs.js และ make-gifs.js)
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const shots = JSON.parse(fs.readFileSync(path.join(root, 'docs/img/shots.json'), 'utf8'));
const gifs = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-report/gifs.json'), 'utf8')).filter((t) => t.gifSeconds);

const section = (p) => {
  let s = `## ภาพประกอบ\n\n### แผนภาพ DAG (LAB 2)\n\n![DAG](${p}docs/img/dag.png)\n\nแผนอ่านได้ที่ [PLAN.md](${p}plan/PLAN.md) · Playwright ทั้งสามชุดไม่มีลูกศรจากบล็อกเว็บ (ทำขนานกัน) · บล็อกรวมและ BUG_MODE เป็น exclusive 🔒\n\n`;
  s += `### Timeline (LAB 3)\n\n![Timeline](${p}docs/img/timeline.png)\n\nเวลาในแท่งสีมาจากที่เอเจนต์รายงานตอนจบงาน ส่วนขั้นรวม/แก้ไม่ได้จับเวลา (แท่งลายทแยง)\n\n`;
  s += `### Gantt แผน / Gantt จริง / แผน vs จริง (LAB 2–3)\n\n![Gantt แผน](${p}docs/img/gantt-plan.png)\n\n![Gantt จริง](${p}docs/img/gantt-actual.png)\n\n![แผน vs จริง](${p}docs/img/compare.png)\n\n⚠️ Gantt แผนและเวลา "แผน" เป็นค่าสมมติ (โควตา 4 บัญชีสมมติ ไม่ใช่ผลจาก dag-planner) ส่วน Gantt จริงและกราฟเทียบมาจากการรันแผนจริงรอบ 2 (โฟลเดอร์ rerun) ที่จับเวลาแต่ละบล็อก · ไฟล์: [blocks.json](${p}plan/blocks.json) · [REPORT.md](${p}plan/REPORT.md)\n\n`;
  s += `### ภาพหน้าเว็บ (${shots.length} หน้า)\n\n| | |\n|---|---|\n`;
  for (let i = 0; i < shots.length; i += 2) {
    const cell = (x) => (x ? `**${x.note}**<br><img src="${p}docs/img/${x.name}" width="460">` : '');
    s += `| ${cell(shots[i])} | ${cell(shots[i + 1])} |\n`;
  }
  s += `\n### GIF ตอน Playwright รัน test ระดับ P1 (${gifs.length} ไฟล์ · LAB 4)\n\nทุก test ผ่าน · เปิดรวมทั้งหมดได้ที่ ${p}e2e/test-report/index.html\n\n| | | |\n|---|---|---|\n`;
  for (let i = 0; i < gifs.length; i += 3) {
    const cell = (x) => (x ? `**${x.id}**<br><img src="${p}e2e/test-report/gifs/${x.id}.gif" width="300">` : '');
    s += `| ${cell(gifs[i])} | ${cell(gifs[i + 1])} | ${cell(gifs[i + 2])} |\n`;
  }
  s += `\nหมายเหตุ: TC-NFR-02.gif แทบว่าง (5 KB) เพราะ test นั้นสแกน axe หลายหน้าอย่างรวดเร็ว ดู TC-NFR-02B สำหรับภาพการใช้คีย์บอร์ด · อีก 28 ข้อของ P1 เป็น test API อย่างเดียวจึงไม่มีวิดีโอ\n\n`;
  return s;
};

const MARK = '<!-- gallery:start -->', END = '<!-- gallery:end -->';
const inject = (file, p, anchor) => {
  let t = fs.readFileSync(file, 'utf8');
  const block = `${MARK}\n${section(p)}${END}\n\n`;
  if (t.includes(MARK)) t = t.replace(new RegExp(`${MARK}[\\s\\S]*?${END}\\n\\n`), block);
  else t = t.replace(anchor, block + anchor);
  fs.writeFileSync(file, t);
  console.log('updated', file);
};
inject(path.join(root, 'README.md'), '', '## วิธีรัน');
inject(path.join(root, '..', 'README.md'), 'week02_website/', '## ผู้ใช้และสิ่งที่ทำได้');



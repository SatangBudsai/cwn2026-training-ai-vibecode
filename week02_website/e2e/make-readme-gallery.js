// แทรกส่วน "ภาพประกอบ" ลงใน README (ทั้งของโฟลเดอร์ week02_website และ README นอกสุด)
// ใช้: node make-readme-gallery.js   (หลัง make-docs.js และ make-gifs.js)
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const shots = JSON.parse(fs.readFileSync(path.join(root, 'docs/img/shots.json'), 'utf8'));
const gifs = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-report/gifs.json'), 'utf8')).filter((t) => t.gifSeconds);

const section = (p) => {
  const q = p ? 'week2/egov-eservice/' : '../week2/egov-eservice/';
  let s = `## ภาพประกอบ

### แผนภาพ DAG จาก dag-planner (LAB 2)

![DAG](${q}dag.png)

แผนจากโควตาจริงของ yolo1–3 · [PLAN.md](${q}PLAN.md) · [blocks.json](${q}blocks.json)

`;
  s += `### ผล Playwright (LAB 4)

![ผล test](${p}docs/img/tests.png)

### BUG_MODE (LAB 5)

![BUG-HUNT](${p}docs/img/bughunt.png)

รายละเอียด expected → received ทุกบั๊ก: [BUG-HUNT.md](${p}BUG-HUNT.md)

`;
  s += `### Gantt แผน / Gantt จริง / แผน vs จริง จาก dag-planner (LAB 2–3)

![Gantt แผน](${q}gantt-plan.png)

![Gantt จริง](${q}gantt-actual.png)

![แผน vs จริง](${q}compare.png)

เสร็จ 13/13 บล็อก · เวลาจริงรวมช่วงรอโควตารีเซ็ต · [REPORT.md](${q}REPORT.md)

`;
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
  if (t.includes(MARK)) t = t.replace(new RegExp(`${MARK}[\\s\\S]*?${END}\\s*`), block);
  else t = t.replace(anchor, block + anchor);
  fs.writeFileSync(file, t);
  console.log('updated', file);
};
inject(path.join(root, 'README.md'), '', '## วิธีรัน');
inject(path.join(root, '..', 'README.md'), 'week02_website/', '## ผู้ใช้และสิ่งที่ทำได้');



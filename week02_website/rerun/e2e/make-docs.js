// สร้างรูปประกอบ README: ../docs/img/*.png (DAG, timeline, ภาพหน้าเว็บทุกบทบาท)
// ใช้: เปิดเว็บ (TEST_MODE=1, พอร์ต 3100) แล้วรัน  node make-docs.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const c = require('./lib/common');

const OUT = path.resolve(__dirname, '..', 'docs', 'img');
fs.mkdirSync(OUT, { recursive: true });
const BASE = c.BASE_URL;

// ---------- 1) DAG ----------
const COLORS = { backend: '#0B2559', frontend: '#146C2E', test: '#8A5A00', integrate: '#B01E24' };
const NODES = {
  B01: { x: 0, y: 0, t: 'backend', l: 'B01 โครง+DB+seed+hook' },
  B02: { x: 1, y: 0, t: 'backend', l: 'B02 Auth/RBAC' },
  B03: { x: 2, y: 0, t: 'backend', l: 'B03 ร่าง/ไฟล์/ชำระ' },
  B04: { x: 1, y: 1, t: 'backend', l: 'B04 SLA/แจ้งเตือน' },
  B06: { x: 1, y: 2, t: 'backend', l: 'B06 PDPA/เข้ารหัส' },
  B05: { x: 3, y: 0.5, t: 'backend', l: 'B05 Workflow/เอกสาร' },
  B07: { x: 4, y: 0.5, t: 'backend', l: 'B07 Dashboard/Audit' },
  F01: { x: 0, y: 3.2, t: 'frontend', l: 'F01 หน้าเว็บ 17 หน้า' },
  T01: { x: 0, y: 4.4, t: 'test', l: 'T01 Playwright A + lib' },
  T02: { x: 1, y: 4.4, t: 'test', l: 'T02 Playwright B' },
  T03: { x: 1, y: 5.4, t: 'test', l: 'T03 Playwright C' },
  I01: { x: 5, y: 2.6, t: 'integrate', l: 'I01 รวม+รัน 51 TC 🔒' },
  X01: { x: 6, y: 2.6, t: 'integrate', l: 'X01 BUG_MODE 12 รอบ 🔒' },
};
const EDGES = [['B01', 'B02'], ['B02', 'B03'], ['B03', 'B05'], ['B01', 'B04'], ['B04', 'B05'], ['B01', 'B06'], ['B05', 'B07'],
  ['T01', 'T02'], ['T01', 'T03'], ['B05', 'I01'], ['B06', 'I01'], ['B07', 'I01'], ['F01', 'I01'], ['T02', 'I01'], ['T03', 'I01'], ['I01', 'X01']];
const W = 176, H = 44, GX = 208, GY = 78, PX = 30, PY = 60;
const pos = (n) => ({ x: PX + NODES[n].x * GX, y: PY + NODES[n].y * GY });
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="610" font-family="Segoe UI,Tahoma,sans-serif">
<rect width="100%" height="100%" fill="#fff"/><text x="30" y="34" font-size="22" font-weight="600" fill="#262626">DAG แผนงาน e-Service (12 บล็อก + บล็อกรวม)</text>
<defs><marker id="a" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#595959"/></marker></defs>`;
for (const [a, b] of EDGES) {
  const p = pos(a), q = pos(b);
  svg += `<line x1="${p.x + W}" y1="${p.y + H / 2}" x2="${q.x - 2}" y2="${q.y + H / 2}" stroke="#8c8c8c" stroke-width="1.6" marker-end="url(#a)"/>`;
}
for (const [id, n] of Object.entries(NODES)) {
  const p = pos(id);
  svg += `<rect x="${p.x}" y="${p.y}" width="${W}" height="${H}" fill="${COLORS[n.t]}"/><text x="${p.x + 8}" y="${p.y + 27}" font-size="12.5" fill="#fff">${n.l}</text>`;
}
const leg = [['backend', 'Backend'], ['frontend', 'Frontend'], ['test', 'Playwright (ไม่อ่านโค้ดเว็บ ทำขนาน)'], ['integrate', 'รวม/ทดสอบ (exclusive)']];
leg.forEach(([k, t], i) => { svg += `<rect x="${30 + i * 270}" y="572" width="14" height="14" fill="${COLORS[k]}"/><text x="${50 + i * 270}" y="584" font-size="13" fill="#262626">${t}</text>`; });
svg += `</svg>`;

// ---------- 2) Timeline (เวลาจริงของเอเจนต์ที่วัดได้) ----------
// ค่ามาจาก duration ที่ระบบรายงานตอนเอเจนต์จบงาน (วินาที → นาที) ส่วนขั้นรวม/แก้บั๊ก ไม่ได้จับเวลา จึงไม่ใส่ตัวเลข
const BARS = [
  { l: 'Backend (เซิร์ฟเวอร์)', s: 0, d: 13.9, t: 'backend' },
  { l: 'Frontend (17 หน้า)', s: 0, d: 10.4, t: 'frontend' },
  { l: 'Playwright A (AUTH–PAY)', s: 0, d: 8.0, t: 'test' },
  { l: 'Playwright B (QUEUE–DOC)', s: 0, d: 13.5, t: 'test' },
  { l: 'Playwright C (PDPA–NFR)', s: 0, d: 11.2, t: 'test' },
  { l: 'รวม + แก้ + รัน 61 test (ไม่ได้จับเวลา)', s: 14, d: 8, t: 'integrate', hatch: true },
  { l: 'BUG_MODE 12 รอบ + BUG-HUNT', s: 22, d: 59.8, t: 'integrate' },
];
const SC = 11, LX = 300, RY = 70, RH = 46;
let tl = `<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="${RY + BARS.length * RH + 80}" font-family="Segoe UI,Tahoma,sans-serif">
<defs><pattern id="h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#B01E24"/><rect x="4" width="4" height="8" fill="#e8b0b3"/></pattern></defs>
<rect width="100%" height="100%" fill="#fff"/><text x="30" y="34" font-size="22" font-weight="600" fill="#262626">Timeline งานจริง (นาที, เวลาที่เอเจนต์รายงาน)</text>`;
for (let m = 0; m <= 90; m += 10) tl += `<line x1="${LX + m * SC}" y1="${RY - 10}" x2="${LX + m * SC}" y2="${RY + BARS.length * RH}" stroke="#e8e8e8"/><text x="${LX + m * SC - 8}" y="${RY - 16}" font-size="12" fill="#595959">${m}</text>`;
BARS.forEach((b, i) => {
  const y = RY + i * RH;
  tl += `<text x="30" y="${y + 24}" font-size="14" fill="#262626">${b.l}</text><rect x="${LX + b.s * SC}" y="${y + 6}" width="${b.d * SC}" height="28" fill="${b.hatch ? 'url(#h)' : COLORS[b.t]}"/>`;
  if (!b.hatch) tl += `<text x="${LX + (b.s + b.d) * SC + 8}" y="${y + 25}" font-size="13" fill="#262626">${b.d} นาที</text>`;
});
tl += `<text x="30" y="${RY + BARS.length * RH + 36}" font-size="13" fill="#595959">หมายเหตุ: เอเจนต์ Backend/Frontend/Playwright เริ่มพร้อมกัน (ขนาน) · ตำแหน่งเริ่มของสองแถวท้ายเป็นลำดับโดยประมาณ ไม่ใช่เวลานาฬิกาที่วัดได้</text>
<text x="30" y="${RY + BARS.length * RH + 58}" font-size="13" fill="#595959">ไม่มีกราฟ "แผน vs จริง" เพราะเครื่องนี้ไม่มี dag-planner จึงไม่มีเวลาแผนที่คำนวณจากโควตา ไม่ได้แต่งตัวเลขแผน</text></svg>`;

(async () => {
  const b = await chromium.launch();
  const draw = async (name, markup, w, h) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<body style="margin:0">${markup}</body>`);
    await p.screenshot({ path: path.join(OUT, name) });
    await p.close();
  };
  await draw('dag.png', svg, 1500, 610);
  await draw('timeline.png', tl, 1300, RY + BARS.length * RH + 80);

  // ---------- 3) ภาพหน้าเว็บ ----------
  const shots = [];
  const snap = async (page, name, note) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, name), fullPage: true }); shots.push({ name, note }); };
  const api = await c.newApi();
  await c.reset(api);

  const anon = await b.newPage({ baseURL: BASE, viewport: { width: 1280, height: 800 } });
  await anon.goto(BASE + '/login'); await snap(anon, 'web-01-login.png', 'หน้าเข้าสู่ระบบ (ThaiD จำลอง / เจ้าหน้าที่)');
  await anon.goto(BASE + '/verify/K7M2Q9XA'); await snap(anon, 'web-02-verify.png', 'ตรวจเอกสารโดยไม่ต้องล็อกอิน (ชื่อผู้ยื่นปิดบัง)');
  await anon.close();

  const cit = await b.newPage({ baseURL: BASE, viewport: { width: 1280, height: 800 } });
  await c.uiLoginCitizen(cit, c.ID.somchai);
  await snap(cit, 'web-03-citizen.png', 'ประชาชน: รายการคำขอและเริ่มบริการ');
  await cit.goto(BASE + '/citizen/new/SV-03');
  await cit.getByTestId('area-input').fill('101');
  await cit.waitForTimeout(600);
  await snap(cit, 'web-04-wizard-fee.png', 'ยื่นคำขอ SV-03 พื้นที่ 101 ตร.ม. ค่าธรรมเนียม ฿1,010');
  const row = cit.getByTestId('my-case-row').first();
  await cit.goto(BASE + '/citizen');
  if (await row.count()) { await row.click(); await snap(cit, 'web-05-citizen-case.png', 'ประชาชน: รายละเอียดคำขอ สถานะ ไทม์ไลน์ SLA'); }
  await cit.setViewportSize({ width: 375, height: 800 });
  await cit.goto(BASE + '/citizen'); await snap(cit, 'web-06-mobile.png', 'มือถือ 375px ไม่มี scroll แนวนอน');
  await cit.close();

  const staff = async (u, url, name, note) => {
    const p = await b.newPage({ baseURL: BASE, viewport: { width: 1280, height: 800 } });
    await c.uiLoginStaff(p, u, c.STAFF_PASSWORD);
    await p.goto(BASE + url); await snap(p, name, note); await p.close();
  };
  await staff('off.reg1', '/officer/queue', 'web-07-queue.png', 'เจ้าหน้าที่: คิวงานแยกแผนก เลขบัตรปิดบัง');
  await staff('off.reg1', '/notifications', 'web-08-notifications.png', 'เจ้าหน้าที่: แจ้งเตือน SLA ใกล้ครบกำหนด/เกินกำหนด');
  await staff('head1', '/head/approvals', 'web-09-approvals.png', 'หัวหน้าฝ่าย: รายการรออนุมัติ');
  await staff('exec1', '/dashboard', 'web-10-dashboard.png', 'ผู้บริหาร: Dashboard (ไม่มีข้อมูลส่วนบุคคล)');
  await staff('audit1', '/audit', 'web-11-audit.png', 'ผู้ตรวจสอบ: Audit Trail');
  await staff('admin1', '/admin/services', 'web-12-admin.png', 'ผู้ดูแลระบบ: ค่าธรรมเนียม/SLA');

  // หน้าคำขอฝั่งเจ้าหน้าที่ (เลือกใบแรกในคิว)
  const p = await b.newPage({ baseURL: BASE, viewport: { width: 1280, height: 800 } });
  await c.uiLoginStaff(p, 'off.reg1', c.STAFF_PASSWORD);
  await p.goto(BASE + '/officer/queue');
  await p.getByTestId('queue-row').first().locator('a').first().click();
  await snap(p, 'web-13-officer-case.png', 'เจ้าหน้าที่: รายละเอียดคำขอและปุ่มดำเนินการ');
  await p.close();

  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(shots, null, 2));
  console.log('ok', shots.length, 'screenshots +dag +timeline ->', OUT);
  await b.close();
})();



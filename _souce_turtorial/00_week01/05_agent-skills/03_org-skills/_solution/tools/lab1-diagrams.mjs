// ภาพประกอบ LAB 1 (กว้าง 1200px ให้อ่านออกบน GitHub): แผนที่โฟลเดอร์ · พรอมต์เดียวทุกโต๊ะ · ผังโต๊ะ 3 คนจากผลรันจริง · 3 ปัญหา
// node lab1-diagrams.mjs <img-dir> <chromium.exe> [pages-dir]   (pages-dir = หน้าแรกของไฟล์ Word/Excel ที่ export เป็น PNG แล้ว)
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const [,, dir, exe, pages] = process.argv;

const css = `body{margin:0;width:1200px;font-family:'Leelawadee UI','Segoe UI',sans-serif;background:#f8fafc;color:#1d2433}
h1{font-size:44px;margin:26px 36px 4px} .sub{margin:0 36px 18px;font-size:23px;color:#4a5568}
code,.m{font-family:Consolas,monospace} .read{color:#1d4ed8} .write{color:#15803d}
.tag{display:inline-block;border-radius:999px;padding:2px 12px;font-size:19px;font-weight:700;margin-left:8px;vertical-align:middle}
.tr{background:#dbeafe;color:#1e40af} .tw{background:#dcfce7;color:#166534} .tg{background:#f1f5f9;color:#475569}
.foot{margin:18px 36px 28px;font-size:21px;color:#334155;line-height:1.7}`;

// ① แผนที่โฟลเดอร์ทั้งบริษัท: 3 โต๊ะอยู่ตรงไหน อ่านจากไหน เขียนลงไหน
const R = '<span class="tag tr">📖 อ่าน</span>', W = '<span class="tag tw">✍️ เขียน</span>';
const dk = (icon, name, who, lines) => `<div class="dk"><div class="dh">${icon} <code>${name}/</code><br><span>${who} · ▶ เปิด Claude Code ที่นี่</span></div>${lines.map(([f, t, c]) => `<div class="dl ${c}"><code>${f}</code>${t}</div>`).join('')}</div>`;
const folders = `<html><head><meta charset="utf-8"><style>${css}
.top{margin:0 36px;background:#fff;border:3px solid #0B2545;border-radius:18px;padding:12px 18px}
.top h2{margin:0 0 8px;font-size:28px} .top h2 code{font-size:28px}
.shared{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sh{background:#eff6ff;border:2px solid #93c5fd;border-radius:14px;padding:10px 14px;font-size:19px;line-height:1.5}
.sh b{font-size:22px} .sh code{font-size:17px}
.dbar{margin:14px 0 8px;font-size:24px;font-weight:800} .dbar span{font-weight:400;font-size:20px;color:#475569}
.desks{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.dk{background:#fefce8;border:3px solid #f59e0b;border-radius:14px;padding:0 0 8px;overflow:hidden}
.dh{background:#f59e0b;color:#fff;font-size:22px;font-weight:800;padding:8px 12px;line-height:1.3} .dh code{font-size:21px;color:#fff}
.dh span{font-size:16px;font-weight:600}
.dl{font-size:17px;padding:6px 12px 0;line-height:1.4} .dl code{font-size:17px;margin-right:4px}
.dl.w{color:#9a3412} .dl.k{color:#166534} .dl.n{color:#1e40af} .dl .tag{font-size:14px;padding:1px 8px;margin-left:4px}
.more{background:#f1f5f9;border:2px dashed #94a3b8;border-radius:14px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:19px;color:#475569;padding:8px}
.real{margin:16px 36px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.real div{background:#fff;border:2px solid #cbd5e1;border-radius:14px;padding:10px 14px;font-size:19px;line-height:1.5} .real b{font-size:21px}
</style></head><body>
<h1>LAB 1 · ของแต่ละคนอยู่ตรงไหนในบริษัท</h1>
<div class="sub">ทั้งบริษัทคือโฟลเดอร์ <code>novatech/</code> โฟลเดอร์เดียว · ของกลางอยู่ข้างบน · โต๊ะของแต่ละคนอยู่ใน <code>desks/</code></div>
<div class="top">
<h2>🏢 <code>novatech/</code> บริษัททั้งหมด</h2>
<div class="shared">
<div class="sh"><b>👥 people/</b> ${R}<br>การ์ดพนักงาน 28 ใบ · แต่ละคนอ่านใบของตัวเอง<br><code>people/sales/sales-nida.md</code></div>
<div class="sh"><b>🗄️ company-kit/</b> ${R}<br>ไดรฟ์กลาง ทุกคนอ่านที่เดียวกัน<br><code>deal-001/ · price-list.csv · margin-rules.md …</code></div>
</div>
<div class="dbar">💻 desks/ <span>โต๊ะ 1 โฟลเดอร์ต่อ 1 คน (28 โต๊ะ) · คนอื่นมองไม่เห็นโต๊ะของเรา</span></div>
<div class="desks">
${dk('💼', 'sales-nida', 'นิดา หัวหน้าทีมขาย', [['work/', W, 'w'], ['  📘 proposal.docx', '', 'w'], ['  📗 pricing.xlsx', '', 'w'], ['.claude/skills/', W, 'k'], ['  sales-proposal/', '', 'k']])}
${dk('👔', 'md-somchai', 'สมชาย MD', [['notes/', R, 'n'], ['  🔒 deal-rules.md', '', 'n'], ['work/', W, 'w'], ['  📘 approval.docx', '', 'w'], ['.claude/skills/', W, 'k'], ['  deal-approval/', '', 'k']])}
${dk('🧾', 'fin-joy', 'จอย หัวหน้าบัญชี', [['work/', W, 'w'], ['  📗 pricing-internal.xlsx', '', 'w'], ['  📘 quotation-draft.docx', '', 'w'], ['.claude/skills/', W, 'k'], ['  pricing-calc/', '', 'k']])}
${dk('🤝', 'hr-fah', 'ฟ้า หัวหน้าฝ่าย HR', [['work/', W, 'w'], ['  📘 NVT-JOB-…-fullstack.docx', '', 'w'], ['.claude/skills/', W, 'k'], ['  jd-writer/', '', 'k']])}
${dk('🤖', 'ml-jay', 'เจ หัวหน้าทีม ML', [['work/', W, 'w'], ['  📗 experiment-registry.xlsx', '', 'w'], ['  📘 2026-W45-….docx', '', 'w'], ['.claude/skills/', W, 'k'], ['  mlflow-experiment/', '', 'k']])}
<div class="more">… อีก 23 โต๊ะ<br>แบบเดียวกัน</div>
</div></div>
<div class="real">
<div><b>💻 desks/&lt;ชื่อ&gt;/</b><br>ในบริษัทจริง = คอมของคนนั้น</div>
<div><b>📁 .claude/skills/</b> ในโต๊ะ<br>ในบริษัทจริง = <code>~/.claude/skills/</code> ในเครื่องตัวเอง</div>
<div><b>🗄️ company-kit/</b><br>ในบริษัทจริง = ไดรฟ์กลางของบริษัท</div>
</div>
<div class="foot">💡 ทุกคนอ่านของกลางชุดเดียวกัน แต่ <b>เขียนลงโต๊ะตัวเองเท่านั้น</b> skill จึงอยู่คนละโต๊ะ ใช้ร่วมกันไม่ได้ → นี่คือ "ต่างคนต่างเก็บ" ที่ LAB 2 จะรวมเป็นคลังกลาง</div>
</body></html>`;

// ② พรอมต์เต็มรายคน: โครงเดียวกัน ต่างกันแค่ช่องที่ไฮไลต์ (ตัวอย่างของนิดา)
const hl = (c, t) => `<span class="hl" style="background:${c}22;border-bottom:3px solid ${c}">${t}</span>`;
const B = '#2563eb', O = '#ea580c', G = '#16a34a';
const prompt = `<html><head><meta charset="utf-8"><style>${css}
.pr{margin:0 36px;background:#fff;border:2px solid #cbd5e1;border-radius:16px;padding:16px 20px;font-size:21px;line-height:1.9}
.pr .l{display:block} .pr .i{display:block;padding-left:28px} .hl{border-radius:4px;padding:0 3px}
.key{margin:14px 36px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.k{border-radius:14px;padding:10px 14px;font-size:20px;line-height:1.45;color:#fff} .k b{font-size:23px}
.tbl{margin:16px 36px 0;border-collapse:collapse;width:calc(100% - 72px);font-size:19px;background:#fff}
.tbl th{background:#0B2545;color:#fff;padding:8px 10px;text-align:left} .tbl td{border-bottom:1px solid #e2e8f0;padding:8px 10px}
.tbl code{font-size:18px}
</style></head><body>
<h1>LAB 1 · พรอมต์เต็มรายคน</h1>
<div class="sub">สิ่งที่ agent ย่อยของแต่ละโต๊ะได้รับ: โครงเดียวกัน ต่างกันแค่ช่องที่ไฮไลต์ · ตัวอย่างของนิดา</div>
<div class="pr">
<span class="l">${hl(B, 'ฉันคือ นิดา แก้วมณี (sales-nida) หัวหน้าทีมขาย ฝ่าย Sales')} · นี่คือโต๊ะของฉัน (novatech/desks/sales-nida/)</span>
<span class="l">อ่านการ์ดของฉันก่อน: ${hl(B, '../../people/sales/sales-nida.md')}</span>
<span class="l">1. ลงมือทำงานจริง 1 ชิ้น: ${hl(O, 'ร่าง proposal ให้ลูกค้าธนาคารตาม TOR ของ deal-001 พร้อมใบคิดราคา')}</span>
<span class="i">ข้อมูลที่ใช้: ${hl(O, '../../company-kit/deal-001/tor-bank-queue.md, won-proposals/, price-list.csv …')}</span>
<span class="i">เก็บผลงานไว้ใน work/</span>
<span class="l">2. เก็บวิธีทำงานนี้เป็น skill ส่วนตัวชื่อ ${hl(G, 'sales-proposal')} ที่ ${hl(G, '.claude/skills/sales-proposal/')}</span>
<span class="i">- หัวไฟล์มี name, description และ metadata (owner, layer: personal, version, uses, next, follows)</span>
<span class="i">- skill เล็ก ใช้ได้ที่เครื่องคนอื่น: ความรู้จาก company-kit สรุปไว้ใน references/</span>
<span class="l">จบแล้วสรุปสั้น ๆ: ทำงานอะไร ได้ไฟล์อะไร skill มีไฟล์อะไร จุดไหนตัดสินใจเอง</span>
</div>
<div class="key">
<div class="k" style="background:${B}"><b>① ฉันคือใคร</b><br>ชื่อ · user · ตำแหน่ง · การ์ดของตัวเอง</div>
<div class="k" style="background:${O}"><b>② ทำงานอะไร</b><br>งาน 1 ชิ้น + ไฟล์ข้อมูลใน company-kit</div>
<div class="k" style="background:${G}"><b>③ เก็บเป็น skill ชื่ออะไร</b><br>ชื่อ skill + โฟลเดอร์ .claude/skills/</div>
</div>
<table class="tbl"><tr><th>agent ย่อยทำงานที่</th><th>② งาน</th><th>③ skill</th></tr>
<tr><td><code>desks/sales-nida/</code></td><td>ร่าง proposal ธนาคาร + ใบคิดราคา</td><td><code>sales-proposal</code></td></tr>
<tr><td><code>desks/md-somchai/</code></td><td>พิจารณาดีล DS-2026-034 (+ โน้ตลับ notes/)</td><td><code>deal-approval</code></td></tr>
<tr><td><code>desks/fin-joy/</code></td><td>คิดราคาและกำไร deal-001</td><td><code>pricing-calc</code></td></tr>
<tr><td colspan="3" style="color:#475569">… ครบ 24 คน · คุณวาง<b>พรอมต์รวมครั้งเดียว</b>ที่ <code>novatech/</code> แล้ว Claude แตก agent ย่อย 1 ตัวต่อ 1 โต๊ะ ส่งพรอมต์แบบนี้ให้เอง</td></tr></table>
<div class="foot"></div>
</body></html>`;

// ③ ตัวอย่าง 1 โต๊ะ: ผังโฟลเดอร์ทั้งโต๊ะหลัง LAB 1 ทุกไฟล์ พร้อมคำอธิบาย (ข้อมูลจาก _solution/desks-after-lab1 และ lab1/claude-summaries.md)
// แต่ละแถว: [ระดับย่อหน้า, ชื่อ, คำอธิบาย, ประเภท] ประเภท: d = โฟลเดอร์, s = seed สร้างให้, n = โน้ต, w = work/, k = skill
const kind = { d: '', s: 'tg', n: 'tr', w: 'tw2', k: 'tw' };
const desk = (p) => `<html><head><meta charset="utf-8"><style>${css}
.reads{margin:0 36px 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:20px}
.chip{background:#dbeafe;color:#1e3a8a;border-radius:10px;padding:4px 10px;font-family:Consolas,monospace;font-size:18px}
.tree{margin:0 36px;background:#fff;border:2px solid #cbd5e1;border-radius:18px;overflow:hidden}
.r{display:grid;grid-template-columns:520px 1fr;align-items:center;min-height:40px;border-bottom:1px solid #eef2f7;font-size:19px}
.r:last-child{border-bottom:0} .f{font-family:Consolas,monospace;font-size:19px;white-space:pre;padding-left:18px}
.r.d .f{font-weight:700} .x{color:#475569;padding-right:14px}
.r.w{background:#fff7ed} .r.k{background:#f0fdf4} .r.n{background:#eff6ff} .r.s{background:#f8fafc}
.r.h{font-size:21px;font-weight:800;color:#fff}
.note{margin:14px 36px 0;padding:12px 18px;border-radius:14px;font-size:22px;border:2px dashed #94a3b8;background:#fff}
</style></head><body>
<h1>${p.icon} ${p.title}</h1>
<div class="sub">เปิด Claude Code ที่ <code>novatech/desks/${p.user}/</code> · ${p.time} · ${p.result}</div>
<div class="reads"><b>📖 อ่านจากนอกโต๊ะ:</b>${p.reads.map(f => `<span class="chip">${f}</span>`).join('')}</div>
<div class="tree">${p.rows.map(([i, f, x, t]) => {
  if (t === 'h') return `<div class="r h" style="background:${f}"><div class="f" style="font-family:inherit">${x}</div><div></div></div>`;
  return `<div class="r ${t}"><div class="f">${'   '.repeat(i)}${f}</div><div class="x">${x}</div></div>`;
}).join('')}</div>
<div class="note">${p.note}</div>
<div class="foot"></div>
</body></html>`;

const people = [
  { file: 'lab1-desk-sales-nida.png', icon: '💼', title: 'โต๊ะของนิดา หัวหน้าทีมขาย', user: 'sales-nida', time: '4 นาที 4 วินาที', result: 'ได้ skill sales-proposal',
    reads: ['people/sales/sales-nida.md', 'company-kit/deal-001/tor-bank-queue.md', 'company-kit/won-proposals/', 'company-kit/price-list.csv', 'company-kit/margin-rules.md'],
    rows: [
      [0, 'desks/sales-nida/', '= คอมพิวเตอร์ของนิดา', 'd'],
      [1, '.gitea-token', 'บัตรผ่านของนิดา (seed สร้างให้ตั้งแต่ LAB 0)', 's'],
      [0, '#ea580c', '② ผลงานจริง: proposal ธนาคาร 4,780,000 บาท · margin 31.6%', 'h'],
      [1, 'work/', '', 'w'],
      [2, '📘 deal-001-proposal-nakhonluang-queue.docx', 'proposal 9 หัวข้อ ตัวที่ส่งลูกค้า (Word)', 'w'],
      [2, '📗 deal-001-pricing.xlsx', 'ใบคิดราคา สูตรคำนวณในเซลล์ (Excel)', 'w'],
      [2, 'deal-001-internal-notes.md', 'ต้นทุน margin เรื่องที่ต้องตัดสินใจ (ใช้ภายใน)', 'w'],
      [2, 'deal-001-pricing-input.json', 'ข้อมูลที่ใส่ให้สคริปต์คิดราคา', 'w'],
      [2, '📝 *.md 2 ไฟล์', 'ต้นฉบับ proposal และผลคิดราคาที่ Claude เขียน', 'w'],
      [0, '#16a34a', '③ skill ส่วนตัว', 'h'],
      [1, '.claude/skills/sales-proposal/', '', 'k'],
      [2, 'SKILL.md', 'หัวไฟล์ (name · description · metadata) + ขั้นตอน', 'k'],
      [2, 'references/', 'ความรู้ที่สรุปมาจาก company-kit', 'k'],
      [3, 'proposal-template.md', 'โครง 9 หัวข้อ + กติกาแบรนด์', 'k'],
      [3, 'winning-patterns.md', 'สิ่งที่ทำให้ proposal เก่าชนะ', 'k'],
      [3, 'pricing-rules.md', 'สรุปกฎกำไร', 'k'],
      [3, 'price-list.csv', '📋 สำเนาตารางราคา', 'k'],
      [3, 'pdpa-rules.md', '📋 สำเนากติกาข้อมูลลูกค้า', 'k'],
      [3, 'checklist.md', 'เช็กลิสต์ก่อนส่ง', 'k'],
      [2, 'scripts/price.py', 'คิดราคา + buffer 10% + เช็ก margin', 'k'],
    ],
    note: '⚠️ proposal นี้ <b>ไม่มี "ภาคผนวก PDPA"</b> เพราะกฎนี้อยู่ในโน้ตของ MD คนเดียว (ดูโต๊ะถัดไป)' },
  { file: 'lab1-desk-md-somchai.png', icon: '👔', title: 'โต๊ะของสมชาย MD', user: 'md-somchai', time: '2 นาที 37 วินาที', result: 'ได้ skill deal-approval',
    reads: ['people/exec/md-somchai.md', 'company-kit/deal-summaries/DS-2026-034-…', 'company-kit/margin-rules.md', 'company-kit/price-list.csv'],
    rows: [
      [0, 'desks/md-somchai/', '= คอมพิวเตอร์ของ MD', 'd'],
      [1, '.gitea-token', 'บัตรผ่านของ MD (seed สร้างให้)', 's'],
      [1, 'notes/deal-rules.md', '🔒 โน้ตลับ (seed ใส่ให้ MD คนเดียว) มีกฎภาคผนวก PDPA', 'n'],
      [0, '#ea580c', '② ผลงานจริง: พิจารณาดีล รพ.เมืองใหม่ → ❌ ตีกลับ (margin หลังบวก buffer 11.8%)', 'h'],
      [1, 'work/DS-2026-034/', '', 'w'],
      [2, '📘 approval.docx', 'บันทึกผลพิจารณา + ส่งกลับให้ใครแก้อะไร (Word)', 'w'],
      [2, 'deal-input.json', 'ตัวเลขของดีล เอาไปรันซ้ำได้', 'w'],
      [2, '📝 approval.md', 'ต้นฉบับที่ Claude เขียน', 'w'],
      [0, '#16a34a', '③ skill ส่วนตัว', 'h'],
      [1, '.claude/skills/deal-approval/', '', 'k'],
      [2, 'SKILL.md', 'หัวไฟล์ + ขั้นตอนพิจารณาดีล', 'k'],
      [2, 'references/', '', 'k'],
      [3, 'approval-rules.md', '🔒 เกณฑ์ 7 ข้อ + กฎภาคผนวก PDPA', 'k'],
      [3, 'approval-template.md', 'แม่แบบ approval.md', 'k'],
      [3, 'price-list.csv', '📋 สำเนาตารางราคา', 'k'],
      [2, 'scripts/deal_check.py', 'คิด margin · ส่วนลด · กำลังคน', 'k'],
    ],
    note: '🔒 กฎภาคผนวก PDPA ของลูกค้าธนาคาร ถูกเก็บไว้ในโต๊ะของ MD <b>ที่เดียว</b> (โน้ต + skill) นิดาไม่เคยเห็น' },
  { file: 'lab1-desk-fin-joy.png', icon: '🧾', title: 'โต๊ะของจอย หัวหน้าบัญชี', user: 'fin-joy', time: '3 นาที 51 วินาที', result: 'ได้ skill pricing-calc',
    reads: ['people/finance/fin-joy.md', 'company-kit/price-list.csv', 'company-kit/margin-rules.md', 'company-kit/deal-001/', 'company-kit/won-proposals/'],
    rows: [
      [0, 'desks/fin-joy/', '= คอมพิวเตอร์ของจอย', 'd'],
      [1, '.gitea-token', 'บัตรผ่านของจอย (seed สร้างให้)', 's'],
      [0, '#ea580c', '② ผลงานจริง: คิดราคา deal-001 · ฉบับเข้างบ 4,800,000 บาท margin 27.1%', 'h'],
      [1, 'work/', '', 'w'],
      [2, '📗 deal-001-B-pricing-internal.xlsx', 'ใบคิดราคาภายใน ฉบับเข้างบ ห้ามส่งลูกค้า (Excel)', 'w'],
      [2, '📘 deal-001-B-quotation-draft.docx', 'ร่างตารางราคาให้ Sales (Word)', 'w'],
      [2, 'deal-001-*.json  (2 ไฟล์)', 'ข้อมูลตั้งต้น ฉบับครบตาม TOR และฉบับเข้างบ', 'w'],
      [2, '📝 *.md  (4 ไฟล์)', 'ต้นฉบับใบคิดราคาและร่างทั้ง 2 ฉบับที่ Claude เขียน', 'w'],
      [0, '#16a34a', '③ skill ส่วนตัว', 'h'],
      [1, '.claude/skills/pricing-calc/', '', 'k'],
      [2, 'SKILL.md', 'หัวไฟล์ + ขั้นตอนคิดราคา 8 ขั้น', 'k'],
      [2, 'references/', '', 'k'],
      [3, 'margin-rules.md', 'กฎกำไรและส่วนลด', 'k'],
      [3, 'estimate-benchmarks.md', 'man-day ของดีลที่ชนะไว้เทียบ', 'k'],
      [3, 'price-list.csv', '📋 สำเนาตารางราคา', 'k'],
      [2, 'assets/example-deal.json', 'ตัวอย่างข้อมูลตั้งต้น', 'k'],
      [2, 'scripts/price_calc.py', 'คิดตามกฎกำไร ผิดกฎไม่ออกใบเสนอราคา', 'k'],
    ],
    note: '📋 <code>price-list.csv</code> มีสำเนาอยู่ใน skill ของ <b>ทั้ง 3 คน</b> และนิดาเขียนสคริปต์คิดราคาซ้ำกับจอย' },
  { file: 'lab1-desk-hr-fah.png', icon: '🤝', title: 'โต๊ะของฟ้า หัวหน้าฝ่าย HR', user: 'hr-fah', time: '2 นาที 10 วินาที', result: 'ได้ skill jd-writer',
    reads: ['people/hr/hr-fah.md', 'company-kit/jd-template.md', 'company-kit/hr-benefits-faq.md', 'company-kit/brand-guide.md', 'company-kit/deal-001/'],
    rows: [
      [0, 'desks/hr-fah/', '= คอมพิวเตอร์ของฟ้า', 'd'],
      [1, '.gitea-token', 'บัตรผ่านของฟ้า (seed สร้างให้)', 's'],
      [0, '#ea580c', '② ผลงานจริง: ประกาศรับ Senior Full-stack Developer (NVT-JOB-2026-021)', 'h'],
      [1, 'work/', '', 'w'],
      [2, '📘 NVT-JOB-2026-021-…fullstack.docx', 'ประกาศรับสมัคร 6 หัวข้อ เงินเดือน 75,000–105,000 (Word)', 'w'],
      [2, 'NVT-JOB-2026-021-check.md', 'ตารางตรวจตามกติกา + จุดที่ต้องตัดสินใจ', 'w'],
      [2, '📝 NVT-JOB-2026-021-…fullstack.md', 'ต้นฉบับที่ Claude เขียน', 'w'],
      [0, '#16a34a', '③ skill ส่วนตัว', 'h'],
      [1, '.claude/skills/jd-writer/', '', 'k'],
      [2, 'SKILL.md', 'หัวไฟล์ + 6 ขั้นตอน (ไม่มีช่วงเงินเดือน = หยุดถาม)', 'k'],
      [2, 'references/', '', 'k'],
      [3, 'jd-rules.md', 'โครงประกาศ คำต้องห้าม น้ำเสียงแบรนด์', 'k'],
      [3, 'benefits.md', 'สวัสดิการ ขั้นตอนสัมภาษณ์ on-call', 'k'],
      [3, 'example-jd.md', 'ประกาศฉบับนี้ ไว้เทียบความยาวและน้ำเสียง', 'k'],
    ],
    note: '💡 ไม่ใส่ชื่อธนาคารในประกาศเพราะ TOR มี NDA และไม่ระบุเพศหรืออายุ · กติกาข้อมูลลูกค้าถูกสรุปซ้ำใน <code>jd-rules.md</code> อีกที่' },
  { file: 'lab1-desk-ml-jay.png', icon: '🤖', title: 'โต๊ะของเจ หัวหน้าทีม ML', user: 'ml-jay', time: '3 นาที 27 วินาที', result: 'ได้ skill mlflow-experiment',
    reads: ['people/mlops/ml-jay.md', 'company-kit/ml-queue-forecast/experiment-results.csv', 'company-kit/ml-queue-forecast/notes.md', 'company-kit/deal-001/tor-bank-queue.md'],
    rows: [
      [0, 'desks/ml-jay/', '= คอมพิวเตอร์ของเจ', 'd'],
      [1, '.gitea-token', 'บัตรผ่านของเจ (seed สร้างให้)', 's'],
      [0, '#ea580c', '② ผลงานจริง: เทียบโมเดลพยากรณ์คิว 3 รอบ · r03 MAPE 15.2% = candidate', 'h'],
      [1, 'work/', '', 'w'],
      [2, '📗 experiment-registry.xlsx', 'ทะเบียน run ทุกรอบ + แผน r02b, r03b (Excel)', 'w'],
      [2, '📘 2026-W45-…-experiments.docx', 'รายงานการทดลองประจำสัปดาห์ (Word)', 'w'],
      [2, 'experiment-registry.csv', 'ทะเบียนเดียวกัน ไว้ backfill ลง MLflow', 'w'],
      [2, '📝 2026-W45-….md', 'ต้นฉบับรายงานที่ Claude เขียน', 'w'],
      [0, '#16a34a', '③ skill ส่วนตัว', 'h'],
      [1, '.claude/skills/mlflow-experiment/', '', 'k'],
      [2, 'SKILL.md', 'หัวไฟล์ + 6 ขั้นตอน (ห้ามประกาศผู้ชนะถ้าเทียบไม่แฟร์)', 'k'],
      [2, 'references/', '', 'k'],
      [3, 'run-record-standard.md', 'คอลัมน์ที่ต้องมี กติกาเทียบแฟร์', 'k'],
      [3, 'queue-forecast-context.md', 'เกณฑ์ TOR ข้อ 3.3 + ผล 3 รอบ', 'k'],
      [3, 'data-policy-summary.md', '📋 สำเนากติกาข้อมูลลูกค้า (ส่วนของ ML)', 'k'],
      [2, 'assets/weekly-report-template.md', 'แม่แบบรายงานประจำสัปดาห์', 'k'],
      [2, 'scripts/compare_runs.py', 'ตารางเทียบ run + ตรวจว่าเทียบแฟร์ไหม', 'k'],
    ],
    note: '💡 จับได้เองว่า r03 ใช้ข้อมูลคนละชุดกับ r02 (v4 38 สาขา vs v3 40 สาขา) จึงยังไม่ประกาศว่าชนะ แค่ให้สถานะ candidate' },
];

// ④ 3 ปัญหาของ "ต่างคนต่างเก็บ" (นับจากไฟล์จริงใน _solution/desks-after-lab1)
const pcss = `${css}
.wrap{margin:0 36px} .box{background:#fff;border:3px solid;border-radius:18px;padding:12px 16px}
.big{font-size:26px;font-weight:800} .grid{display:grid;gap:10px}
.cp{background:#fff7ed;border:2px solid #fb923c;border-radius:12px;padding:8px 10px;font-size:18px;line-height:1.35}
.cp code{font-size:17px;color:#9a3412} .cp b{font-size:19px}
.arrow{text-align:center;font-size:24px;color:#475569;margin:8px 0} .bad{color:#b91c1c;font-weight:800} .ok{color:#15803d;font-weight:800}
pre{margin:0;font-family:Consolas,monospace;font-size:19px;line-height:1.55;white-space:pre}
.fix{margin:16px 36px 0;padding:12px 18px;border-radius:14px;font-size:22px;background:#ecfdf5;border:2px solid #16a34a}`;
const copies = [['sales-nida', 'sales-proposal', 'pdpa-rules.md'], ['sales-krit', 'follow-up-email', 'customer-data-rules.md'], ['qa-bank', 'bug-report', 'data-policy.md'],
  ['ml-jay', 'mlflow-experiment', 'data-policy-summary.md'], ['ml-pim', 'model-release', 'data-policy.md'], ['fin-nok', 'invoice-check', 'pdpa-for-invoices.md'],
  ['ops-fon', 'postmortem', 'company-rules.md'], ['md-somchai', 'deal-approval', 'approval-rules.md']];
const p1 = `<html><head><meta charset="utf-8"><style>${pcss}</style></head><body>
<h1>ปัญหา 1 · ความรู้เดียวกัน ถูกคัดลอกไปหลายที่</h1>
<div class="sub">ตัวอย่าง: กติกาข้อมูลลูกค้า (PDPA) มีต้นฉบับที่เดียว แต่ทุกคนคัดลอกไปเก็บใน skill ของตัวเอง</div>
<div class="wrap">
<div class="box" style="border-color:#2563eb;text-align:center"><div class="big">📄 company-kit/customer-data-policy.md</div><div style="font-size:20px;color:#475569">ต้นฉบับ 1 ไฟล์ · เจ้าของเรื่อง <code>plat-may</code></div></div>
<div class="arrow">⬇️ ต่างคนต่างคัดลอก (สรุปไว้ใน <code>references/</code> ของตัวเอง ตั้งชื่อไฟล์ไม่เหมือนกัน)</div>
<div class="grid" style="grid-template-columns:repeat(4,1fr)">${copies.map(([u, s, f]) => `<div class="cp"><b>${u}</b><br>${s}/<br><code>${f}</code></div>`).join('')}</div>
<div class="arrow">… รวม <b class="bad">14 skill</b> (นับจาก 19 โต๊ะแรก) · <code>price-list.csv</code> ก็ถูกคัดลอกไว้ 3 skill</div>
<div class="box" style="border-color:#dc2626;font-size:22px">❓ ถ้าวันหนึ่งกติกาเปลี่ยน → ต้องตามแก้ <b class="bad">14 ที่</b> ถ้าลืมที่ใดที่หนึ่ง skill นั้นจะทำงานด้วยกติกาเก่า</div>
</div>
<div class="fix">✅ แก้ใน LAB 2: ย้ายของที่ทุกคนใช้ไปไว้ <b>ที่เดียว</b> ใน plugin <code>core</code> แล้วให้ทุก skill อ้างถึงแทนการคัดลอก</div>
<div class="foot"></div></body></html>`;

const meta = (who, lines) => `<div class="box" style="border-color:#94a3b8"><div class="big" style="font-size:22px;margin-bottom:6px">${who}</div><pre>${lines}</pre></div>`;
const g = s => `<span class="ok">${s}  ✓</span>`, x = (s, why) => `<span class="bad">${s}  ✗</span> <span style="font-family:'Leelawadee UI';font-size:17px;color:#b91c1c">${why}</span>`;
const p2 = `<html><head><meta charset="utf-8"><style>${pcss}</style></head><body>
<h1>ปัญหา 2 · ต่างคนต่างเข้าใจหัวไฟล์ไม่ตรงกัน</h1>
<div class="sub">พรอมต์เดียวกันขอให้ใส่ <code>uses</code> · <code>follows</code> · <code>version</code> แต่หัวไฟล์จริงของ 3 คนออกมาไม่เหมือนกัน</div>
<div class="wrap">
<div class="box" style="border-color:#2563eb;font-size:21px;line-height:1.6;margin-bottom:12px"><b>ที่ขอไว้:</b> <code>uses</code> = skill อื่นที่เรียกใช้ · <code>follows</code> = <b>นโยบาย</b> ที่ต้องทำตาม เช่น <code>customer-data-policy</code> · <code>next</code> = งานถัดไป</div>
<div class="grid" style="grid-template-columns:1fr">
${meta('💼 sales-nida · sales-proposal', `uses:    ${g('[pricing-calc]')}\nfollows: ${g('[customer-data-policy]')}\nversion: 1.0.0`)}
${meta('👔 md-somchai · deal-approval', `uses:    ${x('[customer-data-policy]', 'นโยบาย ควรอยู่ใน follows')}\nfollows: ${x('[pricing-calc]', 'เป็น skill งาน ไม่ใช่นโยบาย')}\nversion: 1.0.0`)}
${meta('🧾 fin-joy · pricing-calc', `uses:    ${x('[customer-data-policy]', 'นโยบาย ควรอยู่ใน follows')}\nfollows: ${x('[req-to-spec, arch-template, follow-up-email]', 'งานที่ทำมาก่อน')}\nversion: ${x('0.1.0', 'คนอื่นเริ่ม 1.0.0')}`)}
</div>
<div class="box" style="border-color:#dc2626;font-size:22px;margin-top:12px">ทั้งบริษัท: ใส่ <code>follows</code> เป็นนโยบายถูกแค่ <b class="bad">2 คน</b> (<code>sales-nida</code>, <code>exec-ploy</code>) · ถ้าหัวไฟล์ไม่ตรงกัน กราฟว่า skill ไหนพึ่งอะไร (หัวข้อ 25) จะเพี้ยน</div>
</div>
<div class="fix">✅ แก้ใน LAB 2: ทีมกลางทำหัวไฟล์ให้เป็นแบบเดียวกันทั้งคลัง · LAB 6: CI ตรวจหัวไฟล์ทุก PR</div>
<div class="foot"></div></body></html>`;

const p3 = `<html><head><meta charset="utf-8"><style>${pcss}
.two{display:grid;grid-template-columns:1fr 90px 1fr;align-items:stretch} .wall{display:flex;align-items:center;justify-content:center;font-size:56px}
</style></head><body>
<h1>ปัญหา 3 · ความรู้ในหัวคนเดียว ไม่ไปถึงคนที่ต้องใช้</h1>
<div class="sub">กฎ "ภาคผนวก PDPA สำหรับลูกค้าธนาคาร" มีผลตั้งแต่ 1 ก.ค. 2026 แต่รู้อยู่คนเดียว</div>
<div class="wrap two">
<div class="box" style="border-color:#1d4ed8"><div class="big">👔 desks/md-somchai/</div><pre style="font-size:18px">
notes/deal-rules.md
   🔒 ข้อ 5: ลูกค้าธนาคารต้องมี
      ภาคผนวก PDPA ไม่มี = ตีกลับ
.claude/skills/deal-approval/
   references/approval-rules.md
   🔒 เก็บกฎนี้ไว้ด้วย</pre><div style="font-size:20px;margin-top:8px" class="ok">MD รู้กฎ และ skill ของ MD ก็รู้</div></div>
<div class="wall">🧱</div>
<div class="box" style="border-color:#ea580c"><div class="big">💼 desks/sales-nida/</div><pre style="font-size:18px">
work/deal-001-proposal-….md
   proposal ธนาคาร 9 หัวข้อ
   ❌ ไม่มี "ภาคผนวก PDPA"
.claude/skills/sales-proposal/
   ❌ ไม่รู้จักกฎนี้</pre><div style="font-size:20px;margin-top:8px" class="bad">คนเขียน proposal ไม่รู้ว่าต้องมี</div></div>
</div>
<div class="wrap"><div class="box" style="border-color:#dc2626;font-size:22px;margin-top:14px">ต่างคนต่างอยู่คนละโต๊ะ ไม่มีทางแชร์กัน → ใน LAB 4 นิดาส่ง proposal นี้ให้ MD แล้ว <b class="bad">ถูกตีกลับ</b></div></div>
<div class="fix">✅ แก้ใน LAB 5: นิดาเปิด PR เอากฎนี้ใส่ skill ของ Sales ผ่านคลังกลาง แล้วเซลส์ทุกคนได้กฎไปด้วย</div>
<div class="foot"></div></body></html>`;

// ⑤ ภาพหน้าเอกสารจริงที่เปิดด้วย Word / Excel (export เป็น PDF แล้วเรนเดอร์หน้าแรก · ส่ง pages-dir เป็นอาร์กิวเมนต์ที่ 3)
const docs = pages ? [
  ['lab1-doc-sales-nida.png', 'Word', '#185ABD', '💼 นิดา', 'desks/sales-nida/work/deal-001-proposal-nakhonluang-queue.docx', 'deal-001-proposal-nakhonluang-queue.png', 'proposal ที่ส่งลูกค้า · หน้า 1 จาก 4', 1000],
  ['lab1-doc-md-somchai.png', 'Word', '#185ABD', '👔 สมชาย MD', 'desks/md-somchai/work/DS-2026-034/approval.docx', 'approval.png', 'บันทึกผลพิจารณาดีล · หน้า 1 จาก 2', 1000],
  ['lab1-doc-hr-fah.png', 'Word', '#185ABD', '🤝 ฟ้า', 'desks/hr-fah/work/NVT-JOB-2026-021-senior-fullstack.docx', 'NVT-JOB-2026-021-senior-fullstack.png', 'ประกาศรับสมัครงาน · หน้า 1 จาก 2', 1000],
  ['lab1-doc-ml-jay.png', 'Excel', '#107C41', '🤖 เจ', 'desks/ml-jay/work/experiment-registry.xlsx', 'experiment-registry.png', 'ทะเบียน run · สีตามสถานะ · MAPE ผ่านเกณฑ์ ≤ 20% เป็นสีเขียว', 0],
  ['lab1-doc-fin-joy.png', 'Excel', '#107C41', '🧾 จอย', 'desks/fin-joy/work/deal-001-B-pricing-internal.xlsx', 'deal-001-B-pricing-internal.png', 'ใบคิดราคาภายใน · ราคาขาย ต้นทุน margin เป็นสูตรในเซลล์', 0],
].map(([file, app, color, who, path, png, cap, h]) => [`<html><head><meta charset="utf-8"><style>${css}
.win{margin:24px 36px 0;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px #0003;border:1px solid #cbd5e1}
.bar{background:${color};color:#fff;padding:12px 18px;font-size:22px;font-weight:700;display:flex;gap:14px;align-items:center}
.bar code{font-size:19px;font-weight:400;opacity:.95} .app{background:#fff;color:${color};border-radius:8px;padding:2px 10px;font-size:19px}
.page{background:#e5e7eb;padding:18px;${h ? `height:${h}px;` : ''}overflow:hidden;position:relative}
.page img{width:100%;display:block;box-shadow:0 2px 10px #0002;background:#fff}
${h ? '' : '.page:after{display:none}'}
.page:after{content:'';position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(#e5e7eb00,#e5e7eb)}
.cap{margin:12px 36px 26px;font-size:21px;color:#334155}
</style></head><body>
<div class="win"><div class="bar"><span class="app">${app}</span>${who}<code>${path}</code></div>
<div class="page"><img src="data:image/png;base64,${readFileSync(join(pages, png)).toString('base64')}"></div></div>
<div class="cap">${cap} · เปิดด้วย ${app} จริงแล้ว export หน้าแรก</div>
</body></html>`, file]) : [];

const b = await chromium.launch({ executablePath: exe });
const shots = [[folders, 'lab1-folders.png'], [prompt, 'lab1-prompt.png'], ...people.map(p => [desk(p), p.file]),
  [p1, 'lab1-problem-1-copies.png'], [p2, 'lab1-problem-2-headers.png'], [p3, 'lab1-problem-3-silo.png'], ...docs];
for (const [html, out] of shots) {
  const pg = await b.newPage({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 2 });
  await pg.setContent(html); await pg.screenshot({ path: join(dir, out), fullPage: true });
}
await b.close();

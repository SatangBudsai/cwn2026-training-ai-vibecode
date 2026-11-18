// ภาพประกอบ LAB 2 (กว้าง 1200px เรนเดอร์ 2 เท่า): ก่อน = skill กระจายทุกโต๊ะ → หลัง = คลัง org-skills ในโต๊ะ plat-ken → push ขึ้น Gitea
// ข้อมูลจาก _solution/org-skills-28-after-lab2 (รอบบริษัท 28 คน: 10 แผนก + core + shared = 12 plugin)
// node lab2-diagrams.mjs <img-dir> <chromium.exe>
import { join } from 'node:path';
import { chromium } from 'playwright-core';
const [,, dir, exe] = process.argv;

const css = `body{margin:0;width:1200px;font-family:'Leelawadee UI','Segoe UI',sans-serif;background:#f8fafc;color:#1d2433}
h1{font-size:42px;margin:24px 36px 4px} .sub{margin:0 36px 16px;font-size:22px;color:#4a5568}
code{font-family:Consolas,monospace}
.wrap{margin:0 36px;display:grid;grid-template-columns:330px 70px 1fr;gap:0;align-items:start}
.before{background:#fff;border:3px solid #f59e0b;border-radius:16px;overflow:hidden}
.bh{background:#f59e0b;color:#fff;font-size:22px;font-weight:800;padding:8px 14px}
.bd{padding:6px 14px;font-size:17px;line-height:1.5;border-bottom:1px dashed #fde68a} .bd code{font-size:16px;color:#9a3412}
.bd b{font-family:Consolas,monospace;font-size:16px}
.arrow{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-size:40px;color:#475569;text-align:center}
.arrow span{font-size:15px;line-height:1.3}
.after{background:#fff;border:3px solid #0B2545;border-radius:16px;overflow:hidden}
.ah{background:#0B2545;color:#fff;font-size:22px;font-weight:800;padding:8px 14px} .ah code{font-size:20px;color:#fff}
.r{display:grid;grid-template-columns:300px 1fr;border-bottom:1px solid #eef2f7;font-size:17px;min-height:34px;align-items:center}
.r .f{font-family:Consolas,monospace;white-space:pre;padding-left:12px;font-size:16.5px} .r .x{color:#475569;padding:4px 10px 4px 0;line-height:1.35}
.l1{background:#fef9c3} .l2{background:#ecfeff} .l3{background:#f0fdf4} .meta{background:#f8fafc}
.tag{display:inline-block;border-radius:8px;padding:0 8px;font-size:14px;font-weight:700;color:#fff;margin-right:6px}
.push{margin:14px 36px 0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pb{border-radius:14px;padding:10px 14px;font-size:19px;line-height:1.5;background:#fff;border:2px solid #cbd5e1}
.pb b{font-size:21px}
.foot{margin:14px 36px 26px;font-size:19px;color:#334155;line-height:1.6}`;

const desks = [['sales-nida', 'sales-proposal'], ['sales-krit', 'follow-up-email'], ['md-somchai', 'deal-approval'], ['fin-joy', 'pricing-calc'],
  ['hr-fah', 'jd-writer'], ['ml-jay', 'mlflow-experiment'], ['plat-may', 'customer-data-policy']];
const R = (f, x, c = '') => `<div class="r ${c}"><div class="f">${f}</div><div class="x">${x}</div></div>`;
const T = (n, color) => `<span class="tag" style="background:${color}">${n}</span>`;
const html = `<html><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>LAB 2 · จากทุกโต๊ะ เป็นคลังเดียว</h1>
<div class="sub">ทีมกลาง (<code>plat-ken</code>) อ่าน skill ของทุกโต๊ะ (ไม่แก้ของใคร) แล้วจัดเป็นคลัง <code>org-skills</code> ในโต๊ะตัวเอง ก่อน push ขึ้น Gitea</div>
<div class="wrap">
<div class="before"><div class="bh">ก่อน · ต่างคนต่างเก็บ</div>
${desks.map(([u, s]) => `<div class="bd"><b>desks/${u}/</b><br><code>.claude/skills/${s}/</code></div>`).join('')}
<div class="bd" style="color:#475569">… และโต๊ะอื่นทุกโต๊ะ · กติกาเดียวกันมีสำเนาอยู่หลายที่</div></div>
<div class="arrow">➜<span>อ่าน<br>อย่างเดียว</span></div>
<div class="after"><div class="ah">หลัง · <code>desks/plat-ken/org-skills/</code></div>
${R('.claude-plugin/', 'สารบัญของคลัง', 'meta')}
${R('   marketplace.json', 'ชื่อคลัง <code>novatech-skills</code> + รายชื่อ 12 plugin', 'meta')}
${R('plugins/', '1 แผนก = 1 plugin', '')}
${R('   core/skills/', T('ชั้น 1', '#ca8a04') + 'ทุกคนติดตั้ง: customer-data-policy · brand-guide · pricing-rules · skill-finder', 'l1')}
${R('   shared/skills/', T('ชั้น 2', '#0891b2') + 'งานข้ามแผนก: meeting-minutes', 'l2')}
${R('   sales/skills/', T('ชั้น 3', '#16a34a') + 'sales-proposal · follow-up-email', 'l3')}
${R('   exec/skills/', T('ชั้น 3', '#16a34a') + 'deal-approval · exec-deck · pipeline-review · tech-risk-review · cost-headcount-review', 'l3')}
${R('   finance/skills/', T('ชั้น 3', '#16a34a') + 'pricing-calc · invoice-check', 'l3')}
${R('   product/ และแผนกอื่น', T('ชั้น 3', '#16a34a') + 'product · hr · mlops · sa · dev · qa · devops แผนกละ 2 skill', 'l3')}
${R('CODEOWNERS', 'โฟลเดอร์ไหนใครรีวิว: <code>plugins/sales/</code> → <code>@sales-nida</code> …', 'meta')}
${R('scripts/build-catalog.py', 'สร้างบัตรรายการ catalog.md จากหัวไฟล์ทุก skill', 'meta')}
</div></div>
<div class="push">
<div class="pb"><b>⬆️ push ขึ้น Gitea</b><br><code>http://localhost:3300/novatech/org-skills</code><br>repo สาธารณะ ทุกโต๊ะดึงไปติดตั้งได้ (LAB 3)</div>
<div class="pb"><b>🛡️ กติกาของ main</b><br>ห้าม push ตรง · ต้องผ่าน PR · approve อย่างน้อย 1 คน<br>ทดสอบแล้ว: push ตรงถูกปฏิเสธ</div>
</div>
<div class="foot">ผลรันจริง (บริษัท 28 คน): 12 plugin · 28 skill · รวมกติกาที่ซ้ำเป็น core แล้วลบสำเนาทิ้ง 6 ไฟล์ · <code>desks/*/.claude/skills/</code> ของทุกคนยังอยู่เหมือนเดิม</div>
</body></html>`;

const b = await chromium.launch({ executablePath: exe });
const pg = await b.newPage({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 2 });
await pg.setContent(html); await pg.screenshot({ path: join(dir, 'lab2-before-after.png'), fullPage: true });
await b.close();

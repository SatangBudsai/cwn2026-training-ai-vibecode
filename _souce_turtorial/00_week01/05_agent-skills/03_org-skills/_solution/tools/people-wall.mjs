// ภาพรวมหน้าตาพนักงาน 28 คน จัดตามสาย/แผนก (ภาพบุคคลจาก img/people/<user>.jpg สร้างด้วย image gen · ชื่อและบทบาทจาก seed/people.json)
// node people-wall.mjs <03_org-skills dir> <out.png> <chromium.exe>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
const [,, root, out, exe] = process.argv;
const P = JSON.parse(readFileSync(join(root, 'novatech/seed/people.json'), 'utf8')).people;
const by = Object.fromEntries(P.map(p => [p.user, p]));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pic = u => `data:image/jpeg;base64,${readFileSync(join(root, 'img/people', u + '.jpg')).toString('base64')}`;
const groups = [
  ['ผู้บริหาร', '#e9d5ff', ['md-somchai', 'exec-ploy', 'cco-wit', 'cto-nat', 'cfo-ying']],
  ['สายบริหารและการเงิน · HR · บัญชี', '#fed7aa', ['hr-fah', 'hr-oat', 'hr-namtan', 'fin-joy', 'fin-nok']],
  ['สายธุรกิจ · Sales · SA · Product', '#fbcfe8', ['sales-nida', 'sales-krit', 'sales-mook', 'sa-ton', 'sa-ice', 'pm-beam', 'pm-gift']],
  ['สายเทคโนโลยี · Dev · QA · DevOps · ML · ทีมกลาง', '#bae6fd', ['dev-pond', 'dev-mew', 'dev-new', 'qa-mint', 'qa-bank', 'ops-art', 'ops-fon', 'ml-jay', 'ml-pim', 'plat-ken', 'plat-may']],
];
const card = u => { const p = by[u]; const role = p.role.split(' (')[0].split(' ดูแล')[0];
  return `<div class="c"><div class="ph" style="background-image:url(${pic(u)})">${p.lead ? '<span class="cr">👑</span>' : ''}${/ใหม่/.test(p.role) ? '<span class="nw">🆕</span>' : ''}</div>
  <div class="nm">${esc(p.name.split(' ')[0])}</div><div class="us">${esc(u)}</div><div class="rl">${esc(role)}</div></div>`; };
const html = `<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:2000px;background:#f6f7fb;font-family:'Leelawadee UI','Segoe UI',sans-serif;color:#0B2545;padding:30px 36px}
h1{margin:0 0 6px;font-size:40px}.sub{font-size:22px;color:#475569;margin-bottom:22px}
.wrap{display:flex;flex-wrap:wrap;gap:20px}.g{background:#fff;border-radius:22px;padding:16px 20px 18px;box-shadow:0 4px 16px #0B254514}
.g h2{margin:0 0 12px;font-size:25px;display:inline-block;padding:4px 16px;border-radius:14px}
.row{display:flex;flex-wrap:wrap;gap:16px}.c{width:150px;text-align:center}
.ph{position:relative;width:150px;height:150px;border-radius:18px;background-size:cover;background-position:center}
.cr,.nw{position:absolute;top:6px;font-size:26px;background:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center}.cr{left:6px}.nw{right:6px}
.nm{font-size:22px;font-weight:700;margin-top:6px}.us{font-family:Consolas,monospace;font-size:16px;color:#0f766e}.rl{font-size:16px;color:#475569;line-height:1.3}
</style></head><body><h1>พนักงานโนวาเทค 28 คน</h1><div class="sub">👑 ผู้ดูแล skill ของแผนก · 🆕 น้องใหม่ · ภาพบุคคลเป็นภาพจำลอง</div>
<div class="wrap">${groups.map(([t, c, us]) => `<div class="g"><h2 style="background:${c}">${t}</h2><div class="row">${us.map(card).join('')}</div></div>`).join('')}</div>
</body></html>`;
const b = await chromium.launch({ executablePath: exe });
const pg = await b.newPage({ viewport: { width: 2000, height: 900 } });
await pg.setContent(html); await pg.screenshot({ path: out, fullPage: true });
await b.close();

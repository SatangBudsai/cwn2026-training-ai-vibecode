// สรุปผลจาก results.json → บรรทัดละ test: project | สถานะ | ขั้นที่ล้ม | ข้อความผิดพลาดย่อ | หมายเหตุ
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2] || 'results.json', 'utf8'));
const out = [];
const walk = (s) => { (s.suites || []).forEach(walk); for (const sp of s.specs || []) for (const t of sp.tests) {
  const res = t.results.at(-1) || {};
  const err = (res.error?.message || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(Boolean).slice(0, 3).join(' / ');
  out.push({ title: sp.title, project: t.projectName, status: res.status, err, notes: t.annotations.filter(a => a.type === 'note').map(a => a.description) });
}};
r.suites.forEach(walk);
if (process.argv[3] === '--json') console.log(JSON.stringify(out, null, 1));
else for (const o of out.sort((a, b) => a.title.localeCompare(b.title) || a.project.localeCompare(b.project)))
  console.log(`${o.title} | ${o.project} | ${o.status} | ${o.err.slice(0, 230)} | ${o.notes.join('; ')}`);

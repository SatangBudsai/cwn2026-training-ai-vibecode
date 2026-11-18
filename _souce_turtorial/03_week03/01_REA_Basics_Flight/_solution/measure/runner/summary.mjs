// รวมผล 5 ไม้บรรทัดของรอบนี้ → SUMMARY.md + summary.json แล้วเทียบกับค่าที่บทที่ 3–4 วัด v1 ได้
// node runner/summary.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const RUN = path.resolve(process.argv[2]);
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(RUN, f), 'utf8')); } catch { return null; } };
const acc = read('accept/results.json'), diff = read('diff.json'), st = read('structure.json'), vis = read('visual.json'), fl = read('flights.json');
const meta = read('meta.json') || {};
const PREV = { accept: '0/82', diff: '0/8', structure: '3.8%', visual: '27.88%', flights: '22' };

const accPass = acc ? acc.results.filter((r) => r.status === 'PASS').length : null;
const now = {
  accept: acc ? `${accPass}/${acc.results.length}` : 'ERROR',
  diff: diff ? `${diff.pass}/${diff.total}` : 'ERROR',
  structure: st ? `${(st.structure * 100).toFixed(1)}%` : 'ERROR',
  visual: vis ? `${vis.percent.toFixed(2)}%` : 'ERROR',
  flights: fl ? String(fl.total) : 'ERROR',
};
const label = { accept: 'acceptance 82 ข้อ', diff: 'differential 8 สถานการณ์', structure: 'โครงสร้างหน้า', visual: 'visual diff', flights: 'เที่ยวบิน' };
const keys = Object.keys(label);

const L = [];
L.push('# ผลวัด SkyThai Mini (v1) ด้วยไม้บรรทัด 5 อัน', '');
L.push(`รันเมื่อ ${meta.ranAt ?? new Date().toISOString()} · URL ${meta.baseURL ?? 'http://localhost:5081'} · คำสั่ง \`measure/run-all.sh\``, '');
L.push(`| เวอร์ชัน | ${keys.map((k) => label[k]).join(' | ')} |`, `|---|${keys.map(() => '---:').join('|')}|`);
L.push(`| v1 (รอบนี้) | ${keys.map((k) => now[k]).join(' | ')} |`);
L.push(`| v1 (บทที่ 3–4) | ${keys.map((k) => PREV[k]).join(' | ')} |`);
L.push(`| ตรงกันไหม | ${keys.map((k) => (now[k] === PREV[k] ? '✅' : '⚠️ ต่าง')).join(' | ')} |`, '');

L.push('## รายละเอียด', '');
if (acc) {
  const unverified = acc.results.filter((r) => r.status !== 'PASS' && r.reason.startsWith('ยืนยันไม่ได้')).length;
  L.push(`- **acceptance**: ผ่าน ${accPass}/${acc.results.length} (ไม่ผ่าน ${acc.results.length - accPass}, ในนั้นยืนยันไม่ได้ ${unverified}) · รายงานเต็ม \`accept/REPORT.md\` · ข้อผิดพลาดเต็ม \`accept/results.json\``);
  const art = acc.results.filter((r) => r.artifactError).length;
  if (art) L.push(`  - สร้าง GIF ไม่สำเร็จ ${art} ข้อ (ไม่กระทบคำตัดสิน)`);
}
if (diff) {
  L.push(`- **differential**: ${diff.pass}/${diff.total} · เฉลยจาก \`diff/diff-results.json\` (ต้นฉบับแช่แข็ง รันเมื่อ ${diff.oracle.ranAt}) ไม่ได้เปิดต้นฉบับใหม่`);
  for (const [id, s] of Object.entries(diff.scenarios)) {
    const prev = diff.previous?.[id];
    L.push(`  - ${id} ${s.title}: ${s.verdict}${prev && prev !== s.verdict ? ` (บทที่ 3–4: ${prev})` : ''} — ${String(s.detail).slice(0, 200)}`);
  }
}
if (st) L.push(`- **โครงสร้างหน้า**: ${now.structure} = (key Jaccard ${(st.keyJaccard * 100).toFixed(1)}% + องค์ประกอบสำคัญ ${st.keyFound}/${st.keyTotal} = ${((st.keyFound / st.keyTotal) * 100).toFixed(1)}%) / 2 · strict Jaccard ${(st.strictJaccard * 100).toFixed(1)}% · role-weighted ${(st.roleWeightedJaccard * 100).toFixed(1)}% · snapshot \`structure/snapshots/v1.yml\``);
if (vis) L.push(`- **visual diff**: ${vis.pixels.toLocaleString('en-US')}/${vis.totalPixels.toLocaleString('en-US')} px = ${now.visual} (pixelmatch threshold ${vis.threshold}, includeAA ${vis.includeAA}, ${vis.viewport.width}×${vis.viewport.height}) · ภาพ \`visual/v1.png\`, \`visual/v1-diff.png\``);
if (fl) L.push(`- **เที่ยวบิน**: ${fl.total} ใบไม่ซ้ำ จากทุกมุมมองที่กดถึงได้ (${fl.views.map((v) => `\`${v.url}\` ${v.cards}`).join(', ')})`);
L.push('');

const diffs = keys.filter((k) => now[k] !== PREV[k]);
L.push('## เทียบกับบทที่ 3–4', '');
if (!diffs.length) L.push('ทุกค่าตรงกับที่บทที่ 3–4 วัดไว้');
else L.push(`ค่าที่ต่าง: ${diffs.map((k) => `${label[k]} ${PREV[k]} → ${now[k]}`).join(' · ')} — ดูเหตุผลใน NOTES.md (ถ้ามี)`);
L.push('');

fs.writeFileSync(path.join(RUN, 'SUMMARY.md'), L.join('\n'));
fs.writeFileSync(path.join(RUN, 'summary.json'), JSON.stringify({ ...meta, now, previous: PREV, differs: diffs }, null, 2));
console.log(L.slice(4, 8).join('\n'));

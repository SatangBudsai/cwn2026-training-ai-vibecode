// แปลงวิดีโอ test ระดับ P1 เป็น GIF (ยาวอย่างน้อย 5.5 วินาที) แล้วสร้าง test-report/index.html
// ใช้หลังรัน `npx playwright test` (อ่านผลจาก test-report/results.json) :  node make-gifs.js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const MIN_SECONDS = 5.5;
const report = JSON.parse(fs.readFileSync('test-report/results.json', 'utf8'));
const gifDir = path.join('test-report', 'gifs');
fs.mkdirSync(gifDir, { recursive: true });

const tests = [];
const walk = (suite) => {
  (suite.specs || []).forEach((spec) => {
    const t = spec.tests[0];
    const r = t.results[t.results.length - 1];
    const id = (spec.title.match(/TC-[A-Z]+-\d+[A-Z]?/) || [])[0];
    const row = (spec.title.match(/แถว (\w)/) || [])[1]; // TC-SLA-01 แยกเป็นแถว a–i
    const prio = (spec.title.match(/@(P\d)/) || [])[1];
    const video = (r.attachments || []).find((a) => a.name === 'video');
    tests.push({ id: row ? `${id}-${row}` : id, tc: id, prio, title: spec.title, status: r.status === 'passed' ? 'pass' : r.status === 'skipped' ? 'skip' : 'fail', video: video && video.path });
  });
  (suite.suites || []).forEach(walk);
};
report.suites.forEach(walk);

const duration = (file) => {
  const out = spawnSync(ffmpeg, ['-i', file], { encoding: 'utf8' }).stderr;
  const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};

for (const t of tests) {
  t.gifSeconds = 0;
  if (t.prio !== 'P1' || !t.video || !fs.existsSync(t.video)) continue; // GIF เฉพาะ P1 (ตามพรอมต์ขั้น 4)
  const pad = Math.max(0, MIN_SECONDS - duration(t.video));
  const vf = `fps=8,scale=640:-1:flags=lanczos,tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)},split[a][b];[a]palettegen[p];[b][p]paletteuse`;
  const out = path.join(gifDir, `${t.id}.gif`);
  spawnSync(ffmpeg, ['-y', '-i', t.video, '-vf', vf, out], { encoding: 'utf8' });
  t.gifSeconds = duration(out);
}

tests.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync('test-report/gifs.json', JSON.stringify(tests, null, 2));

const pass = tests.filter((t) => t.status === 'pass').length;
const skip = tests.filter((t) => t.status === 'skip').length;
const cards = tests.map((t) => `
  <section class="card ${t.status}" data-status="${t.status}">
    <h3>${t.id} <span class="tag">${t.prio || ''}</span> <span class="badge">${{ pass: 'ผ่าน', fail: 'ล้ม', skip: 'ข้าม' }[t.status]}</span></h3>
    <p>${t.title.replace(/</g, '&lt;')}</p>
    ${t.gifSeconds ? `<img loading="lazy" src="gifs/${t.id}.gif" alt="${t.id}">` : `<p><i>${t.prio === 'P1' ? 'ไม่มี GIF: test นี้ไม่ได้เปิดเบราว์เซอร์ (เรียก API อย่างเดียว)' : 'ไม่ทำ GIF: ไม่ใช่ระดับ P1'}</i></p>`}
  </section>`).join('');

fs.writeFileSync('test-report/index.html', `<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>e-Service test report</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;background:#fff;color:#262626}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.card{background:#fff;border:2px solid #146c2e;padding:12px}.card.fail{border-color:#b01e24}.card.skip{border-color:#8c8c8c}
.card img{width:100%}.badge{font-size:.8em;padding:2px 10px;border-radius:999px;background:#146c2e;color:#fff}
.fail .badge{background:#b01e24}.skip .badge{background:#595959}.tag{color:#595959;font-size:.8em}button{margin-right:8px;padding:6px 16px;border-radius:999px;border:1px solid #262626;background:#fff}</style></head><body>
<h1>e-Service — ผลทดสอบ ${tests.length} test: ผ่าน ${pass} · ล้ม ${tests.length - pass - skip} · ข้าม ${skip}</h1>
<p><button onclick="f('all')">ทั้งหมด</button><button onclick="f('pass')">ผ่าน</button><button onclick="f('fail')">ล้ม</button></p>
<div class="grid">${cards}</div>
<script>function f(s){document.querySelectorAll('.card').forEach(c=>c.style.display=(s==='all'||c.dataset.status===s)?'':'none')}</script>
</body></html>`);

const withGif = tests.filter((t) => t.gifSeconds);
console.log(`tests=${tests.length} pass=${pass} skip=${skip} gif=${withGif.length}`);
console.log('GIF range:', Math.min(...withGif.map((t) => t.gifSeconds)).toFixed(1), '-', Math.max(...withGif.map((t) => t.gifSeconds)).toFixed(1), 's');

// แปลงวิดีโอของแต่ละ test เป็น GIF (ยาวอย่างน้อย 5 วินาที) แล้วสร้าง test-report/index.html
// ใช้: node make-gifs.js   (อ่านผลจาก test-report/results.json)
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
    const id = (spec.title.match(/TC-[A-Z]+-\d+|TC-MY-\d+/) || [])[0];
    const prio = (spec.title.match(/@(P\d)/) || [])[1];
    const video = (r.attachments || []).find((a) => a.name === 'video');
    tests.push({ id, prio, title: spec.title, status: r.status === 'passed' ? 'pass' : 'fail', video: video && video.path });
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
  if (!t.video || !fs.existsSync(t.video)) { t.gifSeconds = 0; continue; }
  const pad = Math.max(0, MIN_SECONDS - duration(t.video));
  const vf = `fps=8,scale=640:-1:flags=lanczos,tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)},split[a][b];[a]palettegen[p];[b][p]paletteuse`;
  const out = path.join(gifDir, `${t.id}.gif`);
  spawnSync(ffmpeg, ['-y', '-i', t.video, '-vf', vf, out], { encoding: 'utf8' });
  t.gifSeconds = duration(out);
}

tests.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync('test-report/gifs.json', JSON.stringify(tests, null, 2));

const pass = tests.filter((t) => t.status === 'pass').length;
const cards = tests.map((t) => `
  <section class="card ${t.status}" data-status="${t.status}">
    <h3>${t.id} <span class="tag">${t.prio || ''}</span> <span class="badge">${t.status === 'pass' ? 'ผ่าน' : 'ล้ม'}</span></h3>
    <p>${t.title.replace(/</g, '&lt;')}</p>
    ${t.gifSeconds ? `<img loading="lazy" src="gifs/${t.id}.gif" alt="${t.id}">` : '<p><i>ไม่มี GIF: test นี้เรียก API โดยไม่เปิดเบราว์เซอร์</i></p>'}
  </section>`).join('');

fs.writeFileSync('test-report/index.html', `<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>PawPantry test report</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;background:#fafafa;color:#222}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.card{background:#fff;border:2px solid #4caf50;border-radius:8px;padding:12px}.card.fail{border-color:#e53935}
.card img{width:100%;border-radius:4px}.badge{font-size:.8em;padding:2px 8px;border-radius:10px;background:#4caf50;color:#fff}
.fail .badge{background:#e53935}.tag{color:#888;font-size:.8em}button{margin-right:8px;padding:6px 14px}</style></head><body>
<h1>PawPantry — ผลทดสอบ ${tests.length} ข้อ: ผ่าน ${pass} · ล้ม ${tests.length - pass}</h1>
<p><button onclick="f('all')">ทั้งหมด</button><button onclick="f('pass')">ผ่าน</button><button onclick="f('fail')">ล้ม</button></p>
<div class="grid">${cards}</div>
<script>function f(s){document.querySelectorAll('.card').forEach(c=>c.style.display=(s==='all'||c.dataset.status===s)?'':'none')}</script>
</body></html>`);

console.log(`tests=${tests.length} pass=${pass} fail=${tests.length - pass}`);
const short = tests.filter((t) => t.gifSeconds < 5);
console.log('GIF < 5s:', short.map((t) => `${t.id}(${t.gifSeconds})`).join(', ') || 'none');
console.log('GIF range:', Math.min(...tests.map((t) => t.gifSeconds)).toFixed(1), '-', Math.max(...tests.map((t) => t.gifSeconds)).toFixed(1), 's');

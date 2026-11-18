// แปลงวิดีโอของแต่ละ test (อ่านจาก test-report/results.json) เป็น GIF ชื่อตาม ID
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const out = path.join(__dirname, 'test-report', 'gifs');
fs.mkdirSync(out, { recursive: true });
const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-report', 'results.json'), 'utf8'));

const specs = [];
(function walk(s) {
  (s.suites || []).forEach(walk);
  (s.specs || []).forEach((sp) => specs.push(sp));
})(report);

for (const sp of specs) {
  const id = sp.title.split(' ')[0];
  const result = sp.tests[0].results.at(-1);
  const video = result.attachments.find((a) => a.name === 'video')?.path;
  if (!video) { console.log(id, 'no video'); continue; }
  const gif = path.join(out, `${id}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vf',
    'fps=8,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    gif]);
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', gif]).toString().trim();
  console.log(`${id}\t${result.status}\t${Number(dur).toFixed(1)}s\t${(fs.statSync(gif).size / 1024).toFixed(0)} KB`);
}

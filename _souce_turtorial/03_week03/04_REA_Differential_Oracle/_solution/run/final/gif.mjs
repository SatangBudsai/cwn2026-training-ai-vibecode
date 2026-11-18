// GIF 2×2 ต่อเคส: ซ้ายบน v1 · ขวาบน v2 · ซ้ายล่าง v3 · ขวาล่าง v4 พร้อมป้ายผล differential
// node final/gif.mjs <diff-results.json ที่อัดวิดีโอทุกเวอร์ชัน> → final/gif/<S>-<key>.gif
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SCENARIOS } from '../diff/scenarios.mjs';
const res = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = path.resolve('final/gif'); fs.mkdirSync(OUT, { recursive: true });
const CASES = (process.argv[3] || 'S1,S2,S3,S4,S6,S8').split(',');
const V = ['v1', 'v2', 'v3', 'v4'];
const font = '/usr/share/fonts/truetype/tlwg/Garuda-Bold.ttf';
const tmp = fs.mkdtempSync('/tmp/gif-');
const icon = { 'ตรง': 'ตรงต้นฉบับ', 'ไม่ตรง': 'ไม่ตรง', 'ไม่มีฟีเจอร์': 'ไม่มีฟีเจอร์' };
for (const id of CASES) {
  const s = SCENARIOS.find((x) => x.id === id);
  const runs = V.map((v) => res.versions[v][id]);
  const dur = (Math.max(...runs.map((r) => r.ms)) / 1000 + 1).toFixed(1);
  const inputs = [], filters = [];
  runs.forEach((r, i) => {
    const t = path.join(tmp, `${id}-${i}.txt`);
    fs.writeFileSync(t, `${V[i]} · ${icon[r.verdict] ?? r.verdict}${r.count != null ? ` · ${r.count} ใบ` : ''}`);
    inputs.push('-i', r.video);
    filters.push(`[${i}:v]scale=560:-2,tpad=stop_mode=clone:stop_duration=90,drawtext=fontfile=${font}:textfile=${t}:x=8:y=h-th-10:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=6[v${i}]`);
  });
  const title = path.join(tmp, `${id}-title.txt`);
  fs.writeFileSync(title, `${s.id} ${s.title}`);
  const gif = path.join(OUT, `${s.id}-${s.key}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex',
    filters.join(';') + `;[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,pad=iw:ih+34:0:34:color=0x202124,` +
    `drawtext=fontfile=${font}:textfile=${title}:x=10:y=6:fontsize=22:fontcolor=white,fps=4,split[x][y];[x]palettegen=max_colors=128[p];[y][p]paletteuse=dither=bayer`,
    '-t', dur, '-loop', '0', gif]);
  console.log(gif, (fs.statSync(gif).size / 1e6).toFixed(1) + ' MB');
}

// รวมวิดีโอ v1 | v2 ของแต่ละฟีเจอร์เป็น GIF เคียงข้าง → ../evidence-gif/<ฟีเจอร์>.gif (กว้าง ≤1280px, ≤3 MB)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const OUT = path.resolve('../evidence-gif');
const MAX_BYTES = 3 * 1024 * 1024;
fs.mkdirSync(OUT, { recursive: true });

const r = JSON.parse(fs.readFileSync('evidence-run/results.json', 'utf8'));
const videos = {}; // title → { v1, v2 }
const walk = (s) => { (s.suites || []).forEach(walk); for (const sp of s.specs || []) for (const t of sp.tests) {
  const v = t.results.at(-1)?.attachments.find((a) => a.name === 'video');
  if (v) (videos[sp.title] ??= {})[t.projectName] = { path: v.path, status: t.results.at(-1).status };
}};
r.suites.forEach(walk);

const fileName = (title) => title.replace(/[\/\\:*?"<>|ⓘ]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
const made = [];
for (const [title, v] of Object.entries(videos).sort()) {
  if (!v.v1 || !v.v2) continue;
  const out = path.join(OUT, `${fileName(title)}.gif`);
  // ลองหลายระดับจนไฟล์ไม่เกิน 3 MB
  for (const [w, fps, colors] of [[1280, 6, 128], [1280, 5, 96], [1120, 5, 64], [960, 4, 64]]) {
    const half = w / 2;
    const filter =
      `[0:v]scale=${half}:-2:flags=lanczos,tpad=stop_mode=clone:stop_duration=20[a];` +
      `[1:v]scale=${half}:-2:flags=lanczos,tpad=stop_mode=clone:stop_duration=20[b];` +
      `[a][b]hstack=inputs=2,fps=${fps},trim=duration=DUR,split[s0][s1];` +
      `[s0]palettegen=max_colors=${colors}:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
    const dur = Math.max(probe(v.v1.path), probe(v.v2.path));
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', v.v1.path, '-i', v.v2.path,
      '-filter_complex', filter.replace('DUR', dur.toFixed(2)), '-loop', '0', out]);
    const size = fs.statSync(out).size;
    if (size <= MAX_BYTES) { made.push({ title, file: path.basename(out), size, w, fps, dur, v1: v.v1.status, v2: v.v2.status }); break; }
  }
}
function probe(p) {
  try { execFileSync(FFMPEG, ['-i', p], { stdio: 'pipe' }); } catch (e) {
    const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/);
    if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  }
  return 20;
}
fs.writeFileSync('evidence-run/gifs.json', JSON.stringify(made, null, 1));
console.table(made.map((m) => ({ ...m, size: (m.size / 1024 / 1024).toFixed(2) + ' MB' })));

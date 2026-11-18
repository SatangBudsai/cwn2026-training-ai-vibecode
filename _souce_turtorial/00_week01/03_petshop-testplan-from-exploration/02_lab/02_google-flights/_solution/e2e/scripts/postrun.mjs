#!/usr/bin/env node
/**
 * หลังรัน: อ่านผล JSON ของ Playwright → คัดลอกหลักฐาน (ภาพตอนตรวจ วิดีโอ) ไป test-report/evidence/<ID>/
 * → แปลงวิดีโอเป็น GIF ~5 วินาที (เฟรมตอนตรวจที่มีกรอบแดง ค้างภาพผลลัพธ์ตอนท้าย) ที่ test-report/gifs/<ID>.gif
 * → เขียนข้อมูลที่ normalize แล้วลง test-report/data-<run>.json
 *
 *   node scripts/postrun.mjs --results test-report/results.json --run main
 *   node scripts/postrun.mjs --results test-report/results-rerun.json --run rerun
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const resultsFile = path.resolve(ROOT, args.results || 'test-report/results.json');
const run = args.run || 'main';
const REPORT = path.join(ROOT, 'test-report');
const EVID = path.join(REPORT, 'evidence');
const GIFS = path.join(REPORT, 'gifs');
fs.mkdirSync(EVID, { recursive: true });
fs.mkdirSync(GIFS, { recursive: true });

const stripAnsi = (s = '') => s.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
const json = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

function* walkSuites(suite, file) {
  for (const s of suite.suites || []) yield* walkSuites(s, s.file || file);
  for (const spec of suite.specs || []) yield { spec, file: spec.file || file };
}

function stepTree(steps = []) {
  return steps
    .filter((s) => !/^(Before Hooks|After Hooks|fixture:|attach |Worker Cleanup)/.test(s.title) || (s.steps || []).some((c) => c.error))
    .map((s) => ({ title: s.title, ms: s.duration, error: s.error ? stripAnsi(s.error.message || '').split('\n').slice(0, 6).join('\n') : undefined, steps: stepTree(s.steps) }))
    .filter((s) => !s.title.startsWith('ตรวจ ') || true);
}

function ffprobeDuration(file) {
  try {
    return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
  } catch { return NaN; }
}

function makeGif(video, checks, outGif, tmpDir) {
  const dur = ffprobeDuration(video);
  if (!isFinite(dur) || dur <= 0) return false;
  fs.mkdirSync(tmpDir, { recursive: true });
  // เวลาเฟรม: ช่วงที่กรอบแดงแสดง (t + 0.7 วิ) ของแต่ละจุดตรวจ · ถ้าไม่มีจุดตรวจใช้เฟรมกระจายเท่ากัน
  let times = checks.filter((c) => c.status !== 'na').map((c) => Math.min(dur - 0.2, c.t / 1000 + 0.7));
  if (times.length === 0) times = [0.15, 0.35, 0.55, 0.75, 0.95].map((f) => f * dur);
  const MAXF = 6; // 6 เฟรม × ~0.6 วิ + ค้างท้าย 1.5 วิ ≈ 5 วิ
  if (times.length > MAXF) {
    const pick = [];
    for (let i = 0; i < MAXF; i++) pick.push(times[Math.round((i * (times.length - 1)) / (MAXF - 1))]);
    times = pick;
  }
  // เฟรมเปิดเรื่อง (ต้นวิดีโอหลังโหลด) ถ้ามีที่ว่าง
  if (times.length < MAXF && dur > 8) times.unshift(Math.min(6, dur * 0.1));
  const last = times[times.length - 1];
  const body = times.slice(0, -1);
  const per = body.length ? Math.max(0.45, Math.min(1.8, 3.5 / body.length)) : 0;
  const frames = [];
  [...body, last].forEach((t, i) => {
    const f = path.join(tmpDir, `f${i}.png`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', t.toFixed(2), '-i', video, '-frames:v', '1', '-vf', 'scale=800:-2:flags=lanczos', f]);
    if (fs.existsSync(f)) frames.push({ f, d: i < body.length ? per : 0.8 });
  });
  if (!frames.length) return false;
  const list = path.join(tmpDir, 'list.txt');
  const esc = (p) => p.replace(/\\/g, '/').replace(/'/g, "'\\''");
  fs.writeFileSync(list, frames.map((x) => `file '${esc(x.f)}'\nduration ${x.d.toFixed(2)}`).join('\n') + `\nfile '${esc(frames[frames.length - 1].f)}'\n`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', 'fps=10,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', outGif]);
  return fs.existsSync(outGif);
}

const out = [];
for (const top of json.suites || []) {
  for (const { spec, file } of walkSuites(top, top.file)) {
    for (const t of spec.tests || []) {
      const r = (t.results || [])[t.results.length - 1] || {};
      const id = (spec.title.match(/TC-[A-Z]+-\d+/) || [spec.title])[0];
      const ann = [...(t.annotations || []), ...(r.annotations || [])];
      const uniq = (arr) => arr.filter((a, i) => arr.findIndex((b) => b.type === a.type && b.description === a.description) === i);
      const annotations = uniq(ann);
      const checks = annotations.filter((a) => a.type === 'check').map((a) => { try { return JSON.parse(a.description); } catch { return null; } }).filter(Boolean);
      const dir = path.join(EVID, id);
      if (r.status) { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); }
      const shots = [];
      let video = null;
      const videos = [];
      for (const a of r.attachments || []) {
        if (!a.path || !fs.existsSync(a.path)) continue;
        if (a.contentType === 'video/webm') { videos.push(a.path); continue; }
        if (a.contentType === 'image/png' && (a.name.startsWith('ตรวจ') || a.name.includes('CAPTCHA') || a.name === 'screenshot')) {
          const num = (a.name.match(/^ตรวจ (\d+)/) || [])[1];
          const base = a.name === 'screenshot' ? `final-${shots.filter((s) => s.final).length}.png` : num ? `check-${num}.png` : `blocked-${shots.length}.png`;
          fs.copyFileSync(a.path, path.join(dir, base));
          shots.push({ name: a.name, file: `evidence/${id}/${base}`, final: a.name === 'screenshot' });
        }
      }
      if (videos.length) {
        // วิดีโอหลัก = ไฟล์ที่ยาวที่สุด (หน้าหลักของ test)
        videos.sort((a, b) => (ffprobeDuration(b) || 0) - (ffprobeDuration(a) || 0));
        video = videos[0];
        fs.copyFileSync(video, path.join(dir, 'video.webm'));
      }
      let gif = null;
      if (video) {
        try {
          const g = path.join(GIFS, `${id}.gif`);
          if (makeGif(video, checks, g, path.join(REPORT, '.tmp', id))) gif = `gifs/${id}.gif`;
        } catch (e) { console.error(`GIF ${id}:`, e.message); }
      }
      const errors = (r.errors || []).map((e) => stripAnsi(e.message || e.value || '').split('\n').slice(0, 12).join('\n'));
      out.push({
        id, title: spec.title, file: path.basename(file || ''), tags: t.tags?.length ? t.tags : spec.tags || [],
        status: r.status || 'notrun', duration: r.duration || 0, startTime: r.startTime, run,
        expected: annotations.filter((a) => a.type === 'คาดหวัง').map((a) => a.description),
        source: annotations.filter((a) => a.type === 'ที่มา').map((a) => a.description).join(' · '),
        budget: annotations.filter((a) => a.type === 'งบค้นหา').map((a) => a.description).join(' '),
        searches: annotations.filter((a) => a.type === 'การค้นหา').map((a) => a.description),
        bookings: annotations.filter((a) => a.type === 'หน้า booking').map((a) => a.description),
        na: annotations.filter((a) => a.type === 'N/A').map((a) => a.description),
        naAll: annotations.some((a) => a.type === 'na-all'),
        notRun: annotations.some((a) => a.type === 'not-run') || !r.status,
        blocked: annotations.filter((a) => a.type === 'blocked').map((a) => a.description),
        notes: annotations.filter((a) => !['คาดหวัง', 'ที่มา', 'งบค้นหา', 'การค้นหา', 'หน้า booking', 'N/A', 'na-all', 'not-run', 'check', 'blocked', 'skip'].includes(a.type)).map((a) => `${a.type}: ${a.description}`),
        checks, steps: stepTree(r.steps), errors, shots, video: video ? `evidence/${id}/video.webm` : null, gif,
      });
    }
  }
}
fs.rmSync(path.join(REPORT, '.tmp'), { recursive: true, force: true });
fs.writeFileSync(path.join(REPORT, `data-${run}.json`), JSON.stringify(out, null, 2), 'utf8');
console.log(`postrun(${run}): ${out.length} tests · gifs ${out.filter((x) => x.gif).length}`);

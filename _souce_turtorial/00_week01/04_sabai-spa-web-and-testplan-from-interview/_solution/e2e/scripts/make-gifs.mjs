#!/usr/bin/env node
/**
 * แปลงวิดีโอ chromium เป็น GIF 8–10 วินาที ที่ test-report/gifs/<ID>.gif
 *   node scripts/make-gifs.mjs            ทุกข้อ
 *   node scripts/make-gifs.mjs TC-A TC-B  เฉพาะข้อ
 *
 * test ยาวหลายนาทีถ้าเร่งทั้งคลิปจะอ่านไม่ทัน จึงตัดเฉพาะช่วงก่อนจุดตรวจสำคัญ (ข้อล้มมาก่อน)
 * เล่นความเร็วจริง ~6 วินาที แล้วค้างภาพจุดตรวจสุดท้ายที่มีกรอบแดง 3.5 วินาที
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPORT = path.join(ROOT, 'test-report');
const GIFS = path.join(REPORT, 'gifs');
const WIDTH = 800;
const FPS = 8;
const PLAY_SECONDS = 6;
const HOLD_SECONDS = 3.5;
const MAX_CLIPS = 3;

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
const probe = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim());

/** เลือกจุดตรวจที่จะเล่น: จุดล้มก่อน แล้วเติมจุดกระจายตามเวลา เรียงตามลำดับเกิด · จุดท้ายคือภาพผลลัพธ์ */
function pickChecks(checks) {
  if (!checks.length) return [];
  const failed = checks.filter((c) => !c.pass);
  const final = failed.length ? failed[failed.length - 1] : checks[checks.length - 1];
  const chosen = new Set([final]);
  for (const c of failed) { if (chosen.size < MAX_CLIPS) chosen.add(c); }
  const step = Math.max(1, Math.floor(checks.length / MAX_CLIPS));
  for (let i = 0; i < checks.length && chosen.size < MAX_CLIPS; i += step) chosen.add(checks[i]);
  const rest = [...chosen].filter((c) => c !== final).sort((a, b) => a.n - b.n);
  return [...rest, final];
}

function makeGif(id) {
  const evidenceFile = path.join(REPORT, 'evidence', 'chromium', `${id}.json`);
  if (!fs.existsSync(evidenceFile)) return { id, error: 'ไม่มีไฟล์หลักฐาน' };
  const ev = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
  const videos = ev.videos ?? {};
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `gif-${id}-`));
  const parts = [];
  const scale = `scale=${WIDTH}:-2:flags=lanczos,fps=${FPS}`;

  try {
    const chosen = pickChecks(ev.checks ?? []);
    const usable = chosen.filter((c) => videos[c.actor] && fs.existsSync(path.join(REPORT, videos[c.actor].file)));
    const clipLen = PLAY_SECONDS / Math.max(1, usable.length);
    usable.forEach((c, i) => {
      const src = path.join(REPORT, videos[c.actor].file);
      const dur = probe(src);
      const end = Math.min(c.t / 1000 + 0.4, dur);
      const start = Math.max(0, end - clipLen);
      const out = path.join(tmp, `p${i}.mp4`);
      ff(['-ss', start.toFixed(2), '-i', src, '-t', clipLen.toFixed(2), '-vf', `${scale},tpad=stop_mode=clone:stop_duration=${clipLen.toFixed(2)}`, '-t', clipLen.toFixed(2), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', out]);
      parts.push(out);
    });

    // วิดีโอไม่มีเลย (เช่น test ล้มก่อนเปิดหน้า) ใช้วิดีโอหลักทั้งคลิปแทน
    if (!parts.length && videos.main && fs.existsSync(path.join(REPORT, videos.main.file))) {
      const src = path.join(REPORT, videos.main.file);
      const dur = Math.max(0.5, probe(src));
      const out = path.join(tmp, 'p0.mp4');
      const start = Math.max(0, dur - PLAY_SECONDS);
      ff(['-ss', start.toFixed(2), '-i', src, '-vf', `${scale},tpad=stop_mode=clone:stop_duration=${PLAY_SECONDS}`, '-t', String(PLAY_SECONDS), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', out]);
      parts.push(out);
    }
    if (!parts.length) return { id, error: 'ไม่มีวิดีโอ' };

    // ภาพค้างท้าย: ภาพตอนตรวจที่มีกรอบแดง ถ้าไม่มีใช้เฟรมสุดท้ายของคลิปท้าย
    const final = chosen[chosen.length - 1];
    const shot = final ? path.join(REPORT, final.shot) : null;
    const holdOut = path.join(tmp, 'hold.mp4');
    if (shot && fs.existsSync(shot)) {
      ff(['-loop', '1', '-i', shot, '-t', String(HOLD_SECONDS), '-vf', `scale=${WIDTH}:450:force_original_aspect_ratio=decrease:flags=lanczos,pad=${WIDTH}:450:(ow-iw)/2:(oh-ih)/2:white,fps=${FPS}`, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', holdOut]);
    } else {
      ff(['-sseof', '-0.2', '-i', parts[parts.length - 1], '-frames:v', '1', path.join(tmp, 'last.png')]);
      ff(['-loop', '1', '-i', path.join(tmp, 'last.png'), '-t', String(HOLD_SECONDS), '-vf', `fps=${FPS}`, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', holdOut]);
    }

    // ต่อคลิปด้วย filter เพราะภาพจอมือถือหรือขนาดอื่นอาจต่างกัน
    const all = [...parts, holdOut];
    const inputs = all.flatMap((f) => ['-i', f]);
    const H = Math.round((WIDTH * 9) / 16 / 2) * 2;
    const norm = all.map((_, i) => `[${i}:v]scale=${WIDTH}:${H}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${H}:(ow-iw)/2:(oh-ih)/2:white,setsar=1,fps=${FPS}[v${i}]`).join(';');
    const concat = all.map((_, i) => `[v${i}]`).join('') + `concat=n=${all.length}:v=1:a=0[c]`;
    const palette = `[c]split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle[o]`;
    fs.mkdirSync(GIFS, { recursive: true });
    const gif = path.join(GIFS, `${id}.gif`);
    ff([...inputs, '-filter_complex', `${norm};${concat};${palette}`, '-map', '[o]', '-loop', '0', gif]);
    const duration = probe(gif);
    return { id, duration: Math.round(duration * 10) / 10, sizeKB: Math.round(fs.statSync(gif).size / 1024), holdSeconds: HOLD_SECONDS, clips: usable.length };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const dir = path.join(REPORT, 'evidence', 'chromium');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).map((f) => f.replace(/\.json$/, '')).filter((id) => /^TC-[A-Z]+-\d+$/.test(id));
const results = [];
for (const id of ids) {
  try {
    const r = makeGif(id);
    results.push(r);
    console.log(id, r.error ? `✗ ${r.error}` : `${r.duration} วิ ${r.sizeKB} KB`);
  } catch (e) {
    results.push({ id, error: String(e.stderr ?? e.message).slice(0, 300) });
    console.log(id, '✗', String(e.stderr ?? e.message).slice(0, 300));
  }
}
const bad = results.filter((r) => r.error || r.duration < 8 || r.duration > 10);
console.log(`สร้าง ${results.length - results.filter((r) => r.error).length}/${results.length} · นอกช่วง 8–10 วิ หรือผิดพลาด: ${bad.map((r) => r.id).join(', ') || 'ไม่มี'}`);

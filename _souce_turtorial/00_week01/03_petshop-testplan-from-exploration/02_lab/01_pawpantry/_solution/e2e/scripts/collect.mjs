// รวมผลจาก test-report/raw/*.json (รอบหลัก main-* แล้วตามด้วยรอบแก้ rerun* ตามเวลา — รอบหลังทับรอบก่อน)
// → test-report/data/results.json (ข้อมูลที่ build-report ใช้)
// → test-report/shots/<project>/<ID>/NN.png  (ภาพตอนตรวจที่มีกรอบแดง)
// → test-report/gifs/<ID>.gif                (จากวิดีโอ chromium)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const REP = path.join(ROOT, 'test-report');
const RAW = path.join(REP, 'raw');
const OUT = path.join(REP, 'data', 'results.json');
const onlyGifFor = process.argv.includes('--no-gif') ? null : true;

const strip = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '');
const idOf = (title) => (title.match(/^(TC-[A-Z0-9]+-\d{3})/) || [])[1];

const rawFiles = fs
  .readdirSync(RAW)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ f, t: fs.statSync(path.join(RAW, f)).mtimeMs, main: f.startsWith('main-') }))
  .sort((a, b) => (a.main !== b.main ? (a.main ? -1 : 1) : a.t - b.t));

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { tests: {} };
const entries = {}; // key project|ID
const gifQueue = [];

function walk(suite, fn) {
  (suite.specs || []).forEach(fn);
  (suite.suites || []).forEach((s) => walk(s, fn));
}
function mapSteps(steps = []) {
  return steps.map((s) => ({
    title: s.title,
    ms: s.duration,
    error: s.error ? strip(s.error.message || '').split('\n').slice(0, 6).join('\n') : undefined,
    steps: s.steps && s.steps.length ? mapSteps(s.steps) : undefined,
  }));
}

for (const { f } of rawFiles) {
  const run = f.replace(/\.json$/, '');
  const r = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
  (r.suites || []).forEach((top) =>
    walk(top, (spec) => {
      const id = idOf(spec.title);
      if (!id) return;
      for (const t of spec.tests) {
        const res = t.results[t.results.length - 1];
        if (!res) continue;
        const project = t.projectName;
        const key = `${project}|${id}`;
        const shotDir = path.join(REP, 'shots', project, id);
        fs.rmSync(shotDir, { recursive: true, force: true });
        const checks = [];
        const actuals = {};
        let other = [];
        for (const a of res.attachments || []) {
          const m = a.name.match(/^(check|actual)-(\d+): (.*)$/s);
          if (m && m[1] === 'check' && (a.body || (a.path && fs.existsSync(a.path)))) {
            fs.mkdirSync(shotDir, { recursive: true });
            const file = path.join(shotDir, `${m[2]}.png`);
            if (a.body) fs.writeFileSync(file, Buffer.from(a.body, 'base64'));
            else fs.copyFileSync(a.path, file);
            checks.push({ n: +m[2], label: m[3].trim(), shot: path.relative(ROOT, file).replace(/\\/g, '/') });
          } else if (m && m[1] === 'actual' && a.body) {
            actuals[+m[2]] = { label: m[3].trim(), text: Buffer.from(a.body, 'base64').toString('utf8') };
          } else if (a.name === 'screenshot' && a.path && fs.existsSync(a.path)) {
            fs.mkdirSync(shotDir, { recursive: true });
            const file = path.join(shotDir, `fail-${other.length}.png`);
            fs.copyFileSync(a.path, file);
            other.push({ kind: 'failure-screenshot', file: path.relative(ROOT, file).replace(/\\/g, '/') });
          } else if (a.name === 'video' && a.path && project === 'chromium') {
            gifQueue.push({ id, video: a.path });
          }
        }
        // รวม check กับ actual ตามเลขลำดับ
        const nums = new Set([...checks.map((c) => c.n), ...Object.keys(actuals).map(Number)]);
        const points = [...nums]
          .sort((a, b) => a - b)
          .map((n) => {
            const c = checks.find((x) => x.n === n);
            const a = actuals[n];
            const text = a?.text ?? '';
            return {
              n,
              label: c?.label ?? a?.label ?? '',
              shot: c?.shot,
              ok: text ? text.startsWith('PASS') : undefined,
              actual: text.replace(/^(PASS|FAIL)\n/, ''),
            };
          });
        const ann = {};
        for (const x of t.annotations || []) ann[x.type] = ann[x.type] ? ann[x.type] + '\n' + x.description : x.description;
        entries[key] = {
          id,
          project,
          title: spec.title,
          tags: spec.tags,
          file: spec.file,
          run,
          status: res.status, // passed | failed | timedOut | skipped | interrupted
          outcome: t.status, // expected | unexpected | skipped | flaky
          ms: res.duration,
          expected: ann.expected ?? '',
          source: ann.source ?? '',
          blocked: ann.blocked,
          errors: (res.errors || []).map((e) => strip(e.message || '').split('\n').slice(0, 14).join('\n')),
          steps: mapSteps(res.steps),
          points,
          other,
          startTime: res.startTime,
        };
      }
    }),
  );
}

// GIF ~5 วินาที: ส่วนเคลื่อนไหว ~4 วินาที (เร่ง/ชะลอให้พอดี) + ค้างภาพสุดท้าย 1.5 วินาที
function probe(file) {
  try {
    return parseFloat(
      execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }),
    );
  } catch {
    return NaN;
  }
}
if (onlyGifFor) {
  const gifDir = path.join(REP, 'gifs');
  fs.mkdirSync(gifDir, { recursive: true });
  const latest = {};
  for (const g of gifQueue) latest[g.id] = g; // รอบหลังสุดชนะ
  let made = 0;
  for (const { id, video } of Object.values(latest)) {
    if (!fs.existsSync(video)) continue;
    const out = path.join(gifDir, `${id}.gif`);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(video).mtimeMs) continue;
    let dur = probe(video);
    if (!isFinite(dur) || dur <= 0) dur = 4;
    const motion = 3.8;
    const factor = dur / motion; // >1 เร่ง, <1 ชะลอ
    const vf =
      `setpts=PTS/${factor.toFixed(4)},fps=8,scale=640:-1:flags=lanczos,` +
      `tpad=stop_mode=clone:stop_duration=1.5,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;
    try {
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-filter_complex', vf, '-t', '5.5', out]);
      made++;
    } catch (e) {
      console.error(`GIF ล้ม ${id}: ${String(e).slice(0, 200)}`);
    }
  }
  console.log(`GIF ใหม่ ${made} ไฟล์`);
}

// เก็บข้อมูลเดิมที่ไม่ได้อยู่ใน raw แล้ว (กันหาย) แล้วเขียนใหม่
const merged = { ...prev.tests, ...entries };
for (const e of Object.values(merged)) {
  e.gif = e.project === 'chromium' && fs.existsSync(path.join(REP, 'gifs', `${e.id}.gif`)) ? `test-report/gifs/${e.id}.gif` : undefined;
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), stamp: fs.existsSync(path.join(REP, 'stamp.txt')) ? fs.readFileSync(path.join(REP, 'stamp.txt'), 'utf8').trim() : '', tests: merged }, null, 1));
console.log(`รวมผล ${Object.keys(merged).length} รายการ (project×test) จาก ${rawFiles.length} ไฟล์`);

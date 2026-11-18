// differential test: ทำทุกสถานการณ์กับต้นฉบับแช่แข็งก่อน (ได้เฉลย) แล้วทำซ้ำกับโคลนแต่ละเวอร์ชันและเทียบผล
// node diff/run.mjs [v1,v2,v3] [S1,S2,...]   → diff/results/*.json · diff/gif/<S>-<key>.gif (ต้นฉบับ | v3) · DIFF-REPORT.md
// exit 0 = ทุกสถานการณ์ของทุกเวอร์ชันตรงกับต้นฉบับ, 1 = มีไม่ตรง, 2 = ตัวรันผิดพลาด (ต้นฉบับรันไม่ได้)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as o from './lib/original.mjs';
import * as c from './lib/clone.mjs';
import { SCENARIOS } from './scenarios.mjs';
import { writeReport } from './report.mjs';

const DIFF = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIFF, '..');
export const VERSIONS = { v1: 'http://localhost:5081', v2: 'http://localhost:5082', v3: 'http://localhost:5083' };
const GIF_VERSION = 'v3';
const versions = (process.argv[2] || Object.keys(VERSIONS).join(',')).split(',');
const only = process.argv[3]?.split(',');
const scenarios = SCENARIOS.filter((s) => !only || only.includes(s.id));
const dir = (...p) => { const d = path.join(DIFF, ...p); fs.mkdirSync(d, { recursive: true }); return d; };
const HOLD = 1500; // ค้างภาพสุดท้ายก่อนปิด ให้ GIF เห็นผล

async function record(launchFn, body, videoName) {
  const vdir = videoName ? dir('video', 'tmp', videoName) : undefined;
  const t0 = Date.now();
  const s = await launchFn(vdir);
  const errors = [];
  s.page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  let data, error, unsupported = false;
  try { data = await body(s.page); } catch (e) {
    error = String(e.message || e).split('\n')[0];
    unsupported = e instanceof c.Unsupported;
  }
  await s.page.waitForTimeout(HOLD).catch(() => {});
  const vid = s.page.video();
  await s.context.close();
  await s.browser.close();
  const ms = Date.now() - t0;
  let video;
  if (vid) {
    video = path.join(dir('video'), `${videoName}.webm`);
    fs.renameSync(await vid.path(), video);
    fs.rmSync(vdir, { recursive: true, force: true });
  }
  return { data, error, unsupported, ms, video, pageErrors: errors.slice(0, 3), stats: s.stats ? { gsr: s.stats.gsr, gsrMiss: s.stats.gsrMiss.length } : undefined };
}

function sideBySide(left, right, out, labels) {
  const w = 640, font = '/usr/share/fonts/truetype/tlwg/Garuda-Bold.ttf';
  const tf = labels.map((t, i) => { const f = path.join(dir('video', 'tmp'), `label${i}.txt`); fs.writeFileSync(f, t); return f; });
  const dt = (f) => `drawtext=fontfile=${font}:textfile=${f}:x=10:y=h-th-12:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=8`;
  const dur = (Math.max(left.ms, right.ms) / 1000 + 0.5).toFixed(1);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', left.video, '-i', right.video, '-filter_complex',
    `[0:v]scale=${w}:-2,tpad=stop_mode=clone:stop_duration=60,${dt(tf[0])}[a];` +
    `[1:v]scale=${w}:-2,tpad=stop_mode=clone:stop_duration=60,${dt(tf[1])}[b];` +
    `[a][b]hstack=inputs=2,pad=iw+6:ih:3:0:color=gray,fps=5,split[x][y];[x]palettegen=max_colors=128[p];[y][p]paletteuse=dither=bayer`,
    '-t', dur, '-loop', '0', out]);
}

const results = { ranAt: new Date().toISOString(), original: {}, versions: {} };
// 1) ต้นฉบับ: เฉลยของทุกสถานการณ์ (รันใหม่ทุกครั้ง ไม่ใช้ค่าที่เก็บไว้)
for (const s of scenarios) {
  const r = await record((v) => o.launch({ video: v }), s.orig, `orig-${s.id}`);
  results.original[s.id] = r;
  console.log(`ต้นฉบับ ${s.id} ${s.title}: ${r.error ? 'ERROR ' + r.error : s.summary(r.data)} (${r.ms} ms)`);
}
const broken = scenarios.filter((s) => results.original[s.id].error);
if (broken.length) console.error('ต้นฉบับรันไม่ผ่าน:', broken.map((s) => s.id).join(', '));

// 2) โคลน: สถานการณ์เดียวกัน เทียบกับเฉลย
for (const v of versions) {
  results.versions[v] = {};
  for (const s of scenarios) {
    const O = results.original[s.id].data;
    if (!O) { results.versions[v][s.id] = { verdict: 'ข้าม', detail: 'ต้นฉบับรันไม่ผ่าน' }; continue; }
    const r = await record((vd) => c.launch(VERSIONS[v], { video: v === GIF_VERSION ? vd : undefined }), (page) => s.clone(page, O), `${v}-${s.id}`);
    let verdict, detail;
    if (r.unsupported) { verdict = 'ไม่มีฟีเจอร์'; detail = r.error; }
    else if (r.error) { verdict = 'ไม่ตรง'; detail = `ทำสถานการณ์ไม่สำเร็จ: ${r.error}`; }
    else { const cmp = s.compare(O, r.data); verdict = cmp.ok ? 'ตรง' : 'ไม่ตรง'; detail = cmp.detail; if (r.data.note) detail += ` · หมายเหตุ: ${r.data.note}`; }
    results.versions[v][s.id] = { verdict, detail, ms: r.ms, shown: r.data?.shown ?? null, count: r.data?.rows?.length ?? null, video: r.video, data: r.data, pageErrors: r.pageErrors };
    console.log(`${v} ${s.id}: ${verdict} — ${detail}`);
    // 3) GIF เคียงข้าง: ซ้ายต้นฉบับ | ขวาโคลน v3
    if (v === GIF_VERSION && r.video && results.original[s.id].video) {
      const gif = path.join(dir('gif'), `${s.id}-${s.key}.gif`);
      sideBySide(results.original[s.id], r, gif, [`ต้นฉบับ (แช่แข็ง) · ${s.id} ${s.title}`, `โคลน ${v} · ${verdict}`]);
      results.versions[v][s.id].gif = path.relative(ROOT, gif);
    }
  }
}
fs.rmSync(path.join(DIFF, 'video', 'tmp'), { recursive: true, force: true });
fs.writeFileSync(path.join(dir('results'), 'diff-results.json'), JSON.stringify(results, null, 2));
writeReport(results, scenarios, path.join(ROOT, 'DIFF-REPORT.md'));
const allOk = versions.every((v) => scenarios.every((s) => results.versions[v][s.id].verdict === 'ตรง'));
process.exit(broken.length ? 2 : allOk ? 0 : 1);

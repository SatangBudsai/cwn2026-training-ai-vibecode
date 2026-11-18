// ตัวรัน differential สำหรับ v4 (และเวอร์ชันใดก็ได้) — ใช้สถานการณ์/ตัวขับ/ตัวเทียบของ diff/ ตามเดิมทุกตัว ไม่แก้ test
// ต่างจาก diff/run.mjs แค่: รับ URL ได้ และเขียนผลไปที่ <out>/ แทน DIFF-REPORT.md/diff/gif ของ LAB เดิม
// node final/diff-run.mjs <name>=<url>[,<name>=<url>] <outdir> [S1,S2,...] [--gif <name>] [--orig-cache file]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as o from '../diff/lib/original.mjs';
import * as c from '../diff/lib/clone.mjs';
import { SCENARIOS } from '../diff/scenarios.mjs';

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const gifFor = flag('--gif'); // ชื่อเวอร์ชันที่จะอัดวิดีโอ คั่นด้วย , หรือ all
const recordable = (n) => !!gifFor && (gifFor === 'all' || gifFor.split(',').includes(n));
const [spec, outArg, onlyArg] = args;
const targets = spec.split(',').map((x) => x.split('='));
const OUT = path.resolve(outArg);
const only = onlyArg?.split(',');
const scenarios = SCENARIOS.filter((s) => !only || only.includes(s.id));
const dir = (...p) => { const d = path.join(OUT, ...p); fs.mkdirSync(d, { recursive: true }); return d; };

async function record(launchFn, body, videoName) {
  const vdir = videoName ? dir('video', 'tmp', videoName) : undefined;
  const t0 = Date.now();
  const s = await launchFn(vdir);
  let data, error, unsupported = false;
  try { data = await body(s.page); } catch (e) { error = String(e.message || e).split('\n')[0]; unsupported = e instanceof c.Unsupported; }
  await s.page.waitForTimeout(1500).catch(() => {});
  const vid = s.page.video();
  await s.context.close(); await s.browser.close();
  let video;
  if (vid) { video = path.join(dir('video'), `${videoName}.webm`); fs.renameSync(await vid.path(), video); fs.rmSync(vdir, { recursive: true, force: true }); }
  return { data, error, unsupported, ms: Date.now() - t0, video };
}

const results = { ranAt: new Date().toISOString(), original: {}, versions: {} };
for (const s of scenarios) {
  const r = await record((v) => o.launch({ video: gifFor ? v : undefined }), s.orig, `orig-${s.id}`);
  results.original[s.id] = r;
  console.log(`ต้นฉบับ ${s.id}: ${r.error ? 'ERROR ' + r.error : s.summary(r.data)}`);
}
for (const [name, url] of targets) {
  results.versions[name] = {};
  for (const s of scenarios) {
    const O = results.original[s.id].data;
    if (!O) { results.versions[name][s.id] = { verdict: 'ข้าม', detail: 'ต้นฉบับรันไม่ผ่าน' }; continue; }
    const r = await record((vd) => c.launch(url, { video: recordable(name) ? vd : undefined }), (page) => s.clone(page, O), `${name}-${s.id}`);
    let verdict, detail;
    if (r.unsupported) { verdict = 'ไม่มีฟีเจอร์'; detail = r.error; }
    else if (r.error) { verdict = 'ไม่ตรง'; detail = `ทำสถานการณ์ไม่สำเร็จ: ${r.error}`; }
    else { const cmp = s.compare(O, r.data); verdict = cmp.ok ? 'ตรง' : 'ไม่ตรง'; detail = cmp.detail; }
    results.versions[name][s.id] = { verdict, detail, ms: r.ms, count: r.data?.rows?.length ?? null, video: r.video };
    console.log(`${name} ${s.id}: ${verdict} — ${String(detail).slice(0, 400)}`);
  }
  const ok = scenarios.filter((s) => results.versions[name][s.id].verdict === 'ตรง').length;
  console.log(`== ${name}: ${ok}/${scenarios.length}`);
}
fs.rmSync(path.join(OUT, 'video', 'tmp'), { recursive: true, force: true });
fs.writeFileSync(path.join(dir(), 'diff-results.json'), JSON.stringify(results, null, 2));

#!/usr/bin/env node
// สร้าง test-report/agents.html จาก test-report/agents.log ทุก 1 วินาที (หน้าเว็บรีเฟรชตัวเองทุก 2 วินาที)
// ใช้: node agents-dashboard.mjs [--max 8] [--once]   หยุดเองเมื่อมีไฟล์ test-report/agents.done
// รูปแบบ log (agent-log.sh เขียนให้): "2026-11-02T17:33:03 START A01 หน้าแรก" / "... END A01 หน้าแรก"
// ภาพนี้เปิดจากไฟล์ตรง ๆ จึง fetch log เองไม่ได้ — สคริปต์นี้เลย render ข้อมูลฝังลง HTML ใหม่ทุกวินาที
import fs from 'node:fs';
import { arg, esc } from './_lib.mjs';

const LOG = 'test-report/agents.log', OUT = 'test-report/agents.html', DONE = 'test-report/agents.done';
const MAX = Number(arg('--max', 8));
fs.mkdirSync('test-report', { recursive: true });

function stats(lines) {
  const agents = new Map();
  for (const l of lines) {
    const [ts, ev, id, ...mod] = l.trim().split(/\s+/);
    if (!id) continue;
    const t = new Date(ts).getTime();
    if (!agents.has(id)) agents.set(id, { id, mod: mod.join(' '), start: null, end: null });
    const a = agents.get(id);
    if (ev === 'START') { a.start = t; a.mod = mod.join(' '); } else if (ev === 'END') a.end = t;
  }
  const list = [...agents.values()].filter(a => a.start).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  const evs = list.flatMap(a => [[a.start, 1], [a.end ?? Infinity, -1]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let cur = 0, peak = 0;
  for (const [, d] of evs) { cur += d; peak = Math.max(peak, cur); }
  return { list, peak, running: list.filter(a => !a.end).length };
}

function render() {
  const lines = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean) : [];
  const { list, peak, running } = stats(lines);
  const now = Date.now();
  const t0 = list.length ? Math.min(...list.map(a => a.start)) : now;
  const t1 = Math.max(now, ...list.map(a => a.end ?? now));
  const span = Math.max(t1 - t0, 1000);
  const hm = t => new Date(t).toTimeString().slice(0, 8);
  const finished = fs.existsSync(DONE);
  const rows = list.map(a => {
    const left = ((a.start - t0) / span) * 100, w = (((a.end ?? now) - a.start) / span) * 100;
    const dur = Math.round(((a.end ?? now) - a.start) / 1000);
    return `<div class="row"><div class="lbl"><b>${esc(a.id)}</b> ${esc(a.mod)}</div><div class="track"><div class="bar ${a.end ? 'done' : 'run'}" style="left:${left}%;width:${Math.max(w, 0.8)}%"></div></div><div class="tm">${hm(a.start)} → ${a.end ? hm(a.end) : 'กำลังทำ…'} · ${dur}s</div></div>`;
  }).join('\n');
  fs.writeFileSync(OUT, `<!doctype html><html lang="th"><head><meta charset="utf-8">${finished ? '' : '<meta http-equiv="refresh" content="2">'}
<title>Agents Monitor</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#fffaf5;--fg:#2b2118;--mut:#8a7a6a;--run:#f08a24;--done:#2f9e5b;--track:#f1e6da}
@media (prefers-color-scheme:dark){:root{--bg:#1d1814;--fg:#f4ebe1;--mut:#a89786;--track:#3a3029}}
body{margin:0;padding:24px 16px;font-family:system-ui,"Segoe UI",Tahoma,sans-serif;background:var(--bg);color:var(--fg)}
.big{font-size:64px;font-weight:800;line-height:1}.big span{color:var(--run)}
.sub{color:var(--mut);margin:8px 0 20px}
.row{display:grid;grid-template-columns:200px 1fr 210px;gap:10px;align-items:center;margin:6px 0}
.track{position:relative;height:18px;background:var(--track);border-radius:9px;overflow:hidden}
.bar{position:absolute;top:0;bottom:0;border-radius:9px}.run{background:var(--run)}.done{background:var(--done)}
.tm{font-variant-numeric:tabular-nums;color:var(--mut);font-size:13px}
@media (max-width:640px){.row{grid-template-columns:1fr}.big{font-size:44px}}
</style></head><body>
<div class="big">กำลังทำงาน <span>${running}</span> / ${MAX}</div>
<div class="sub">พร้อมกันสูงสุด ${peak} ตัว · ใช้ทั้งหมด ${list.length} ตัว · อัปเดต ${hm(now)}${finished ? ' · ✅ เสร็จครบแล้ว' : ''}</div>
${rows || '<p>ยังไม่มี agent เริ่มงาน</p>'}
</body></html>`);
  fs.writeFileSync('test-report/agents-stats.json', JSON.stringify({ peak, total: list.length, max: MAX, agents: list }, null, 2));
  return { finished, peak, total: list.length };
}

if (process.argv.includes('--once')) {
  const r = render();
  console.log(`พร้อมกันสูงสุด ${r.peak} ตัว · ใช้ทั้งหมด ${r.total} ตัว`);
} else {
  const h = setInterval(() => {
    const r = render();
    if (r.finished) { clearInterval(h); console.log(`จบ: พร้อมกันสูงสุด ${r.peak} ตัว · ใช้ทั้งหมด ${r.total} ตัว`); }
  }, 1000);
}

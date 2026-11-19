// วาดกราฟ README ใหม่ทั้งชุดจากไฟล์ผลจริง (ไม่มีตัวเลขพิมพ์เอง)
//   ../plan/blocks.json          → dag.png, gantt-plan.png
//   ../rerun/timing/*.json       → gantt-actual.png, compare.png
//   ./test-report/results.json   → tests.png
//   ../bughunt-docker/Bxx.log    → bughunt.png
// ใช้: node make-charts.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'img');
const FONT = (f) => 'file:///' + path.join(ROOT, 'app/public/static/fonts', f).replace(/\\/g, '/');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));

const C = { ink: '#262626', muted: '#595959', faint: '#8C8C8C', line: '#E8E8E8', soft: '#F7F9FA', blue: '#0070D5', blueTint: '#DEEAFD', orange: '#BE4E04', green: '#1E8E4E', red: '#D6403A', amber: '#C98A00' };
const SKILL = {
  backend: { c: '#0070D5', t: '#DEEAFD', l: 'Backend' },
  frontend: { c: '#1E8E4E', t: '#DDF3E6', l: 'Frontend' },
  playwright: { c: '#C98A00', t: '#FBEFD2', l: 'Playwright' },
  integrate: { c: '#BE4E04', t: '#FBE3D3', l: 'รวม / BUG_MODE' },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

const page = (body, w) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;font-weight:400;src:url(${FONT('plex-thai-thai-400.woff2')});unicode-range:U+0E01-0E5B}
@font-face{font-family:P;font-weight:600;src:url(${FONT('plex-thai-thai-600.woff2')});unicode-range:U+0E01-0E5B}
@font-face{font-family:P;font-weight:400;src:url(${FONT('plex-thai-latin-400.woff2')})}
@font-face{font-family:P;font-weight:600;src:url(${FONT('plex-thai-latin-600.woff2')})}
*{box-sizing:border-box}body{margin:0;background:#fff;font-family:P,sans-serif;color:${C.ink};letter-spacing:-.01em}
.wrap{width:${w}px;padding:36px 40px 32px}
.eyebrow{color:${C.orange};font-size:13px;font-weight:600;margin:0 0 4px}
h1{font-size:28px;font-weight:600;letter-spacing:-.03em;margin:0 0 6px}
.sub{color:${C.muted};font-size:14px;margin:0 0 24px}
.legend{display:flex;gap:20px;flex-wrap:wrap;font-size:13px;color:${C.muted};margin:0 0 18px}
.legend i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:6px;vertical-align:-1px}
.note{color:${C.muted};font-size:12.5px;margin-top:18px;line-height:1.6}
.kpis{display:flex;gap:14px;margin-bottom:22px}
.kpi{flex:1;background:${C.soft};border-radius:16px;padding:16px 18px}
.kpi b{display:block;font-size:34px;font-weight:600;letter-spacing:-.03em;line-height:1.1}
.kpi span{font-size:13px;color:${C.muted}}
svg text{font-family:P,sans-serif}
</style></head><body><div class="wrap">${body}</div></body></html>`;

const legend = (items) => `<div class="legend">${items.map(([c, l]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join('')}</div>`;

// ---------------------------------------------------------------- data
const plan = readJson(path.join(ROOT, 'plan/blocks.json'));
const blocks = plan.blocks;
const byId = Object.fromEntries(blocks.map((b) => [b.id, b]));
const timingDir = path.join(ROOT, 'rerun/timing');
const timing = {};
for (const f of fs.readdirSync(timingDir).filter((f) => f.endsWith('.json'))) { const t = readJson(path.join(timingDir, f)); timing[t.block] = t; }
const t0 = Math.min(...Object.values(timing).map((t) => t.startMs));
const actual = Object.fromEntries(Object.values(timing).map((t) => [t.block, { s: (t.startMs - t0) / 60000, e: (t.endMs - t0) / 60000 }]));

// critical path by planned duration
const dur = (b) => b.endMin - b.startMin;
const memo = {};
const longest = (id) => {
  if (memo[id]) return memo[id];
  const b = byId[id];
  let best = { len: 0, path: [] };
  for (const n of b.needs) { const r = longest(n); if (r.len > best.len) best = r; }
  return (memo[id] = { len: best.len + dur(b), path: [...best.path, id] });
};
const crit = blocks.map((b) => longest(b.id)).sort((a, b) => b.len - a.len)[0];
const critSet = new Set(crit.path);
const critEdges = new Set(crit.path.slice(1).map((id, i) => `${crit.path[i]}>${id}`));

// ---------------------------------------------------------------- DAG
function dagSvg() {
  const depth = {};
  const d = (id) => (depth[id] ??= byId[id].needs.length ? 1 + Math.max(...byId[id].needs.map(d)) : 0);
  blocks.forEach((b) => d(b.id));
  const lanes = ['backend', 'frontend', 'playwright', 'integrate'];
  const NW = 230, NH = 64, GX = 64, GY = 22, LANE_PAD = 26, X0 = 150;
  // rows inside lane: stack nodes with same depth
  const slots = {};
  const pos = {};
  const laneRows = {};
  for (const lane of lanes) {
    const ls = blocks.filter((b) => b.skill === lane);
    let rows = 0;
    for (const b of ls) { const k = depth[b.id]; slots[lane + k] = (slots[lane + k] ?? -1) + 1; pos[b.id] = { col: k, row: slots[lane + k] }; rows = Math.max(rows, slots[lane + k] + 1); }
    laneRows[lane] = Math.max(rows, 1);
  }
  // integrate lane sits on the same rows as backend top for a cleaner flow
  let y = 10; const laneY = {};
  for (const lane of lanes) { laneY[lane] = y; y += LANE_PAD * 2 + laneRows[lane] * (NH + GY) - GY; y += 14; }
  const H = y; const maxCol = Math.max(...Object.values(depth));
  const W = X0 + (maxCol + 1) * (NW + GX);
  const xy = (id) => { const p = pos[id]; const lane = byId[id].skill; return { x: X0 + p.col * (NW + GX), y: laneY[lane] + LANE_PAD + p.row * (NH + GY) }; };
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs>
  <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1L9 5L0 9z" fill="#B5BBC2"/></marker>
  <marker id="ac" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1L9 5L0 9z" fill="${C.orange}"/></marker></defs>`;
  for (const lane of lanes) {
    const h = LANE_PAD * 2 + laneRows[lane] * (NH + GY) - GY;
    s += `<rect x="0" y="${laneY[lane]}" width="${W}" height="${h}" rx="18" fill="${C.soft}"/>`;
    s += `<rect x="16" y="${laneY[lane] + h / 2 - 14}" width="6" height="28" rx="3" fill="${SKILL[lane].c}"/>`;
    s += `<text x="32" y="${laneY[lane] + h / 2 + 5}" font-size="14" font-weight="600" fill="${C.ink}">${esc(SKILL[lane].l)}</text>`;
  }
  for (const b of blocks) for (const n of b.needs) {
    const a = xy(n), z = xy(b.id);
    const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = z.x - 4, y2 = z.y + NH / 2, mx = (x1 + x2) / 2;
    const c = critEdges.has(`${n}>${b.id}`);
    s += `<path d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" fill="none" stroke="${c ? C.orange : '#C4CAD0'}" stroke-width="${c ? 2.6 : 1.6}" marker-end="url(#${c ? 'ac' : 'a'})" ${c ? '' : 'stroke-dasharray="0"'}/>`;
  }
  for (const b of blocks) {
    const { x, y } = xy(b.id); const k = SKILL[b.skill]; const c = critSet.has(b.id);
    const full = b.name.split(/[:+(]/)[0].trim(); const name = full.length > 17 ? full.slice(0, 16) + '…' : full;
    s += `<rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="14" fill="#fff" stroke="${c ? C.orange : '#DADFE4'}" stroke-width="${c ? 2 : 1}"/>`;
    s += `<rect x="${x + 12}" y="${y + 14}" width="44" height="22" rx="7" fill="${k.t}"/><text x="${x + 34}" y="${y + 30}" text-anchor="middle" font-size="12.5" font-weight="600" fill="${k.c}">${b.id}</text>`;
    s += `<text x="${x + 64}" y="${y + 30}" font-size="13" font-weight="600" fill="${C.ink}">${esc(name)}</text>`;
    s += `<text x="${x + 12}" y="${y + 52}" font-size="11.5" fill="${C.muted}">${esc(b.account)} · ${dur(b)} นาที · ${esc(b.difficulty || '')}${b.skill === 'integrate' ? ' · 🔒' : ''}</text>`;
  }
  return { svg: s + '</svg>', W, H };
}

// ---------------------------------------------------------------- Gantt
function ganttSvg(rows, max, colorOf) {
  const accs = [...new Set(rows.map((r) => r.acc))].sort();
  const LW = 90, W = 1120, RH = 62, top = 30, sx = (W - LW - 20) / max;
  const H = top + accs.length * RH + 10;
  let s = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  const step = max > 60 ? 10 : 5;
  for (let m = 0; m <= max; m += step) {
    const x = LW + m * sx;
    s += `<line x1="${x}" y1="${top - 6}" x2="${x}" y2="${H - 6}" stroke="${C.line}"/><text x="${x}" y="${top - 12}" font-size="11" fill="${C.faint}" text-anchor="middle">${m}</text>`;
  }
  accs.forEach((a, i) => {
    const y = top + i * RH;
    s += `<rect x="0" y="${y + 4}" width="${W}" height="${RH - 8}" rx="10" fill="${i % 2 ? '#fff' : C.soft}"/>`;
    s += `<text x="14" y="${y + RH / 2 + 5}" font-size="13" font-weight="600">${esc(a)}</text>`;
    for (const r of rows.filter((r) => r.acc === a)) {
      const x = LW + r.s * sx, w = Math.max((r.e - r.s) * sx, 4); const k = colorOf(r);
      s += `<rect x="${x}" y="${y + 17}" width="${w}" height="${RH - 34}" rx="7" fill="${k}" stroke="#fff" stroke-width="1.5"/>`;
      if (w > 40) s += `<text x="${x + 8}" y="${y + RH / 2 + 4.5}" font-size="12" font-weight="600" fill="#fff">${r.id}</text>`;
      else { r._n = (rows.filter((q) => q.acc === a && (q.e - q.s) * sx <= 40 && q.s < r.s).length); const up = r._n % 2 === 0; s += `<text x="${x + w / 2}" y="${up ? y + 13 : y + RH - 3}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${C.muted}">${r.id}</text>`; }
    }
  });
  return s + '</svg>';
}

// ---------------------------------------------------------------- compare
function compareSvg() {
  const ids = blocks.filter((b) => actual[b.id]).map((b) => b.id);
  const max = Math.max(...ids.flatMap((id) => [dur(byId[id]), actual[id].e - actual[id].s]));
  const LW = 230, W = 1120, RH = 44, sx = (W - LW - 120) / max;
  let s = `<svg width="${W}" height="${ids.length * RH + 10}" xmlns="http://www.w3.org/2000/svg">`;
  ids.forEach((id, i) => {
    const y = i * RH; const p = dur(byId[id]); const a = actual[id].e - actual[id].s; const pct = Math.round(((a - p) / p) * 100);
    const k = SKILL[byId[id].skill];
    s += `<text x="0" y="${y + 18}" font-size="13" font-weight="600">${id}</text><text x="40" y="${y + 18}" font-size="12" fill="${C.muted}">${esc(byId[id].name.split(/[:+(]/)[0].trim().slice(0, 22))}</text>`;
    s += `<rect x="${LW}" y="${y + 4}" width="${p * sx}" height="13" rx="6.5" fill="#D9DEE3"/><text x="${LW + p * sx + 6}" y="${y + 15}" font-size="11.5" fill="${C.muted}">แผน ${p}</text>`;
    s += `<rect x="${LW}" y="${y + 20}" width="${Math.max(a * sx, 3)}" height="13" rx="6.5" fill="${k.c}"/><text x="${LW + a * sx + 6}" y="${y + 31}" font-size="11.5" font-weight="600" fill="${pct > 0 ? C.red : C.green}">จริง ${a.toFixed(1)} (${pct > 0 ? '+' : ''}${pct}%)</text>`;
  });
  return s + '</svg>';
}

// ---------------------------------------------------------------- tests
function testData() {
  const r = readJson(path.join(__dirname, 'test-report/results.json'));
  const files = {};
  const walk = (su, file) => {
    const f = su.file || file;
    for (const sp of su.specs || []) for (const t of sp.tests) {
      const last = t.results[t.results.length - 1] || {};
      let st = last.status === 'passed' ? (t.results.length > 1 ? 'flaky' : 'passed') : last.status === 'skipped' ? 'skipped' : 'failed';
      (files[f] ??= { passed: 0, failed: 0, flaky: 0, skipped: 0, fails: [] })[st]++;
      if (st === 'failed') files[f].fails.push(sp.title.split(' ')[0]);
    }
    (su.suites || []).forEach((x) => walk(x, f));
  };
  r.suites.forEach((s) => walk(s));
  return { files, stats: r.stats };
}
function testsSvg(files) {
  const names = Object.keys(files).sort();
  const W = 1120, LW = 150, RH = 34, max = Math.max(...names.map((n) => Object.values(files[n]).filter(Number.isFinite).reduce((a, b) => a + b, 0)));
  const sx = (W - LW - 60) / max;
  let s = `<svg width="${W}" height="${names.length * RH}" xmlns="http://www.w3.org/2000/svg">`;
  names.forEach((n, i) => {
    const y = i * RH; let x = LW; const f = files[n];
    s += `<text x="0" y="${y + 21}" font-size="13" font-weight="600">${esc(n.replace(/\.spec\.js$/, ''))}</text>`;
    for (const [k, col] of [['passed', C.green], ['flaky', C.amber], ['failed', C.red], ['skipped', '#B5BBC2']]) {
      if (!f[k]) continue; const w = f[k] * sx;
      s += `<rect x="${x}" y="${y + 6}" width="${w - 3}" height="22" rx="7" fill="${col}"/>`;
      if (w > 22) s += `<text x="${x + w / 2 - 1.5}" y="${y + 21.5}" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">${f[k]}</text>`;
      x += w;
    }
    if (f.fails.length) s += `<text x="${x + 8}" y="${y + 21}" font-size="11.5" fill="${C.red}">${esc(f.fails.join(' '))}</text>`;
  });
  return s + '</svg>';
}

// ---------------------------------------------------------------- bug hunt
const EXPECT = {
  B01: ['TC-FEE-01'], B02: ['TC-UPLOAD-01'], B03: ['TC-SLA-01', 'TC-SLA-02'], B04: ['TC-SLA-02'], B05: ['TC-PAY-01'], B06: ['TC-RBAC-01'],
  B07: ['TC-RBAC-02'], B08: ['TC-QUEUE-02'], B09: ['TC-PDPA-02'], B10: ['TC-DASH-02'], B11: ['TC-PDPA-03', 'TC-AUDIT-01'], B12: ['TC-WORKFLOW-04'],
};
function bugData() {
  const dir = path.join(ROOT, 'bughunt-docker');
  const out = [];
  for (const b of Object.keys(EXPECT)) {
    const f = path.join(dir, b + '.log'); if (!fs.existsSync(f)) continue;
    const log = fs.readFileSync(f, 'utf8');
    const failed = [...new Set([...log.matchAll(/^\s+\d+\) .*? › (TC-[A-Z0-9-]+)/gm)].map((m) => m[1]))];
    const passed = +(log.match(/(\d+) passed/) || [0, 0])[1];
    const nFailed = +(log.match(/(\d+) failed/) || [0, 0])[1];
    out.push({ b, failed, nFailed, passed, caught: EXPECT[b].every((t) => failed.includes(t)), extra: failed.filter((t) => !EXPECT[b].includes(t)) });
  }
  return out;
}
function bugSvg(rows) {
  const W = 1120, RH = 46, LW = 70; const max = Math.max(...rows.map((r) => r.nFailed), 1); const sx = 200 / max;
  let s = `<svg width="${W}" height="${rows.length * RH + 30}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<text x="0" y="16" font-size="12" fill="${C.faint}">บั๊ก</text><text x="${LW}" y="16" font-size="12" fill="${C.faint}">TC ที่ต้องล้ม</text><text x="460" y="16" font-size="12" fill="${C.faint}">จำนวน TC ที่ล้ม</text><text x="820" y="16" font-size="12" fill="${C.faint}">TC อื่นที่ล้มด้วย</text>`;
  rows.forEach((r, i) => {
    const y = 28 + i * RH;
    s += `<rect x="0" y="${y}" width="${W}" height="${RH - 6}" rx="12" fill="${i % 2 ? '#fff' : C.soft}"/>`;
    s += `<text x="14" y="${y + 25}" font-size="14" font-weight="600">${r.b}</text>`;
    let x = LW;
    for (const t of EXPECT[r.b]) {
      const ok = r.failed.includes(t); const w = t.length * 7.4 + 30;
      s += `<rect x="${x}" y="${y + 9}" width="${w}" height="22" rx="7" fill="${ok ? '#DDF3E6' : '#FBE0DF'}"/><text x="${x + 10}" y="${y + 24.5}" font-size="12" font-weight="600" fill="${ok ? C.green : C.red}">${ok ? '✓' : '✗'} ${t}</text>`;
      x += w + 6;
    }
    const n = r.nFailed;
    s += `<rect x="460" y="${y + 11}" width="${Math.max(n * sx, 4)}" height="18" rx="6" fill="${r.caught ? C.blue : C.red}"/><text x="${460 + n * sx + 8}" y="${y + 25}" font-size="12.5" font-weight="600">${n} ล้ม · ${r.passed} ผ่าน</text>`;
    s += `<text x="820" y="${y + 25}" font-size="11.5" fill="${C.muted}">${esc(r.extra.join(' ') || '–')}</text>`;
  });
  return s + '</svg>';
}

// ---------------------------------------------------------------- render
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const shot = async (file, html, w) => {
    const p = await browser.newPage({ viewport: { width: w, height: 400 }, deviceScaleFactor: 2 });
    await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    await p.locator('.wrap').screenshot({ path: path.join(OUT, file) }); await p.close();
    console.log('wrote', file);
  };
  const skillLegend = legend(Object.values(SKILL).map((k) => [k.c, k.l]).concat([[C.orange, 'สายวิกฤต (เส้นส้ม)']]));

  const dag = dagSvg();
  await shot('dag.png', page(`<p class="eyebrow">LAB 2 · แผนงาน ${esc(plan.plan)}</p><h1>DAG ${blocks.length} บล็อก · agent สูงสุด ${plan.maxAgents}</h1>
    <p class="sub">ลูกศรคือ "ต้องรอ" · สายวิกฤต ${crit.path.join(' → ')} รวม ${crit.len} นาทีตามแผน</p>${skillLegend}${dag.svg}`, dag.W + 80), dag.W + 80);

  const planRows = blocks.map((b) => ({ id: b.id, acc: b.account, s: b.startMin, e: b.endMin, skill: b.skill }));
  const planMax = Math.ceil(Math.max(...planRows.map((r) => r.e)) / 5) * 5;
  await shot('gantt-plan.png', page(`<p class="eyebrow">LAB 2 · Gantt แผน</p><h1>แผน ${Math.max(...planRows.map((r) => r.e))} นาที · ${new Set(planRows.map((r) => r.acc)).size} บัญชี</h1>
    <p class="sub">แกนนอน = นาทีจากเริ่มแผน · ที่มา plan/blocks.json</p>${legend(Object.values(SKILL).map((k) => [k.c, k.l]))}${ganttSvg(planRows, planMax, (r) => SKILL[r.skill].c)}`, 1200), 1200);

  const actRows = Object.entries(actual).map(([id, t]) => ({ id, acc: byId[id].account, s: t.s, e: t.e, skill: byId[id].skill }));
  const actEnd = Math.max(...actRows.map((r) => r.e));
  await shot('gantt-actual.png', page(`<p class="eyebrow">LAB 3 · Gantt จริง</p><h1>ใช้จริง ${actEnd.toFixed(1)} นาที (${actRows.length} บล็อกที่จับเวลา)</h1>
    <p class="sub">เวลาจาก timestamp เริ่ม/จบที่เอเจนต์บันทึก · ที่มา rerun/timing/*.json · T01–T03 ใช้ชุด Playwright เดิม จึงไม่มีเวลา</p>${legend(Object.values(SKILL).map((k) => [k.c, k.l]))}${ganttSvg(actRows, Math.ceil(actEnd / 10) * 10, (r) => SKILL[r.skill].c)}`, 1200), 1200);

  await shot('compare.png', page(`<p class="eyebrow">LAB 3 · แผน vs จริง</p><h1>เวลาต่อบล็อก (นาที)</h1>
    <p class="sub">แท่งเทา = แผน · แท่งสี = จริง · ตัวเลขแดง = ช้ากว่าแผน เขียว = เร็วกว่าแผน</p>${compareSvg()}`, 1200), 1200);

  if (fs.existsSync(path.join(__dirname, 'test-report/results.json'))) {
    const { files, stats } = testData();
    const tot = Object.values(files).reduce((a, f) => ({ p: a.p + f.passed, f: a.f + f.failed, k: a.k + f.flaky, s: a.s + f.skipped }), { p: 0, f: 0, k: 0, s: 0 });
    await shot('tests.png', page(`<p class="eyebrow">LAB 4 · Playwright ชุดเต็ม (${esc(new Date(stats.startTime).toISOString().slice(0, 16).replace('T', ' '))} UTC)</p><h1>ผลรัน ${tot.p + tot.f + tot.k + tot.s} test</h1>
      <div class="kpis"><div class="kpi"><b style="color:${C.green}">${tot.p}</b><span>ผ่าน</span></div><div class="kpi"><b style="color:${C.amber}">${tot.k}</b><span>ผ่านรอบสอง (flaky)</span></div><div class="kpi"><b style="color:${C.red}">${tot.f}</b><span>ล้ม</span></div><div class="kpi"><b style="color:${C.faint}">${tot.s}</b><span>ข้าม</span></div><div class="kpi"><b>${(stats.duration / 60000).toFixed(1)}</b><span>นาที</span></div></div>
      ${legend([[C.green, 'ผ่าน'], [C.amber, 'flaky'], [C.red, 'ล้ม'], ['#B5BBC2', 'ข้าม']])}${testsSvg(files)}`, 1200), 1200);
  }

  const bugs = bugData();
  if (bugs.length) {
    const caught = bugs.filter((r) => r.caught).length;
    await shot('bughunt.png', page(`<p class="eyebrow">LAB 5 · BUG_MODE ใน Docker</p><h1>จับได้ ${caught} จาก ${bugs.length} บั๊ก</h1>
      <p class="sub">แต่ละแถว = เปิดบั๊ก 1 ตัว แล้วรัน Playwright ชุดเต็ม 1 รอบ (retries 0) · ที่มา bughunt-docker/Bxx.log</p>${bugSvg(bugs)}`, 1200), 1200);
  }
  await browser.close();
})();

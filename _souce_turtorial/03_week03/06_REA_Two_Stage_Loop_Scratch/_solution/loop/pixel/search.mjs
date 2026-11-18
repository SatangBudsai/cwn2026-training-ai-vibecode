// node loop/pixel/search.mjs <BASE_URL> <spec.json> <out.json> [maxSeconds]
// coordinate descent บน token: ลอง x ± step ไปทางที่ visual diff ลด · ไม่ดีขึ้นทั้งสองทาง → step ครึ่ง → ตัวแปรถัดไป
// ทุกชุดที่ดีขึ้นต้องผ่านตัวกันทุกข้อก่อนเก็บ (ไม่ผ่าน = ทิ้งทันที) · บันทึกจำนวนชุดที่ลอง/ที่ตัวกันทิ้งแยกตามตัวกัน
import fs from 'node:fs';
import { session } from './lib.mjs';
const [base, specFile, outFile, maxS = '600'] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const t0 = Date.now();
const S = await session(base);
const stats = { tried: 0, improved: 0, rejected: { structure: 0, legibility: 0, exploit: 0 }, rejectedSets: 0, examples: [] };
const fmt = (v, kind) => kind === 'num' ? String(+v.toFixed(2)) : kind === 'color' ? v : `${+v.toFixed(2)}px`;
const hslHex = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l); const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))); return '#' + [f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join(''); };
const hexHsl = hex => { let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, s * 100, l * 100]; };
let cur = { ...(spec.start || {}) };
await S.apply(cur);
let best = (await S.visual()).pixels;
const g0 = await S.guards();
console.error('เริ่ม', best, 'ตัวกัน', g0.ok ? 'ผ่าน' : g0.fails.slice(0, 3));
async function trial(cand, label) {
  stats.tried++;
  await S.apply(cand);
  const v = await S.visual();
  if (v.pixels >= best) return false;
  const g = await S.guards();
  if (!g.ok) {
    stats.rejectedSets++;
    for (const k of new Set(g.fails.map(f => f.guard))) stats.rejected[k]++;
    if (stats.examples.length < 40) stats.examples.push({ change: label, pixels: v.pixels, fails: g.fails.slice(0, 3) });
    return false;
  }
  best = v.pixels; cur = cand; stats.improved++;
  console.error(`  ✓ ${label} → ${best}`);
  return true;
}
const resolved = await S.page.evaluate(names => Object.fromEntries(names.map(n => [n, getComputedStyle(document.documentElement).getPropertyValue(n).trim()])), spec.vars.map(v => v.name));
outer: for (let pass = 0; pass < (spec.passes || 1); pass++) for (const v of spec.vars) {
  if ((Date.now() - t0) / 1000 > +maxS) { console.error('หมดเวลา'); break outer; }
  if (v.kind === 'choice') {
    for (const c of v.choices) { if ((cur[v.name] ?? null) === c) continue; await trial({ ...cur, [v.name]: c }, `${v.name}: ${c}`); }
    continue;
  }
  if (v.kind === 'color') {
    let [h, s, l] = hexHsl((cur[v.name] || resolved[v.name]).replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3'));
    let step = v.step || 6;
    while (step >= (v.minStep || 1.5)) {
      let moved = false;
      for (const dir of [1, -1]) {
        const nl = Math.max(0, Math.min(100, l + dir * step));
        if (await trial({ ...cur, [v.name]: hslHex(h, s, nl) }, `${v.name}: ${hslHex(h, s, nl)}`)) { l = nl; moved = true; break; }
      }
      if (!moved) step /= 2;
    }
    continue;
  }
  let x = parseFloat(cur[v.name] ?? resolved[v.name]);
  if (!Number.isFinite(x)) { console.error('ข้าม', v.name, resolved[v.name]); continue; }
  let step = v.step, minStep = v.minStep ?? (v.kind === 'num' ? 100 : 1);
  while (step >= minStep) {
    let moved = false;
    for (const dir of [1, -1]) {
      const nx = x + dir * step;
      if (v.min != null && nx < v.min) continue;
      if (v.max != null && nx > v.max) continue;
      if (await trial({ ...cur, [v.name]: fmt(nx, v.kind) }, `${v.name}: ${fmt(x, v.kind)} → ${fmt(nx, v.kind)}`)) { x = nx; moved = true; break; }
    }
    if (!moved) step /= 2;
  }
}
await S.apply(cur);
const fin = await S.visual(), gf = await S.guards();
await S.close();
const res = { best: fin, values: cur, guards: { ok: gf.ok, fails: gf.fails, info: gf.info }, stats, seconds: Math.round((Date.now() - t0) / 1000) };
fs.writeFileSync(outFile, JSON.stringify(res, null, 2));
console.log(JSON.stringify({ best: fin, ok: gf.ok, stats: { ...stats, examples: stats.examples.length }, seconds: res.seconds }));

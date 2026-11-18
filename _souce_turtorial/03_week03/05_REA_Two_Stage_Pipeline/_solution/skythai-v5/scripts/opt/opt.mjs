// step 3+4: coordinate descent over style variables with hard constraints
// node --import /workspace/arena/kit/lib/hooks.mjs opt.mjs <base> <vars.json> <outdir> <budgetSec> [base.css]
// vars.json: [{ sel, prop, step, min, max, unit } | { sel, prop: 'font-family', choices: [...] }]
import fs from 'node:fs';
import path from 'node:path';
import { openApp, setCss, shot, aria, GUARD_FN } from './lib.mjs';
const [BASE, VARS, OUT, BUDGET, BASECSS] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const v4 = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'v4-sizes.json')));
const vars = JSON.parse(fs.readFileSync(VARS, 'utf8'));
const baseCss = BASECSS ? fs.readFileSync(BASECSS, 'utf8') : '';
const { browser, page } = await openApp(BASE);
const snap0 = await aria(page); // structure lock: snapshot at the start of stage 2
const log = fs.createWriteStream(path.join(OUT, 'trials.jsonl'));
const deadline = Date.now() + Number(BUDGET) * 1000;

// starting values from computed style of the first match
for (const v of vars) {
  if (v.choices) { v.val = null; continue; }
  if (v.val !== undefined) continue;
  v.val = await page.evaluate(({ sel, prop }) => {
    const el = document.querySelector(sel.replace(/::(before|after)$/, '')); if (!el) return null;
    const pseudo = (sel.match(/::(before|after)$/) || [])[0] || null;
    const c = getComputedStyle(el, pseudo).getPropertyValue(prop);
    if (prop === 'letter-spacing' && c === 'normal') return 0;
    const n = parseFloat(c); return Number.isFinite(n) ? n : null;
  }, v);
  if (v.val === null) v.skip = true;
}
const cssOf = (vs) => baseCss + '\n' + vs.filter((v) => !v.skip && v.val !== null && v.val !== undefined && (v.choices ? true : v.touched))
  .map((v) => `${v.sel} { ${v.prop}: ${v.choices ? v.val : (Math.round(v.val * 100) / 100) + (v.unit ?? 'px')} !important; }`).join('\n');

async function evalCss(css) { await setCss(page, css); return (await shot(page)).pixels; }
async function hard() {
  const a = await aria(page);
  if (a !== snap0) return { ok: false, why: 'ariaSnapshot changed' };
  const g = await page.evaluate(`${GUARD_FN}(${JSON.stringify(v4)})`);
  if (!g.ok) { const k = ['fontSize', 'contrast', 'opacity', 'size', 'midword'].find((k) => g[k].length); return { ok: false, why: `${k}: ${g[k][0]}` }; }
  return { ok: true };
}
let best = await evalCss(cssOf(vars));
const start = best; let n = 0;
console.log(`start ${best}`);
const tryVal = async (v, val) => {
  const old = v.val, oldT = v.touched; v.val = val; v.touched = true; n++;
  const px = await evalCss(cssOf(vars));
  const rec = { n, sel: v.sel, prop: v.prop, from: old, to: val, px, best };
  if (px < best) {
    const h = await hard();
    rec.guard = h.ok ? 'ok' : h.why;
    if (h.ok) { best = px; rec.kept = true; log.write(JSON.stringify(rec) + '\n'); return true; }
  }
  log.write(JSON.stringify(rec) + '\n');
  v.val = old; v.touched = oldT; return false;
};
for (let pass = 0; Date.now() < deadline && pass < 4; pass++) {
  let improved = false;
  for (const v of vars) {
    if (v.skip || Date.now() > deadline) continue;
    if (v.choices) { for (const c of v.choices) if (c !== v.val && Date.now() < deadline) improved = (await tryVal(v, c)) || improved; continue; }
    let step = v.step;
    while (step >= (v.minStep ?? v.step / 4) && Date.now() < deadline) {
      let moved = false;
      for (const dir of [1, -1]) {
        let nv = v.val + dir * step;
        if (nv < (v.min ?? -1e9) || nv > (v.max ?? 1e9)) continue;
        if (await tryVal(v, nv)) { moved = true; improved = true; // keep going the same way
          while (Date.now() < deadline) { nv = v.val + dir * step; if (nv < (v.min ?? -1e9) || nv > (v.max ?? 1e9) || !(await tryVal(v, nv))) break; }
          break; }
      }
      if (!moved) step /= 2;
    }
  }
  console.log(`pass ${pass}: ${best} px (${n} trials)`);
  if (!improved) break;
}
await setCss(page, cssOf(vars));
const fin = await shot(page); const h = await hard();
fs.writeFileSync(path.join(OUT, 'best.css'), cssOf(vars));
fs.writeFileSync(path.join(OUT, 'vars.json'), JSON.stringify(vars, null, 1));
console.log(JSON.stringify({ start, best, final: fin.pixels, pct: +fin.pct.toFixed(3), trials: n, guard: h }));
await browser.close();

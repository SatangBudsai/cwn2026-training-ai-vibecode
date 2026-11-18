// step 1+2+4: fast meter check vs kit, v4 sizes, legibility guard of the current app, red regions → elements
// node --import /workspace/arena/kit/lib/hooks.mjs probe.mjs <base> <outdir> [css-file]
import fs from 'node:fs';
import path from 'node:path';
import pngjs from 'pngjs';
import { openApp, setCss, shot, aria, regions, GUARD_FN, SIZES_FN } from './lib.mjs';
const [BASE, OUT, CSSF] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const V4F = path.join(path.dirname(new URL(import.meta.url).pathname), 'v4-sizes.json');
if (!fs.existsSync(V4F)) {
  const v4 = await openApp('http://localhost:5084');
  fs.writeFileSync(V4F, JSON.stringify(await v4.page.evaluate(SIZES_FN)));
  await v4.browser.close();
}
const v4 = JSON.parse(fs.readFileSync(V4F));
const { browser, page } = await openApp(BASE);
const snap = await aria(page);
fs.writeFileSync(path.join(OUT, 'aria.yml'), snap);
if (CSSF) await setCss(page, fs.readFileSync(CSSF, 'utf8'));
const t0 = Date.now(); const m = await shot(page); const ms = Date.now() - t0;
fs.writeFileSync(path.join(OUT, 'diff.png'), pngjs.PNG.sync.write(m.diff));
const g = await page.evaluate(`${GUARD_FN}(${JSON.stringify(v4)})`);
const { comps, bands } = regions(m.diff);
// match each component to the smallest visible element whose box covers the component centre
const top = comps.slice(0, 40);
const els = await page.evaluate((boxes) => boxes.map((b) => {
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const stack = document.elementsFromPoint(cx, cy);
  const el = stack.find((e) => { const r = e.getBoundingClientRect(); return r.width * r.height >= (b.x1 - b.x0) * (b.y1 - b.y0) * 0.3; }) || stack[0];
  if (!el) return '';
  const path = []; for (let e = el; e && e !== document.body && path.length < 4; e = e.parentElement) path.unshift(e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''));
  return path.join(' > ') + ' "' + (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"';
}), top);
const res = { pixels: m.pixels, pct: +m.pct.toFixed(4), shotMs: ms, ariaLen: snap.length, guard: g, bands, regions: top.map((c, i) => ({ ...c, el: els[i] })) };
fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify(res, null, 2));
console.log(JSON.stringify({ pixels: m.pixels, pct: res.pct, shotMs: ms, guardOk: g.ok, guardCounts: Object.fromEntries(Object.entries(g).filter(([k, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])) }));
await browser.close();

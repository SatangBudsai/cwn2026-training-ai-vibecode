// constrained pixel optimizer — shared pieces
// fast meter: same steps as kit/lib/visual.mjs (openResults → fonts.ready → 1000 ms → screenshot 1366×900 →
// pixelmatch threshold 0.1 includeAA false vs reference.png) but the page stays open and candidates are
// applied by replacing the text of one <style id="opt-candidate"> element.
// run with: node --import /workspace/arena/kit/lib/hooks.mjs <script>
import fs from 'node:fs';
import pngjs from 'pngjs';
import pixelmatch from 'pixelmatch';
import { launch, newPage, openResults } from '/workspace/arena/kit/lib/common.mjs';
const { PNG } = pngjs;
export const REF = PNG.sync.read(fs.readFileSync('/workspace/arena/kit/src/visual/reference.png'));
export const W = REF.width, H = REF.height;

export async function openApp(base) {
  const browser = await launch();
  const { context, page } = await newPage(browser, base, { viewport: { width: W, height: H } });
  await page.goto(base);
  await openResults(page);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1000);
  return { browser, context, page };
}

export function diffOf(buf) {
  const actual = PNG.sync.read(buf);
  const diff = new PNG({ width: W, height: H });
  const pixels = pixelmatch(REF.data, actual.data, diff.data, W, H, { threshold: 0.1, includeAA: false });
  return { pixels, pct: (pixels / (W * H)) * 100, diff };
}

export async function setCss(page, css) {
  await page.evaluate((css) => {
    let s = document.getElementById('opt-candidate');
    if (!s) { s = document.createElement('style'); s.id = 'opt-candidate'; document.head.appendChild(s); }
    s.textContent = css;
  }, css);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250); // .switch::after has a .15s transition
}

export async function shot(page) { return diffOf(await page.screenshot()); }
export const aria = (page) => page.locator('body').ariaSnapshot();

// red regions: 75 px bands × 8-connected components (after a 3 px dilation so glyphs of one word join)
export function regions(diff) {
  const red = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { const d = diff.data; if (d[i * 4] === 255 && d[i * 4 + 1] === 0 && d[i * 4 + 2] === 0) red[i] = 1; }
  const R = 3, dil = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (red[y * W + x])
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W) dil[yy * W + xx] = 1; }
  const lab = new Int32Array(W * H), comps = [];
  for (let s = 0; s < W * H; s++) {
    if (!dil[s] || lab[s]) continue;
    const c = { id: comps.length + 1, x0: W, y0: H, x1: 0, y1: 0, red: 0 }; comps.push(c);
    const st = [s]; lab[s] = c.id;
    while (st.length) {
      const p = st.pop(), x = p % W, y = (p - x) / W;
      if (red[p]) c.red++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const q = yy * W + xx; if (dil[q] && !lab[q]) { lab[q] = c.id; st.push(q); }
      }
    }
  }
  const bands = [];
  for (let y0 = 0; y0 < H; y0 += 75) { let n = 0; for (let y = y0; y < Math.min(H, y0 + 75); y++) for (let x = 0; x < W; x++) n += red[y * W + x]; bands.push({ y0, red: n }); }
  return { comps: comps.filter((c) => c.red > 0).sort((a, b) => b.red - a.red), bands };
}

// legibility guard, evaluated in the page. v4 = map key → {w,h} measured on v4 (port 5084)
export const GUARD_FN = `(${function guard(v4) {
  const out = { fontSize: [], contrast: [], opacity: [], size: [], midword: [], checkedText: 0, checkedSize: 0 };
  const parse = (c) => { const k = c.match(/color\(srgb ([^)]+)\)/); if (k) { const p = k[1].split(/[ /]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; } const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  // background stack: walk up; gradients contribute each colour stop (worst case is taken)
  const bgs = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const img = cs.backgroundImage;
      if (img && img !== 'none' && img.includes('gradient')) { const stops = (img.match(/rgba?\([^)]+\)/g) || []).map(parse); layers.push({ stops }); if (stops.every((s) => s.a === 1)) break; }
      const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push({ stops: [c] }); if (c.a === 1) break; }
    }
    let cands = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (let i = layers.length - 1; i >= 0; i--) { const nc = []; for (const s of layers[i].stops) for (const b of cands) nc.push(blend(s, b)); cands = nc.slice(0, 16); }
    return cands;
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = (el) => { const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30); return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${t}"`; };
  const checkText = (el, cs, pseudo) => {
    out.checkedText++;
    const fs = parseFloat(cs.fontSize); if (fs < 12) out.fontSize.push(`${name(el)}${pseudo || ''} ${fs}px`);
    let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
    if (pseudo) op *= parseFloat(cs.opacity);
    if (op < 1) out.opacity.push(`${name(el)}${pseudo || ''} opacity ${op.toFixed(2)}`);
    const fg = parse(cs.color); const worst = Math.min(...bgs(el).map((b) => ratio(blend(fg, b), b)));
    if (worst < 4.5) out.contrast.push(`${name(el)}${pseudo || ''} ${worst.toFixed(2)}:1 (${cs.color})`);
  };
  const seg = new Intl.Segmenter('th', { granularity: 'word' });
  const all = [...document.body.querySelectorAll('*')].filter((el) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'svg', 'path'].includes(el.tagName) && visible(el));
  for (const el of all) {
    const cs = getComputedStyle(el);
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (own.length || (['INPUT', 'SELECT'].includes(el.tagName))) checkText(el, cs);
    for (const p of ['::before', '::after']) { const pc = getComputedStyle(el, p); const c = pc.content; if (c && c !== 'none' && c !== 'normal' && c !== '""' && pc.display !== 'none') { const txt = c.startsWith('attr(') ? el.getAttribute(c.slice(5, -1)) : c.replace(/^"|"$/g, ''); if (txt && txt.trim()) checkText(el, pc, p); } }
    // mid-word line breaks (Intl.Segmenter('th') word boundaries)
    for (const n of own) {
      const t = n.textContent; if (t.length < 2) continue;
      const bounds = new Set([0, t.length]); for (const s of seg.segment(t)) bounds.add(s.index);
      const r = document.createRange(); let lastTop = null;
      for (let i = 0; i < t.length; i++) {
        if (/\s/.test(t[i])) { lastTop = null; continue; }
        r.setStart(n, i); r.setEnd(n, i + 1); const rc = r.getClientRects(); if (!rc.length) continue;
        const top = Math.round(rc[0].top);
        if (lastTop !== null && Math.abs(top - lastTop) > 3 && !bounds.has(i)) out.midword.push(`${name(el)} breaks before "${t.slice(Math.max(0, i - 4), i)}|${t.slice(i, i + 4)}"`);
        lastTop = top;
      }
    }
    // ≥75% of the v4 size for elements that also exist in v4 (key = tag.class + text)
    const k = name(el); const ref = v4[k];
    if (ref) { out.checkedSize++; const r = el.getBoundingClientRect(); if (r.width < 0.75 * ref.w - 0.5 || r.height < 0.75 * ref.h - 0.5) out.size.push(`${k} ${r.width.toFixed(0)}×${r.height.toFixed(0)} < 75% of v4 ${ref.w.toFixed(0)}×${ref.h.toFixed(0)}`); }
  }
  out.ok = !out.fontSize.length && !out.contrast.length && !out.opacity.length && !out.size.length && !out.midword.length;
  return out;
}})`;

export const SIZES_FN = `(() => { const m = {}; const name = (el) => { const t = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30); return el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + ' "' + t + '"'; };
  for (const el of document.body.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; const k = name(el); if (m[k] === undefined) m[k] = { w: r.width, h: r.height }; else m[k] = null; }
  for (const k in m) if (!m[k]) delete m[k]; return m; })()`;

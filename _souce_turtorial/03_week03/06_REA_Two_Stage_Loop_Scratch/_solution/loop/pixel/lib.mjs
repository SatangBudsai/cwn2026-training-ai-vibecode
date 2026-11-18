// loop/pixel/lib.mjs — ตัววัดเร็ว + ตัวกัน + แบ่งบริเวณ diff ของขั้นที่ 2
// เปิดหน้าผลค้นหาครั้งเดียวแบบเดียวกับ kit/capture.mjs (rulers/lib.mjs open + standardRoute · 1366×900 · scroll บนสุด · fonts.ready + 1 วิ)
// แล้วลองชุดค่าใหม่ด้วยการแทน token ใน :root (documentElement.style.setProperty) → screenshot → pixelmatch 0.1 includeAA false กับ reference.png
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { open, standardRoute } from '../../rulers/lib.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/ms-playwright';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const REF = PNG.sync.read(fs.readFileSync(`${ROOT}/rulers/visual/reference.png`));
const LOCK = JSON.parse(fs.readFileSync(`${ROOT}/loop/structure.lock`, 'utf8'));
const SIZE = JSON.parse(fs.readFileSync(`${ROOT}/loop/size-baseline.json`, 'utf8'));
const VBASE = JSON.parse(fs.readFileSync(`${ROOT}/loop/visual-baseline.json`, 'utf8'));
const W = 1366, H = 900;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const normalize = y => y.replace(/^(\s*- alert)(?::.*)?$/m, '$1');

// ---------- tokens.css ----------
export function readTokens(file) {
  const css = fs.readFileSync(file, 'utf8');
  const out = {};
  for (const m of css.matchAll(/^\s*(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/gm)) out[m[1]] = m[2].trim();
  return out;
}
export function writeTokens(file, values) {
  let css = fs.readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(values)) {
    const re = new RegExp(`^(\\s*${k.replace(/[-]/g, '\\-')}\\s*:\\s*)([^;]+)(;)`, 'm');
    if (!re.test(css)) throw new Error(`ไม่พบตัวแปร ${k}`);
    css = css.replace(re, `$1${v}$3`);
  }
  fs.writeFileSync(file, css);
}

// ---------- session ----------
export async function session(base) {
  const { browser, page } = await open();
  await standardRoute(page, base, 1);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1000);
  const S = {
    browser, page, current: {},
    async apply(values) {   // values = {--x: '16px'} · ค่าที่ไม่ใส่ = กลับเป็นค่าใน tokens.css
      await page.evaluate(v => {
        const s = document.documentElement.style;
        for (const p of [...s]) if (p.startsWith('--')) s.removeProperty(p);
        for (const [k, x] of Object.entries(v)) s.setProperty(k, x);
      }, values);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.evaluate(() => window.scrollTo(0, 0));
      S.current = { ...values };
    },
    async shot(file) {
      const buf = await page.screenshot();
      if (file) fs.writeFileSync(file, buf);
      return buf;
    },
    async visual(diffFile) {
      const A = PNG.sync.read(await S.shot());
      const d = diffFile ? new PNG({ width: W, height: H }) : null;
      const pixels = pixelmatch(REF.data, A.data, d?.data ?? null, W, H, { threshold: 0.1, includeAA: false });
      if (diffFile) fs.writeFileSync(diffFile, PNG.sync.write(d));
      return { pixels, pct: +(100 * pixels / (W * H)).toFixed(4) };
    },
    async ariaHash() { return sha(normalize(await page.locator('body').ariaSnapshot()) + '\n'); },
    guards: () => guards(S),
    close: () => browser.close(),
  };
  return S;
}

// ---------- ตัวกัน ----------
// คืน { ok, fails: [{guard, why}] } · guard ∈ structure | legibility | exploit
export async function guards(S) {
  const fails = [];
  const h = await S.ariaHash();
  if (h !== LOCK.sha256) fails.push({ guard: 'structure', why: `aria sha256 ${h.slice(0, 12)} ≠ lock ${LOCK.sha256.slice(0, 12)}` });
  const r = await S.page.evaluate(({ sizeBase, vbase }) => {
    const F = [];
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
    const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const blend = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
    const bgOf = el => {   // พื้นหลังจริง: ไล่ขึ้นไปจนเจอพื้นทึบ (ผสมพื้นโปร่งที่เจอระหว่างทาง)
      const layers = [];
      for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (const c of layers.reverse()) bg = blend(c, bg);
      return bg;
    };
    const visible = el => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
    const opacityChain = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };

    // b. อ่านไม่ออก: ขนาดตัวอักษร · contrast (รวม ::before/::after) · opacity · ตัดกลางคำ
    const seg = new Intl.Segmenter('th', { granularity: 'word' });
    let checked = 0;
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('svg')) continue;
      if (!visible(el)) continue;
      const items = [];
      const t = ownText(el);
      if (t) items.push({ pseudo: '', text: t, cs: getComputedStyle(el) });
      for (const p of ['::before', '::after']) {
        const cs = getComputedStyle(el, p);
        const c = cs.content;
        if (c && c !== 'none' && c !== 'normal' && c.replace(/["']/g, '').trim()) items.push({ pseudo: p, text: c, cs });
      }
      if (!items.length) continue;
      const bg = bgOf(el);
      for (const { pseudo, text, cs } of items) {
        checked++;
        const id = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}${pseudo} "${text.slice(0, 30)}"`;
        const fs = parseFloat(cs.fontSize);
        if (fs < 12) F.push({ guard: 'legibility', why: `ตัวอักษร ${fs}px < 12 · ${id}` });
        const fg = parse(cs.color);
        if (fg) {
          if (fg.a < 1) F.push({ guard: 'legibility', why: `สีข้อความโปร่ง a=${fg.a} · ${id}` });
          const cr = ratio(blend(fg, bg), bg);
          if (cr < 4.5) F.push({ guard: 'legibility', why: `contrast ${cr.toFixed(2)} < 4.5 · ${id}` });
        }
        const op = opacityChain(el) * (pseudo ? +cs.opacity : 1);
        if (op < 1) F.push({ guard: 'legibility', why: `opacity ${op} · ${id}` });
      }
      // ตัดบรรทัดกลางคำ: คำเดียวที่มี client rect มากกว่า 1 บรรทัด
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        for (const s of seg.segment(n.textContent)) {
          if (!s.isWordLike || s.segment.length < 2) continue;
          const rg = document.createRange(); rg.setStart(n, s.index); rg.setEnd(n, s.index + s.segment.length);
          const tops = new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top)));
          if (tops.size > 1) F.push({ guard: 'legibility', why: `ตัดกลางคำ "${s.segment}" · ${el.tagName.toLowerCase()} "${ownText(el).slice(0, 30)}"` });
        }
      }
    }
    // element ≥ 75% ของ size-baseline (คีย์แบบเดียวกับ aria-lock.mjs)
    const INTERACTIVE = 'a[href],button,input,select,textarea,[role=button],[role=link],[role=tab],[role=switch],[role=slider],[role=combobox],[role=checkbox],[role=radio],[tabindex]:not([tabindex="-1"])';
    const now = new Map(), seen = new Map();
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      const interactive = el.matches(INTERACTIVE);
      const text = ownText(el);
      if (!interactive && !text) continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const label = el.getAttribute('aria-label') || text || el.getAttribute('placeholder') || el.value || '';
      const id = `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}|${label.slice(0, 80)}`;
      const n = (seen.get(id) || 0) + 1; seen.set(id, n);
      now.set(n > 1 ? `${id}#${n}` : id, r);
    }
    let missing = 0;
    for (const b of sizeBase) {
      const r = now.get(b.key);
      if (!r) { missing++; continue; }
      if (r.width < 0.75 * b.w - 0.5 || r.height < 0.75 * b.h - 0.5) F.push({ guard: 'legibility', why: `ขนาด ${r.width.toFixed(0)}×${r.height.toFixed(0)} < 75% ของ ${b.w}×${b.h} · ${b.key.slice(0, 50)}` });
    }
    if (missing) F.push({ guard: 'legibility', why: `element หายจาก size-baseline ${missing} ตัว` });

    // c. ตัวกันช่องโหว่ของตัววัด
    const link = document.querySelector('a[aria-label^="ราคาเริ่มต้นที่"]');
    const row = link?.closest('li') || link;
    const fr = row?.getBoundingClientRect();
    let firstRow = null;
    if (!fr) F.push({ guard: 'exploit', why: 'ไม่พบแถวเที่ยวบินแรก' });
    else {
      firstRow = { x: +fr.x.toFixed(1), y: +fr.y.toFixed(1), bottom: +fr.bottom.toFixed(1) };
      if (fr.bottom > 900) F.push({ guard: 'exploit', why: `แถวแรกขอบล่าง ${fr.bottom.toFixed(0)} > 900` });
      const d = Math.hypot(fr.x - vbase.firstRow.x, fr.y - vbase.firstRow.y);
      if (d > 150) F.push({ guard: 'exploit', why: `แถวแรกห่างจาก baseline ${d.toFixed(0)} px > 150` });
    }
    const root = getComputedStyle(document.documentElement);
    const toRgb = v => { const p = document.createElement('i'); p.style.color = v; document.body.appendChild(p); const c = parse(getComputedStyle(p).color); p.remove(); return c; };
    const sat = ({ r, g, b }) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); };
    const textVars = {};
    for (const k of Object.keys(vbase.textColorVars)) {
      const v = root.getPropertyValue(k).trim(); const c = toRgb(v); textVars[k] = v;
      const s = sat(c);
      if (s > 0.2) F.push({ guard: 'exploit', why: `${k} ${v} saturation ${(s * 100).toFixed(0)}% > 20%` });
    }
    const mainBg = toRgb(root.getPropertyValue('--color-bg').trim());
    const pageBg = bgOf(document.body);
    const main = toRgb(root.getPropertyValue('--color-text').trim());
    const mc = Math.min(ratio(main, mainBg), ratio(main, pageBg));
    if (mc < 7) F.push({ guard: 'exploit', why: `--color-text contrast ${mc.toFixed(2)} < 7` });
    const inputs = [...document.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=range]),select,textarea,[role=combobox]')].filter(visible);
    for (const el of inputs) if (el.scrollWidth > el.clientWidth) F.push({ guard: 'exploit', why: `ช่องกรอกล้น ${el.scrollWidth} > ${el.clientWidth} · ${el.getAttribute('aria-label') || el.name || ''}` });
    return { F, info: { checked, firstRow, mainContrast: +mc.toFixed(2), textVars, inputs: inputs.length } };
  }, { sizeBase: SIZE.elements, vbase: VBASE });
  fails.push(...r.F);
  return { ok: !fails.length, fails, info: r.info, hash: h };
}

// ---------- แบ่ง diff สีแดงเป็นบริเวณ → element → ตัวแปร ----------
export function redMask(diffPng) {
  const D = PNG.sync.read(fs.readFileSync(diffPng));
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { const r = D.data[4 * i], g = D.data[4 * i + 1], b = D.data[4 * i + 2]; if (r > 200 && g < 80 && b < 80) m[i] = 1; }
  return m;
}
export function bands(m, size = 75) {
  const out = [];
  for (let y0 = 0; y0 < H; y0 += size) { let n = 0; for (let y = y0; y < Math.min(H, y0 + size); y++) for (let x = 0; x < W; x++) n += m[y * W + x]; out.push({ y0, y1: Math.min(H, y0 + size), red: n }); }
  return out;
}
// กลุ่มพิกเซลที่ติดกัน: รวมพิกเซลแดงบนกริด 6px (กลุ่มที่ห่างกัน ≤ 6px ถือว่าติดกัน) แล้ว union-find
export function clusters(m, cell = 6) {
  const gw = Math.ceil(W / cell), gh = Math.ceil(H / cell), cnt = new Int32Array(gw * gh);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) cnt[((y / cell) | 0) * gw + ((x / cell) | 0)]++;
  const par = new Int32Array(gw * gh).map((_, i) => i);
  const f = i => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x; if (!cnt[i]) continue;
    if (x + 1 < gw && cnt[i + 1]) par[f(i + 1)] = f(i);
    if (y + 1 < gh && cnt[i + gw]) par[f(i + gw)] = f(i);
  }
  const g = new Map();
  for (let i = 0; i < gw * gh; i++) if (cnt[i]) {
    const k = f(i), x = (i % gw) * cell, y = ((i / gw) | 0) * cell;
    const c = g.get(k) || { red: 0, x0: 1e9, y0: 1e9, x1: 0, y1: 0 };
    c.red += cnt[i]; c.x0 = Math.min(c.x0, x); c.y0 = Math.min(c.y0, y); c.x1 = Math.max(c.x1, x + cell); c.y1 = Math.max(c.y1, y + cell);
    g.set(k, c);
  }
  return [...g.values()].sort((a, b) => b.red - a.red);
}
// จับคู่บริเวณ → element (elementsFromPoint ที่จุดกลาง) → ตัวแปรที่คุม (กฎ CSS ที่ match element + บรรพบุรุษ 2 ชั้น · var() ที่ใช้ · ไล่ var ซ้อนใน :root)
export async function mapRegions(page, regions) {
  return page.evaluate(regs => {
    const rootVars = {};
    const ruleList = [];
    for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch { continue; } for (const r of rs) if (r.style && r.selectorText) ruleList.push(r); }
    for (const r of ruleList) if (r.selectorText === ':root') for (const p of r.style) if (p.startsWith('--')) rootVars[p] = r.style.getPropertyValue(p).trim();
    const expand = (v, acc = new Set()) => { for (const m of v.matchAll(/var\((--[\w-]+)/g)) { if (acc.has(m[1])) continue; acc.add(m[1]); if (rootVars[m[1]]) expand(rootVars[m[1]], acc); } return acc; };
    return regs.map(g => {
      const cx = Math.min(1365, (g.x0 + g.x1) / 2), cy = Math.min(899, (g.y0 + g.y1) / 2);
      const els = document.elementsFromPoint(cx, cy).filter(e => e !== document.documentElement && e !== document.body).slice(0, 3);
      const el = els[0];
      const vars = new Map();
      for (const [depth, e] of els.entries()) for (const r of ruleList) {
        let ok = false; try { ok = e.matches(r.selectorText.replace(/::?(before|after|hover|focus-visible|placeholder)/g, '')); } catch {}
        if (!ok || r.selectorText === ':root') continue;
        for (const p of r.style) { const v = r.style.getPropertyValue(p); for (const k of expand(v)) vars.set(k, Math.min(vars.get(k) ?? 9, depth)); }
      }
      const desc = el ? `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.textContent || '').trim().slice(0, 30)}"` : '(ว่าง)';
      return { ...g, element: desc, vars: [...vars].sort((a, b) => a[1] - b[1]).map(x => x[0]) };
    });
  }, regions);
}

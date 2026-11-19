// Helpers owned by TEST agent C (pdpa / dash / audit / rbac / nfr). Reuses lib/common.js (not edited).
const zlib = require('zlib');
const { expect } = require('@playwright/test');
const common = require('./common');

const EN_DASH = '–';

/** locator for repeated testid rows filtered by a data-* attribute */
function byAttr(scope, testid, attr, value) {
  return scope.locator(`[data-testid="${testid}"][${attr}="${value}"]`);
}

/** clear cookies then log in as staff through the login page (fresh session) */
async function freshStaff(page, username) {
  await page.context().clearCookies();
  await common.uiLoginStaff(page, username);
}
async function freshCitizen(page, idNo) {
  await page.context().clearCookies();
  await common.uiLoginCitizen(page, idNo);
}

/** generic fetch with any method through an APIRequestContext; returns {status, headers, text, json, body} */
async function call(ctx, method, url, data) {
  const opts = { method };
  if (data !== undefined) opts.data = data;
  const res = await ctx.fetch(url, opts);
  const body = await res.body();
  const text = body.toString('utf8');
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* not json */ }
  return { status: res.status(), headers: res.headers(), text, json, body };
}

/** all keys at any depth */
function deepKeys(obj, acc = []) {
  if (Array.isArray(obj)) obj.forEach((x) => deepKeys(x, acc));
  else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) { acc.push(k); deepKeys(obj[k], acc); }
  }
  return acc;
}

/** read a Playwright Download fully */
async function readDownload(download) {
  const fs = require('fs');
  const p = await download.path();
  return fs.readFileSync(p);
}

// ---------------- minimal xlsx reader (no extra dependency) ----------------
function unzip(buf) {
  let e = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central dir');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf8');
    const ln = buf.readUInt16LE(off + 26);
    const le = buf.readUInt16LE(off + 28);
    const data = buf.slice(off + 30 + ln + le, off + 30 + ln + le + csize);
    files[name] = method === 0 ? data : zlib.inflateRawSync(data);
    p += 46 + nlen + elen + clen;
  }
  return files;
}
function xmlDecode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
}
/** returns {cells: {'A1': 'text'}, rows: [[...]]} of the first sheet */
function xlsxFirstSheet(buf) {
  const files = unzip(buf);
  const shared = [];
  if (files['xl/sharedStrings.xml']) {
    const x = files['xl/sharedStrings.xml'].toString('utf8');
    for (const m of x.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      let t = '';
      for (const tm of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += tm[1];
      shared.push(xmlDecode(t));
    }
  }
  const sheetName = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/(\d+)/)[1], 10) - parseInt(b.match(/(\d+)/)[1], 10))[0];
  const x = files[sheetName].toString('utf8');
  const cells = {};
  const rows = [];
  for (const m of x.matchAll(/<c\s+([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1];
    const ref = /r="([A-Z]+)(\d+)"/.exec(attrs);
    if (!ref) continue;
    const type = (/t="(\w+)"/.exec(attrs) || [])[1];
    const inner = m[3] || '';
    let val = '';
    if (type === 's') val = shared[parseInt((/<v>([\s\S]*?)<\/v>/.exec(inner) || [, '0'])[1], 10)];
    else if (type === 'inlineStr') { for (const tm of inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) val += xmlDecode(tm[1]); }
    else val = xmlDecode((/<v>([\s\S]*?)<\/v>/.exec(inner) || [, ''])[1]);
    cells[ref[1] + ref[2]] = val;
    const r = parseInt(ref[2], 10) - 1;
    const c = ref[1].charCodeAt(0) - 65;
    rows[r] = rows[r] || [];
    rows[r][c] = val;
  }
  return { cells, rows, allText: Object.values(cells).join('\n') };
}

/** best-effort text out of a PDF: raw latin1 + text-showing strings of (inflated) streams */
function pdfTexts(buf) {
  const raw = buf.toString('latin1');
  let extracted = '';
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let content = Buffer.from(m[1], 'latin1');
    try { content = zlib.inflateSync(content); } catch (e) { /* not compressed */ }
    const s = content.toString('latin1');
    for (const lit of s.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) extracted += lit[1] + '\n';
    for (const hx of s.matchAll(/<([0-9A-Fa-f\s]{4,})>/g)) {
      const h = hx[1].replace(/\s/g, '');
      if (h.length % 2) continue;
      const b = Buffer.from(h, 'hex');
      extracted += b.toString('latin1') + '\n';
      if (b.length % 2 === 0) extracted += Buffer.from(b).swap16().toString('utf16le') + '\n';
    }
  }
  const literals = [...raw.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((m) => m[1]).join('\n');
  return { raw, text: extracted + '\n' + literals, utf8: buf.toString('utf8') };
}

/** Press Tab until the element with data-testid is focused (max n presses). Returns true/false. */
async function tabTo(page, testid, n = 60) {
  for (let i = 0; i < n; i++) {
    const hit = await page.evaluate((id) => {
      const a = document.activeElement;
      return !!a && a.getAttribute && a.getAttribute('data-testid') === id;
    }, testid);
    if (hit) return true;
    await page.keyboard.press('Tab');
  }
  return false;
}

/** is the focused element visibly marked (outline or box-shadow)? */
async function focusRingVisible(page) {
  return page.evaluate(() => {
    const a = document.activeElement;
    if (!a) return false;
    const s = getComputedStyle(a);
    const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
    const shadow = s.boxShadow && s.boxShadow !== 'none';
    return outline || !!shadow;
  });
}

const NAV_IDS = ['nav-my-cases', 'nav-queue', 'nav-approvals', 'nav-dashboard', 'nav-audit',
  'nav-admin-services', 'nav-admin-holidays', 'nav-admin-users', 'nav-bell'];

module.exports = {
  ...common, EN_DASH, byAttr, freshStaff, freshCitizen, call, deepKeys, readDownload,
  xlsxFirstSheet, pdfTexts, tabTo, focusRingVisible, NAV_IDS,
};

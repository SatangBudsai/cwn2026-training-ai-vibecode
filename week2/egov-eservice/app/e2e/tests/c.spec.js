// @ts-check
'use strict';
/**
 * Playwright ชุด C · หมวด PDPA DASH AUDIT RBAC NFR (TEST-PLAN.md ข้อ 12–16)
 * อ้างอิงเฉพาะ TEST-PLAN.md · CONTRACT.md · TEST-DATA.md (ไม่อ่านโค้ดเว็บ)
 *
 * ต้องรันแบบ workers=1 (ทุก TC ใช้ POST /api/test/reset ซึ่งล้างสถานะกลางของเว็บ)
 * ตัวแปรสภาพแวดล้อม:
 *   BASE_URL              ที่อยู่เว็บ (ค่าเริ่มต้น http://localhost:3100)
 *   DB_PATH               ไฟล์ฐานข้อมูลที่อ่านได้จากเครื่องที่รัน test (TC-NFR-04)
 *   DB_DUMP_CMD           (ทางเลือกแทน DB_PATH) คำสั่ง shell ที่พิมพ์เนื้อฐานข้อมูลออก stdout
 *                         เช่น `docker compose exec -T web cat /data/app.db`
 *   APP_LOG_PATH          (ไม่บังคับ) ไฟล์ log ของเว็บ ใช้ตรวจใน TC-NFR-04 ด้วย
 *   NO_TEST_MODE_BASE_URL (ไม่บังคับ) เว็บอีกตัวที่ไม่ตั้ง TEST_MODE ใช้ตรวจ hook ปิด (TC-NFR-03)
 * ไลบรารีเสริม: @axe-core/playwright (TC-NFR-02) · pdf-parse (ถ้ามีจะใช้ ถ้าไม่มีใช้ตัวอ่าน PDF ในไฟล์นี้)
 */
const { test: base, expect, request: pwRequest } = require('@playwright/test');
const fs = require('fs');
const zlib = require('zlib');
const { execSync } = require('child_process');

// ───────────────────────────── ค่าคงที่ ─────────────────────────────
const BASE = (process.env.BASE_URL || 'http://localhost:3100').replace(/\/+$/, '');
const T0 = '2026-12-01T09:00:00+07:00';
const PW = 'Test@1234';
const OTP = '123456';
const ID = {
  somchai: '1101700123456',
  somying: '3100600987659',
  mana: '5500400111221',
  piti: '1909900555015',
};
const EG = (n) => `EG-2569-${String(n).padStart(6, '0')}`;
const NAMES = ['สมชาย', 'สมหญิง', 'ปิติ', 'มานะ'];
const MASK_RE = /^X-XXXX-XXXXX-\d{2}-\d$/;
const STATUS_TH = {
  DRAFT: 'ร่าง',
  PENDING_PAYMENT: 'รอชำระเงิน',
  SUBMITTED: 'ส่งคำขอแล้ว',
  IN_REVIEW: 'กำลังตรวจสอบ',
  NEED_FIX: 'รอแก้ไขเอกสาร',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติ',
  COMPLETED: 'เสร็จสิ้น',
  REJECTED: 'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิก',
};
const LEVEL_TH = { normal: 'ปกติ', near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด', paused: 'หยุดนับ', closed: 'ปิดแล้ว' };
const ALL_NAV = [
  'nav-my-cases', 'nav-queue', 'nav-approvals', 'nav-bell', 'nav-dashboard', 'nav-audit',
  'nav-admin-services', 'nav-admin-holidays', 'nav-admin-users',
];

// ───────────────────────────── ตัวช่วยทั่วไป ─────────────────────────────
const sel = (id) => `[data-testid="${id}"]`;
/** @param {import('@playwright/test').Page | import('@playwright/test').Locator} scope */
const tid = (scope, id) => scope.locator(sel(id));
const rowOf = (page, testid, attr, value) => page.locator(`${sel(testid)}[${attr}="${value}"]`);

/** PDF จริงขนาด n ไบต์ (เหมือน make_testfiles.py ใน TEST-DATA ข้อ 11) */
function pdfBuf(n = 1024) {
  const head = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n', 'latin1');
  const tail = Buffer.from('\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');
  return Buffer.concat([head, Buffer.alloc(n - head.length - tail.length, 0x20), tail]);
}

async function bodyText(r) {
  try { return (await r.text()).slice(0, 400); } catch { return '<no body>'; }
}
async function safeJson(r) {
  try { return await r.json(); } catch { return null; }
}
/** ตรวจ HTTP status พร้อมแสดง body เมื่อไม่ตรง */
async function expectStatus(r, code, label = '') {
  expect(r.status(), `${label} ${r.url()} → ${await bodyText(r)}`).toBe(code);
}
/** ตรวจ status + code ของข้อผิดพลาด (+ message ถ้าระบุ) */
async function expectErr(r, status, code, message, label = '') {
  await expectStatus(r, status, label);
  const j = await safeJson(r);
  expect(j && j.code, `${label} code`).toBe(code);
  if (message !== undefined) expect(j.message, `${label} message`).toBe(message);
}
function hasKeyDeep(o, key) {
  if (Array.isArray(o)) return o.some((x) => hasKeyDeep(x, key));
  if (o && typeof o === 'object') return Object.keys(o).some((k) => k === key || hasKeyDeep(o[k], key));
  return false;
}
const sameInstant = (a, b) => typeof a === 'string' && Date.parse(a) === Date.parse(b);

/** รอ response ของ API ที่ตรง pattern แบบไม่บังคับ (หน้าอาจกรองฝั่ง client) แล้วทำ action */
async function actAndMaybeWait(page, urlPart, action, timeout = 4000) {
  const wait = page.waitForResponse((r) => r.url().includes(urlPart), { timeout }).catch(() => null);
  await action();
  await wait;
}

async function download(page, locator) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), locator.click()]);
  const p = await dl.path();
  return { buf: fs.readFileSync(/** @type {string} */ (p)), name: dl.suggestedFilename() };
}

// ───────────────────────────── อ่าน xlsx (zip + XML) ─────────────────────────────
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ไม่ใช่ไฟล์ zip/xlsx');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  /** @type {Record<string, Buffer>} */
  const files = {};
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.subarray(off + 46, off + 46 + nameLen).toString('utf8');
    const lName = buf.readUInt16LE(localOff + 26);
    const lExtra = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lName + lExtra;
    const data = buf.subarray(start, start + csize);
    files[name] = method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data);
    off += 46 + nameLen + extraLen + commLen;
  }
  return files;
}
const xmlDecode = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&amp;/g, '&');
const attrsOf = (tag) => {
  /** @type {Record<string,string>} */
  const a = {};
  for (const m of tag.matchAll(/([\w:]+)="([^"]*)"/g)) a[m[1]] = m[2];
  return a;
};
const textRuns = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => xmlDecode(m[1])).join('');

/** คืน { rows: string[][] (index 0 = แถว 1), cells: Record<'A1', string> } ของชีตแรก */
function readXlsxFirstSheet(buf) {
  const files = unzip(buf);
  const shared = files['xl/sharedStrings.xml']
    ? [...files['xl/sharedStrings.xml'].toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textRuns(m[1]))
    : [];
  let sheetPath = 'xl/worksheets/sheet1.xml';
  try {
    const wb = files['xl/workbook.xml'].toString('utf8');
    const firstSheet = attrsOf((wb.match(/<sheet\b[^>]*>/) || [''])[0]);
    const rid = firstSheet['r:id'];
    const rels = files['xl/_rels/workbook.xml.rels'].toString('utf8');
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
      const a = attrsOf(m[0]);
      if (a.Id === rid) {
        sheetPath = a.Target.startsWith('/') ? a.Target.slice(1) : `xl/${a.Target.replace(/^\.\//, '')}`;
      }
    }
  } catch { /* ใช้ sheet1.xml */ }
  const xml = files[sheetPath].toString('utf8');
  /** @type {Record<string,string>} */
  const cells = {};
  /** @type {string[][]} */
  const rows = [];
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const a = attrsOf(m[1]);
    const inner = m[2] || '';
    let v = '';
    if (a.t === 's') v = shared[parseInt((inner.match(/<v>([\s\S]*?)<\/v>/) || [, '0'])[1], 10)] || '';
    else if (a.t === 'inlineStr') v = textRuns(inner);
    else v = xmlDecode((inner.match(/<v>([\s\S]*?)<\/v>/) || [, ''])[1]);
    const rc = /^([A-Z]+)(\d+)$/.exec(a.r || '');
    if (!rc) continue;
    cells[a.r] = v;
    const col = rc[1].split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    const row = parseInt(rc[2], 10) - 1;
    (rows[row] = rows[row] || [])[col] = v;
  }
  return { rows, cells };
}

// ───────────────────────────── อ่านข้อความ PDF ─────────────────────────────
function pdfStreams(buf) {
  const s = buf.toString('latin1');
  const out = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf('endstream', start);
    if (end < 0) break;
    const data = buf.subarray(start, end);
    let dec;
    try { dec = zlib.inflateSync(data, { finishFlush: zlib.constants.Z_SYNC_FLUSH }); } catch { dec = data; }
    out.push(dec);
    re.lastIndex = end;
  }
  return out;
}
function decodePdfBytes(bytes) {
  const b = Buffer.from(bytes);
  const u = b.toString('utf8');
  return u.includes('�') ? b.toString('latin1') : u;
}
function readLiteral(s, i) {
  // s[i] === '('
  let depth = 1;
  let j = i + 1;
  const bytes = [];
  const esc = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
  while (j < s.length && depth > 0) {
    const c = s[j];
    if (c === '\\') {
      const n = s[j + 1];
      if (n in esc) { bytes.push(esc[n]); j += 2; continue; }
      if (/[0-7]/.test(n)) {
        let oct = '';
        let k = j + 1;
        while (k < s.length && oct.length < 3 && /[0-7]/.test(s[k])) oct += s[k++];
        bytes.push(parseInt(oct, 8) & 0xff);
        j = k;
        continue;
      }
      if (n === '\r' || n === '\n') { j += 2; if (n === '\r' && s[j] === '\n') j++; continue; }
      j += 1;
      continue;
    }
    if (c === '(') depth++;
    if (c === ')') { depth--; if (depth === 0) { j++; break; } }
    bytes.push(s.charCodeAt(j) & 0xff);
    j++;
  }
  return [decodePdfBytes(bytes), j];
}
function contentStrings(buf) {
  const s = buf.toString('latin1');
  const lines = [];
  /** @type {string[] | null} */
  let cur = null;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '(') {
      const [str, j] = readLiteral(s, i);
      if (cur) cur.push(str); else lines.push(str);
      i = /** @type {number} */ (j);
      continue;
    }
    if (c === '[') { cur = []; i++; continue; }
    if (c === ']') { if (cur) lines.push(cur.join('')); cur = null; i++; continue; }
    i++;
  }
  return lines;
}
/** ข้อความที่ดึงจาก PDF (ไม่ใช่ไบต์ดิบ) + เนื้อ stream ที่คลายแล้ว (ใช้หาบรรทัด ASCII) */
async function pdfText(buf) {
  let parsed = '';
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const pp = require('pdf-parse');
    if (typeof pp === 'function') parsed = (await pp(buf)).text || '';
  } catch { /* ไม่มี pdf-parse */ }
  const streams = pdfStreams(buf);
  const own = streams
    .filter((st) => /\bBT\b/.test(st.toString('latin1')))
    .flatMap((st) => contentStrings(st))
    .join('\n');
  const raw = [buf.toString('latin1'), ...streams.map((st) => st.toString('latin1'))].join('\n');
  return { text: `${parsed}\n${own}`, raw };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function piiProblems(text) {
  const out = [];
  if (/\d{13}/.test(text)) out.push('พบตัวเลข 13 หลัก');
  if (/0\d{9}/.test(text)) out.push('พบรูปแบบเบอร์โทร 0xxxxxxxxx');
  for (const n of NAMES) if (text.includes(n)) out.push(`พบชื่อ ${n}`);
  return out;
}

// ───────────────────────────── ตัวช่วย session / hook ─────────────────────────────
class H {
  /** @param {import('@playwright/test').Browser} browser */
  constructor(browser) {
    this.browser = browser;
    /** @type {import('@playwright/test').APIRequestContext[]} */
    this.reqs = [];
    /** @type {import('@playwright/test').BrowserContext[]} */
    this.ctxs = [];
    /** @type {import('@playwright/test').APIRequestContext | null} */
    this._hook = null;
  }

  async api() {
    const r = await pwRequest.newContext({ baseURL: BASE, ignoreHTTPSErrors: true });
    this.reqs.push(r);
    return r;
  }

  async hook() {
    if (!this._hook) this._hook = await this.api();
    return this._hook;
  }

  async reset() {
    const r = await (await this.hook()).post('/api/test/reset');
    await expectStatus(r, 200, 'RESET');
    expect((await r.json()).now, 'RESET now').toBe(T0);
  }

  async clock(now) {
    const r = await (await this.hook()).put('/api/test/clock', { data: { now } });
    await expectStatus(r, 200, `CLOCK(${now})`);
  }

  /** LOGIN_S · คืน request context ที่มี cookie */
  async staff(user, req) {
    const c = req || (await this.api());
    const r = await c.post('/api/auth/staff/login', { data: { username: user, password: PW } });
    await expectStatus(r, 200, `LOGIN_S ${user}`);
    return c;
  }

  /** LOGIN_C · คืน request context ที่มี cookie */
  async citizen(idNo, req, { expectRegistered = true } = {}) {
    const c = req || (await this.api());
    let r = await c.post('/api/auth/thaid/start', { data: { idNo } });
    await expectStatus(r, 200, `thaid/start ${idNo}`);
    r = await c.post('/api/auth/thaid/verify', { data: { idNo, otp: OTP } });
    await expectStatus(r, 200, `thaid/verify ${idNo}`);
    if (expectRegistered !== null) expect((await r.json()).registered, `registered ${idNo}`).toBe(expectRegistered);
    return c;
  }

  async page({ viewport = { width: 1280, height: 800 } } = {}) {
    const ctx = await this.browser.newContext({ baseURL: BASE, viewport, acceptDownloads: true, ignoreHTTPSErrors: true });
    this.ctxs.push(ctx);
    const page = await ctx.newPage();
    return { ctx, page, req: ctx.request };
  }

  async staffPage(user, opts) {
    const p = await this.page(opts);
    await this.staff(user, p.req);
    return p;
  }

  async citizenPage(idNo, opts, loginOpts) {
    const p = await this.page(opts);
    await this.citizen(idNo, p.req, loginOpts);
    return p;
  }

  /** NEW_PAID(ผู้ยื่น, บริการ, เวลา, ตัวเลือก) ตาม TEST-PLAN ข้อ 0 */
  async newPaid({ idNo = ID.somchai, service = 'SV-01', qty = 1, areaSqm = 100, at = T0, req = null } = {}) {
    await this.clock(at);
    const c = req || (await this.citizen(idNo));
    /** @type {Record<string, any>} */
    const body = { serviceId: service };
    if (service === 'SV-01') body.qty = qty;
    if (service === 'SV-03') body.areaSqm = areaSqm;
    let r = await c.post('/api/drafts', { data: body });
    await expectStatus(r, 201, 'NEW_PAID drafts');
    const d = await r.json();
    const docs = { 'SV-01': ['id-card'], 'SV-02': ['id-card', 'map'], 'SV-03': ['id-card', 'plan', 'deed'] }[service];
    for (const k of docs) {
      r = await c.post(`/api/drafts/${d.draftId}/files`, {
        multipart: { file: { name: `${k}.pdf`, mimeType: 'application/pdf', buffer: pdfBuf(1024) }, docKey: k },
      });
      await expectStatus(r, 201, `NEW_PAID upload ${k}`);
    }
    r = await c.post(`/api/drafts/${d.draftId}/payment`);
    await expectStatus(r, 201, 'NEW_PAID payment');
    const p = await r.json();
    r = await (await this.hook()).post(`/api/test/payments/${p.ref}/pay`, { data: { amount: p.amount } });
    await expectStatus(r, 200, 'NEW_PAID pay');
    r = await c.get(`/api/payments/${p.ref}`);
    await expectStatus(r, 200, 'NEW_PAID payments/ref');
    const pj = await r.json();
    expect(pj.caseNo, 'NEW_PAID caseNo').toMatch(/^EG-\d{4}-\d{6}$/);
    return { draftId: d.draftId, fee: d.fee, ref: p.ref, amount: p.amount, caseNo: pj.caseNo, req: c };
  }

  async close() {
    for (const c of this.ctxs) await c.close().catch(() => {});
    for (const r of this.reqs) await r.dispose().catch(() => {});
  }
}

const test = base.extend({
  h: async ({ browser }, use) => {
    const h = new H(browser);
    await use(h);
    await h.close();
  },
});

// ───────────────────────────── ตัวช่วยหน้า Audit / Dashboard ─────────────────────────────
async function auditFilter(page, { actor = '', event = '', from = '', to = '' } = {}) {
  await tid(page, 'audit-filter-actor').fill(actor);
  await tid(page, 'audit-filter-event').selectOption(event);
  await tid(page, 'audit-filter-from').fill(from);
  await tid(page, 'audit-filter-to').fill(to);
  await actAndMaybeWait(page, '/api/audit', () => tid(page, 'audit-apply-btn').click());
}
async function auditRows(page) {
  return page.$$eval(sel('audit-row'), (rows) => rows.map((r) => {
    const q = (id) => r.querySelector(`[data-testid="${id}"]`);
    const t = (id) => ((q(id) && q(id).textContent) || '').trim();
    const time = q('audit-time');
    return {
      id: r.getAttribute('data-id'),
      event: r.getAttribute('data-event'),
      actor: r.getAttribute('data-actor'),
      caseNo: r.getAttribute('data-case-no'),
      iso: time ? time.getAttribute('data-iso') : null,
      actorText: t('audit-actor'),
      role: t('audit-role'),
      eventText: t('audit-event'),
      caseText: t('audit-case-no'),
      transition: t('audit-transition'),
      detail: t('audit-detail'),
    };
  }));
}
async function openAudit(page) {
  await page.goto('/audit');
  await expect(tid(page, 'audit-count')).toBeVisible();
}
async function setDash(page, period, service) {
  await actAndMaybeWait(page, '/api/dashboard', () => tid(page, 'period-select').selectOption(period));
  await actAndMaybeWait(page, '/api/dashboard', () => tid(page, 'service-select').selectOption(service));
}
async function expectKpis(page, k, label = '') {
  if (k.received !== undefined) await expect(tid(page, 'kpi-received'), `${label} kpi-received`).toHaveText(String(k.received));
  if (k.closed !== undefined) await expect(tid(page, 'kpi-closed'), `${label} kpi-closed`).toHaveText(String(k.closed));
  if (k.pct !== undefined) await expect(tid(page, 'kpi-ontime-pct'), `${label} kpi-ontime-pct`).toHaveText(k.pct);
  if (k.backlog !== undefined) await expect(tid(page, 'kpi-backlog'), `${label} kpi-backlog`).toHaveText(String(k.backlog));
  if (k.overdue !== undefined) await expect(tid(page, 'kpi-overdue'), `${label} kpi-overdue`).toHaveText(String(k.overdue));
}
async function dashApi(req, period, service) {
  const r = await req.get(`/api/dashboard?period=${period}&service=${service}`);
  await expectStatus(r, 200, `dashboard ${period} ${service}`);
  return r.json();
}
const pctToNum = (s) => (s === '–' ? null : parseFloat(s));
function expectDashJson(j, k, label) {
  if (k.received !== undefined) expect(j.received, `${label} received`).toBe(k.received);
  if (k.closed !== undefined) expect(j.closed, `${label} closed`).toBe(k.closed);
  if (k.pct !== undefined) {
    const n = pctToNum(k.pct);
    if (n === null) expect(j.ontimePct, `${label} ontimePct`).toBeNull();
    else expect(j.ontimePct, `${label} ontimePct`).toBeCloseTo(n, 1);
  }
  if (k.backlog !== undefined) expect(j.backlog, `${label} backlog`).toBe(k.backlog);
  if (k.overdue !== undefined) expect(j.overdue, `${label} overdue`).toBe(k.overdue);
}

// ═════════════════════════════ 12. PDPA ═════════════════════════════
test.describe('PDPA', () => {
  test('TC-PDPA-01 · ปิดบังเลขบัตรบนจอ', async ({ h }) => {
    await h.reset();

    // off.reg2 · /officer/queue
    const reg2 = await h.staffPage('off.reg2');
    await reg2.page.goto('/officer/queue');
    await expect(tid(reg2.page, 'queue-row').first()).toBeVisible();
    const masks = await tid(reg2.page, 'row-id-masked').allTextContents();
    expect(masks.length, 'มี row-id-masked').toBeGreaterThan(0);
    for (const m of masks) expect(m.trim()).toMatch(MASK_RE);
    await expect(tid(rowOf(reg2.page, 'queue-row', 'data-case-no', EG(25)), 'row-id-masked')).toHaveText('X-XXXX-XXXXX-65-9');
    await expect(tid(rowOf(reg2.page, 'queue-row', 'data-case-no', EG(26)), 'row-id-masked')).toHaveText('X-XXXX-XXXXX-45-6');

    // off.reg2 · /officer/cases/EG-2569-000025
    await reg2.page.goto(`/officer/cases/${EG(25)}`);
    await expect(tid(reg2.page, 'applicant-id')).toHaveText('X-XXXX-XXXXX-65-9');
    const html = await reg2.page.content();
    expect(html).not.toContain('3100600987659');
    expect(html).not.toContain('3-1006-00987-65-9');

    // head1
    const head = await h.staffPage('head1');
    await head.page.goto(`/officer/cases/${EG(25)}`);
    await expect(tid(head.page, 'applicant-id')).toHaveText('X-XXXX-XXXXX-65-9');
    const html2 = await head.page.content();
    expect(html2).not.toContain('3100600987659');
    expect(html2).not.toContain('3-1006-00987-65-9');

    // สมหญิง เห็นของตัวเองเต็ม
    const somying = await h.citizenPage(ID.somying);
    await somying.page.goto(`/citizen/cases/${EG(25)}`);
    await expect(tid(somying.page, 'case-id-full')).toHaveText('3-1006-00987-65-9');

    // สมชาย
    const somchai = await h.citizenPage(ID.somchai);
    await somchai.page.goto(`/citizen/cases/${EG(20)}`);
    await expect(tid(somchai.page, 'case-id-full')).toHaveText('1-1017-00123-45-6');
  });

  test('TC-PDPA-02 · API (JSON) ไม่ส่งเลขบัตรเต็ม', async ({ h }) => {
    await h.reset();
    const endpoints = [
      '/api/officer/queue?filter=all',
      `/api/cases/${EG(25)}`,
      `/api/cases/${EG(26)}`,
      `/api/cases/${EG(20)}`,
      '/api/notifications',
      `/api/cases/${EG(25)}/files`,
    ];
    for (const user of ['off.reg1', 'head1']) {
      const req = await h.staff(user);
      for (const ep of endpoints) {
        const label = `${user} GET ${ep}`;
        const r = await req.get(ep);
        await expectStatus(r, 200, label);
        expect(r.headers()['content-type'] || '', `${label} content-type`).toContain('application/json');
        const j = await r.json();
        const s = JSON.stringify(j);
        expect(s, `${label} ไม่มีเลข 13 หลัก`).not.toMatch(/\d{13}/);
        expect(s, `${label} ไม่มีเลขรูปแบบมีขีด`).not.toMatch(/\d-\d{4}-\d{5}-\d{2}-\d/);
        expect(hasKeyDeep(j, 'idNo'), `${label} ไม่มี key idNo`).toBe(false);
        for (const v of ['3100600987659', '1101700123456', '1909900555015']) expect(s, label).not.toContain(v);
        if (Array.isArray(j.items)) {
          for (const it of j.items) if ('idMasked' in it) expect(it.idMasked, `${label} items[].idMasked`).toMatch(MASK_RE);
        }
        if (ep.startsWith('/api/cases/') && !ep.endsWith('/files')) {
          expect(j.idMasked, `${label} idMasked`).toMatch(MASK_RE);
        }
      }
      // คิวต้องมี idMasked ทุกแถว
      const q = await (await req.get('/api/officer/queue?filter=all')).json();
      expect(q.items.length).toBeGreaterThan(0);
      for (const it of q.items) expect(it.idMasked, `${user} queue idMasked ${it.caseNo}`).toMatch(MASK_RE);
    }
  });

  test('TC-PDPA-03 · แสดงเลขเต็มต้องมีเหตุผลและบันทึก Audit', async ({ h }) => {
    await h.reset();
    const { page, req } = await h.staffPage('off.reg2');
    await page.goto(`/officer/cases/${EG(25)}`);
    await expect(tid(page, 'applicant-id')).toHaveText('X-XXXX-XXXXX-65-9');

    const openUnmask = async () => {
      if (!(await tid(page, 'unmask-reason').isVisible())) await tid(page, 'show-full-id-btn').click();
      await expect(tid(page, 'unmask-reason')).toBeVisible();
    };
    await expect(tid(page, 'show-full-id-btn')).toHaveText('แสดงเลขเต็ม');

    // 1 เหตุผลว่าง
    await openUnmask();
    await tid(page, 'unmask-reason').fill('');
    await tid(page, 'unmask-submit').click();
    await expect(tid(page, 'unmask-error')).toHaveText('กรุณากรอกเหตุผล');
    await expect(tid(page, 'full-id')).toHaveCount(0);
    await expectErr(await req.post(`/api/officer/cases/${EG(25)}/unmask`, { data: { reason: '' } }), 400, 'REASON_REQUIRED', 'กรุณากรอกเหตุผล', 'API reason ว่าง');

    // 2 เว้นวรรคล้วน
    await openUnmask();
    await tid(page, 'unmask-reason').fill('     ');
    await tid(page, 'unmask-submit').click();
    await expect(tid(page, 'unmask-error')).toHaveText('กรุณากรอกเหตุผล');
    await expect(tid(page, 'full-id')).toHaveCount(0);
    await expectErr(await req.post(`/api/officer/cases/${EG(25)}/unmask`, { data: { reason: '   ' } }), 400, 'REASON_REQUIRED', undefined, 'API reason เว้นวรรค');

    // 3 เหตุผลถูกต้อง
    await openUnmask();
    await tid(page, 'unmask-reason').fill('ตรวจสอบตัวตนซ้ำ');
    await tid(page, 'unmask-submit').click();
    await expect(tid(page, 'full-id')).toHaveText('3-1006-00987-65-9');

    // 4 โหลดซ้ำ → กลับเป็นปิดบัง
    await page.reload();
    await expect(tid(page, 'applicant-id')).toHaveText('X-XXXX-XXXXX-65-9');
    await expect(tid(page, 'full-id')).toHaveCount(0);

    // 5 Audit UNMASK = 1 แถว
    const aud = await h.staffPage('audit1');
    await openAudit(aud.page);
    await auditFilter(aud.page, { event: 'UNMASK' });
    await expect(tid(aud.page, 'audit-count')).toHaveText('1');
    const row = tid(aud.page, 'audit-row');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-actor', 'off.reg2');
    await expect(tid(row, 'audit-role')).toHaveText('officer');
    await expect(tid(row, 'audit-case-no')).toHaveText(EG(25));
    await expect(tid(row, 'audit-event')).toHaveText('UNMASK');
    await expect(tid(row, 'audit-detail')).toContainText('ตรวจสอบตัวตนซ้ำ');
    await expect(tid(row, 'audit-time')).toHaveAttribute('data-iso', T0);

    // 6 บทบาทอื่น → 403
    const others = [
      ['exec1', await h.staff('exec1')],
      ['audit1', aud.req],
      ['สมหญิง', await h.citizen(ID.somying)],
    ];
    for (const [who, r] of others) {
      await expectStatus(await r.post(`/api/officer/cases/${EG(25)}/unmask`, { data: { reason: 'x' } }), 403, `${who} unmask`);
    }
  });
});

// ═════════════════════════════ 13. DASH ═════════════════════════════
test.describe('DASH', () => {
  test('TC-DASH-01 · Dashboard ตัวเลขเริ่มต้น', async ({ h }) => {
    await h.reset();
    const { page, req } = await h.staffPage('exec1');
    await page.goto('/dashboard');
    await expect(tid(page, 'period-select')).toHaveValue('2026-12');
    await expect(tid(page, 'service-select')).toHaveValue('ALL');
    const all = { received: 3, closed: 0, pct: '–', backlog: 21, overdue: 1 };
    await expectKpis(page, all, 'ALL');
    expectDashJson(await dashApi(req, '2026-12', 'ALL'), all, 'API ALL');

    // งานในมือรายเจ้าหน้าที่
    const wl = { 'off.reg1': '3', 'off.reg2': '9', 'off.works1': '0' };
    await expect(tid(page, 'workload-row')).toHaveCount(3);
    for (const [u, v] of Object.entries(wl)) {
      await expect(tid(rowOf(page, 'workload-row', 'data-username', u), 'workload-value')).toHaveText(v);
    }
    const j = await dashApi(req, '2026-12', 'ALL');
    for (const [u, v] of Object.entries(wl)) {
      const w = (j.workload || []).find((x) => x.username === u);
      expect(w, `workload ${u}`).toBeTruthy();
      expect(w.count, `workload ${u}`).toBe(Number(v));
    }

    // ไม่มีข้อมูลส่วนบุคคล
    const text = await page.evaluate(() => document.body.innerText);
    expect(piiProblems(text), 'innerText /dashboard').toEqual([]);

    // ตัวกรองบริการ
    const bySvc = {
      'SV-01': { received: 3, closed: 0, pct: '–', backlog: 11, overdue: 1 },
      'SV-02': { received: 0, closed: 0, pct: '–', backlog: 7, overdue: 0 },
      'SV-03': { received: 0, closed: 0, pct: '–', backlog: 3, overdue: 0 },
    };
    for (const [svc, k] of Object.entries(bySvc)) {
      await setDash(page, '2026-12', svc);
      await expectKpis(page, k, svc);
      expectDashJson(await dashApi(req, '2026-12', svc), k, `API ${svc}`);
    }
  });

  test('TC-DASH-02 · Dashboard ย้อนหลัง พ.ย. ต.ค. รายปี', async ({ h }) => {
    await h.reset();
    const { page, req } = await h.staffPage('exec1');
    await page.goto('/dashboard');
    await expect(tid(page, 'kpi-received')).toBeVisible();
    const now = { ALL: [21, 1], 'SV-01': [11, 1], 'SV-02': [7, 0], 'SV-03': [3, 0] };
    const rows = [
      ['2026-10', 'ALL', 1, 1, '100.0%'],
      ['2026-11', 'ALL', 26, 7, '85.7%'],
      ['2026-11', 'SV-01', 12, 3, '100.0%'],
      ['2026-11', 'SV-02', 10, 3, '66.7%'],
      ['2026-11', 'SV-03', 4, 1, '100.0%'],
      ['2026', 'ALL', 30, 8, '87.5%'],
      ['2026', 'SV-01', 16, 4, '100.0%'],
      ['2026', 'SV-02', 10, 3, '66.7%'],
      ['2026', 'SV-03', 4, 1, '100.0%'],
    ];
    for (const [period, svc, received, closed, pct] of rows) {
      const k = { received, closed, pct, backlog: now[svc][0], overdue: now[svc][1] };
      const label = `${period}/${svc}`;
      await setDash(page, period, svc);
      await expectKpis(page, k, label);
      expectDashJson(await dashApi(req, period, svc), k, `API ${label}`);
    }
  });

  test('TC-DASH-03 · ส่งออก Excel/PDF เท่าหน้าจอ และไม่มีข้อมูลส่วนบุคคล', async ({ h }) => {
    await h.reset();
    const { page } = await h.staffPage('exec1');
    await page.goto('/dashboard');
    await expect(tid(page, 'kpi-received')).toBeVisible();
    const LABELS = ['รับเรื่อง', 'ปิดงาน', 'ทันกำหนด %', 'งานคงค้าง', 'เกินกำหนดคงค้าง'];
    const KPI_IDS = ['kpi-received', 'kpi-closed', 'kpi-ontime-pct', 'kpi-backlog', 'kpi-overdue'];

    const checkXlsx = async (expected, label) => {
      await expect(tid(page, 'export-xlsx-btn')).toHaveText('ส่งออก Excel');
      const { buf } = await download(page, tid(page, 'export-xlsx-btn'));
      const { rows } = readXlsxFirstSheet(buf);
      expect((rows[0] || []).slice(0, 2).map((x) => String(x ?? '').trim()), `${label} หัวตาราง`).toEqual(['ตัวชี้วัด', 'ค่า']);
      const screen = [];
      for (const k of KPI_IDS) screen.push(((await tid(page, k).textContent()) || '').trim());
      for (let i = 0; i < 5; i++) {
        const r = rows[i + 1] || [];
        expect(String(r[0] ?? '').trim(), `${label} A${i + 2}`).toBe(LABELS[i]);
        expect(String(r[1] ?? '').trim(), `${label} B${i + 2}`).toBe(expected[i]);
        expect(String(r[1] ?? '').trim(), `${label} B${i + 2} = หน้าจอ`).toBe(screen[i]);
      }
      const allText = rows.flat().map((x) => String(x ?? '')).join('\n');
      expect(piiProblems(allText), `${label} ข้อมูลส่วนบุคคลใน xlsx`).toEqual([]);
    };

    // พ.ย. / ALL
    await setDash(page, '2026-11', 'ALL');
    const nov = ['26', '7', '85.7%', '21', '1'];
    await expectKpis(page, { received: 26, closed: 7, pct: '85.7%', backlog: 21, overdue: 1 }, 'nov');
    await checkXlsx(nov, 'xlsx พ.ย.');

    // PDF พ.ย.
    let pdfCt = null;
    const onResp = (r) => { if (r.url().includes('/api/dashboard/export') && r.url().includes('pdf')) pdfCt = r.headers()['content-type']; };
    page.on('response', onResp);
    await expect(tid(page, 'export-pdf-btn')).toHaveText('ส่งออก PDF');
    const { buf: pdf } = await download(page, tid(page, 'export-pdf-btn'));
    page.off('response', onResp);
    expect(pdf.subarray(0, 4).toString('latin1'), 'PDF magic').toBe('%PDF');
    if (pdfCt) expect(pdfCt).toContain('application/pdf');
    const { text, raw } = await pdfText(pdf);
    const kpiLine = 'kpi received=26 closed=7 ontime=85.7% backlog=21 overdue=1';
    expect(text.includes(kpiLine) || raw.includes(kpiLine), `PDF มีบรรทัด "${kpiLine}"`).toBe(true);
    expect(piiProblems(text), 'ข้อมูลส่วนบุคคลใน PDF').toEqual([]);

    // ธ.ค. / ALL
    await setDash(page, '2026-12', 'ALL');
    await expectKpis(page, { received: 3, closed: 0, pct: '–', backlog: 21, overdue: 1 }, 'dec');
    await checkXlsx(['3', '0', '–', '21', '1'], 'xlsx ธ.ค.');

    // Audit EXPORT = 3
    const aud = await h.staffPage('audit1');
    await openAudit(aud.page);
    await auditFilter(aud.page, { event: 'EXPORT' });
    await expect(tid(aud.page, 'audit-count')).toHaveText('3');
    await expect(tid(aud.page, 'audit-row')).toHaveCount(3);
    const rows = await auditRows(aud.page);
    for (const r of rows) {
      expect(r.actor).toBe('exec1');
      expect(r.role).toBe('executive');
    }
    const details = rows.map((r) => r.detail);
    const has = (fmt, per) => details.some((d) => d.includes(fmt) && d.includes(per));
    expect(has('xlsx', '2026-11'), `detail xlsx 2026-11 · ${details}`).toBe(true);
    expect(has('pdf', '2026-11'), `detail pdf 2026-11 · ${details}`).toBe(true);
    expect(has('xlsx', '2026-12'), `detail xlsx 2026-12 · ${details}`).toBe(true);
  });

  test('TC-DASH-04 · ค่าขอบ "ทันกำหนด" 16:29:59 / 16:30:00 / 16:30:01', async ({ h }) => {
    await h.reset();
    await h.clock('2026-12-03T16:00:00+07:00');
    const reg1 = await h.staffPage('off.reg1');
    const reg2 = await h.staffPage('off.reg2');
    const ex = await h.staffPage('exec1');

    // 1 approve ที่ 16:00
    let r = await reg2.req.post(`/api/cases/${EG(25)}/approve`);
    await expectStatus(r, 200, 'reg2 approve 25');
    expect((await r.json()).status).toBe('APPROVED');
    r = await reg1.req.post(`/api/cases/${EG(23)}/approve`);
    await expectStatus(r, 200, 'reg1 approve 23');
    expect((await r.json()).status).toBe('APPROVED');

    const checkClosed = async (who, caseNo, iso) => {
      const cr = await who.req.get(`/api/cases/${caseNo}`);
      await expectStatus(cr, 200);
      expect(sameInstant((await cr.json()).closedAt, iso), `closedAt ${caseNo} = ${iso}`).toBe(true);
      await who.page.goto(`/officer/cases/${caseNo}`);
      await expect(tid(who.page, 'closed-at')).toHaveAttribute('data-iso', iso);
    };
    const checkDash = async (closed, onTime, extra = {}) => {
      const j = await dashApi(ex.req, '2026-12', 'ALL');
      expect(j.closed, 'closed').toBe(closed);
      expect(j.onTime, 'onTime').toBe(onTime);
      if (extra.backlog !== undefined) expect(j.backlog, 'backlog').toBe(extra.backlog);
      await ex.page.goto('/dashboard');
      await expectKpis(ex.page, { closed, ...extra }, `หลังปิด ${closed} ใบ`);
    };

    // 2 issue 25 ที่ 16:29:59
    const t2 = '2026-12-03T16:29:59+07:00';
    await h.clock(t2);
    r = await reg2.req.post(`/api/officer/cases/${EG(25)}/issue`);
    await expectStatus(r, 200, 'issue 25');
    expect((await r.json()).status).toBe('COMPLETED');
    await checkClosed(reg2, EG(25), t2);
    await checkDash(1, 1);

    // 3 reject 26 ที่ 16:30:00
    const t3 = '2026-12-03T16:30:00+07:00';
    await h.clock(t3);
    r = await reg2.req.post(`/api/cases/${EG(26)}/reject`, { data: { reason: 'xxxxxxxxxx' } });
    await expectStatus(r, 200, 'reject 26');
    expect((await r.json()).status).toBe('REJECTED');
    await checkClosed(reg2, EG(26), t3);
    await checkDash(2, 2);

    // 4 issue 23 ที่ 16:30:01
    const t4 = '2026-12-03T16:30:01+07:00';
    await h.clock(t4);
    r = await reg1.req.post(`/api/officer/cases/${EG(23)}/issue`);
    await expectStatus(r, 200, 'issue 23');
    expect((await r.json()).status).toBe('COMPLETED');
    await checkClosed(reg1, EG(23), t4);
    await checkDash(3, 2, { backlog: 18 });
  });
});

// ═════════════════════════════ 14. AUDIT ═════════════════════════════
test.describe('AUDIT', () => {
  test('TC-AUDIT-01 · เหตุการณ์และฟิลด์ใน Audit', async ({ h }) => {
    await h.reset();
    // 1
    const reg2 = await h.staff('off.reg2');
    await expectStatus(await reg2.post(`/api/officer/cases/${EG(28)}/claim`), 200, 'claim 28');
    // 2
    const reg1 = await h.staff('off.reg1');
    await expectStatus(await reg1.post(`/api/officer/cases/${EG(20)}/return`, { data: { reason: 'xxxxxxxxxx' } }), 200, 'return 20');
    // 3
    await expectStatus(await reg2.post(`/api/officer/cases/${EG(13)}/forward`, { data: {} }), 200, 'forward 13');
    // 4
    const head = await h.staff('head1');
    await expectStatus(await head.post(`/api/cases/${EG(13)}/approve`), 200, 'head approve 13');
    // 5
    await expectStatus(await reg2.post(`/api/cases/${EG(25)}/approve`), 200, 'approve 25');
    const iss = await reg2.post(`/api/officer/cases/${EG(25)}/issue`);
    await expectStatus(iss, 200, 'issue 25');
    expect((await iss.json()).docNo).toBe('DOC-2569-000002');
    await expectStatus(await reg2.post(`/api/cases/${EG(26)}/reject`, { data: { reason: 'xxxxxxxxxx' } }), 200, 'reject 26');
    await expectStatus(await reg2.post(`/api/officer/cases/${EG(25)}/unmask`, { data: { reason: 'ตรวจสอบตัวตนซ้ำ' } }), 200, 'unmask 25');
    // 6
    const ex = await h.staff('exec1');
    await expectStatus(await ex.get('/api/dashboard/export?format=xlsx&period=2026-12&service=ALL'), 200, 'export xlsx');
    // 7
    const admin = await h.staff('admin1');
    await expectStatus(await admin.put('/api/admin/services/SV-01', { data: { fee: 25, sla: 3 } }), 200, 'admin SV-01');
    // 8
    const { page, req } = await h.staffPage('audit1');
    await openAudit(page);

    await expect(tid(page, 'audit-count')).toHaveText('16');
    await expect(tid(page, 'audit-row')).toHaveCount(16);
    const rows = await auditRows(page);

    // ลำดับใหม่ → เก่า
    const expectedOrder = [
      ['STAFF_LOGIN', 'audit1'], ['ADMIN_CHANGE', 'admin1'], ['STAFF_LOGIN', 'admin1'], ['EXPORT', 'exec1'],
      ['STAFF_LOGIN', 'exec1'], ['UNMASK', 'off.reg2'], ['REJECT', 'off.reg2'], ['ISSUE', 'off.reg2'],
      ['APPROVE', 'off.reg2'], ['APPROVE', 'head1'], ['STAFF_LOGIN', 'head1'], ['FORWARD', 'off.reg2'],
      ['RETURN', 'off.reg1'], ['STAFF_LOGIN', 'off.reg1'], ['CLAIM', 'off.reg2'], ['STAFF_LOGIN', 'off.reg2'],
    ];
    expect(rows.map((r) => [r.event, r.actor]), 'ลำดับแถว (ใหม่ → เก่า)').toEqual(expectedOrder);
    for (let i = 0; i + 1 < rows.length; i++) {
      const a = Number(rows[i].id);
      const b = Number(rows[i + 1].id);
      if (!Number.isNaN(a) && !Number.isNaN(b)) expect(a, `data-id เรียงมาก → น้อย แถว ${i}`).toBeGreaterThan(b);
    }
    for (const r of rows) {
      expect(r.iso, `audit-time ${r.event}`).toBe(T0);
      expect(r.eventText, 'audit-event').toBe(r.event);
      expect(r.actorText, 'audit-actor').toBe(r.actor);
    }

    const count = (ev) => rows.filter((r) => r.event === ev).length;
    const want = { STAFF_LOGIN: 6, CLAIM: 1, RETURN: 1, FORWARD: 1, APPROVE: 2, ISSUE: 1, REJECT: 1, UNMASK: 1, EXPORT: 1, ADMIN_CHANGE: 1 };
    for (const [ev, n] of Object.entries(want)) expect(count(ev), `จำนวน ${ev}`).toBe(n);

    const roleOf = { 'off.reg2': 'officer', 'off.reg1': 'officer', head1: 'head', exec1: 'executive', admin1: 'admin', audit1: 'auditor' };
    const logins = rows.filter((r) => r.event === 'STAFF_LOGIN');
    expect(logins.map((r) => r.actor).sort()).toEqual(['admin1', 'audit1', 'exec1', 'head1', 'off.reg1', 'off.reg2']);
    for (const r of logins) {
      expect(r.role, `role ${r.actor}`).toBe(roleOf[r.actor]);
      expect(r.transition).toBe('–');
    }
    const one = (ev, caseNo) => {
      const f = rows.filter((r) => r.event === ev && (!caseNo || r.caseText === caseNo));
      expect(f.length, `${ev} ${caseNo || ''}`).toBe(1);
      return f[0];
    };
    const chk = (r, actor, role, caseNo, transition, detail) => {
      expect(r.actor).toBe(actor);
      expect(r.role).toBe(role);
      if (caseNo) { expect(r.caseText).toBe(caseNo); expect(r.caseNo).toBe(caseNo); }
      expect(r.transition).toBe(transition);
      for (const d of detail) expect(r.detail).toContain(d);
    };
    chk(one('CLAIM'), 'off.reg2', 'officer', EG(28), 'SUBMITTED → IN_REVIEW', []);
    chk(one('RETURN'), 'off.reg1', 'officer', EG(20), 'IN_REVIEW → NEED_FIX', ['xxxxxxxxxx']);
    chk(one('FORWARD'), 'off.reg2', 'officer', EG(13), 'IN_REVIEW → PENDING_APPROVAL', []);
    chk(one('APPROVE', EG(13)), 'head1', 'head', EG(13), 'PENDING_APPROVAL → APPROVED', []);
    chk(one('APPROVE', EG(25)), 'off.reg2', 'officer', EG(25), 'IN_REVIEW → APPROVED', []);
    chk(one('ISSUE'), 'off.reg2', 'officer', EG(25), 'APPROVED → COMPLETED', ['DOC-2569-000002']);
    chk(one('REJECT'), 'off.reg2', 'officer', EG(26), 'IN_REVIEW → REJECTED', ['xxxxxxxxxx']);
    chk(one('UNMASK'), 'off.reg2', 'officer', EG(25), '–', ['ตรวจสอบตัวตนซ้ำ']);
    chk(one('EXPORT'), 'exec1', 'executive', null, '–', ['xlsx', '2026-12']);
    chk(one('ADMIN_CHANGE'), 'admin1', 'admin', null, '–', ['SV-01 fee 20 → 25']);

    // API ต้องตรงกับจอ
    const api = await (await req.get('/api/audit')).json();
    expect(api.count).toBe(16);
    expect(api.items.map((i) => [i.event, i.username])).toEqual(expectedOrder);
    for (const i of api.items) expect(i.time).toBe(T0);

    // กรอง
    await auditFilter(page, { actor: 'off.reg2' });
    await expect(tid(page, 'audit-count')).toHaveText('7');
    await expect(tid(page, 'audit-row')).toHaveCount(7);
    expect((await auditRows(page)).map((r) => r.event).sort())
      .toEqual(['APPROVE', 'CLAIM', 'FORWARD', 'ISSUE', 'REJECT', 'STAFF_LOGIN', 'UNMASK']);
    await auditFilter(page, { event: 'APPROVE' });
    await expect(tid(page, 'audit-count')).toHaveText('2');
    expect((await auditRows(page)).map((r) => r.actor).sort()).toEqual(['head1', 'off.reg2']);
    await auditFilter(page, { actor: 'off.reg2', event: 'APPROVE' });
    await expect(tid(page, 'audit-count')).toHaveText('1');
    await expect(tid(page, 'audit-row')).toHaveAttribute('data-actor', 'off.reg2');

    // CSV (ไม่กรอง)
    await auditFilter(page, {});
    await expect(tid(page, 'audit-count')).toHaveText('16');
    await expect(tid(page, 'audit-export-csv-btn')).toHaveText('ส่งออก CSV');
    const { buf } = await download(page, tid(page, 'audit-export-csv-btn'));
    const csv = parseCsv(buf.toString('utf8').replace(/^﻿/, ''));
    expect(csv[0].join(','), 'หัว CSV').toBe('time,username,role,event,caseNo,fromStatus,toStatus,detail');
    expect(csv.length - 1, 'จำนวนแถวข้อมูล CSV').toBe(16);
    expect(csv.slice(1).map((r) => [r[3], r[1]]), 'ลำดับใน CSV = จอ').toEqual(expectedOrder);

    await auditFilter(page, {});
    await expect(tid(page, 'audit-count')).toHaveText('17');
    const top = (await auditRows(page))[0];
    expect(top.event).toBe('EXPORT');
    expect(top.actor).toBe('audit1');
    expect(top.detail).toContain('audit-csv');
  });

  test('TC-AUDIT-02 · Audit แก้/ลบไม่ได้ (405)', async ({ h }) => {
    await h.reset();
    const aud = await h.staffPage('audit1');
    let r = await aud.req.get('/api/audit');
    await expectStatus(r, 200, 'audit GET');
    const before = (await r.json()).items;
    expect(before.length).toBe(1);
    expect(before[0].event).toBe('STAFF_LOGIN');
    const id = before[0].id;

    const admin = await h.staff('admin1');
    for (const [who, req] of [['admin1', admin], ['audit1', aud.req]]) {
      const tries = [
        ['PUT', `/api/audit/${id}`, { detail: 'x' }],
        ['PATCH', `/api/audit/${id}`, { detail: 'x' }],
        ['DELETE', `/api/audit/${id}`, undefined],
        ['PUT', '/api/audit', { detail: 'x' }],
        ['DELETE', '/api/audit', undefined],
        ['DELETE', '/api/audit/999999', undefined],
      ];
      for (const [method, url, data] of tries) {
        const res = await req.fetch(url, { method, data });
        await expectErr(res, 405, 'METHOD_NOT_ALLOWED', undefined, `${who} ${method} ${url}`);
      }
    }

    r = await aud.req.get('/api/audit');
    const after = (await r.json()).items;
    for (const b of before) {
      const a = after.find((x) => String(x.id) === String(b.id));
      expect(a, `แถว ${b.id} ยังอยู่`).toBeTruthy();
      expect(a).toEqual(b);
    }
    const added = after.filter((x) => !before.some((b) => String(b.id) === String(x.id)));
    expect(added.length, 'เพิ่มได้เฉพาะ STAFF_LOGIN ของ admin1').toBe(1);
    expect(added[0].event).toBe('STAFF_LOGIN');
    expect(added[0].username).toBe('admin1');

    // UI ไม่มีปุ่มแก้/ลบ
    await openAudit(aud.page);
    await expect(tid(aud.page, 'audit-row').first()).toBeVisible();
    await expect(tid(aud.page, 'audit-edit-btn')).toHaveCount(0);
    await expect(tid(aud.page, 'audit-delete-btn')).toHaveCount(0);

    // admin อ่าน audit ไม่ได้
    await expectStatus(await admin.get('/api/audit'), 403, 'admin GET /api/audit');
  });

  test('TC-AUDIT-03 · กรองช่วงวันที่ตามเวลาไทย', async ({ h }) => {
    await h.reset();
    const L = {
      L1: ['2026-11-30T23:59:59+07:00', 'off.reg1'],
      L2: ['2026-12-01T00:00:00+07:00', 'off.reg2'],
      L3: ['2026-12-01T23:59:59+07:00', 'off.works1'],
      L4: ['2026-12-02T00:00:00+07:00', 'off.reg1'],
      L5: ['2026-12-02T09:00:00+07:00', 'audit1'],
    };
    for (const k of ['L1', 'L2', 'L3', 'L4']) {
      await h.clock(L[k][0]);
      await h.staff(L[k][1]);
    }
    await h.clock(L.L5[0]);
    const { page, req } = await h.staffPage('audit1');
    await openAudit(page);

    const cases = [
      ['2026-12-01', '2026-12-01', '', ['L2', 'L3']],
      ['2026-11-30', '2026-11-30', '', ['L1']],
      ['2026-11-30', '2026-12-01', '', ['L1', 'L2', 'L3']],
      ['2026-12-02', '', '', ['L4', 'L5']],
      ['', '2026-11-30', '', ['L1']],
      ['2026-12-01', '2026-12-02', '', ['L2', 'L3', 'L4', 'L5']],
      ['2026-12-01', '2026-12-01', 'off.reg2', ['L2']],
    ];
    for (const [from, to, actor, keys] of cases) {
      const label = `from=${from || '(ว่าง)'} to=${to || '(ว่าง)'} actor=${actor || '-'}`;
      // newest first
      const expIso = keys.map((k) => L[k][0]).reverse();
      const expActors = keys.map((k) => L[k][1]).reverse();

      await auditFilter(page, { from, to, actor });
      await expect(tid(page, 'audit-count'), label).toHaveText(String(keys.length));
      await expect(tid(page, 'audit-row'), label).toHaveCount(keys.length);
      const rows = await auditRows(page);
      expect(rows.map((r) => r.iso), `${label} data-iso`).toEqual(expIso);
      expect(rows.map((r) => r.actor), `${label} actor`).toEqual(expActors);

      const res = await req.get(`/api/audit?actor=${encodeURIComponent(actor)}&event=&from=${from}&to=${to}`);
      await expectStatus(res, 200, label);
      const j = await res.json();
      expect(j.count, `API ${label}`).toBe(keys.length);
      expect(j.items.map((i) => i.time), `API ${label} time`).toEqual(expIso);
    }
  });
});

// ═════════════════════════════ 15. RBAC ═════════════════════════════
test.describe('RBAC', () => {
  test('TC-RBAC-01 · ประชาชนเปิดคำขอคนอื่นไม่ได้ (IDOR)', async ({ h }) => {
    await h.reset();
    const { page, req } = await h.citizenPage(ID.somying);

    const resp = await page.goto(`/citizen/cases/${EG(5)}`);
    expect(resp && resp.status(), 'HTTP 404').toBe(404);
    await expect(tid(page, 'not-found-msg')).toHaveText('ไม่พบคำขอ');
    await expect(tid(page, 'case-no')).toHaveCount(0);
    await expect(tid(page, 'case-status')).toHaveCount(0);
    expect(await page.content()).not.toContain('สมชาย');

    const r1 = await req.get(`/api/cases/${EG(5)}`);
    await expectStatus(r1, 404, 'GET case ของสมชาย');
    expect(await r1.json()).toEqual({ code: 'NOT_FOUND', message: 'ไม่พบคำขอ' });
    const r2 = await req.get('/api/cases/EG-2569-999999');
    await expectStatus(r2, 404, 'GET case ไม่มีจริง');
    expect(await r2.text(), 'เนื้อหาเหมือนกันทุกตัวอักษร').toBe(await r1.text());

    await expectStatus(await req.get('/api/documents/DOC-2569-000001/pdf'), 404, 'PDF ของสมชาย');
    await expectStatus(await req.get('/api/drafts/DR-0001'), 404, 'ร่างของสมชาย');
    await expectStatus(await req.post(`/api/cases/${EG(30)}/cancel`), 404, 'ยกเลิกของสมชาย');

    const own = await page.goto(`/citizen/cases/${EG(7)}`);
    expect(own && own.status()).toBe(200);
    await expect(tid(page, 'case-no')).toHaveText(EG(7));

    const somchai = await h.citizen(ID.somchai);
    await expectStatus(await somchai.get(`/api/cases/${EG(5)}`), 200, 'สมชาย GET ของตัวเอง');
  });

  test('TC-RBAC-02 · เจ้าหน้าที่อนุมัติ SV-02 ไม่ได้ (API)', async ({ h }) => {
    await h.reset();
    const reg2 = await h.staffPage('off.reg2');
    const statusOf = async (req, caseNo) => (await (await req.get(`/api/cases/${caseNo}`)).json()).status;

    // 1
    await expectErr(await reg2.req.post(`/api/cases/${EG(14)}/approve`), 403, 'FORBIDDEN', undefined, 'reg2 approve 14');
    expect(await statusOf(reg2.req, EG(14))).toBe('PENDING_APPROVAL');
    // 2
    await expectErr(await reg2.req.post(`/api/cases/${EG(13)}/approve`), 403, 'FORBIDDEN', undefined, 'reg2 approve 13');
    expect(await statusOf(reg2.req, EG(13))).toBe('IN_REVIEW');
    // 3
    await expectStatus(await reg2.req.post(`/api/cases/${EG(14)}/reject`, { data: { reason: 'xxxxxxxxxx' } }), 403, 'reg2 reject 14');
    expect(await statusOf(reg2.req, EG(14))).toBe('PENDING_APPROVAL');
    // 4
    for (const n of [13, 14]) {
      await reg2.page.goto(`/officer/cases/${EG(n)}`);
      await expect(tid(reg2.page, 'case-no')).toHaveText(EG(n));
      await expect(tid(reg2.page, 'case-status')).toBeVisible();
      await expect(tid(reg2.page, 'approve-btn'), `approve-btn ใน ${EG(n)}`).toHaveCount(0);
    }
    // 5
    const head = await h.staff('head1');
    await expectStatus(await head.post(`/api/cases/${EG(25)}/approve`), 403, 'head approve SV-01');
    expect(await statusOf(head, EG(25))).toBe('IN_REVIEW');
    // 6
    const ok = await head.post(`/api/cases/${EG(14)}/approve`);
    await expectStatus(ok, 200, 'head approve 14');
    expect((await ok.json()).status).toBe('APPROVED');
    // 7
    const aud = await h.staffPage('audit1');
    await openAudit(aud.page);
    await auditFilter(aud.page, { event: 'APPROVE' });
    await expect(tid(aud.page, 'audit-count')).toHaveText('1');
    const rows = await auditRows(aud.page);
    expect(rows.length).toBe(1);
    expect(rows[0].actor).toBe('head1');
    expect(rows[0].caseText).toBe(EG(14));
  });

  test('TC-RBAC-03 · ตารางสิทธิ์หน้า/API ตามบทบาท', async ({ h }) => {
    test.setTimeout(300_000);
    const ROLES = ['anon', 'citizen', 'officer', 'head', 'executive', 'auditor', 'admin'];
    const USER = { officer: 'off.reg1', head: 'head1', executive: 'exec1', auditor: 'audit1', admin: 'admin1' };
    const NAV = {
      citizen: ['nav-my-cases'],
      officer: ['nav-queue', 'nav-bell'],
      head: ['nav-queue', 'nav-approvals', 'nav-bell'],
      executive: ['nav-dashboard'],
      auditor: ['nav-audit'],
      admin: ['nav-admin-services', 'nav-admin-holidays', 'nav-admin-users'],
    };
    // ✓ = 'ok' · 403 · '→' = redirect /login
    const PAGES = [
      ['/citizen', 'citizen-welcome', ['→', 'ok', 403, 403, 403, 403, 403]],
      ['/officer/queue', 'queue-table', ['→', 403, 'ok', 'ok', 403, 403, 403]],
      ['/head/approvals', 'approval-row', ['→', 403, 403, 'ok', 403, 403, 403]],
      ['/dashboard', 'kpi-received', ['→', 403, 403, 403, 'ok', 403, 403]],
      ['/audit', 'audit-count', ['→', 403, 403, 403, 403, 'ok', 403]],
      ['/admin/services', 'service-row', ['→', 403, 403, 403, 403, 403, 'ok']],
      ['/admin/holidays', 'holiday-row', ['→', 403, 403, 403, 403, 403, 'ok']],
      ['/admin/users', 'user-row', ['→', 403, 403, 403, 403, 403, 'ok']],
      ['/notifications', null, ['→', 403, 'ok', 'ok', 403, 403, 403]],
      ['/verify/K7M2Q9XA', 'verify-result', ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok']],
    ];
    const APIS = [
      ['GET', '/api/officer/queue', null, [401, 403, 200, 200, 403, 403, 403]],
      ['GET', '/api/notifications', null, [401, 403, 200, 200, 403, 403, 403]],
      ['GET', '/api/dashboard?period=2026-12&service=ALL', null, [401, 403, 403, 403, 200, 403, 403]],
      ['GET', '/api/audit', null, [401, 403, 403, 403, 403, 200, 403]],
      ['GET', '/api/admin/services', null, [401, 403, 403, 403, 403, 403, 200]],
      ['POST', '/api/drafts', { serviceId: 'SV-01', qty: 1 }, [401, 201, 403, 403, 403, 403, 403]],
      ['GET', `/api/cases/${EG(25)}`, null, [401, 200, 200, 200, 403, 403, 403], 'somying'],
    ];
    const CLAIM = [401, 403, 200, 403, 403, 403, 403];

    for (let ri = 0; ri < ROLES.length; ri++) {
      const role = ROLES[ri];
      await h.reset();
      let p;
      if (role === 'anon') p = await h.page();
      else if (role === 'citizen') p = await h.citizenPage(ID.somchai);
      else p = await h.staffPage(USER[role]);
      const { page, req } = p;

      // ส่วน D เมนู
      if (role !== 'anon') {
        await page.goto('/');
        await expect(tid(page, 'app-header'), `${role} app-header`).toBeVisible();
        for (const n of NAV[role]) await expect(tid(page, n).first(), `${role} ต้องมี ${n}`).toBeVisible();
        for (const n of ALL_NAV.filter((x) => !NAV[role].includes(x))) {
          await expect(tid(page, n), `${role} ต้องไม่มี ${n}`).toHaveCount(0);
        }
      }

      // ส่วน A หน้า
      for (const [path, ready, exp] of PAGES) {
        const want = exp[ri];
        const label = `${role} ${path}`;
        const resp = await page.goto(path);
        if (want === '→') {
          await expect(page, label).toHaveURL(/\/login(\?.*)?$/);
        } else if (want === 403) {
          expect(resp && resp.status(), `${label} HTTP`).toBe(403);
          await expect(tid(page, 'forbidden-msg'), label).toHaveText('ไม่มีสิทธิ์เข้าถึงหน้านี้');
        } else {
          expect(resp && resp.status(), `${label} HTTP`).toBe(200);
          expect(new URL(page.url()).pathname, label).toBe(path);
          if (ready) await expect(tid(page, ready).first(), `${label} โหลดเนื้อหา`).toBeVisible();
          else await expect(page.locator(`${sel('noti-item')}, ${sel('noti-empty')}`).first(), label).toBeVisible();
          await expect(tid(page, 'forbidden-msg'), label).toHaveCount(0);
        }
      }

      // ส่วน B API
      const somying = role === 'citizen' ? await h.citizen(ID.somying) : null;
      for (const [method, url, data, exp, who] of APIS) {
        const useReq = who === 'somying' && somying ? somying : req;
        const res = await useReq.fetch(url, { method, data: data || undefined });
        await expectStatus(res, exp[ri], `${role} ${method} ${url}`);
      }
      // claim เรียกท้ายสุด
      await expectStatus(await req.post(`/api/officer/cases/${EG(28)}/claim`), CLAIM[ri], `${role} claim 28`);
    }

    // ส่วน C ขอบเขตแผนก
    await h.reset();
    const works = await h.staff('off.works1');
    const reg1 = await h.staff('off.reg1');
    await expectStatus(await works.post(`/api/officer/cases/${EG(28)}/claim`), 403, 'works1 claim 28');
    await expectStatus(await reg1.post(`/api/officer/cases/${EG(10)}/claim`), 403, 'reg1 claim 10');
    const q = await (await works.get('/api/officer/queue?filter=all')).json();
    expect(q.items.map((i) => i.caseNo), 'คิวโยธา').toEqual([EG(10)]);
  });

  test('TC-RBAC-04 · ผู้ดูแลระบบ: บริการ วันหยุด ผู้ใช้ และยอดที่ล็อก', async ({ h }) => {
    test.setTimeout(180_000);
    await h.reset();
    const admin = await h.staffPage('admin1');
    admin.page.on('dialog', (d) => d.accept());

    // 1
    await admin.page.goto('/admin/holidays');
    await expect(tid(admin.page, 'holiday-row')).toHaveCount(4);
    const dates = await tid(admin.page, 'holiday-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-date')));
    expect(dates.sort()).toEqual(['2026-12-07', '2026-12-10', '2026-12-31', '2027-01-01']);

    // 2 NEW_PAID ก่อนแก้
    const p1 = await h.newPaid({ service: 'SV-01', qty: 1, at: T0 });
    expect(p1.caseNo).toBe(EG(31));
    const somchaiReq = p1.req;
    let c = await (await somchaiReq.get(`/api/cases/${EG(31)}`)).json();
    expect(c.dueAt).toBe('2026-12-04T16:30:00+07:00');

    // 3 แก้ค่าธรรมเนียม
    await admin.page.goto('/admin/services');
    for (const [svc, fee] of [['SV-01', '25'], ['SV-02', '600']]) {
      await tid(admin.page, `svc-fee-${svc}`).fill(fee);
      const [res] = await Promise.all([
        admin.page.waitForResponse((r) => r.url().includes(`/api/admin/services/${svc}`) && r.request().method() !== 'GET'),
        tid(admin.page, `svc-save-${svc}`).click(),
      ]);
      expect(res.status(), `save ${svc}`).toBe(200);
      await expect(tid(admin.page, 'action-success'), `action-success ${svc}`).toBeVisible();
    }

    // 4 ร่างใหม่ใช้ราคาใหม่
    const sc = await h.page();
    await h.citizen(ID.somchai, sc.req);
    await sc.page.goto('/citizen/new/SV-01');
    await tid(sc.page, 'qty-input').fill('5');
    await expect(tid(sc.page, 'fee-total')).toHaveText('฿125');
    await tid(sc.page, 'qty-input').fill('1');
    await expect(tid(sc.page, 'fee-total')).toHaveText('฿25');
    await sc.page.goto('/citizen/new/SV-02');
    await expect(tid(sc.page, 'fee-total')).toHaveText('฿600');
    await sc.page.goto(`/citizen/cases/${EG(30)}`);
    await expect(tid(sc.page, 'case-fee')).toHaveText('฿20');

    // 5 ยอดที่ล็อกของ PP-0001
    await sc.page.goto('/citizen/new/SV-02?draft=DR-0002');
    await expect(tid(sc.page, 'payment-amount')).toHaveText('฿500');
    const hook = await h.hook();
    await expectErr(await hook.post('/api/test/payments/PP-0001/pay', { data: { amount: 600 } }), 422, 'AMOUNT_MISMATCH', 'ยอดเงินไม่ตรงกับค่าธรรมเนียม', 'pay 600');
    const paid = await hook.post('/api/test/payments/PP-0001/pay', { data: { amount: 500 } });
    await expectStatus(paid, 200, 'pay 500');
    const pj = await paid.json();
    expect(pj.status).toBe('PAID');
    expect(pj.caseNo).toBe(EG(32));

    // 6 เพิ่มวันหยุด
    await admin.page.goto('/admin/holidays');
    await tid(admin.page, 'holiday-date-input').fill('2026-12-02');
    await tid(admin.page, 'holiday-name-input').fill('วันหยุดทดสอบ');
    await tid(admin.page, 'holiday-add-btn').click();
    await expect(tid(admin.page, 'holiday-row')).toHaveCount(5);
    c = await (await somchaiReq.get(`/api/cases/${EG(31)}`)).json();
    expect(c.dueAt, 'dueAt เดิมไม่คำนวณใหม่').toBe('2026-12-04T16:30:00+07:00');

    // 7 NEW_PAID หลังเพิ่มวันหยุด
    const p3 = await h.newPaid({ service: 'SV-01', qty: 1, at: T0, req: somchaiReq });
    expect(p3.caseNo).toBe(EG(33));
    expect(p3.fee).toBe(25);
    c = await (await somchaiReq.get(`/api/cases/${EG(33)}`)).json();
    expect(c.dueAt).toBe('2026-12-08T16:30:00+07:00');

    // 8 เปลี่ยนบทบาท exec1 → auditor
    await expectStatus(await admin.req.put('/api/admin/users/exec1', { data: { role: 'auditor', dept: '' } }), 200, 'PUT users/exec1');
    const ex = await h.page();
    const lr = await ex.req.post('/api/auth/staff/login', { data: { username: 'exec1', password: PW } });
    await expectStatus(lr, 200, 'exec1 login ใหม่');
    expect((await lr.json()).landing).toBe('/audit');
    await ex.page.goto('/');
    await expect(ex.page).toHaveURL(/\/audit$/);
    const dresp = await ex.page.goto('/dashboard');
    expect(dresp && dresp.status()).toBe(403);
    await expect(tid(ex.page, 'forbidden-msg')).toHaveText('ไม่มีสิทธิ์เข้าถึงหน้านี้');

    // 9 Audit ADMIN_CHANGE = 4
    await openAudit(ex.page);
    await auditFilter(ex.page, { event: 'ADMIN_CHANGE' });
    await expect(tid(ex.page, 'audit-count')).toHaveText('4');
    let rows = await auditRows(ex.page);
    for (const r of rows) { expect(r.actor).toBe('admin1'); expect(r.role).toBe('admin'); }
    const details = rows.map((r) => r.detail).join('\n');
    for (const d of ['SV-01 fee 20 → 25', 'SV-02 fee 500 → 600', 'holiday add 2026-12-02', 'exec1 role executive → auditor']) {
      expect(details).toContain(d);
    }

    // 10 admin ทำรายการคำขอไม่ได้
    await expectStatus(await admin.req.post('/api/drafts', { data: { serviceId: 'SV-01', qty: 1 } }), 403, 'admin POST drafts');

    // 11 ลบวันหยุด
    await admin.page.goto('/admin/holidays');
    await expect(tid(admin.page, 'holiday-row')).toHaveCount(5);
    await tid(rowOf(admin.page, 'holiday-row', 'data-date', '2026-12-02'), 'holiday-delete-btn').click();
    await expect(tid(admin.page, 'holiday-row')).toHaveCount(4);
    await auditFilter(ex.page, { event: 'ADMIN_CHANGE' });
    await expect(tid(ex.page, 'audit-count')).toHaveText('5');
    rows = await auditRows(ex.page);
    expect(rows.map((r) => r.detail).join('\n')).toContain('holiday delete 2026-12-02');
  });

  test('TC-RBAC-05 · สิทธิ์เปิด/ดาวน์โหลดไฟล์แนบ', async ({ h }) => {
    test.setTimeout(180_000);
    await h.reset();
    const S = {
      'off.reg1': await h.staff('off.reg1'),
      'off.reg2': await h.staff('off.reg2'),
      'off.works1': await h.staff('off.works1'),
      head1: await h.staff('head1'),
      exec1: await h.staff('exec1'),
      audit1: await h.staff('audit1'),
      admin1: await h.staff('admin1'),
      somying: await h.citizen(ID.somying),
      somchai: await h.citizen(ID.somchai),
      anon: await h.api(),
    };
    const SV01 = ['id-card.pdf'];
    const SV03 = ['deed.pdf', 'id-card.pdf', 'plan.pdf'];

    // fileId อ้างอิง (จาก head1 ซึ่งเห็นทุกแผนก)
    /** @type {Record<string, any[]>} */
    const ref = {};
    for (const n of [25, 10, 12, 11]) {
      const r = await S.head1.get(`/api/cases/${EG(n)}/files`);
      await expectStatus(r, 200, `head1 files ${n}`);
      ref[EG(n)] = (await r.json()).items;
      expect(ref[EG(n)].length).toBeGreaterThan(0);
    }

    const checkFile = async (req, fileId, code, label) => {
      const r = await req.get(`/api/files/${fileId}`);
      await expectStatus(r, code, `${label} /api/files`);
      if (code === 200) {
        expect(r.headers()['content-type'] || '', `${label} content-type`).toContain('application/pdf');
        expect((await r.body()).subarray(0, 4).toString('latin1'), `${label} %PDF`).toBe('%PDF');
      }
    };
    const rows = [
      ['off.reg1', 25, 200, SV01],
      ['off.works1', 25, 403],
      ['off.reg2', 12, 200, SV03],
      ['off.works1', 12, 403],
      ['off.works1', 10, 200, SV03],
      ['off.reg1', 10, 200, SV03],
      ['off.works1', 11, 200, SV03],
      ['head1', 25, 200, SV01],
      ['head1', 10, 200, SV03],
      ['head1', 12, 200, SV03],
      ['somying', 25, 200, SV01],
      ['somchai', 25, 404],
      ['exec1', 25, 403],
      ['audit1', 25, 403],
      ['admin1', 25, 403],
      ['anon', 25, 401],
    ];
    for (const [who, n, code, names] of rows) {
      const label = `${who} ${EG(n)}`;
      const r = await S[who].get(`/api/cases/${EG(n)}/files`);
      await expectStatus(r, code, `${label} /files`);
      if (code === 200) {
        const items = (await r.json()).items;
        expect(items.map((i) => i.name).sort(), `${label} รายชื่อไฟล์`).toEqual(names);
        for (const it of items) await checkFile(S[who], it.fileId, 200, `${label} ${it.name}`);
      } else {
        await checkFile(S[who], ref[EG(n)][0].fileId, code, label);
      }
    }
    await expectStatus(await S['off.reg1'].get('/api/files/no-such-file-000000'), 404, 'fileId ไม่มี');

    // UI
    const reg1 = await h.staffPage('off.reg1');
    await reg1.page.goto(`/officer/cases/${EG(25)}`);
    await expect(tid(reg1.page, 'doc-item')).toHaveCount(1);
    await expect(tid(reg1.page, 'doc-item')).toHaveAttribute('data-name', 'id-card.pdf');
    const link = tid(tid(reg1.page, 'doc-item'), 'doc-download-link');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href, 'doc-download-link href').toContain('/api/files/');
    const fr = await reg1.req.get(/** @type {string} */ (href));
    await expectStatus(fr, 200, 'ดาวน์โหลดจากลิงก์');
    expect((await fr.body()).length).toBeGreaterThan(0);

    const reg2 = await h.staffPage('off.reg2');
    await reg2.page.goto(`/officer/cases/${EG(12)}`);
    await expect(tid(reg2.page, 'doc-item')).toHaveCount(3);

    const sy = await h.citizenPage(ID.somying);
    await sy.page.goto(`/citizen/cases/${EG(25)}`);
    await expect(tid(sy.page, 'doc-item')).toHaveCount(1);
  });

  test('TC-RBAC-06 · ผู้ดูแลระบบ: ช่วงค่าที่ยอมรับ', async ({ h }) => {
    test.setTimeout(180_000);
    await h.reset();
    const { page, req } = await h.staffPage('admin1');
    page.on('dialog', (d) => d.accept());
    const FEE_ERR = 'ค่าธรรมเนียมต้องเป็นจำนวนเต็ม 0–100,000 บาท';
    const SLA_ERR = 'SLA ต้องเป็นจำนวนเต็ม 1–60 วันทำการ';
    const sv01 = async () => (await (await req.get('/api/admin/services')).json()).items.find((s) => s.id === 'SV-01');

    await page.goto('/admin/services');
    await expect(tid(page, 'svc-fee-SV-01')).toBeVisible();

    const uiSave = async (fee, sla) => {
      await tid(page, 'svc-fee-SV-01').fill(String(fee));
      await tid(page, 'svc-sla-SV-01').fill(String(sla));
      await tid(page, 'svc-save-SV-01').click();
    };
    const uiReject = async (fee, sla, msg, keep) => {
      await uiSave(fee, sla);
      await expect(tid(page, 'action-error'), `fee=${fee} sla=${sla}`).toHaveText(msg);
      const s = await sv01();
      expect(s.fee, 'ค่าไม่เปลี่ยน (fee)').toBe(keep.fee);
      expect(s.sla, 'ค่าไม่เปลี่ยน (sla)').toBe(keep.sla);
    };
    const uiAccept = async (fee, sla) => {
      await uiSave(fee, sla);
      await expect(tid(page, 'action-success'), `fee=${fee} sla=${sla}`).toBeVisible();
      await expect.poll(async () => { const s = await sv01(); return [s.fee, s.sla]; }).toEqual([fee, sla]);
    };

    // fee (sla คงที่ 3)
    await uiReject(-1, 3, FEE_ERR, { fee: 20, sla: 3 });
    await expectErr(await req.put('/api/admin/services/SV-01', { data: { fee: -1, sla: 3 } }), 400, 'INVALID_FEE', FEE_ERR, 'API fee -1');
    await uiAccept(0, 3);
    await uiAccept(100000, 3);
    await uiReject(100001, 3, FEE_ERR, { fee: 100000, sla: 3 });
    await expectErr(await req.put('/api/admin/services/SV-01', { data: { fee: 100001, sla: 3 } }), 400, 'INVALID_FEE', FEE_ERR, 'API fee 100001');
    // sla (fee คงที่ 100000)
    await uiReject(100000, 0, SLA_ERR, { fee: 100000, sla: 3 });
    await expectErr(await req.put('/api/admin/services/SV-01', { data: { fee: 100000, sla: 0 } }), 400, 'INVALID_SLA', SLA_ERR, 'API sla 0');
    await uiAccept(100000, 1);
    await uiAccept(100000, 60);
    await uiReject(100000, 61, SLA_ERR, { fee: 100000, sla: 60 });
    await expectErr(await req.put('/api/admin/services/SV-01', { data: { fee: 100000, sla: 61 } }), 400, 'INVALID_SLA', SLA_ERR, 'API sla 61');

    // วันหยุดซ้ำ
    await expectErr(await req.post('/api/admin/holidays', { data: { date: '2026-12-07', name: 'ซ้ำ' } }), 409, 'DUPLICATE_HOLIDAY', 'มีวันหยุดนี้อยู่แล้ว', 'holiday ซ้ำ');
    await page.goto('/admin/holidays');
    await expect(tid(page, 'holiday-row')).toHaveCount(4);
    await tid(page, 'holiday-date-input').fill('2026-12-07');
    await tid(page, 'holiday-name-input').fill('ซ้ำ');
    await tid(page, 'holiday-add-btn').click();
    await expect(tid(page, 'action-error')).toHaveText('มีวันหยุดนี้อยู่แล้ว');
    await expect(tid(page, 'holiday-row')).toHaveCount(4);
    // วันเสาร์ยอมรับ
    await expectStatus(await req.post('/api/admin/holidays', { data: { date: '2026-12-05', name: 'วันเสาร์' } }), 201, 'holiday 2026-12-05');

    // เปลี่ยนบทบาทตัวเอง
    await expectErr(await req.put('/api/admin/users/admin1', { data: { role: 'executive', dept: '' } }), 409, 'SELF_ROLE_CHANGE', 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้', 'self role');
    expect((await (await req.get('/api/me')).json()).role).toBe('admin');

    // Audit ADMIN_CHANGE = 5
    const aud = await h.staffPage('audit1');
    await openAudit(aud.page);
    await auditFilter(aud.page, { event: 'ADMIN_CHANGE' });
    await expect(tid(aud.page, 'audit-count')).toHaveText('5');
    const details = (await auditRows(aud.page)).map((r) => r.detail).join('\n');
    expect(details).toContain('holiday add 2026-12-05');
    for (const d of ['fee 20 → 0', 'fee 0 → 100000', 'sla 3 → 1', 'sla 1 → 60']) expect(details).toContain(d);
  });
});

// ═════════════════════════════ 16. NFR ═════════════════════════════
test.describe('NFR', () => {
  const VIEWPORTS = [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ];

  async function uiLoginCitizen(page, idNo) {
    await page.goto('/login');
    const tab = tid(page, 'login-tab-citizen');
    if (await tab.count()) await tab.click();
    await tid(page, 'thaid-id-input').fill(idNo);
    await tid(page, 'thaid-submit').click();
    await tid(page, 'otp-input').fill(OTP);
    await tid(page, 'otp-submit').click();
    await page.waitForURL(/\/citizen$/);
  }

  test('TC-NFR-01 · Responsive 375/768/1280', async ({ h }) => {
    test.setTimeout(300_000);
    await h.reset();
    const P = {
      anon: await h.page(),
      somchai: await h.citizenPage(ID.somchai),
      reg1: await h.staffPage('off.reg1'),
      head: await h.staffPage('head1'),
      exec: await h.staffPage('exec1'),
      audit: await h.staffPage('audit1'),
      admin: await h.staffPage('admin1'),
    };
    const PAGES = [
      ['anon', '/login', 'thaid-id-input'],
      ['somchai', '/citizen', 'citizen-welcome'],
      ['somchai', '/citizen/new/SV-03', 'wizard-step'],
      ['somchai', `/citizen/cases/${EG(13)}`, 'case-no'],
      ['reg1', '/officer/queue', 'queue-table'],
      ['reg1', `/officer/cases/${EG(20)}`, 'case-no'],
      ['head', '/head/approvals', 'approval-row'],
      ['exec', '/dashboard', 'kpi-received'],
      ['audit', '/audit', 'audit-count'],
      ['admin', '/admin/services', 'service-row'],
      ['anon', '/verify/K7M2Q9XA', 'verify-result'],
    ];
    const failures = [];
    let checks = 0;
    for (const vp of VIEWPORTS) {
      for (const [who, path, ready] of PAGES) {
        const { page } = P[who];
        await page.setViewportSize(vp);
        await page.goto(path);
        await expect(tid(page, ready).first(), `${path} @${vp.width}`).toBeVisible();
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        checks++;
        if (m.sw > m.iw) failures.push(`${path} @${vp.width}: scrollWidth ${m.sw} > innerWidth ${m.iw}`);
      }
    }
    expect(checks).toBe(33);
    expect(failures, 'หน้าที่มี scroll แนวนอน').toEqual([]);

    // งานหลักที่ 375 px
    const m = await h.page({ viewport: { width: 375, height: 812 } });
    const page = m.page;
    await uiLoginCitizen(page, ID.somchai);
    await tid(page, 'start-service-SV-01').click();
    await expect(page).toHaveURL(/\/citizen\/new\/SV-01/);
    await tid(page, 'qty-input').fill('1');
    await expect(tid(page, 'fee-total')).toHaveText('฿20');
    await tid(page, 'to-upload-btn').click();
    await tid(page, 'upload-input-id-card').setInputFiles({ name: 'id-card.pdf', mimeType: 'application/pdf', buffer: pdfBuf(1024) });
    await expect(page.locator(`${sel('file-item')}[data-doc-key="id-card"]`)).toHaveCount(1);
    await expect(tid(page, 'to-payment-btn')).toBeEnabled();
    await tid(page, 'to-payment-btn').click();
    const qr = tid(page, 'create-qr-btn');
    await expect(qr).toBeVisible();
    const box = await qr.boundingBox();
    expect(box, 'create-qr-btn มีกรอบ').toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });

  test('TC-NFR-02 · WCAG: axe + คีย์บอร์ด + label + สถานะไม่ใช้สีอย่างเดียว', async ({ h }) => {
    test.setTimeout(300_000);
    let AxeBuilder;
    try {
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const mod = require('@axe-core/playwright');
      AxeBuilder = mod.default || mod.AxeBuilder;
    } catch {
      throw new Error('ต้องติดตั้ง @axe-core/playwright ใน e2e/package.json (TC-NFR-02 ส่วน A)');
    }
    await h.reset();
    const P = {
      anon: await h.page(),
      mana: await h.citizenPage(ID.mana, undefined, { expectRegistered: false }),
      somchai: await h.citizenPage(ID.somchai),
      reg1: await h.staffPage('off.reg1'),
      head: await h.staffPage('head1'),
      exec: await h.staffPage('exec1'),
      audit: await h.staffPage('audit1'),
      admin: await h.staffPage('admin1'),
    };
    const PAGES = [
      ['anon', '/login', 'thaid-id-input'],
      ['mana', '/register', 'reg-name'],
      ['somchai', '/citizen', 'citizen-welcome'],
      ['somchai', '/citizen/new/SV-01', 'wizard-step'],
      ['somchai', `/citizen/cases/${EG(17)}`, 'case-status'],
      ['reg1', '/officer/queue', 'queue-table'],
      ['reg1', `/officer/cases/${EG(20)}`, 'case-status'],
      ['head', '/head/approvals', 'approval-row'],
      ['exec', '/dashboard', 'kpi-received'],
      ['audit', '/audit', 'audit-count'],
      ['admin', '/admin/services', 'service-row'],
      ['reg1', '/notifications', 'noti-item'],
      ['anon', '/verify/K7M2Q9XA', 'verify-result'],
    ];

    // ส่วน A axe + ส่วน C label
    const axeFail = [];
    const labelFail = [];
    for (const [who, path, ready] of PAGES) {
      const { page } = P[who];
      await page.goto(path);
      await expect(tid(page, ready).first(), path).toBeVisible();
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      for (const v of res.violations) {
        if (v.impact === 'serious' || v.impact === 'critical') {
          axeFail.push(`${path}: [${v.impact}] ${v.id} × ${v.nodes.length} (${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')})`);
        }
      }
      const unlabeled = await page.evaluate(() => {
        const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const els = [...document.querySelectorAll('input, select, textarea')]
          .filter((e) => e.getAttribute('type') !== 'hidden' && visible(e));
        return els.filter((e) => {
          if ((e.getAttribute('aria-label') || '').trim()) return false;
          const lb = e.getAttribute('aria-labelledby');
          if (lb && lb.split(/\s+/).some((i) => { const t = document.getElementById(i); return t && t.textContent.trim(); })) return false;
          // @ts-ignore
          if (e.labels && [...e.labels].some((l) => l.textContent.trim())) return false;
          return true;
        }).map((e) => (e.getAttribute('data-testid') || e.outerHTML.slice(0, 100)));
      });
      for (const u of unlabeled) labelFail.push(`${path}: ${u}`);
    }
    expect(axeFail, 'axe serious/critical').toEqual([]);
    expect(labelFail, 'ช่องกรอกที่ไม่มีชื่อที่เข้าถึงได้').toEqual([]);

    // ส่วน B คีย์บอร์ดอย่างเดียว
    const kb = await h.page();
    const page = kb.page;
    const focusFail = [];
    const focusInfo = () => page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body || e === document.documentElement) return null;
      const cs = getComputedStyle(e);
      return {
        tid: e.getAttribute('data-testid'),
        desc: e.getAttribute('data-testid') || `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}`,
        outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth) || 0,
        boxShadow: cs.boxShadow,
      };
    });
    const checkRing = (info) => {
      const ok = (info.outlineStyle !== 'none' && info.outlineWidth > 0) || (info.boxShadow && info.boxShadow !== 'none');
      if (!ok) focusFail.push(`${page.url()} ${info.desc}`);
    };
    const tabTo = async (target, max = 60) => {
      const cur = await focusInfo();
      if (cur && cur.tid === target) { checkRing(cur); return; }
      for (let i = 0; i < max; i++) {
        await page.keyboard.press('Tab');
        const info = await focusInfo();
        if (!info) continue;
        checkRing(info);
        if (info.tid === target) return;
        if (info.tid === 'login-tab-citizen' && !(await tid(page, 'thaid-id-input').isVisible())) await page.keyboard.press('Enter');
      }
      throw new Error(`กด Tab ${max} ครั้งแล้วไม่ถึง ${target} (${page.url()})`);
    };
    await page.goto('/login');
    await tabTo('thaid-id-input');
    await page.keyboard.type(ID.somchai);
    await page.keyboard.press('Enter');
    await expect(tid(page, 'otp-input')).toBeVisible();
    await tabTo('otp-input');
    await page.keyboard.type(OTP);
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/citizen$/);
    await expect(tid(page, 'start-service-SV-01')).toBeVisible();
    await tabTo('start-service-SV-01');
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/citizen\/new\/SV-01/);
    await expect(tid(page, 'qty-input')).toBeVisible();
    await tabTo('qty-input');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('1');
    await expect(tid(page, 'fee-total')).toHaveText('฿20');
    await tabTo('to-upload-btn');
    await page.keyboard.press('Enter');
    await expect(tid(page, 'upload-input-id-card')).toBeAttached();
    await tabTo('upload-input-id-card');
    await tid(page, 'upload-input-id-card').setInputFiles({ name: 'id-card.pdf', mimeType: 'application/pdf', buffer: pdfBuf(1024) });
    await expect(page.locator(`${sel('file-item')}[data-doc-key="id-card"]`)).toHaveCount(1);
    await expect(tid(page, 'to-payment-btn')).toBeEnabled();
    await tabTo('to-payment-btn');
    await page.keyboard.press('Enter');
    await expect(tid(page, 'create-qr-btn')).toBeVisible();
    expect(focusFail, 'องค์ประกอบที่โฟกัสแล้วไม่มี outline/ring').toEqual([]);

    // ส่วน D สถานะไม่ใช้สีอย่างเดียว
    const STATUS_PAGES = [
      ['somchai', '/citizen', 'my-case-row'],
      ['reg1', '/officer/queue', 'queue-row'],
      ['reg1', `/officer/cases/${EG(20)}`, 'case-status'],
      ['somchai', `/citizen/cases/${EG(17)}`, 'case-status'],
    ];
    const readStatus = (pg) => pg.$$eval(
      '[data-testid="case-status"],[data-testid="row-status"],[data-testid="sla-level"],[data-testid="row-sla-level"]',
      (els) => els.map((e) => {
        const t = e.getAttribute('data-testid');
        const row = e.closest('[data-status],[data-sla-level]');
        let code;
        if (t === 'case-status' || t === 'row-status') code = e.getAttribute('data-status') || (row && row.getAttribute('data-status'));
        else code = e.getAttribute('data-level') || (row && row.getAttribute('data-sla-level'));
        const r = e.getBoundingClientRect();
        // @ts-ignore
        return { t, code, text: (e.innerText || e.textContent || '').trim(), visible: r.width > 0 && r.height > 0 };
      }),
    );
    const statusFail = [];
    for (const forced of [false, true]) {
      for (const [who, path, ready] of STATUS_PAGES) {
        const pg = P[who].page;
        await pg.emulateMedia({ forcedColors: forced ? 'active' : 'none' });
        await pg.goto(path);
        await expect(tid(pg, ready).first(), path).toBeVisible();
        const items = await readStatus(pg);
        if (!items.length) statusFail.push(`${path}: ไม่พบองค์ประกอบสถานะ`);
        for (const it of items) {
          const map = it.t.includes('status') ? STATUS_TH : LEVEL_TH;
          const tag = `${forced ? '[forced-colors] ' : ''}${path} ${it.t}(${it.code})`;
          if (!it.text) statusFail.push(`${tag}: ข้อความว่าง`);
          else if (map[it.code] !== it.text) statusFail.push(`${tag}: "${it.text}" ≠ "${map[it.code]}"`);
          if (!it.visible) statusFail.push(`${tag}: มองไม่เห็น`);
        }
      }
    }
    expect(statusFail, 'สถานะ/ระดับต้องมีข้อความตรงรหัส').toEqual([]);
  });

  test('TC-NFR-03 · Health เวลาโหลด และผลซ้ำได้', async ({ h }) => {
    test.setTimeout(180_000);
    // health (ไม่มี cookie)
    const anon = await h.api();
    const hr = await anon.get('/api/health');
    await expectStatus(hr, 200, 'health');
    expect(await hr.json()).toStrictEqual({ status: 'ok' });

    // เวลาโหลด
    await h.reset();
    const L = [
      [await h.page(), '/login'],
      [await h.citizenPage(ID.somchai), '/citizen'],
      [await h.staffPage('off.reg1'), '/officer/queue'],
      [await h.staffPage('exec1'), '/dashboard'],
      [await h.staffPage('audit1'), '/audit'],
    ];
    const slow = [];
    for (const [p, path] of L) {
      await p.page.goto(path, { waitUntil: 'load' }); // อุ่นเครื่อง
      const t = Date.now();
      await p.page.goto(path, { waitUntil: 'load' });
      const ms = Date.now() - t;
      if (ms > 3000) slow.push(`${path} ${ms} ms`);
    }
    expect(slow, 'หน้าที่โหลดเกิน 3,000 ms').toEqual([]);

    // ผลซ้ำได้
    const snapshot = async () => {
      const hook = await h.hook();
      const clk = (await (await hook.get('/api/test/clock')).json()).now;
      const reg1 = await h.staff('off.reg1');
      const q = await reg1.get('/api/officer/queue?filter=all');
      await expectStatus(q, 200);
      const queue = (await q.json()).items.map((i) => ({ caseNo: i.caseNo, dueAt: i.dueAt, status: i.status, owner: i.owner }));
      const ex = await h.staff('exec1');
      const dash = await dashApi(ex, '2026-12', 'ALL');
      return { clk, queue, dash, reg1 };
    };
    await h.reset();
    const s1 = await snapshot();
    await h.clock('2026-12-10T12:00:00+07:00');
    await expectStatus(await s1.reg1.post(`/api/officer/cases/${EG(28)}/claim`), 200, 'claim 28');
    await h.newPaid({ service: 'SV-01', qty: 1, at: '2026-12-10T12:00:00+07:00' });
    await h.reset();
    const s2 = await snapshot();
    expect(s2.clk).toBe(T0);
    expect(s1.clk).toBe(T0);
    expect(s2.queue).toEqual(s1.queue);
    expect(s2.dash).toEqual(s1.dash);

    // นาฬิกาไม่มี offset
    const bad = await (await h.hook()).put('/api/test/clock', { data: { now: '2026-12-01 09:00' } });
    await expectErr(bad, 400, 'INVALID_TIME', undefined, 'clock ไม่มี offset');

    // hook ปิดเมื่อไม่ตั้ง TEST_MODE (ถ้ามีเว็บอีกโหมด)
    const off = process.env.NO_TEST_MODE_BASE_URL;
    if (off) {
      const c = await pwRequest.newContext({ baseURL: off.replace(/\/+$/, '') });
      h.reqs.push(c);
      await expectStatus(await c.post('/api/test/reset'), 404, 'reset เมื่อไม่ตั้ง TEST_MODE');
    } else {
      test.info().annotations.push({ type: 'note', description: 'ไม่ได้ตั้ง NO_TEST_MODE_BASE_URL จึงไม่ตรวจส่วน "ปิด hook"' });
    }
  });

  test('TC-NFR-04 · เข้ารหัสข้อมูลส่วนบุคคลที่เก็บ (inspection)', async ({ h }) => {
    await h.reset();
    // มานะลงทะเบียน (เบอร์ 0845678901)
    const mana = await h.citizen(ID.mana, undefined, { expectRegistered: false });
    await expectStatus(await mana.post('/api/auth/register', { data: { mobile: '0845678901', email: '', consent: true } }), 201, 'register มานะ');

    // ตัวควบคุมบวก: ถอดรหัสได้ถูกต้อง
    const somchai = await h.citizen(ID.somchai);
    const cr = await somchai.get(`/api/cases/${EG(5)}`);
    await expectStatus(cr, 200);
    expect((await cr.json()).idNo).toBe('1101700123456');

    // อ่านไฟล์ฐานข้อมูล
    /** @type {{src:string, buf:Buffer}[]} */
    const blobs = [];
    const dbPath = process.env.DB_PATH;
    if (dbPath && fs.existsSync(dbPath)) {
      for (const suffix of ['', '-wal', '-journal', '-shm']) {
        const f = dbPath + suffix;
        if (fs.existsSync(f) && fs.statSync(f).isFile()) blobs.push({ src: f, buf: fs.readFileSync(f) });
      }
    }
    if (!blobs.length && process.env.DB_DUMP_CMD) {
      blobs.push({ src: process.env.DB_DUMP_CMD, buf: execSync(process.env.DB_DUMP_CMD, { maxBuffer: 512 * 1024 * 1024 }) });
    }
    const logPath = process.env.APP_LOG_PATH;
    if (logPath && fs.existsSync(logPath)) blobs.push({ src: logPath, buf: fs.readFileSync(logPath) });
    expect(
      blobs.length,
      'ต้องตั้ง DB_PATH (ไฟล์ฐานข้อมูลที่อ่านได้จากเครื่องที่รัน test) หรือ DB_DUMP_CMD เพื่อทำ inspection',
    ).toBeGreaterThan(0);
    expect(blobs.reduce((n, b) => n + b.buf.length, 0), 'ฐานข้อมูลไม่ว่าง').toBeGreaterThan(0);

    const VALUES = [
      '1101700123456', '3100600987659', '1909900555015', '5500400111221',
      '0812345678', '0823456789', '0834567890', '0845678901',
      '1-1017-00123-45-6', '3-1006-00987-65-9', '1-9099-00555-01-5', '5-5004-00111-22-1',
    ];
    const found = [];
    for (const { src, buf } of blobs) {
      for (const v of VALUES) {
        const variants = [Buffer.from(v, 'utf8'), Buffer.from(v, 'utf16le')];
        let n = 0;
        for (const needle of variants) {
          let i = buf.indexOf(needle);
          while (i >= 0) { n++; i = buf.indexOf(needle, i + 1); }
        }
        if (n) found.push(`${v} × ${n} ใน ${src}`);
      }
    }
    expect(found, 'ข้อมูลส่วนบุคคลแบบไม่เข้ารหัสในที่เก็บ').toEqual([]);
    test.info().annotations.push({ type: 'inspection', description: `ตรวจ ${blobs.map((b) => `${b.src} (${b.buf.length} B)`).join(', ')}` });
  });
});

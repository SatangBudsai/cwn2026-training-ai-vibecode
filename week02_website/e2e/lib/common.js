// Shared helpers for all e2e agents. Black-box: only CONTRACT.md testids / API.
const { expect, request } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';
const OTP = '123456';
const STAFF_PASSWORD = 'Test@1234';

const ID = {
  somchai: '1101700123456',
  somying: '3100600987659',
  mana: '5500400111221',
  piti: '1909900555015',
  badChecksum: '1101700123457',
};

const NAME = {
  somchai: 'สมชาย ใจดี',
  somying: 'สมหญิง รักไทย',
  mana: 'มานะ ตั้งใจ',
  piti: 'ปิติ มีสุข',
};

// ---------- API contexts ----------
async function newApi() {
  return request.newContext({ baseURL: BASE_URL });
}

/** POST /api/test/reset (no auth needed). All previous sessions are invalid afterwards. */
async function reset(req) {
  const api = req || (await newApi());
  const res = await api.post('/api/test/reset');
  expect(res.status(), 'reset status').toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  return body;
}

/** PUT /api/test/clock (frozen). */
async function setClock(req, iso) {
  const res = await req.put('/api/test/clock', { data: { now: iso } });
  expect(res.status(), 'setClock status').toBe(200);
  return (await res.json()).now;
}

async function getClock(req) {
  const res = await req.get('/api/test/clock');
  return (await res.json()).now;
}

/** Citizen login via API. Returns a fresh APIRequestContext with session cookie. ctx.registered = bool */
async function apiCitizen(idNo = ID.somchai, otp = OTP) {
  const ctx = await newApi();
  const s = await ctx.post('/api/auth/thaid/start', { data: { idNo } });
  expect(s.status(), 'thaid/start').toBe(200);
  const v = await ctx.post('/api/auth/thaid/verify', { data: { idNo, otp } });
  expect(v.status(), 'thaid/verify').toBe(200);
  ctx.registered = (await v.json()).registered;
  return ctx;
}

/** Staff login via API. Returns a fresh APIRequestContext with session cookie. */
async function apiStaff(username, password = STAFF_PASSWORD) {
  const ctx = await newApi();
  const res = await ctx.post('/api/auth/staff/login', { data: { username, password } });
  expect(res.status(), 'staff/login ' + username).toBe(200);
  ctx.loginBody = await res.json();
  return ctx;
}

/** Raw start+verify without asserting; returns {status, body, step:'start'|'verify'} of the first failing or the verify response. */
async function tryCitizenLogin(ctx, idNo, otp) {
  const s = await ctx.post('/api/auth/thaid/start', { data: { idNo } });
  if (s.status() !== 200) return { step: 'start', status: s.status(), body: await s.json().catch(() => ({})) };
  const v = await ctx.post('/api/auth/thaid/verify', { data: { idNo, otp } });
  return { step: 'verify', status: v.status(), body: await v.json().catch(() => ({})) };
}

// ---------- UI login ----------
async function uiLoginCitizen(page, idNo = ID.somchai, otp = OTP) {
  await page.goto('/login');
  const tab = page.getByTestId('login-tab-citizen');
  if (await tab.count()) await tab.click();
  await page.getByTestId('thaid-id-input').fill(idNo);
  await page.getByTestId('thaid-submit').click();
  await expect(page.getByTestId('otp-step')).toBeVisible();
  await page.getByTestId('otp-input').fill(otp);
  await page.getByTestId('otp-submit').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function uiLoginStaff(page, username, password = STAFF_PASSWORD) {
  await page.goto('/login');
  await page.getByTestId('login-tab-staff').click();
  await page.getByTestId('staff-username').fill(username);
  await page.getByTestId('staff-password').fill(password);
  await page.getByTestId('staff-submit').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function uiLogout(page) {
  await page.getByTestId('logout-btn').click();
  await page.waitForURL(/\/login/);
}

// ---------- Thai date / money ----------
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** '2026-12-04T16:30:00+07:00' -> '4 ธ.ค. 2569' (uses the wall-clock digits in the ISO string) */
function thaiDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return `${parseInt(m[3], 10)} ${TH_MONTHS[parseInt(m[2], 10) - 1]} ${parseInt(m[1], 10) + 543}`;
}
/** '2026-12-04T16:30:00+07:00' -> '4 ธ.ค. 2569 16:30' */
function thaiDateTime(iso) {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return `${thaiDate(iso)} ${m[1]}:${m[2]}`;
}
/** 1010 -> '฿1,010' */
function baht(n) {
  return '฿' + Number(n).toLocaleString('en-US');
}

// ---------- test files (TEST-DATA section 11) ----------
function pdf(n = 1024) {
  const head = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n');
  const tail = Buffer.from('\ntrailer<</Root 1 0 R>>\n%%EOF\n');
  const pad = n - head.length - tail.length;
  if (pad < 0) throw new Error('pdf too small');
  return Buffer.concat([head, Buffer.alloc(pad, 0x20), tail]);
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(n = 1024) {
  const zlib = require('zlib');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idat = pngChunk('IDAT', zlib.deflateSync(Buffer.from([0, 0xff, 0, 0])));
  const iend = pngChunk('IEND', Buffer.alloc(0));
  const ihdrC = pngChunk('IHDR', ihdr);
  const baseLen = sig.length + ihdrC.length + idat.length + iend.length;
  const pad = n - baseLen - 12;
  const text = pngChunk('tEXt', Buffer.concat([Buffer.from('k\0'), Buffer.alloc(pad - 2, 0x78)]));
  return Buffer.concat([sig, ihdrC, idat, text, iend]);
}
function jpg(n = 1024) {
  const soi = Buffer.from([0xff, 0xd8]);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const pad = n - soi.length - app0.length - 2 - 4;
  const len = Buffer.alloc(2);
  len.writeUInt16BE((pad + 2) & 0xffff);
  return Buffer.concat([soi, app0, Buffer.from([0xff, 0xfe]), len, Buffer.alloc(pad, 0x78), Buffer.from([0xff, 0xd9])]);
}
const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', txt: 'text/plain' };
/** named TEST-DATA files -> {name, mimeType, buffer} (Playwright setInputFiles / multipart shape) */
function testFile(name) {
  const f = (b, ext) => ({ name, mimeType: MIME[ext], buffer: b });
  switch (name) {
    case 'ok-id.pdf': case 'id-card.pdf': case 'map.pdf': case 'plan.pdf': case 'deed.pdf':
      return f(pdf(1024), 'pdf');
    case 'real.jpg': case 'plan-as-jpg.jpg': return f(jpg(1024), 'jpg');
    case 'real.png': return f(png(1024), 'png');
    case 'fake-text.pdf': return f(Buffer.from('hello'), 'pdf');
    case 'fake-text.jpg': return f(Buffer.from('hello'), 'jpg');
    case 'notes.txt': return f(Buffer.from('hello'), 'txt');
    case 'exe-as.png': return f(Buffer.concat([Buffer.from('MZ'), Buffer.alloc(1022)]), 'png');
    default: {
      let m = /^size-(\d+)\.pdf$/.exec(name);
      if (m) return f(pdf(parseInt(m[1], 10)), 'pdf');
      m = /^multi-\d+\.pdf$/.exec(name);
      if (m) return f(pdf(1024), 'pdf');
      throw new Error('unknown test file ' + name);
    }
  }
}

// ---------- drafts / upload / pay via API ----------
const REQUIRED_DOCS = {
  'SV-01': [['id-card', 'id-card.pdf']],
  'SV-02': [['id-card', 'id-card.pdf'], ['map', 'map.pdf']],
  'SV-03': [['id-card', 'id-card.pdf'], ['plan', 'plan.pdf'], ['deed', 'deed.pdf']],
};

/** POST /api/drafts. Returns raw APIResponse. */
function postDraft(api, { serviceId = 'SV-01', qty, areaSqm } = {}) {
  const data = { serviceId };
  if (serviceId === 'SV-01') data.qty = qty === undefined ? 1 : qty;
  if (serviceId === 'SV-03') data.areaSqm = areaSqm === undefined ? 100 : areaSqm;
  return api.post('/api/drafts', { data });
}
async function createDraft(api, opts = {}) {
  const res = await postDraft(api, opts);
  expect(res.status(), 'create draft').toBe(201);
  return res.json(); // {draftId, fee}
}
/** multipart upload; file = {name,mimeType,buffer} or a TEST-DATA name. Returns raw APIResponse. */
function uploadFile(api, draftId, docKey, file) {
  const f = typeof file === 'string' ? testFile(file) : file;
  return api.post(`/api/drafts/${draftId}/files`, {
    multipart: { file: { name: f.name, mimeType: f.mimeType, buffer: f.buffer }, docKey },
  });
}
/** upload every mandatory document for the service (skip docKeys in `skip`). */
async function uploadRequired(api, draftId, serviceId, skip = []) {
  for (const [docKey, name] of REQUIRED_DOCS[serviceId]) {
    if (skip.includes(docKey)) continue;
    const r = await uploadFile(api, draftId, docKey, name);
    expect(r.status(), `upload ${docKey}`).toBe(201);
  }
}
/** POST /api/drafts/:id/payment (raw response) */
function postPayment(api, draftId) {
  return api.post(`/api/drafts/${draftId}/payment`);
}
async function createQr(api, draftId) {
  const res = await postPayment(api, draftId);
  expect(res.status(), 'create QR').toBe(201);
  return res.json(); // {ref, amount, qrCreatedAt, qrExpiresAt}
}
/** POST /api/test/payments/:ref/pay. Returns {status, body} */
async function payRef(api, ref, amount) {
  const res = await api.post(`/api/test/payments/${ref}/pay`, { data: { amount } });
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}
/** draft with all mandatory docs, QR created, not yet paid. */
async function createUnpaidDraftWithQr(api, opts = {}) {
  const serviceId = opts.serviceId || 'SV-01';
  const d = await createDraft(api, opts);
  await uploadRequired(api, d.draftId, serviceId);
  const qr = await createQr(api, d.draftId);
  return { draftId: d.draftId, fee: d.fee, ref: qr.ref, amount: qr.amount, qr };
}
/**
 * Drives drafts -> upload mandatory files -> payment -> test pay.
 * `api` must be a logged-in citizen context. opts: {serviceId, qty, areaSqm}.
 * Returns {draftId, ref, fee, caseNo, receiptNo}.
 */
async function createPaidCase(api, opts = {}) {
  const u = await createUnpaidDraftWithQr(api, opts);
  const p = await payRef(api, u.ref, u.fee);
  expect(p.status, 'pay ' + u.ref).toBe(200);
  expect(p.body.status).toBe('PAID');
  return { draftId: u.draftId, ref: u.ref, fee: u.fee, caseNo: p.body.caseNo, receiptNo: p.body.receiptNo };
}

module.exports = {
  BASE_URL, OTP, STAFF_PASSWORD, ID, NAME,
  newApi, reset, setClock, getClock, apiCitizen, apiStaff, tryCitizenLogin,
  uiLoginCitizen, uiLoginStaff, uiLogout,
  thaiDate, thaiDateTime, baht,
  pdf, jpg, png, testFile, REQUIRED_DOCS,
  postDraft, createDraft, uploadFile, uploadRequired, postPayment, createQr, payRef,
  createUnpaidDraftWithQr, createPaidCase,
};

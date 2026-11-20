// @ts-check
// Playwright A · หมวด AUTH FEE SUBMIT UPLOAD PAY (TEST-PLAN.md ข้อ 2–6)
// ผลที่คาดหวังทั้งหมดคิดจาก TEST-PLAN / CONTRACT / TEST-DATA เท่านั้น (ไม่อ่านจากหน้าจอแล้วเอามาเป็นคำตอบ)
// ทุก TC เริ่มด้วย RESET และล็อกอินใหม่ใน context ใหม่ทุกครั้งหลัง RESET (CONTRACT 0.9)
// helper ทั้งหมดอยู่ในไฟล์นี้ (self-contained) · ไฟล์ทดสอบสร้างในหน่วยความจำตาม TEST-DATA ข้อ 11
// ต้องรันแบบ workers=1 (สถานะเซิร์ฟเวอร์ใช้ร่วมกัน) · BASE_URL จากตัวแปรสภาพแวดล้อม

const { test, expect, request: pwRequest } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
const PW = 'Test@1234';
const OTP_OK = '123456';
const OTP_BAD = '000000';
const T0 = '2026-12-01T09:00:00+07:00';

const ID = {
  somchai: '1101700123456',
  somying: '3100600987659',
  mana: '5500400111221',
  piti: '1909900555015',
  badChecksum: '1101700123457',
};

const MSG = {
  INVALID_ID: 'เลขบัตรประชาชนไม่ถูกต้อง',
  OTP_INVALID: 'รหัส OTP ไม่ถูกต้อง',
  LOCKED: 'ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที',
  INVALID_CREDENTIALS: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  INVALID_MOBILE: 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0',
  CONSENT_REQUIRED: 'กรุณายินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA)',
  INVALID_QTY: 'จำนวนฉบับต้อง 1–5 ฉบับ', // en dash U+2013
  INVALID_AREA: 'กรุณาระบุพื้นที่ 1–500 ตร.ม.', // en dash U+2013
  AREA_TOO_LARGE: 'พื้นที่เกิน 500 ตร.ม. กรุณายื่นที่สำนักงาน',
  FILE_TOO_LARGE: 'ไฟล์ใหญ่เกิน 5 MB',
  FILE_TYPE: 'รองรับเฉพาะไฟล์ PDF, JPG, PNG',
  FILE_COUNT: 'แนบได้สูงสุด 5 ไฟล์ต่อคำขอ',
  PLAN_NOT_PDF: 'แบบแปลนต้องเป็นไฟล์ PDF เท่านั้น',
  QR_EXPIRED: 'QR หมดอายุ กรุณาสร้าง QR ใหม่',
  AMOUNT_MISMATCH: 'ยอดเงินไม่ตรงกับค่าธรรมเนียม',
  CANNOT_CANCEL: 'ยกเลิกไม่ได้ คำขอมีเจ้าหน้าที่รับเรื่องแล้ว',
  NO_REFUND: 'ค่าธรรมเนียมที่ชำระแล้วไม่คืน',
};

const DASH = '–'; // U+2013 ค่า fee-total เมื่อค่าไม่ถูกต้อง

// ---------------------------------------------------------------------------
// ไฟล์ทดสอบ (พอร์ตจาก make_testfiles.py ใน TEST-DATA ข้อ 11 · ขนาดตรงไบต์)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'latin1');
  return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))]);
}
function makePdf(n) {
  const head = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n', 'latin1');
  const tail = Buffer.from('\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1');
  const pad = n - head.length - tail.length;
  if (pad < 0) throw new Error('pdf too small');
  return Buffer.concat([head, Buffer.alloc(pad, 0x20), tail]);
}
function makePng(n) {
  const zlib = require('zlib');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const base = Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.from([0x00, 0xff, 0x00, 0x00]))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  const pad = n - base.length - 12;
  const text = Buffer.concat([Buffer.from('k\x00', 'latin1'), Buffer.alloc(pad - 2, 0x78)]);
  return Buffer.concat([base.subarray(0, base.length - 12), pngChunk('tEXt', text), base.subarray(base.length - 12)]);
}
function makeJpg(n) {
  const soi = Buffer.from([0xff, 0xd8]);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const pad = n - soi.length - app0.length - 2 - 4;
  const len = Buffer.alloc(2);
  len.writeUInt16BE(pad + 2);
  return Buffer.concat([soi, app0, Buffer.from([0xff, 0xfe]), len, Buffer.alloc(pad, 0x78), Buffer.from([0xff, 0xd9])]);
}

const MIME_BY_EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', txt: 'text/plain' };
const fileCache = new Map();

/** ไฟล์ทดสอบตามชื่อใน TEST-DATA ข้อ 11 → { name, mimeType, buffer } */
function tf(name, mimeType) {
  if (!fileCache.has(name)) {
    let buf;
    let m;
    if (/^(ok-id|id-card|map|plan|deed|multi-\d)\.pdf$/.test(name)) buf = makePdf(1024);
    else if ((m = /^size-(\d+)\.pdf$/.exec(name))) buf = makePdf(Number(m[1]));
    else if (name === 'real.jpg' || name === 'plan-as-jpg.jpg') buf = makeJpg(1024);
    else if (name === 'real.png') buf = makePng(1024);
    else if (name === 'fake-text.pdf' || name === 'fake-text.jpg' || name === 'notes.txt') buf = Buffer.from('hello');
    else if (name === 'exe-as.png') buf = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(1022, 0)]);
    else throw new Error(`unknown test file ${name}`);
    fileCache.set(name, buf);
  }
  const ext = name.split('.').pop() || '';
  return { name, mimeType: mimeType || MIME_BY_EXT[ext] || 'application/octet-stream', buffer: fileCache.get(name) };
}

const REQUIRED_DOCS = {
  'SV-01': [['id-card', 'id-card.pdf']],
  'SV-02': [['id-card', 'id-card.pdf'], ['map', 'map.pdf']],
  'SV-03': [['id-card', 'id-card.pdf'], ['plan', 'plan.pdf'], ['deed', 'deed.pdf']],
};

// ---------------------------------------------------------------------------
// context / API helper
// ---------------------------------------------------------------------------

/** @type {import('@playwright/test').APIRequestContext[]} */
const apiContexts = [];
/** @type {import('@playwright/test').BrowserContext[]} */
const browserContexts = [];

test.afterEach(async () => {
  while (apiContexts.length) await apiContexts.pop()?.dispose().catch(() => {});
  while (browserContexts.length) await browserContexts.pop()?.close().catch(() => {});
});

/** request context ใหม่ (cookie แยก) */
async function newApi() {
  const c = await pwRequest.newContext({ baseURL: BASE_URL });
  apiContexts.push(c);
  return c;
}

/** browser page ใหม่ใน context ใหม่ (cookie แยก) */
async function newPage(browser) {
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  browserContexts.push(ctx);
  return ctx.newPage();
}

async function reset() {
  const c = await newApi();
  const r = await c.post('/api/test/reset');
  expect(r.status(), 'RESET → 200').toBe(200);
  const b = await r.json();
  expect(b.ok).toBe(true);
  expect(b.now).toBe(T0);
}

async function clock(now) {
  const c = await newApi();
  const r = await c.put('/api/test/clock', { data: { now } });
  expect(r.status(), `CLOCK(${now}) → 200`).toBe(200);
}

async function json(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/** ตรวจ error ตาม CONTRACT ข้อ 0.6 / ตาราง 5 */
async function expectErr(res, status, code, message) {
  const b = await json(res);
  expect(res.status(), `HTTP ${status} ${code || ''} (body=${JSON.stringify(b)})`).toBe(status);
  if (code) expect(b.code).toBe(code);
  if (message) expect(b.message).toBe(message);
  return b;
}

async function expectOk(res, status, label) {
  const b = await json(res);
  expect(res.status(), `${label || res.url()} → ${status} (body=${JSON.stringify(b)})`).toBe(status);
  return b;
}

/** LOGIN_C ผ่าน API (api = APIRequestContext หรือ page.request) */
async function loginC(api, idNo) {
  await expectOk(await api.post('/api/auth/thaid/start', { data: { idNo } }), 200, 'thaid/start');
  return expectOk(await api.post('/api/auth/thaid/verify', { data: { idNo, otp: OTP_OK } }), 200, 'thaid/verify');
}

/** LOGIN_S ผ่าน API */
async function loginS(api, username) {
  return expectOk(await api.post('/api/auth/staff/login', { data: { username, password: PW } }), 200, `staff/login ${username}`);
}

async function citizenApi(idNo) {
  const api = await newApi();
  await loginC(api, idNo);
  return api;
}
async function staffApi(username) {
  const api = await newApi();
  await loginS(api, username);
  return api;
}
async function citizenPage(browser, idNo) {
  const page = await newPage(browser);
  await loginC(page.request, idNo);
  return page;
}
async function staffPage(browser, username) {
  const page = await newPage(browser);
  await loginS(page.request, username);
  return page;
}

async function createDraft(api, body) {
  const b = await expectOk(await api.post('/api/drafts', { data: body }), 201, `POST /api/drafts ${JSON.stringify(body)}`);
  expect(b.draftId).toMatch(/^DR-\d{4}$/);
  return b;
}

function uploadApi(api, draftId, docKey, file) {
  // docKey มาก่อน file เพื่อให้ parser แบบ stream อ่าน docKey ได้ก่อนไฟล์
  return api.post(`/api/drafts/${draftId}/files`, {
    multipart: { docKey, file: { name: file.name, mimeType: file.mimeType, buffer: file.buffer } },
  });
}

async function uploadOk(api, draftId, docKey, name) {
  const b = await expectOk(await uploadApi(api, draftId, docKey, tf(name)), 201, `upload ${name}`);
  expect(b.fileId).toBeTruthy();
  expect(b.docKey).toBe(docKey);
  return b;
}

async function createQr(api, draftId) {
  const b = await expectOk(await api.post(`/api/drafts/${draftId}/payment`), 201, `POST payment ${draftId}`);
  expect(b.ref).toMatch(/^PP-\d{4}$/);
  return b;
}

/** ร่าง + แนบเอกสารบังคับ + สร้าง QR (ยังไม่ชำระ) */
async function draftWithQr(api, serviceId = 'SV-01', opts = { qty: 1 }) {
  const body = { serviceId };
  if (serviceId === 'SV-01') body.qty = opts.qty ?? 1;
  if (serviceId === 'SV-03') body.areaSqm = opts.areaSqm ?? 100;
  const d = await createDraft(api, body);
  for (const [docKey, name] of REQUIRED_DOCS[serviceId]) await uploadOk(api, d.draftId, docKey, name);
  const qr = await createQr(api, d.draftId);
  return { draftId: d.draftId, fee: d.fee, ref: qr.ref, amount: qr.amount };
}

function pay(api, ref, amount) {
  return api.post(`/api/test/payments/${ref}/pay`, { data: { amount } });
}

async function myCases(api) {
  const b = await expectOk(await api.get('/api/cases'), 200, 'GET /api/cases');
  return b.items;
}

function baht(n) {
  return '฿' + n.toLocaleString('en-US');
}

function byAttr(page, testid, attr, value) {
  return page.locator(`[data-testid="${testid}"][${attr}="${value}"]`);
}

async function blurFill(page, testid, value) {
  const el = page.getByTestId(testid);
  await el.fill(String(value));
  await el.blur();
}

// ---- หน้า /login ----

async function openLogin(page, tab) {
  await page.goto('/login');
  const t = page.getByTestId(`login-tab-${tab}`);
  if (await t.count()) await t.first().click();
}

function waitVerify(page) {
  return page.waitForResponse((r) => r.url().includes('/api/auth/thaid/verify') && r.request().method() === 'POST');
}

/** กรอก OTP บนหน้าแล้วคืน response ของ /api/auth/thaid/verify */
async function uiOtp(page, otp) {
  await page.getByTestId('otp-input').fill(otp);
  const [res] = await Promise.all([waitVerify(page), page.getByTestId('otp-submit').click()]);
  return res;
}

async function uiCitizenLogin(page, idNo) {
  await openLogin(page, 'citizen');
  await page.getByTestId('thaid-id-input').fill(idNo);
  await page.getByTestId('thaid-submit').click();
  await expect(page.getByTestId('otp-step')).toBeVisible();
  const res = await uiOtp(page, OTP_OK);
  expect(res.status()).toBe(200);
}

// ===========================================================================
// 2. AUTH
// ===========================================================================

test.describe('AUTH', () => {
  test('TC-AUTH-01 · เลขบัตร 13 หลัก + checksum', async ({ browser }) => {
    await reset();
    const page = await newPage(browser);
    const api = await newApi();

    const invalid = [
      ['110170012345', '12 หลัก'],
      ['11017001234567', '14 หลัก'],
      [ID.badChecksum, 'checksum ผิด'],
      ['11017001234ab', 'ไม่ใช่ตัวเลขล้วน'],
    ];
    for (const [v, why] of invalid) {
      await test.step(`ปฏิเสธ ${v} (${why})`, async () => {
        await openLogin(page, 'citizen');
        const input = page.getByTestId('thaid-id-input');
        await input.fill(v);
        await expect(input, 'ไม่จำกัด maxlength (A-45) ต้องพิมพ์ได้ครบ').toHaveValue(v);
        await page.getByTestId('thaid-submit').click();
        await expect(page.getByTestId('thaid-error')).toHaveText(MSG.INVALID_ID);
        await expect(page.getByTestId('otp-step')).toBeHidden();
        await expectErr(await api.post('/api/auth/thaid/start', { data: { idNo: v } }), 400, 'INVALID_ID', MSG.INVALID_ID);
      });
    }

    for (const v of [ID.somchai, ID.somying, ID.piti, ID.mana]) {
      await test.step(`รับ ${v}`, async () => {
        await openLogin(page, 'citizen');
        await page.getByTestId('thaid-id-input').fill(v);
        await page.getByTestId('thaid-submit').click();
        await expect(page.getByTestId('otp-step')).toBeVisible();
        await expect(page.getByTestId('thaid-error')).toBeHidden();
        const b = await expectOk(await api.post('/api/auth/thaid/start', { data: { idNo: v } }), 200);
        expect(b.status).toBe('OTP_SENT');
      });
    }
  });

  test('TC-AUTH-02 · OTP ผิด 3 ครั้งล็อก 15 นาที', async ({ browser }) => {
    await reset();
    const page = await newPage(browser);
    await openLogin(page, 'citizen');
    await page.getByTestId('thaid-id-input').fill(ID.piti);
    await page.getByTestId('thaid-submit').click();
    await expect(page.getByTestId('otp-step')).toBeVisible();

    await test.step('1 · ผิดครั้งที่ 1 → 401 เหลือ 2 ครั้ง', async () => {
      const r = await uiOtp(page, OTP_BAD);
      const b = await expectErr(r, 401, 'OTP_INVALID', MSG.OTP_INVALID);
      expect(b.attemptsLeft).toBe(2);
      await expect(page.getByTestId('otp-error')).toHaveText(MSG.OTP_INVALID);
      await expect(page.getByTestId('otp-attempts-left')).toHaveText('เหลือ 2 ครั้ง');
    });

    await test.step('2 · ผิดครั้งที่ 2 → เหลือ 1 ครั้ง', async () => {
      const r = await uiOtp(page, OTP_BAD);
      const b = await expectErr(r, 401, 'OTP_INVALID');
      expect(b.attemptsLeft).toBe(1);
      await expect(page.getByTestId('otp-attempts-left')).toHaveText('เหลือ 1 ครั้ง');
    });

    await test.step('3 · ผิดครั้งที่ 3 → 423 ล็อกถึง 09:15:00', async () => {
      const r = await uiOtp(page, OTP_BAD);
      const b = await expectErr(r, 423, 'LOCKED');
      expect(new Date(b.lockedUntil).getTime()).toBe(new Date('2026-12-01T09:15:00+07:00').getTime());
      await expect(page.getByTestId('lock-message')).toHaveText(MSG.LOCKED);
      await expect(page.getByTestId('lock-until')).toHaveAttribute('data-iso', '2026-12-01T09:15:00+07:00');
    });

    const verifyPiti = async (otp) => {
      const api = await newApi();
      const s = await api.post('/api/auth/thaid/start', { data: { idNo: ID.piti } });
      expect([200, 423]).toContain(s.status());
      return api.post('/api/auth/thaid/verify', { data: { idNo: ID.piti, otp } });
    };

    await test.step('4 · OTP ถูกทันที ยัง 423', async () => {
      await expectErr(await verifyPiti(OTP_OK), 423, 'LOCKED');
    });

    await test.step('5 · สมชายล็อกอินได้ (ล็อกเฉพาะเลขบัตรที่ผิด)', async () => {
      const api = await newApi();
      const b = await loginC(api, ID.somchai);
      expect(b.registered).toBe(true);
    });

    await test.step('6 · 09:14:59 ยัง 423', async () => {
      await clock('2026-12-01T09:14:59+07:00');
      await expectErr(await verifyPiti(OTP_OK), 423, 'LOCKED');
    });

    await test.step('7–8 · 09:15:00 ปลดล็อก ตัวนับเริ่มใหม่ แล้ว OTP ถูกเข้าได้', async () => {
      await clock('2026-12-01T09:15:00+07:00');
      const p2 = await newPage(browser);
      await openLogin(p2, 'citizen');
      await p2.getByTestId('thaid-id-input').fill(ID.piti);
      await p2.getByTestId('thaid-submit').click();
      await expect(p2.getByTestId('otp-step')).toBeVisible();
      const r = await uiOtp(p2, OTP_BAD);
      const b = await expectErr(r, 401, 'OTP_INVALID');
      expect(b.attemptsLeft).toBe(2);
      await expect(p2.getByTestId('otp-attempts-left')).toHaveText('เหลือ 2 ครั้ง');
      const ok = await uiOtp(p2, OTP_OK);
      expect(ok.status()).toBe(200);
      await expect(p2).toHaveURL(/\/citizen(\?.*)?$/);
    });

    await test.step('9 · RESET · OTP ถูกรีเซ็ตตัวนับเป็น 0', async () => {
      await reset();
      const api = await newApi();
      const verify = (otp) => api.post('/api/auth/thaid/verify', { data: { idNo: ID.piti, otp } });
      await expectOk(await api.post('/api/auth/thaid/start', { data: { idNo: ID.piti } }), 200);
      expect((await expectErr(await verify(OTP_BAD), 401, 'OTP_INVALID')).attemptsLeft).toBe(2);
      expect((await expectErr(await verify(OTP_BAD), 401, 'OTP_INVALID')).attemptsLeft).toBe(1);
      await expectOk(await verify(OTP_OK), 200, 'OTP ถูกหลังผิด 2 ครั้ง');
      expect((await api.post('/api/auth/logout')).status()).toBe(204);
      await expectOk(await api.post('/api/auth/thaid/start', { data: { idNo: ID.piti } }), 200);
      expect((await expectErr(await verify(OTP_BAD), 401, 'OTP_INVALID')).attemptsLeft).toBe(2);
      expect((await expectErr(await verify(OTP_BAD), 401, 'OTP_INVALID')).attemptsLeft).toBe(1);
    });
  });

  test('TC-AUTH-03 · ลงทะเบียนครั้งแรก', async ({ browser }) => {
    await reset();
    const page = await newPage(browser);
    await uiCitizenLogin(page, ID.mana);
    await expect(page).toHaveURL(/\/register(\?.*)?$/);

    await test.step('1 · reg-name readOnly', async () => {
      const name = page.getByTestId('reg-name');
      await expect(name).toHaveValue('มานะ ตั้งใจ');
      await expect(name).toHaveJSProperty('readOnly', true);
      await name.click();
      await page.keyboard.type('ทดสอบ');
      await expect(name).toHaveValue('มานะ ตั้งใจ');
    });

    for (const mobile of ['081234567', '08123456789', '1812345678', '08123abcde']) {
      await test.step(`2–4 · เบอร์ ${mobile} ถูกปฏิเสธ`, async () => {
        await page.getByTestId('reg-mobile').fill(mobile);
        await page.getByTestId('reg-consent').check();
        await page.getByTestId('reg-submit').click();
        await expect(page.getByTestId('reg-error-mobile')).toHaveText(MSG.INVALID_MOBILE);
        await expect(page).toHaveURL(/\/register(\?.*)?$/);
      });
    }

    await test.step('5 · ไม่ติ๊กยินยอม', async () => {
      await page.getByTestId('reg-mobile').fill('0845678901');
      await page.getByTestId('reg-consent').uncheck();
      await page.getByTestId('reg-submit').click();
      await expect(page.getByTestId('reg-error-consent')).toHaveText(MSG.CONSENT_REQUIRED);
      await expect(page).toHaveURL(/\/register(\?.*)?$/);
    });

    await test.step('6 · ลงทะเบียนสำเร็จ', async () => {
      await page.getByTestId('reg-mobile').fill('0845678901');
      await page.getByTestId('reg-consent').check();
      await page.getByTestId('reg-email').fill('');
      await page.getByTestId('reg-submit').click();
      await expect(page).toHaveURL(/\/citizen(\?.*)?$/);
      await expect(page.getByTestId('citizen-welcome')).toHaveText('สวัสดี มานะ ตั้งใจ');
    });

    await test.step('7 · ออกแล้วเข้าใหม่ → /citizen ตรงๆ', async () => {
      await page.getByTestId('logout-btn').click();
      await expect(page).toHaveURL(/\/login(\?.*)?$/);
      const navs = [];
      page.on('framenavigated', (f) => {
        if (f === page.mainFrame()) navs.push(f.url());
      });
      await uiCitizenLogin(page, ID.mana);
      await expect(page).toHaveURL(/\/citizen(\?.*)?$/);
      expect(navs.filter((u) => /\/register/.test(u)), 'ไม่ผ่าน /register').toEqual([]);
    });

    await test.step('8 · RESET · API register ตรวจเบอร์/ยินยอม', async () => {
      await reset();
      const api = await newApi();
      await expectOk(await api.post('/api/auth/thaid/start', { data: { idNo: ID.mana } }), 200);
      const v = await expectOk(await api.post('/api/auth/thaid/verify', { data: { idNo: ID.mana, otp: OTP_OK } }), 200);
      expect(v.registered).toBe(false);
      await expectErr(
        await api.post('/api/auth/register', { data: { mobile: '081234567', email: '', consent: true } }),
        400, 'INVALID_MOBILE', MSG.INVALID_MOBILE,
      );
      await expectErr(
        await api.post('/api/auth/register', { data: { mobile: '0845678901', email: '', consent: false } }),
        400, 'CONSENT_REQUIRED', MSG.CONSENT_REQUIRED,
      );
    });
  });

  test('TC-AUTH-04 · เจ้าหน้าที่ SSO จำลองและหน้าตั้งต้น', async ({ browser }) => {
    await reset();
    const page = await newPage(browser);
    const accounts = [
      { u: 'off.reg1', landing: '/officer/queue', name: 'เจ้าหน้าที่ทะเบียน 1', roleText: 'เจ้าหน้าที่', role: 'officer', dept: 'registry' },
      { u: 'off.reg2', landing: '/officer/queue', name: 'เจ้าหน้าที่ทะเบียน 2', roleText: 'เจ้าหน้าที่', role: 'officer', dept: 'registry' },
      { u: 'off.works1', landing: '/officer/queue', name: 'เจ้าหน้าที่โยธา 1', roleText: 'เจ้าหน้าที่', role: 'officer', dept: 'works' },
      { u: 'head1', landing: '/head/approvals', name: 'หัวหน้าฝ่าย', roleText: 'หัวหน้าฝ่าย', role: 'head' },
      { u: 'exec1', landing: '/dashboard', name: 'ผู้บริหาร', roleText: 'ผู้บริหาร', role: 'executive' },
      { u: 'audit1', landing: '/audit', name: 'ผู้ตรวจสอบภายใน', roleText: 'ผู้ตรวจสอบภายใน', role: 'auditor' },
      { u: 'admin1', landing: '/admin/services', name: 'ผู้ดูแลระบบ', roleText: 'ผู้ดูแลระบบ', role: 'admin' },
    ];
    for (const a of accounts) {
      await test.step(`${a.u} → ${a.landing}`, async () => {
        await openLogin(page, 'staff');
        await expect(page.getByTestId('staff-submit')).toHaveText('เข้าสู่ระบบเจ้าหน้าที่ (SSO ภาครัฐ จำลอง)');
        await page.getByTestId('staff-username').fill(a.u);
        await page.getByTestId('staff-password').fill(PW);
        await page.getByTestId('staff-submit').click();
        await expect(page).toHaveURL(new RegExp(`${a.landing.replace(/\//g, '\\/')}(\\?.*)?$`));
        await expect(page.getByTestId('user-name')).toHaveText(a.name);
        const role = page.getByTestId('user-role');
        await expect(role).toHaveText(a.roleText);
        await expect(role).toHaveAttribute('data-role', a.role);
        if (a.dept) await expect(role).toHaveAttribute('data-dept', a.dept);
        await page.getByTestId('logout-btn').click();
        await expect(page).toHaveURL(/\/login(\?.*)?$/);
      });
    }

    const api = await newApi();
    for (const [u, p, why] of [['off.reg1', 'wrong', 'รหัสผ่านผิด'], ['nobody', PW, 'ไม่มีผู้ใช้'], [ID.somchai, PW, 'เลขบัตรในช่อง username']]) {
      await test.step(`ปฏิเสธ ${why}`, async () => {
        await openLogin(page, 'staff');
        await page.getByTestId('staff-username').fill(u);
        await page.getByTestId('staff-password').fill(p);
        await page.getByTestId('staff-submit').click();
        await expect(page.getByTestId('staff-error')).toHaveText(MSG.INVALID_CREDENTIALS);
        await expect(page).toHaveURL(/\/login(\?.*)?$/);
        await expectErr(
          await api.post('/api/auth/staff/login', { data: { username: u, password: p } }),
          401, 'INVALID_CREDENTIALS', MSG.INVALID_CREDENTIALS,
        );
      });
    }

    await test.step('หลังออกจากระบบ เปิด /officer/queue → /login', async () => {
      await page.goto('/officer/queue');
      await expect(page).toHaveURL(/\/login(\?.*)?$/);
    });
  });
});

// ===========================================================================
// 3. FEE
// ===========================================================================

test.describe('FEE', () => {
  test('TC-FEE-01 · ค่าธรรมเนียม SV-01 / SV-02 / SV-03', async ({ browser }) => {
    await reset();
    const page = await citizenPage(browser, ID.somchai);
    const api = page.request;

    const expectInvalid = async (msg) => {
      await expect(page.getByTestId('fee-total')).toHaveText(DASH);
      await expect(page.getByTestId('fee-error')).toHaveText(msg);
      await expect(page.getByTestId('to-upload-btn')).toBeDisabled();
    };
    const expectValid = async (fee) => {
      await expect(page.getByTestId('fee-total')).toHaveText(baht(fee));
      await expect(page.getByTestId('fee-error')).toBeHidden();
      await expect(page.getByTestId('to-upload-btn')).toBeEnabled();
    };

    // SV-03: 1–100 = 1,000 · 101–500 = 1,000 + 10 × (พื้นที่ − 100)
    const sv03 = [
      { a: 0, code: 'INVALID_AREA' },
      { a: -1, code: 'INVALID_AREA' },
      { a: 1, fee: 1000 },
      { a: 100, fee: 1000 },
      { a: 101, fee: 1010 },
      { a: 102, fee: 1020 },
      { a: 250, fee: 2500 },
      { a: 300, fee: 3000 },
      { a: 499, fee: 4990 },
      { a: 500, fee: 5000 },
      { a: 501, code: 'AREA_TOO_LARGE' },
    ];
    await page.goto('/citizen/new/SV-03');
    await expect(page.getByTestId('service-name')).toHaveText('ขออนุญาตก่อสร้าง/ต่อเติมอาคาร');
    await expect(page.getByTestId('wizard-step')).toHaveText('1/3 กรอกข้อมูล');
    for (const row of sv03) {
      await test.step(`SV-03 พื้นที่ ${row.a}`, async () => {
        await blurFill(page, 'area-input', row.a);
        if (row.code) await expectInvalid(MSG[row.code]);
        else await expectValid(row.fee);
        const res = await api.post('/api/drafts', { data: { serviceId: 'SV-03', areaSqm: row.a } });
        if (row.code) await expectErr(res, 400, row.code, MSG[row.code]);
        else expect((await expectOk(res, 201)).fee).toBe(row.fee);
      });
    }

    // SV-01: ฿20 ต่อฉบับ 1–5
    await page.goto('/citizen/new/SV-01');
    await expect(page.getByTestId('service-name')).toHaveText('ขอหนังสือรับรอง');
    await expect(page.getByTestId('qty-input'), 'ค่าตั้งต้น 1 (A-56)').toHaveValue('1');
    for (const q of [0, 1, 2, 3, 4, 5, 6]) {
      await test.step(`SV-01 จำนวน ${q}`, async () => {
        const valid = q >= 1 && q <= 5;
        await blurFill(page, 'qty-input', q);
        if (valid) await expectValid(20 * q);
        else await expectInvalid(MSG.INVALID_QTY);
        const res = await api.post('/api/drafts', { data: { serviceId: 'SV-01', qty: q } });
        if (valid) expect((await expectOk(res, 201)).fee).toBe(20 * q);
        else await expectErr(res, 400, 'INVALID_QTY', MSG.INVALID_QTY);
      });
    }

    // SV-02: ไม่มีช่องกรอก ฿500
    await test.step('SV-02 ฿500', async () => {
      await page.goto('/citizen/new/SV-02');
      await expect(page.getByTestId('service-name')).toHaveText('ขออนุญาตประกอบกิจการ');
      await expect(page.getByTestId('fee-total')).toHaveText('฿500');
      await expect(page.getByTestId('qty-input')).toHaveCount(0);
      await expect(page.getByTestId('area-input')).toHaveCount(0);
      const b = await expectOk(await api.post('/api/drafts', { data: { serviceId: 'SV-02' } }), 201);
      expect(b.fee).toBe(500);
    });
  });
});

// ===========================================================================
// 4. SUBMIT
// ===========================================================================

test.describe('SUBMIT', () => {
  test('TC-SUBMIT-01 · ยื่นคำขอ SV-01 ครบวงจร', async ({ browser }) => {
    await reset();
    const page = await citizenPage(browser, ID.somchai);

    await test.step('1 · กรอกข้อมูล', async () => {
      await page.goto('/citizen');
      await page.getByTestId('start-service-SV-01').click();
      await expect(page).toHaveURL(/\/citizen\/new\/SV-01/);
      await expect(page.getByTestId('wizard-step')).toHaveText('1/3 กรอกข้อมูล');
      await blurFill(page, 'qty-input', 2);
      await expect(page.getByTestId('fee-total')).toHaveText('฿40');
      await page.getByTestId('to-upload-btn').click();
    });

    await test.step('2 · แนบเอกสาร', async () => {
      await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');
      await expect(page.getByTestId('to-payment-btn')).toBeDisabled();
      await page.getByTestId('upload-input-id-card').setInputFiles(tf('id-card.pdf'));
      await expect(page.getByTestId('file-item')).toHaveCount(1);
      await expect(byAttr(page, 'file-item', 'data-doc-key', 'id-card')).toHaveCount(1);
      await expect(page.getByTestId('to-payment-btn')).toBeEnabled();
      await page.getByTestId('to-payment-btn').click();
    });

    await test.step('3 · สร้าง QR', async () => {
      await expect(page.getByTestId('wizard-step')).toHaveText('3/3 ชำระเงิน');
      await expect(page.getByTestId('payment-amount')).toHaveText('฿40');
      await page.getByTestId('create-qr-btn').click();
      await expect(page.getByTestId('qr-ref')).toHaveText('PP-0002');
      await expect(page.getByTestId('qr-expires')).toHaveAttribute('data-iso', '2026-12-01T09:15:00+07:00');
      await expect(page.getByTestId('payment-status')).toHaveText('รอชำระ');
      await expect(page.getByTestId('payment-status')).toHaveAttribute('data-status', 'PENDING');
    });

    await test.step('4 · ชำระ (callback) แล้วตรวจสอบ', async () => {
      const b = await expectOk(await pay(page.request, 'PP-0002', 40), 200, 'pay PP-0002');
      expect(b).toMatchObject({ status: 'PAID', caseNo: 'EG-2569-000031', receiptNo: 'RC-2569-000031', duplicate: false });
      await page.getByTestId('refresh-payment-btn').click();
      await expect(page.getByTestId('payment-status')).toHaveText('ชำระแล้ว');
      await expect(page.getByTestId('payment-status')).toHaveAttribute('data-status', 'PAID');
      await expect(page.getByTestId('submitted-case-no')).toHaveText('EG-2569-000031');
      await expect(page.getByTestId('receipt-no')).toHaveText('RC-2569-000031');
      await expect(page.getByTestId('receipt-amount')).toHaveText('฿40');
      await expect(page.getByTestId('receipt-paid-at')).toHaveAttribute('data-iso', T0);
    });

    await test.step('5 · หน้าคำขอ', async () => {
      await page.getByTestId('go-case-btn').click();
      await expect(page).toHaveURL(/\/citizen\/cases\/EG-2569-000031(\?.*)?$/);
      await expect(page.getByTestId('case-status')).toHaveText('ส่งคำขอแล้ว');
      await expect(page.getByTestId('case-status')).toHaveAttribute('data-status', 'SUBMITTED');
      await expect(page.getByTestId('case-fee')).toHaveText('฿40');
      await expect(page.getByTestId('sla-due')).toHaveText('4 ธ.ค. 2569 16:30');
      await expect(page.getByTestId('sla-due')).toHaveAttribute('data-iso', '2026-12-04T16:30:00+07:00');
      await expect(page.getByTestId('sla-level')).toHaveText('ปกติ');
      await expect(page.getByTestId('sla-level')).toHaveAttribute('data-level', 'normal');
      await expect(page.getByTestId('cancel-case-btn')).toHaveCount(1);
      await expect(page.getByTestId('case-step')).toHaveCount(0);
    });

    await test.step('off.reg1 เห็นในคิวท้ายกลุ่ม 4 ธ.ค.', async () => {
      const off = await staffPage(browser, 'off.reg1');
      await off.goto('/officer/queue');
      const row = byAttr(off, 'queue-row', 'data-case-no', 'EG-2569-000031');
      await expect(row).toHaveCount(1);
      await expect(row).toHaveAttribute('data-owner', '');
      await expect(row.getByTestId('row-owner')).not.toContainText(/off\.|head/);
      await expect(row.getByTestId('claim-btn')).toHaveCount(1);
      await expect(off.getByTestId('queue-row')).toHaveCount(18);
      const order = await off.getByTestId('queue-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-case-no')));
      const i30 = order.indexOf('EG-2569-000030');
      expect(order.indexOf('EG-2569-000031'), `ลำดับคิว ${order.join(',')}`).toBe(i30 + 1);
      expect(order[i30 + 2]).toBe('EG-2569-000016');
    });
  });

  test('TC-SUBMIT-02 · เอกสารบังคับครบก่อนชำระ', async ({ browser }) => {
    await reset();
    const page = await citizenPage(browser, ID.somchai);
    const missing = page.getByTestId('missing-docs');
    const toPay = page.getByTestId('to-payment-btn');
    const items = page.getByTestId('file-item');

    await test.step('SV-02', async () => {
      await page.goto('/citizen/new/SV-02');
      await page.getByTestId('to-upload-btn').click();
      await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');

      await page.getByTestId('upload-input-id-card').setInputFiles(tf('id-card.pdf'));
      await expect(items).toHaveCount(1);
      await expect(toPay).toBeDisabled();
      await expect(missing).toHaveText('ยังขาดเอกสาร: แผนที่ตั้ง');

      await page.getByTestId('upload-input-map').setInputFiles(tf('map.pdf'));
      await expect(items).toHaveCount(2);
      await expect(toPay).toBeEnabled();
      await expect(missing).toHaveCount(0);

      await byAttr(page, 'file-item', 'data-doc-key', 'map').getByTestId('file-remove-btn').click();
      await expect(items).toHaveCount(1);
      await expect(toPay).toBeDisabled();
      await expect(missing).toHaveText('ยังขาดเอกสาร: แผนที่ตั้ง');
    });

    await test.step('SV-03 (พื้นที่ 100)', async () => {
      await page.goto('/citizen/new/SV-03');
      await blurFill(page, 'area-input', 100);
      await expect(page.getByTestId('fee-total')).toHaveText('฿1,000');
      await page.getByTestId('to-upload-btn').click();
      await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');

      await page.getByTestId('upload-input-id-card').setInputFiles(tf('id-card.pdf'));
      await expect(items).toHaveCount(1);
      await expect(toPay).toBeDisabled();
      await expect(missing).toHaveText('ยังขาดเอกสาร: แบบแปลน, โฉนด');

      await page.getByTestId('upload-input-deed').setInputFiles(tf('deed.pdf'));
      await expect(items).toHaveCount(2);
      await expect(toPay).toBeDisabled();
      await expect(missing).toHaveText('ยังขาดเอกสาร: แบบแปลน');

      await page.getByTestId('upload-input-plan').setInputFiles(tf('plan-as-jpg.jpg'));
      await expect(page.getByTestId('upload-error')).toHaveText(MSG.PLAN_NOT_PDF);
      await expect(items).toHaveCount(2);
      await expect(toPay).toBeDisabled();
      await expect(missing).toHaveText('ยังขาดเอกสาร: แบบแปลน');

      await page.getByTestId('upload-input-plan').setInputFiles(tf('plan.pdf'));
      await expect(items).toHaveCount(3);
      await expect(toPay).toBeEnabled();
      await expect(missing).toHaveCount(0);
    });

    await test.step('API · 409 MISSING_DOCS แล้ว 201 เมื่อครบ', async () => {
      const api = page.request;
      const d = await createDraft(api, { serviceId: 'SV-03', areaSqm: 100 });
      await uploadOk(api, d.draftId, 'id-card', 'id-card.pdf');
      await uploadOk(api, d.draftId, 'deed', 'deed.pdf');
      await expectErr(await uploadApi(api, d.draftId, 'plan', tf('plan-as-jpg.jpg')), 400, 'PLAN_NOT_PDF', MSG.PLAN_NOT_PDF);
      const b = await expectErr(await api.post(`/api/drafts/${d.draftId}/payment`), 409, 'MISSING_DOCS', 'ยังขาดเอกสาร: แบบแปลน');
      expect(b.missing).toEqual(['แบบแปลน']);
      await uploadOk(api, d.draftId, 'plan', 'plan.pdf');
      await createQr(api, d.draftId);
    });
  });

  test('TC-SUBMIT-03 · ร่าง และการยกเลิก', async ({ browser }) => {
    await test.step('ส่วน A · ร่าง', async () => {
      await reset();
      const page = await citizenPage(browser, ID.somchai);
      await page.goto('/citizen');
      await expect(page.getByTestId('my-case-row')).toHaveCount(10);
      await expect(page.getByTestId('my-draft-row')).toHaveCount(2);
      await expect(byAttr(page, 'my-draft-row', 'data-draft-id', 'DR-0001')).toHaveAttribute('data-status', 'DRAFT');
      await expect(byAttr(page, 'my-draft-row', 'data-draft-id', 'DR-0002')).toHaveAttribute('data-status', 'PENDING_PAYMENT');
      for (const row of await page.getByTestId('my-draft-row').all()) await expect(row).not.toContainText('EG-');

      await byAttr(page, 'my-draft-row', 'data-draft-id', 'DR-0001').getByTestId('open-draft-btn').click();
      await expect(page).toHaveURL(/\/citizen\/new\/SV-01\?draft=DR-0001/);
      await expect(page.getByTestId('qty-input')).toHaveValue('2');
      await expect(page.getByTestId('fee-total')).toHaveText('฿40');

      await page.goto('/citizen/new/SV-01');
      await blurFill(page, 'qty-input', 3);
      await expect(page.getByTestId('fee-total')).toHaveText('฿60');
      await page.getByTestId('save-draft-btn').click();
      await expect(page.getByTestId('draft-id')).toHaveText('DR-0003');

      await page.goto('/citizen');
      await expect(page.getByTestId('my-draft-row')).toHaveCount(3);
      await expect(page.getByTestId('my-case-row')).toHaveCount(10);
      expect(await myCases(page.request)).toHaveLength(10);
      const drafts = await expectOk(await page.request.get('/api/drafts'), 200);
      expect(drafts.items).toHaveLength(3);
    });

    await test.step('ส่วน B · ยกเลิก …000030', async () => {
      await reset();
      const page = await citizenPage(browser, ID.somchai);
      await page.goto('/citizen/cases/EG-2569-000030');
      await expect(page.getByTestId('cancel-case-btn')).toHaveCount(1);
      await page.getByTestId('cancel-case-btn').click();
      await expect(page.getByTestId('cancel-confirm-text')).toHaveText(MSG.NO_REFUND);
      await page.getByTestId('confirm-cancel-btn').click();
      await expect(page.getByTestId('case-status')).toHaveText('ยกเลิก');
      await expect(page.getByTestId('case-status')).toHaveAttribute('data-status', 'CANCELLED');
      await expect(page.getByTestId('no-refund-note')).toHaveText(MSG.NO_REFUND);
      await expect(page.getByTestId('cancel-case-btn')).toHaveCount(0);

      const off = await staffPage(browser, 'off.reg1');
      await off.goto('/officer/queue');
      await expect(off.getByTestId('queue-row')).toHaveCount(16);
      await expect(byAttr(off, 'queue-row', 'data-case-no', 'EG-2569-000030')).toHaveCount(0);

      const ex = await staffPage(browser, 'exec1');
      await ex.goto('/dashboard');
      await expect(ex.getByTestId('kpi-backlog')).toHaveText('20');
      await expect(ex.getByTestId('kpi-received')).toHaveText('3');
    });

    await test.step('ส่วน C · ยกเลิกไม่ได้เมื่อมีผู้รับ', async () => {
      await reset();
      const off = await staffApi('off.reg1');
      const c = await expectOk(await off.post('/api/officer/cases/EG-2569-000030/claim'), 200, 'claim 030');
      expect(c.owner).toBe('off.reg1');
      const page = await citizenPage(browser, ID.somchai);
      await page.goto('/citizen/cases/EG-2569-000030');
      await expect(page.getByTestId('case-status')).toHaveText('กำลังตรวจสอบ');
      await expect(page.getByTestId('case-status')).toHaveAttribute('data-status', 'IN_REVIEW');
      await expect(page.getByTestId('cancel-case-btn')).toHaveCount(0);
      await expectErr(await page.request.post('/api/cases/EG-2569-000030/cancel'), 409, 'CANNOT_CANCEL', MSG.CANNOT_CANCEL);
      await expectErr(await page.request.post('/api/cases/EG-2569-000013/cancel'), 409);
    });

    await test.step('ส่วน E · ลบร่าง', async () => {
      await reset();
      const page = await citizenPage(browser, ID.somchai);
      const api = page.request;
      expect((await api.delete('/api/drafts/DR-0001')).status()).toBe(204);
      await expectErr(await api.get('/api/drafts/DR-0001'), 404, 'NOT_FOUND');
      await page.goto('/citizen');
      await expect(page.getByTestId('my-draft-row')).toHaveCount(1);
      await expect(byAttr(page, 'my-draft-row', 'data-draft-id', 'DR-0002')).toHaveCount(1);
      expect((await api.delete('/api/drafts/DR-0002')).status()).toBe(204);
      expect((await api.get('/api/payments/PP-0001')).status()).toBe(404);
      expect((await pay(api, 'PP-0001', 500)).status()).toBe(404);
      expect(await myCases(api)).toHaveLength(10);
    });

    await test.step('ส่วน F · ยกเลิกชนกับรับเรื่องพร้อมกัน', async () => {
      await reset();
      const cit = await citizenApi(ID.somchai);
      const off = await staffApi('off.reg1');
      const [rc, rk] = await Promise.all([
        cit.post('/api/cases/EG-2569-000030/cancel'),
        off.post('/api/officer/cases/EG-2569-000030/claim'),
      ]);
      const sc = rc.status();
      const sk = rk.status();
      expect(sc === 200 && sk === 200, 'ห้ามสำเร็จทั้งสองฝั่ง').toBe(false);
      const state = await expectOk(await off.get('/api/cases/EG-2569-000030'), 200);
      const mine = await expectOk(await off.get('/api/officer/queue?filter=mine'), 200);
      if (sc === 200) {
        await expectErr(rk, 409, 'INVALID_STATE');
        expect(state.status).toBe('CANCELLED');
        expect(state.owner == null || state.owner === '').toBe(true);
        expect(mine.items).toHaveLength(3);
      } else {
        expect(sk, `cancel=${sc} claim=${sk}`).toBe(200);
        await expectErr(rc, 409, 'CANNOT_CANCEL');
        expect(state.status).toBe('IN_REVIEW');
        expect(state.owner).toBe('off.reg1');
        expect(mine.items).toHaveLength(4);
      }
    });
  });
});

// ===========================================================================
// 5. UPLOAD
// ===========================================================================

/** เปิดร่าง SV-01 (qty 1) ที่ขั้นแนบเอกสาร */
async function gotoUploadStep(page) {
  await page.goto('/citizen/new/SV-01');
  await blurFill(page, 'qty-input', 1);
  await page.getByTestId('to-upload-btn').click();
  await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');
}

test.describe('UPLOAD', () => {
  test('TC-UPLOAD-01 · ขนาดและจำนวนไฟล์', async ({ browser }) => {
    await reset();
    const page = await citizenPage(browser, ID.somchai);
    const api = page.request;
    const items = page.getByTestId('file-item');
    const err = page.getByTestId('upload-error');

    await test.step('ขนาด (หน้าจอ)', async () => {
      await gotoUploadStep(page);
      for (const n of [5242879, 5242880]) {
        await page.getByTestId('upload-input-id-card').setInputFiles(tf(`size-${n}.pdf`));
        await expect(items, `size-${n}.pdf รับ`).toHaveCount(1, { timeout: 30_000 });
        await expect(err).toBeHidden();
        await items.first().getByTestId('file-remove-btn').click();
        await expect(items).toHaveCount(0);
      }
      await page.getByTestId('upload-input-id-card').setInputFiles(tf('size-5242881.pdf'));
      await expect(err).toHaveText(MSG.FILE_TOO_LARGE, { timeout: 30_000 });
      await expect(items).toHaveCount(0);
    });

    await test.step('ขนาด (API)', async () => {
      for (const n of [5242879, 5242880]) {
        const d = await createDraft(api, { serviceId: 'SV-01', qty: 1 });
        const b = await uploadOk(api, d.draftId, 'id-card', `size-${n}.pdf`);
        expect(b.size).toBe(n);
      }
      const d = await createDraft(api, { serviceId: 'SV-01', qty: 1 });
      const r = await uploadApi(api, d.draftId, 'id-card', tf('size-5242881.pdf'));
      expect(r.status(), 'ต้องไม่ใช่ 413 ของเฟรมเวิร์ก').not.toBe(413);
      await expectErr(r, 400, 'FILE_TOO_LARGE', MSG.FILE_TOO_LARGE);
    });

    await test.step('จำนวน (หน้าจอ)', async () => {
      await gotoUploadStep(page);
      await page.getByTestId('upload-input-id-card').setInputFiles(tf('id-card.pdf'));
      await expect(items).toHaveCount(1);
      await page.getByTestId('upload-input-extra').setInputFiles(['multi-1.pdf', 'multi-2.pdf', 'multi-3.pdf', 'multi-4.pdf'].map((n) => tf(n)));
      await expect(items).toHaveCount(5);
      await page.getByTestId('upload-input-extra').setInputFiles(tf('multi-5.pdf'));
      await expect(err).toHaveText(MSG.FILE_COUNT);
      await expect(items).toHaveCount(5);
      await byAttr(page, 'file-item', 'data-doc-key', 'extra').first().getByTestId('file-remove-btn').click();
      await expect(items).toHaveCount(4);
      await page.getByTestId('upload-input-extra').setInputFiles(tf('multi-5.pdf'));
      await expect(items).toHaveCount(5);
      await expect(byAttr(page, 'file-item', 'data-name', 'multi-5.pdf')).toHaveCount(1);
    });

    await test.step('จำนวน (API)', async () => {
      const d = await createDraft(api, { serviceId: 'SV-01', qty: 1 });
      await uploadOk(api, d.draftId, 'id-card', 'id-card.pdf');
      for (const n of ['multi-1.pdf', 'multi-2.pdf', 'multi-3.pdf', 'multi-4.pdf']) await uploadOk(api, d.draftId, 'extra', n);
      await expectErr(await uploadApi(api, d.draftId, 'extra', tf('multi-5.pdf')), 400, 'FILE_COUNT', MSG.FILE_COUNT);
    });
  });

  test('TC-UPLOAD-02 · ชนิดไฟล์จากเนื้อไฟล์', async ({ browser }) => {
    await reset();
    const page = await citizenPage(browser, ID.somchai);
    const api = page.request;
    const items = page.getByTestId('file-item');
    const err = page.getByTestId('upload-error');
    const slot = page.getByTestId('upload-input-id-card');

    await gotoUploadStep(page);
    for (const name of ['ok-id.pdf', 'real.jpg', 'real.png']) {
      await test.step(`รับ ${name}`, async () => {
        await slot.setInputFiles(tf(name));
        await expect(items).toHaveCount(1);
        await expect(byAttr(page, 'file-item', 'data-name', name)).toHaveCount(1);
        await expect(err).toBeHidden();
        await items.first().getByTestId('file-remove-btn').click();
        await expect(items).toHaveCount(0);
      });
    }

    const rejected = [
      tf('fake-text.pdf'),
      tf('fake-text.jpg'),
      tf('exe-as.png'),
      tf('notes.txt'),
      tf('fake-text.pdf', 'application/pdf'), // ไม่เชื่อ Content-Type (A-49)
    ];
    for (const f of rejected) {
      await test.step(`ปฏิเสธ ${f.name} (${f.mimeType}) บนจอ`, async () => {
        await slot.setInputFiles(f);
        await expect(err).toHaveText(MSG.FILE_TYPE);
        await expect(items).toHaveCount(0);
      });
    }

    await test.step('API', async () => {
      const ok = await createDraft(api, { serviceId: 'SV-01', qty: 1 });
      await uploadOk(api, ok.draftId, 'id-card', 'ok-id.pdf');
      await uploadOk(api, ok.draftId, 'extra', 'real.jpg');
      await uploadOk(api, ok.draftId, 'extra', 'real.png');

      const d = await createDraft(api, { serviceId: 'SV-01', qty: 1 });
      const apiRejected = [tf('fake-text.pdf', 'application/octet-stream'), ...rejected];
      for (const f of apiRejected) {
        await expectErr(await uploadApi(api, d.draftId, 'id-card', f), 400, 'FILE_TYPE', MSG.FILE_TYPE);
      }
      // ไฟล์ที่ปฏิเสธไม่ถูกเก็บ: ร่างยังขาดบัตรประชาชน
      const pr = await api.post(`/api/drafts/${d.draftId}/payment`);
      const b = await expectErr(pr, 409, 'MISSING_DOCS');
      expect(b.missing).toEqual(['บัตรประชาชน']);
      const g = await expectOk(await api.get(`/api/drafts/${d.draftId}`), 200);
      const files = g.files ?? g.item?.files ?? g.draft?.files;
      if (Array.isArray(files)) expect(files).toHaveLength(0);
    });
  });
});

// ===========================================================================
// 6. PAY
// ===========================================================================

test.describe('PAY', () => {
  test('TC-PAY-01 · อายุ QR 15:00', async ({ browser }) => {
    await test.step('รอบ 1 · 09:00:00 (อายุ 5:00) → PAID', async () => {
      await reset();
      const api = await citizenApi(ID.somchai);
      const b = await expectOk(await pay(api, 'PP-0001', 500), 200);
      expect(b.status).toBe('PAID');
      expect(b.caseNo).toBe('EG-2569-000031');
    });

    await test.step('รอบ 2 · 09:09:59 (อายุ 14:59) → PAID', async () => {
      await reset();
      await clock('2026-12-01T09:09:59+07:00');
      const api = await citizenApi(ID.somchai);
      const b = await expectOk(await pay(api, 'PP-0001', 500), 200);
      expect(b.status).toBe('PAID');
      expect(b.caseNo).toBe('EG-2569-000031');
    });

    await test.step('รอบ 3 · 09:10:00 (อายุ 15:00 พอดี) → 410', async () => {
      await reset();
      await clock('2026-12-01T09:10:00+07:00');
      const page = await citizenPage(browser, ID.somchai);
      const api = page.request;
      await expectErr(await pay(api, 'PP-0001', 500), 410, 'QR_EXPIRED', MSG.QR_EXPIRED);
      const p = await expectOk(await api.get('/api/payments/PP-0001'), 200);
      expect(p.status).toBe('EXPIRED');
      expect(await myCases(api)).toHaveLength(10);

      await page.goto('/citizen/new/SV-02?draft=DR-0002');
      await expect(page.getByTestId('qr-expired-msg')).toHaveText(MSG.QR_EXPIRED);
      await expect(page.getByTestId('payment-status')).toHaveText('QR หมดอายุ');
      await expect(page.getByTestId('payment-status')).toHaveAttribute('data-status', 'EXPIRED');
      await expect(page.getByTestId('regenerate-qr-btn')).toHaveCount(1);
      await page.getByTestId('regenerate-qr-btn').click();
      await expect(page.getByTestId('qr-ref')).toHaveText('PP-0002');
      await expect(page.getByTestId('qr-expires')).toHaveAttribute('data-iso', '2026-12-01T09:25:00+07:00');
      const b = await expectOk(await pay(api, 'PP-0002', 500), 200);
      expect(b.caseNo).toBe('EG-2569-000031');
    });

    await test.step('รอบ 4 · 09:10:01 (อายุ 15:01) → 410', async () => {
      await reset();
      await clock('2026-12-01T09:10:01+07:00');
      const api = await citizenApi(ID.somchai);
      await expectErr(await pay(api, 'PP-0001', 500), 410, 'QR_EXPIRED');
    });
  });

  test('TC-PAY-02 · ยอดเงินและ callback ซ้ำ', async () => {
    await reset();
    const api = await citizenApi(ID.somchai);
    const q = await draftWithQr(api, 'SV-01', { qty: 1 });
    expect(q.ref).toBe('PP-0002');
    expect(q.amount).toBe(20);

    for (const amount of [19, 21]) {
      await test.step(`ยอด ${amount} → 422`, async () => {
        await expectErr(await pay(api, 'PP-0002', amount), 422, 'AMOUNT_MISMATCH', MSG.AMOUNT_MISMATCH);
        const p = await expectOk(await api.get('/api/payments/PP-0002'), 200);
        expect(p.status).toBe('PENDING');
        expect(await myCases(api)).toHaveLength(10);
      });
    }

    await test.step('ยอด 20 → PAID', async () => {
      const b = await expectOk(await pay(api, 'PP-0002', 20), 200);
      expect(b).toMatchObject({ status: 'PAID', caseNo: 'EG-2569-000031', receiptNo: 'RC-2569-000031', duplicate: false });
      expect(await myCases(api)).toHaveLength(11);
    });

    await test.step('callback ซ้ำ → duplicate:true เลขเดิม', async () => {
      const b = await expectOk(await pay(api, 'PP-0002', 20), 200);
      expect(b).toMatchObject({ status: 'PAID', caseNo: 'EG-2569-000031', receiptNo: 'RC-2569-000031', duplicate: true });
      expect(await myCases(api)).toHaveLength(11);
    });

    await test.step('ใบถัดไป → 000032 (ไม่มีเลขข้าม)', async () => {
      const q2 = await draftWithQr(api, 'SV-01', { qty: 1 });
      const b = await expectOk(await pay(api, q2.ref, 20), 200);
      expect(b).toMatchObject({ status: 'PAID', caseNo: 'EG-2569-000032', receiptNo: 'RC-2569-000032' });
    });
  });

  test('TC-PAY-03 · ชำระพร้อมกัน เลขไม่ซ้ำ', async () => {
    await reset();
    const sc = await citizenApi(ID.somchai);
    const sy = await citizenApi(ID.somying);
    const qs = [];
    for (const api of [sc, sc, sc, sy, sy, sy]) qs.push({ api, ...(await draftWithQr(api, 'SV-01', { qty: 1 })) });
    expect(qs.map((q) => q.ref).sort()).toEqual(['PP-0002', 'PP-0003', 'PP-0004', 'PP-0005', 'PP-0006', 'PP-0007']);

    const results = await Promise.all(qs.map((q) => pay(q.api, q.ref, 20)));
    const bodies = [];
    for (const r of results) bodies.push(await expectOk(r, 200, 'pay พร้อมกัน'));
    const expectCases = [31, 32, 33, 34, 35, 36].map((n) => `EG-2569-0000${n}`);
    const expectRc = [31, 32, 33, 34, 35, 36].map((n) => `RC-2569-0000${n}`);
    expect(bodies.map((b) => b.caseNo).sort()).toEqual(expectCases);
    expect(bodies.map((b) => b.receiptNo).sort()).toEqual(expectRc);
    for (const b of bodies) {
      expect(b.status).toBe('PAID');
      expect(b.receiptNo.slice(-6), 'ลำดับใบเสร็จตรงกับเลขคำขอ').toBe(b.caseNo.slice(-6));
    }

    const isNew = (c) => Number(c.caseNo.slice(-6)) >= 31;
    const scCases = await myCases(sc);
    const syCases = await myCases(sy);
    expect(scCases.filter(isNew)).toHaveLength(3);
    expect(syCases.filter(isNew)).toHaveLength(3);
    expect(scCases).toHaveLength(13);
    expect(syCases).toHaveLength(14);
    const scExpected = bodies.slice(0, 3).map((b) => b.caseNo).sort();
    expect(scCases.filter(isNew).map((c) => c.caseNo).sort()).toEqual(scExpected);

    const next = await draftWithQr(sc, 'SV-01', { qty: 1 });
    const nb = await expectOk(await pay(sc, next.ref, 20), 200);
    expect(nb.caseNo).toBe('EG-2569-000037');
  });

  test('TC-PAY-04 · เลขคำขอข้ามปี', async ({ browser }) => {
    await reset();
    await clock('2026-12-31T23:58:00+07:00');
    const page = await citizenPage(browser, ID.somchai);
    const api = page.request;
    let ref = '';

    await test.step('1 · 23:58 สร้างร่าง + QR ยังไม่มีเลข', async () => {
      await gotoUploadStep(page);
      await page.getByTestId('upload-input-id-card').setInputFiles(tf('id-card.pdf'));
      await expect(page.getByTestId('file-item')).toHaveCount(1);
      await page.getByTestId('to-payment-btn').click();
      await expect(page.getByTestId('wizard-step')).toHaveText('3/3 ชำระเงิน');
      await page.getByTestId('create-qr-btn').click();
      await expect(page.getByTestId('qr-ref')).toHaveText(/^PP-\d{4}$/);
      ref = (await page.getByTestId('qr-ref').innerText()).trim();
      await expect(page.getByTestId('submitted-case-no')).toHaveCount(0);
      expect(await myCases(api)).toHaveLength(10);
    });

    await test.step('2 · 23:59 ชำระ → EG-2569-000031', async () => {
      await clock('2026-12-31T23:59:00+07:00');
      const b = await expectOk(await pay(api, ref, 20), 200);
      expect(b).toMatchObject({ status: 'PAID', caseNo: 'EG-2569-000031', receiptNo: 'RC-2569-000031' });
      await page.getByTestId('refresh-payment-btn').click();
      await expect(page.getByTestId('payment-status')).toHaveAttribute('data-status', 'PAID');
      await expect(page.getByTestId('submitted-case-no')).toHaveText('EG-2569-000031');
      await expect(page.getByTestId('receipt-no')).toHaveText('RC-2569-000031');
      await expect(page.getByTestId('receipt-paid-at')).toHaveAttribute('data-iso', '2026-12-31T23:59:00+07:00');
    });

    await test.step('3 · 2027-01-01 00:00 → EG-2570-000001', async () => {
      await clock('2027-01-01T00:00:00+07:00');
      const q = await draftWithQr(api, 'SV-01', { qty: 1 });
      const b = await expectOk(await pay(api, q.ref, 20), 200);
      expect(b).toMatchObject({ status: 'PAID', caseNo: 'EG-2570-000001', receiptNo: 'RC-2570-000001' });
    });

    await test.step('4 · ใบที่ 2 ของปี 2570 → EG-2570-000002', async () => {
      const q = await draftWithQr(api, 'SV-01', { qty: 1 });
      const b = await expectOk(await pay(api, q.ref, 20), 200);
      expect(b.caseNo).toBe('EG-2570-000002');
    });

    await test.step('5 · EG-2569-000031 ยังเป็นเลขเดิม', async () => {
      const c = await expectOk(await api.get('/api/cases/EG-2569-000031'), 200);
      expect(c.caseNo).toBe('EG-2569-000031');
      const nos = (await myCases(api)).map((x) => x.caseNo);
      expect(nos).toEqual(expect.arrayContaining(['EG-2569-000031', 'EG-2570-000001', 'EG-2570-000002']));
    });
  });
});

// Helper ของบล็อก T02 (Playwright B: QUEUE SLA NOTI WORKFLOW DOC)
// อ้างอิงเฉพาะ CONTRACT.md / TEST-PLAN.md / TEST-DATA.md
// ทุก TC เริ่มด้วย RESET และต้องล็อกอินใหม่ด้วย context ใหม่หลัง RESET ทุกครั้ง (CONTRACT 0.9)
const base = require('@playwright/test');
const { expect } = base;

const PASSWORD = 'Test@1234';
const OTP = '123456';

const ID = {
  SOMCHAI: '1101700123456', // สมชาย ใจดี
  SOMYING: '3100600987659', // สมหญิง รักไทย
  MANA: '5500400111221',
  PITI: '1909900555015', // ปิติ มีสุข
};

const STAFF_NAME = {
  'off.reg1': 'เจ้าหน้าที่ทะเบียน 1',
  'off.reg2': 'เจ้าหน้าที่ทะเบียน 2',
  'off.works1': 'เจ้าหน้าที่โยธา 1',
  head1: 'หัวหน้าฝ่าย',
  exec1: 'ผู้บริหาร',
  audit1: 'ผู้ตรวจสอบภายใน',
  admin1: 'ผู้ดูแลระบบ',
};

const MSG = {
  ALREADY_CLAIMED: 'มีเจ้าหน้าที่รับเรื่องนี้แล้ว',
  WORKLOAD_LIMIT: 'รับงานได้สูงสุด 10 เรื่อง',
  RETURN_LIMIT: 'ตีกลับได้สูงสุด 2 ครั้ง',
  REASON_TOO_SHORT: 'กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร',
  NO_REFUND: 'ค่าธรรมเนียมที่ชำระแล้วไม่คืน',
  NOTI_EMPTY: 'ไม่มีแจ้งเตือน',
};

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

const LEVEL_TH = {
  normal: 'ปกติ',
  near: 'ใกล้ครบกำหนด',
  overdue: 'เกินกำหนด',
  paused: 'หยุดนับ',
  closed: 'ปิดแล้ว',
};

const REQUIRED_DOCS = {
  'SV-01': ['id-card'],
  'SV-02': ['id-card', 'map'],
  'SV-03': ['id-card', 'plan', 'deed'],
};

const T = { timeout: 15_000 };

/** เลขคำขอเต็มจากเลขท้าย เช่น C(25) → EG-2569-000025 */
const C = (n, year = 2569) => `EG-${year}-${String(n).padStart(6, '0')}`;

/** ค่าธรรมเนียมตามกฎ (TEST-DATA ข้อ 2) — ใช้เป็น oracle ไม่อ่านจากเว็บ */
function feeOf(service, { qty = 1, area = 100 } = {}) {
  if (service === 'SV-01') return 20 * qty;
  if (service === 'SV-02') return 500;
  return area <= 100 ? 1000 : 1000 + 10 * (area - 100);
}

/** PDF จริงขนาด n ไบต์ (TEST-DATA ข้อ 11) */
function pdf(n = 1024) {
  const head = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n');
  const tail = Buffer.from('\ntrailer<</Root 1 0 R>>\n%%EOF\n');
  return Buffer.concat([head, Buffer.alloc(n - head.length - tail.length, 0x20), tail]);
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
/** '2026-12-04T16:30:00+07:00' → '4 ธ.ค. 2569 16:30' (CONTRACT 0.2) */
function thaiDT(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) throw new Error(`bad iso ${iso}`);
  return `${Number(m[3])} ${TH_MONTHS[Number(m[2]) - 1]} ${Number(m[1]) + 543} ${m[4]}:${m[5]}`;
}

async function expectErr(resp, status, code, message) {
  const body = await resp.text();
  expect(resp.status(), `HTTP ${resp.url()} body=${body}`).toBe(status);
  let j = {};
  try { j = JSON.parse(body); } catch { /* ไม่ใช่ JSON */ }
  if (code) expect(j.code, body).toBe(code);
  if (message) expect(j.message, body).toBe(message);
  return j;
}

async function okJson(resp, status = 200) {
  const body = await resp.text();
  expect(resp.status(), `HTTP ${resp.url()} body=${body}`).toBe(status);
  return body ? JSON.parse(body) : {};
}

class EG {
  constructor(browser, playwright, baseURL) {
    this.browser = browser;
    this.playwright = playwright;
    this.base = String(baseURL).replace(/\/+$/, '');
    this.contexts = [];
  }

  async _testApi() {
    if (!this.api) this.api = await this.playwright.request.newContext({ baseURL: this.base });
    return this.api;
  }

  /** RESET: ล้างทุกอย่าง + ปิด context เดิมทั้งหมด (cookie เก่าใช้ไม่ได้) */
  async reset() {
    await this.closeContexts();
    const api = await this._testApi();
    const j = await okJson(await api.post('/api/test/reset'));
    expect(j.ok).toBe(true);
    expect(j.now).toBe('2026-12-01T09:00:00+07:00');
  }

  /** CLOCK(t): นาฬิกาแช่แข็ง */
  async clock(now) {
    const api = await this._testApi();
    const j = await okJson(await api.put('/api/test/clock', { data: { now } }));
    expect(j.now).toBe(now);
  }

  async closeContexts() {
    const list = this.contexts;
    this.contexts = [];
    await Promise.all(list.map((c) => c.close().catch(() => {})));
  }

  async dispose() {
    await this.closeContexts();
    if (this.api) await this.api.dispose().catch(() => {});
  }

  /** browser context ใหม่ (cookie ใช้ร่วมระหว่าง ctx.request และหน้าเว็บ) */
  async ctx() {
    const ctx = await this.browser.newContext({ baseURL: this.base });
    ctx.on('page', (p) => p.on('dialog', (d) => d.accept().catch(() => {})));
    this.contexts.push(ctx);
    return ctx;
  }

  /** LOGIN_S(user) ผ่าน API → context ที่ล็อกอินแล้ว */
  async staff(username) {
    const ctx = await this.ctx();
    await okJson(await ctx.request.post('/api/auth/staff/login', { data: { username, password: PASSWORD } }));
    return ctx;
  }

  /** LOGIN_C(เลขบัตร) ผ่าน API → context ที่ล็อกอินแล้ว */
  async citizen(idNo = ID.SOMCHAI) {
    const ctx = await this.ctx();
    await okJson(await ctx.request.post('/api/auth/thaid/start', { data: { idNo } }));
    const j = await okJson(await ctx.request.post('/api/auth/thaid/verify', { data: { idNo, otp: OTP } }));
    expect(j.registered).toBe(true);
    return ctx;
  }

  /** context ไม่ล็อกอิน */
  async anon() {
    return this.ctx();
  }

  /** NEW_PAID(ผู้ยื่น, บริการ, เวลา, ตัวเลือก) → { ctx (ผู้ยื่นที่ล็อกอินแล้ว), caseNo, ref } */
  async newPaid({ id = ID.SOMCHAI, service = 'SV-01', at, qty = 1, area = 100 } = {}) {
    if (at) await this.clock(at);
    const ctx = await this.citizen(id);
    const data = { serviceId: service };
    if (service === 'SV-01') data.qty = qty;
    if (service === 'SV-03') data.areaSqm = area;
    const d = await okJson(await ctx.request.post('/api/drafts', { data }), 201);
    expect(d.draftId).toMatch(/^DR-\d{4}$/);
    for (const docKey of REQUIRED_DOCS[service]) {
      await okJson(
        await ctx.request.post(`/api/drafts/${d.draftId}/files`, {
          multipart: { file: { name: `${docKey}.pdf`, mimeType: 'application/pdf', buffer: pdf(1024) }, docKey },
        }),
        201,
      );
    }
    const p = await okJson(await ctx.request.post(`/api/drafts/${d.draftId}/payment`), 201);
    const fee = feeOf(service, { qty, area });
    const paid = await okJson(await ctx.request.post(`/api/test/payments/${p.ref}/pay`, { data: { amount: fee } }));
    expect(paid.status).toBe('PAID');
    const pay = await okJson(await ctx.request.get(`/api/payments/${p.ref}`));
    expect(pay.caseNo).toMatch(/^EG-\d{4}-\d{6}$/);
    return { ctx, caseNo: pay.caseNo, ref: p.ref };
  }

  async page(ctx, path) {
    const page = await ctx.newPage();
    const resp = await page.goto(path);
    return { page, resp };
  }
}

// ---------- API helpers ----------
async function getCase(ctx, caseNo) {
  return okJson(await ctx.request.get(`/api/cases/${caseNo}`));
}
const claimApi = (ctx, caseNo) => ctx.request.post(`/api/officer/cases/${caseNo}/claim`);
const returnApi = (ctx, caseNo, reason) => ctx.request.post(`/api/officer/cases/${caseNo}/return`, { data: { reason } });
const forwardApi = (ctx, caseNo, note) =>
  ctx.request.post(`/api/officer/cases/${caseNo}/forward`, { data: note ? { note } : {} });
const approveApi = (ctx, caseNo) => ctx.request.post(`/api/cases/${caseNo}/approve`);
const rejectApi = (ctx, caseNo, reason) => ctx.request.post(`/api/cases/${caseNo}/reject`, { data: { reason } });
const issueApi = (ctx, caseNo) => ctx.request.post(`/api/officer/cases/${caseNo}/issue`);
const resubmitApi = (ctx, caseNo) => ctx.request.post(`/api/cases/${caseNo}/resubmit`);

async function notisApi(ctx) {
  const j = await okJson(await ctx.request.get('/api/notifications'));
  return j.items.map((i) => `${i.caseNo}:${i.level}`).sort();
}

async function auditApi(ctx, query) {
  const qs = new URLSearchParams({ actor: '', event: '', from: '', to: '', ...query }).toString();
  return okJson(await ctx.request.get(`/api/audit?${qs}`));
}

async function dashboardApi(ctx, period = '2026-12', service = 'ALL') {
  return okJson(await ctx.request.get(`/api/dashboard?period=${period}&service=${service}`));
}

// ---------- UI helpers ----------
const rowSel = (testid, caseNo) => `[data-testid="${testid}"][data-case-no="${caseNo}"]`;

async function attrs(page, testid, attr = 'data-case-no') {
  return page.getByTestId(testid).evaluateAll((els, a) => els.map((e) => e.getAttribute(a)), attr);
}

async function expectRows(page, testid, expected) {
  await expect.poll(() => attrs(page, testid), T).toEqual(expected);
}

async function expectStatus(page, code) {
  const s = page.getByTestId('case-status');
  await expect(s).toHaveAttribute('data-status', code, T);
  await expect(s).toHaveText(STATUS_TH[code], T);
}

async function expectLevel(locator, level) {
  await expect(locator).toHaveText(LEVEL_TH[level], T);
}

async function expectSlaLevel(page, level) {
  const l = page.getByTestId('sla-level');
  await expect(l).toHaveAttribute('data-level', level, T);
  await expect(l).toHaveText(LEVEL_TH[level], T);
}

async function workloadIs(ctx, n) {
  const page = await ctx.newPage();
  await page.goto('/officer/queue');
  await expect(page.getByTestId('workload-count')).toHaveText(String(n), T);
  await page.close();
}

async function selectQueueFilter(page, value) {
  await page.getByTestId('queue-filter').selectOption(value);
}

/** ตีกลับผ่านหน้า officer: return-btn → return-reason → return-submit */
async function uiReturn(page, reason) {
  const input = page.getByTestId('return-reason');
  if (!(await input.isVisible())) await page.getByTestId('return-btn').click();
  await input.fill(reason);
  await page.getByTestId('return-submit').click();
}

/** ไม่อนุมัติผ่านหน้า: reject-btn → reject-reason → reject-submit */
async function uiReject(page, reason) {
  const input = page.getByTestId('reject-reason');
  if (!(await input.isVisible())) await page.getByTestId('reject-btn').click();
  await input.fill(reason);
  await page.getByTestId('reject-submit').click();
}

/** หน้าแจ้งเตือน + API ของผู้ใช้ ตรงกับรายการที่คาด ('EG-…:near') */
async function expectNotis(eg, username, expected, ctx) {
  const c = ctx || (await eg.staff(username));
  const exp = [...expected].sort();
  expect(await notisApi(c), `API notifications ของ ${username}`).toEqual(exp);
  const page = await c.newPage();
  await page.goto('/notifications');
  if (exp.length === 0) {
    await expect(page.getByTestId('noti-empty')).toHaveText(MSG.NOTI_EMPTY, T);
    await expect(page.getByTestId('noti-item')).toHaveCount(0);
  } else {
    await expect
      .poll(async () => {
        const items = await page.getByTestId('noti-item').evaluateAll((els) =>
          els.map((e) => `${e.getAttribute('data-case-no')}:${e.getAttribute('data-level')}`),
        );
        return items.sort();
      }, T)
      .toEqual(exp);
    for (const key of exp) {
      const [caseNo, level] = key.split(':');
      await expect(
        page.locator(`[data-testid="noti-item"][data-case-no="${caseNo}"][data-level="${level}"]`),
      ).toContainText(`คำขอ ${caseNo} ${LEVEL_TH[level]}`);
    }
  }
  await expect(page.getByTestId('bell-count')).toHaveText(String(exp.length), T);
  await page.close();
  return c;
}

/** เปิด /verify/:code แบบไม่ล็อกอิน */
async function openVerify(eg, code) {
  const ctx = await eg.anon();
  const page = await ctx.newPage();
  const resp = await page.goto(`/verify/${code}`);
  return { page, resp };
}

const test = base.test.extend({
  eg: async ({ browser, playwright, baseURL }, use) => {
    const eg = new EG(browser, playwright, baseURL || process.env.BASE_URL || 'http://localhost:3000');
    await use(eg);
    await eg.dispose();
  },
});

module.exports = {
  test,
  expect,
  ID,
  STAFF_NAME,
  MSG,
  STATUS_TH,
  LEVEL_TH,
  T,
  C,
  feeOf,
  pdf,
  thaiDT,
  expectErr,
  okJson,
  getCase,
  claimApi,
  returnApi,
  forwardApi,
  approveApi,
  rejectApi,
  issueApi,
  resubmitApi,
  notisApi,
  auditApi,
  dashboardApi,
  rowSel,
  attrs,
  expectRows,
  expectStatus,
  expectLevel,
  expectSlaLevel,
  workloadIs,
  selectQueueFilter,
  uiReturn,
  uiReject,
  expectNotis,
  openVerify,
};

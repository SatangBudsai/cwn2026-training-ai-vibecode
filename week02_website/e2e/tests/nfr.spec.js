// TC-NFR-01..04 (TEST-PLAN section 16). Black-box: CONTRACT testids / API only.
//
// Environment variables
//   BASE_URL           web address (default http://localhost:3100, via lib/common.js)
//   E2E_DB_PATH        SQLite (or other) database file inspected by TC-NFR-04.
//                      Default: <e2e>/../app/data/egov.db  (the app should honour DB_PATH, CONTRACT 0.11)
//                      A sibling "-wal" / "-journal" file is scanned too if it exists.
//   E2E_LOG_PATH       optional web-server log file, scanned by TC-NFR-04 as well
//   E2E_NOHOOK_URL     optional base URL of the same app started WITHOUT TEST_MODE (TC-NFR-03 last bullet)
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default || require('@axe-core/playwright');
const c = require('../lib/c');

const STATUS_TH = { DRAFT: 'ร่าง', PENDING_PAYMENT: 'รอชำระเงิน', SUBMITTED: 'ส่งคำขอแล้ว', IN_REVIEW: 'กำลังตรวจสอบ', NEED_FIX: 'รอแก้ไขเอกสาร', PENDING_APPROVAL: 'รออนุมัติ', APPROVED: 'อนุมัติ', COMPLETED: 'เสร็จสิ้น', REJECTED: 'ไม่อนุมัติ', CANCELLED: 'ยกเลิก' };
const LEVEL_TH = { normal: 'ปกติ', near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด', paused: 'หยุดนับ', closed: 'ปิดแล้ว' };

// ---------------------------------------------------------------- NFR-01
test('TC-NFR-01 Responsive 375/768/1280 @P1', async ({ page }) => {
  test.setTimeout(300000);
  await c.reset();
  const sizes = [[375, 812], [768, 1024], [1280, 800]];
  const groups = [
    ['anon', null, ['/login', '/verify/K7M2Q9XA']],
    ['somchai', 'citizen', ['/citizen', '/citizen/new/SV-03', '/citizen/cases/EG-2569-000013']],
    ['off.reg1', 'staff', ['/officer/queue', '/officer/cases/EG-2569-000020']],
    ['head1', 'staff', ['/head/approvals']],
    ['exec1', 'staff', ['/dashboard']],
    ['audit1', 'staff', ['/audit']],
    ['admin1', 'staff', ['/admin/services']],
  ];
  for (const [who, kind, paths] of groups) {
    await page.context().clearCookies();
    if (kind === 'citizen') await c.uiLoginCitizen(page, c.ID.somchai);
    else if (kind === 'staff') await c.uiLoginStaff(page, who);
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      for (const p of paths) {
        await page.goto(p);
        await page.waitForLoadState('load');
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        expect(m.sw, `${p} @${w}`).toBeLessThanOrEqual(m.iw);
      }
    }
  }
  // main flow at 375
  await page.setViewportSize({ width: 375, height: 812 });
  await c.freshCitizen(page, c.ID.somchai);
  await page.goto('/citizen');
  await page.getByTestId('start-service-SV-01').click();
  await page.getByTestId('qty-input').fill('1');
  await expect(page.getByTestId('fee-total')).toHaveText('฿20');
  await page.getByTestId('to-upload-btn').click();
  const f = c.testFile('id-card.pdf');
  await page.getByTestId('upload-input-id-card').setInputFiles({ name: f.name, mimeType: f.mimeType, buffer: f.buffer });
  await expect(page.getByTestId('file-item')).toHaveCount(1);
  await expect(page.getByTestId('to-payment-btn')).toBeEnabled();
  await page.getByTestId('to-payment-btn').click();
  const qr = page.getByTestId('create-qr-btn');
  await expect(qr).toBeVisible();
  const box = await qr.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
});

// ---------------------------------------------------------------- NFR-02
async function labelsMissing(page) {
  return page.evaluate(() => {
    const out = [];
    const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    for (const e of document.querySelectorAll('input, select, textarea')) {
      const t = (e.getAttribute('type') || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'image', 'reset'].includes(t)) continue;
      if (!vis(e)) continue;
      let ok = false;
      if (e.labels && [...e.labels].some((l) => l.textContent.trim())) ok = true;
      if ((e.getAttribute('aria-label') || '').trim()) ok = true;
      const lb = e.getAttribute('aria-labelledby');
      if (lb && lb.split(/\s+/).some((id) => { const n = document.getElementById(id); return n && n.textContent.trim(); })) ok = true;
      if (!ok) out.push(e.getAttribute('data-testid') || e.name || e.tagName);
    }
    return out;
  });
}
async function statusText(page) {
  return page.evaluate(({ ST, LV }) => {
    const bad = [];
    for (const e of document.querySelectorAll('[data-testid="case-status"],[data-testid="row-status"]')) {
      const sh = e.closest('[data-status]');
      const s = e.getAttribute('data-status') || (sh && sh.getAttribute('data-status'));
      const t = e.textContent.trim();
      if (!t || !s || ST[s] !== t) bad.push(`status ${s}|${t}`);
    }
    for (const e of document.querySelectorAll('[data-testid="sla-level"],[data-testid="row-sla-level"]')) {
      const holder = e.hasAttribute('data-level') ? e : e.closest('[data-sla-level]');
      const l = e.getAttribute('data-level') || (holder && holder.getAttribute('data-sla-level'));
      const t = e.textContent.trim();
      if (!t || !l || LV[l] !== t) bad.push(`level ${l}|${t}`);
    }
    return bad;
  }, { ST: STATUS_TH, LV: LEVEL_TH });
}

test('TC-NFR-02 WCAG: axe + คีย์บอร์ด + label + สถานะไม่ใช้สีอย่างเดียว @P1', async ({ page }) => {
  test.setTimeout(300000);
  await c.reset();
  const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
  const violations = [];
  const noLabel = [];
  const badStatus = [];
  const sets = [
    ['anon', ['/login']],
    ['mana', ['/register']],
    ['somchai', ['/citizen', '/citizen/new/SV-01', '/citizen/cases/EG-2569-000017']],
    ['off.reg1', ['/officer/queue', '/officer/cases/EG-2569-000020', '/notifications']],
    ['head1', ['/head/approvals']],
    ['exec1', ['/dashboard']],
    ['audit1', ['/audit']],
    ['admin1', ['/admin/services']],
    ['anon', ['/verify/K7M2Q9XA']],
  ];
  for (const [who, paths] of sets) {
    await page.context().clearCookies();
    if (who === 'somchai') await c.uiLoginCitizen(page, c.ID.somchai);
    else if (who === 'mana') await c.uiLoginCitizen(page, c.ID.mana);
    else if (who !== 'anon') await c.uiLoginStaff(page, who);
    for (const p of paths) {
      await page.goto(p);
      await page.waitForLoadState('load');
      await page.waitForTimeout(300);
      const res = await new AxeBuilder({ page }).withTags(tags).analyze();
      for (const v of res.violations) {
        if (v.impact === 'serious' || v.impact === 'critical') violations.push(`${p} ${v.id} (${v.impact}) x${v.nodes.length}`);
      }
      const nl = await labelsMissing(page);
      if (nl.length) noLabel.push(`${p}: ${nl.join(',')}`);
      const bs = await statusText(page);
      await page.emulateMedia({ forcedColors: 'active' });
      const bs2 = await statusText(page);
      await page.emulateMedia({ forcedColors: 'none' });
      for (const b of [...bs, ...bs2]) badStatus.push(`${p}: ${b}`);
    }
  }
  expect(violations, 'axe serious/critical').toEqual([]);
  expect(noLabel, 'inputs without accessible name').toEqual([]);
  expect(badStatus, 'status/level text vs data-attr').toEqual([]);
});

test('TC-NFR-02B คีย์บอร์ดอย่างเดียวยื่นคำขอจนถึงสร้าง QR @P1', async ({ page }) => {
  // part B of TC-NFR-02 (kept as a separate test so a failure in A/C/D does not hide it)
  await c.reset();
  const kb = page.keyboard;
  const noRing = [];
  const focusTo = async (id) => {
    expect(await c.tabTo(page, id), `Tab reaches ${id}`).toBe(true);
    if (!(await c.focusRingVisible(page))) noRing.push(id);
  };
  await page.context().clearCookies();
  await page.goto('/login');
  await focusTo('thaid-id-input');
  await kb.type(c.ID.somchai);
  await kb.press('Enter');
  await expect(page.getByTestId('otp-step')).toBeVisible();
  await focusTo('otp-input');
  await kb.type(c.OTP);
  await kb.press('Enter');
  await page.waitForURL(/\/citizen/);
  await focusTo('start-service-SV-01');
  await kb.press('Enter');
  await page.waitForURL(/\/citizen\/new\/SV-01/);
  await focusTo('qty-input');
  await kb.press('Control+A');
  await kb.type('1');
  await focusTo('to-upload-btn');
  await kb.press('Enter');
  const f = c.testFile('id-card.pdf');
  await page.getByTestId('upload-input-id-card').focus();
  await page.getByTestId('upload-input-id-card').setInputFiles({ name: f.name, mimeType: f.mimeType, buffer: f.buffer });
  await expect(page.getByTestId('file-item')).toHaveCount(1);
  await focusTo('to-payment-btn');
  await kb.press('Enter');
  await expect(page.getByTestId('create-qr-btn')).toBeVisible();
  expect(noRing, 'focused elements without visible outline/box-shadow').toEqual([]);
});

// ---------------------------------------------------------------- NFR-03
test('TC-NFR-03 Health เวลาโหลด และผลซ้ำได้ @P2', async ({ page }) => {
  test.setTimeout(240000);
  await c.reset();
  const anon = await c.newApi();
  const h = await c.call(anon, 'GET', '/api/health');
  expect(h.status).toBe(200);
  expect(h.json).toEqual({ status: 'ok' });

  // load time (second visit after warm-up)
  const loads = [
    ['/login', null], ['/citizen', 'citizen'], ['/officer/queue', 'off.reg1'], ['/dashboard', 'exec1'], ['/audit', 'audit1'],
  ];
  for (const [p, who] of loads) {
    await page.context().clearCookies();
    if (who === 'citizen') await c.uiLoginCitizen(page, c.ID.somchai);
    else if (who) await c.uiLoginStaff(page, who);
    await page.goto(p, { waitUntil: 'load' });
    const t0 = Date.now();
    await page.goto(p, { waitUntil: 'load' });
    const ms = Date.now() - t0;
    expect(ms, `${p} load ms`).toBeLessThanOrEqual(3000);
  }

  // reproducibility
  const snapshot = async () => {
    const base = await c.newApi();
    const clock = await c.getClock(base);
    const reg1 = await c.apiStaff('off.reg1');
    const q = await c.call(reg1, 'GET', '/api/officer/queue?filter=all');
    const queue = q.json.items.map((i) => ({ caseNo: i.caseNo, dueAt: i.dueAt, status: i.status, owner: i.owner }));
    const exec = await c.apiStaff('exec1');
    const d = (await c.call(exec, 'GET', '/api/dashboard?period=2026-12&service=ALL')).json;
    return { clock, queue, d };
  };
  await c.reset();
  const s1 = await snapshot();
  const base = await c.newApi();
  await c.setClock(base, '2026-12-10T12:00:00+07:00');
  const reg2 = await c.apiStaff('off.reg2');
  expect((await c.call(reg2, 'POST', '/api/officer/cases/EG-2569-000028/claim')).status).toBe(200);
  const som = await c.apiCitizen(c.ID.somchai);
  await c.createPaidCase(som, { serviceId: 'SV-01', qty: 1 });
  await c.reset();
  const s2 = await snapshot();
  expect(s2).toEqual(s1);
  expect(s2.clock).toBe('2026-12-01T09:00:00+07:00');

  // invalid clock
  const bad = await c.call(base, 'PUT', '/api/test/clock', { now: '2026-12-01 09:00' });
  expect(bad.status).toBe(400);
  expect(bad.json.code).toBe('INVALID_TIME');
  await c.reset();
});

test('TC-NFR-03B ปิด hook เมื่อไม่ตั้ง TEST_MODE @P2', async ({ playwright }) => {
  test.skip(!process.env.E2E_NOHOOK_URL, 'set E2E_NOHOOK_URL to an instance started without TEST_MODE');
  const ctx = await playwright.request.newContext({ baseURL: process.env.E2E_NOHOOK_URL });
  const r = await ctx.post('/api/test/reset');
  expect(r.status()).toBe(404);
});

// ---------------------------------------------------------------- NFR-04
test('TC-NFR-04 เข้ารหัสข้อมูลส่วนบุคคลที่เก็บ (inspection) @P2', async () => {
  await c.reset();
  const mana = await c.apiCitizen(c.ID.mana);
  expect(mana.registered).toBe(false);
  const reg = await c.call(mana, 'POST', '/api/auth/register', { mobile: '0845678901', email: '', consent: true });
  expect(reg.status).toBe(201);

  const dbPath = process.env.E2E_DB_PATH || path.resolve(__dirname, '..', '..', 'app', 'data', 'egov.db');
  expect(fs.existsSync(dbPath), `database file not found at ${dbPath} (set E2E_DB_PATH)`).toBe(true);
  const files = [dbPath, dbPath + '-wal', dbPath + '-journal'].filter((f) => fs.existsSync(f));
  if (process.env.E2E_LOG_PATH && fs.existsSync(process.env.E2E_LOG_PATH)) files.push(process.env.E2E_LOG_PATH);
  const needles = ['1101700123456', '3100600987659', '1909900555015', '5500400111221',
    '0812345678', '0823456789', '0834567890', '0845678901',
    '1-1017-00123-45-6', '3-1006-00987-65-9', '1-9099-00555-01-5', '5-5004-00111-22-1'];
  const found = [];
  for (const f of files) {
    const buf = fs.readFileSync(f);
    for (const n of needles) {
      for (const enc of ['latin1', 'utf16le']) {
        const nb = Buffer.from(n, enc);
        let idx = 0, cnt = 0;
        while ((idx = buf.indexOf(nb, idx)) !== -1) { cnt++; idx += nb.length; }
        if (cnt) found.push(`${path.basename(f)} ${n} (${enc}) x${cnt}`);
      }
    }
  }
  expect(found, 'plaintext personal data in stored files').toEqual([]);

  // positive control: decrypts correctly for the owner
  const som = await c.apiCitizen(c.ID.somchai);
  const g = await c.call(som, 'GET', '/api/cases/EG-2569-000005');
  expect(g.status).toBe(200);
  expect(g.json.idNo).toBe('1101700123456');
});

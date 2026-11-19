const { test, expect } = require('@playwright/test');
const C = require('../lib/common');

const CASE30 = 'EG-2569-000030';
const rowOf = (page, id, caseNo) => page.locator(`[data-testid="${id}"][data-case-no="${caseNo}"]`);

test('TC-SUBMIT-01 ยื่นคำขอ SV-01 ครบวงจร @P1', async ({ page, request, browser }) => {
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await page.goto('/citizen');
  await page.getByTestId('start-service-SV-01').click();

  // step 1
  await expect(page.getByTestId('wizard-step')).toHaveText('1/3 กรอกข้อมูล');
  await page.getByTestId('qty-input').fill('2');
  await expect(page.getByTestId('fee-total')).toHaveText('฿40');
  await page.getByTestId('to-upload-btn').click();

  // step 2
  await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');
  await expect(page.getByTestId('to-payment-btn')).toBeDisabled();
  await page.getByTestId('upload-input-id-card').setInputFiles(C.testFile('id-card.pdf'));
  await expect(page.getByTestId('file-item')).toHaveCount(1);
  await expect(page.getByTestId('file-item')).toHaveAttribute('data-doc-key', 'id-card');
  await expect(page.getByTestId('to-payment-btn')).toBeEnabled();
  await page.getByTestId('to-payment-btn').click();

  // step 3
  await expect(page.getByTestId('wizard-step')).toHaveText('3/3 ชำระเงิน');
  await expect(page.getByTestId('payment-amount')).toHaveText('฿40');
  await page.getByTestId('create-qr-btn').click();
  await expect(page.getByTestId('qr-ref')).toHaveText('PP-0002');
  await expect(page.getByTestId('qr-expires')).toHaveAttribute('data-iso', '2026-12-01T09:15:00+07:00');
  await expect(page.getByTestId('payment-status')).toHaveText('รอชำระ');

  // step 4: pay
  const p = await C.payRef(request, 'PP-0002', 40);
  expect(p.status).toBe(200);
  expect(p.body).toEqual({ status: 'PAID', caseNo: 'EG-2569-000031', receiptNo: 'RC-2569-000031', duplicate: false });
  await page.getByTestId('refresh-payment-btn').click();
  await expect(page.getByTestId('payment-status')).toHaveText('ชำระแล้ว');
  await expect(page.getByTestId('submitted-case-no')).toHaveText('EG-2569-000031');
  await expect(page.getByTestId('receipt-no')).toHaveText('RC-2569-000031');
  await expect(page.getByTestId('receipt-amount')).toHaveText('฿40');
  await expect(page.getByTestId('receipt-paid-at')).toHaveAttribute('data-iso', '2026-12-01T09:00:00+07:00');

  // step 5: case page
  await page.getByTestId('go-case-btn').click();
  await expect(page).toHaveURL(/\/citizen\/cases\/EG-2569-000031/);
  await expect(page.getByTestId('case-status')).toHaveAttribute('data-status', 'SUBMITTED');
  await expect(page.getByTestId('case-status')).toHaveText('ส่งคำขอแล้ว');
  await expect(page.getByTestId('case-fee')).toHaveText('฿40');
  await expect(page.getByTestId('sla-due')).toHaveText('4 ธ.ค. 2569 16:30');
  await expect(page.getByTestId('sla-due')).toHaveAttribute('data-iso', '2026-12-04T16:30:00+07:00');
  await expect(page.getByTestId('sla-level')).toHaveText('ปกติ');
  await expect(page.getByTestId('cancel-case-btn')).toHaveCount(1);
  await expect(page.getByTestId('case-step')).toHaveCount(0);

  // officer queue (separate browser context)
  const ctx = await browser.newContext();
  const op = await ctx.newPage();
  await C.uiLoginStaff(op, 'off.reg1');
  await expect(op).toHaveURL(/\/officer\/queue/);
  const row = rowOf(op, 'queue-row', 'EG-2569-000031');
  await expect(row).toHaveCount(1);
  await expect(row.getByTestId('row-owner')).toHaveText('');
  await expect(row.getByTestId('claim-btn')).toHaveCount(1);
  const order = await op.locator('[data-testid="queue-row"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-case-no')));
  expect(order.indexOf('EG-2569-000031')).toBeGreaterThan(order.indexOf(CASE30));
  const q = await (await C.apiStaff('off.reg1')).get('/api/officer/queue?filter=all');
  const items = (await q.json()).items;
  const same = items.filter((i) => i.dueAt.startsWith('2026-12-04'));
  expect(same[same.length - 1].caseNo).toBe('EG-2569-000031');
  await ctx.close();

  // log in again after reset
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await expect(page).toHaveURL(/\/citizen/);
});

test('TC-SUBMIT-02 เอกสารบังคับครบก่อนชำระ @P1', async ({ page, request }) => {
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  const fileItem = (key) => page.locator(`[data-testid="file-item"][data-doc-key="${key}"]`);

  // ---- SV-02 ----
  await page.goto('/citizen/new/SV-02');
  await page.getByTestId('to-upload-btn').click();
  await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');
  await page.getByTestId('upload-input-id-card').setInputFiles(C.testFile('id-card.pdf'));
  await expect(fileItem('id-card')).toHaveCount(1);
  await expect(page.getByTestId('to-payment-btn')).toBeDisabled();
  await expect(page.getByTestId('missing-docs')).toHaveText('ยังขาดเอกสาร: แผนที่ตั้ง');

  await page.getByTestId('upload-input-map').setInputFiles(C.testFile('map.pdf'));
  await expect(fileItem('map')).toHaveCount(1);
  await expect(page.getByTestId('to-payment-btn')).toBeEnabled();
  await expect(page.getByTestId('missing-docs')).toHaveCount(0);

  await fileItem('map').getByTestId('file-remove-btn').click();
  await expect(fileItem('map')).toHaveCount(0);
  await expect(page.getByTestId('to-payment-btn')).toBeDisabled();
  await expect(page.getByTestId('missing-docs')).toHaveText('ยังขาดเอกสาร: แผนที่ตั้ง');

  // ---- SV-03 ----
  await page.goto('/citizen/new/SV-03');
  await page.getByTestId('area-input').fill('100');
  await page.getByTestId('to-upload-btn').click();
  await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');
  await page.getByTestId('upload-input-id-card').setInputFiles(C.testFile('id-card.pdf'));
  await expect(fileItem('id-card')).toHaveCount(1);
  await expect(page.getByTestId('to-payment-btn')).toBeDisabled();
  await expect(page.getByTestId('missing-docs')).toHaveText('ยังขาดเอกสาร: แบบแปลน, โฉนด');

  await page.getByTestId('upload-input-deed').setInputFiles(C.testFile('deed.pdf'));
  await expect(fileItem('deed')).toHaveCount(1);
  await expect(page.getByTestId('to-payment-btn')).toBeDisabled();
  await expect(page.getByTestId('missing-docs')).toHaveText('ยังขาดเอกสาร: แบบแปลน');

  await page.getByTestId('upload-input-plan').setInputFiles(C.testFile('plan-as-jpg.jpg'));
  await expect(page.getByTestId('upload-error')).toHaveText('แบบแปลนต้องเป็นไฟล์ PDF เท่านั้น');
  await expect(fileItem('plan')).toHaveCount(0);
  await expect(page.getByTestId('to-payment-btn')).toBeDisabled();
  await expect(page.getByTestId('missing-docs')).toHaveText('ยังขาดเอกสาร: แบบแปลน');

  await page.getByTestId('upload-input-plan').setInputFiles(C.testFile('plan.pdf'));
  await expect(fileItem('plan')).toHaveCount(1);
  await expect(page.getByTestId('to-payment-btn')).toBeEnabled();
  await expect(page.getByTestId('missing-docs')).toHaveCount(0);

  // ---- API ----
  const api = await C.apiCitizen(C.ID.somchai);
  const d = await C.createDraft(api, { serviceId: 'SV-03', areaSqm: 100 });
  await C.uploadRequired(api, d.draftId, 'SV-03', ['plan']);
  const miss = await C.postPayment(api, d.draftId);
  expect(miss.status()).toBe(409);
  const mb = await miss.json();
  expect(mb.code).toBe('MISSING_DOCS');
  expect(mb.missing).toEqual(['แบบแปลน']);
  expect((await C.uploadFile(api, d.draftId, 'plan', 'plan.pdf')).status()).toBe(201);
  expect((await C.postPayment(api, d.draftId)).status()).toBe(201);

  // log in again after reset
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await expect(page).toHaveURL(/\/citizen/);
});

test('TC-SUBMIT-03 ร่าง การลบร่าง และการยกเลิก @P2', async ({ page, request, browser }) => {
  // ---- Part A drafts ----
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await page.goto('/citizen');
  await expect(page.getByTestId('my-case-row')).toHaveCount(10);
  await expect(page.getByTestId('my-draft-row')).toHaveCount(2);
  const d1 = page.locator('[data-testid="my-draft-row"][data-draft-id="DR-0001"]');
  const d2 = page.locator('[data-testid="my-draft-row"][data-draft-id="DR-0002"]');
  await expect(d1).toHaveAttribute('data-status', 'DRAFT');
  await expect(d2).toHaveAttribute('data-status', 'PENDING_PAYMENT');
  for (const r of [d1, d2]) expect(await r.innerText()).not.toContain('EG-');

  await d1.getByTestId('open-draft-btn').click();
  await expect(page.getByTestId('qty-input')).toHaveValue('2');
  await expect(page.getByTestId('fee-total')).toHaveText('฿40');

  await page.goto('/citizen/new/SV-01');
  await page.getByTestId('qty-input').fill('3');
  await page.getByTestId('save-draft-btn').click();
  await expect(page.getByTestId('draft-id')).toHaveText('DR-0003');
  await page.goto('/citizen');
  await expect(page.getByTestId('my-case-row')).toHaveCount(10);
  const api = await C.apiCitizen(C.ID.somchai);
  expect((await (await api.get('/api/cases')).json()).items).toHaveLength(10);
  expect((await (await api.get('/api/drafts')).json()).items).toHaveLength(3);

  // ---- Part B cancel ----
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await page.goto(`/citizen/cases/${CASE30}`);
  await expect(page.getByTestId('cancel-case-btn')).toHaveCount(1);
  await page.getByTestId('cancel-case-btn').click();
  await expect(page.getByTestId('cancel-confirm-text')).toHaveText('ค่าธรรมเนียมที่ชำระแล้วไม่คืน');
  await page.getByTestId('confirm-cancel-btn').click();
  await expect(page.getByTestId('case-status')).toHaveText('ยกเลิก');
  await expect(page.getByTestId('case-status')).toHaveAttribute('data-status', 'CANCELLED');
  await expect(page.getByTestId('no-refund-note')).toHaveText('ค่าธรรมเนียมที่ชำระแล้วไม่คืน');
  await expect(page.getByTestId('cancel-case-btn')).toHaveCount(0);

  const ctx = await browser.newContext();
  const op = await ctx.newPage();
  await C.uiLoginStaff(op, 'off.reg1');
  await expect(op.getByTestId('queue-row')).toHaveCount(16);
  await expect(rowOf(op, 'queue-row', CASE30)).toHaveCount(0);
  await ctx.close();
  const exec = await C.apiStaff('exec1');
  const dash = await (await exec.get('/api/dashboard?period=2026-12&service=ALL')).json();
  expect(dash.backlog).toBe(20);
  expect(dash.received).toBe(3);

  // ---- Part C cannot cancel when claimed ----
  await C.reset(request);
  const reg1 = await C.apiStaff('off.reg1');
  const claim = await reg1.post(`/api/officer/cases/${CASE30}/claim`);
  expect(claim.status()).toBe(200);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await page.goto(`/citizen/cases/${CASE30}`);
  await expect(page.getByTestId('case-status')).toHaveText('กำลังตรวจสอบ');
  await expect(page.getByTestId('cancel-case-btn')).toHaveCount(0);
  const sc = await C.apiCitizen(C.ID.somchai);
  for (const no of [CASE30, 'EG-2569-000013']) {
    const r = await sc.post(`/api/cases/${no}/cancel`);
    expect(r.status(), no).toBe(409);
    const b = await r.json();
    expect(b.code).toBe('CANNOT_CANCEL');
    expect(b.message).toBe('ยกเลิกไม่ได้ คำขอมีเจ้าหน้าที่รับเรื่องแล้ว');
  }

  // ---- Part E delete drafts ----
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  const se = await C.apiCitizen(C.ID.somchai);
  expect((await se.delete('/api/drafts/DR-0001')).status()).toBe(204);
  expect((await se.get('/api/drafts/DR-0001')).status()).toBe(404);
  await page.goto('/citizen');
  await expect(page.getByTestId('my-draft-row')).toHaveCount(1);
  await expect(page.getByTestId('my-draft-row')).toHaveAttribute('data-draft-id', 'DR-0002');
  expect((await se.delete('/api/drafts/DR-0002')).status()).toBe(204);
  expect((await se.get('/api/payments/PP-0001')).status()).toBe(404);
  const pp = await C.payRef(se, 'PP-0001', 500);
  expect(pp.status).toBe(404);

  // ---- Part F cancel vs claim race ----
  await C.reset(request);
  const somchai = await C.apiCitizen(C.ID.somchai);
  const off = await C.apiStaff('off.reg1');
  const [rc, rk] = await Promise.all([
    somchai.post(`/api/cases/${CASE30}/cancel`),
    off.post(`/api/officer/cases/${CASE30}/claim`),
  ]);
  const cancelBody = await rc.json().catch(() => ({}));
  const claimBody = await rk.json().catch(() => ({}));
  const cancelWon = rc.status() === 200 && rk.status() === 409 && claimBody.code === 'INVALID_STATE';
  const claimWon = rk.status() === 200 && rc.status() === 409 && cancelBody.code === 'CANNOT_CANCEL';
  expect(cancelWon || claimWon, `cancel=${rc.status()} claim=${rk.status()}`).toBe(true);
  const fin = await (await somchai.get(`/api/cases/${CASE30}`)).json();
  const mine = (await (await off.get('/api/officer/queue?filter=mine')).json()).items;
  if (cancelWon) {
    expect(fin.status).toBe('CANCELLED');
    expect(fin.owner).toBeFalsy();
    expect(mine).toHaveLength(3);
  } else {
    expect(fin.status).toBe('IN_REVIEW');
    expect(mine).toHaveLength(4);
  }

  // log in again after reset
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await expect(page).toHaveURL(/\/citizen/);
});

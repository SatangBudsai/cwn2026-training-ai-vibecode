const { test, expect } = require('@playwright/test');
const C = require('../lib/common');

const CASE31 = 'EG-2569-000031';

test('TC-PAY-01 อายุ QR 15:00 @P1', async ({ page, request }) => {
  const rounds = [
    { clock: null, expect: 200 },
    { clock: '2026-12-01T09:09:59+07:00', expect: 200 },
    { clock: '2026-12-01T09:10:00+07:00', expect: 410 },
    { clock: '2026-12-01T09:10:01+07:00', expect: 410 },
  ];
  for (const [i, r] of rounds.entries()) {
    await C.reset(request);
    if (r.clock) await C.setClock(request, r.clock);
    const api = await C.apiCitizen(C.ID.somchai);
    const p = await C.payRef(api, 'PP-0001', 500);
    expect(p.status, `round ${i + 1}`).toBe(r.expect);
    if (r.expect === 200) {
      expect(p.body.status).toBe('PAID');
      expect(p.body.caseNo).toBe(CASE31);
    } else {
      expect(p.body.code).toBe('QR_EXPIRED');
      const pay = await (await api.get('/api/payments/PP-0001')).json();
      expect(pay.status).toBe('EXPIRED');
      const cases = await (await api.get('/api/cases')).json();
      expect(cases.items).toHaveLength(10);
    }
  }

  // ---- round 3 on screen ----
  await C.reset(request);
  await C.setClock(request, '2026-12-01T09:10:00+07:00');
  await C.uiLoginCitizen(page, C.ID.somchai);
  await page.goto('/citizen/new/SV-02?draft=DR-0002');
  await expect(page.getByTestId('qr-expired-msg')).toHaveText('QR หมดอายุ กรุณาสร้าง QR ใหม่');
  await expect(page.getByTestId('payment-status')).toHaveText('QR หมดอายุ');
  await expect(page.getByTestId('payment-status')).toHaveAttribute('data-status', 'EXPIRED');
  await expect(page.getByTestId('regenerate-qr-btn')).toHaveCount(1);
  await page.getByTestId('regenerate-qr-btn').click();
  await expect(page.getByTestId('qr-ref')).toHaveText('PP-0002');
  await expect(page.getByTestId('qr-expires')).toHaveAttribute('data-iso', '2026-12-01T09:25:00+07:00');
  const p2 = await C.payRef(request, 'PP-0002', 500);
  expect(p2.status).toBe(200);
  expect(p2.body.caseNo).toBe(CASE31);

  // log in again after reset
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await expect(page).toHaveURL(/\/citizen/);
});

test('TC-PAY-02 ยอดเงินและ callback ซ้ำ @P1', async ({ request }) => {
  await C.reset(request);
  const api = await C.apiCitizen(C.ID.somchai);
  const u = await C.createUnpaidDraftWithQr(api, { serviceId: 'SV-01', qty: 1 });
  expect(u.ref).toBe('PP-0002');
  expect(u.fee).toBe(20);
  const casesCount = async () => (await (await api.get('/api/cases')).json()).items.length;
  const payStatus = async () => (await (await api.get(`/api/payments/${u.ref}`)).json()).status;

  // 1 short
  let p = await C.payRef(api, u.ref, 19);
  expect(p.status).toBe(422);
  expect(p.body.code).toBe('AMOUNT_MISMATCH');
  expect(await payStatus()).toBe('PENDING');
  expect(await casesCount()).toBe(10);
  // 2 over
  p = await C.payRef(api, u.ref, 21);
  expect(p.status).toBe(422);
  expect(await payStatus()).toBe('PENDING');
  // 3 exact
  p = await C.payRef(api, u.ref, 20);
  expect(p.status).toBe(200);
  expect(p.body.status).toBe('PAID');
  expect(p.body.caseNo).toBe(CASE31);
  expect(p.body.receiptNo).toBe('RC-2569-000031');
  expect(await casesCount()).toBe(11);
  // 4 duplicate
  p = await C.payRef(api, u.ref, 20);
  expect(p.status).toBe(200);
  expect(p.body.duplicate).toBe(true);
  expect(p.body.caseNo).toBe(CASE31);
  expect(p.body.receiptNo).toBe('RC-2569-000031');
  expect(await casesCount()).toBe(11);
  // 5 next case has no gap
  const next = await C.createPaidCase(api, { serviceId: 'SV-01', qty: 1 });
  expect(next.caseNo).toBe('EG-2569-000032');
  expect(next.receiptNo).toBe('RC-2569-000032');

  // log in again after reset
  await C.reset(request);
  expect((await (await C.apiCitizen(C.ID.somchai)).get('/api/me')).status()).toBe(200);
});

test('TC-PAY-03 ชำระพร้อมกัน เลขไม่ซ้ำ @P1', async ({ request }) => {
  await C.reset(request);
  const somchai = await C.apiCitizen(C.ID.somchai);
  const somying = await C.apiCitizen(C.ID.somying);
  const drafts = [];
  for (const api of [somchai, somchai, somchai, somying, somying, somying]) {
    const d = await C.createDraft(api, { serviceId: 'SV-01', qty: 1 });
    expect((await C.uploadFile(api, d.draftId, 'id-card', 'id-card.pdf')).status()).toBe(201);
    const qr = await C.createQr(api, d.draftId);
    drafts.push(qr.ref);
  }
  expect(drafts).toEqual(['PP-0002', 'PP-0003', 'PP-0004', 'PP-0005', 'PP-0006', 'PP-0007']);

  const results = await Promise.all(drafts.map((ref) => C.payRef(request, ref, 20)));
  for (const r of results) expect(r.status).toBe(200);
  const nos = results.map((r) => r.body.caseNo);
  const rcs = results.map((r) => r.body.receiptNo);
  const wantCases = [31, 32, 33, 34, 35, 36].map((n) => `EG-2569-0000${n}`);
  const wantRcs = [31, 32, 33, 34, 35, 36].map((n) => `RC-2569-0000${n}`);
  expect(new Set(nos).size).toBe(6);
  expect([...nos].sort()).toEqual(wantCases);
  expect([...rcs].sort()).toEqual(wantRcs);

  const mine = async (api) => (await (await api.get('/api/cases')).json()).items.map((i) => i.caseNo);
  const a = await mine(somchai);
  const b = await mine(somying);
  expect(a).toHaveLength(13);
  expect(b).toHaveLength(14);
  const newOf = (l) => l.filter((n) => n > 'EG-2569-000030');
  expect(newOf(a)).toHaveLength(3);
  expect(newOf(b)).toHaveLength(3);
  expect(new Set([...newOf(a), ...newOf(b)])).toEqual(new Set(wantCases));

  const next = await C.createPaidCase(somchai, { serviceId: 'SV-01', qty: 1 });
  expect(next.caseNo).toBe('EG-2569-000037');

  // log in again after reset
  await C.reset(request);
  expect((await (await C.apiCitizen(C.ID.somying)).get('/api/me')).status()).toBe(200);
});

test('TC-PAY-04 เลขคำขอข้ามปี 2569 -> 2570 @P2', async ({ page, request }) => {
  await C.reset(request);
  await C.setClock(request, '2026-12-31T23:58:00+07:00');
  await C.uiLoginCitizen(page, C.ID.somchai);

  // step 1 via UI: draft + QR, no case number yet
  await page.goto('/citizen/new/SV-01');
  await page.getByTestId('qty-input').fill('1');
  await page.getByTestId('to-upload-btn').click();
  await page.getByTestId('upload-input-id-card').setInputFiles(C.testFile('id-card.pdf'));
  await expect(page.getByTestId('file-item')).toHaveCount(1);
  await page.getByTestId('to-payment-btn').click();
  await page.getByTestId('create-qr-btn').click();
  const ref = (await page.getByTestId('qr-ref').innerText()).trim();
  expect(ref).toBe('PP-0002');
  await expect(page.getByTestId('submitted-case-no')).toHaveCount(0);

  // step 2: 23:59 pay
  await C.setClock(request, '2026-12-31T23:59:00+07:00');
  const p = await C.payRef(request, ref, 20);
  expect(p.status).toBe(200);
  expect(p.body.caseNo).toBe(CASE31);
  expect(p.body.receiptNo).toBe('RC-2569-000031');
  await page.getByTestId('refresh-payment-btn').click();
  await expect(page.getByTestId('receipt-paid-at')).toHaveAttribute('data-iso', '2026-12-31T23:59:00+07:00');

  // step 3-4: new year (log in again after clock change)
  await C.setClock(request, '2027-01-01T00:00:00+07:00');
  const api = await C.apiCitizen(C.ID.somchai);
  const y1 = await C.createPaidCase(api, { serviceId: 'SV-01', qty: 1 });
  expect(y1.caseNo).toBe('EG-2570-000001');
  expect(y1.receiptNo).toBe('RC-2570-000001');
  const y2 = await C.createPaidCase(api, { serviceId: 'SV-01', qty: 1 });
  expect(y2.caseNo).toBe('EG-2570-000002');

  // step 5: old number unchanged
  const old = await api.get(`/api/cases/${CASE31}`);
  expect(old.status()).toBe(200);
  expect((await old.json()).caseNo).toBe(CASE31);

  // log in again after reset
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await expect(page).toHaveURL(/\/citizen/);
});

const { test, expect } = require('@playwright/test');
const C = require('../lib/common');

const AREA_ROWS = [
  [0, null, 'กรุณาระบุพื้นที่ 1–500 ตร.ม.', 'INVALID_AREA'],
  [-1, null, 'กรุณาระบุพื้นที่ 1–500 ตร.ม.', 'INVALID_AREA'],
  [1, 1000],
  [100, 1000],
  [101, 1010],
  [102, 1020],
  [250, 2500],
  [300, 3000],
  [499, 4990],
  [500, 5000],
  [501, null, 'พื้นที่เกิน 500 ตร.ม. กรุณายื่นที่สำนักงาน', 'AREA_TOO_LARGE'],
];
const QTY_ROWS = [
  [0, null, 'จำนวนฉบับต้อง 1–5 ฉบับ', 'INVALID_QTY'],
  [1, 20], [2, 40], [3, 60], [4, 80], [5, 100],
  [6, null, 'จำนวนฉบับต้อง 1–5 ฉบับ', 'INVALID_QTY'],
];

test('TC-FEE-01 ค่าธรรมเนียม SV-01/SV-02/SV-03 @P1', async ({ page, request }) => {
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  const api = await C.apiCitizen(C.ID.somchai);

  // ---- SV-03 UI ----
  await page.goto('/citizen/new/SV-03');
  for (const [area, fee, msg] of AREA_ROWS) {
    await page.getByTestId('area-input').fill(String(area));
    if (fee === null) {
      await expect(page.getByTestId('fee-total'), `SV-03 ${area}`).toHaveText('–');
      await expect(page.getByTestId('fee-error')).toHaveText(msg);
      await expect(page.getByTestId('to-upload-btn')).toBeDisabled();
    } else {
      await expect(page.getByTestId('fee-total'), `SV-03 ${area}`).toHaveText(C.baht(fee));
      await expect(page.getByTestId('fee-error')).toHaveCount(0);
      await expect(page.getByTestId('to-upload-btn')).toBeEnabled();
    }
  }
  // ---- SV-03 API ----
  for (const [area, fee, , code] of AREA_ROWS) {
    const res = await C.postDraft(api, { serviceId: 'SV-03', areaSqm: area });
    if (fee === null) {
      expect(res.status(), `API SV-03 ${area}`).toBe(400);
      expect((await res.json()).code).toBe(code);
    } else {
      expect(res.status(), `API SV-03 ${area}`).toBe(201);
      expect((await res.json()).fee).toBe(fee);
    }
  }

  // ---- SV-01 UI ----
  await page.goto('/citizen/new/SV-01');
  await expect(page.getByTestId('qty-input')).toHaveValue('1'); // default 1 (A-56)
  for (const [qty, fee, msg] of QTY_ROWS) {
    await page.getByTestId('qty-input').fill(String(qty));
    if (fee === null) {
      await expect(page.getByTestId('fee-total'), `SV-01 ${qty}`).toHaveText('–');
      await expect(page.getByTestId('fee-error')).toHaveText(msg);
      await expect(page.getByTestId('to-upload-btn')).toBeDisabled();
    } else {
      await expect(page.getByTestId('fee-total'), `SV-01 ${qty}`).toHaveText(C.baht(fee));
      await expect(page.getByTestId('fee-error')).toHaveCount(0);
    }
  }
  // ---- SV-01 API ----
  for (const [qty, fee, , code] of QTY_ROWS) {
    const res = await C.postDraft(api, { serviceId: 'SV-01', qty });
    if (fee === null) {
      expect(res.status(), `API SV-01 ${qty}`).toBe(400);
      expect((await res.json()).code).toBe(code);
    } else {
      expect(res.status(), `API SV-01 ${qty}`).toBe(201);
      expect((await res.json()).fee).toBe(fee);
    }
  }

  // ---- SV-02 ----
  await page.goto('/citizen/new/SV-02');
  await expect(page.getByTestId('fee-total')).toHaveText('฿500');
  const r2 = await C.postDraft(api, { serviceId: 'SV-02' });
  expect(r2.status()).toBe(201);
  expect((await r2.json()).fee).toBe(500);

  // log in again after reset
  await C.reset(request);
  const again = await C.apiCitizen(C.ID.somchai);
  expect((await again.get('/api/me')).status()).toBe(200);
});

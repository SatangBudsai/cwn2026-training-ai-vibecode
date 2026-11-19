const { test, expect } = require('@playwright/test');
const C = require('../lib/common');

async function openUploadStep(page, request) {
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.somchai);
  await page.goto('/citizen/new/SV-01');
  await page.getByTestId('qty-input').fill('1');
  await page.getByTestId('to-upload-btn').click();
  await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');
}
async function removeAll(page) {
  while ((await page.getByTestId('file-item').count()) > 0) {
    await page.getByTestId('file-item').first().getByTestId('file-remove-btn').click();
    await page.waitForTimeout(100);
  }
}
/** fresh SV-01 draft per API attempt (there is no file-delete API in CONTRACT) */
async function apiUpload(api, file, docKey = 'id-card') {
  const d = await C.createDraft(api, { serviceId: 'SV-01', qty: 1 });
  const res = await C.uploadFile(api, d.draftId, docKey, file);
  return { draftId: d.draftId, res };
}

test('TC-UPLOAD-01 ขนาดและจำนวนไฟล์ @P1', async ({ page, request }) => {
  await openUploadStep(page, request);
  const api = await C.apiCitizen(C.ID.somchai);
  const input = page.getByTestId('upload-input-id-card');

  // ---- size via UI ----
  for (const n of [5242879, 5242880]) {
    await input.setInputFiles(C.testFile(`size-${n}.pdf`));
    await expect(page.getByTestId('file-item').or(page.getByTestId('upload-error')).first()).toBeVisible();
    expect(await page.getByTestId('upload-error').allTextContents(), `size ${n} must be accepted (no upload-error)`).toEqual([]);
    await expect(page.getByTestId('file-item'), `size ${n}`).toHaveCount(1);
    await removeAll(page);
  }
  await input.setInputFiles(C.testFile('size-5242881.pdf'));
  await expect(page.getByTestId('upload-error')).toHaveText('ไฟล์ใหญ่เกิน 5 MB');
  await expect(page.getByTestId('file-item')).toHaveCount(0);

  // ---- size via API ----
  for (const n of [5242879, 5242880]) {
    const { res } = await apiUpload(api, `size-${n}.pdf`);
    expect(res.status(), `API ${n}`).toBe(201);
  }
  const big = await apiUpload(api, 'size-5242881.pdf');
  expect(big.res.status()).toBe(400); // not 413
  const bb = await big.res.json();
  expect(bb.code).toBe('FILE_TOO_LARGE');
  expect(bb.message).toBe('ไฟล์ใหญ่เกิน 5 MB');

  // ---- count via UI ----
  await openUploadStepAfterReload(page);
  await input.setInputFiles(C.testFile('id-card.pdf'));
  await page.getByTestId('upload-input-extra').setInputFiles(['multi-1.pdf', 'multi-2.pdf', 'multi-3.pdf', 'multi-4.pdf'].map(C.testFile));
  await expect(page.getByTestId('file-item')).toHaveCount(5);
  await page.getByTestId('upload-input-extra').setInputFiles(C.testFile('multi-5.pdf'));
  await expect(page.getByTestId('upload-error')).toHaveText('แนบได้สูงสุด 5 ไฟล์ต่อคำขอ');
  await expect(page.getByTestId('file-item')).toHaveCount(5);
  await page.locator('[data-testid="file-item"][data-name="multi-4.pdf"]').getByTestId('file-remove-btn').click();
  await expect(page.getByTestId('file-item')).toHaveCount(4);
  await page.getByTestId('upload-input-extra').setInputFiles(C.testFile('multi-5.pdf'));
  await expect(page.getByTestId('file-item')).toHaveCount(5);

  // ---- count via API ----
  const d = await C.createDraft(api, { serviceId: 'SV-01', qty: 1 });
  expect((await C.uploadFile(api, d.draftId, 'id-card', 'id-card.pdf')).status()).toBe(201);
  for (let i = 1; i <= 4; i++) expect((await C.uploadFile(api, d.draftId, 'extra', `multi-${i}.pdf`)).status()).toBe(201);
  const sixth = await C.uploadFile(api, d.draftId, 'extra', 'multi-5.pdf');
  expect(sixth.status()).toBe(400);
  expect((await sixth.json()).code).toBe('FILE_COUNT');

  // log in again after reset
  await C.reset(request);
  const again = await C.apiCitizen(C.ID.somchai);
  expect((await again.get('/api/me')).status()).toBe(200);
});

// after reload the wizard may drop back to step 1; navigate to the upload step again with a fresh draft
async function openUploadStepAfterReload(page) {
  await page.goto('/citizen/new/SV-01');
  await page.getByTestId('qty-input').fill('1');
  await page.getByTestId('to-upload-btn').click();
  await expect(page.getByTestId('wizard-step')).toHaveText('2/3 แนบเอกสาร');
  await expect(page.getByTestId('file-item')).toHaveCount(0);
}

test('TC-UPLOAD-02 ชนิดไฟล์จากเนื้อไฟล์ @P1', async ({ page, request }) => {
  await openUploadStep(page, request);
  const api = await C.apiCitizen(C.ID.somchai);
  const input = page.getByTestId('upload-input-id-card');
  const TYPE_MSG = 'รองรับเฉพาะไฟล์ PDF, JPG, PNG';

  // ---- UI ----
  for (const n of ['ok-id.pdf', 'real.jpg', 'real.png']) {
    await input.setInputFiles(C.testFile(n));
    await expect(page.getByTestId('file-item'), n).toHaveCount(1);
    await removeAll(page);
  }
  const rejects = [
    C.testFile('fake-text.pdf'),
    C.testFile('fake-text.jpg'),
    C.testFile('exe-as.png'),
    C.testFile('notes.txt'),
    { ...C.testFile('fake-text.pdf'), mimeType: 'application/pdf' },
  ];
  for (const f of rejects) {
    await input.setInputFiles(f);
    await expect(page.getByTestId('upload-error'), f.name).toHaveText(TYPE_MSG);
    await expect(page.getByTestId('file-item')).toHaveCount(0);
  }

  // ---- API ----
  for (const n of ['ok-id.pdf', 'real.jpg', 'real.png']) {
    const { res } = await apiUpload(api, n);
    expect(res.status(), n).toBe(201);
  }
  for (const f of rejects) {
    const { draftId, res } = await apiUpload(api, f);
    expect(res.status(), f.name).toBe(400);
    expect((await res.json()).code).toBe('FILE_TYPE');
    // rejected files are not stored (draft detail shape for files is not in CONTRACT: check only if exposed)
    const det = await (await api.get(`/api/drafts/${draftId}`)).json();
    const files = det.files || det.items;
    if (Array.isArray(files)) expect(files).toHaveLength(0);
  }

  // log in again after reset
  await C.reset(request);
  const again = await C.apiCitizen(C.ID.somchai);
  expect((await again.get('/api/me')).status()).toBe(200);
});

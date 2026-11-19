const { test, expect } = require('@playwright/test');
const B = require('../lib/b');
const { C, CN } = B;

/** approve (SV-01 holder) then issue; returns issue body */
async function approveIssue(api, no) {
  const a = await B.approve(api, no);
  expect(a.status, 'approve ' + no).toBe(200);
  const i = await B.issue(api, no);
  expect(i.status, 'issue ' + no).toBe(200);
  return i.body;
}
async function verifyPage(browser, code, expectResult, status = 200) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const resp = await page.goto(`/verify/${code}`);
  expect(resp.status()).toBe(status);
  await expect(B.tid(page, 'verify-result')).toHaveAttribute('data-result', expectResult);
  return { ctx, page };
}

test('TC-DOC-01 ออกเอกสารและข้อมูลในเอกสาร @P1', async ({ browser }) => {
  await B.fresh();
  const reg2 = await B.staff('off.reg2');
  const body = await approveIssue(reg2, CN(25));
  expect(body.docNo).toBe('DOC-2569-000002');
  expect(body.status).toBe('COMPLETED');
  expect(body.verifyCode).toMatch(/^[A-Z0-9]{8}$/);
  const code = body.verifyCode;
  const sy = await C.apiCitizen(C.ID.somying);
  const pdf = await sy.get('/api/documents/DOC-2569-000002/pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect(pdf.headers()['content-disposition']).toContain('DOC-2569-000002.pdf');
  expect((await pdf.body()).toString('latin1')).toContain(`docNo=DOC-2569-000002 caseNo=EG-2569-000025 verify=${code} validUntil=2027-02-28`);

  const v = await verifyPage(browser, code, 'VALID');
  const p = v.page;
  await expect(B.tid(p, 'verify-result')).toHaveText('เอกสารถูกต้อง');
  await expect(B.tid(p, 'verify-doc-no')).toHaveText('DOC-2569-000002');
  await expect(B.tid(p, 'verify-applicant')).toHaveText('สมหญิง ร***');
  await expect(B.tid(p, 'verify-service')).toHaveText('SV-01 ขอหนังสือรับรอง');
  await B.expectIso(B.tid(p, 'verify-issued'), '2026-12-01T09:00:00+07:00');
  await B.expectIso(B.tid(p, 'verify-expires'), '2027-02-28');
  await expect(B.tid(p, 'verify-signer')).toHaveText('เจ้าหน้าที่ทะเบียน 2');
  await v.ctx.close();

  const s = await B.uiStaff(browser, 'off.reg2');
  await s.page.goto(`/officer/cases/${CN(25)}`);
  await expect(B.tid(s.page, 'doc-qr')).toHaveAttribute('data-url', `${C.BASE_URL}/verify/${code}`);
  await s.ctx.close();

  const anon = await C.newApi();
  const av = await anon.get(`/api/verify/${code}`);
  expect(av.status()).toBe(200);
  const ab = await av.json();
  expect(ab.result).toBe('VALID');
  expect(ab.validUntil).toBe('2027-02-28');
  expect(ab.issuedAt).toBe('2026-12-01T09:00:00+07:00');

  const sc = await C.apiCitizen(C.ID.somchai);
  expect((await sc.get('/api/documents/DOC-2569-000002/pdf')).status()).toBe(404);
  const again = await B.issue(reg2, CN(25));
  expect(again.status).toBe(409);
  expect(again.body.code).toBe('INVALID_STATE');
  const reg1 = await B.staff('off.reg1');
  const next = await B.issue(reg1, CN(19));
  expect(next.status).toBe(200);
  expect(next.body.docNo).toBe('DOC-2569-000003');
});

test('TC-DOC-02 ตรวจเอกสาร /verify @P1', async ({ browser }) => {
  await B.fresh();
  const v = await verifyPage(browser, 'K7M2Q9XA', 'VALID');
  const p = v.page;
  expect(new URL(p.url()).pathname).toBe('/verify/K7M2Q9XA');
  await expect(B.tid(p, 'verify-result')).toHaveText('เอกสารถูกต้อง');
  await expect(B.tid(p, 'verify-doc-no')).toHaveText('DOC-2569-000001');
  await expect(B.tid(p, 'verify-applicant')).toHaveText('สมชาย ใ***');
  await expect(B.tid(p, 'verify-service')).toHaveText('SV-01 ขอหนังสือรับรอง');
  await B.expectIso(B.tid(p, 'verify-issued'), '2026-11-05T10:00:00+07:00');
  await B.expectIso(B.tid(p, 'verify-expires'), '2027-02-02');
  await expect(B.tid(p, 'verify-signer')).toHaveText('เจ้าหน้าที่ทะเบียน 1');
  const text = await p.locator('body').innerText();
  expect(text).not.toContain('ใจดี');
  expect(text).not.toContain('1101700123456');
  await v.ctx.close();

  const n = await verifyPage(browser, 'ZZZZZZZZ', 'NOT_FOUND', 404);
  await expect(B.tid(n.page, 'verify-result')).toHaveText('ไม่พบเอกสาร');
  await expect(B.tid(n.page, 'verify-applicant')).toHaveCount(0);
  await expect(B.tid(n.page, 'verify-doc-no')).toHaveCount(0);
  await n.ctx.close();

  const anon = await C.newApi();
  const ok = await anon.get('/api/verify/K7M2Q9XA');
  expect(ok.status()).toBe(200);
  const b = await ok.json();
  expect(b.result).toBe('VALID');
  expect(b.applicantMasked).toBe('สมชาย ใ***');
  const nf = await anon.get('/api/verify/ZZZZZZZZ');
  expect(nf.status()).toBe(404);
  expect((await nf.json()).result).toBe('NOT_FOUND');
});

async function edge(browser, code, checks) {
  for (const [clock, res, th] of checks) {
    await B.setClock(clock);
    const v = await verifyPage(browser, code, res);
    if (th) await expect(B.tid(v.page, 'verify-result')).toHaveText(th);
    await v.ctx.close();
  }
}
const OK = 'เอกสารถูกต้อง';
const EXP = 'เอกสารหมดอายุ';

test('TC-DOC-03 เอกสารหมดอายุและลายเซ็นไม่ตรง @P1', async ({ browser }) => {
  // A
  await B.fresh();
  let reg2 = await B.staff('off.reg2');
  const c1 = (await approveIssue(reg2, CN(25))).verifyCode;
  let v = await verifyPage(browser, c1, 'VALID');
  await B.expectIso(B.tid(v.page, 'verify-expires'), '2027-02-28');
  await v.ctx.close();
  await edge(browser, c1, [['2027-02-28T23:59:00+07:00', 'VALID', OK], ['2027-03-01T00:00:00+07:00', 'EXPIRED', EXP]]);
  v = await verifyPage(browser, c1, 'EXPIRED');
  await B.expectIso(B.tid(v.page, 'verify-expires'), '2027-02-28');
  await v.ctx.close();

  // B
  await B.fresh();
  let reg1 = await B.staff('off.reg1');
  const i2 = await B.issue(reg1, CN(19));
  expect(i2.status).toBe(200);
  const c2 = i2.body.verifyCode;
  await B.setClock('2027-11-30T23:59:00+07:00');
  v = await verifyPage(browser, c2, 'VALID');
  await B.expectIso(B.tid(v.page, 'verify-expires'), '2027-11-30');
  await v.ctx.close();
  await edge(browser, c2, [['2027-12-01T00:00:00+07:00', 'EXPIRED', EXP]]);

  // C
  await B.fresh();
  await edge(browser, 'K7M2Q9XA', [['2027-02-02T23:59:00+07:00', 'VALID', OK], ['2027-02-03T00:00:00+07:00', 'EXPIRED', EXP]]);

  // E
  await B.fresh();
  await B.setClock('2028-02-29T10:00:00+07:00');
  reg2 = await B.staff('off.reg2');
  reg1 = await B.staff('off.reg1');
  const e1 = await approveIssue(reg2, CN(25));
  const e2 = await B.issue(reg1, CN(19));
  expect(e1.docNo).toBe('DOC-2571-000001');
  expect(e2.status).toBe(200);
  expect(e2.body.docNo).toBe('DOC-2571-000002');
  const anon = await C.newApi();
  const j1 = await (await anon.get(`/api/verify/${e1.verifyCode}`)).json();
  expect(j1.validUntil).toBe('2028-05-28');
  const j2 = await (await anon.get(`/api/verify/${e2.body.verifyCode}`)).json();
  expect(j2.validUntil).toBe('2029-02-27');
  await edge(browser, e1.verifyCode, [['2028-05-28T23:59:00+07:00', 'VALID', OK], ['2028-05-29T00:00:00+07:00', 'EXPIRED', EXP]]);
  await edge(browser, e2.body.verifyCode, [['2029-02-27T23:59:00+07:00', 'VALID', OK], ['2029-02-28T00:00:00+07:00', 'EXPIRED', EXP]]);
  await B.setClock('2028-02-29T10:00:00+07:00');

  // D
  await B.fresh();
  const t = await (await C.newApi()).post('/api/test/documents/DOC-2569-000001/tamper');
  expect(t.status()).toBe(200);
  expect((await t.json()).ok).toBe(true);
  v = await verifyPage(browser, 'K7M2Q9XA', 'TAMPERED');
  await expect(B.tid(v.page, 'verify-result')).toHaveText('ลายเซ็นไม่ถูกต้อง');
  await expect(B.tid(v.page, 'verify-doc-no')).toHaveCount(0);
  await expect(B.tid(v.page, 'verify-applicant')).toHaveCount(0);
  await v.ctx.close();
  await edge(browser, 'K7M2Q9XA', [['2027-03-01T00:00:00+07:00', 'TAMPERED', 'ลายเซ็นไม่ถูกต้อง']]);
});

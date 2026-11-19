const { test, expect } = require('@playwright/test');
const B = require('../lib/b');
const { C, CN } = B;

const ST = (page, st) => expect(B.tid(page, 'case-status')).toHaveAttribute('data-status', st);
async function open(page, path) { await page.goto(path); await expect(B.tid(page, 'case-no')).toBeVisible(); }

test('TC-WORKFLOW-01 SV-01 อนุมัติ + ออกเอกสาร @P1', async ({ browser }) => {
  await B.fresh();
  const s = await B.uiStaff(browser, 'off.reg2');
  const p = s.page;
  await open(p, `/officer/cases/${CN(25)}`);
  await ST(p, 'IN_REVIEW');
  await expect(B.tid(p, 'case-status')).toContainText('กำลังตรวจสอบ');
  await expect(B.tid(p, 'approve-btn')).toHaveCount(1);
  await expect(B.tid(p, 'return-btn')).toHaveCount(1);
  await expect(B.tid(p, 'reject-btn')).toHaveCount(1);
  await expect(B.tid(p, 'forward-btn')).toHaveCount(0);
  await expect(B.tid(p, 'issue-btn')).toHaveCount(0);
  await expect(B.tid(p, 'case-fee')).toHaveText('฿60');
  const reg1 = await B.staff('off.reg1');
  const a2 = await B.approve(reg1, CN(26));
  expect(a2.status).toBe(403);
  expect(a2.body.code).toBe('FORBIDDEN');
  await B.tid(p, 'approve-btn').click();
  await ST(p, 'APPROVED');
  await expect(B.tid(p, 'case-status')).toContainText('อนุมัติ');
  await expect(B.tid(p, 'issue-btn')).toHaveCount(1);
  await expect(B.tid(p, 'approve-btn')).toHaveCount(0);
  await B.tid(p, 'issue-btn').click();
  await ST(p, 'COMPLETED');
  await expect(B.tid(p, 'case-status')).toContainText('เสร็จสิ้น');
  await expect(B.tid(p, 'doc-no')).toHaveText('DOC-2569-000002');
  await expect(B.tid(p, 'verify-code')).toHaveText(/^[A-Z0-9]{8}$/);
  await B.expectIso(B.tid(p, 'closed-at'), '2026-12-01T09:00:00+07:00');
  await expect(B.tid(p, 'sla-level')).toHaveText('ปิดแล้ว');
  await s.ctx.close();

  const c = await B.uiCitizen(browser, C.ID.somying);
  await open(c.page, `/citizen/cases/${CN(25)}`);
  await ST(c.page, 'COMPLETED');
  await expect(B.tid(c.page, 'case-status')).toContainText('เสร็จสิ้น');
  await expect(B.tid(c.page, 'download-doc-btn')).toHaveCount(1);
  const cit = await C.apiCitizen(C.ID.somying);
  const pdf = await cit.get('/api/documents/DOC-2569-000002/pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect(pdf.headers()['content-disposition']).toContain('DOC-2569-000002.pdf');
  expect((await pdf.body()).toString('latin1')).toContain('docNo=DOC-2569-000002 caseNo=EG-2569-000025');
  await c.ctx.close();

  const exec = await B.staff('exec1');
  const d = await B.dashboard(exec);
  expect(d.closed).toBe(1);
  expect(d.onTime).toBe(1);
  expect(d.received).toBe(3);
  expect(d.backlog).toBe(20);
});

test('TC-WORKFLOW-02 SV-02 ผ่านหัวหน้า @P1', async ({ browser }) => {
  await B.fresh();
  const s = await B.uiStaff(browser, 'off.reg2');
  const p = s.page;
  await open(p, `/officer/cases/${CN(13)}`);
  await expect(B.tid(p, 'approve-btn')).toHaveCount(0);
  await expect(B.tid(p, 'forward-btn')).toHaveCount(1);
  await expect(B.tid(p, 'forward-target')).toHaveCount(0);
  await B.tid(p, 'forward-btn').click();
  await ST(p, 'PENDING_APPROVAL');
  await expect(B.tid(p, 'case-status')).toContainText('รออนุมัติ');
  await p.goto('/officer/queue');
  await expect(B.tid(p, 'workload-count')).toHaveText('8');
  await expect(p.locator(`[data-testid=queue-row][data-case-no="${CN(13)}"]`)).toHaveCount(0);
  const h = await B.uiStaff(browser, 'head1');
  await h.page.goto('/head/approvals');
  await expect(B.tid(h.page, 'approval-row')).toHaveCount(3);
  expect(await B.rowNos(h.page, 'approval-row')).toEqual(['000013', '000014', '000011']);
  await h.page.locator(`[data-testid=approval-row][data-case-no="${CN(13)}"] [data-testid=approval-open]`).click();
  await expect(B.tid(h.page, 'approve-btn')).toHaveCount(1);
  await expect(B.tid(h.page, 'reject-btn')).toHaveCount(1);
  await expect(B.tid(h.page, 'issue-btn')).toHaveCount(0);
  await B.tid(h.page, 'approve-btn').click();
  await ST(h.page, 'APPROVED');
  await expect(B.tid(h.page, 'issue-btn')).toHaveCount(0);
  const reg1 = await B.staff('off.reg1');
  const r1 = await B.uiStaff(browser, 'off.reg1');
  await open(r1.page, `/officer/cases/${CN(13)}`);
  await expect(B.tid(r1.page, 'issue-btn')).toHaveCount(0);
  const bad = await B.issue(reg1, CN(13));
  expect(bad.status).toBe(403);
  expect(bad.body.code).toBe('FORBIDDEN');
  await p.goto(`/officer/cases/${CN(13)}`);
  await B.tid(p, 'issue-btn').click();
  await ST(p, 'COMPLETED');
  await expect(B.tid(p, 'doc-no')).toHaveText('DOC-2569-000002');
  const code = (await B.tid(p, 'verify-code').textContent()).trim();
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(`/verify/${code}`);
  await expect(B.tid(ap, 'verify-signer')).toHaveText('หัวหน้าฝ่าย');
  await anon.close();
  for (const x of [s, h, r1]) await x.ctx.close();

  // step 8
  await B.fresh();
  const r = await B.uiStaff(browser, 'off.reg1');
  await open(r.page, `/officer/cases/${CN(19)}`);
  await B.tid(r.page, 'issue-btn').click();
  await ST(r.page, 'COMPLETED');
  await expect(B.tid(r.page, 'doc-no')).toHaveText('DOC-2569-000002');
  const code2 = (await B.tid(r.page, 'verify-code').textContent()).trim();
  const anon2 = await browser.newContext();
  const ap2 = await anon2.newPage();
  await ap2.goto(`/verify/${code2}`);
  await expect(B.tid(ap2, 'verify-signer')).toHaveText('หัวหน้าฝ่าย');
  await anon2.close(); await r.ctx.close();
});

test('TC-WORKFLOW-03 SV-03 สามขั้นตอน @P1', async ({ browser }) => {
  await B.fresh();
  const s = await B.uiStaff(browser, 'off.reg2');
  const p = s.page;
  await open(p, `/officer/cases/${CN(12)}`);
  await expect(B.tid(p, 'case-step')).toHaveText('ขั้นตอน 1/3 · ฝ่ายทะเบียน');
  await expect(B.tid(p, 'case-fee')).toHaveText('฿1,010');
  await expect(B.tid(p, 'forward-btn')).toHaveCount(1);
  await B.tid(p, 'forward-btn').click();
  await expect(B.tid(p, 'case-step')).toHaveText('ขั้นตอน 2/3 · ฝ่ายโยธา');
  await ST(p, 'IN_REVIEW');
  await expect(B.tid(p, 'case-status')).toContainText('กำลังตรวจสอบ');
  await expect(B.tid(p, 'case-owner')).toHaveText('ยังไม่มีผู้รับ');
  await p.goto('/officer/queue');
  await expect(B.tid(p, 'workload-count')).toHaveText('8');
  await expect(B.tid(p, 'queue-row')).toHaveCount(16);
  await expect(p.locator(`[data-testid=queue-row][data-case-no="${CN(12)}"]`)).toHaveCount(0);

  const w = await B.uiStaff(browser, 'off.works1');
  await w.page.goto('/officer/queue');
  await expect(B.tid(w.page, 'queue-row')).toHaveCount(2);
  expect(await B.rowNos(w.page, 'queue-row')).toEqual(['000010', '000012']);
  await expect(B.tid(w.page, 'claim-btn')).toHaveCount(2);
  const reg1 = await B.staff('off.reg1');
  const x = await B.claim(reg1, CN(12));
  expect(x.status).toBe(403);
  expect(x.body.code).toBe('FORBIDDEN');
  await w.page.locator(`[data-testid=queue-row][data-case-no="${CN(12)}"] [data-testid=claim-btn]`).click();
  await open(w.page, `/officer/cases/${CN(12)}`);
  await expect(B.tid(w.page, 'case-owner')).toHaveText('off.works1');
  await B.tid(w.page, 'forward-btn').click();
  await ST(w.page, 'PENDING_APPROVAL');
  await expect(B.tid(w.page, 'case-step')).toHaveText('ขั้นตอน 3/3 · หัวหน้าฝ่าย');

  const h = await B.uiStaff(browser, 'head1');
  await h.page.goto('/head/approvals');
  await expect(B.tid(h.page, 'approval-row')).toHaveCount(3);
  await h.page.locator(`[data-testid=approval-row][data-case-no="${CN(12)}"] [data-testid=approval-open]`).click();
  await B.tid(h.page, 'approve-btn').click();
  await ST(h.page, 'APPROVED');

  await open(w.page, `/officer/cases/${CN(12)}`);
  await expect(B.tid(w.page, 'issue-btn')).toHaveCount(0);
  await open(p, `/officer/cases/${CN(12)}`);
  await expect(B.tid(p, 'issue-btn')).toHaveCount(1);
  await B.tid(p, 'issue-btn').click();
  await ST(p, 'COMPLETED');
  const code = (await B.tid(p, 'verify-code').textContent()).trim();
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(`/verify/${code}`);
  await expect(B.tid(ap, 'verify-signer')).toHaveText('หัวหน้าฝ่าย');
  await anon.close();
  for (const y of [s, w, h]) await y.ctx.close();
});

test('TC-WORKFLOW-04 ตีกลับสูงสุด 2 ครั้ง และผลหลังครบ @P1', async ({ browser }) => {
  // A
  await B.fresh();
  const reg1 = await B.staff('off.reg1');
  const sm = await C.apiCitizen(C.ID.somchai);
  expect((await B.getCase(reg1, CN(20))).returnCount).toBe(0);
  let r = await B.ret(reg1, CN(20));
  expect(r.status).toBe(200);
  expect(r.body.returnCount).toBe(1);
  expect((await B.getCase(reg1, CN(20))).status).toBe('NEED_FIX');
  expect((await B.resubmit(sm, CN(20))).body.status).toBe('IN_REVIEW');
  r = await B.ret(reg1, CN(20));
  expect(r.status).toBe(200);
  expect(r.body.returnCount).toBe(2);
  expect((await B.resubmit(sm, CN(20))).body.status).toBe('IN_REVIEW');
  const s = await B.uiStaff(browser, 'off.reg1');
  await open(s.page, `/officer/cases/${CN(20)}`);
  await expect(B.tid(s.page, 'return-btn')).toHaveCount(0);
  await expect(B.tid(s.page, 'return-count')).toHaveText('2');
  await expect(B.tid(s.page, 'approve-btn')).toHaveCount(1);
  await expect(B.tid(s.page, 'reject-btn')).toHaveCount(1);
  r = await B.ret(reg1, CN(20));
  expect(r.status).toBe(409);
  expect(r.body.code).toBe('RETURN_LIMIT');
  expect(r.body.message).toBe('ตีกลับได้สูงสุด 2 ครั้ง');
  const c = await B.getCase(reg1, CN(20));
  expect(c.status).toBe('IN_REVIEW');
  expect(c.returnCount).toBe(2);
  await s.ctx.close();

  // B
  await B.fresh();
  const s2 = await B.uiStaff(browser, 'off.reg1');
  await open(s2.page, `/officer/cases/${CN(23)}`);
  await expect(B.tid(s2.page, 'return-count')).toHaveText('2');
  await expect(B.tid(s2.page, 'return-btn')).toHaveCount(0);
  await expect(B.tid(s2.page, 'approve-btn')).toHaveCount(1);
  await expect(B.tid(s2.page, 'reject-btn')).toHaveCount(1);
  const reg1b = await B.staff('off.reg1');
  r = await B.ret(reg1b, CN(23));
  expect(r.status).toBe(409);
  expect(r.body.code).toBe('RETURN_LIMIT');
  expect((await B.getCase(reg1b, CN(23))).status).toBe('IN_REVIEW');
  await s2.ctx.close();

  // C
  await B.fresh();
  const reg2 = await B.staff('off.reg2');
  const sm2 = await C.apiCitizen(C.ID.somchai);
  expect((await B.ret(reg2, CN(13))).status).toBe(200);
  expect((await B.resubmit(sm2, CN(13))).status).toBe(200);
  expect((await B.ret(reg2, CN(13))).status).toBe(200);
  expect((await B.resubmit(sm2, CN(13))).status).toBe(200);
  const s3 = await B.uiStaff(browser, 'off.reg2');
  const p = s3.page;
  await open(p, `/officer/cases/${CN(13)}`);
  await expect(B.tid(p, 'return-btn')).toHaveCount(0);
  await expect(B.tid(p, 'approve-btn')).toHaveCount(0);
  await expect(B.tid(p, 'reject-btn')).toHaveCount(0);
  await expect(B.tid(p, 'forward-btn')).toHaveCount(1);
  expect((await B.reject(reg2, CN(13))).status).toBe(403);
  await B.tid(p, 'forward-note').fill('ส่งต่อให้หัวหน้าพิจารณา');
  await B.tid(p, 'forward-btn').click();
  await ST(p, 'PENDING_APPROVAL');
  const au = await C.apiStaff('audit1');
  const log = await B.audit(au, 'event=FORWARD');
  const row = log.items.find((i) => i.caseNo === CN(13));
  expect(row, 'FORWARD audit row').toBeTruthy();
  expect(row.detail).toContain('ส่งต่อให้หัวหน้าพิจารณา');
  const h = await B.uiStaff(browser, 'head1');
  await open(h.page, `/officer/cases/${CN(13)}`);
  await expect(B.tid(h.page, 'reject-btn')).toHaveCount(1);
  await expect(B.tid(h.page, 'approve-btn')).toHaveCount(1);
  await s3.ctx.close(); await h.ctx.close();
});

test('TC-WORKFLOW-05 เหตุผล >= 10 ตัวอักษร @P1', async ({ browser }) => {
  const MSG = 'กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร';
  // A
  await B.fresh();
  const reg1 = await B.staff('off.reg1');
  const s = await B.uiStaff(browser, 'off.reg1');
  const p = s.page;
  await open(p, `/officer/cases/${CN(20)}`);
  for (const reason of ['xxxxxxxxx', '          ']) {
    await B.tid(p, 'return-btn').click();
    await B.tid(p, 'return-reason').fill(reason);
    await B.tid(p, 'return-submit').click();
    await expect(B.tid(p, 'return-reason-error')).toHaveText(MSG);
    await ST(p, 'IN_REVIEW');
    const a = await B.ret(reg1, CN(20), reason);
    expect(a.status).toBe(400);
    expect(a.body.code).toBe('REASON_TOO_SHORT');
  }
  await B.tid(p, 'return-reason').fill('xxxxxxxxxx');
  await B.tid(p, 'return-submit').click();
  await ST(p, 'NEED_FIX');
  await expect(B.tid(p, 'case-status')).toContainText('รอแก้ไขเอกสาร');
  const sm = await B.uiCitizen(browser, C.ID.somchai);
  await open(sm.page, `/citizen/cases/${CN(20)}`);
  await expect(B.tid(sm.page, 'return-reason-display')).toHaveText('xxxxxxxxxx');
  await s.ctx.close(); await sm.ctx.close();

  // B
  await B.fresh();
  const reg2 = await B.staff('off.reg2');
  const s2 = await B.uiStaff(browser, 'off.reg2');
  const p2 = s2.page;
  await open(p2, `/officer/cases/${CN(26)}`);
  await B.tid(p2, 'reject-btn').click();
  await B.tid(p2, 'reject-reason').fill('xxxxxxxxx');
  await B.tid(p2, 'reject-submit').click();
  await expect(B.tid(p2, 'reject-reason-error')).toHaveText(MSG);
  const a9 = await B.reject(reg2, CN(26), 'xxxxxxxxx');
  expect(a9.status).toBe(400);
  await B.tid(p2, 'reject-reason').fill('xxxxxxxxxx');
  await B.tid(p2, 'reject-submit').click();
  await ST(p2, 'REJECTED');
  await expect(B.tid(p2, 'case-status')).toContainText('ไม่อนุมัติ');
  await B.expectIso(B.tid(p2, 'closed-at'), '2026-12-01T09:00:00+07:00');
  await expect(B.tid(p2, 'sla-level')).toHaveText('ปิดแล้ว');
  const sm2 = await B.uiCitizen(browser, C.ID.somchai); // 000026 belongs to สมชาย
  await open(sm2.page, `/citizen/cases/${CN(26)}`);
  await expect(B.tid(sm2.page, 'no-refund-note')).toHaveCount(1);
  const d = await B.dashboard(await B.staff('exec1'));
  expect(d.closed).toBe(1);
  expect(d.onTime).toBe(1);
  await s2.ctx.close(); await sm2.ctx.close();

  // C
  await B.fresh();
  const head = await B.staff('head1');
  const h = await B.uiStaff(browser, 'head1');
  await open(h.page, `/officer/cases/${CN(11)}`);
  await B.tid(h.page, 'reject-btn').click();
  await B.tid(h.page, 'reject-reason').fill('xxxxxxxxx');
  await B.tid(h.page, 'reject-submit').click();
  await expect(B.tid(h.page, 'reject-reason-error')).toHaveText(MSG);
  expect((await B.reject(head, CN(11), 'xxxxxxxxx')).status).toBe(400);
  await B.tid(h.page, 'reject-reason').fill('xxxxxxxxxx');
  await B.tid(h.page, 'reject-submit').click();
  await ST(h.page, 'REJECTED');
  await h.ctx.close();
});

test('TC-WORKFLOW-06 เวลาแก้ไข 168 ชั่วโมง @P1', async ({ browser }) => {
  await B.fresh();
  let sm = await B.uiCitizen(browser, C.ID.somchai);
  await open(sm.page, `/citizen/cases/${CN(17)}`);
  await ST(sm.page, 'NEED_FIX');
  await expect(B.tid(sm.page, 'case-status')).toContainText('รอแก้ไขเอกสาร');
  await expect(B.tid(sm.page, 'return-reason-display')).toHaveText('ชื่อในเอกสารไม่ตรงกับบัตร กรุณาแก้ไข');
  await expect(B.tid(sm.page, 'fix-deadline')).toHaveText('4 ธ.ค. 2569 14:00');
  await B.expectIso(B.tid(sm.page, 'fix-deadline'), '2026-12-04T14:00:00+07:00');
  await expect(B.tid(sm.page, 'submit-fix-btn')).toHaveCount(1);
  await sm.ctx.close();

  // A
  await B.fresh();
  await B.setClock('2026-12-04T13:59:00+07:00');
  sm = await B.uiCitizen(browser, C.ID.somchai);
  await open(sm.page, `/citizen/cases/${CN(17)}`);
  await expect(B.tid(sm.page, 'submit-fix-btn')).toBeEnabled();
  await B.tid(sm.page, 'submit-fix-btn').click();
  await expect(B.tid(sm.page, 'case-status')).toContainText('กำลังตรวจสอบ');
  await sm.ctx.close();

  // B
  await B.fresh();
  await B.setClock('2026-12-04T14:00:00+07:00');
  sm = await B.uiCitizen(browser, C.ID.somchai);
  await open(sm.page, `/citizen/cases/${CN(17)}`);
  await ST(sm.page, 'CANCELLED');
  await expect(B.tid(sm.page, 'case-status')).toContainText('ยกเลิก');
  await expect(B.tid(sm.page, 'submit-fix-btn')).toHaveCount(0);
  await expect(B.tid(sm.page, 'no-refund-note')).toHaveCount(1);
  const api = await C.apiCitizen(C.ID.somchai);
  const rs = await B.resubmit(api, CN(17));
  expect(rs.status).toBe(409);
  await expect(sm.page.locator('[data-testid=timeline-item][data-iso="2026-12-04T14:00:00+07:00"]')).toHaveCount(1);
  const d = await B.dashboard(await B.staff('exec1'));
  expect(d.backlog).toBe(20);
  await sm.ctx.close();
});

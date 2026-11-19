const { test, expect } = require('@playwright/test');
const B = require('../lib/b');
const { C, CN } = B;

const ROWS = [
  ['a', 'SV-01', {}, '2026-12-01T09:00:00+07:00', '2026-12-04T16:30:00+07:00'],
  ['b', 'SV-01', {}, '2026-12-01T16:29:00+07:00', '2026-12-04T16:30:00+07:00'],
  ['c', 'SV-01', {}, '2026-12-01T16:30:00+07:00', '2026-12-08T16:30:00+07:00'],
  ['d', 'SV-01', {}, '2026-12-04T10:00:00+07:00', '2026-12-11T16:30:00+07:00'],
  ['e', 'SV-01', {}, '2026-12-05T10:00:00+07:00', '2026-12-14T16:30:00+07:00'],
  ['f', 'SV-02', {}, '2026-12-01T09:00:00+07:00', '2026-12-17T16:30:00+07:00'],
  ['g', 'SV-03', { areaSqm: 100 }, '2026-12-01T09:00:00+07:00', '2026-12-24T16:30:00+07:00'],
  ['h', 'SV-01', {}, '2026-12-29T10:00:00+07:00', '2027-01-05T16:30:00+07:00'],
  ['i', 'SV-01', {}, '2026-12-31T23:59:00+07:00', '2027-01-07T16:30:00+07:00'],
];

for (const [row, svc, opts, paidAt, due] of ROWS) {
  test(`TC-SLA-01 กำหนดเสร็จตามตารางวันที่ แถว ${row} @P1`, async ({ browser }) => {
    await B.fresh();
    const n = await B.newPaid({ at: paidAt, serviceId: svc, ...opts });
    expect(n.caseNo).toBe(CN(31));
    const cs = await B.getCase(n.cit, CN(31));
    expect(cs.dueAt).toBe(due);
    const s = await B.uiCitizen(browser, C.ID.somchai);
    await s.page.goto(`/citizen/cases/${CN(31)}`);
    await expect(B.tid(s.page, 'sla-due')).toHaveText(C.thaiDateTime(due));
    await B.expectIso(B.tid(s.page, 'sla-due'), due);
    await s.ctx.close();
  });
}

test('TC-SLA-02 หยุดนับ SLA ระหว่างรอแก้ไข @P1', async ({ browser }) => {
  // Part 1
  await B.fresh();
  let n = await B.newPaid({ at: '2026-12-01T09:00:00+07:00' });
  expect(n.caseNo).toBe(CN(31));
  expect((await B.getCase(n.cit, CN(31))).dueAt).toBe('2026-12-04T16:30:00+07:00');
  await B.setClock('2026-12-02T11:00:00+07:00');
  let off = await B.staff('off.reg1');
  expect((await B.claim(off, CN(31))).status).toBe(200);
  expect((await B.ret(off, CN(31))).status).toBe(200);
  let sm = await B.uiCitizen(browser, C.ID.somchai);
  await sm.page.goto(`/citizen/cases/${CN(31)}`);
  await expect(B.tid(sm.page, 'case-status')).toContainText('รอแก้ไขเอกสาร');
  await expect(B.tid(sm.page, 'sla-level')).toHaveText('หยุดนับ');
  await expect(B.tid(sm.page, 'sla-level')).toHaveAttribute('data-level', 'paused');
  await B.expectIso(B.tid(sm.page, 'fix-deadline'), '2026-12-09T11:00:00+07:00');
  await B.setClock('2026-12-03T10:00:00+07:00');
  await sm.page.goto(`/citizen/cases/${CN(31)}`);
  await B.tid(sm.page, 'submit-fix-btn').click();
  await expect(B.tid(sm.page, 'case-status')).toContainText('กำลังตรวจสอบ');
  await expect(B.tid(sm.page, 'sla-due')).toHaveText('8 ธ.ค. 2569 16:30');
  await B.expectIso(B.tid(sm.page, 'sla-due'), '2026-12-08T16:30:00+07:00');
  await expect(B.tid(sm.page, 'sla-level')).toHaveText('ปกติ');
  expect((await B.getCase(off, CN(31))).owner).toBe('off.reg1');
  await sm.ctx.close();

  // Part 2 seed 17
  await B.fresh();
  sm = await B.uiCitizen(browser, C.ID.somchai);
  await sm.page.goto(`/citizen/cases/${CN(17)}`);
  await expect(B.tid(sm.page, 'sla-level')).toHaveText('หยุดนับ');
  await B.expectIso(B.tid(sm.page, 'sla-due'), '2026-11-27T16:30:00+07:00');
  await B.tid(sm.page, 'submit-fix-btn').click();
  await expect(B.tid(sm.page, 'case-status')).toContainText('กำลังตรวจสอบ');
  await sm.page.reload();
  await B.expectIso(B.tid(sm.page, 'sla-due'), '2026-12-01T16:30:00+07:00');
  await expect(B.tid(sm.page, 'sla-level')).toHaveText('ใกล้ครบกำหนด');
  const cs17 = await B.getCase(await B.staff('off.reg1'), CN(17));
  expect(cs17.owner).toBe('off.reg1');
  await sm.ctx.close();

  // Part 3
  await B.fresh();
  await B.setClock('2026-12-04T10:00:00+07:00');
  sm = await B.uiCitizen(browser, C.ID.somchai);
  await sm.page.goto(`/citizen/cases/${CN(17)}`);
  await B.tid(sm.page, 'submit-fix-btn').click();
  await expect(B.tid(sm.page, 'case-status')).toContainText('กำลังตรวจสอบ');
  await sm.page.reload();
  await B.expectIso(B.tid(sm.page, 'sla-due'), '2026-12-04T16:30:00+07:00');
  await expect(B.tid(sm.page, 'sla-level')).toHaveText('ใกล้ครบกำหนด');
  await sm.ctx.close();

  // Part 4
  await B.fresh();
  n = await B.newPaid({ at: '2026-12-01T09:00:00+07:00' });
  await B.setClock('2026-12-02T09:00:00+07:00');
  off = await B.staff('off.reg1');
  await B.claim(off, CN(31));
  expect((await B.ret(off, CN(31))).status).toBe(200);
  await B.setClock('2026-12-02T15:00:00+07:00');
  let r = await B.resubmit(n.cit, CN(31));
  expect(r.status).toBe(200);
  expect((await B.getCase(n.cit, CN(31))).dueAt).toBe('2026-12-04T16:30:00+07:00');

  // Part 5
  await B.fresh();
  n = await B.newPaid({ at: '2026-12-01T09:00:00+07:00' });
  await B.setClock('2026-12-04T10:00:00+07:00');
  off = await B.staff('off.reg1');
  await B.claim(off, CN(31));
  expect((await B.ret(off, CN(31))).status).toBe(200);
  await B.setClock('2026-12-08T17:00:00+07:00');
  r = await B.resubmit(n.cit, CN(31));
  expect(r.status).toBe(200);
  const c5 = await B.getCase(n.cit, CN(31));
  expect(c5.dueAt).toBe('2026-12-08T16:30:00+07:00');
  expect(c5.slaLevel).toBe('overdue');
  sm = await B.uiCitizen(browser, C.ID.somchai);
  await sm.page.goto(`/citizen/cases/${CN(31)}`);
  await expect(B.tid(sm.page, 'sla-level')).toHaveText('เกินกำหนด');
  await sm.ctx.close();
});

const LEVEL_TH = { normal: 'ปกติ', near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด', paused: 'หยุดนับ', closed: 'ปิดแล้ว' };

async function checkLevel(page, api, caseNo, level) {
  const cs = await B.getCase(api, caseNo);
  expect(cs.slaLevel, 'api slaLevel').toBe(level);
  await page.goto(`/citizen/cases/${caseNo}`);
  await expect(B.tid(page, 'sla-level')).toHaveText(LEVEL_TH[level]);
  await expect(B.tid(page, 'sla-level')).toHaveAttribute('data-level', level);
}

test('TC-SLA-03 ระดับเตือน ปกติ/ใกล้/เกิน @P1', async ({ browser }) => {
  // A
  await B.fresh();
  const n = await B.newPaid({ at: '2026-12-01T09:00:00+07:00' });
  const sm = await B.uiCitizen(browser, C.ID.somchai);
  const A = [
    ['2026-12-01T09:00:00+07:00', 'normal'],
    ['2026-12-02T09:00:00+07:00', 'normal'],
    ['2026-12-03T09:00:00+07:00', 'near'],
    ['2026-12-04T16:30:00+07:00', 'near'],
    ['2026-12-04T16:30:01+07:00', 'overdue'],
    ['2026-12-04T16:31:00+07:00', 'overdue'],
    ['2026-12-05T10:00:00+07:00', 'overdue'],
  ];
  for (const [t, lv] of A) {
    await B.setClock(t);
    await checkLevel(sm.page, n.cit, CN(31), lv);
  }
  await sm.ctx.close();

  // B seed 16
  await B.fresh();
  const sc = await B.uiCitizen(browser, C.ID.piti);
  const cit = await C.apiCitizen(C.ID.piti);
  const Bt = [
    ['2026-12-03T09:00:00+07:00', 'normal'],
    ['2026-12-04T09:00:00+07:00', 'near'],
    ['2026-12-08T16:30:00+07:00', 'near'],
    ['2026-12-08T16:31:00+07:00', 'overdue'],
  ];
  for (const [t, lv] of Bt) {
    await B.setClock(t);
    await checkLevel(sc.page, cit, CN(16), lv);
  }
  await sc.ctx.close();

  // C seed at 09:00 via officer queue
  await B.fresh();
  const o = await B.uiStaff(browser, 'off.reg1');
  await o.page.goto('/officer/queue');
  const exp = { '000020': 'เกินกำหนด', '000022': 'ใกล้ครบกำหนด', '000024': 'ใกล้ครบกำหนด', '000025': 'ปกติ' };
  for (const [no, th] of Object.entries(exp)) {
    await expect(o.page.locator(`[data-testid=queue-row][data-case-no="EG-2569-${no}"] [data-testid=row-sla-level]`)).toHaveText(th);
  }
  const reg1 = await B.staff('off.reg1');
  await o.page.goto(`/officer/cases/${CN(17)}`).catch(() => {});
  // 17 is NEED_FIX: seen by owner citizen
  const smC = await B.uiCitizen(browser, C.ID.somchai);
  await smC.page.goto(`/citizen/cases/${CN(17)}`);
  await expect(B.tid(smC.page, 'sla-level')).toHaveText('หยุดนับ');
  const syC = await B.uiCitizen(browser, C.ID.somying);
  await syC.page.goto(`/citizen/cases/${CN(1)}`);
  await expect(B.tid(syC.page, 'sla-level')).toHaveText('ปิดแล้ว');
  await B.setClock('2026-12-01T16:30:00+07:00');
  expect((await B.getCase(reg1, CN(22))).slaLevel).toBe('near');
  await B.setClock('2026-12-01T16:31:00+07:00');
  expect((await B.getCase(reg1, CN(22))).slaLevel).toBe('overdue');
  await o.page.goto('/officer/queue');
  await expect(o.page.locator(`[data-testid=queue-row][data-case-no="${CN(22)}"] [data-testid=row-sla-level]`)).toHaveText('เกินกำหนด');
  for (const x of [o, smC, syC]) await x.ctx.close();
});

const { test, expect } = require('@playwright/test');
const B = require('../lib/b');
const { C, CN } = B;

const REG_ORDER = ['000020', '000022', '000024', '000023', '000025', '000026', '000013', '000015', '000027', '000028', '000029', '000030', '000016', '000018', '000019', '000012', '000021'];

test('TC-QUEUE-01 ลำดับคิวและขอบเขตแผนก @P1', async ({ browser }) => {
  await B.fresh();
  const r1 = await B.uiStaff(browser, 'off.reg1');
  const p = r1.page;
  await p.goto('/officer/queue');
  await expect(B.tid(p, 'queue-filter')).toHaveValue('all');
  await expect(B.tid(p, 'queue-row')).toHaveCount(17);
  expect(await B.rowNos(p, 'queue-row')).toEqual(REG_ORDER);
  const lv = await B.tid(p, 'queue-row').evaluateAll((els) => els.slice(0, 3).map((e) => e.querySelector('[data-testid=row-sla-level]').textContent.trim()));
  expect(lv).toEqual(['เกินกำหนด', 'ใกล้ครบกำหนด', 'ใกล้ครบกำหนด']);
  const masks = await B.tid(p, 'row-id-masked').allTextContents();
  expect(masks.length).toBe(17);
  for (const m of masks) expect(m.trim()).toMatch(/^X-XXXX-XXXXX-\d{2}-\d$/);
  // claim buttons only on 4 unclaimed SUBMITTED rows
  await expect(B.tid(p, 'claim-btn')).toHaveCount(4);
  const claimRows = await p.locator('[data-testid=queue-row]:has([data-testid=claim-btn])').evaluateAll((els) => els.map((e) => e.getAttribute('data-case-no').slice(-6)));
  expect(claimRows.sort()).toEqual(['000024', '000028', '000029', '000030']);
  await expect(p.locator(`[data-testid=queue-row][data-case-no="${CN(19)}"] [data-testid=claim-btn]`)).toHaveCount(0);
  await B.tid(p, 'queue-filter').selectOption('unclaimed');
  await expect(B.tid(p, 'queue-row')).toHaveCount(4);
  expect((await B.rowNos(p, 'queue-row')).sort()).toEqual(['000024', '000028', '000029', '000030']);
  await B.tid(p, 'queue-filter').selectOption('mine');
  await expect(B.tid(p, 'queue-row')).toHaveCount(3);
  expect((await B.rowNos(p, 'queue-row')).sort()).toEqual(['000020', '000022', '000023']);
  await expect(B.tid(p, 'workload-count')).toHaveText('3');
  for (const n of ['000017', '000011', '000014']) {
    await B.tid(p, 'queue-filter').selectOption('all');
    await expect(p.locator(`[data-testid=queue-row][data-case-no="EG-2569-${n}"]`)).toHaveCount(0);
  }

  // off.reg2 mine
  await C.reset();
  const r2 = await B.uiStaff(browser, 'off.reg2');
  await r2.page.goto('/officer/queue');
  await B.tid(r2.page, 'queue-filter').selectOption('mine');
  await expect(B.tid(r2.page, 'queue-row')).toHaveCount(9);
  expect(await B.rowNos(r2.page, 'queue-row')).toEqual(['000025', '000026', '000013', '000015', '000027', '000016', '000018', '000012', '000021']);
  await expect(B.tid(r2.page, 'workload-count')).toHaveText('9');

  // works1
  await C.reset();
  const w = await B.uiStaff(browser, 'off.works1');
  await w.page.goto('/officer/queue');
  await expect(B.tid(w.page, 'queue-row')).toHaveCount(1);
  expect(await B.rowNos(w.page, 'queue-row')).toEqual(['000010']);

  // head1
  await C.reset();
  const h = await B.uiStaff(browser, 'head1');
  await h.page.goto('/officer/queue');
  await expect(B.tid(h.page, 'queue-row')).toHaveCount(18);
  const nos = await B.rowNos(h.page, 'queue-row');
  const g3 = nos.filter((n) => ['000010', '000023', '000025', '000026'].includes(n));
  expect(g3).toEqual(['000010', '000023', '000025', '000026']);
  await expect(B.tid(h.page, 'claim-btn')).toHaveCount(0);
  for (const x of [r1, r2, w, h]) await x.ctx.close();
});

test('TC-QUEUE-02 รับเรื่องซ้อน (พร้อมกันและต่อกัน) @P1', async ({ browser }) => {
  // Part 1 UI concurrent
  await B.fresh();
  const a = await B.uiStaff(browser, 'off.reg1');
  const b = await B.uiStaff(browser, 'off.reg2');
  const sel = `[data-testid=queue-row][data-case-no="${CN(28)}"]`;
  for (const x of [a, b]) {
    await x.page.goto('/officer/queue');
    await expect(x.page.locator(sel)).toHaveCount(1);
  }
  await Promise.all([a, b].map((x) => x.page.locator(sel + ' [data-testid=claim-btn]').click()));
  await a.page.waitForTimeout(1500);
  const errs = [];
  for (const x of [a, b]) errs.push(await B.tid(x.page, 'action-error').count());
  expect(errs.reduce((s, v) => s + v, 0), 'exactly one loser shows action-error').toBe(1);
  const loser = errs[0] ? a : b;
  await expect(B.tid(loser.page, 'action-error')).toHaveText('มีเจ้าหน้าที่รับเรื่องนี้แล้ว');
  const reader = await B.staff('off.reg1');
  const cs = await B.getCase(reader, CN(28));
  expect(cs.status).toBe('IN_REVIEW');
  expect(['off.reg1', 'off.reg2']).toContain(cs.owner);
  const winner = loser === a ? b : a;
  const winnerPage = winner.page;
  await winnerPage.reload();
  await expect(winnerPage.locator(sel + ' [data-testid=row-owner]')).not.toHaveText('');
  const au = await B.staff('audit1').then(() => C.apiStaff('audit1'));
  const log = await B.audit(au, 'event=CLAIM');
  expect(log.items.filter((i) => i.caseNo === CN(28))).toHaveLength(1);
  await a.ctx.close(); await b.ctx.close();

  // Part 2 API 10 concurrent
  await C.reset();
  const ctxs = [];
  for (let i = 0; i < 5; i++) ctxs.push(await B.staff('off.reg1'));
  for (let i = 0; i < 5; i++) ctxs.push(await B.staff('off.reg2'));
  const results = await Promise.all(ctxs.map((c) => B.claim(c, CN(29))));
  const oks = results.filter((r) => r.status === 200);
  expect(oks).toHaveLength(1);
  expect(results.filter((r) => r.status === 409 && r.body.code === 'ALREADY_CLAIMED')).toHaveLength(9);
  const au2 = await C.apiStaff('audit1');
  const cs2 = await B.getCase(await B.staff('off.reg1'), CN(29));
  expect(cs2.owner).toBe(oks[0].body.owner);
  const log2 = await B.audit(au2, 'event=CLAIM');
  expect(log2.items.filter((i) => i.caseNo === CN(29))).toHaveLength(1);

  // Part 3 sequential
  await C.reset();
  const r1 = await B.staff('off.reg1');
  const r2 = await B.staff('off.reg2');
  const c1 = await B.claim(r1, CN(29));
  expect(c1.status).toBe(200);
  expect(c1.body.owner).toBe('off.reg1');
  const c2 = await B.claim(r2, CN(29));
  expect(c2.status).toBe(409);
  expect(c2.body.code).toBe('ALREADY_CLAIMED');
  expect(c2.body.message).toBe('มีเจ้าหน้าที่รับเรื่องนี้แล้ว');
  expect((await B.getCase(r2, CN(29))).owner).toBe('off.reg1');
  const q2 = await B.queue(r2, 'mine');
  expect(q2).toHaveLength(9);
  const c3 = await B.claim(r1, CN(29));
  expect(c3.status).toBe(409);
  const log3 = await B.audit(await C.apiStaff('audit1'), 'event=CLAIM');
  expect(log3.items.filter((i) => i.caseNo === CN(29))).toHaveLength(1);
});

test('TC-QUEUE-03 งานในมือสูงสุด 10 @P1', async ({ browser }) => {
  await B.fresh();
  const s = await B.uiStaff(browser, 'off.reg2');
  const p = s.page;
  const wl = B.tid(p, 'workload-count');
  const claimUi = async (n) => {
    await p.goto('/officer/queue');
    await p.locator(`[data-testid=queue-row][data-case-no="${CN(n)}"] [data-testid=claim-btn]`).click();
  };
  await p.goto('/officer/queue');
  await expect(wl).toHaveText('9');
  await claimUi(28);
  await expect(wl).toHaveText('10');
  await p.goto('/officer/queue');
  await expect(wl).toHaveText('10');
  await claimUi(29);
  await expect(B.tid(p, 'action-error')).toHaveText('รับงานได้สูงสุด 10 เรื่อง');
  const api2 = await B.staff('off.reg2');
  const w29 = await B.claim(api2, CN(29));
  expect(w29.status).toBe(409);
  expect(w29.body.code).toBe('WORKLOAD_LIMIT');
  const c29 = await B.getCase(api2, CN(29));
  expect(c29.status).toBe('SUBMITTED');
  expect(c29.owner).toBeFalsy();
  await p.goto('/officer/queue');
  await expect(wl).toHaveText('10');
  // step 4 approve 000025
  await p.goto(`/officer/cases/${CN(25)}`);
  await B.tid(p, 'approve-btn').click();
  await expect(B.tid(p, 'case-status')).toHaveAttribute('data-status', 'APPROVED');
  await p.goto('/officer/queue');
  await expect(wl).toHaveText('9');
  await claimUi(29);
  await p.goto('/officer/queue');
  await expect(wl).toHaveText('10');
  const reg1 = await B.staff('off.reg1');
  expect((await B.claim(reg1, CN(30))).status).toBe(200);
  await s.ctx.close();

  // step 7+
  await C.reset();
  const o2 = await B.staff('off.reg2');
  const rr = await B.ret(o2, CN(25));
  expect(rr.status).toBe(200);
  expect((await B.getCase(o2, CN(25))).status).toBe('NEED_FIX');
  const s2 = await B.uiStaff(browser, 'off.reg2');
  await s2.page.goto('/officer/queue');
  await expect(B.tid(s2.page, 'workload-count')).toHaveText('8');
  expect((await B.claim(o2, CN(28))).status).toBe(200);
  expect((await B.claim(o2, CN(29))).status).toBe(200);
  await s2.page.goto('/officer/queue');
  await expect(B.tid(s2.page, 'workload-count')).toHaveText('10');
  // step 9 citizen resubmit via UI
  const sy = await B.uiCitizen(browser, C.ID.somying);
  await sy.page.goto(`/citizen/cases/${CN(25)}`);
  await B.tid(sy.page, 'submit-fix-btn').click();
  await expect(B.tid(sy.page, 'action-error')).toHaveCount(0);
  await expect(B.tid(sy.page, 'case-status')).toHaveAttribute('data-status', 'IN_REVIEW');
  await expect(B.tid(sy.page, 'case-status')).toContainText('กำลังตรวจสอบ');
  const after = await B.getCase(o2, CN(25));
  expect(after.owner).toBe('off.reg2');
  await s2.page.goto('/officer/queue');
  await expect(B.tid(s2.page, 'workload-count')).toHaveText('11');
  const l = await B.claim(o2, CN(30));
  expect(l.status).toBe(409);
  expect(l.body.code).toBe('WORKLOAD_LIMIT');
  expect(l.body.message).toBe('รับงานได้สูงสุด 10 เรื่อง');
  await s2.page.goto('/officer/queue');
  await expect(B.tid(s2.page, 'workload-count')).toHaveText('11');
  await s2.ctx.close(); await sy.ctx.close();
});

const { test, expect } = require('@playwright/test');
const B = require('../lib/b');
const { C, CN } = B;

const K = (n, lv) => `${n}:${lv}`;
const forCase = (items, no) => items.filter((i) => i.caseNo.endsWith(no)).map((i) => i.level).sort();

test('TC-NOTI-01 ผู้รับแจ้งเตือนตามระดับ @P1', async ({ browser }) => {
  await B.fresh();
  const reg1 = await B.staff('off.reg1'); // first request triggers evaluation
  const reg2 = await B.staff('off.reg2');
  const head = await B.staff('head1');
  const works = await B.staff('off.works1');
  const i1 = await B.notis(reg1);
  expect(B.notiKeys(i1)).toEqual([K('000020', 'overdue'), K('000022', 'near'), K('000024', 'near')].sort());
  const t24 = i1.find((i) => i.caseNo === CN(24));
  expect(t24.text).toBe('คำขอ EG-2569-000024 ใกล้ครบกำหนด');
  expect(i1.find((i) => i.caseNo === CN(20)).text).toBe('คำขอ EG-2569-000020 เกินกำหนด');
  expect(B.notiKeys(await B.notis(reg2))).toEqual([K('000024', 'near')]);
  expect(B.notiKeys(await B.notis(head))).toEqual([K('000020', 'overdue')]);
  expect(await B.notis(works)).toHaveLength(0);

  // UI
  const expectUi = { 'off.reg1': 3, 'off.reg2': 1, head1: 1, 'off.works1': 0 };
  for (const [u, cnt] of Object.entries(expectUi)) {
    const s = await B.uiStaff(browser, u);
    await s.page.goto('/notifications');
    await expect(B.tid(s.page, 'bell-count')).toHaveText(String(cnt));
    if (cnt === 0) {
      await expect(B.tid(s.page, 'noti-empty')).toHaveText('ไม่มีแจ้งเตือน');
      await expect(B.tid(s.page, 'noti-item')).toHaveCount(0);
    } else {
      await expect(B.tid(s.page, 'noti-item')).toHaveCount(cnt);
    }
    if (u === 'off.reg1') {
      await expect(s.page.locator(`[data-testid=noti-item][data-case-no="${CN(24)}"][data-level=near]`)).toContainText('คำขอ EG-2569-000024 ใกล้ครบกำหนด');
      await expect(s.page.locator(`[data-testid=noti-item][data-case-no="${CN(20)}"][data-level=overdue]`)).toContainText('คำขอ EG-2569-000020 เกินกำหนด');
    }
    await s.ctx.close();
  }

  // continuation
  await B.setClock('2026-12-01T16:31:00+07:00');
  await B.notis(reg1);
  expect(B.notiKeys(await B.notis(reg1))).toEqual([K('000020', 'overdue'), K('000022', 'near'), K('000022', 'overdue'), K('000024', 'near')].sort());
  expect(forCase(await B.notis(head), '000022')).toEqual(['overdue']);
  expect((await B.notis(head)).length).toBe(2);
  expect((await B.notis(reg2)).length).toBe(1);
});

test('TC-NOTI-02 ไม่แจ้งซ้ำ ข้ามระดับ และขั้นรออนุมัติ/รอออกเอกสาร @P1', async ({ browser }) => {
  // A
  await B.fresh();
  let reg1 = await B.staff('off.reg1');
  let head = await B.staff('head1');
  await B.notis(reg1);
  await B.setClock('2026-12-01T16:31:00+07:00');
  await B.notis(reg1);
  const s = await B.uiStaff(browser, 'off.reg1');
  for (let i = 0; i < 3; i++) {
    await s.page.goto('/notifications');
    await B.notis(reg1);
  }
  for (let i = 0; i < 2; i++) await s.page.goto('/officer/queue');
  expect((await B.notis(reg1)).length).toBe(4);
  expect((await B.notis(head)).length).toBe(2);
  await s.page.goto('/notifications');
  await expect(B.tid(s.page, 'bell-count')).toHaveText('4');
  await s.ctx.close();

  // B
  await B.fresh();
  await B.setClock('2026-12-05T10:00:00+07:00');
  reg1 = await B.staff('off.reg1');
  const reg2 = await B.staff('off.reg2');
  const works = await B.staff('off.works1');
  head = await B.staff('head1');
  const [n1, n2, nw, nh] = [await B.notis(reg1), await B.notis(reg2), await B.notis(works), await B.notis(head)];
  expect(forCase(n1, '000024')).toEqual(['overdue']);
  expect(forCase(n2, '000024')).toEqual(['overdue']);
  expect(forCase(nh, '000024')).toEqual(['overdue']);
  for (const no of ['000020', '000022']) {
    expect(forCase(n1, no)).toEqual(['overdue']);
    expect(forCase(nh, no)).toEqual(['overdue']);
  }
  expect(n1.length).toBe(7);
  expect(n2.length).toBe(10);
  expect(nw.length).toBe(1);
  expect(nw[0].caseNo).toBe(CN(10));
  expect(nw[0].level).toBe('overdue');
  expect(nh.length).toBe(15);
  expect(forCase(nh, '000011')).toEqual(['near']);
  expect(forCase(n2, '000016')).toEqual(['near']);
  for (const [u, cnt] of [['off.reg1', 7], ['off.reg2', 10], ['off.works1', 1], ['head1', 15]]) {
    const x = await B.uiStaff(browser, u);
    await x.page.goto('/notifications');
    await expect(B.tid(x.page, 'bell-count')).toHaveText(String(cnt));
    await x.ctx.close();
  }

  // C
  await B.fresh();
  await B.setClock('2026-12-04T09:00:00+07:00');
  head = await B.staff('head1');
  reg1 = await B.staff('off.reg1');
  const reg2c = await B.staff('off.reg2');
  expect(forCase(await B.notis(head), '000014')).toEqual(['near']);
  expect(forCase(await B.notis(reg1), '000014')).toEqual([]);
  expect(forCase(await B.notis(reg2c), '000014')).toEqual([]);
  await B.setClock('2026-12-04T16:31:00+07:00');
  expect(forCase(await B.notis(head), '000014')).toEqual(['near', 'overdue']);
  expect(forCase(await B.notis(reg1), '000014')).toEqual([]);
  expect(forCase(await B.notis(reg2c), '000014')).toEqual([]);
  await B.setClock('2026-12-08T09:00:00+07:00');
  expect(forCase(await B.notis(reg1), '000019')).toEqual(['near']);
  expect(forCase(await B.notis(reg2c), '000019')).toEqual([]);
  expect(forCase(await B.notis(head), '000019')).toEqual([]);
  await B.setClock('2026-12-09T16:31:00+07:00');
  expect(forCase(await B.notis(reg1), '000019')).toEqual(['near', 'overdue']);
  expect(forCase(await B.notis(head), '000019')).toEqual(['overdue']);
});

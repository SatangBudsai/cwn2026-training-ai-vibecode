// Playwright B (บล็อก T02): หมวด QUEUE · SLA · NOTI · WORKFLOW · DOC ตาม TEST-PLAN.md
// ผลที่คาดหวังทุกค่าคิดจากกฎใน TEST-PLAN / TEST-DATA / CONTRACT (ไม่อ่านจากหน้าจอแล้วเอามาเป็นคำตอบ)
// ทุก test เริ่มด้วย RESET (eg.reset) และล็อกอินใหม่ด้วย context ใหม่ · ต้องรันแบบ serial (state ร่วมเซิร์ฟเวอร์เดียว)
const {
  test,
  expect,
  ID,
  STAFF_NAME,
  MSG,
  T,
  C,
  thaiDT,
  expectErr,
  okJson,
  getCase,
  claimApi,
  returnApi,
  approveApi,
  rejectApi,
  issueApi,
  resubmitApi,
  notisApi,
  auditApi,
  dashboardApi,
  rowSel,
  attrs,
  expectRows,
  expectStatus,
  expectLevel,
  expectSlaLevel,
  workloadIs,
  selectQueueFilter,
  uiReturn,
  uiReject,
  expectNotis,
  openVerify,
} = require('../lib/b');

// mode default: รันตามลำดับใน worker เดียว (ต้องตั้ง workers=1 ใน config) และ test ที่ล้มไม่ทำให้ test ถัดไปถูกข้าม
test.describe.configure({ mode: 'default', timeout: 240_000 });

const X10 = 'xxxxxxxxxx';
const X9 = 'xxxxxxxxx';
const nums = (...ns) => ns.map((n) => C(n));

// ลำดับคิวทะเบียนตาม BR-16 (TEST-DATA 9.1)
const REG_QUEUE = nums(20, 22, 24, 23, 25, 26, 13, 15, 27, 28, 29, 30, 16, 18, 19, 12, 21);

// =====================================================================
// หมวด QUEUE
// =====================================================================
test.describe('QUEUE', () => {
  test('TC-QUEUE-01 · ลำดับคิวและขอบเขตแผนก', async ({ eg }) => {
    await eg.reset();
    const reg1 = await eg.staff('off.reg1');
    const { page } = await eg.page(reg1, '/officer/queue');

    await expect(page.getByTestId('queue-filter')).toHaveValue('all', T);
    await expect(page.getByTestId('queue-row')).toHaveCount(17, T);
    await expectRows(page, 'queue-row', REG_QUEUE);

    // ระดับ 3 แถวแรก
    const lv = page.getByTestId('queue-row').getByTestId('row-sla-level');
    await expectLevel(lv.nth(0), 'overdue');
    await expectLevel(lv.nth(1), 'near');
    await expectLevel(lv.nth(2), 'near');
    expect(await attrs(page, 'queue-row', 'data-sla-level')).toEqual(
      ['overdue', 'near', 'near'].concat(Array(14).fill('normal')),
    );

    // เลขบัตรปิดบังทุกแถว
    const masked = await page.getByTestId('row-id-masked').allInnerTexts();
    expect(masked).toHaveLength(17);
    for (const m of masked) expect(m.trim()).toMatch(/^X-XXXX-XXXXX-\d{2}-\d$/);

    // claim-btn มี 4 ปุ่ม เฉพาะแถวที่ไม่มีผู้รับ (ไม่มีที่ APPROVED 000019)
    await expect(page.getByTestId('claim-btn')).toHaveCount(4);
    const withClaim = await page
      .getByTestId('queue-row')
      .evaluateAll((els) =>
        els.filter((e) => e.querySelector('[data-testid="claim-btn"]')).map((e) => e.getAttribute('data-case-no')),
      );
    expect(withClaim).toEqual(nums(24, 28, 29, 30));
    await expect(page.locator(rowSel('queue-row', C(19))).getByTestId('claim-btn')).toHaveCount(0);
    await expect(page.locator(rowSel('queue-row', C(19)))).toHaveAttribute('data-owner', '');

    // ไม่อยู่ในคิว
    const all = await attrs(page, 'queue-row');
    for (const n of [17, 11, 14, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) expect(all).not.toContain(C(n));

    // ตัวกรอง
    await selectQueueFilter(page, 'unclaimed');
    await expectRows(page, 'queue-row', nums(24, 28, 29, 30));
    await selectQueueFilter(page, 'mine');
    await expectRows(page, 'queue-row', nums(20, 22, 23));
    await expect(page.getByTestId('workload-count')).toHaveText('3', T);

    // API คิวสอดคล้อง
    const q = await okJson(await reg1.request.get('/api/officer/queue?filter=all'));
    expect(q.items.map((i) => i.caseNo)).toEqual(REG_QUEUE);

    // off.reg2 mine
    const reg2 = await eg.staff('off.reg2');
    const p2 = (await eg.page(reg2, '/officer/queue')).page;
    await selectQueueFilter(p2, 'mine');
    await expectRows(p2, 'queue-row', nums(25, 26, 13, 15, 27, 16, 18, 12, 21));
    await expect(p2.getByTestId('workload-count')).toHaveText('9', T);

    // off.works1 เห็นเฉพาะโยธา
    const works = await eg.staff('off.works1');
    const pw = (await eg.page(works, '/officer/queue')).page;
    await expectRows(pw, 'queue-row', [C(10)]);

    // head1 เห็น 18 แถว ไม่มี claim-btn
    const head = await eg.staff('head1');
    const ph = (await eg.page(head, '/officer/queue')).page;
    await expectRows(ph, 'queue-row', nums(20, 22, 24, 10, 23, 25, 26, 13, 15, 27, 28, 29, 30, 16, 18, 19, 12, 21));
    await expect(ph.getByTestId('claim-btn')).toHaveCount(0);
  });

  test('TC-QUEUE-02 ส่วน 1 · รับเรื่องพร้อมกันผ่าน UI', async ({ eg }) => {
    await eg.reset();
    const A = await eg.staff('off.reg1');
    const B = await eg.staff('off.reg2');
    const pa = (await eg.page(A, '/officer/queue')).page;
    const pb = (await eg.page(B, '/officer/queue')).page;
    const btnA = pa.locator(rowSel('queue-row', C(28))).getByTestId('claim-btn');
    const btnB = pb.locator(rowSel('queue-row', C(28))).getByTestId('claim-btn');
    await expect(btnA).toBeVisible(T);
    await expect(btnB).toBeVisible(T);

    await Promise.all([btnA.click(), btnB.click()]);

    const c = await getCase(A, C(28));
    expect(c.status).toBe('IN_REVIEW');
    expect(['off.reg1', 'off.reg2']).toContain(c.owner);
    const [winPage, losePage] = c.owner === 'off.reg1' ? [pa, pb] : [pb, pa];

    await expect(losePage.getByTestId('action-error')).toHaveText(MSG.ALREADY_CLAIMED, T);
    await expect(winPage.getByTestId('action-error')).toHaveCount(0);
    await winPage.reload();
    const row = winPage.locator(rowSel('queue-row', C(28)));
    await expect(row).toHaveAttribute('data-owner', c.owner, T);
    await expect(row.getByTestId('row-owner')).toContainText(
      new RegExp(`${c.owner.replace('.', '\\.')}|${STAFF_NAME[c.owner]}`),
    );

    const audit = await eg.staff('audit1');
    const a = await auditApi(audit, { event: 'CLAIM', from: '2026-12-01', to: '2026-12-01' });
    expect(a.items.filter((i) => i.caseNo === C(28))).toHaveLength(1);
  });

  test('TC-QUEUE-02 ส่วน 2 · ยิง API claim พร้อมกัน 10 ครั้ง', async ({ eg }) => {
    await eg.reset();
    const A = await eg.staff('off.reg1');
    const B = await eg.staff('off.reg2');
    const calls = [];
    for (let i = 0; i < 5; i++) calls.push(claimApi(A, C(29)), claimApi(B, C(29)));
    const resps = await Promise.all(calls);
    const statuses = resps.map((r) => r.status());
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    for (const r of resps.filter((x) => x.status() === 409)) {
      expect((await r.json()).code).toBe('ALREADY_CLAIMED');
    }
    const winner = await resps.find((r) => r.status() === 200).json();
    const c = await getCase(A, C(29));
    expect(c.owner).toBe(winner.owner);
    expect(['off.reg1', 'off.reg2']).toContain(c.owner);
    expect(c.status).toBe('IN_REVIEW');

    const audit = await eg.staff('audit1');
    const a = await auditApi(audit, { event: 'CLAIM', from: '2026-12-01', to: '2026-12-01' });
    expect(a.items.filter((i) => i.caseNo === C(29))).toHaveLength(1);
  });

  test('TC-QUEUE-02 ส่วน 3 · รับเรื่องต่อกัน (จับ B08)', async ({ eg }) => {
    await eg.reset();
    const A = await eg.staff('off.reg1');
    const B = await eg.staff('off.reg2');
    const j = await okJson(await claimApi(A, C(29)));
    expect(j.owner).toBe('off.reg1');

    await expectErr(await claimApi(B, C(29)), 409, 'ALREADY_CLAIMED', MSG.ALREADY_CLAIMED);
    expect((await getCase(A, C(29))).owner).toBe('off.reg1');
    await workloadIs(B, 9);

    await expectErr(await claimApi(A, C(29)), 409, 'ALREADY_CLAIMED');
    expect((await getCase(A, C(29))).owner).toBe('off.reg1');

    const audit = await eg.staff('audit1');
    const a = await auditApi(audit, { event: 'CLAIM', from: '2026-12-01', to: '2026-12-01' });
    expect(a.items.filter((i) => i.caseNo === C(29))).toHaveLength(1);
  });

  test('TC-QUEUE-03 · งานในมือสูงสุด 10', async ({ eg }) => {
    await eg.reset();
    let reg2 = await eg.staff('off.reg2');
    const q = (await eg.page(reg2, '/officer/queue')).page;
    const wl = q.getByTestId('workload-count');

    // 1
    await expect(wl).toHaveText('9', T);
    // 2 รับครั้งที่ 10
    await q.locator(rowSel('queue-row', C(28))).getByTestId('claim-btn').click();
    await expect(wl).toHaveText('10', T);
    // 3 รับครั้งที่ 11
    await q.locator(rowSel('queue-row', C(29))).getByTestId('claim-btn').click();
    await expect(q.getByTestId('action-error')).toHaveText(MSG.WORKLOAD_LIMIT, T);
    await expectErr(await claimApi(reg2, C(29)), 409, 'WORKLOAD_LIMIT', MSG.WORKLOAD_LIMIT);
    const c29 = await getCase(reg2, C(29));
    expect(c29.status).toBe('SUBMITTED');
    expect(c29.owner || null).toBeNull();
    await q.reload();
    await expect(wl).toHaveText('10', T);

    // 4 อนุมัติ …000025 → ไม่ใช่ IN_REVIEW แล้ว
    const cp = (await eg.page(reg2, `/officer/cases/${C(25)}`)).page;
    await cp.getByTestId('approve-btn').click();
    await expectStatus(cp, 'APPROVED');
    await q.reload();
    await expect(wl).toHaveText('9', T);

    // 5
    await q.locator(rowSel('queue-row', C(29))).getByTestId('claim-btn').click();
    await expect(wl).toHaveText('10', T);
    expect((await getCase(reg2, C(29))).owner).toBe('off.reg2');

    // 6 off.reg1 ไม่ติดเพดาน
    const reg1 = await eg.staff('off.reg1');
    expect((await okJson(await claimApi(reg1, C(30)))).owner).toBe('off.reg1');

    // 7 RESET · ตีกลับ …000025
    await eg.reset();
    reg2 = await eg.staff('off.reg2');
    const cp2 = (await eg.page(reg2, `/officer/cases/${C(25)}`)).page;
    await uiReturn(cp2, X10);
    await expectStatus(cp2, 'NEED_FIX');
    await workloadIs(reg2, 8);

    // 8
    await okJson(await claimApi(reg2, C(28)));
    await okJson(await claimApi(reg2, C(29)));
    await workloadIs(reg2, 10);

    // 9 สมหญิงส่งแก้ → คืนผู้ถือเดิมแม้เกิน 10
    const somying = await eg.citizen(ID.SOMYING);
    const sp = (await eg.page(somying, `/citizen/cases/${C(25)}`)).page;
    await sp.getByTestId('submit-fix-btn').click();
    await expectStatus(sp, 'IN_REVIEW');
    await expect(sp.getByTestId('action-error')).toHaveCount(0);
    expect((await getCase(reg2, C(25))).owner).toBe('off.reg2');
    await workloadIs(reg2, 11);

    // 10
    await expectErr(await claimApi(reg2, C(30)), 409, 'WORKLOAD_LIMIT', MSG.WORKLOAD_LIMIT);
    await workloadIs(reg2, 11);
  });
});

// =====================================================================
// หมวด SLA
// =====================================================================
test.describe('SLA', () => {
  const ROWS = [
    { row: 'a', service: 'SV-01', at: '2026-12-01T09:00:00+07:00', due: '2026-12-04T16:30:00+07:00' },
    { row: 'b', service: 'SV-01', at: '2026-12-01T16:29:00+07:00', due: '2026-12-04T16:30:00+07:00' },
    { row: 'c', service: 'SV-01', at: '2026-12-01T16:30:00+07:00', due: '2026-12-08T16:30:00+07:00' },
    { row: 'd', service: 'SV-01', at: '2026-12-04T10:00:00+07:00', due: '2026-12-11T16:30:00+07:00' },
    { row: 'e', service: 'SV-01', at: '2026-12-05T10:00:00+07:00', due: '2026-12-14T16:30:00+07:00' },
    { row: 'f', service: 'SV-02', at: '2026-12-01T09:00:00+07:00', due: '2026-12-17T16:30:00+07:00' },
    { row: 'g', service: 'SV-03', area: 100, at: '2026-12-01T09:00:00+07:00', due: '2026-12-24T16:30:00+07:00' },
    { row: 'h', service: 'SV-01', at: '2026-12-29T10:00:00+07:00', due: '2027-01-05T16:30:00+07:00' },
    { row: 'i', service: 'SV-01', at: '2026-12-31T23:59:00+07:00', due: '2027-01-07T16:30:00+07:00' },
  ];

  for (const r of ROWS) {
    test(`TC-SLA-01 แถว ${r.row} · ${r.service} ชำระ ${r.at} → ${r.due}`, async ({ eg }) => {
      await eg.reset();
      const { ctx, caseNo } = await eg.newPaid({ service: r.service, at: r.at, area: r.area });
      expect(caseNo).toBe(C(31));
      expect((await getCase(ctx, caseNo)).dueAt).toBe(r.due);
      const { page } = await eg.page(ctx, `/citizen/cases/${caseNo}`);
      const due = page.getByTestId('sla-due');
      await expect(due).toHaveAttribute('data-iso', r.due, T);
      await expect(due).toHaveText(thaiDT(r.due), T);
    });
  }

  test('TC-SLA-02 ส่วน 1 · ตีกลับ 2 ธ.ค. ส่งแก้ 3 ธ.ค. → หยุดนับ 1 วัน', async ({ eg }) => {
    await eg.reset();
    const { ctx, caseNo } = await eg.newPaid({ at: '2026-12-01T09:00:00+07:00' });
    expect(caseNo).toBe(C(31));
    expect((await getCase(ctx, caseNo)).dueAt).toBe('2026-12-04T16:30:00+07:00');

    await eg.clock('2026-12-02T11:00:00+07:00');
    const reg1 = await eg.staff('off.reg1');
    await okJson(await claimApi(reg1, caseNo));
    const op = (await eg.page(reg1, `/officer/cases/${caseNo}`)).page;
    await uiReturn(op, X10);
    await expectStatus(op, 'NEED_FIX');

    const som = await eg.citizen(ID.SOMCHAI);
    const sp = (await eg.page(som, `/citizen/cases/${caseNo}`)).page;
    await expectSlaLevel(sp, 'paused');
    await expect(sp.getByTestId('fix-deadline')).toHaveAttribute('data-iso', '2026-12-09T11:00:00+07:00', T);

    await eg.clock('2026-12-03T10:00:00+07:00');
    const som2 = await eg.citizen(ID.SOMCHAI);
    const sp2 = (await eg.page(som2, `/citizen/cases/${caseNo}`)).page;
    await sp2.getByTestId('submit-fix-btn').click();
    await expectStatus(sp2, 'IN_REVIEW');
    await sp2.reload();
    await expect(sp2.getByTestId('sla-due')).toHaveAttribute('data-iso', '2026-12-08T16:30:00+07:00', T);
    await expect(sp2.getByTestId('sla-due')).toHaveText('8 ธ.ค. 2569 16:30', T);
    await expectSlaLevel(sp2, 'normal');
    expect((await getCase(som2, caseNo)).dueAt).toBe('2026-12-08T16:30:00+07:00');

    const reg1b = await eg.staff('off.reg1');
    const op2 = (await eg.page(reg1b, `/officer/cases/${caseNo}`)).page;
    await expect(op2.getByTestId('case-owner')).toHaveText('off.reg1', T);
  });

  test('TC-SLA-02 ส่วน 2 · seed …000017 ส่งแก้ 1 ธ.ค. 09:00 (จับ B04)', async ({ eg }) => {
    await eg.reset();
    const som = await eg.citizen(ID.SOMCHAI);
    const { page } = await eg.page(som, `/citizen/cases/${C(17)}`);
    await expectSlaLevel(page, 'paused');
    await expect(page.getByTestId('sla-due')).toHaveAttribute('data-iso', '2026-11-27T16:30:00+07:00', T);
    await page.getByTestId('submit-fix-btn').click();
    await expectStatus(page, 'IN_REVIEW');
    await page.reload();
    await expect(page.getByTestId('sla-due')).toHaveAttribute('data-iso', '2026-12-01T16:30:00+07:00', T);
    await expectSlaLevel(page, 'near');
    const c = await getCase(som, C(17));
    expect(c.dueAt).toBe('2026-12-01T16:30:00+07:00');
    expect(c.slaLevel).toBe('near');
    const reg1 = await eg.staff('off.reg1');
    expect((await getCase(reg1, C(17))).owner).toBe('off.reg1');
  });

  test('TC-SLA-02 ส่วน 3 · seed …000017 ส่งแก้ 4 ธ.ค. 10:00 → หยุดนับ 5 วัน', async ({ eg }) => {
    await eg.reset();
    await eg.clock('2026-12-04T10:00:00+07:00');
    const som = await eg.citizen(ID.SOMCHAI);
    const j = await okJson(await resubmitApi(som, C(17)));
    expect(j.status).toBe('IN_REVIEW');
    const c = await getCase(som, C(17));
    expect(c.dueAt).toBe('2026-12-04T16:30:00+07:00');
    expect(c.slaLevel).toBe('near');
    const { page } = await eg.page(som, `/citizen/cases/${C(17)}`);
    await expectSlaLevel(page, 'near');
  });

  test('TC-SLA-02 ส่วน 4 · ตีกลับและส่งแก้วันเดียวกัน → ไม่หยุดนับ', async ({ eg }) => {
    await eg.reset();
    const { caseNo } = await eg.newPaid({ at: '2026-12-01T09:00:00+07:00' });
    await eg.clock('2026-12-02T09:00:00+07:00');
    const reg1 = await eg.staff('off.reg1');
    await okJson(await claimApi(reg1, caseNo));
    await okJson(await returnApi(reg1, caseNo, X10));
    await eg.clock('2026-12-02T15:00:00+07:00');
    const som = await eg.citizen(ID.SOMCHAI);
    await okJson(await resubmitApi(som, caseNo));
    expect((await getCase(som, caseNo)).dueAt).toBe('2026-12-04T16:30:00+07:00');
  });

  test('TC-SLA-02 ส่วน 5 · คร่อมสุดสัปดาห์/วันหยุด ส่งแก้หลัง 16:30', async ({ eg }) => {
    await eg.reset();
    const { caseNo } = await eg.newPaid({ at: '2026-12-01T09:00:00+07:00' });
    await eg.clock('2026-12-04T10:00:00+07:00');
    const reg1 = await eg.staff('off.reg1');
    await okJson(await claimApi(reg1, caseNo));
    await okJson(await returnApi(reg1, caseNo, X10));
    await eg.clock('2026-12-08T17:00:00+07:00');
    const som = await eg.citizen(ID.SOMCHAI);
    await okJson(await resubmitApi(som, caseNo));
    const c = await getCase(som, caseNo);
    expect(c.dueAt).toBe('2026-12-08T16:30:00+07:00');
    expect(c.slaLevel).toBe('overdue');
    const { page } = await eg.page(som, `/citizen/cases/${caseNo}`);
    await expectSlaLevel(page, 'overdue');
  });

  test('TC-SLA-03 ส่วน A · คำขอใหม่ กำหนด ศ. 4 ธ.ค. 16:30', async ({ eg }) => {
    await eg.reset();
    const { caseNo } = await eg.newPaid({ at: '2026-12-01T09:00:00+07:00' });
    expect(caseNo).toBe(C(31));
    const rows = [
      ['2026-12-01T09:00:00+07:00', 'normal'],
      ['2026-12-02T09:00:00+07:00', 'normal'],
      ['2026-12-03T09:00:00+07:00', 'near'],
      ['2026-12-04T16:30:00+07:00', 'near'],
      ['2026-12-04T16:30:01+07:00', 'overdue'],
      ['2026-12-04T16:31:00+07:00', 'overdue'],
      ['2026-12-05T10:00:00+07:00', 'overdue'],
    ];
    for (const [at, level] of rows) {
      await test.step(`${at} → ${level}`, async () => {
        await eg.clock(at);
        const som = await eg.citizen(ID.SOMCHAI);
        expect((await getCase(som, caseNo)).slaLevel).toBe(level);
        const { page } = await eg.page(som, `/citizen/cases/${caseNo}`);
        await expectSlaLevel(page, level);
        await page.close();
      });
    }
  });

  test('TC-SLA-03 ส่วน B · seed …000016 กำหนด อ. 8 ธ.ค. (คั่นวันหยุด)', async ({ eg }) => {
    await eg.reset();
    const rows = [
      ['2026-12-03T09:00:00+07:00', 'normal'],
      ['2026-12-04T09:00:00+07:00', 'near'],
      ['2026-12-08T16:30:00+07:00', 'near'],
      ['2026-12-08T16:31:00+07:00', 'overdue'],
    ];
    for (const [at, level] of rows) {
      await test.step(`${at} → ${level}`, async () => {
        await eg.clock(at);
        const reg2 = await eg.staff('off.reg2');
        expect((await getCase(reg2, C(16))).slaLevel).toBe(level);
        const { page } = await eg.page(reg2, `/officer/cases/${C(16)}`);
        await expectSlaLevel(page, level);
        await page.close();
      });
    }
  });

  test('TC-SLA-03 ส่วน C · ระดับของ seed ที่ 09:00 และขอบ 16:30/16:31', async ({ eg }) => {
    await eg.reset();
    const reg1 = await eg.staff('off.reg1');
    const { page: q } = await eg.page(reg1, '/officer/queue');
    const expectRow = async (n, level) => {
      const row = q.locator(rowSel('queue-row', C(n)));
      await expect(row).toHaveAttribute('data-sla-level', level, T);
      await expectLevel(row.getByTestId('row-sla-level'), level);
    };
    await expectRow(20, 'overdue');
    await expectRow(22, 'near');
    await expectRow(24, 'near');
    await expectRow(25, 'normal');

    for (const [n, level] of [[20, 'overdue'], [22, 'near'], [24, 'near'], [25, 'normal']]) {
      const { page } = await eg.page(reg1, `/officer/cases/${C(n)}`);
      await expectSlaLevel(page, level);
      await page.close();
    }
    const som = await eg.citizen(ID.SOMCHAI);
    const p17 = (await eg.page(som, `/citizen/cases/${C(17)}`)).page;
    await expectSlaLevel(p17, 'paused');
    const somying = await eg.citizen(ID.SOMYING);
    const p1 = (await eg.page(somying, `/citizen/cases/${C(1)}`)).page;
    await expectSlaLevel(p1, 'closed');

    await eg.clock('2026-12-01T16:30:00+07:00');
    const r1 = await eg.staff('off.reg1');
    expect((await getCase(r1, C(22))).slaLevel).toBe('near');
    const pa = (await eg.page(r1, `/officer/cases/${C(22)}`)).page;
    await expectSlaLevel(pa, 'near');

    await eg.clock('2026-12-01T16:31:00+07:00');
    const r2 = await eg.staff('off.reg1');
    expect((await getCase(r2, C(22))).slaLevel).toBe('overdue');
    const pb = (await eg.page(r2, `/officer/cases/${C(22)}`)).page;
    await expectSlaLevel(pb, 'overdue');
  });
});

// =====================================================================
// หมวด NOTI
// =====================================================================
const k = (n, level) => `${C(n)}:${level}`;

/** TC-NOTI-01 ทั้งชุด (ใช้ซ้ำใน TC-NOTI-02 ส่วน A) → คืน context ของ off.reg1 / head1 */
async function runNoti01(eg) {
  await eg.reset();
  // request แรกหลัง reset = LOGIN_S off.reg1 ที่ 09:00
  const reg1 = await eg.staff('off.reg1');
  await expectNotis(eg, 'off.reg1', [k(24, 'near'), k(22, 'near'), k(20, 'overdue')], reg1);
  await expectNotis(eg, 'off.reg2', [k(24, 'near')]);
  const head = await expectNotis(eg, 'head1', [k(20, 'overdue')]);
  await expectNotis(eg, 'off.works1', []);

  await eg.clock('2026-12-01T16:31:00+07:00');
  await okJson(await reg1.request.get('/api/me')); // request ใด ๆ
  await expectNotis(eg, 'off.reg1', [k(24, 'near'), k(22, 'near'), k(20, 'overdue'), k(22, 'overdue')], reg1);
  await expectNotis(eg, 'head1', [k(20, 'overdue'), k(22, 'overdue')], head);
  await expectNotis(eg, 'off.reg2', [k(24, 'near')]);
  return { reg1, head };
}

test.describe('NOTI', () => {
  test('TC-NOTI-01 · ผู้รับแจ้งเตือนตามระดับ', async ({ eg }) => {
    await runNoti01(eg);
  });

  test('TC-NOTI-02 ส่วน A · ไม่แจ้งซ้ำ', async ({ eg }) => {
    const { reg1, head } = await runNoti01(eg);
    const reg1Exp = [k(24, 'near'), k(22, 'near'), k(20, 'overdue'), k(22, 'overdue')].sort();
    const headExp = [k(20, 'overdue'), k(22, 'overdue')].sort();
    for (const ctx of [reg1, head]) {
      for (let i = 0; i < 3; i++) {
        const p = await ctx.newPage();
        await p.goto('/notifications');
        await expect(p.getByTestId('noti-item').first()).toBeVisible(T);
        await p.close();
        await notisApi(ctx);
      }
      for (let i = 0; i < 2; i++) {
        const p = await ctx.newPage();
        await p.goto('/officer/queue');
        await expect(p.getByTestId('queue-table')).toBeVisible(T);
        await p.close();
      }
    }
    expect(await notisApi(reg1)).toEqual(reg1Exp);
    expect(await notisApi(head)).toEqual(headExp);
    await expectNotis(eg, 'off.reg1', reg1Exp, reg1);
    await expectNotis(eg, 'head1', headExp, head);
  });

  test('TC-NOTI-02 ส่วน B · ข้ามระดับ (request แรกที่ ส. 5 ธ.ค. 10:00)', async ({ eg }) => {
    await eg.reset();
    await eg.clock('2026-12-05T10:00:00+07:00');
    const reg1 = await eg.staff('off.reg1');
    const od = (...ns) => ns.map((n) => k(n, 'overdue'));
    await expectNotis(eg, 'off.reg1', od(20, 22, 23, 24, 28, 29, 30), reg1);
    await expectNotis(eg, 'off.reg2', od(13, 15, 24, 25, 26, 27, 28, 29, 30).concat(k(16, 'near')));
    await expectNotis(eg, 'off.works1', od(10));
    await expectNotis(
      eg,
      'head1',
      od(10, 13, 14, 15, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30).concat(k(11, 'near')),
    );
  });

  test('TC-NOTI-02 ส่วน C · ขั้นรออนุมัติและรอออกเอกสาร', async ({ eg }) => {
    await eg.reset();
    const of = (list, n) => list.filter((x) => x.startsWith(C(n) + ':'));

    await eg.clock('2026-12-04T09:00:00+07:00');
    let head = await eg.staff('head1');
    expect(of(await notisApi(head), 14)).toEqual([k(14, 'near')]);
    expect(of(await notisApi(await eg.staff('off.reg1')), 14)).toEqual([]);
    expect(of(await notisApi(await eg.staff('off.reg2')), 14)).toEqual([]);

    // 1
    await eg.clock('2026-12-04T16:31:00+07:00');
    head = await eg.staff('head1');
    expect(of(await notisApi(head), 14)).toEqual([k(14, 'near'), k(14, 'overdue')]);
    expect(of(await notisApi(await eg.staff('off.reg1')), 14)).toEqual([]);
    expect(of(await notisApi(await eg.staff('off.reg2')), 14)).toEqual([]);

    // 2
    await eg.clock('2026-12-08T09:00:00+07:00');
    const reg1 = await eg.staff('off.reg1');
    expect(of(await notisApi(reg1), 19)).toEqual([k(19, 'near')]);
    expect(of(await notisApi(await eg.staff('off.reg2')), 19)).toEqual([]);
    expect(of(await notisApi(await eg.staff('head1')), 19)).toEqual([]);

    // 3
    await eg.clock('2026-12-09T16:31:00+07:00');
    const reg1b = await eg.staff('off.reg1');
    expect(of(await notisApi(reg1b), 19)).toEqual([k(19, 'near'), k(19, 'overdue')]);
    expect(of(await notisApi(await eg.staff('head1')), 19)).toEqual([k(19, 'overdue')]);
    const p = (await eg.page(reg1b, '/notifications')).page;
    await expect(p.locator(`[data-testid="noti-item"][data-case-no="${C(19)}"]`)).toHaveCount(2, T);
  });
});

// =====================================================================
// หมวด WORKFLOW
// =====================================================================
test.describe('WORKFLOW', () => {
  test('TC-WORKFLOW-01 · SV-01 อนุมัติ + ออกเอกสาร', async ({ eg }) => {
    await eg.reset();
    const reg2 = await eg.staff('off.reg2');
    const { page } = await eg.page(reg2, `/officer/cases/${C(25)}`);

    // 1
    await expectStatus(page, 'IN_REVIEW');
    await expect(page.getByTestId('approve-btn')).toHaveCount(1);
    await expect(page.getByTestId('return-btn')).toHaveCount(1);
    await expect(page.getByTestId('reject-btn')).toHaveCount(1);
    await expect(page.getByTestId('forward-btn')).toHaveCount(0);
    await expect(page.getByTestId('issue-btn')).toHaveCount(0);
    await expect(page.getByTestId('case-fee')).toHaveText('฿60');

    // 2
    const reg1 = await eg.staff('off.reg1');
    await expectErr(await approveApi(reg1, C(26)), 403, 'FORBIDDEN');

    // 3
    await page.getByTestId('approve-btn').click();
    await expectStatus(page, 'APPROVED');
    await expect(page.getByTestId('issue-btn')).toHaveCount(1, T);
    await expect(page.getByTestId('approve-btn')).toHaveCount(0);

    // 4
    await page.getByTestId('issue-btn').click();
    await expectStatus(page, 'COMPLETED');
    await expect(page.getByTestId('doc-no')).toHaveText('DOC-2569-000002', T);
    await expect(page.getByTestId('verify-code')).toHaveText(/^\s*[A-Z0-9]{8}\s*$/);
    await expect(page.getByTestId('closed-at')).toHaveAttribute('data-iso', '2026-12-01T09:00:00+07:00');
    await expectSlaLevel(page, 'closed');

    // 5
    const somying = await eg.citizen(ID.SOMYING);
    const sp = (await eg.page(somying, `/citizen/cases/${C(25)}`)).page;
    await expectStatus(sp, 'COMPLETED');
    await expect(sp.getByTestId('download-doc-btn')).toHaveCount(1);
    const pdfResp = await somying.request.get('/api/documents/DOC-2569-000002/pdf');
    expect(pdfResp.status()).toBe(200);
    expect(pdfResp.headers()['content-type']).toContain('application/pdf');
    expect(pdfResp.headers()['content-disposition']).toContain('DOC-2569-000002.pdf');
    expect((await pdfResp.body()).toString('latin1')).toContain('docNo=DOC-2569-000002 caseNo=EG-2569-000025');

    // 6
    const exec = await eg.staff('exec1');
    const d = await dashboardApi(exec);
    expect(d.closed).toBe(1);
    expect(d.onTime).toBe(1);
    expect(d.received).toBe(3);
    expect(d.backlog).toBe(20);
  });

  test('TC-WORKFLOW-02 · SV-02 ผ่านหัวหน้า', async ({ eg }) => {
    await eg.reset();
    const reg2 = await eg.staff('off.reg2');
    const { page } = await eg.page(reg2, `/officer/cases/${C(13)}`);

    // 1
    await expectStatus(page, 'IN_REVIEW');
    await expect(page.getByTestId('approve-btn')).toHaveCount(0);
    await expect(page.getByTestId('forward-btn')).toHaveCount(1);
    await expect(page.getByTestId('forward-target')).toHaveCount(0);

    // 2
    await page.getByTestId('forward-btn').click();
    await expectStatus(page, 'PENDING_APPROVAL');
    const q = (await eg.page(reg2, '/officer/queue')).page;
    await expect(q.getByTestId('workload-count')).toHaveText('8', T);
    await expect(q.getByTestId('queue-row')).toHaveCount(16, T);
    await expect(q.locator(rowSel('queue-row', C(13)))).toHaveCount(0);

    // 3
    const head = await eg.staff('head1');
    const hp = (await eg.page(head, '/head/approvals')).page;
    await expectRows(hp, 'approval-row', nums(13, 14, 11));

    // 4
    await hp.locator(rowSel('approval-row', C(13))).getByTestId('approval-open').click();
    await expect(hp).toHaveURL(new RegExp(`/officer/cases/${C(13)}$`), T);
    await expect(hp.getByTestId('approve-btn')).toHaveCount(1, T);
    await expect(hp.getByTestId('reject-btn')).toHaveCount(1);
    await expect(hp.getByTestId('issue-btn')).toHaveCount(0);

    // 5
    await hp.getByTestId('approve-btn').click();
    await expectStatus(hp, 'APPROVED');
    await expect(hp.getByTestId('issue-btn')).toHaveCount(0);

    // 6
    const reg1 = await eg.staff('off.reg1');
    const r1p = (await eg.page(reg1, `/officer/cases/${C(13)}`)).page;
    await expectStatus(r1p, 'APPROVED');
    await expect(r1p.getByTestId('issue-btn')).toHaveCount(0);
    await expectErr(await issueApi(reg1, C(13)), 403, 'FORBIDDEN');

    // 7
    await page.reload();
    await page.getByTestId('issue-btn').click();
    await expectStatus(page, 'COMPLETED');
    await expect(page.getByTestId('doc-no')).toHaveText('DOC-2569-000002', T);
    const code = (await page.getByTestId('verify-code').innerText()).trim();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
    const v = (await openVerify(eg, code)).page;
    await expect(v.getByTestId('verify-signer')).toHaveText('หัวหน้าฝ่าย', T);

    // 8 RESET · seed …000019
    await eg.reset();
    const r1 = await eg.staff('off.reg1');
    const p19 = (await eg.page(r1, `/officer/cases/${C(19)}`)).page;
    await p19.getByTestId('issue-btn').click();
    await expectStatus(p19, 'COMPLETED');
    await expect(p19.getByTestId('doc-no')).toHaveText('DOC-2569-000002', T);
    const code2 = (await p19.getByTestId('verify-code').innerText()).trim();
    const v2 = (await openVerify(eg, code2)).page;
    await expect(v2.getByTestId('verify-signer')).toHaveText('หัวหน้าฝ่าย', T);
  });

  test('TC-WORKFLOW-03 · SV-03 สามขั้นตอน', async ({ eg }) => {
    await eg.reset();
    const reg2 = await eg.staff('off.reg2');
    const { page } = await eg.page(reg2, `/officer/cases/${C(12)}`);

    // 1
    await expect(page.getByTestId('case-step')).toHaveText('ขั้นตอน 1/3 · ฝ่ายทะเบียน', T);
    await expect(page.getByTestId('case-fee')).toHaveText('฿1,010');
    await expect(page.getByTestId('forward-btn')).toHaveCount(1);

    // 2
    await page.getByTestId('forward-btn').click();
    await expect(page.getByTestId('case-step')).toHaveText('ขั้นตอน 2/3 · ฝ่ายโยธา', T);
    await expectStatus(page, 'IN_REVIEW');
    await expect(page.getByTestId('case-owner')).toHaveText('ยังไม่มีผู้รับ', T);

    // 3
    const q = (await eg.page(reg2, '/officer/queue')).page;
    await expect(q.getByTestId('workload-count')).toHaveText('8', T);
    await expectRows(q, 'queue-row', REG_QUEUE.filter((c) => c !== C(12)));

    // 4
    const works = await eg.staff('off.works1');
    const wq = (await eg.page(works, '/officer/queue')).page;
    await expectRows(wq, 'queue-row', nums(10, 12));
    await expect(wq.getByTestId('claim-btn')).toHaveCount(2);

    // 5
    const reg1 = await eg.staff('off.reg1');
    await expectErr(await claimApi(reg1, C(12)), 403, 'FORBIDDEN');

    // 6
    const wp = (await eg.page(works, `/officer/cases/${C(12)}`)).page;
    await wp.getByTestId('claim-btn').click();
    await expect(wp.getByTestId('case-owner')).toHaveText('off.works1', T);
    await wp.getByTestId('forward-btn').click();
    await expectStatus(wp, 'PENDING_APPROVAL');
    await expect(wp.getByTestId('case-step')).toHaveText('ขั้นตอน 3/3 · หัวหน้าฝ่าย', T);

    // 7
    const head = await eg.staff('head1');
    const hp = (await eg.page(head, '/head/approvals')).page;
    await expect(hp.getByTestId('approval-row')).toHaveCount(3, T);
    await expect(hp.locator(rowSel('approval-row', C(12)))).toHaveCount(1);
    await hp.locator(rowSel('approval-row', C(12))).getByTestId('approval-open').click();
    await expect(hp).toHaveURL(new RegExp(`/officer/cases/${C(12)}$`), T);
    await hp.getByTestId('approve-btn').click();
    await expectStatus(hp, 'APPROVED');

    // 8
    await wp.reload();
    await expectStatus(wp, 'APPROVED');
    await expect(wp.getByTestId('issue-btn')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('issue-btn')).toHaveCount(1, T);
    await page.getByTestId('issue-btn').click();
    await expectStatus(page, 'COMPLETED');
    const code = (await page.getByTestId('verify-code').innerText()).trim();
    const v = (await openVerify(eg, code)).page;
    await expect(v.getByTestId('verify-signer')).toHaveText('หัวหน้าฝ่าย', T);
  });

  test('TC-WORKFLOW-04 ส่วน A · SV-01 ตีกลับครั้งที่ 3 ไม่ได้ (จับ B12)', async ({ eg }) => {
    await eg.reset();
    const reg1 = await eg.staff('off.reg1');
    const som = await eg.citizen(ID.SOMCHAI);
    const op = (await eg.page(reg1, `/officer/cases/${C(20)}`)).page;
    await expect(op.getByTestId('return-count')).toHaveText('0', T);

    for (const n of [1, 2]) {
      await op.reload();
      await uiReturn(op, X10);
      await expectStatus(op, 'NEED_FIX');
      await expect(op.getByTestId('return-count')).toHaveText(String(n), T);

      const sp = (await eg.page(som, `/citizen/cases/${C(20)}`)).page;
      await sp.getByTestId('submit-fix-btn').click();
      await expectStatus(sp, 'IN_REVIEW');
      await sp.close();
      expect((await getCase(reg1, C(20))).owner).toBe('off.reg1');
    }

    await op.reload();
    await expectStatus(op, 'IN_REVIEW');
    await expect(op.getByTestId('return-btn')).toHaveCount(0);
    await expectErr(await returnApi(reg1, C(20), X10), 409, 'RETURN_LIMIT', MSG.RETURN_LIMIT);
    const c = await getCase(reg1, C(20));
    expect(c.status).toBe('IN_REVIEW');
    expect(c.returnCount).toBe(2);
    await op.reload();
    await expect(op.getByTestId('return-count')).toHaveText('2', T);
    await expect(op.getByTestId('approve-btn')).toHaveCount(1);
    await expect(op.getByTestId('reject-btn')).toHaveCount(1);
  });

  test('TC-WORKFLOW-04 ส่วน B · seed …000023 ตีกลับครบแล้ว', async ({ eg }) => {
    await eg.reset();
    const reg1 = await eg.staff('off.reg1');
    const { page } = await eg.page(reg1, `/officer/cases/${C(23)}`);
    await expect(page.getByTestId('return-count')).toHaveText('2', T);
    await expect(page.getByTestId('return-btn')).toHaveCount(0);
    await expectErr(await returnApi(reg1, C(23), X10), 409, 'RETURN_LIMIT', MSG.RETURN_LIMIT);
    expect((await getCase(reg1, C(23))).status).toBe('IN_REVIEW');
    await page.reload();
    await expectStatus(page, 'IN_REVIEW');
    await expect(page.getByTestId('approve-btn')).toHaveCount(1);
    await expect(page.getByTestId('reject-btn')).toHaveCount(1);
  });

  test('TC-WORKFLOW-04 ส่วน C · SV-02 หลังตีกลับครบ 2 ครั้ง', async ({ eg }) => {
    await eg.reset();
    const reg2 = await eg.staff('off.reg2');
    const som = await eg.citizen(ID.SOMCHAI);
    for (let i = 0; i < 2; i++) {
      expect((await okJson(await returnApi(reg2, C(13), X10))).status).toBe('NEED_FIX');
      expect((await okJson(await resubmitApi(som, C(13)))).status).toBe('IN_REVIEW');
    }
    const { page } = await eg.page(reg2, `/officer/cases/${C(13)}`);
    await expectStatus(page, 'IN_REVIEW');
    await expect(page.getByTestId('forward-btn')).toHaveCount(1);
    await expect(page.getByTestId('return-btn')).toHaveCount(0);
    await expect(page.getByTestId('approve-btn')).toHaveCount(0);
    await expect(page.getByTestId('reject-btn')).toHaveCount(0);
    await expectErr(await rejectApi(reg2, C(13), X10), 403, 'FORBIDDEN');

    const note = 'ส่งต่อให้หัวหน้าพิจารณา';
    await page.getByTestId('forward-note').fill(note);
    await page.getByTestId('forward-btn').click();
    await expectStatus(page, 'PENDING_APPROVAL');

    const audit = await eg.staff('audit1');
    const a = await auditApi(audit, { event: 'FORWARD', from: '2026-12-01', to: '2026-12-01' });
    const fw = a.items.filter((i) => i.caseNo === C(13));
    expect(fw).toHaveLength(1);
    expect(fw[0].detail).toContain(note);
    const ap = (await eg.page(audit, '/audit')).page;
    const row = ap.locator(`[data-testid="audit-row"][data-event="FORWARD"][data-case-no="${C(13)}"]`);
    await expect(row.getByTestId('audit-detail')).toContainText(note, T);

    const head = await eg.staff('head1');
    const hp = (await eg.page(head, `/officer/cases/${C(13)}`)).page;
    await expect(hp.getByTestId('reject-btn')).toHaveCount(1, T);
    await expect(hp.getByTestId('approve-btn')).toHaveCount(1);
  });

  test('TC-WORKFLOW-05 ส่วน A · เหตุผลตีกลับ ≥ 10 ตัวอักษร', async ({ eg }) => {
    await eg.reset();
    const reg1 = await eg.staff('off.reg1');
    const { page } = await eg.page(reg1, `/officer/cases/${C(20)}`);

    for (const reason of [X9, ' '.repeat(10)]) {
      await test.step(`เหตุผล "${reason}"`, async () => {
        await expectErr(await returnApi(reg1, C(20), reason), 400, 'REASON_TOO_SHORT', MSG.REASON_TOO_SHORT);
        await page.reload();
        await uiReturn(page, reason);
        await expect(page.getByTestId('return-reason-error')).toHaveText(MSG.REASON_TOO_SHORT, T);
        await page.reload();
        await expectStatus(page, 'IN_REVIEW');
      });
    }

    await uiReturn(page, X10);
    await expectStatus(page, 'NEED_FIX');
    const som = await eg.citizen(ID.SOMCHAI);
    const sp = (await eg.page(som, `/citizen/cases/${C(20)}`)).page;
    await expect(sp.getByTestId('return-reason-display')).toHaveText(X10, T);
  });

  test('TC-WORKFLOW-05 ส่วน B · ไม่อนุมัติ SV-01 โดยผู้ถือเรื่อง', async ({ eg }) => {
    await eg.reset();
    const reg2 = await eg.staff('off.reg2');
    const { page } = await eg.page(reg2, `/officer/cases/${C(26)}`);

    await uiReject(page, X9);
    await expect(page.getByTestId('reject-reason-error')).toHaveText(MSG.REASON_TOO_SHORT, T);
    await expectErr(await rejectApi(reg2, C(26), X9), 400, 'REASON_TOO_SHORT', MSG.REASON_TOO_SHORT);
    expect((await getCase(reg2, C(26))).status).toBe('IN_REVIEW');

    await page.reload();
    await uiReject(page, X10);
    await expectStatus(page, 'REJECTED');
    await expect(page.getByTestId('closed-at')).toHaveAttribute('data-iso', '2026-12-01T09:00:00+07:00', T);
    await expectSlaLevel(page, 'closed');

    const som = await eg.citizen(ID.SOMCHAI);
    const sp = (await eg.page(som, `/citizen/cases/${C(26)}`)).page;
    await expect(sp.getByTestId('no-refund-note')).toHaveText(MSG.NO_REFUND, T);

    const exec = await eg.staff('exec1');
    const d = await dashboardApi(exec);
    expect(d.closed).toBe(1);
    expect(d.onTime).toBe(1);
  });

  test('TC-WORKFLOW-05 ส่วน C · หัวหน้าไม่อนุมัติ …000011', async ({ eg }) => {
    await eg.reset();
    const head = await eg.staff('head1');
    await expectErr(await rejectApi(head, C(11), X9), 400, 'REASON_TOO_SHORT', MSG.REASON_TOO_SHORT);
    const { page } = await eg.page(head, `/officer/cases/${C(11)}`);
    await uiReject(page, X9);
    await expect(page.getByTestId('reject-reason-error')).toHaveText(MSG.REASON_TOO_SHORT, T);
    await page.reload();
    await expectStatus(page, 'PENDING_APPROVAL');
    await uiReject(page, X10);
    await expectStatus(page, 'REJECTED');
    expect((await getCase(head, C(11))).status).toBe('REJECTED');
  });

  test('TC-WORKFLOW-06 ตั้งต้น · หน้า NEED_FIX ของ …000017', async ({ eg }) => {
    await eg.reset();
    const som = await eg.citizen(ID.SOMCHAI);
    const { page } = await eg.page(som, `/citizen/cases/${C(17)}`);
    await expectStatus(page, 'NEED_FIX');
    await expect(page.getByTestId('return-reason-display')).toHaveText('ชื่อในเอกสารไม่ตรงกับบัตร กรุณาแก้ไข', T);
    await expect(page.getByTestId('fix-deadline')).toHaveText('4 ธ.ค. 2569 14:00');
    await expect(page.getByTestId('fix-deadline')).toHaveAttribute('data-iso', '2026-12-04T14:00:00+07:00');
    await expect(page.getByTestId('submit-fix-btn')).toHaveCount(1);
  });

  test('TC-WORKFLOW-06 รอบ A · 167:59 ยังส่งแก้ได้', async ({ eg }) => {
    await eg.reset();
    await eg.clock('2026-12-04T13:59:00+07:00');
    const som = await eg.citizen(ID.SOMCHAI);
    const { page } = await eg.page(som, `/citizen/cases/${C(17)}`);
    const btn = page.getByTestId('submit-fix-btn');
    await expect(btn).toBeEnabled(T);
    await btn.click();
    await expectStatus(page, 'IN_REVIEW');
    expect((await getCase(som, C(17))).status).toBe('IN_REVIEW');
  });

  test('TC-WORKFLOW-06 รอบ B · 168:00 ถูกยกเลิกอัตโนมัติ', async ({ eg }) => {
    await eg.reset();
    await eg.clock('2026-12-04T14:00:00+07:00');
    const som = await eg.citizen(ID.SOMCHAI);
    const { page } = await eg.page(som, `/citizen/cases/${C(17)}`);
    await expectStatus(page, 'CANCELLED');
    await expect(page.getByTestId('submit-fix-btn')).toHaveCount(0);
    await expect(page.getByTestId('no-refund-note')).toHaveText(MSG.NO_REFUND);
    await expectErr(await resubmitApi(som, C(17)), 409);
    await expect(
      page.getByTestId('case-timeline').locator('[data-testid="timeline-item"][data-iso="2026-12-04T14:00:00+07:00"]'),
    ).not.toHaveCount(0);
    const exec = await eg.staff('exec1');
    expect((await dashboardApi(exec)).backlog).toBe(20);
  });
});

// =====================================================================
// หมวด DOC
// =====================================================================
async function approveAndIssue25(eg) {
  const reg2 = await eg.staff('off.reg2');
  expect((await okJson(await approveApi(reg2, C(25)))).status).toBe('APPROVED');
  const j = await okJson(await issueApi(reg2, C(25)));
  expect(j.status).toBe('COMPLETED');
  expect(j.verifyCode).toMatch(/^[A-Z0-9]{8}$/);
  return { reg2, ...j };
}

async function issue19(eg) {
  const reg1 = await eg.staff('off.reg1');
  const j = await okJson(await issueApi(reg1, C(19)));
  expect(j.status).toBe('COMPLETED');
  expect(j.verifyCode).toMatch(/^[A-Z0-9]{8}$/);
  return { reg1, ...j };
}

async function expectVerify(eg, code, result, expiresIso) {
  const TH = { VALID: 'เอกสารถูกต้อง', EXPIRED: 'เอกสารหมดอายุ', TAMPERED: 'ลายเซ็นไม่ถูกต้อง', NOT_FOUND: 'ไม่พบเอกสาร' };
  const { page, resp } = await openVerify(eg, code);
  expect(resp.status()).toBe(result === 'NOT_FOUND' ? 404 : 200);
  const r = page.getByTestId('verify-result');
  await expect(r).toHaveAttribute('data-result', result, T);
  await expect(r).toHaveText(TH[result]);
  if (expiresIso) await expect(page.getByTestId('verify-expires')).toHaveAttribute('data-iso', expiresIso);
  return page;
}

test.describe('DOC', () => {
  test('TC-DOC-01 · ออกเอกสารและข้อมูลในเอกสาร', async ({ eg }) => {
    await eg.reset();
    const { reg2, docNo, verifyCode } = await approveAndIssue25(eg);
    expect(docNo).toBe('DOC-2569-000002');

    // PDF ของผู้ยื่น
    const somying = await eg.citizen(ID.SOMYING);
    const r = await somying.request.get('/api/documents/DOC-2569-000002/pdf');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('application/pdf');
    expect(r.headers()['content-disposition']).toContain('DOC-2569-000002.pdf');
    expect((await r.body()).toString('latin1')).toContain(
      `docNo=DOC-2569-000002 caseNo=EG-2569-000025 verify=${verifyCode} validUntil=2027-02-28`,
    );

    // หน้า /verify
    const v = await expectVerify(eg, verifyCode, 'VALID', '2027-02-28');
    await expect(v.getByTestId('verify-doc-no')).toHaveText('DOC-2569-000002');
    await expect(v.getByTestId('verify-applicant')).toHaveText('สมหญิง ร***');
    await expect(v.getByTestId('verify-service')).toHaveText('SV-01 ขอหนังสือรับรอง');
    await expect(v.getByTestId('verify-issued')).toHaveAttribute('data-iso', '2026-12-01T09:00:00+07:00');
    await expect(v.getByTestId('verify-expires')).toContainText('28 ก.พ. 2570');
    await expect(v.getByTestId('verify-signer')).toHaveText('เจ้าหน้าที่ทะเบียน 2');

    // doc-qr บนหน้าเคส
    const cp = (await eg.page(reg2, `/officer/cases/${C(25)}`)).page;
    await expect(cp.getByTestId('doc-qr')).toHaveAttribute('data-url', `${eg.base}/verify/${verifyCode}`, T);

    // API verify
    const anon = await eg.anon();
    const vj = await okJson(await anon.request.get(`/api/verify/${verifyCode}`));
    expect(vj.result).toBe('VALID');
    expect(vj.validUntil).toBe('2027-02-28');
    expect(vj.issuedAt).toBe('2026-12-01T09:00:00+07:00');

    // คนอื่นดาวน์โหลดไม่ได้
    const som = await eg.citizen(ID.SOMCHAI);
    expect((await som.request.get('/api/documents/DOC-2569-000002/pdf')).status()).toBe(404);

    // ออกซ้ำไม่ได้ · เลขถัดไปยังเป็น 000003
    await expectErr(await issueApi(reg2, C(25)), 409, 'INVALID_STATE');
    const next = await issue19(eg);
    expect(next.docNo).toBe('DOC-2569-000003');
  });

  test('TC-DOC-02 · ตรวจเอกสาร /verify (ไม่ล็อกอิน)', async ({ eg }) => {
    await eg.reset();
    const { page, resp } = await openVerify(eg, 'K7M2Q9XA');
    expect(resp.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/verify/K7M2Q9XA');
    const r = page.getByTestId('verify-result');
    await expect(r).toHaveText('เอกสารถูกต้อง', T);
    await expect(r).toHaveAttribute('data-result', 'VALID');
    await expect(page.getByTestId('verify-doc-no')).toHaveText('DOC-2569-000001');
    await expect(page.getByTestId('verify-applicant')).toHaveText('สมชาย ใ***');
    await expect(page.getByTestId('verify-service')).toHaveText('SV-01 ขอหนังสือรับรอง');
    await expect(page.getByTestId('verify-issued')).toHaveAttribute('data-iso', '2026-11-05T10:00:00+07:00');
    await expect(page.getByTestId('verify-expires')).toHaveAttribute('data-iso', '2027-02-02');
    await expect(page.getByTestId('verify-expires')).toContainText('2 ก.พ. 2570');
    await expect(page.getByTestId('verify-signer')).toHaveText('เจ้าหน้าที่ทะเบียน 1');
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('ใจดี');
    expect(body).not.toContain('1101700123456');
    expect(await page.content()).not.toContain('1101700123456');

    const nf = await openVerify(eg, 'ZZZZZZZZ');
    expect(nf.resp.status()).toBe(404);
    await expect(nf.page.getByTestId('verify-result')).toHaveText('ไม่พบเอกสาร', T);
    await expect(nf.page.getByTestId('verify-result')).toHaveAttribute('data-result', 'NOT_FOUND');
    await expect(nf.page.getByTestId('verify-applicant')).toHaveCount(0);
    await expect(nf.page.getByTestId('verify-doc-no')).toHaveCount(0);

    const anon = await eg.anon();
    const ok = await okJson(await anon.request.get('/api/verify/K7M2Q9XA'));
    expect(ok.result).toBe('VALID');
    expect(ok.applicantMasked).toBe('สมชาย ใ***');
    expect(JSON.stringify(ok)).not.toContain('ใจดี');
    const r404 = await anon.request.get('/api/verify/ZZZZZZZZ');
    expect(r404.status()).toBe(404);
    expect((await r404.json()).result).toBe('NOT_FOUND');
  });

  test('TC-DOC-03 ส่วน A · SV-01 อายุ 90 วัน (ถึง 28 ก.พ. 2570)', async ({ eg }) => {
    await eg.reset();
    const { verifyCode: c1 } = await approveAndIssue25(eg);
    await eg.clock('2027-02-28T23:59:00+07:00');
    await expectVerify(eg, c1, 'VALID', '2027-02-28');
    await eg.clock('2027-03-01T00:00:00+07:00');
    await expectVerify(eg, c1, 'EXPIRED', '2027-02-28');
  });

  test('TC-DOC-03 ส่วน B · SV-02 อายุ 1 ปี (ถึง 30 พ.ย. 2570)', async ({ eg }) => {
    await eg.reset();
    const { verifyCode: c2 } = await issue19(eg);
    await eg.clock('2027-11-30T23:59:00+07:00');
    await expectVerify(eg, c2, 'VALID', '2027-11-30');
    await eg.clock('2027-12-01T00:00:00+07:00');
    await expectVerify(eg, c2, 'EXPIRED');
  });

  test('TC-DOC-03 ส่วน C · seed K7M2Q9XA ใช้ได้ถึง 2 ก.พ. 2570', async ({ eg }) => {
    await eg.reset();
    await eg.clock('2027-02-02T23:59:00+07:00');
    await expectVerify(eg, 'K7M2Q9XA', 'VALID', '2027-02-02');
    await eg.clock('2027-02-03T00:00:00+07:00');
    await expectVerify(eg, 'K7M2Q9XA', 'EXPIRED', '2027-02-02');
  });

  test('TC-DOC-03 ส่วน D · ลายเซ็นไม่ตรง (tamper)', async ({ eg }) => {
    await eg.reset();
    const api = await eg.anon();
    const t = await okJson(await api.request.post('/api/test/documents/DOC-2569-000001/tamper'));
    expect(t.ok).toBe(true);
    let p = await expectVerify(eg, 'K7M2Q9XA', 'TAMPERED');
    await expect(p.getByTestId('verify-doc-no')).toHaveCount(0);
    await expect(p.getByTestId('verify-applicant')).toHaveCount(0);
    await eg.clock('2027-03-01T00:00:00+07:00');
    p = await expectVerify(eg, 'K7M2Q9XA', 'TAMPERED');
    await expect(p.getByTestId('verify-doc-no')).toHaveCount(0);
    await expect(p.getByTestId('verify-applicant')).toHaveCount(0);
  });

  test('TC-DOC-03 ส่วน E · ออกเอกสารวันที่ 29 ก.พ. 2571', async ({ eg }) => {
    await eg.reset();
    await eg.clock('2028-02-29T10:00:00+07:00');
    const a = await approveAndIssue25(eg);
    expect(a.docNo).toBe('DOC-2571-000001');
    const b = await issue19(eg);
    expect(b.docNo).toBe('DOC-2571-000002');

    await expectVerify(eg, a.verifyCode, 'VALID', '2028-05-28');
    await expectVerify(eg, b.verifyCode, 'VALID', '2029-02-27');

    await eg.clock('2028-05-28T23:59:00+07:00');
    await expectVerify(eg, a.verifyCode, 'VALID', '2028-05-28');
    await eg.clock('2028-05-29T00:00:00+07:00');
    await expectVerify(eg, a.verifyCode, 'EXPIRED', '2028-05-28');

    await eg.clock('2029-02-27T23:59:00+07:00');
    await expectVerify(eg, b.verifyCode, 'VALID', '2029-02-27');
    await eg.clock('2029-02-28T00:00:00+07:00');
    await expectVerify(eg, b.verifyCode, 'EXPIRED', '2029-02-27');
  });
});

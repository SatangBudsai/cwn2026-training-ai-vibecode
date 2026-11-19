// TC-RBAC-01..06 (TEST-PLAN section 15). Black-box: CONTRACT testids / API only.
const { test, expect } = require('@playwright/test');
const c = require('../lib/c');

const NF = { code: 'NOT_FOUND', message: 'ไม่พบคำขอ' };

test('TC-RBAC-01 ประชาชนเปิดคำขอคนอื่นไม่ได้ (IDOR) @P1', async ({ page }) => {
  await c.reset();
  await c.freshCitizen(page, c.ID.somying);
  const res = await page.goto('/citizen/cases/EG-2569-000005');
  expect(res.status()).toBe(404);
  await expect(page.getByTestId('not-found-msg')).toHaveText('ไม่พบคำขอ');
  await expect(page.getByTestId('case-no')).toHaveCount(0);
  await expect(page.getByTestId('case-status')).toHaveCount(0);
  expect(await page.content()).not.toContain('สมชาย');

  const api = page.request;
  const other = await c.call(api, 'GET', '/api/cases/EG-2569-000005');
  expect(other.status).toBe(404);
  expect(other.json).toEqual(NF);
  const none = await c.call(api, 'GET', '/api/cases/EG-2569-999999');
  expect(none.status).toBe(404);
  expect(none.text).toBe(other.text);
  expect((await c.call(api, 'GET', '/api/documents/DOC-2569-000001/pdf')).status).toBe(404);
  expect((await c.call(api, 'GET', '/api/drafts/DR-0001')).status).toBe(404);
  expect((await c.call(api, 'POST', '/api/cases/EG-2569-000030/cancel')).status).toBe(404);

  const own = await page.goto('/citizen/cases/EG-2569-000007');
  expect(own.status()).toBe(200);
  await expect(page.getByTestId('case-no')).toHaveText('EG-2569-000007');

  const somchai = await c.apiCitizen(c.ID.somchai);
  expect((await c.call(somchai, 'GET', '/api/cases/EG-2569-000005')).status).toBe(200);
});

test('TC-RBAC-02 เจ้าหน้าที่อนุมัติ SV-02 ไม่ได้ (ตรวจที่ API) @P1', async ({ page }) => {
  await c.reset();
  const reg2 = await c.apiStaff('off.reg2');
  const status = async (ctx, no) => (await c.call(ctx, 'GET', `/api/cases/${no}`)).json.status;
  let r = await c.call(reg2, 'POST', '/api/cases/EG-2569-000014/approve');
  expect(r.status).toBe(403); expect(r.json.code).toBe('FORBIDDEN');
  expect(await status(reg2, 'EG-2569-000014')).toBe('PENDING_APPROVAL');
  r = await c.call(reg2, 'POST', '/api/cases/EG-2569-000013/approve');
  expect(r.status).toBe(403);
  expect(await status(reg2, 'EG-2569-000013')).toBe('IN_REVIEW');
  r = await c.call(reg2, 'POST', '/api/cases/EG-2569-000014/reject', { reason: 'xxxxxxxxxx' });
  expect(r.status).toBe(403);
  expect(await status(reg2, 'EG-2569-000014')).toBe('PENDING_APPROVAL');

  await c.freshStaff(page, 'off.reg2');
  for (const no of ['EG-2569-000013', 'EG-2569-000014']) {
    await page.goto(`/officer/cases/${no}`);
    await expect(page.getByTestId('case-no')).toHaveText(no);
    await expect(page.getByTestId('approve-btn')).toHaveCount(0);
  }

  const head = await c.apiStaff('head1');
  r = await c.call(head, 'POST', '/api/cases/EG-2569-000025/approve');
  expect(r.status).toBe(403);
  r = await c.call(head, 'POST', '/api/cases/EG-2569-000014/approve');
  expect(r.status).toBe(200); expect(r.json.status).toBe('APPROVED');

  await c.freshStaff(page, 'audit1');
  await page.goto('/audit');
  await page.getByTestId('audit-filter-event').selectOption('APPROVE');
  await page.getByTestId('audit-apply-btn').click();
  await expect(page.getByTestId('audit-count')).toHaveText('1');
  await expect(page.getByTestId('audit-row')).toHaveAttribute('data-actor', 'head1');
});

const PAGES = [
  ['/citizen', ['citizen']],
  ['/officer/queue', ['officer', 'head']],
  ['/head/approvals', ['head']],
  ['/dashboard', ['executive']],
  ['/audit', ['auditor']],
  ['/admin/services', ['admin']],
  ['/admin/holidays', ['admin']],
  ['/admin/users', ['admin']],
  ['/notifications', ['officer', 'head']],
  ['/verify/K7M2Q9XA', ['anon', 'citizen', 'officer', 'head', 'executive', 'auditor', 'admin']],
];
// [label, method, url, body, {anon,citizen,officer,head,executive,auditor,admin}]
const APIS = [
  ['GET /api/officer/queue', 'GET', '/api/officer/queue', undefined, [401, 403, 200, 200, 403, 403, 403]],
  ['GET /api/notifications', 'GET', '/api/notifications', undefined, [401, 403, 200, 200, 403, 403, 403]],
  ['GET /api/dashboard', 'GET', '/api/dashboard?period=2026-12&service=ALL', undefined, [401, 403, 403, 403, 200, 403, 403]],
  ['GET /api/audit', 'GET', '/api/audit', undefined, [401, 403, 403, 403, 403, 200, 403]],
  ['GET /api/admin/services', 'GET', '/api/admin/services', undefined, [401, 403, 403, 403, 403, 403, 200]],
  ['POST /api/drafts', 'POST', '/api/drafts', { serviceId: 'SV-01', qty: 1 }, [401, 201, 403, 403, 403, 403, 403]],
  ['GET /api/cases/25', 'GET', '/api/cases/EG-2569-000025', undefined, [401, 200, 200, 200, 403, 403, 403]],
  ['POST claim 28', 'POST', '/api/officer/cases/EG-2569-000028/claim', undefined, [401, 403, 200, 403, 403, 403, 403]],
];
const ROLES = ['anon', 'citizen', 'officer', 'head', 'executive', 'auditor', 'admin'];
const NAV_EXPECT = {
  citizen: ['nav-my-cases'], officer: ['nav-queue', 'nav-bell'], head: ['nav-queue', 'nav-approvals', 'nav-bell'],
  executive: ['nav-dashboard'], auditor: ['nav-audit'], admin: ['nav-admin-services', 'nav-admin-holidays', 'nav-admin-users'],
};

test('TC-RBAC-03 ตารางสิทธิ์หน้า/API ตามบทบาท @P1', async ({ page }) => {
  test.setTimeout(240000);
  for (let ri = 0; ri < ROLES.length; ri++) {
    const role = ROLES[ri];
    await c.reset();
    await page.context().clearCookies();
    let apiCtx; // context used for the API matrix
    if (role === 'citizen') await c.freshCitizen(page, c.ID.somchai);
    else if (role === 'anon') { /* no login */ }
    else await c.freshStaff(page, { officer: 'off.reg1', head: 'head1', executive: 'exec1', auditor: 'audit1', admin: 'admin1' }[role]);

    // A pages
    for (const [path, allowed] of PAGES) {
      const lbl = `${role} ${path}`;
      const res = await page.goto(path);
      if (allowed.includes(role)) {
        expect(res.status(), lbl).toBe(200);
        expect(new URL(page.url()).pathname, lbl).toBe(path);
      } else if (role === 'anon') {
        expect(new URL(page.url()).pathname, lbl).toBe('/login');
      } else {
        expect(res.status(), lbl).toBe(403);
        await expect(page.getByTestId('forbidden-msg'), lbl).toHaveText('ไม่มีสิทธิ์เข้าถึงหน้านี้');
      }
    }
    // D menu (on the landing page)
    if (role !== 'anon') {
      const landing = { citizen: '/citizen', officer: '/officer/queue', head: '/head/approvals', executive: '/dashboard', auditor: '/audit', admin: '/admin/services' }[role];
      await page.goto(landing);
      await expect(page.getByTestId('app-header')).toBeVisible();
      for (const id of c.NAV_IDS) {
        await expect(page.getByTestId(id), `${role} ${id}`).toHaveCount(NAV_EXPECT[role].includes(id) ? 1 : 0);
      }
    }

    // B API (citizen uses somying as the plan says; others reuse the browser session cookies)
    if (role === 'citizen') apiCtx = await c.apiCitizen(c.ID.somying);
    else if (role === 'anon') apiCtx = await c.newApi();
    else apiCtx = page.request;
    for (const [label, m, u, b, expRow] of APIS) {
      const r = await c.call(apiCtx, m, u, b);
      expect(r.status, `${role} ${label}`).toBe(expRow[ri]);
    }
  }

  // C department scope
  await c.reset();
  const works = await c.apiStaff('off.works1');
  const reg1 = await c.apiStaff('off.reg1');
  expect((await c.call(works, 'POST', '/api/officer/cases/EG-2569-000028/claim')).status).toBe(403);
  expect((await c.call(reg1, 'POST', '/api/officer/cases/EG-2569-000010/claim')).status).toBe(403);
  const wq = await c.call(works, 'GET', '/api/officer/queue?filter=all');
  expect(wq.status).toBe(200);
  expect(wq.json.items.map((x) => x.caseNo)).toEqual(['EG-2569-000010']);
});

test('TC-RBAC-04 ผู้ดูแลระบบ: บริการ วันหยุด ผู้ใช้ และยอดที่ล็อก @P2', async ({ page, browser }) => {
  test.setTimeout(180000);
  await c.reset();
  await c.freshStaff(page, 'admin1');
  await page.goto('/admin/holidays');
  await expect(page.getByTestId('holiday-row')).toHaveCount(4);
  const dates = (await page.getByTestId('holiday-row').evaluateAll((r) => r.map((e) => e.getAttribute('data-date')))).sort();
  expect(dates).toEqual(['2026-12-07', '2026-12-10', '2026-12-31', '2027-01-01']);

  // 2 NEW_PAID before any change
  const som = await c.apiCitizen(c.ID.somchai);
  const p1 = await c.createPaidCase(som, { serviceId: 'SV-01', qty: 1 });
  expect(p1.caseNo).toBe('EG-2569-000031');
  let g = await c.call(som, 'GET', `/api/cases/${p1.caseNo}`);
  expect(g.json.dueAt).toBe('2026-12-04T16:30:00+07:00');

  // 3 change fees
  await page.goto('/admin/services');
  await page.getByTestId('svc-fee-SV-01').fill('25');
  await page.getByTestId('svc-save-SV-01').click();
  await expect(page.getByTestId('action-success')).toBeVisible();
  await page.getByTestId('svc-fee-SV-02').fill('600');
  await page.getByTestId('svc-save-SV-02').click();
  await expect(page.getByTestId('action-success')).toBeVisible();

  // 4 citizen sees new fees, old case keeps old fee
  const cctx = await browser.newContext();
  const cp = await cctx.newPage();
  await c.uiLoginCitizen(cp, c.ID.somchai);
  await cp.goto('/citizen/new/SV-01');
  await cp.getByTestId('qty-input').fill('5');
  await expect(cp.getByTestId('fee-total')).toHaveText('฿125');
  await cp.getByTestId('qty-input').fill('1');
  await expect(cp.getByTestId('fee-total')).toHaveText('฿25');
  await cp.goto('/citizen/new/SV-02');
  await expect(cp.getByTestId('fee-total')).toHaveText('฿600');
  await cp.goto('/citizen/cases/EG-2569-000030');
  await expect(cp.getByTestId('case-fee')).toHaveText('฿20');

  // 5 locked amount PP-0001
  await cp.goto('/citizen/new/SV-02?draft=DR-0002');
  await expect(cp.getByTestId('payment-amount')).toHaveText('฿500');
  const anon = await c.newApi();
  let pay = await c.payRef(anon, 'PP-0001', 600);
  expect(pay.status).toBe(422); expect(pay.body.code).toBe('AMOUNT_MISMATCH');
  pay = await c.payRef(anon, 'PP-0001', 500);
  expect(pay.status).toBe(200); expect(pay.body.status).toBe('PAID');
  expect(pay.body.caseNo).toBe('EG-2569-000032');

  // 6 add holiday
  await page.goto('/admin/holidays');
  await page.getByTestId('holiday-date-input').fill('2026-12-02');
  await page.getByTestId('holiday-name-input').fill('วันหยุดทดสอบ');
  await page.getByTestId('holiday-add-btn').click();
  await expect(page.getByTestId('holiday-row')).toHaveCount(5);
  g = await c.call(som, 'GET', '/api/cases/EG-2569-000031');
  expect(g.json.dueAt).toBe('2026-12-04T16:30:00+07:00');

  // 7 NEW_PAID after holiday
  const p2 = await c.createPaidCase(som, { serviceId: 'SV-01', qty: 1 });
  expect(p2.caseNo).toBe('EG-2569-000033');
  expect(p2.fee).toBe(25);
  g = await c.call(som, 'GET', `/api/cases/${p2.caseNo}`);
  expect(g.json.dueAt).toBe('2026-12-08T16:30:00+07:00');

  // 8 change exec1 -> auditor
  const put = await c.call(page.request, 'PUT', '/api/admin/users/exec1', { role: 'auditor', dept: '' });
  expect(put.status).toBe(200);
  const ectx = await browser.newContext();
  const ep = await ectx.newPage();
  await c.uiLoginStaff(ep, 'exec1');
  expect(new URL(ep.url()).pathname).toBe('/audit');
  const dres = await ep.goto('/dashboard');
  expect(dres.status()).toBe(403);
  await expect(ep.getByTestId('forbidden-msg')).toBeVisible();

  // 9 audit ADMIN_CHANGE
  await ep.goto('/audit');
  await ep.getByTestId('audit-filter-event').selectOption('ADMIN_CHANGE');
  await ep.getByTestId('audit-apply-btn').click();
  await expect(ep.getByTestId('audit-count')).toHaveText('4');
  const rows = ep.getByTestId('audit-row');
  for (let i = 0; i < 4; i++) {
    await expect(rows.nth(i)).toHaveAttribute('data-actor', 'admin1');
    await expect(rows.nth(i).getByTestId('audit-role')).toHaveText('admin');
  }
  const det = (await rows.getByTestId('audit-detail').allInnerTexts()).join('\n');
  for (const s of ['SV-01 fee 20 → 25', 'SV-02 fee 500 → 600', 'holiday add 2026-12-02', 'exec1 role executive → auditor']) expect(det).toContain(s);

  // 10 admin cannot create drafts
  expect((await c.call(page.request, 'POST', '/api/drafts', { serviceId: 'SV-01', qty: 1 })).status).toBe(403);

  // 11 delete holiday
  await page.goto('/admin/holidays');
  await c.byAttr(page, 'holiday-row', 'data-date', '2026-12-02').getByTestId('holiday-delete-btn').click();
  await expect(page.getByTestId('holiday-row')).toHaveCount(4);
  await ep.getByTestId('audit-apply-btn').click();
  await expect(ep.getByTestId('audit-count')).toHaveText('5');
  const det2 = (await ep.getByTestId('audit-detail').allInnerTexts()).join('\n');
  expect(det2).toContain('holiday delete 2026-12-02');
  await cctx.close(); await ectx.close();
});

test('TC-RBAC-05 สิทธิ์เปิด/ดาวน์โหลดไฟล์แนบ @P1', async ({ page }) => {
  test.setTimeout(180000);
  await c.reset();
  const ctxs = {
    reg1: await c.apiStaff('off.reg1'), reg2: await c.apiStaff('off.reg2'), works1: await c.apiStaff('off.works1'),
    head1: await c.apiStaff('head1'), exec1: await c.apiStaff('exec1'), audit1: await c.apiStaff('audit1'),
    admin1: await c.apiStaff('admin1'), somying: await c.apiCitizen(c.ID.somying), somchai: await c.apiCitizen(c.ID.somchai),
    anon: await c.newApi(),
  };
  const N = (n) => `EG-2569-${String(n).padStart(6, '0')}`;
  const three = ['deed.pdf', 'id-card.pdf', 'plan.pdf'];
  // fileIds per case from a ctx that is allowed
  const ids = {};
  for (const no of [25, 12, 10, 11]) {
    const r = await c.call(ctxs.head1, 'GET', `/api/cases/${N(no)}/files`);
    expect(r.status).toBe(200);
    ids[no] = r.json.items;
  }
  const rows = [
    ['reg1', 25, 200, ['id-card.pdf']], ['works1', 25, 403], ['reg2', 12, 200, three], ['works1', 12, 403],
    ['works1', 10, 200, three], ['reg1', 10, 200, three], ['works1', 11, 200, three],
    ['head1', 25, 200, ['id-card.pdf']], ['head1', 10, 200, three], ['head1', 12, 200, three],
    ['somying', 25, 200, ['id-card.pdf']], ['somchai', 25, 404],
    ['exec1', 25, 403], ['audit1', 25, 403], ['admin1', 25, 403], ['anon', 25, 401],
  ];
  for (const [who, no, st, names] of rows) {
    const lbl = `${who} ${N(no)}`;
    const list = await c.call(ctxs[who], 'GET', `/api/cases/${N(no)}/files`);
    expect(list.status, lbl + ' files').toBe(st);
    const sample = ids[no][0];
    if (st === 200) {
      expect(list.json.items.map((x) => x.name).sort(), lbl).toEqual([...names].sort());
      for (const it of list.json.items) {
        const f = await c.call(ctxs[who], 'GET', `/api/files/${it.fileId}`);
        expect(f.status, lbl + ' file').toBe(200);
        expect(f.headers['content-type'], lbl).toContain('application/pdf');
        expect(f.body.slice(0, 4).toString('latin1'), lbl).toBe('%PDF');
      }
    } else {
      const f = await c.call(ctxs[who], 'GET', `/api/files/${sample.fileId}`);
      expect(f.status, lbl + ' file').toBe(st);
    }
  }
  expect((await c.call(ctxs.reg1, 'GET', '/api/files/does-not-exist-xyz')).status).toBe(404);

  // UI
  await c.freshStaff(page, 'off.reg1');
  await page.goto('/officer/cases/EG-2569-000025');
  const di = page.getByTestId('doc-item');
  await expect(di).toHaveCount(1);
  await expect(di).toHaveAttribute('data-name', 'id-card.pdf');
  const href = await di.getByTestId('doc-download-link').getAttribute('href');
  const dl = await page.request.get(href);
  expect(dl.status()).toBe(200);
  expect((await dl.body()).length).toBeGreaterThan(0);
  await c.freshStaff(page, 'off.reg2');
  await page.goto('/officer/cases/EG-2569-000012');
  await expect(page.getByTestId('doc-item')).toHaveCount(3);
  await c.freshCitizen(page, c.ID.somying);
  await page.goto('/citizen/cases/EG-2569-000025');
  await expect(page.getByTestId('doc-item')).toHaveCount(1);
});

test('TC-RBAC-06 ผู้ดูแลระบบ: ช่วงค่าที่ยอมรับ @P2', async ({ page, browser }) => {
  test.setTimeout(180000);
  await c.reset();
  await c.freshStaff(page, 'admin1');
  const api = page.request;
  const svc = async () => (await c.call(api, 'GET', '/api/admin/services')).json.items.find((x) => x.id === 'SV-01');
  const put = (b) => c.call(api, 'PUT', '/api/admin/services/SV-01', b);
  const FEE_MSG = 'ค่าธรรมเนียมต้องเป็นจำนวนเต็ม 0–100,000 บาท';
  const SLA_MSG = 'SLA ต้องเป็นจำนวนเต็ม 1–60 วันทำการ';

  // UI invalid
  await page.goto('/admin/services');
  await page.getByTestId('svc-fee-SV-01').fill('-1');
  await page.getByTestId('svc-save-SV-01').click();
  await expect(page.getByTestId('action-error')).toHaveText(FEE_MSG);
  await page.getByTestId('svc-fee-SV-01').fill('20');
  await page.getByTestId('svc-sla-SV-01').fill('0');
  await page.getByTestId('svc-save-SV-01').click();
  await expect(page.getByTestId('action-error')).toHaveText(SLA_MSG);

  // API fee
  let r = await put({ fee: -1, sla: 3 });
  expect(r.status).toBe(400); expect(r.json.code).toBe('INVALID_FEE');
  expect((await svc()).fee).toBe(20);
  r = await put({ fee: 0, sla: 3 }); expect(r.status).toBe(200);
  r = await put({ fee: 100000, sla: 3 }); expect(r.status).toBe(200);
  r = await put({ fee: 100001, sla: 3 }); expect(r.status).toBe(400); expect(r.json.code).toBe('INVALID_FEE');
  expect((await svc()).fee).toBe(100000);
  // API sla (fee kept unchanged at 100000)
  r = await put({ fee: 100000, sla: 0 }); expect(r.status).toBe(400); expect(r.json.code).toBe('INVALID_SLA');
  r = await put({ fee: 100000, sla: 1 }); expect(r.status).toBe(200);
  r = await put({ fee: 100000, sla: 60 }); expect(r.status).toBe(200);
  r = await put({ fee: 100000, sla: 61 }); expect(r.status).toBe(400); expect(r.json.code).toBe('INVALID_SLA');
  expect((await svc()).sla).toBe(60);

  // holidays
  await page.goto('/admin/holidays');
  await expect(page.getByTestId('holiday-row')).toHaveCount(4);
  await page.getByTestId('holiday-date-input').fill('2026-12-07');
  await page.getByTestId('holiday-name-input').fill('ซ้ำ');
  await page.getByTestId('holiday-add-btn').click();
  await expect(page.getByTestId('action-error')).toHaveText('มีวันหยุดนี้อยู่แล้ว');
  await expect(page.getByTestId('holiday-row')).toHaveCount(4);
  r = await c.call(api, 'POST', '/api/admin/holidays', { date: '2026-12-07', name: 'ซ้ำ' });
  expect(r.status).toBe(409); expect(r.json.code).toBe('DUPLICATE_HOLIDAY');
  r = await c.call(api, 'POST', '/api/admin/holidays', { date: '2026-12-05', name: 'วันเสาร์' });
  expect(r.status).toBe(201);

  // self role change
  r = await c.call(api, 'PUT', '/api/admin/users/admin1', { role: 'executive', dept: '' });
  expect(r.status).toBe(409); expect(r.json.code).toBe('SELF_ROLE_CHANGE');
  expect((await c.call(api, 'GET', '/api/me')).json.role).toBe('admin');

  // audit
  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await c.uiLoginStaff(ap, 'audit1');
  await ap.goto('/audit');
  await ap.getByTestId('audit-filter-event').selectOption('ADMIN_CHANGE');
  await ap.getByTestId('audit-apply-btn').click();
  await expect(ap.getByTestId('audit-count')).toHaveText('5');
  await actx.close();
});

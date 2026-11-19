// TC-AUDIT-01..03 (TEST-PLAN section 14). Black-box: CONTRACT testids / API only.
const { test, expect } = require('@playwright/test');
const c = require('../lib/c');

const D = c.EN_DASH;
const T = (x) => new Date(x).getTime();

async function readAuditRows(page) {
  return page.getByTestId('audit-row').evaluateAll((rows) => rows.map((r) => {
    const q = (id) => { const e = r.querySelector(`[data-testid="${id}"]`); return e ? e.textContent.trim() : null; };
    const t = r.querySelector('[data-testid="audit-time"]');
    return {
      id: r.getAttribute('data-id'), event: r.getAttribute('data-event'), actor: r.getAttribute('data-actor'),
      dCase: r.getAttribute('data-case-no'), role: q('audit-role'), caseNo: q('audit-case-no'),
      transition: q('audit-transition'), detail: q('audit-detail'), iso: t ? t.getAttribute('data-iso') : null,
      uiEvent: q('audit-event'), uiActor: q('audit-actor'),
    };
  }));
}
async function applyFilter(page, { actor = '', event = '', from = '', to = '' }) {
  await page.getByTestId('audit-filter-actor').fill(actor);
  await page.getByTestId('audit-filter-event').selectOption(event);
  await page.getByTestId('audit-filter-from').fill(from);
  await page.getByTestId('audit-filter-to').fill(to);
  await page.getByTestId('audit-apply-btn').click();
}

test('TC-AUDIT-01 เหตุการณ์และฟิลด์ใน Audit @P1', async ({ page }) => {
  await c.reset();
  const reg2 = await c.apiStaff('off.reg2');
  let r = await c.call(reg2, 'POST', '/api/officer/cases/EG-2569-000028/claim');
  expect(r.status).toBe(200);
  const reg1 = await c.apiStaff('off.reg1');
  r = await c.call(reg1, 'POST', '/api/officer/cases/EG-2569-000020/return', { reason: 'xxxxxxxxxx' });
  expect(r.status).toBe(200);
  r = await c.call(reg2, 'POST', '/api/officer/cases/EG-2569-000013/forward', {});
  expect(r.status).toBe(200);
  const head = await c.apiStaff('head1');
  r = await c.call(head, 'POST', '/api/cases/EG-2569-000013/approve');
  expect(r.status).toBe(200);
  r = await c.call(reg2, 'POST', '/api/cases/EG-2569-000025/approve');
  expect(r.status).toBe(200);
  r = await c.call(reg2, 'POST', '/api/officer/cases/EG-2569-000025/issue');
  expect(r.status).toBe(200);
  r = await c.call(reg2, 'POST', '/api/cases/EG-2569-000026/reject', { reason: 'xxxxxxxxxx' });
  expect(r.status).toBe(200);
  r = await c.call(reg2, 'POST', '/api/officer/cases/EG-2569-000025/unmask', { reason: 'ตรวจสอบตัวตนซ้ำ' });
  expect(r.status).toBe(200);
  const exec = await c.apiStaff('exec1');
  r = await c.call(exec, 'GET', '/api/dashboard/export?format=xlsx&period=2026-12&service=ALL');
  expect(r.status).toBe(200);
  const admin = await c.apiStaff('admin1');
  r = await c.call(admin, 'PUT', '/api/admin/services/SV-01', { fee: 25, sla: 3 });
  expect(r.status).toBe(200);

  // audit1: single UI login (the 6th STAFF_LOGIN)
  await c.freshStaff(page, 'audit1');
  await page.goto('/audit');
  await expect(page.getByTestId('audit-count')).toHaveText('16');
  const rows = await readAuditRows(page);
  expect(rows).toHaveLength(16);
  // order: newest -> oldest; equal time -> data-id desc
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    expect(T(a.iso), `row ${i} time order`).toBeGreaterThanOrEqual(T(b.iso));
    if (T(a.iso) === T(b.iso) && !isNaN(+a.id) && !isNaN(+b.id)) expect(+a.id, `row ${i} id order`).toBeGreaterThan(+b.id);
  }
  for (const x of rows) expect(T(x.iso)).toBe(T('2026-12-01T09:00:00+07:00'));
  const ev = (e) => rows.filter((x) => x.event === e);
  const countBy = {};
  rows.forEach((x) => { countBy[x.event] = (countBy[x.event] || 0) + 1; });
  expect(countBy).toEqual({ STAFF_LOGIN: 6, CLAIM: 1, RETURN: 1, FORWARD: 1, APPROVE: 2, ISSUE: 1, REJECT: 1, UNMASK: 1, EXPORT: 1, ADMIN_CHANGE: 1 });
  expect(ev('STAFF_LOGIN').map((x) => x.actor).sort()).toEqual(['admin1', 'audit1', 'exec1', 'head1', 'off.reg1', 'off.reg2']);
  const roleOf = { 'off.reg1': 'officer', 'off.reg2': 'officer', head1: 'head', exec1: 'executive', admin1: 'admin', audit1: 'auditor' };
  for (const x of ev('STAFF_LOGIN')) {
    expect(x.role, x.actor).toBe(roleOf[x.actor]);
    expect(x.transition).toBe(D);
  }
  const one = (e) => ev(e)[0];
  const chk = (x, actor, role, caseNo, tr, detail) => {
    expect(x.actor).toBe(actor); expect(x.role).toBe(role);
    if (caseNo) expect(x.caseNo).toBe(caseNo);
    else expect([D, '', null]).toContain(x.caseNo);
    expect(x.transition).toBe(tr);
    if (detail) expect(x.detail || '').toContain(detail);
  };
  chk(one('CLAIM'), 'off.reg2', 'officer', 'EG-2569-000028', 'SUBMITTED → IN_REVIEW');
  chk(one('RETURN'), 'off.reg1', 'officer', 'EG-2569-000020', 'IN_REVIEW → NEED_FIX', 'xxxxxxxxxx');
  chk(one('FORWARD'), 'off.reg2', 'officer', 'EG-2569-000013', 'IN_REVIEW → PENDING_APPROVAL');
  const apH = ev('APPROVE').find((x) => x.actor === 'head1');
  const apO = ev('APPROVE').find((x) => x.actor === 'off.reg2');
  chk(apH, 'head1', 'head', 'EG-2569-000013', 'PENDING_APPROVAL → APPROVED');
  chk(apO, 'off.reg2', 'officer', 'EG-2569-000025', 'IN_REVIEW → APPROVED');
  chk(one('ISSUE'), 'off.reg2', 'officer', 'EG-2569-000025', 'APPROVED → COMPLETED', 'DOC-2569-000002');
  chk(one('REJECT'), 'off.reg2', 'officer', 'EG-2569-000026', 'IN_REVIEW → REJECTED', 'xxxxxxxxxx');
  chk(one('UNMASK'), 'off.reg2', 'officer', 'EG-2569-000025', D, 'ตรวจสอบตัวตนซ้ำ');
  chk(one('EXPORT'), 'exec1', 'executive', null, D);
  expect(one('EXPORT').detail).toContain('xlsx');
  expect(one('EXPORT').detail).toContain('2026-12');
  chk(one('ADMIN_CHANGE'), 'admin1', 'admin', null, D, 'SV-01 fee 20 → 25');

  // filters
  await applyFilter(page, { actor: 'off.reg2' });
  await expect(page.getByTestId('audit-count')).toHaveText('7');
  const f1 = await readAuditRows(page);
  expect(f1.map((x) => x.event).sort()).toEqual(['APPROVE', 'CLAIM', 'FORWARD', 'ISSUE', 'REJECT', 'STAFF_LOGIN', 'UNMASK']);
  await applyFilter(page, { event: 'APPROVE' });
  await expect(page.getByTestId('audit-count')).toHaveText('2');
  expect((await readAuditRows(page)).map((x) => x.actor).sort()).toEqual(['head1', 'off.reg2']);
  await applyFilter(page, { actor: 'off.reg2', event: 'APPROVE' });
  await expect(page.getByTestId('audit-count')).toHaveText('1');

  // CSV
  await applyFilter(page, {});
  await expect(page.getByTestId('audit-count')).toHaveText('16');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('audit-export-csv-btn').click()]);
  const csv = (await c.readDownload(dl)).toString('utf8').replace(/^﻿/, '');
  const lines = csv.split(/\r?\n/).filter((l) => l.length);
  expect(lines[0]).toBe('time,username,role,event,caseNo,fromStatus,toStatus,detail');
  expect(lines.length - 1).toBe(16);
  await page.reload();
  await expect(page.getByTestId('audit-count')).toHaveText('17');
  await applyFilter(page, { event: 'EXPORT' });
  await expect(page.getByTestId('audit-count')).toHaveText('2');
  expect((await readAuditRows(page)).some((x) => x.actor === 'audit1' && (x.detail || '').includes('audit-csv'))).toBe(true);
});

test('TC-AUDIT-02 Audit แก้/ลบไม่ได้ (405) @P1', async ({ page }) => {
  await c.reset();
  const aud = await c.apiStaff('audit1');
  const first = await c.call(aud, 'GET', '/api/audit');
  expect(first.status).toBe(200);
  const before = first.json.items;
  expect(before.length).toBe(1);
  const id = before[0].id;
  const admin = await c.apiStaff('admin1');
  const reqs = [
    ['PUT', `/api/audit/${id}`, { detail: 'x' }], ['PATCH', `/api/audit/${id}`, { detail: 'x' }],
    ['DELETE', `/api/audit/${id}`], ['PUT', '/api/audit', {}], ['DELETE', '/api/audit'],
    ['DELETE', '/api/audit/999999'],
  ];
  for (const [who, ctx] of [['admin1', admin], ['audit1', aud]]) {
    for (const [m, u, d] of reqs) {
      const r = await c.call(ctx, m, u, d);
      expect(r.status, `${who} ${m} ${u}`).toBe(405);
      if (r.json) expect(r.json.code, `${who} ${m} ${u}`).toBe('METHOD_NOT_ALLOWED');
    }
  }
  const after = await c.call(aud, 'GET', '/api/audit');
  const afterItems = after.json.items;
  for (const b of before) {
    const a = afterItems.find((x) => x.id === b.id);
    expect(a, 'row kept').toBeTruthy();
    expect(a).toEqual(b);
  }
  expect(afterItems.length).toBe(before.length + 1);
  const added = afterItems.find((x) => !before.some((b) => b.id === x.id));
  expect(added.event).toBe('STAFF_LOGIN');
  expect(added.username).toBe('admin1');
  expect((await c.call(admin, 'GET', '/api/audit')).status).toBe(403);

  await c.freshStaff(page, 'audit1');
  await page.goto('/audit');
  await expect(page.getByTestId('audit-row').first()).toBeVisible();
  await expect(page.getByTestId('audit-edit-btn')).toHaveCount(0);
  await expect(page.getByTestId('audit-delete-btn')).toHaveCount(0);
});

test('TC-AUDIT-03 กรองช่วงวันที่ตามเวลาไทย @P1', async ({ page }) => {
  await c.reset();
  const base = await c.newApi();
  const L = [
    ['L1', '2026-11-30T23:59:59+07:00', 'off.reg1'],
    ['L2', '2026-12-01T00:00:00+07:00', 'off.reg2'],
    ['L3', '2026-12-01T23:59:59+07:00', 'off.works1'],
    ['L4', '2026-12-02T00:00:00+07:00', 'off.reg1'],
  ];
  for (const [, t, u] of L) { await c.setClock(base, t); await c.apiStaff(u); }
  await c.setClock(base, '2026-12-02T09:00:00+07:00');
  await c.freshStaff(page, 'audit1'); // L5
  const label = (x) => {
    const t = T(x.iso || x.time);
    const hit = L.find(([, ts, u]) => T(ts) === t && u === (x.actor || x.username));
    if (hit) return hit[0];
    return (x.actor || x.username) === 'audit1' ? 'L5' : '?';
  };
  const cases = [
    ['2026-12-01', '2026-12-01', ['L2', 'L3'], ''],
    ['2026-11-30', '2026-11-30', ['L1'], ''],
    ['2026-11-30', '2026-12-01', ['L1', 'L2', 'L3'], ''],
    ['2026-12-02', '', ['L4', 'L5'], ''],
    ['', '2026-11-30', ['L1'], ''],
    ['2026-12-01', '2026-12-02', ['L2', 'L3', 'L4', 'L5'], ''],
    ['2026-12-01', '2026-12-01', ['L2'], 'off.reg2'],
  ];
  await page.goto('/audit');
  for (const [from, to, want, actor] of cases) {
    const lbl = `from=${from} to=${to} actor=${actor}`;
    await applyFilter(page, { from, to, actor });
    await expect(page.getByTestId('audit-count'), lbl).toHaveText(String(want.length));
    const got = (await readAuditRows(page)).map(label).sort();
    expect(got, 'UI ' + lbl).toEqual(want);
    const qs = `from=${from}&to=${to}&actor=${actor}&event=`;
    const a = await c.call(page.request, 'GET', `/api/audit?${qs}`);
    expect(a.status).toBe(200);
    expect(a.json.count, 'API ' + lbl).toBe(want.length);
    expect(a.json.items.map(label).sort(), 'API ' + lbl).toEqual(want);
  }
});

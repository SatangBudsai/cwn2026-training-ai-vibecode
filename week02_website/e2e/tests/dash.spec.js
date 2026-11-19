// TC-DASH-01..04 (TEST-PLAN section 13). Black-box: CONTRACT testids / API only.
const { test, expect } = require('@playwright/test');
const c = require('../lib/c');

const D = c.EN_DASH;

async function kpis(page) {
  const t = async (id) => (await page.getByTestId(id).innerText()).trim();
  return {
    received: await t('kpi-received'), closed: await t('kpi-closed'), pct: await t('kpi-ontime-pct'),
    backlog: await t('kpi-backlog'), overdue: await t('kpi-overdue'),
  };
}
async function selectAndWait(page, period, service, exp) {
  await page.getByTestId('period-select').selectOption(period);
  await page.getByTestId('service-select').selectOption(service);
  await expect(page.getByTestId('kpi-received')).toHaveText(exp.received);
  await expect(page.getByTestId('kpi-closed')).toHaveText(exp.closed);
  await expect(page.getByTestId('kpi-ontime-pct')).toHaveText(exp.pct);
  if (exp.backlog !== undefined) await expect(page.getByTestId('kpi-backlog')).toHaveText(exp.backlog);
  if (exp.overdue !== undefined) await expect(page.getByTestId('kpi-overdue')).toHaveText(exp.overdue);
}
const r1 = (x) => Math.round(x * 10) / 10;

test('TC-DASH-01 Dashboard ตัวเลขเริ่มต้น @P1', async ({ page }) => {
  await c.reset();
  await c.freshStaff(page, 'exec1');
  await page.goto('/dashboard');
  await expect(page.getByTestId('period-select')).toHaveValue('2026-12');
  await expect(page.getByTestId('service-select')).toHaveValue('ALL');
  await selectAndWait(page, '2026-12', 'ALL', { received: '3', closed: '0', pct: D, backlog: '21', overdue: '1' });
  const k = await kpis(page);
  expect(k.pct).not.toMatch(/NaN|0%/);
  const wl = {};
  for (const u of ['off.reg1', 'off.reg2', 'off.works1']) {
    const row = c.byAttr(page, 'workload-row', 'data-username', u);
    await expect(row).toHaveCount(1);
    wl[u] = (await row.getByTestId('workload-value').innerText()).trim();
  }
  expect(wl).toEqual({ 'off.reg1': '3', 'off.reg2': '9', 'off.works1': '0' });
  await expect(page.getByTestId('workload-row')).toHaveCount(3);

  // API
  const api = await c.call(page.request, 'GET', '/api/dashboard?period=2026-12&service=ALL');
  expect(api.status).toBe(200);
  expect(api.json.received).toBe(3);
  expect(api.json.closed).toBe(0);
  expect(api.json.ontimePct).toBeNull();
  expect(api.json.backlog).toBe(21);
  expect(api.json.overdue).toBe(1);

  // no personal data
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toMatch(/\d{13}/);
  expect(body).not.toMatch(/0\d{9}/);
  for (const n of ['สมชาย', 'สมหญิง', 'ปิติ', 'มานะ']) expect(body).not.toContain(n);

  // service filter
  const svc = {
    'SV-01': { received: '3', closed: '0', pct: D, backlog: '11', overdue: '1' },
    'SV-02': { received: '0', closed: '0', pct: D, backlog: '7', overdue: '0' },
    'SV-03': { received: '0', closed: '0', pct: D, backlog: '3', overdue: '0' },
  };
  for (const [s, e] of Object.entries(svc)) {
    await selectAndWait(page, '2026-12', s, e);
    const a = await c.call(page.request, 'GET', `/api/dashboard?period=2026-12&service=${s}`);
    expect(a.json.received, s).toBe(+e.received);
    expect(a.json.closed, s).toBe(+e.closed);
    expect(a.json.ontimePct, s).toBeNull();
    expect(a.json.backlog, s).toBe(+e.backlog);
    expect(a.json.overdue, s).toBe(+e.overdue);
  }
});

const DASH02 = [
  ['2026-10', 'ALL', 1, 1, '100.0%'],
  ['2026-11', 'ALL', 26, 7, '85.7%'],
  ['2026-11', 'SV-01', 12, 3, '100.0%'],
  ['2026-11', 'SV-02', 10, 3, '66.7%'],
  ['2026-11', 'SV-03', 4, 1, '100.0%'],
  ['2026', 'ALL', 30, 8, '87.5%'],
  ['2026', 'SV-01', 16, 4, '100.0%'],
  ['2026', 'SV-02', 10, 3, '66.7%'],
  ['2026', 'SV-03', 4, 1, '100.0%'],
];
const BACKLOG = { ALL: ['21', '1'], 'SV-01': ['11', '1'], 'SV-02': ['7', '0'], 'SV-03': ['3', '0'] };

test('TC-DASH-02 Dashboard ย้อนหลัง @P1', async ({ page }) => {
  await c.reset();
  await c.freshStaff(page, 'exec1');
  await page.goto('/dashboard');
  for (const [period, svc, rec, clo, pct] of DASH02) {
    const [bl, ov] = BACKLOG[svc];
    await selectAndWait(page, period, svc, { received: String(rec), closed: String(clo), pct, backlog: bl, overdue: ov });
    const a = await c.call(page.request, 'GET', `/api/dashboard?period=${period}&service=${svc}`);
    const label = `${period} ${svc}`;
    expect(a.status, label).toBe(200);
    expect(a.json.received, label).toBe(rec);
    expect(a.json.closed, label).toBe(clo);
    expect(r1(a.json.ontimePct), label).toBe(parseFloat(pct));
    expect(a.json.backlog, label).toBe(+bl);
    expect(a.json.overdue, label).toBe(+ov);
  }
});

test('TC-DASH-03 ส่งออก Excel/PDF เท่าหน้าจอ @P2', async ({ page, browser }) => {
  await c.reset();
  await c.freshStaff(page, 'exec1');
  await page.goto('/dashboard');
  const NAMES = ['สมชาย', 'สมหญิง', 'ปิติ', 'มานะ'];
  const PII = (s) => { expect(s).not.toMatch(/\d{13}/); expect(s).not.toMatch(/0\d{9}/); };
  const names = (s) => { for (const n of NAMES) expect(s).not.toContain(n); };
  const LABELS = ['รับเรื่อง', 'ปิดงาน', 'ทันกำหนด %', 'งานคงค้าง', 'เกินกำหนดคงค้าง'];

  async function xlsx(period, exp) {
    await page.getByTestId('period-select').selectOption(period);
    await page.getByTestId('service-select').selectOption('ALL');
    await expect(page.getByTestId('kpi-received')).toHaveText(exp[0]);
    const screen = await kpis(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-xlsx-btn').click()]);
    const buf = await c.readDownload(dl);
    expect(buf.slice(0, 2).toString('latin1')).toBe('PK');
    const x = c.xlsxFirstSheet(buf);
    expect(x.cells.A1).toBe('ตัวชี้วัด');
    expect(x.cells.B1).toBe('ค่า');
    LABELS.forEach((l, i) => {
      expect(x.cells['A' + (i + 2)], `${period} A${i + 2}`).toBe(l);
      expect(x.cells['B' + (i + 2)], `${period} B${i + 2}`).toBe(exp[i]);
    });
    expect([screen.received, screen.closed, screen.pct, screen.backlog, screen.overdue]).toEqual(exp);
    PII(x.allText); names(x.allText);
  }
  await xlsx('2026-11', ['26', '7', '85.7%', '21', '1']);

  await page.getByTestId('period-select').selectOption('2026-11');
  await page.getByTestId('service-select').selectOption('ALL');
  await expect(page.getByTestId('kpi-received')).toHaveText('26');
  const [pdl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-pdf-btn').click()]);
  const pbuf = await c.readDownload(pdl);
  expect(pbuf.slice(0, 4).toString('latin1')).toBe('%PDF');
  const pt = c.pdfTexts(pbuf);
  expect(pt.raw).toContain('kpi received=26 closed=7 ontime=85.7% backlog=21 overdue=1');
  PII(pt.text); names(pt.text); names(pt.utf8);

  await xlsx('2026-12', ['3', '0', D, '21', '1']);

  // audit: 3 EXPORT rows
  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await c.uiLoginStaff(ap, 'audit1');
  await ap.goto('/audit');
  await ap.getByTestId('audit-filter-event').selectOption('EXPORT');
  await ap.getByTestId('audit-apply-btn').click();
  await expect(ap.getByTestId('audit-count')).toHaveText('3');
  const rows = ap.getByTestId('audit-row');
  await expect(rows).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await expect(rows.nth(i)).toHaveAttribute('data-actor', 'exec1');
    await expect(rows.nth(i).getByTestId('audit-role')).toHaveText('executive');
  }
  const details = (await rows.getByTestId('audit-detail').allInnerTexts()).join('\n');
  expect(details).toMatch(/xlsx/);
  expect(details).toMatch(/pdf/);
  expect(details).toContain('2026-11');
  expect(details).toContain('2026-12');
  await actx.close();
});

test('TC-DASH-04 ค่าขอบ "ทันกำหนด" 16:29:59 / 16:30:00 / 16:30:01 @P1', async ({ page }) => {
  await c.reset();
  const base = await c.newApi();
  await c.setClock(base, '2026-12-03T16:00:00+07:00');
  const reg1 = await c.apiStaff('off.reg1');
  const reg2 = await c.apiStaff('off.reg2');
  const exec = await c.apiStaff('exec1');
  const dash = async () => (await c.call(exec, 'GET', '/api/dashboard?period=2026-12&service=ALL')).json;
  const T = (x) => new Date(x).getTime();

  // 1 approve at 16:00:00
  let r = await c.call(reg2, 'POST', '/api/cases/EG-2569-000025/approve');
  expect(r.status).toBe(200); expect(r.json.status).toBe('APPROVED');
  r = await c.call(reg1, 'POST', '/api/cases/EG-2569-000023/approve');
  expect(r.status).toBe(200); expect(r.json.status).toBe('APPROVED');

  // 2 issue 000025 at 16:29:59
  await c.setClock(base, '2026-12-03T16:29:59+07:00');
  r = await c.call(reg2, 'POST', '/api/officer/cases/EG-2569-000025/issue');
  expect(r.status).toBe(200); expect(r.json.status).toBe('COMPLETED');
  let d = await dash();
  expect([d.closed, d.onTime]).toEqual([1, 1]);

  // 3 reject 000026 at 16:30:00
  await c.setClock(base, '2026-12-03T16:30:00+07:00');
  r = await c.call(reg2, 'POST', '/api/cases/EG-2569-000026/reject', { reason: 'xxxxxxxxxx' });
  expect(r.status).toBe(200); expect(r.json.status).toBe('REJECTED');
  d = await dash();
  expect([d.closed, d.onTime]).toEqual([2, 2]);

  // 4 issue 000023 at 16:30:01
  await c.setClock(base, '2026-12-03T16:30:01+07:00');
  r = await c.call(reg1, 'POST', '/api/officer/cases/EG-2569-000023/issue');
  expect(r.status).toBe(200); expect(r.json.status).toBe('COMPLETED');
  d = await dash();
  expect([d.closed, d.onTime]).toEqual([3, 2]);
  expect(d.backlog).toBe(18);

  // closed_at = clock of each step
  const exp = { 'EG-2569-000025': '2026-12-03T16:29:59+07:00', 'EG-2569-000026': '2026-12-03T16:30:00+07:00', 'EG-2569-000023': '2026-12-03T16:30:01+07:00' };
  for (const [no, iso] of Object.entries(exp)) {
    const g = await c.call(reg1, 'GET', `/api/cases/${no}`);
    expect(T(g.json.closedAt), no).toBe(T(iso));
  }
  // UI: officer sees closed-at data-iso; exec sees kpi
  await c.freshStaff(page, 'off.reg1');
  for (const [no, iso] of Object.entries(exp)) {
    await page.goto(`/officer/cases/${no}`);
    const v = await page.getByTestId('closed-at').getAttribute('data-iso');
    expect(T(v), no).toBe(T(iso));
  }
  await c.freshStaff(page, 'exec1');
  await page.goto('/dashboard');
  await page.getByTestId('period-select').selectOption('2026-12');
  await page.getByTestId('service-select').selectOption('ALL');
  await expect(page.getByTestId('kpi-closed')).toHaveText('3');
  await expect(page.getByTestId('kpi-backlog')).toHaveText('18');
});

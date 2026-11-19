// TC-PDPA-01..03 (TEST-PLAN section 12). Black-box: CONTRACT testids / API only.
const { test, expect } = require('@playwright/test');
const c = require('../lib/c');

const MASK_RE = /^X-XXXX-XXXXX-\d{2}-\d$/;

test('TC-PDPA-01 ปิดบังเลขบัตรบนจอ @P1', async ({ page }) => {
  await c.reset();
  await c.freshStaff(page, 'off.reg2');
  await page.goto('/officer/queue');
  await expect(page.getByTestId('queue-row').first()).toBeVisible();
  const masked = await page.getByTestId('row-id-masked').allInnerTexts();
  expect(masked.length).toBeGreaterThan(0);
  for (const m of masked) expect(m.trim()).toMatch(MASK_RE);
  const r25 = c.byAttr(page, 'queue-row', 'data-case-no', 'EG-2569-000025');
  await expect(r25.getByTestId('row-id-masked')).toHaveText('X-XXXX-XXXXX-65-9');
  const r26 = c.byAttr(page, 'queue-row', 'data-case-no', 'EG-2569-000026');
  await expect(r26.getByTestId('row-id-masked')).toHaveText('X-XXXX-XXXXX-45-6');

  await page.goto('/officer/cases/EG-2569-000025');
  await expect(page.getByTestId('applicant-id')).toHaveText('X-XXXX-XXXXX-65-9');
  const html = await page.content();
  expect(html).not.toContain('3100600987659');
  expect(html).not.toContain('3-1006-00987-65-9');

  await c.freshStaff(page, 'head1');
  await page.goto('/officer/cases/EG-2569-000025');
  await expect(page.getByTestId('applicant-id')).toHaveText('X-XXXX-XXXXX-65-9');

  await c.freshCitizen(page, c.ID.somying);
  await page.goto('/citizen/cases/EG-2569-000025');
  await expect(page.getByTestId('case-id-full')).toHaveText('3-1006-00987-65-9');

  await c.freshCitizen(page, c.ID.somchai);
  await page.goto('/citizen/cases/EG-2569-000020');
  await expect(page.getByTestId('case-id-full')).toHaveText('1-1017-00123-45-6');
});

test('TC-PDPA-02 API (JSON) ไม่ส่งเลขบัตรเต็ม @P1', async () => {
  await c.reset();
  const urls = [
    '/api/officer/queue?filter=all',
    '/api/cases/EG-2569-000025',
    '/api/cases/EG-2569-000026',
    '/api/cases/EG-2569-000020',
    '/api/notifications',
    '/api/cases/EG-2569-000025/files',
  ];
  const secrets = ['3100600987659', '1101700123456', '1909900555015'];
  for (const user of ['off.reg1', 'head1']) {
    const ctx = await c.apiStaff(user);
    for (const u of urls) {
      const r = await c.call(ctx, 'GET', u);
      const label = `${user} ${u}`;
      expect(r.status, label).toBe(200);
      expect(r.headers['content-type'] || '', label).toContain('application/json');
      const s = JSON.stringify(r.json);
      expect(s, label).not.toMatch(/\d{13}/);
      expect(s, label).not.toMatch(/\d-\d{4}-\d{5}-\d{2}-\d/);
      expect(c.deepKeys(r.json), label).not.toContain('idNo');
      for (const sec of secrets) expect(s, label).not.toContain(sec);
      if (r.json.idMasked !== undefined) expect(r.json.idMasked, label).toMatch(MASK_RE);
      for (const it of r.json.items || []) {
        if (it.idMasked !== undefined) expect(it.idMasked, label).toMatch(MASK_RE);
      }
    }
    // queue rows must actually carry idMasked
    const q = await c.call(ctx, 'GET', '/api/officer/queue?filter=all');
    expect(q.json.items.length).toBeGreaterThan(0);
    for (const it of q.json.items) expect(it.idMasked, `${user} queue ${it.caseNo}`).toMatch(MASK_RE);
    await ctx.dispose();
  }
});

test('TC-PDPA-03 แสดงเลขเต็มต้องมีเหตุผลและบันทึก Audit @P1', async ({ page, browser }) => {
  await c.reset();
  await c.freshStaff(page, 'off.reg2');
  await page.goto('/officer/cases/EG-2569-000025');
  const full = page.getByTestId('full-id');

  // 1 empty reason
  await page.getByTestId('show-full-id-btn').click();
  await page.getByTestId('unmask-submit').click();
  await expect(page.getByTestId('unmask-error')).toHaveText('กรุณากรอกเหตุผล');
  await expect(full).toHaveCount(0);
  const api400 = await c.call(page.request, 'POST', '/api/officer/cases/EG-2569-000025/unmask', { reason: '' });
  expect(api400.status).toBe(400);
  expect(api400.json.code).toBe('REASON_REQUIRED');

  // 2 whitespace only
  await page.getByTestId('unmask-reason').fill('   ');
  await page.getByTestId('unmask-submit').click();
  await expect(page.getByTestId('unmask-error')).toHaveText('กรุณากรอกเหตุผล');
  await expect(full).toHaveCount(0);

  // 3 valid reason
  await page.getByTestId('unmask-reason').fill('ตรวจสอบตัวตนซ้ำ');
  await page.getByTestId('unmask-submit').click();
  await expect(full).toHaveText('3-1006-00987-65-9');

  // 4 reload -> masked again
  await page.reload();
  await expect(page.getByTestId('applicant-id')).toHaveText('X-XXXX-XXXXX-65-9');
  await expect(page.getByTestId('full-id')).toHaveCount(0);

  // 5 audit as audit1
  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await c.uiLoginStaff(ap, 'audit1');
  await ap.goto('/audit');
  await ap.getByTestId('audit-filter-event').selectOption('UNMASK');
  await ap.getByTestId('audit-apply-btn').click();
  await expect(ap.getByTestId('audit-count')).toHaveText('1');
  const row = ap.getByTestId('audit-row');
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute('data-actor', 'off.reg2');
  await expect(row.getByTestId('audit-role')).toHaveText('officer');
  await expect(row.getByTestId('audit-case-no')).toHaveText('EG-2569-000025');
  await expect(row.getByTestId('audit-event')).toHaveText('UNMASK');
  await expect(row.getByTestId('audit-detail')).toContainText('ตรวจสอบตัวตนซ้ำ');
  await expect(row.getByTestId('audit-time')).toHaveAttribute('data-iso', '2026-12-01T09:00:00+07:00');
  await actx.close();

  // 6 other roles -> 403
  const exec = await c.apiStaff('exec1');
  const aud = await c.apiStaff('audit1');
  const cit = await c.apiCitizen(c.ID.somying);
  for (const [name, ctx] of [['exec1', exec], ['audit1', aud], ['somying', cit]]) {
    const r = await c.call(ctx, 'POST', '/api/officer/cases/EG-2569-000025/unmask', { reason: 'x' });
    expect(r.status, name).toBe(403);
  }
});

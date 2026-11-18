async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const out = [];
  const reqs = [];
  page.on('request', r => { if (r.url().includes('/api/quote')) reqs.push(r.postData()); });
  const reach = async (svc, party) => {
    await page.goto(`http://localhost:3000/th/booking?service=${svc}&party=${party}`);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    await t('booking-step1-next').click();
    await t('booking-date').waitFor();
    await t('booking-date').fill('2026-07-09');
    await t('booking-slot-14-00').click({ timeout: 8000 });
    await t('booking-step2-next').click();
    await t('booking-screen-3').waitFor();
    await page.waitForTimeout(500);
  };
  const read = async () => {
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const g = id => { const e = document.querySelector(`[data-testid="${id}"]`); return e ? e.textContent.trim().replace(/\s+/g, ' ') : null; };
      const errs = [...document.querySelectorAll('main [data-testid^="error-"]')].map(e => e.dataset.testid.slice(6) + '=' + e.textContent.trim());
      const c = document.querySelector('[data-testid="booking-confirm"]');
      return `full[${g('booking-line-full-price')}] disc[${g('booking-line-discount')}] trans[${g('booking-line-transport')}] pay[${g('booking-pay-at-shop')}] amt[${g('booking-confirm-amount')}] need[${g('booking-quote-need-input')}] errs[${errs.join('|')}] confirmDisabled=${c ? c.disabled : 'none'} extra[${g('booking-extra-shuttle')?.slice(0, 90)}]`;
    });
  };
  // first P01 raw state
  await reach('P01', 1);
  out.push('P01 initial: ' + await read());
  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="booking-shuttle"],[data-testid^="booking-toggle"]')].map(e => e.dataset.testid + ':' + e.tagName).join(','));
  out.push('ids P01: ' + ids);
  await page.screenshot({ path: 'p01-screen3-initial.png', fullPage: true });
  const ensure = async () => { if (await t('booking-shuttle-mode-distance').count() === 0) { if (await t('booking-shuttle-toggle').count() === 0) await t('booking-toggle-shuttle').click(); const c = t('booking-shuttle-toggle'); if (await c.count() && !(await c.isChecked())) await c.check(); await page.waitForTimeout(150); } };
  const setD = async v => {
    await ensure();
    await t('booking-shuttle-mode-distance').check();
    await t('booking-shuttle-distance').fill(v);
    await t('booking-shuttle-distance').blur();
  };
  const setH = async h => {
    await ensure();
    await t('booking-shuttle-mode-hotel').check();
    await t('booking-shuttle-hotel').selectOption({ value: h });
  };
  for (const v of ['14.9', '15.0', '15.1', '-1', 'abc']) { await setD(v); out.push(`P01x1 d=${v}: ` + await read()); }
  for (const h of ['H01', 'H04', 'H05', 'H06']) { await setH(h); out.push(`P01x1 ${h}: ` + await read()); }
  await reach('S01', 1);
  out.push('S01x1 no shuttle: ' + await read());
  await ensure();
  out.push('S01x1 toggled empty: ' + await read());
  for (const v of ['4.9', '5.0', '5.1', '14.9', '15.0', '15.1', '-0.1', '0.0', '5.05', 'abc', '', ' 5.0 ']) { await setD(v); out.push(`S01x1 d=${JSON.stringify(v)}: ` + await read()); }
  for (const h of ['H01', 'H02', 'H03', 'H04', 'H05', 'H06']) { await setH(h); out.push(`S01x1 ${h}: ` + await read()); }
  await page.screenshot({ path: 's01-h06.png', fullPage: true });
  for (const [p, d] of [[3, '12'], [4, '12'], [5, '12'], [6, '12'], [5, '5.0']]) {
    await reach('S01', p);
    await setD(d);
    out.push(`S01x${p} d=${d}: ` + await read());
  }
  out.push('quote sample: ' + reqs.slice(-1)[0]);
  return out.join('\n');
}

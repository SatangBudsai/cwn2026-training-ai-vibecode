async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const out = [];
  const net = [];
  page.on('response', async r => {
    if (r.request().method() === 'POST' && /\/api\/bookings$/.test(r.url())) {
      let b = ''; try { b = (await r.text()).slice(0, 700); } catch {}
      net.push(`${r.status()} REQ ${r.request().postData()} RES ${b}`);
    }
  });
  const reach = async (svc, party, date, slot) => {
    await page.goto(`http://localhost:3000/th/booking?service=${svc}&party=${party}`);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    await t('booking-step1-next').click();
    await t('booking-date').fill(date);
    await t(`booking-slot-${slot}`).click({ timeout: 8000 });
    await t('booking-step2-next').click();
    await t('booking-screen-3').waitFor();
    await page.waitForTimeout(400);
  };
  const ensure = async () => { if (await t('booking-shuttle-mode-distance').count() === 0) { if (await t('booking-shuttle-toggle').count() === 0) await t('booking-toggle-shuttle').click(); const c = t('booking-shuttle-toggle'); if (await c.count() && !(await c.isChecked())) await c.check(); await page.waitForTimeout(150); } };
  const setD = async v => { await ensure(); await t('booking-shuttle-mode-distance').check(); await t('booking-shuttle-distance').fill(v); };
  const setH = async h => { await ensure(); await t('booking-shuttle-mode-hotel').check(); await t('booking-shuttle-hotel').selectOption({ value: h }); };
  const guest = async (n) => { await t('booking-guest-name').fill('ทดสอบ C4 ' + n); await t('booking-guest-phone').fill('089400000' + n); };
  const done = async label => {
    await page.waitForTimeout(1800);
    const r = await page.evaluate(() => {
      const g = id => document.querySelector(`[data-testid="${id}"]`)?.textContent.trim().replace(/\s+/g, ' ');
      return { code: g('booking-code'), when: g('booking-done-when'), svc: g('booking-done-service'), pickup: g('booking-done-pickup'), ther: g('booking-done-therapists'), trans: g('booking-line-transport'), pay: g('booking-pay-at-shop'), conf: g('booking-confirmation')?.slice(0, 500), errs: [...document.querySelectorAll('main [data-testid^="error-"]')].map(e => e.dataset.testid + '=' + e.textContent.trim()), amt: g('booking-confirm-amount'), stale: g('booking-quote-stale') };
    });
    out.push(label + ': ' + JSON.stringify(r));
    return r;
  };
  const A = s => s;
  // A: S01 x1 5.1
  await reach('S01', 1, '2026-07-09', '10-00'); await setD('5.1'); await guest(1); await page.waitForTimeout(800);
  await t('booking-confirm').click(); await done('A S01x1 d5.1');
  await page.screenshot({ path: 'real-a-confirmation.png', fullPage: true });
  // B: race: 4.9 then 12 and immediately confirm
  await reach('S01', 1, '2026-07-09', '11-00'); await setD('4.9'); await guest(2); await page.waitForTimeout(900);
  const shownBefore = await t('booking-confirm-amount').textContent();
  await t('booking-shuttle-distance').fill('12');
  await t('booking-confirm').click({ timeout: 1500, force: false }).catch(e => out.push('B click failed ' + e.message.slice(0, 80)));
  out.push('B shown before race=' + shownBefore);
  await done('B race 4.9->12');
  await page.screenshot({ path: 'real-b-race.png', fullPage: true });
  // C: double click confirm
  await reach('S01', 1, '2026-07-09', '12-00'); await setH('H03'); await guest(3); await page.waitForTimeout(800);
  await t('booking-confirm').dblclick(); await done('C dblclick H03');
  // D: P01 x3 H04, x4 attempt
  await reach('P01', 3, '2026-07-09', '14-00'); await setH('H04'); await guest(4); await page.waitForTimeout(800);
  await t('booking-confirm').click(); await done('D P01x3 H04');
  await page.screenshot({ path: 'real-d-p01x3.png', fullPage: true });
  // E: P01 x2 couple suite 10 Jul
  await reach('P01', 2, '2026-07-10', '10-00'); await setH('H04'); await guest(5); await page.waitForTimeout(800);
  await t('booking-confirm').click(); await done('E P01x2 H04');
  // F: S01x5 d12
  await reach('S01', 5, '2026-07-10', '14-00'); await setD('12'); await guest(6); await page.waitForTimeout(800);
  await t('booking-confirm').click(); await done('F S01x5 d12');
  // G: P01x1 d=15.0
  await reach('P01', 1, '2026-07-10', '18-00'); await setD('15.0'); await guest(7); await page.waitForTimeout(800);
  await t('booking-confirm').click(); await done('G P01x1 d15.0');
  return out.join('\n') + '\n=== NET\n' + net.join('\n');
}

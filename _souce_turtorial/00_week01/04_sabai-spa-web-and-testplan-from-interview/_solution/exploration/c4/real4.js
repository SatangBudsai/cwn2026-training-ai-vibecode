async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const out = [];
  const ready = async () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const lines = async () => { await page.waitForTimeout(700); return page.evaluate(() => { const g = id => document.querySelector(`[data-testid="${id}"]`)?.textContent.trim().replace(/\s+/g, ' '); const m = document.querySelector('[data-testid="booking-shuttle-mode-distance"]'); const d = document.querySelector('[data-testid="booking-shuttle-distance"]'); const h = document.querySelector('[data-testid="booking-shuttle-hotel"]'); return JSON.stringify({ trans: g('booking-line-transport'), amt: g('booking-confirm-amount'), stale: g('booking-quote-stale'), errs: [...document.querySelectorAll('main [data-testid^="error-"]')].map(e => e.dataset.testid), dis: document.querySelector('[data-testid="booking-confirm"]')?.disabled, modeD: m?.checked, dVal: d?.value, dDis: d?.disabled, hVal: h?.value, hDis: h?.disabled, tog: document.querySelector('[data-testid="booking-shuttle-toggle"]')?.checked }); }); };
  const toSummary = async (svc, party, slot) => { await page.goto(`http://localhost:3000/th/booking?service=${svc}&party=${party}`); await ready(); await t('booking-step1-next').click(); await t('booking-date').fill('2026-07-09'); await t(`booking-slot-${slot}`).click({ timeout: 8000 }); await t('booking-step2-next').click(); await t('booking-screen-3').waitFor(); await page.waitForTimeout(300); };
  // 1 Calculator -> booking link carry-over
  await page.goto('http://localhost:3000/th/shuttle'); await ready();
  await t('shuttle-hotel').selectOption({ value: 'H04' }); await t('shuttle-party').fill('5'); await t('shuttle-calc-submit').click(); await page.waitForTimeout(500);
  const fee1 = await t('shuttle-result-fee').textContent();
  await t('shuttle-party').fill('4'); await page.waitForTimeout(400);
  const staleP = await page.evaluate(() => document.querySelector('[data-testid="shuttle-result-fee"]')?.textContent);
  out.push(`calc 5p fee=${fee1}; change party to 4 without submit -> shows ${staleP}`);
  await t('shuttle-mode-distance').check(); await t('shuttle-distance').fill('5.0'); await page.waitForTimeout(300);
  out.push('calc changed to 5.0 without submit -> shows ' + await page.evaluate(() => document.querySelector('[data-testid="shuttle-result-fee"]')?.textContent));
  await t('shuttle-mode-hotel').check(); await t('shuttle-hotel').selectOption({ value: 'H04' }); await t('shuttle-party').fill('5'); await t('shuttle-calc-submit').click(); await page.waitForTimeout(500);
  await t('shuttle-book-link').click(); await page.waitForTimeout(1000); await ready();
  out.push('shuttle-book-link -> ' + page.url() + ' pressed party=' + await page.evaluate(() => [1, 2, 3, 4, 5, 6, 7].filter(n => { const b = document.querySelector(`[data-testid="booking-party-${n}"]`); return b && (b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true'); }).join(',')));
  // 2 turn shuttle off with bad value
  await toSummary('S01', 1, '20-00');
  await t('booking-toggle-shuttle').click(); await t('booking-shuttle-toggle').check(); await t('booking-shuttle-mode-distance').check(); await t('booking-shuttle-distance').fill('15.1');
  out.push('S01 15.1: ' + await lines());
  await t('booking-shuttle-toggle').uncheck(); out.push('S01 15.1 then untick: ' + await lines());
  await t('booking-shuttle-toggle').check(); out.push('re-tick: ' + await lines());
  // 3 mode switching
  await t('booking-shuttle-mode-hotel').check(); out.push('switch hotel mode no hotel: ' + await lines());
  await t('booking-shuttle-hotel').selectOption({ value: 'H06' }); out.push('H06: ' + await lines());
  await t('booking-shuttle-mode-distance').check(); out.push('back to distance with 15.1 kept: ' + await lines());
  await t('booking-shuttle-distance').fill('1.0'); out.push('distance 1.0 after H06: ' + await lines());
  await t('booking-shuttle-mode-hotel').check(); out.push('hotel mode H06 after 1.0: ' + await lines());
  // 4 back from screen 3 keeps shuttle?
  await t('booking-shuttle-hotel').selectOption({ value: 'H04' }); out.push('H04: ' + await lines());
  await t('booking-step3-back').click(); await page.waitForTimeout(300); await t('booking-step2-next').click(); await t('booking-screen-3').waitFor(); out.push('after back+next: ' + await lines());
  // 5 switch service P01 with shuttle untouched: back to step 1 then S01 no-shuttle retained?
  await t('booking-step3-back').click(); await page.waitForTimeout(300); await t('booking-step2-back').click(); await page.waitForTimeout(300); await t('booking-service-P01').click(); await page.waitForTimeout(200); await t('booking-step1-next').click(); await page.waitForTimeout(500);
  out.push('switch to P01 screen: ' + await page.evaluate(() => [1, 2, 3].filter(n => document.querySelector(`[data-testid="booking-screen-${n}"]`)).join(',')) + ' recap=' + await page.evaluate(() => document.querySelector('[data-testid="booking-recap-when"]')?.textContent));
  // 6 real: S01 H04 then turn off, confirm → no shuttle on confirmation (own day 9 Jul 20:00)
  await toSummary('S01', 1, '20-00');
  await t('booking-toggle-shuttle').click(); await t('booking-shuttle-toggle').check(); await t('booking-shuttle-hotel').selectOption({ value: 'H04' }); out.push('real: H04: ' + await lines());
  await t('booking-shuttle-toggle').uncheck(); out.push('real: untick: ' + await lines());
  await t('booking-guest-name').fill('ทดสอบ C4 8'); await t('booking-guest-phone').fill('0894000008');
  let body = ''; page.once('request', r => { if (r.url().includes('/api/bookings')) body = r.postData(); });
  await t('booking-confirm').click(); await page.waitForTimeout(1500);
  out.push('real req=' + body + ' -> ' + await page.evaluate(() => JSON.stringify({ code: document.querySelector('[data-testid="booking-code"]')?.textContent, pickup: document.querySelector('[data-testid="booking-done-pickup"]')?.textContent, pay: document.querySelector('[data-testid="booking-pay-at-shop"]')?.textContent })));
  // 7 guest quote parity for E174, and evidence screenshots of stale summary
  await toSummary('P01', 1, '10-00');
  await t('booking-shuttle-mode-distance').check(); await t('booking-shuttle-distance').fill('14.9'); await page.waitForTimeout(600);
  await t('booking-shuttle-distance').fill('15.1'); await page.waitForTimeout(800);
  await page.screenshot({ path: 'stale-p01-15.1.png', fullPage: true });
  out.push('stale evidence: ' + await lines());
  await toSummary('S01', 4, '16-00');
  await t('booking-toggle-shuttle').click(); await t('booking-shuttle-toggle').check(); await t('booking-shuttle-mode-distance').check(); await t('booking-shuttle-distance').fill('12');
  out.push('guest S01x4 12: ' + await lines());
  return out.join('\n');
}

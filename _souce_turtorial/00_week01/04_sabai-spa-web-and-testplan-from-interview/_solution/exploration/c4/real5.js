async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const out = [];
  const ready = async () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  // E65: read-only 24 Jun 10:00 P01 x3 (B13 holds T02)
  await page.goto('http://localhost:3000/th/booking?service=P01&party=3'); await ready();
  await t('booking-step1-next').click(); await t('booking-date').fill('2026-06-24'); await page.waitForTimeout(1000);
  const s = t('booking-slot-10-00');
  out.push('E65 slot 10:00 count=' + await s.count() + ' disabled=' + (await s.count() ? await s.isDisabled() : 'n/a') + ' slots=' + await page.evaluate(() => [...document.querySelectorAll('[data-testid^="booking-slot-"]')].filter(b => !b.disabled).slice(0, 4).map(b => b.textContent.trim()).join(',')));
  // E149 summary only: U03 P01 H04, 200 points, GIFT-500, no confirm
  await page.context().clearCookies();
  await page.goto('http://localhost:3000/th/login'); await ready();
  await t('login-email').fill('fon@sabai.test'); await t('login-password').fill('Fon#2026'); await t('login-submit').click();
  await page.waitForURL(u => !u.pathname.endsWith('/login'), { timeout: 8000 });
  await page.goto('http://localhost:3000/th/booking?service=P01&party=1'); await ready();
  await t('booking-step1-next').click(); await t('booking-date').fill('2026-07-09'); await t('booking-slot-18-00').click({ timeout: 8000 }); await t('booking-step2-next').click(); await t('booking-screen-3').waitFor(); await page.waitForTimeout(300);
  await t('booking-shuttle-hotel').selectOption({ value: 'H04' }); await page.waitForTimeout(700);
  if (await t('booking-points-inc').count() === 0) { const tg = t('booking-toggle-points'); if (await tg.count()) await tg.click(); await page.waitForTimeout(200); }
  await t('booking-points-inc').click(); await page.waitForTimeout(500); await t('booking-points-inc').click(); await page.waitForTimeout(700);
  await t('booking-toggle-giftcard').click(); await t('booking-giftcard-code').fill('GIFT-500'); await t('booking-giftcard-apply').click(); await page.waitForTimeout(1000);
  out.push('E149 U03 summary: ' + await page.evaluate(() => { const g = id => document.querySelector(`[data-testid="${id}"]`)?.textContent.trim().replace(/\s+/g, ' '); return JSON.stringify({ full: g('booking-line-full-price'), disc: g('booking-line-discount'), pts: g('booking-line-points'), trans: g('booking-line-transport'), gift: g('booking-line-giftcard'), pay: g('booking-pay-at-shop'), earned: g('booking-points-earned'), errs: [...document.querySelectorAll('main [data-testid^="error-"]')].map(e => e.dataset.testid) }); }));
  await page.screenshot({ path: 'e149-summary.png', fullPage: true });
  await page.context().clearCookies();
  await page.goto('http://localhost:3000/th/shuttle'); await ready();
  out.push('test-now=' + await t('test-now').textContent());
  return out.join('\n');
}

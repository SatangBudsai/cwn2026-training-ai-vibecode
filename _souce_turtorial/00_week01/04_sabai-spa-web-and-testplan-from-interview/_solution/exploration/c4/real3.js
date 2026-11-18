async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const out = [];
  const ready = async () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const login = async (email, pw, loc = 'th') => {
    await page.context().clearCookies();
    await page.goto(`http://localhost:3000/${loc}/login`); await ready();
    await t('login-email').fill(email); await t('login-password').fill(pw); await t('login-submit').click();
    await page.waitForURL(u => !u.pathname.endsWith('/login'), { timeout: 8000 }).catch(() => out.push('login stay ' + email));
    await page.waitForTimeout(300);
  };
  const toSummary = async (loc, svc, party, date, slot) => {
    await page.goto(`http://localhost:3000/${loc}/booking?service=${svc}&party=${party}`); await ready();
    await t('booking-step1-next').click(); await t('booking-date').fill(date); await t(`booking-slot-${slot}`).click({ timeout: 8000 }); await t('booking-step2-next').click(); await t('booking-screen-3').waitFor(); await page.waitForTimeout(400);
  };
  const lines = async () => page.evaluate(() => { const g = id => document.querySelector(`[data-testid="${id}"]`)?.textContent.trim().replace(/\s+/g, ' '); return JSON.stringify({ full: g('booking-line-full-price'), disc: g('booking-line-discount'), pts: g('booking-line-points'), bal: g('booking-points-balance'), trans: g('booking-line-transport'), pay: g('booking-pay-at-shop'), amt: g('booking-confirm-amount'), birthday: !!document.querySelector('[data-testid="booking-use-birthday"]'), earned: g('booking-points-earned'), errs: [...document.querySelectorAll('main [data-testid^="error-"]')].map(e => e.dataset.testid + '=' + e.textContent.trim()) }); });
  // Read-only: U03, U05, U10 P01 H04 (no confirm) on own read-day 9 Jul
  for (const [e, p, lab] of [['fon@sabai.test', 'Fon#2026', 'E145 U03 Silver'], ['prae@sabai.test', 'Prae#2026', 'E146 U05 Gold'], ['bee@sabai.test', 'Bee#2026', 'E147 U10 Platinum']]) {
    await login(e, p);
    await toSummary('th', 'P01', 1, '2026-07-09', '18-00');
    await t('booking-shuttle-hotel').selectOption({ value: 'H04' });
    await page.waitForTimeout(800);
    out.push(lab + ' P01 H04: ' + await lines());
    await page.screenshot({ path: `${lab.split(' ')[0]}.png`, fullPage: true });
  }
  // U06 real in /zh: E174 S01 x4 12km
  await login('liwei@sabai.test', 'LiWei#2026', 'zh');
  await toSummary('zh', 'S01', 4, '2026-07-09', '18-00');
  await t('booking-toggle-shuttle').click(); await t('booking-shuttle-toggle').check().catch(() => {}); await t('booking-shuttle-mode-distance').check(); await t('booking-shuttle-distance').fill('12'); await page.waitForTimeout(900);
  out.push('E174 U06 /zh before confirm: ' + await lines());
  const hintZh = await page.evaluate(() => document.querySelector('[data-testid="booking-extra-shuttle"]')?.innerText.replace(/\s+/g, ' ').slice(0, 260));
  out.push('zh shuttle text: ' + hintZh);
  await page.screenshot({ path: 'e174-zh-summary.png', fullPage: true });
  await t('booking-confirm').click(); await page.waitForTimeout(1800);
  const conf = await page.evaluate(() => { const g = id => document.querySelector(`[data-testid="${id}"]`)?.textContent.trim().replace(/\s+/g, ' '); return JSON.stringify({ code: g('booking-code'), when: g('booking-done-when'), pickup: g('booking-done-pickup'), trans: g('booking-line-transport'), disc: g('booking-line-discount'), pay: g('booking-pay-at-shop'), url: location.pathname, errs: [...document.querySelectorAll('main [data-testid^="error-"]')].map(e => e.dataset.testid) }); });
  out.push('E174 U06 /zh after confirm: ' + conf);
  await page.screenshot({ path: 'e174-zh-confirm.png', fullPage: true });
  const code = JSON.parse(conf).code;
  // zh errors
  await toSummary('zh', 'P01', 1, '2026-07-09', '18-30');
  await t('booking-shuttle-mode-distance').check(); await t('booking-shuttle-distance').fill('15.1'); await page.waitForTimeout(800);
  out.push('zh P01 15.1: ' + await lines());
  // E64 P01 x4 U06
  await page.goto('http://localhost:3000/zh/booking?service=P01&party=4'); await ready(); await page.waitForTimeout(400);
  out.push('E64 U06 /zh P01 party=4 text: ' + (await t('booking-screen-1').innerText()).replace(/\s+/g, ' ').slice(-220));
  await page.goto('http://localhost:3000/zh/account'); await ready(); await page.waitForTimeout(800);
  out.push('U06 account: ' + await page.evaluate(c => document.querySelector(`[data-testid="account-bookings"]`)?.innerText.replace(/\s+/g, ' ').slice(0, 400), code));
  // logout then back
  await t('account-logout').click(); await page.waitForTimeout(1200);
  await page.goto('http://localhost:3000/zh/account'); await page.waitForTimeout(1200);
  out.push('after logout /zh/account -> ' + page.url());
  await page.goBack().catch(() => {});
  // Admin read-only: U07 view only
  await login('owner@sabai.test', 'Owner#2026');
  for (const d of ['2026-07-09', '2026-07-10']) {
    await page.goto('http://localhost:3000/th/admin'); await ready(); await page.waitForTimeout(500);
    await t('admin-date').fill(d); await page.waitForTimeout(1200);
    const rows = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="admin-booking-"]')].map(r => { const code = r.dataset.testid.replace('admin-booking-', ''); const g = id => document.querySelector(`[data-testid="admin-${id}-${code}"]`)?.textContent.trim().replace(/\s+/g, ' '); return `${code}|${g('time')}|${g('service')}|${g('party')}|${g('pay')}|${g('customer') || g('guest') || g('member')}`; }).join('\n'));
    out.push('ADMIN ' + d + '\n' + rows);
    const whole = await page.evaluate(() => document.querySelector('[data-testid="admin-schedule"]')?.innerText.replace(/\s+/g, ' ').slice(0, 500));
    out.push('ADMIN text ' + whole);
  }
  await page.screenshot({ path: 'admin-view.png', fullPage: true });
  await page.context().clearCookies();
  await page.goto('http://localhost:3000/th/shuttle'); await ready();
  out.push('test-now=' + await t('test-now').textContent());
  return out.join('\n');
}

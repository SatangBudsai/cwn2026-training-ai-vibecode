async (page) => {
  const out = [];
  const sleep = (ms) => page.waitForTimeout(ms);
  const tid = (t) => page.locator(`[data-testid="${t}"]`);
  const ready = () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const lines = async (label) => {
    await sleep(600);
    const s = await page.evaluate(() => [...document.querySelectorAll('[data-testid=booking-line-discount],[data-testid=booking-line-points],[data-testid=booking-line-giftcard],[data-testid=booking-pay-at-shop],[data-testid=booking-points-value],[data-testid=booking-points-balance],[data-testid=booking-giftcard-info],[data-testid=booking-quote-stale],[data-testid=booking-birthday-result],[data-testid^=error-]')].map(e => e.dataset.testid.replace('booking-', '') + '=' + e.textContent.trim()).join(' | ') + ' || confirm.dis=' + document.querySelector('[data-testid=booking-confirm]')?.disabled + ' gcInput=' + JSON.stringify(document.querySelector('[data-testid=booking-giftcard-code]')?.value) + ' guestFields=' + !!document.querySelector('[data-testid=booking-guest-name]'));
    out.push(`[${label}] ${s}`);
  };
  const login = async (email, pw) => {
    await page.evaluate(async ([email, pw]) => { await fetch('/api/auth/logout', { method: 'POST' }); if (email) await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw }) }); }, [email, pw]);
  };
  const flow = async (svc, party, date, slot = '10-00') => {
    await page.goto(`http://localhost:3000/th/booking?service=${svc}`); await ready();
    await tid(`booking-party-${party}`).click();
    await tid('booking-step1-next').click();
    await tid('booking-date').fill(date);
    await tid(`booking-slot-${slot}`).click({ timeout: 5000 });
    await tid('booking-step2-next').click();
    await tid('booking-screen-3').waitFor();
    await sleep(500);
  };
  const open = async (x) => { const t = tid(`booking-toggle-${x}`); if (await t.count()) await t.click(); };

  await page.goto('http://localhost:3000/th/login'); await ready();
  // guest: wrong card then clear field
  await login(null, null);
  await flow('S01', 1, '2026-07-08', '14-00');
  await open('giftcard');
  await tid('booking-giftcard-code').fill('GIFT-NOPE');
  await tid('booking-giftcard-apply').click(); await lines('แขก บัตรผิด');
  await tid('booking-giftcard-code').fill(''); await lines('แขก ลบช่องบัตรจนว่าง');
  await page.screenshot({ path: 'guest-gc-cleared.png', fullPage: true });
  out.push('remove btn=' + await tid('booking-giftcard-remove').count());
  await tid('booking-giftcard-code').fill('GIFT-500');
  await tid('booking-giftcard-apply').click(); await lines('แขก บัตรถูกหลังจากผิด');
  // U11: step down to 12 with birthday
  await login('por@sabai.test', 'Por#2026');
  await flow('S05', 1, '2026-06-17');
  await open('points'); await open('birthday');
  await tid('booking-points-max').click(); await sleep(400);
  await tid('booking-use-birthday').click(); await sleep(400);
  for (let i = 15; i >= 12; i--) { await tid('booking-points-dec').click(); await lines(`U11 เดือนเกิด ลดเหลือ ${i} ชุด`); }
  await page.screenshot({ path: 'u11-birthday-12sets.png', fullPage: true });
  // U10 logout: fields?
  await login('bee@sabai.test', 'Bee#2026');
  await flow('S01', 1, '2026-06-17');
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
  await tid('booking-confirm').click(); await lines('U10 ออกจากระบบ กดยืนยัน');
  await page.screenshot({ path: 'u10-logout-deadend.png', fullPage: true });
  return out.join('\n');
}

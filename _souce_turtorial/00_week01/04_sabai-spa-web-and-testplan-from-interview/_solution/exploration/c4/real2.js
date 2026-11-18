async page => {
  const t = id => page.locator(`[data-testid="${id}"]`);
  const out = [];
  const ready = async () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.goto('http://localhost:3000/th/shuttle'); await ready();
  const api = async (path, body) => page.evaluate(async ([path, body]) => { const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', 'accept-language': 'th' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); const l = j.lines || j.quote?.lines || j.quote || j.booking?.lines || {}; return r.status + ' ' + (j.error ? j.error.code + ' / ' + j.error.message : JSON.stringify({ code: j.booking?.bookingCode, cars: l.carCount ?? l.shuttleCars, fee: l.shuttleFee ?? l.transportFee, pay: l.payAtShop })); }, [path, body]);
  const base = { date: '2026-07-09', time: '16:00' };
  const q = [
    ['P01 no shuttle', { ...base, serviceId: 'P01', partySize: 1 }],
    ['P01 shuttle {}', { ...base, serviceId: 'P01', partySize: 1, shuttle: {} }],
    ['P01 15.1', { ...base, serviceId: 'P01', partySize: 1, shuttle: { distanceKm: '15.1' } }],
    ['P01 H06', { ...base, serviceId: 'P01', partySize: 1, shuttle: { hotelId: 'H06' } }],
    ['P01 x4 H04', { ...base, serviceId: 'P01', partySize: 4, shuttle: { hotelId: 'H04' } }],
    ['S01 5.05 str', { ...base, serviceId: 'S01', partySize: 1, shuttle: { distanceKm: '5.05' } }],
    ['S01 5.05 num', { ...base, serviceId: 'S01', partySize: 1, shuttle: { distanceKm: 5.05 } }],
    ['S01 -0.1 num', { ...base, serviceId: 'S01', partySize: 1, shuttle: { distanceKm: -0.1 } }],
    ['S01 15.1 num', { ...base, serviceId: 'S01', partySize: 1, shuttle: { distanceKm: 15.1 } }],
    ['S01 5 num', { ...base, serviceId: 'S01', partySize: 1, shuttle: { distanceKm: 5 } }],
    ['S01 H99', { ...base, serviceId: 'S01', partySize: 1, shuttle: { hotelId: 'H99' } }],
    ['S01 H01+15.1', { ...base, serviceId: 'S01', partySize: 1, shuttle: { hotelId: 'H01', distanceKm: '15.1' } }],
    ['S01 H06+1.0', { ...base, serviceId: 'S01', partySize: 1, shuttle: { hotelId: 'H06', distanceKm: '1.0' } }],
    ['S01 shuttle {}', { ...base, serviceId: 'S01', partySize: 1, shuttle: {} }],
    ['S01 x7 12', { ...base, serviceId: 'S01', partySize: 7, shuttle: { distanceKm: '12' } }],
  ];
  for (const [n, b] of q) out.push('QUOTE ' + n + ' -> ' + await api('/api/quote', b));
  const guest = { name: 'ทดสอบ C4 API', phone: '0894000008' };
  const w = [
    ['P01 no shuttle', { ...base, serviceId: 'P01', partySize: 1, guest, expectedPayAtShop: 2900 }],
    ['P01 15.1', { ...base, serviceId: 'P01', partySize: 1, guest, shuttle: { distanceKm: '15.1' }, expectedPayAtShop: 2900 }],
    ['P01 x4', { ...base, serviceId: 'P01', partySize: 4, guest, shuttle: { hotelId: 'H04' }, expectedPayAtShop: 11600 }],
    ['S01 5.05', { ...base, serviceId: 'S01', partySize: 1, guest, shuttle: { distanceKm: '5.05' }, expectedPayAtShop: 1000 }],
    ['S01 12 expected 1000', { ...base, serviceId: 'S01', partySize: 1, guest, shuttle: { distanceKm: '12' }, expectedPayAtShop: 1000 }],
  ];
  for (const [n, b] of w) out.push('BOOK ' + n + ' -> ' + await api('/api/bookings', b));
  // Step 1 P01 party rules
  await page.goto('http://localhost:3000/th/booking?service=P01&party=4'); await ready(); await page.waitForTimeout(400);
  const st = async () => page.evaluate(() => { const g = id => document.querySelector(`[data-testid="${id}"]`); return { parties: [1, 2, 3, 4, 5, 6, 7].map(n => { const b = g('booking-party-' + n); return n + ':' + (b ? (b.disabled ? 'dis' : 'en') + (b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true' ? '*' : '') : 'none'); }).join(' '), note: g('booking-party-note')?.textContent, max: g('booking-party-max')?.textContent, hint: g('booking-step1-hint')?.textContent, next: g('booking-step1-next')?.disabled, screen: !!g('booking-screen-1') }; });
  out.push('deep P01 party=4: ' + JSON.stringify(await st()));
  await page.screenshot({ path: 'p01-party4-deeplink.png' });
  await page.goto('http://localhost:3000/th/booking?service=S01&party=5'); await ready(); await page.waitForTimeout(300);
  await t('booking-service-P01').click(); await page.waitForTimeout(300);
  out.push('S01 x5 -> switch P01: ' + JSON.stringify(await st()));
  // Package page
  await page.goto('http://localhost:3000/th/packages/bangkok-relax'); await ready();
  out.push('PACKAGE: ' + (await t('package-price').textContent()).trim() + ' | ' + (await t('package-duration').textContent()).trim() + ' | ' + (await t('package-includes').innerText()).replace(/\s+/g, ' ') + ' | ' + (await t('package-rules').innerText()).replace(/\s+/g, ' '));
  await page.screenshot({ path: 'package.png', fullPage: true });
  await t('package-book').click(); await page.waitForTimeout(1200);
  out.push('package-book -> ' + page.url());
  // reload on screen 3 (P01) with hotel chosen
  await page.goto('http://localhost:3000/th/booking?service=P01&party=1'); await ready();
  await t('booking-step1-next').click(); await t('booking-date').fill('2026-07-09'); await t('booking-slot-18-00').click(); await t('booking-step2-next').click(); await t('booking-screen-3').waitFor();
  await t('booking-shuttle-hotel').selectOption({ value: 'H04' }).catch(async () => { await t('booking-shuttle-mode-hotel').check(); await t('booking-shuttle-hotel').selectOption({ value: 'H04' }); });
  await page.waitForTimeout(700);
  await page.reload(); await ready(); await page.waitForTimeout(600);
  out.push('reload screen3 -> ' + page.url() + ' screens=' + await page.evaluate(() => [1, 2, 3].filter(n => document.querySelector(`[data-testid="booking-screen-${n}"]`)).join(',')));
  return out.join('\n');
}

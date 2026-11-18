async (page) => {
  const out = [];
  const sleep = (ms) => page.waitForTimeout(ms);
  const tid = (t) => page.locator(`[data-testid="${t}"]`);
  const ready = () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const lines = async (label) => {
    await sleep(600);
    const s = await page.evaluate(() => [...document.querySelectorAll('[data-testid^=booking-line],[data-testid=booking-pay-at-shop],[data-testid=booking-points-value],[data-testid=booking-points-balance],[data-testid=booking-points-none],[data-testid=booking-giftcard-info],[data-testid=booking-points-earned],[data-testid=booking-quote-stale],[data-testid=booking-birthday-reason],[data-testid=booking-birthday-result],[data-testid^=error-],[data-testid=booking-login-link],[data-testid=booking-code]')].map(e => e.dataset.testid.replace('booking-', '') + '=' + e.textContent.trim()).join(' | ') + ' || dec.dis=' + document.querySelector('[data-testid=booking-points-dec]')?.disabled + ' inc.dis=' + document.querySelector('[data-testid=booking-points-inc]')?.disabled + ' confirm.dis=' + document.querySelector('[data-testid=booking-confirm]')?.disabled + ' screen=' + [1, 2, 3].filter(n => document.querySelector(`[data-testid=booking-screen-${n}]`)).join());
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
  const api = (path, body, method = 'POST') => page.evaluate(async ([path, body, method]) => { const r = await fetch(path, { method, headers: { 'content-type': 'application/json', 'x-locale': 'th' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json() }; }, [path, body, method]);
  const pointsOf = async () => (await api('/api/me', null, 'GET')).json.pointsBalance;

  await page.goto('http://localhost:3000/th/login'); await ready();

  // recovery from over-cap state (U11, read only)
  await login('por@sabai.test', 'Por#2026');
  await flow('S05', 3, '2026-06-17');
  await open('points');
  await tid('booking-points-max').click(); await sleep(400);
  await tid('booking-step3-back').click(); await sleep(200);
  await tid('booking-step2-back').click(); await sleep(200);
  await tid('booking-party-1').click(); await tid('booking-step1-next').click(); await sleep(300);
  await tid('booking-slot-10-00').click({ timeout: 5000 }).catch(() => {});
  await tid('booking-step2-next').click(); await sleep(500);
  await lines('U11 3→1 คน 17 ชุด ติดเพดาน');
  await open('points'); await lines('U11 เปิดแผงแต้ม');
  if (await tid('booking-points-dec').count() && await tid('booking-points-dec').isEnabled()) { await tid('booking-points-dec').click(); await lines('U11 กด − 1 ครั้ง (16 ชุด)'); } else out.push('U11 ปุ่ม − กดไม่ได้/ไม่มี');
  await page.screenshot({ path: 'u11-recover.png', fullPage: true });
  await flow('S05', 1, '2026-06-17');
  await open('points'); await open('birthday');
  await tid('booking-points-max').click(); await sleep(400);
  await tid('booking-use-birthday').click(); await lines('U11 16 ชุด+เดือนเกิด');
  await tid('booking-points-max').click(); await lines('U11 กดแลกสูงสุดอีกครั้ง (ควรเหลือ 12 ชุด ฿40)');
  await tid('booking-points-dec').click(); await lines('U11 กด −');

  // U05 birthday used + reload + stale points + UI error
  await login('prae@sabai.test', 'Prae#2026');
  await flow('S01', 1, '2026-06-17');
  await open('birthday'); await lines('U05 S01 ใช้สิทธิ์แล้ว');
  out.push('U05 birthday disabled=' + await tid('booking-use-birthday').isDisabled().catch(() => 'no control'));
  await open('points');
  await tid('booking-points-inc').click(); await lines('U05 แลก 1 ชุด E94');
  // spend the points from another tab, then confirm stale screen
  const other = await api('/api/bookings', { serviceId: 'S01', partySize: 1, date: '2026-06-17', time: '14:00', therapistId: 'ANY', pointsToRedeem: 100, expectedPayAtShop: 900 });
  out.push('U05 แท็บอื่นจอง ' + other.status + ' เหลือแต้ม ' + await pointsOf());
  await tid('booking-confirm').click(); await lines('U05 กดยืนยันหน้าจอเก่าหลังแต้มหมด');
  await page.screenshot({ path: 'u05-stale-points.png', fullPage: true });
  if (other.json.booking) out.push('cancel ' + (await api(`/api/bookings/${other.json.booking.id}/cancel`, {})).status + ' แต้ม ' + await pointsOf());
  await page.reload(); await ready(); await lines('U05 รีโหลดกลางทาง');

  // U10 logged out at summary
  await login('bee@sabai.test', 'Bee#2026');
  await flow('S01', 1, '2026-06-17');
  await open('points');
  await tid('booking-points-max').click(); await lines('U10 แลกสูงสุด E97');
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
  await tid('booking-confirm').click(); await lines('U10 ออกจากระบบแล้วกดยืนยัน (มีแต้ม)');
  await page.screenshot({ path: 'u10-logout-confirm-points.png', fullPage: true });
  await login('bee@sabai.test', 'Bee#2026');
  await flow('S01', 1, '2026-06-17');
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
  await tid('booking-confirm').click(); await lines('U10 ออกจากระบบแล้วกดยืนยัน (ไม่มีแต้ม)');
  await page.screenshot({ path: 'u10-logout-confirm.png', fullPage: true });
  const stray = await api('/api/admin/schedule?date=2026-06-17', null, 'GET');
  out.push('admin ไม่ login status=' + stray.status);

  // guest UI
  await login(null, null);
  await flow('S01', 1, '2026-07-08', '14-00');
  out.push('guest extras: ' + await page.evaluate(() => [...document.querySelectorAll('[data-testid^=booking-toggle],[data-testid=booking-guest-note],[data-testid=booking-login-link]')].map(e => e.dataset.testid + '=' + e.textContent.trim().slice(0, 50)).join(' | ')));
  await lines('แขก S01 E150');
  await tid('booking-confirm').click(); await lines('แขก ยืนยันเปล่า');
  await tid('booking-guest-name').fill('แขก C3');
  await tid('booking-guest-phone').fill('12345');
  await tid('booking-confirm').click(); await lines('แขก เบอร์สั้น');
  await tid('booking-guest-phone').fill('0893000001');
  await open('giftcard');
  await tid('booking-giftcard-code').fill('gift-2199');
  await tid('booking-giftcard-apply').click(); await lines('แขก บัตรตัวเล็ก');
  await page.screenshot({ path: 'guest-gc-lower.png', fullPage: true });
  await tid('booking-giftcard-code').fill('GIFT-NOPE');
  await tid('booking-giftcard-apply').click(); await lines('แขก บัตรไม่มี');
  await tid('booking-giftcard-code').fill('');
  out.push('แขก apply ว่าง disabled=' + await tid('booking-giftcard-apply').isDisabled());
  const reqs = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => /api\/bookings/.test(e.name)).length);
  out.push('แขก POST bookings count=' + reqs);

  // E159 real via API then reuse leftover card + empty card, as U03
  await login('fon@sabai.test', 'Fon#2026');
  const e157 = await api('/api/bookings', { serviceId: 'S04', partySize: 1, date: '2026-07-08', time: '10:00', therapistId: 'ANY', pointsToRedeem: 200, shuttle: { hotelId: 'H04' }, giftCardCode: 'GIFT-2199', expectedPayAtShop: 1 });
  out.push('E157 ' + e157.status);
  const e159 = await api('/api/bookings', { serviceId: 'S04', partySize: 1, date: '2026-07-07', time: '10:00', therapistId: 'ANY', giftCardCode: 'GIFT-2201', expectedPayAtShop: 0 });
  out.push('GIFT-2201 S04 ' + e159.status + ' เหลือ ' + (await api('/api/gift-cards/GIFT-2201', null, 'GET')).json.giftCard.balance);
  const q0 = await api('/api/quote', { serviceId: 'S01', partySize: 1, date: '2026-07-08', time: '14:00', giftCardCode: 'GIFT-2199' });
  out.push('quote บัตรยอด 0: ' + q0.status + ' ' + JSON.stringify(q0.json.error ?? q0.json.lines));
  await flow('S01', 1, '2026-07-08', '14-00');
  await open('points'); await lines('U03 หลังแลกเหลือ 50 แต้ม');
  await open('giftcard');
  await tid('booking-giftcard-code').fill('GIFT-2199');
  await tid('booking-giftcard-apply').click(); await lines('U03 บัตรยอด 0');
  await page.screenshot({ path: 'u03-gc-empty.png', fullPage: true });
  out.push('cancel ' + (await api(`/api/bookings/${e157.json.booking.id}/cancel`, {})).status + ' ' + (await api(`/api/bookings/${e159.json.booking.id}/cancel`, {})).status + ' แต้ม ' + await pointsOf() + ' บัตร ' + (await api('/api/gift-cards/GIFT-2199', null, 'GET')).json.giftCard.balance + ' ' + (await api('/api/gift-cards/GIFT-2201', null, 'GET')).json.giftCard.balance);

  // U10 race retry with the right expected amount, plus P01 and mixed quotes
  await login('bee@sabai.test', 'Bee#2026');
  const race = await page.evaluate(async () => Promise.all([10, 11, 12, 13, 14].map(async (h) => { const r = await fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json', 'x-locale': 'th' }, body: JSON.stringify({ serviceId: 'S01', partySize: 1, date: '2026-07-06', time: `${h}:30`, therapistId: 'ANY', pointsToRedeem: 100, expectedPayAtShop: 850 }) }); const j = await r.json(); return { s: r.status, c: j.error?.code, id: j.booking?.id, p: j.booking?.lines?.pointsRedeemed }; })));
  out.push('race U10 ' + JSON.stringify(race.map(x => [x.s, x.c ?? x.p])) + ' แต้ม ' + await pointsOf());
  const okIds = race.filter(x => x.id).map(x => x.id);
  for (const id of okIds) await api(`/api/bookings/${id}/cancel`, {});
  out.push('หลังยกเลิก race แต้ม ' + await pointsOf());
  for (const [n, b] of [
    ['P01 Plat 2 ชุด H04', { serviceId: 'P01', partySize: 1, date: '2026-07-08', time: '10:00', pointsToRedeem: 200, shuttle: { hotelId: 'H04' } }],
    ['P01 Plat H01', { serviceId: 'P01', partySize: 3, date: '2026-07-08', time: '10:00', shuttle: { hotelId: 'H01' } }],
    ['P01 Plat H06', { serviceId: 'P01', partySize: 1, date: '2026-07-08', time: '10:00', shuttle: { hotelId: 'H06' } }],
    ['S01 4 คน 2 ชุด', { serviceId: 'S01', partySize: 4, date: '2026-07-08', time: '10:00', pointsToRedeem: 200 }],
    ['S01 คู่ 1 ชุด', { serviceId: 'S01', partySize: 2, date: '2026-07-08', time: '10:00', pointsToRedeem: 100, giftCardCode: 'GIFT-500' }],
  ]) { const q = await api('/api/quote', b); out.push(`${n}: ${q.status} ${JSON.stringify(q.json.error?.code ?? q.json.lines)} earn=${q.json.pointsEarnedPreview}`); }
  out.push('clock ' + JSON.stringify((await api('/api/clock', null, 'GET')).json));
  return out.join('\n');
}

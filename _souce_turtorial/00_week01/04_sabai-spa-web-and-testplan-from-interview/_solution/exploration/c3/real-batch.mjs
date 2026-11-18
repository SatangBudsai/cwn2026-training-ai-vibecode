// C3: real bookings ONLY on C3 days (17 Jun, 6-8 Jul), accounts U03/U05/U10, cards GIFT-2199/2200/2201. Cancels everything it creates.
const B = 'http://localhost:3000';
const U = { U03: ['fon@sabai.test', 'Fon#2026'], U05: ['prae@sabai.test', 'Prae#2026'], U10: ['bee@sabai.test', 'Bee#2026'], U07: ['owner@sabai.test', 'Owner#2026'] };
const J = { 'content-type': 'application/json', 'x-locale': 'th' };
const ck = {};
for (const u of Object.keys(U)) {
  const r = await fetch(B + '/api/auth/login', { method: 'POST', headers: J, body: JSON.stringify({ email: U[u][0], password: U[u][1] }) });
  ck[u] = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}
const h = u => (u ? { ...J, cookie: ck[u] } : J);
const pts = async u => { const m = await (await fetch(B + '/api/me', { headers: h(u) })).json(); return `pts=${m.pointsBalance} spend=${m.lifetimeSpend}`; };
const card = async c => (await (await fetch(B + '/api/gift-cards/' + c)).json()).giftCard.balance;
const created = [];
async function book(u, body) {
  const r = await fetch(B + '/api/bookings', { method: 'POST', headers: h(u), body: JSON.stringify(body) });
  const j = await r.json();
  if (j.booking) { created.push([u, j.booking.id, j.booking.bookingCode]); const l = j.booking.lines; return `201 ${j.booking.bookingCode} ${j.booking.date} ${j.booking.time} ${j.booking.therapists?.map(t => t.id)} pct=${l.discountPercent}${l.discountSource} pts=${l.pointsRedeemed} net=${l.serviceNet} trans=${l.transportFee} gc=${l.giftCardAmount} pay=${l.payAtShop}`; }
  return `${r.status} ${j.error?.code}: ${j.error?.message}`;
}
const cancel = async (u, id) => { const r = await fetch(`${B}/api/bookings/${id}/cancel`, { method: 'POST', headers: h(u), body: '{}' }); const j = await r.json(); return `${r.status} ${j.error?.code ?? 'ok'}`; };
const cancelAll = async () => { while (created.length) { const [u, id] = created.pop(); console.log('  cancel', id.slice(0, 8), await cancel(u, id)); } };
const A = (o) => ({ partySize: 1, therapistId: 'ANY', ...o });
const log = (...a) => console.log(...a);

log('START', await pts('U03'), '|', await pts('U05'), '|', await pts('U10'), '| cards', await card('GIFT-2199'), await card('GIFT-2200'), await card('GIFT-2201'));

log('\n# E157 จริง U03');
log(await book('U03', A({ serviceId: 'S04', date: '2026-07-08', time: '10:00', pointsToRedeem: 200, shuttle: { hotelId: 'H04' }, giftCardCode: 'GIFT-2199', expectedPayAtShop: 1 })));
log(await pts('U03'), 'card', await card('GIFT-2199'));
const sch = await (await fetch(B + '/api/admin/schedule?date=2026-07-08', { headers: h('U07') })).json();
log('admin schedule 8 Jul sample', JSON.stringify(sch).slice(0, 900));
await cancelAll(); log(await pts('U03'), 'card', await card('GIFT-2199'));

log('\n# E158 จริง U03');
log(await book('U03', A({ serviceId: 'S04', date: '2026-07-08', time: '10:00', pointsToRedeem: 200, shuttle: { hotelId: 'H04' }, giftCardCode: 'GIFT-2200', expectedPayAtShop: 0 })));
log(await pts('U03'), 'card', await card('GIFT-2200'));
await cancelAll(); log(await pts('U03'), 'card', await card('GIFT-2200'));

log('\n# expectedPayAtShop ผิด / ไม่ส่ง (U10 17 มิ.ย.)');
log('wrong:', await book('U10', A({ serviceId: 'S01', date: '2026-06-17', time: '10:00', expectedPayAtShop: 1 })), await pts('U10'));
log('missing:', await book('U10', A({ serviceId: 'S01', date: '2026-06-17', time: '10:00' })), await pts('U10'));
await cancelAll();
log('client-sent lines ignored?:', await book('U10', A({ serviceId: 'S01', date: '2026-06-17', time: '10:00', expectedPayAtShop: 900, lines: { payAtShop: 1 }, discountPercent: 90 })), await pts('U10'));
await cancelAll();

log('\n# E97 จริง U10 + admin');
log(await book('U10', A({ serviceId: 'S01', date: '2026-06-17', time: '10:00', pointsToRedeem: 200, expectedPayAtShop: 800 })), await pts('U10'));
const sch2 = await (await fetch(B + '/api/admin/schedule?date=2026-06-17', { headers: h('U07') })).json();
log('admin 17 Jun', JSON.stringify(sch2).slice(0, 700));
log('quote after spend, ask 100 pts:', (await (await fetch(B + '/api/quote', { method: 'POST', headers: h('U10'), body: JSON.stringify({ serviceId: 'S01', partySize: 1, date: '2026-06-17', time: '12:00', pointsToRedeem: 100 }) })).json()).error?.code);
// cancel race: refund must happen once
const id = created[0][1];
log('cancel race:', (await Promise.all([1, 2, 3, 4].map(() => cancel('U10', id)))).join(' / '), await pts('U10'));
created.length = 0;

log('\n# race แต้ม U05 มี 100 แต้ม จองพร้อมกัน 2 ใบ ใบละ 100 แต้ม (6 ก.ค.)');
log((await Promise.all([10, 12].map(t => book('U05', A({ serviceId: 'S01', date: '2026-07-06', time: `${t}:00`, pointsToRedeem: 100, expectedPayAtShop: 900 }))))).join('\n'));
log(await pts('U05'));
await cancelAll(); log(await pts('U05'));

log('\n# race แต้ม U10 มี 200 แต้ม จองพร้อมกัน 5 ใบ ใบละ 100 แต้ม (6 ก.ค.)');
log((await Promise.all([10, 11, 12, 13, 14].map(t => book('U10', A({ serviceId: 'S01', date: '2026-07-06', time: `${t}:30`, pointsToRedeem: 100, expectedPayAtShop: 800 }))))).join('\n'));
log(await pts('U10'));
await cancelAll(); log(await pts('U10'));

log('\n# race บัตร GIFT-2200 U03 S04 2 ใบพร้อมกัน ใบละ ฿2,000 (7 ก.ค.)');
log((await Promise.all([10, 13].map(t => book('U03', A({ serviceId: 'S04', date: '2026-07-07', time: `${t}:00`, giftCardCode: 'GIFT-2200', expectedPayAtShop: 0 }))))).join('\n'));
log('card', await card('GIFT-2200'));
await cancelAll(); log('card', await card('GIFT-2200'));

log('\n# U05 เดือนเกิดใช้แล้ว ส่ง useBirthday ตอนจอง expected 800 แล้ว 950');
log(await book('U05', A({ serviceId: 'S01', date: '2026-06-17', time: '10:00', useBirthday: true, expectedPayAtShop: 800 })));
log(await book('U05', A({ serviceId: 'S01', date: '2026-06-17', time: '10:00', useBirthday: true, expectedPayAtShop: 950 })));
await cancelAll();

log('\n# แขก แลกแต้ม/จองปกติ 8 ก.ค. เบอร์ 0893000001');
log(await book(null, A({ serviceId: 'S01', date: '2026-07-08', time: '14:00', pointsToRedeem: 100, guestName: 'แขก C3', guestPhone: '0893000001', expectedPayAtShop: 950 })));
log('END', await pts('U03'), '|', await pts('U05'), '|', await pts('U10'), '| cards', await card('GIFT-2199'), await card('GIFT-2200'), await card('GIFT-2201'));
log('clock', JSON.stringify(await (await fetch(B + '/api/clock')).json()));

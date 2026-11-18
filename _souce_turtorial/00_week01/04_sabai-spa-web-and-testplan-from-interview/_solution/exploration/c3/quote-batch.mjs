// C3: read-only quote batch. Only POST /api/quote, GET /api/me, GET gift-card, login. Never confirms.
const B = 'http://localhost:3000';
const U = {
  U02: ['ton@sabai.test', 'Ton#2026'], U03: ['fon@sabai.test', 'Fon#2026'], U05: ['prae@sabai.test', 'Prae#2026'],
  U08: ['kan@sabai.test', 'Kan#2026'], U09: ['win@sabai.test', 'Win#2026'], U10: ['bee@sabai.test', 'Bee#2026'],
  U11: ['por@sabai.test', 'Por#2026'],
};
const J = { 'content-type': 'application/json', 'x-locale': 'th' };
const cookies = {};
async function login(u) {
  const r = await fetch(B + '/api/auth/login', { method: 'POST', headers: J, body: JSON.stringify({ email: U[u][0], password: U[u][1] }) });
  if (!r.ok) throw new Error('login ' + u + ' ' + r.status + ' ' + await r.text());
  cookies[u] = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}
const hdr = u => (u ? { ...J, cookie: cookies[u] } : J);
const me = async u => { const j = await (await fetch(B + '/api/me', { headers: hdr(u) })).json(); return { spend: j.lifetimeSpend, pts: j.pointsBalance, tier: j.tier }; };
const gc = async c => { const j = await (await fetch(B + '/api/gift-cards/' + c)).json(); return j.balance ?? j.balanceRemaining ?? JSON.stringify(j); };
async function q(u, body) {
  const r = await fetch(B + '/api/quote', { method: 'POST', headers: hdr(u), body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) return `HTTP ${r.status} ${j.error.code}: ${j.error.message}`;
  const l = j.lines;
  return `HTTP ${r.status} tier=${j.tier} full=${l.fullPrice} ${l.discountPercent}%${l.discountSource}=-${l.discountAmount} pts=${l.pointsRedeemed}/-${l.pointsDiscount} net=${l.serviceNet} car=${l.cars}/${l.transportFee} before=${l.totalBeforeGiftCard} gc=-${l.giftCardAmount} pay=${l.payAtShop} | bal=${j.points?.balance} maxSets=${j.points?.maxSets} earn=${j.pointsEarnedPreview} bday=${j.birthday?.offered}/${j.birthday?.eligible}/${j.birthday?.applied}/${j.birthday?.reason} card=${j.giftCard ? j.giftCard.balanceBefore + '>' + j.giftCard.balanceAfter : '-'}`;
}
const D = '2026-07-08', DJ = '2026-06-17', T = '10:00';
const b = (serviceId, partySize, extra = {}, date = D, time = T) => ({ serviceId, partySize, date, time, ...extra });
const cases = [
  ['E104', 'U03', b('S01', 1)], ['E105', 'U08', b('S01', 1)], ['E106', 'U09', b('S01', 1)], ['E107', 'U05', b('S01', 1)], ['E108', 'U02', b('S01', 1)], ['E109', 'U10', b('S01', 1)],
  ['E94', 'U05', b('S01', 1, { pointsToRedeem: 100 })], ['E95 E151', 'U08', b('S01', 1, { pointsToRedeem: 100 })], ['E96', 'U09', b('S01', 1, { pointsToRedeem: 100 })],
  ['E96+ 199 ask200', 'U09', b('S01', 1, { pointsToRedeem: 200 })], ['E97', 'U10', b('S01', 1, { pointsToRedeem: 200 })], ['E98', 'U03', b('S01', 1, { pointsToRedeem: 200 })],
  ['E99 150', 'U03', b('S01', 1, { pointsToRedeem: 150 })], ['E99 ask300 of250', 'U03', b('S01', 1, { pointsToRedeem: 300 })],
  ['pts U02 0pts ask100', 'U02', b('S01', 1, { pointsToRedeem: 100 })], ['pts anon', null, b('S01', 1, { pointsToRedeem: 100 })],
  ['pts 0', 'U03', b('S01', 1, { pointsToRedeem: 0 })], ['pts -100', 'U03', b('S01', 1, { pointsToRedeem: -100 })], ['pts 100.5', 'U03', b('S01', 1, { pointsToRedeem: 100.5 })], ['pts "100"', 'U03', b('S01', 1, { pointsToRedeem: '100' })], ['pts null', 'U03', b('S01', 1, { pointsToRedeem: null })], ['pts 1e9', 'U03', b('S01', 1, { pointsToRedeem: 1e9 })],
  ['E100', 'U11', b('S05', 1, { pointsToRedeem: 1500 })], ['E101', 'U11', b('S05', 1, { pointsToRedeem: 1600 })], ['E102', 'U11', b('S05', 1, { pointsToRedeem: 1700 })], ['E103', 'U11', b('S05', 1, { pointsToRedeem: 1600, shuttle: { hotelId: 'H04' } })], ['E102+รถ 17ชุด', 'U11', b('S05', 1, { pointsToRedeem: 1700, shuttle: { hotelId: 'H04' } })],
  ['U11 S05 base', 'U11', b('S05', 1)], ['U11 S05 x3 17ชุด', 'U11', b('S05', 3, { pointsToRedeem: 1700 })],
  ['U11 bday S05 12ชุด', 'U11', b('S05', 1, { useBirthday: true, pointsToRedeem: 1200 }, DJ)], ['U11 bday S05 13ชุด', 'U11', b('S05', 1, { useBirthday: true, pointsToRedeem: 1300 }, DJ)],
  ['U09 Gold S05 15ชุด', 'U09', b('S05', 1, { pointsToRedeem: 100 })],
  ['E129', 'U02', b('S01', 1, { useBirthday: true }, DJ)], ['E132', 'U02', b('S02', 1, { useBirthday: true }, DJ)], ['E133', 'U02', b('S03', 1, { useBirthday: true }, DJ)], ['E134', 'U02', b('S04', 1, { useBirthday: true }, DJ)], ['E135', 'U02', b('S05', 1, { useBirthday: true }, DJ)], ['E136', 'U02', b('S06', 1, { useBirthday: true }, DJ)], ['E137', 'U02', b('S07', 1, { useBirthday: true }, DJ)],
  ['E130', 'U02', b('P01', 1, { useBirthday: true, shuttle: { hotelId: 'H04' } }, DJ)], ['E130 nobday', 'U02', b('P01', 1, { shuttle: { hotelId: 'H04' } }, DJ)], ['E131 K01', 'U02', b('K01', 1, { useBirthday: true }, DJ)],
  ['bday นอกเดือน U02 1ก.ค.', 'U02', b('S01', 1, { useBirthday: true }, '2026-07-01')], ['bday U05 ใช้แล้ว', 'U05', b('S01', 1, { useBirthday: true }, DJ)], ['bday U03 ไม่ใช่เดือน', 'U03', b('S01', 1, { useBirthday: true }, DJ)], ['bday anon', null, b('S01', 1, { useBirthday: true }, DJ)],
  ['E138', 'U08', b('S01', 3)], ['E139', 'U02', b('S01', 4, {}, DJ)], ['E140', 'U02', b('S01', 4, { useBirthday: true }, DJ)], ['E141', 'U08', b('S01', 4)], ['E142', 'U02', b('S04', 2, {}, DJ)], ['E143', null, b('S04', 2)], ['E150', null, b('S01', 1)],
  ['E67', null, b('S01', 3)], ['E68', null, b('S01', 4)], ['Silver U03 3คน', 'U03', b('S01', 3)], ['U10 กลุ่ม6', 'U10', b('S01', 6)], ['กลุ่ม 7', null, b('S01', 7)],
  ['P01 Plat แต้ม', 'U10', b('P01', 1, { pointsToRedeem: 200 })], ['P01 Gold', 'U08', b('P01', 1)], ['P01 x3 แขก', null, b('P01', 3)], ['P01 x4', null, b('P01', 4)],
  ['E157', 'U03', b('S04', 1, { pointsToRedeem: 200, shuttle: { hotelId: 'H04' }, giftCardCode: 'GIFT-2199' })], ['E158', 'U03', b('S04', 1, { pointsToRedeem: 200, shuttle: { hotelId: 'H04' }, giftCardCode: 'GIFT-2200' })], ['E159', 'U03', b('S04', 1, { pointsToRedeem: 200, shuttle: { hotelId: 'H04' }, giftCardCode: 'GIFT-2201' })],
  ['gc ตัวเล็ก', 'U03', b('S01', 1, { giftCardCode: 'gift-2199' })], ['gc เว้นวรรค', 'U03', b('S01', 1, { giftCardCode: ' GIFT-2199 ' })], ['gc ไม่มี', 'U03', b('S01', 1, { giftCardCode: 'GIFT-NOPE' })], ['gc แขก', null, b('S01', 1, { giftCardCode: 'GIFT-2199' })],
  ['วันนี้', 'U03', b('S01', 1, {}, '2026-06-15')], ['เกินช่วง', 'U03', b('S01', 1, {}, '2026-07-16')], ['เปล่า', null, {}], ['service ผิด', null, b('X99', 1)], ['party 0', null, b('S01', 0)], ['party 1.5', null, b('S01', 1.5)],
];
for (const u of Object.keys(U)) await login(u);
const before = {};
for (const u of Object.keys(U)) before[u] = await me(u);
const gcs = ['GIFT-500', 'GIFT-2199', 'GIFT-2200', 'GIFT-2201'];
const gcBefore = {};
for (const c of gcs) gcBefore[c] = await gc(c);
console.log('BEFORE', JSON.stringify(before), JSON.stringify(gcBefore));
for (const [name, u, body] of cases) console.log(`${name} [${u ?? 'guest'}]: ${await q(u, body)}`);
const after = {};
for (const u of Object.keys(U)) after[u] = await me(u);
const gcAfter = {};
for (const c of gcs) gcAfter[c] = await gc(c);
console.log('AFTER', JSON.stringify(after), JSON.stringify(gcAfter));
console.log('SAME', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(gcBefore) === JSON.stringify(gcAfter));
console.log('clock', JSON.stringify(await (await fetch(B + '/api/clock')).json()));

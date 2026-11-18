export const B = 'http://localhost:3000';
export const U = { U01: ['nida@sabai.test', 'Nida#2026'], U02: ['ton@sabai.test', 'Ton#2026'], U03: ['fon@sabai.test', 'Fon#2026'], U04: ['may@sabai.test', 'May#2026'], U05: ['prae@sabai.test', 'Prae#2026'], U06: ['liwei@sabai.test', 'LiWei#2026'], U07: ['owner@sabai.test', 'Owner#2026'], U09: ['win@sabai.test', 'Win#2026'], U11: ['por@sabai.test', 'Por#2026'], U12: ['muk@sabai.test', 'Muk#2026'] };
const J = { 'content-type': 'application/json', 'x-locale': 'th' };
let ck = {};
export const log = (...a) => console.log(...a);
export const h = u => (u ? { ...J, cookie: ck[u] } : J);
export async function login() {
  ck = {};
  await Promise.all(Object.keys(U).map(async u => {
    const r = await fetch(B + '/api/auth/login', { method: 'POST', headers: J, body: JSON.stringify({ email: U[u][0], password: U[u][1] }) });
    ck[u] = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }));
}
export async function post(path, body, u) {
  const r = await fetch(B + path, { method: 'POST', headers: h(u), body: JSON.stringify(body ?? {}) });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
}
export async function get(path, u) {
  const r = await fetch(B + path, { headers: h(u) });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
}
export async function resetAt(now = '2026-06-15T10:00:00+07:00') {
  const a = await post('/api/test/lock', { now }); const b = await post('/api/test/reset', { now });
  const c = await get('/api/clock');
  await login();
  return `lock ${a.s} reset ${b.s} clock ${JSON.stringify(c.j?.now ?? c.j)}`;
}
export const me = async u => { const m = (await get('/api/me', u)).j; return { pts: m.pointsBalance, spend: m.lifetimeSpend, tier: m.tier ?? m.tierLevel }; };
export const card = async c => { const j = (await get('/api/gift-cards/' + c)).j; return j.giftCard ? { bal: j.giftCard.balance, status: j.giftCard.status, exp: j.giftCard.expiresOn ?? j.giftCard.expiresAt } : j; };
export const sched = async d => { const j = (await get('/api/admin/schedule?date=' + d, 'U07')).j; return j.bookings ?? j.schedule ?? j; };
export const byCode = async (d, code) => { const a = await sched(d); return Array.isArray(a) ? a.find(b => b.bookingCode === code) : null; };
export const short = (x) => { const j = x.j; if (j?.booking) { const b = j.booking, l = b.lines ?? {}; return `${x.s} ${b.bookingCode} ${b.date} ${b.time} [${b.therapists?.map(t => t.id)}] pct=${l.discountPercent}${l.discountSource} pts=${l.pointsRedeemed} net=${l.serviceNet} trans=${l.transportFee} gc=${l.giftCardAmount} pay=${l.payAtShop} status=${b.status}`; } if (j?.error) return `${x.s} ${j.error.code}: ${j.error.message}`; return `${x.s} ${JSON.stringify(j).slice(0, 400)}`; };
// จองผ่าน quote ก่อนเพื่อได้ expectedPayAtShop
export async function book(u, o) {
  const body = { partySize: 1, therapistId: 'ANY', ...o };
  const q = await post('/api/quote', body, u);
  const pay = q.j?.lines?.payAtShop ?? q.j?.quote?.lines?.payAtShop ?? q.j?.quote?.payAtShop ?? q.j?.payAtShop;
  if (pay == null) return { s: q.s, j: q.j, quote: q };
  return post('/api/bookings', { ...body, expectedPayAtShop: pay }, u);
}
export const complete = (id) => post(`/api/admin/bookings/${id}/complete`, {}, 'U07');

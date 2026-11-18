#!/usr/bin/env node
// ตรวจค่าขอบ E ใน TEST-DATA ข้อ 7 ผ่าน API จริง 227 แถว (ไม่รวม 26 แถว unit test)
// ค่าคาดหวังทุกตัวลอกจากคอลัมน์ "ผลที่ถูก" ของ TEST-DATA · รหัส error มาจาก API-CONTRACT
//
// ใช้: node scripts/verify-edges.mjs http://localhost:3102 [--only=E28,E33]
// เซิร์ฟเวอร์ต้องเปิด ALLOW_TEST_RESET=1 · reset ก่อนทุกแถว จึงรันซ้ำได้ผลเดิม

const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith('--')) ?? '').replace(/\/+$/, '');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice('--only='.length).split(',') ?? null;
if (!BASE) {
  console.error('ใช้: node scripts/verify-edges.mjs <base-url> [--only=E01,E02]');
  process.exit(2);
}

// ---------- รายการรหัส ----------
const TOTAL = 227;
const UNIT_TEST_IDS = [
  66, 81, 82, 83, 84, 85, 86, 87, 126, 127, 128, 153, 154, 155, 156, 209, 210, 211, 212, 213, 214, 223, 224, 225, 227, 236,
].map((n) => `E${String(n).padStart(2, '0')}`);
const pad = (n) => `E${String(n).padStart(2, '0')}`;
const EXPECTED_IDS = Array.from({ length: 253 }, (_, i) => pad(i + 1)).filter((id) => !UNIT_TEST_IDS.includes(id));

// ---------- ค่าคงที่จาก TEST-DATA ----------
const NOW_DEFAULT = '2026-06-15T10:00:00+07:00';
const D = '2026-06-17'; // ไม่ระบุวันนัดใช้ 17 มิ.ย. 12:00
const T = '12:00';
const GUEST = { name: 'คุณทดสอบ สคริปต์', phone: '0890009999' };

const USERS = {
  U01: ['nida@sabai.test', 'Nida#2026'],
  U02: ['ton@sabai.test', 'Ton#2026'],
  U03: ['fon@sabai.test', 'Fon#2026'],
  U04: ['may@sabai.test', 'May#2026'],
  U05: ['prae@sabai.test', 'Prae#2026'],
  U06: ['liwei@sabai.test', 'LiWei#2026'],
  U07: ['owner@sabai.test', 'Owner#2026'],
  U08: ['kan@sabai.test', 'Kan#2026'],
  U09: ['win@sabai.test', 'Win#2026'],
  U10: ['bee@sabai.test', 'Bee#2026'],
  U11: ['por@sabai.test', 'Por#2026'],
  U12: ['muk@sabai.test', 'Muk#2026'],
};

const CALL = '02-123-4567';
const H04 = { hotelId: 'H04' };
const km = (distanceKm) => ({ distanceKm });
const hotel = (hotelId) => ({ hotelId });

// ---------- HTTP ----------
class Client {
  constructor(cookie = null) {
    this.cookie = cookie;
  }
  get isGuest() {
    return this.cookie === null;
  }
  async req(method, path, body) {
    const headers = { 'x-locale': 'th', accept: 'application/json' };
    if (this.cookie) headers.cookie = this.cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { status: res.status, data, text, setCookie: res.headers.getSetCookie?.() ?? [] };
  }
  get(path) {
    return this.req('GET', path);
  }
  post(path, body = {}) {
    return this.req('POST', path, body);
  }
  withDefaults(body) {
    const full = { partySize: 1, date: D, time: T, ...body };
    if (this.isGuest && full.guest === undefined) full.guest = GUEST;
    return full;
  }
  quote(body) {
    return this.post('/api/quote', this.withDefaults(body));
  }
  book(body) {
    return this.post('/api/bookings', this.withDefaults(body));
  }
  slots({ service, date = D, party = 1, therapist, course }) {
    const q = new URLSearchParams({ service, date, party: String(party) });
    if (therapist) q.set('therapist', therapist);
    if (course) q.set('course', course);
    return this.get(`/api/availability?${q}`);
  }
  me() {
    return this.get('/api/me');
  }
  wallet() {
    return this.get('/api/wallet');
  }
  buyGiftCard(amount, design = 'ORCHID', channel = 'LINE') {
    return this.post('/api/gift-cards', { amount, design, channel });
  }
  buyCourse(body = {}) {
    return this.post('/api/courses/purchase', body);
  }
  giftCard(code) {
    return this.get(`/api/gift-cards/${code}`);
  }
}

class RowAbort extends Error {}

async function resetTo(now) {
  const res = await new Client().post('/api/test/reset', { now });
  if (res.status !== 200) throw new RowAbort(`reset ไม่สำเร็จ: HTTP ${res.status} ${res.text.slice(0, 200)}`);
}

// ---------- ตัวตรวจของแต่ละแถว ----------
class RowContext {
  constructor(id) {
    this.id = id;
    this.failures = [];
    this.guest = new Client();
    this.clients = new Map();
  }
  fail(label, expected, actual) {
    this.failures.push({ label, expected, actual });
  }
  eq(label, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) this.fail(label, e, a);
  }
  /** ตรวจว่าเรียงแล้วเท่ากันเมื่อคอลัมน์ไม่ได้ระบุลำดับ */
  sameSet(label, actual, expected) {
    this.eq(label, [...actual].sort(), [...expected].sort());
  }
  has(label, list, item, want = true) {
    const found = list.includes(item);
    if (found !== want) this.fail(label, `${want ? 'มี' : 'ไม่มี'} ${item}`, JSON.stringify(list));
  }
  includes(label, text, part) {
    if (typeof text !== 'string' || !text.includes(part)) this.fail(label, `มีข้อความ "${part}"`, JSON.stringify(text));
  }
  /** สถานะต้องตรงจึงไปต่อ · ไม่ตรงหยุดแถวนี้เพราะขั้นต่อไปไม่มีความหมาย */
  ok(res, status, label = 'HTTP') {
    if (res.status !== status) {
      throw new RowAbort(`${label}: expected ${status}, actual ${res.status} ${res.text.slice(0, 240)}`);
    }
    return res.data;
  }
  err(label, res, status, code, message) {
    this.eq(`${label} HTTP`, res.status, status);
    this.eq(`${label} code`, res.data?.error?.code, code);
    if (message !== undefined) this.eq(`${label} message`, res.data?.error?.message, message);
  }
  lines(label, actual, expected) {
    for (const [k, v] of Object.entries(expected)) this.eq(`${label}.${k}`, actual?.[k], v);
  }
  async as(userCode) {
    if (this.clients.has(userCode)) return this.clients.get(userCode);
    const [email, password] = USERS[userCode];
    const res = await new Client().post('/api/auth/login', { email, password });
    if (res.status !== 200) throw new RowAbort(`login ${userCode}: HTTP ${res.status} ${res.text.slice(0, 200)}`);
    const cookie = res.setCookie.map((c) => c.split(';')[0]).join('; ');
    const client = new Client(cookie);
    this.clients.set(userCode, client);
    return client;
  }
  owner() {
    return this.as('U07');
  }
  async times(client, query) {
    const data = this.ok(await client.slots(query), 200, `availability ${JSON.stringify(query)}`);
    return data.slots.map((s) => s.time);
  }
  async slot(client, query, time) {
    const data = this.ok(await client.slots(query), 200, `availability ${JSON.stringify(query)}`);
    return data.slots.find((s) => s.time === time) ?? null;
  }
  /** quote และจองจริงต้องได้ยอดเดียวกันตามที่คาด (NFR-11) */
  async priced(client, body, expected) {
    const q = this.ok(await client.quote(body), 200, 'quote');
    this.lines('quote.lines', q.lines, expected);
    const b = this.ok(await client.book(body), 201, 'booking').booking;
    this.lines('booking.lines', b.lines, expected);
    return { q, b };
  }
  async complete(id) {
    const owner = await this.owner();
    return this.ok(await owner.post(`/api/admin/bookings/${id}/complete`), 200, 'complete');
  }
  async seedBooking(date, code) {
    const owner = await this.owner();
    const data = this.ok(await owner.get(`/api/admin/schedule?date=${date}`), 200, 'schedule');
    const found = data.bookings.find((b) => b.bookingCode === code);
    if (!found) throw new RowAbort(`ไม่พบ ${code} ในตารางวันที่ ${date}`);
    return found;
  }
  async myBooking(client, code) {
    const data = this.ok(await client.get('/api/me/bookings'), 200, 'me/bookings');
    const found = data.bookings.find((b) => b.bookingCode === code);
    if (!found) throw new RowAbort(`ไม่พบ ${code} ใน /api/me/bookings`);
    return found;
  }
  async course(client) {
    const data = this.ok(await client.wallet(), 200, 'wallet');
    if (!data.courses[0]) throw new RowAbort('wallet ไม่มีคอร์ส');
    return data.courses[0];
  }
  async myMe(client) {
    return this.ok(await client.me(), 200, 'me');
  }
  async cardBalance(code) {
    return this.ok(await this.guest.giftCard(code), 200, `gift-card ${code}`).giftCard.balance;
  }
}

// ---------- ทะเบียนแถว ----------
const rows = [];
function row(id, fn, now = NOW_DEFAULT) {
  rows.push({ id, fn, now });
}
function skip(id, reason) {
  rows.push({ id, skip: reason });
}

// ---------- รูปแบบแถวที่ซ้ำกัน ----------

/** รอบเวลา: ok=true ต้องอยู่ใน slots และจองได้จบเวลา end · ok=false ต้องไม่อยู่และ POST ตรงได้ invalid-slot */
function slotRow(id, { service, time, ok, end, extra = {} }) {
  row(id, async (t) => {
    const c = t.guest;
    const times = await t.times(c, { service });
    t.has(`slots ${service}`, times, time, ok);
    const res = await c.book({ serviceId: service, time, ...extra });
    if (ok) {
      const b = t.ok(res, 201, `จอง ${service} ${time}`).booking;
      t.eq('time', b.time, time);
      t.eq('endTime', b.endTime, end);
    } else {
      t.err(`POST ${service} ${time}`, res, 422, 'invalid-slot');
    }
  });
}

/** K01 ด้วยคอร์ส C01 ของ U01 */
function courseSlotRow(id, { time, ok, end }) {
  row(id, async (t) => {
    const c = await t.as('U01');
    const course = await t.course(c);
    const times = await t.times(c, { service: 'K01', course: course.id });
    t.has('slots K01', times, time, ok);
    const res = await c.book({ serviceId: 'K01', coursePurchaseId: course.id, time });
    if (ok) {
      t.eq('endTime', t.ok(res, 201, 'จอง K01').booking.endTime, end);
    } else {
      t.err('POST K01', res, 422, 'invalid-slot');
    }
  });
}

/** วันนัดที่จองได้ */
function dateOkRow(id, date) {
  row(id, async (t) => {
    const times = await t.times(t.guest, { service: 'S01', date });
    t.has(`slots ${date}`, times, T);
    const b = t.ok(await t.guest.book({ serviceId: 'S01', date }), 201, `จอง ${date}`).booking;
    t.eq('date', b.date, date);
  });
}

/** เลือก T01 นัด 22 มิ.ย. (B10 ถือ T01 14:00–15:00) */
function t01Row(id, time, ok, end) {
  row(id, async (t) => {
    const date = '2026-06-22';
    const times = await t.times(t.guest, { service: 'S01', date, therapist: 'T01' });
    t.has(`slots T01 ${date}`, times, time, ok);
    const res = await t.guest.book({ serviceId: 'S01', date, time, therapistId: 'T01' });
    if (ok) {
      const b = t.ok(res, 201, `จอง T01 ${time}`).booking;
      t.eq('therapists', b.therapists.map((x) => x.id), ['T01']);
      t.eq('endTime', b.endTime, end);
    } else {
      t.err(`POST T01 ${time}`, res, 409, 'slot-taken', 'เวลานี้ถูกจองแล้ว');
    }
  });
}

/** คู่ S01 นัด 20 มิ.ย. ของ U02 (B09 ถือห้อง 18:00–19:00) */
function suiteRow(id, time, ok) {
  row(id, async (t) => {
    const c = await t.as('U02');
    const date = '2026-06-20';
    const times = await t.times(c, { service: 'S01', date, party: 2 });
    t.has(`slots คู่ ${date}`, times, time, ok);
    const res = await c.book({ serviceId: 'S01', date, time, partySize: 2 });
    if (ok) {
      const b = t.ok(res, 201, `จองคู่ ${time}`).booking;
      t.eq('bookingType', b.bookingType, 'COUPLE');
      t.eq('isCoupleSuite', b.isCoupleSuite, true);
    } else {
      t.err(`POST คู่ ${time}`, res, 409, 'slot-taken', 'เวลานี้ถูกจองแล้ว');
    }
  });
}

/** ประเภทการจองตามจำนวนคน */
function partyTypeRow(id, partySize, bookingType, isCoupleSuite) {
  row(id, async (t) => {
    const c = t.guest;
    const a = t.ok(await c.slots({ service: 'S01', party: partySize }), 200, 'availability');
    t.eq('availability.bookingType', a.bookingType, bookingType);
    const q = t.ok(await c.quote({ serviceId: 'S01', partySize }), 200, 'quote');
    t.eq('quote.bookingType', q.bookingType, bookingType);
    t.eq('quote.isCoupleSuite', q.isCoupleSuite, isCoupleSuite);
    const b = t.ok(await c.book({ serviceId: 'S01', partySize }), 201, 'booking').booking;
    t.eq('booking.bookingType', b.bookingType, bookingType);
    t.eq('booking.isCoupleSuite', b.isCoupleSuite, isCoupleSuite);
    t.eq('จำนวนนักบำบัด', b.therapists.length, partySize);
  });
}

/** จองได้ตามจำนวนคน */
function partyOkRow(id, service, partySize, { date = D, time = T, therapists } = {}) {
  row(id, async (t) => {
    const times = await t.times(t.guest, { service, date, party: partySize });
    t.has(`slots ${service} ${partySize} คน`, times, time);
    const b = t.ok(await t.guest.book({ serviceId: service, partySize, date, time }), 201, 'booking').booking;
    t.eq('จำนวนนักบำบัด', b.therapists.length, partySize);
    if (therapists) t.sameSet('นักบำบัด', b.therapists.map((x) => x.id), therapists);
  });
}

async function assertTooMany(t, c, service, partySize, ids, { date = D, time = T } = {}) {
  t.err(`POST ${service} ${partySize} คน`, await c.book({ serviceId: service, partySize, date, time }), 409, 'not-enough-therapists');
  t.err(`quote ${service} ${partySize} คน`, await c.quote({ serviceId: service, partySize, date, time, shuttle: service === 'P01' ? H04 : undefined }), 409, 'not-enough-therapists');
  const a = t.ok(await c.slots({ service, date, party: partySize }), 200, 'availability');
  t.eq(`slots ${service} ${partySize} คน`, a.slots, []);
  t.sameSet(`คนที่ทำ ${service} ได้`, a.therapists.map((x) => x.id), ids);
}

/** ยอดราคาอย่างเดียว */
function priceRow(id, user, body, expected, after) {
  row(id, async (t) => {
    const c = user ? await t.as(user) : t.guest;
    const r = await t.priced(c, body, expected);
    if (after) await after(t, c, r);
  });
}

/** ระดับถัดไป */
function nextTierRow(id, user, tier, nextTier) {
  row(id, async (t) => {
    const me = await t.myMe(await t.as(user));
    t.eq('tier', me.tier, tier);
    t.eq('nextTier', me.nextTier, nextTier);
  });
}

/** เดือนเกิด U02 บริการ S0x */
function birthdayServiceRow(id, serviceId, fullPrice, discountAmount, payAtShop) {
  priceRow(id, 'U02', { serviceId, useBirthday: true }, {
    fullPrice,
    discountPercent: 20,
    discountSource: 'BIRTHDAY',
    discountAmount,
    payAtShop,
  });
}

/** ซื้อ Gift Card */
function giftCardRow(id, amount, ok) {
  row(id, async (t) => {
    const c = await t.as('U03');
    const res = await c.buyGiftCard(amount);
    if (ok) {
      const card = t.ok(res, 201, `ซื้อบัตร ${amount}`).giftCard;
      t.eq('initialValue', card.initialValue, amount);
      t.eq('balance', card.balance, amount);
    } else {
      t.err(`ซื้อบัตร ${amount}`, res, 422, 'giftcard-amount-invalid');
    }
  });
}

/** ซื้อคอร์สเต็มราคาทุกระดับ · ยอดสะสมไม่เพิ่ม */
function buyCourseRow(id, user, spend) {
  row(id, async (t) => {
    const c = await t.as(user);
    const course = t.ok(await c.buyCourse(), 201, 'ซื้อคอร์ส').course;
    t.eq('pricePaid', course.pricePaid, 15000);
    t.eq('lifetimeSpend', (await t.myMe(c)).lifetimeSpend, spend);
  });
}

// ---------- BR-01, BR-02 รอบเวลา ----------
slotRow('E01', { service: 'S01', time: '09:30', ok: false });
slotRow('E02', { service: 'S01', time: '10:00', ok: true, end: '11:00' });
slotRow('E03', { service: 'S01', time: '10:15', ok: false });
slotRow('E04', { service: 'S01', time: '10:30', ok: true, end: '11:30' });
slotRow('E05', { service: 'S01', time: '20:30', ok: true, end: '21:30' });
slotRow('E06', { service: 'S01', time: '21:00', ok: true, end: '22:00' });
slotRow('E07', { service: 'S01', time: '21:30', ok: false });
slotRow('E08', { service: 'S02', time: '20:00', ok: true, end: '21:30' });
slotRow('E09', { service: 'S02', time: '20:30', ok: true, end: '22:00' });
slotRow('E10', { service: 'S02', time: '21:00', ok: false });
slotRow('E11', { service: 'P01', time: '19:30', ok: true, end: '21:30', extra: { shuttle: hotel('H01') } });
slotRow('E12', { service: 'P01', time: '20:00', ok: true, end: '22:00', extra: { shuttle: hotel('H01') } });
slotRow('E13', { service: 'P01', time: '20:30', ok: false, extra: { shuttle: hotel('H01') } });
slotRow('E14', { service: 'S04', time: '20:30', ok: true, end: '22:00' });
slotRow('E15', { service: 'S04', time: '21:00', ok: false });
courseSlotRow('E16', { time: '21:00', ok: true, end: '22:00' });
courseSlotRow('E17', { time: '21:30', ok: false });
row('E18', async (t) => {
  for (const service of ['S03', 'S05', 'S06', 'S07']) {
    const times = await t.times(t.guest, { service });
    t.has(`slots ${service}`, times, '21:00');
    t.has(`slots ${service}`, times, '21:30', false);
    const b = t.ok(await t.guest.book({ serviceId: service, time: '21:00' }), 201, `จอง ${service} 21:00`).booking;
    t.eq(`${service} endTime`, b.endTime, '22:00');
    t.err(`POST ${service} 21:30`, await t.guest.book({ serviceId: service, time: '21:30' }), 422, 'invalid-slot');
  }
});

// ---------- BR-03, BR-04 วันนัด ----------
row('E19', async (t) => {
  const date = '2026-06-15';
  const a = await t.guest.slots({ service: 'S01', date });
  t.err('availability วันนี้', a, 422, 'same-day-call');
  t.includes('availability ข้อความ', a.data?.error?.message, CALL);
  const p = await t.guest.book({ serviceId: 'S01', date });
  t.err('POST วันนี้', p, 422, 'same-day-call');
  t.includes('POST ข้อความ', p.data?.error?.message, CALL);
});
row('E20', async (t) => {
  const clock = t.ok(await t.guest.get('/api/clock'), 200, 'clock');
  t.eq('minBookingDate', clock.minBookingDate, '2026-06-16');
  const times = await t.times(t.guest, { service: 'S01', date: '2026-06-16' });
  t.has('slots 16 มิ.ย.', times, T);
  t.eq('date', t.ok(await t.guest.book({ serviceId: 'S01', date: '2026-06-16' }), 201, 'จอง').booking.date, '2026-06-16');
});
dateOkRow('E21', '2026-06-17');
dateOkRow('E22', '2026-07-14');
row('E23', async (t) => {
  const clock = t.ok(await t.guest.get('/api/clock'), 200, 'clock');
  t.eq('maxBookingDate', clock.maxBookingDate, '2026-07-15');
  const times = await t.times(t.guest, { service: 'S01', date: '2026-07-15' });
  t.has('slots 15 ก.ค.', times, T);
  t.eq('date', t.ok(await t.guest.book({ serviceId: 'S01', date: '2026-07-15' }), 201, 'จอง').booking.date, '2026-07-15');
});
row('E24', async (t) => {
  const date = '2026-07-16';
  t.err('availability', await t.guest.slots({ service: 'S01', date }), 422, 'date-out-of-range');
  t.err('POST', await t.guest.book({ serviceId: 'S01', date }), 422, 'date-out-of-range');
  t.err('quote', await t.guest.quote({ serviceId: 'S01', date }), 422, 'date-out-of-range');
});

// ---------- BR-05 ----------
t01Row('E25', '14:30', false);
t01Row('E26', '15:00', true, '16:00');
t01Row('E27', '15:30', true, '16:30');
t01Row('E28', '14:00', false);
t01Row('E29', '13:30', false);
t01Row('E30', '13:00', true, '14:00');

// ---------- BR-06, BR-07 Couple Suite ----------
row('E31', async (t) => {
  const c = await t.as('U02');
  const date = '2026-06-19';
  const slot = await t.slot(c, { service: 'S04', date, party: 2 }, '18:00');
  t.eq('มีรอบ 18:00', slot !== null, true);
  t.ok(await c.book({ serviceId: 'S04', date, time: '18:00', partySize: 2 }), 201, 'จองคู่');
});
row('E32', async (t) => {
  const c = await t.as('U02');
  const b = t.ok(await c.book({ serviceId: 'S04', date: '2026-06-19', time: '18:00', partySize: 2 }), 201, 'จองคู่').booking;
  t.eq('status', b.status, 'CONFIRMED');
  t.eq('bookingType', b.bookingType, 'COUPLE');
  t.eq('isCoupleSuite', b.isCoupleSuite, true);
  t.eq('จำนวนนักบำบัด', b.therapists.length, 2);
});
suiteRow('E33', '18:00', false);
suiteRow('E34', '18:30', false);
suiteRow('E35', '19:00', true);
suiteRow('E36', '19:30', true);

// ---------- BR-08, BR-09 ประเภท ----------
partyTypeRow('E37', 1, 'SINGLE', false);
partyTypeRow('E38', 2, 'COUPLE', true);
partyTypeRow('E39', 3, 'GROUP', false);
partyTypeRow('E40', 2, 'COUPLE', true);
partyTypeRow('E41', 3, 'GROUP', false);
partyTypeRow('E42', 4, 'GROUP', false);

// ---------- BR-10, BR-11 จำนวนคน ----------
partyOkRow('E43', 'S01', 5);
partyOkRow('E44', 'S01', 6);
row('E45', async (t) => {
  const a = await t.guest.slots({ service: 'S01', party: 7 });
  t.err('availability 7 คน', a, 422, 'party-too-large-call');
  t.includes('availability ข้อความ', a.data?.error?.message, CALL);
  const p = await t.guest.book({ serviceId: 'S01', partySize: 7 });
  t.err('POST 7 คน', p, 422, 'party-too-large-call');
  t.includes('POST ข้อความ', p.data?.error?.message, CALL);
  t.err('quote 7 คน', await t.guest.quote({ serviceId: 'S01', partySize: 7 }), 422, 'party-too-large-call');
});
partyOkRow('E46', 'S03', 3);
partyOkRow('E47', 'S03', 4, { therapists: ['T01', 'T02', 'T05', 'T06'] });
row('E48', async (t) => {
  await assertTooMany(t, t.guest, 'S03', 5, ['T01', 'T02', 'T05', 'T06']);
});
partyOkRow('E49', 'S01', 4, { date: '2026-06-22', time: '14:00' });
partyOkRow('E50', 'S01', 5, { date: '2026-06-22', time: '14:00', therapists: ['T02', 'T03', 'T04', 'T05', 'T06'] });
row('E51', async (t) => {
  const date = '2026-06-22';
  const time = '14:00';
  t.has('slots 6 คน', await t.times(t.guest, { service: 'S01', date, party: 6 }), time, false);
  t.err('POST 6 คน', await t.guest.book({ serviceId: 'S01', partySize: 6, date, time }), 409, 'not-enough-therapists');
});
partyOkRow('E52', 'S01', 6, { therapists: ['T01', 'T02', 'T03', 'T04', 'T05', 'T06'] });
row('E53', async (t) => {
  await assertTooMany(t, t.guest, 'S04', 4, ['T01', 'T03', 'T05']);
  const b = t.ok(await t.guest.book({ serviceId: 'S04', partySize: 3 }), 201, 'จอง 3 คน').booking;
  t.sameSet('นักบำบัด', b.therapists.map((x) => x.id), ['T01', 'T03', 'T05']);
});
row('E54', async (t) => {
  await assertTooMany(t, t.guest, 'S05', 6, ['T01', 'T02', 'T03', 'T04', 'T06']);
  const b = t.ok(await t.guest.book({ serviceId: 'S05', partySize: 5 }), 201, 'จอง 5 คน').booking;
  t.has('ไม่มี T05', b.therapists.map((x) => x.id), 'T05', false);
  t.eq('จำนวนนักบำบัด', b.therapists.length, 5);
});
row('E55', async (t) => {
  await assertTooMany(t, t.guest, 'S06', 3, ['T03', 'T04']);
});
row('E56', async (t) => {
  await assertTooMany(t, t.guest, 'S07', 3, ['T04', 'T05']);
});
row('E57', async (t) => {
  const date = '2026-06-26';
  const time = '12:00';
  t.has('slots 26 มิ.ย.', await t.times(t.guest, { service: 'S01', date }), time, false);
  t.err('POST', await t.guest.book({ serviceId: 'S01', date, time }), 409, 'slot-taken', 'เวลานี้ถูกจองแล้ว');
});
row('E58', async (t) => {
  const times = await t.times(t.guest, { service: 'S06', date: '2026-06-23' });
  t.has('15:00', times, '15:00');
  t.has('15:30', times, '15:30', false);
  t.has('16:00', times, '16:00', false);
  t.has('16:30', times, '16:30', false);
  t.has('17:00', times, '17:00');
});

// ---------- FR-15 ----------
row('E59', async (t) => {
  const date = '2026-06-28';
  const time = '11:00';
  t.has('slots คู่ S04', await t.times(t.guest, { service: 'S04', date, party: 2 }), time, false);
  t.err('POST คู่ S04', await t.guest.book({ serviceId: 'S04', date, time, partySize: 2 }), 409, 'not-enough-therapists');
  // ห้องว่างจริง: คู่บริการที่คนพอจองรอบเดียวกันได้
  t.has('ห้องว่าง (คู่ S01)', await t.times(t.guest, { service: 'S01', date, party: 2 }), time);
});
row('E60', async (t) => {
  const date = '2026-06-28';
  const time = '11:00';
  const slot = await t.slot(t.guest, { service: 'S04', date }, time);
  t.eq('autoAssignIds', slot?.autoAssignIds, ['T05']);
  const b = t.ok(await t.guest.book({ serviceId: 'S04', date, time }), 201, 'จอง').booking;
  t.eq('therapists', b.therapists.map((x) => x.id), ['T05']);
});
row('E61', async (t) => {
  const date = '2026-06-23';
  const time = '16:00';
  t.has('slots คู่ S07', await t.times(t.guest, { service: 'S07', date, party: 2 }), time, false);
  t.err('POST คู่ S07', await t.guest.book({ serviceId: 'S07', date, time, partySize: 2 }), 409, 'not-enough-therapists');
});

// ---------- BR-12 P01 ----------
priceRow('E62', null, { serviceId: 'P01', partySize: 2, shuttle: H04 }, {
  fullPrice: 5800, discountPercent: 0, discountAmount: 0, transportFee: 0, payAtShop: 5800,
}, async (t, _c, { q, b }) => {
  t.eq('quote.isCoupleSuite', q.isCoupleSuite, true);
  t.eq('booking.isCoupleSuite', b.isCoupleSuite, true);
});
priceRow('E63', null, { serviceId: 'P01', partySize: 3, shuttle: H04 }, {
  fullPrice: 8700, discountPercent: 0, discountAmount: 0, transportFee: 0, payAtShop: 8700,
});
row('E64', async (t) => {
  const c = await t.as('U06');
  t.err('POST P01 4 คน', await c.book({ serviceId: 'P01', partySize: 4, shuttle: H04 }), 409, 'not-enough-therapists');
  await assertTooMany(t, c, 'P01', 4, ['T01', 'T02', 'T06']);
});
row('E65', async (t) => {
  const date = '2026-06-24';
  const time = '10:00';
  t.has('slots 3 คน', await t.times(t.guest, { service: 'P01', date, party: 3 }), time, false);
  t.err('POST 3 คน', await t.guest.book({ serviceId: 'P01', partySize: 3, date, time, shuttle: H04 }), 409, 'not-enough-therapists');
  // เหลือ 3 − 1 = 2 คน
  const slot = await t.slot(t.guest, { service: 'P01', date, party: 2 }, time);
  t.eq('เหลือ 2 คน', slot?.availableTherapistIds?.length, 2);
});

// ---------- BR-13 กลุ่ม ----------
priceRow('E67', null, { serviceId: 'S01', partySize: 3 }, {
  fullPrice: 3000, discountPercent: 0, discountAmount: 0, payAtShop: 3000,
});
priceRow('E68', null, { serviceId: 'S01', partySize: 4 }, {
  fullPrice: 4000, discountPercent: 10, discountSource: 'GROUP', discountAmount: 400, payAtShop: 3600,
});
priceRow('E69', null, { serviceId: 'S01', partySize: 5 }, {
  fullPrice: 5000, discountPercent: 10, discountSource: 'GROUP', discountAmount: 500, payAtShop: 4500,
});
priceRow('E70', null, { serviceId: 'S01', partySize: 4, giftCardCode: 'GIFT-500' }, {
  fullPrice: 4000, discountPercent: 10, discountAmount: 400, serviceNet: 3600, giftCardAmount: 500, payAtShop: 3100,
}, async (t, _c, { q, b }) => {
  t.eq('pointsEarnedPreview', q.pointsEarnedPreview, 0);
  const done = await t.complete(b.id);
  t.eq('pointsEarned', done.pointsEarned, 0);
  t.eq('member', done.member, null);
});

// ---------- BR-14 ยกเลิก ----------
function cancelB07Row(id, now, ok) {
  row(id, async (t) => {
    const c = await t.as('U01');
    const b07 = await t.myBooking(c, 'SJTEST07');
    t.eq('B07 date', b07.date, '2026-06-16');
    t.eq('B07 time', b07.time, '10:00');
    t.eq('canCancel', b07.canCancel, ok);
    const res = await c.post(`/api/bookings/${b07.id}/cancel`);
    if (ok) {
      t.eq('status', t.ok(res, 200, 'ยกเลิก').booking.status, 'CANCELLED');
    } else {
      t.err('ยกเลิก', res, 422, 'cancel-too-late');
      t.includes('ข้อความ', res.data?.error?.message, CALL);
      t.eq('ยังอยู่', (await t.myBooking(c, 'SJTEST07')).status, 'CONFIRMED');
    }
  }, now);
}
cancelB07Row('E71', '2026-06-15T10:01:00+07:00', false);
cancelB07Row('E72', NOW_DEFAULT, true);
cancelB07Row('E73', '2026-06-15T09:59:00+07:00', true);
row('E74', async (t) => {
  const c = await t.as('U09');
  const b05 = await t.myBooking(c, 'SJTEST05');
  t.eq('canCancel', b05.canCancel, false);
  const res = await c.post(`/api/bookings/${b05.id}/cancel`);
  t.err('ยกเลิก', res, 422, 'cancel-too-late');
  t.includes('ข้อความ', res.data?.error?.message, CALL);
  t.eq('ยังอยู่', (await t.myBooking(c, 'SJTEST05')).status, 'CONFIRMED');
  t.eq('แต้มไม่เปลี่ยน', (await t.myMe(c)).pointsBalance, 199);
});

// ---------- FR-22 คืนสิทธิ์ ----------
row('E75', async (t) => {
  const c = await t.as('U12');
  t.eq('แต้มก่อน', (await t.myMe(c)).pointsBalance, 300);
  t.eq('บัตรก่อน', await t.cardBalance('GIFT-REFUND'), 500);
  const slotQuery = { service: 'S04', date: '2026-06-25', therapist: 'T03' };
  t.has('T03 ไม่ว่างก่อนยกเลิก', await t.times(c, slotQuery), '14:00', false);
  const before = t.ok(await c.quote({ serviceId: 'S01', useBirthday: true }), 200, 'quote ก่อน');
  t.eq('สิทธิ์ใช้แล้วก่อนยกเลิก', before.birthday.eligible, false);

  const b15 = await t.myBooking(c, 'SJTEST15');
  const res = t.ok(await c.post(`/api/bookings/${b15.id}/cancel`), 200, 'ยกเลิก B15');
  t.eq('refunded.points', res.refunded.points, 200);
  t.eq('refunded.giftCardAmount', res.refunded.giftCardAmount, 500);
  t.eq('refunded.birthday', res.refunded.birthday, true);

  t.eq('แต้มหลัง', (await t.myMe(c)).pointsBalance, 500);
  t.eq('บัตรหลัง', await t.cardBalance('GIFT-REFUND'), 1000);
  const after = t.ok(await c.quote({ serviceId: 'S01', useBirthday: true }), 200, 'quote หลัง');
  t.eq('สิทธิ์คืน', after.birthday.eligible, true);
  t.eq('สิทธิ์ใช้ได้จริง', after.lines.discountPercent, 20);
  t.has('T03 ว่าง 14:00', await t.times(c, slotQuery), '14:00');
});
row('E76', async (t) => {
  const c = await t.as('U12');
  const before = await t.course(c);
  t.eq('ก่อน remaining', before.remaining, 7);
  const b08 = await t.myBooking(c, 'SJTEST08');
  const res = t.ok(await c.post(`/api/bookings/${b08.id}/cancel`), 200, 'ยกเลิก B08');
  t.eq('refunded.sessions', res.refunded.sessions, 1);
  const after = await t.course(c);
  t.eq('หลัง remaining', after.remaining, 8);
  t.eq('total', after.totalSessions, 11);
});
row('E77', async (t) => {
  t.eq('บัตรก่อน', await t.cardBalance('GIFT-EXPREF'), 200);
  const res = t.ok(
    await t.guest.post('/api/bookings/cancel-guest', { bookingCode: 'SJTEST19', phone: '0890000007' }),
    200,
    'ยกเลิก B19',
  );
  t.eq('refunded.giftCardAmount', res.refunded.giftCardAmount, 300);
  const card = t.ok(await t.guest.giftCard('GIFT-EXPREF'), 200, 'บัตร').giftCard;
  t.eq('balance', card.balance, 500);
  t.eq('expiresOn', card.expiresOn, '2026-06-14');
  t.eq('expired', card.expired, true);
  t.eq('usable', card.usable, false);
  t.err('ใช้ต่อไม่ได้', await t.guest.quote({ serviceId: 'S01', giftCardCode: 'GIFT-EXPREF' }), 422, 'giftcard-expired');
});
row('E78', async (t) => {
  const date = '2026-06-26';
  const time = '12:00';
  t.has('ก่อนยกเลิกเต็ม', await t.times(t.guest, { service: 'S01', date }), time, false);
  const res = t.ok(
    await t.guest.post('/api/bookings/cancel-guest', { bookingCode: 'SJTEST16', phone: '0890000006' }),
    200,
    'ยกเลิก B16',
  );
  t.eq('status', res.booking.status, 'CANCELLED');
  t.eq('ยกเลิกทั้งการจอง', res.booking.partySize, 6);
  const slot = await t.slot(t.guest, { service: 'S01', date, party: 6 }, time);
  t.sameSet('T01–T06 ว่าง', slot?.availableTherapistIds ?? [], ['T01', 'T02', 'T03', 'T04', 'T05', 'T06']);
});
row('E79', async (t) => {
  const q = { service: 'S01', date: '2026-06-22', therapist: 'T01' };
  t.has('T01 ไม่ว่างก่อน', await t.times(t.guest, q), '14:00', false);
  const res = t.ok(
    await t.guest.post('/api/bookings/cancel-guest', { bookingCode: 'SJTEST10', phone: '0890000003' }),
    200,
    'ยกเลิก B10',
  );
  t.eq('status', res.booking.status, 'CANCELLED');
  t.has('T01 ว่าง', await t.times(t.guest, q), '14:00');
});
row('E80', async (t) => {
  const res = await t.guest.post('/api/bookings/cancel-guest', { bookingCode: 'SJTEST10', phone: '0890000099' });
  t.err('เบอร์ผิด', res, 404, 'booking-not-found', 'ไม่พบการจอง');
  const b10 = await t.seedBooking('2026-06-22', 'SJTEST10');
  t.eq('นัดยังอยู่', b10.status, 'CONFIRMED');
  t.has('T01 ยังไม่ว่าง', await t.times(t.guest, { service: 'S01', date: '2026-06-22', therapist: 'T01' }), '14:00', false);
});

// ---------- BR-16, BR-17 ฐานแต้ม ----------
priceRow('E88', 'U04', { serviceId: 'S04', shuttle: H04 }, {
  fullPrice: 2000, serviceNet: 2000, transportFee: 300, payAtShop: 2300,
}, async (t, _c, { b }) => {
  t.eq('pointsEarned', (await t.complete(b.id)).pointsEarned, 20);
});
function giftBaseRow(id, code, used, pay, earned) {
  priceRow(id, 'U04', { serviceId: 'S01', shuttle: H04, giftCardCode: code }, {
    fullPrice: 1000, serviceNet: 1000, transportFee: 300, totalBeforeGiftCard: 1300, giftCardAmount: used, payAtShop: pay,
  }, async (t, _c, { b }) => {
    t.eq('pointsEarned', (await t.complete(b.id)).pointsEarned, earned);
  });
}
giftBaseRow('E89', 'GIFT-899', 899, 401, 1);
giftBaseRow('E90', 'GIFT-900', 900, 400, 1);
giftBaseRow('E91', 'GIFT-901', 901, 399, 0);
priceRow('E92', 'U03', { serviceId: 'S04', pointsToRedeem: 200, shuttle: H04, giftCardCode: 'GIFT-500' }, {
  fullPrice: 2000, pointsDiscount: 100, serviceNet: 1900, transportFee: 300, giftCardAmount: 500, payAtShop: 1700,
}, async (t, _c, { b }) => {
  t.eq('pointsEarned', (await t.complete(b.id)).pointsEarned, 14);
});

// ---------- BR-18, BR-19, BR-20 แต้ม ----------
row('E93', async (t) => {
  const c = await t.as('U01');
  const q = t.ok(await c.quote({ serviceId: 'S01' }), 200, 'quote');
  t.eq('maxSets', q.points.maxSets, 0);
  t.err('ขอแลก 100', await c.quote({ serviceId: 'S01', pointsToRedeem: 100 }), 422, 'points-not-enough');
  const { b } = await t.priced(c, { serviceId: 'S01' }, { fullPrice: 1000, discountPercent: 5, discountAmount: 50, payAtShop: 950 });
  t.eq('pointsRedeemed', b.lines.pointsRedeemed, 0);
  t.eq('แต้มเหลือ', (await t.myMe(c)).pointsBalance, 99);
});
function redeemRow(id, user, service, points, expected, pointsAfter) {
  priceRow(id, user, { serviceId: service, pointsToRedeem: points }, expected, async (t, c) => {
    t.eq('แต้มเหลือ', (await t.myMe(c)).pointsBalance, pointsAfter);
  });
}
redeemRow('E94', 'U05', 'S01', 100, { fullPrice: 1000, discountPercent: 5, discountAmount: 50, pointsDiscount: 50, payAtShop: 900 }, 0);
redeemRow('E95', 'U08', 'S01', 100, { fullPrice: 1000, discountPercent: 5, discountAmount: 50, pointsDiscount: 50, payAtShop: 900 }, 1);
function redeemMaxRow(id, user, sets, expected, pointsAfter) {
  row(id, async (t) => {
    const c = await t.as(user);
    const q = t.ok(await c.quote({ serviceId: 'S01' }), 200, 'quote');
    t.eq('maxSets', q.points.maxSets, sets);
    t.eq('maxRedeemable', q.points.maxRedeemable, sets * 100);
    await t.priced(c, { serviceId: 'S01', pointsToRedeem: sets * 100 }, expected);
    t.eq('แต้มเหลือ', (await t.myMe(c)).pointsBalance, pointsAfter);
  });
}
redeemMaxRow('E96', 'U09', 1, { fullPrice: 1000, discountPercent: 5, discountAmount: 50, pointsDiscount: 50, payAtShop: 900 }, 99);
redeemMaxRow('E97', 'U10', 2, { fullPrice: 1000, discountPercent: 10, discountAmount: 100, pointsDiscount: 100, payAtShop: 800 }, 0);
redeemMaxRow('E98', 'U03', 2, { fullPrice: 1000, discountPercent: 0, discountAmount: 0, pointsDiscount: 100, payAtShop: 900 }, 50);
row('E99', async (t) => {
  const c = await t.as('U03');
  t.err('quote 150 แต้ม', await c.quote({ serviceId: 'S01', pointsToRedeem: 150 }), 422, 'points-not-multiple');
  t.err('POST 150 แต้ม', await c.book({ serviceId: 'S01', pointsToRedeem: 150 }), 422, 'points-not-multiple');
});
redeemRow('E100', 'U11', 'S05', 1500, { fullPrice: 800, pointsDiscount: 750, serviceNet: 50, payAtShop: 50 }, 200);
redeemRow('E101', 'U11', 'S05', 1600, { fullPrice: 800, pointsDiscount: 800, serviceNet: 0, payAtShop: 0 }, 100);
row('E102', async (t) => {
  const c = await t.as('U11');
  t.err('quote 17 ชุด', await c.quote({ serviceId: 'S05', pointsToRedeem: 1700 }), 422, 'points-exceed-service');
  t.err('POST 17 ชุด', await c.book({ serviceId: 'S05', pointsToRedeem: 1700 }), 422, 'points-exceed-service');
});
priceRow('E103', 'U11', { serviceId: 'S05', pointsToRedeem: 1600, shuttle: H04 }, {
  fullPrice: 800, pointsDiscount: 800, serviceNet: 0, transportFee: 300, payAtShop: 300,
});

// ---------- BR-21, BR-22 ระดับ ----------
function tierPriceRow(id, user, tier, percent, discountAmount, payAtShop) {
  row(id, async (t) => {
    const c = await t.as(user);
    const { q } = await t.priced(c, { serviceId: 'S01' }, { fullPrice: 1000, discountPercent: percent, discountAmount, payAtShop });
    t.eq('tier', q.tier, tier);
    t.eq('ระดับใน /me', (await t.myMe(c)).tier, tier);
  });
}
tierPriceRow('E104', 'U03', 'Silver', 0, 0, 1000);
tierPriceRow('E105', 'U08', 'Gold', 5, 50, 950);
tierPriceRow('E106', 'U09', 'Gold', 5, 50, 950);
tierPriceRow('E107', 'U05', 'Gold', 5, 50, 950);
tierPriceRow('E108', 'U02', 'Platinum', 10, 100, 900);
tierPriceRow('E109', 'U10', 'Platinum', 10, 100, 900);

// ---------- BR-23, BR-24 ยอดสะสม ----------
row('E110', async (t) => {
  const c = await t.as('U03');
  t.ok(await c.buyGiftCard(500), 201, 'ซื้อบัตร');
  const me = await t.myMe(c);
  t.eq('lifetimeSpend', me.lifetimeSpend, 9999);
  t.eq('tier', me.tier, 'Silver');
});
row('E111', async (t) => {
  const c = await t.as('U01');
  t.eq('pricePaid', t.ok(await c.buyCourse(), 201, 'ซื้อคอร์ส').course.pricePaid, 15000);
  const me = await t.myMe(c);
  t.eq('lifetimeSpend', me.lifetimeSpend, 12400);
  t.eq('tier', me.tier, 'Gold');
});
row('E112', async (t) => {
  const c = await t.as('U03');
  const { b } = await t.priced(c, { serviceId: 'S05' }, { fullPrice: 800, payAtShop: 800 });
  const done = await t.complete(b.id);
  t.eq('pointsEarned', done.pointsEarned, 8);
  t.eq('member.lifetimeSpend', done.member?.lifetimeSpend, 10799);
  t.eq('member.pointsBalance', done.member?.pointsBalance, 258);
  t.eq('member.tier', done.member?.tier, 'Gold');
  const me = await t.myMe(c);
  t.eq('lifetimeSpend', me.lifetimeSpend, 10799);
  t.eq('pointsBalance', me.pointsBalance, 258);
  t.eq('tier', me.tier, 'Gold');
});
function loyaltyRow(id, code, used, pay, spendAdded, earned) {
  row(id, async (t) => {
    const c = await t.as('U04');
    const body = code ? { serviceId: 'S01', giftCardCode: code } : { serviceId: 'S01' };
    const { b } = await t.priced(c, body, { fullPrice: 1000, giftCardAmount: used, payAtShop: pay });
    const done = await t.complete(b.id);
    t.eq('pointsEarned', done.pointsEarned, earned);
    const me = await t.myMe(c);
    t.eq('lifetimeSpend', me.lifetimeSpend, spendAdded);
    t.eq('pointsBalance', me.pointsBalance, earned);
  });
}
loyaltyRow('E113', null, 0, 1000, 1000, 10);
loyaltyRow('E114', 'GIFT-BAL-400', 400, 600, 600, 6);
loyaltyRow('E115', 'GIFT-1000', 1000, 0, 0, 0);

// ---------- BR-25, BR-26 เดือนเกิด ----------
const NOW_MAY = '2026-05-15T10:00:00+07:00';
row('E116', async (t) => {
  const c = await t.as('U11');
  const { q, b } = await t.priced(c, { serviceId: 'S01', date: '2026-05-31', useBirthday: true }, {
    fullPrice: 1000, discountPercent: 0, discountAmount: 0, payAtShop: 1000,
  });
  t.eq('birthday.eligible', q.birthday.eligible, false);
  t.eq('birthday.applied', q.birthday.applied, false);
  t.eq('birthday.reason', q.birthday.reason, 'not-birthday-month');
  t.eq('discountSource', b.lines.discountSource, 'NONE');
}, NOW_MAY);
row('E117', async (t) => {
  const c = await t.as('U11');
  const { q, b } = await t.priced(c, { serviceId: 'S01', date: '2026-06-01', useBirthday: true }, {
    fullPrice: 1000, discountPercent: 20, discountAmount: 200, payAtShop: 800,
  });
  t.eq('birthday.eligible', q.birthday.eligible, true);
  t.eq('birthday.applied', q.birthday.applied, true);
  t.eq('discountSource', b.lines.discountSource, 'BIRTHDAY');
}, NOW_MAY);
row('E118', async (t) => {
  const c = await t.as('U02');
  const { q } = await t.priced(c, { serviceId: 'S01', date: '2026-06-30', useBirthday: true }, {
    fullPrice: 1000, discountPercent: 20, discountSource: 'BIRTHDAY', discountAmount: 200, payAtShop: 800,
  });
  t.eq('birthday.applied', q.birthday.applied, true);
});
row('E119', async (t) => {
  const c = await t.as('U02');
  const { q } = await t.priced(c, { serviceId: 'S01', date: '2026-07-01', useBirthday: true }, {
    fullPrice: 1000, discountPercent: 10, discountSource: 'TIER', discountAmount: 100, payAtShop: 900,
  });
  t.eq('birthday.eligible', q.birthday.eligible, false);
  t.eq('birthday.applied', q.birthday.applied, false);
  t.eq('birthday.reason', q.birthday.reason, 'not-birthday-month');
});
row('E120', async (t) => {
  const c = await t.as('U02');
  const q = t.ok(await c.quote({ serviceId: 'S01' }), 200, 'quote');
  t.eq('birthday.offered', q.birthday.offered, true);
  t.eq('birthday.eligible', q.birthday.eligible, true);
  t.eq('birthday.applied (ยังไม่ถูกเลือกเอง)', q.birthday.applied, false);
});
row('E121', async (t) => {
  const c = await t.as('U02');
  const { b } = await t.priced(c, { serviceId: 'S01', useBirthday: true }, {
    fullPrice: 1000, discountPercent: 20, discountSource: 'BIRTHDAY', discountAmount: 200, payAtShop: 800,
  });
  t.eq('status', b.status, 'CONFIRMED');
  // บันทึกสิทธิ์ปี 2026: นัดอื่นในปีเดียวกันใช้ไม่ได้แล้ว
  const q = t.ok(await c.quote({ serviceId: 'S01', date: '2026-06-29', useBirthday: true }), 200, 'quote นัดถัดไป');
  t.eq('birthday.reason', q.birthday.reason, 'already-used');
});
priceRow('E122', 'U02', { serviceId: 'S01' }, {
  fullPrice: 1000, discountPercent: 10, discountSource: 'TIER', discountAmount: 100, payAtShop: 900,
}, async (t, _c, { q }) => {
  t.eq('birthday.applied', q.birthday.applied, false);
});
row('E123', async (t) => {
  const c = await t.as('U05');
  const { q } = await t.priced(c, { serviceId: 'S01', useBirthday: true }, {
    fullPrice: 1000, discountPercent: 5, discountSource: 'TIER', discountAmount: 50, payAtShop: 950,
  });
  t.eq('birthday.eligible', q.birthday.eligible, false);
  t.eq('birthday.applied', q.birthday.applied, false);
  t.eq('birthday.reason', q.birthday.reason, 'already-used');
});
row('E124', async (t) => {
  const c = await t.as('U02');
  await t.priced(c, { serviceId: 'S01', date: '2026-06-17', useBirthday: true }, { discountPercent: 20, payAtShop: 800 });
  const { q } = await t.priced(c, { serviceId: 'S01', date: '2026-06-29', useBirthday: true }, {
    fullPrice: 1000, discountPercent: 10, discountSource: 'TIER', discountAmount: 100, payAtShop: 900,
  });
  t.eq('birthday.reason', q.birthday.reason, 'already-used');
  t.eq('birthday.applied', q.birthday.applied, false);
});
row('E125', async (t) => {
  const c = await t.as('U02');
  const { b } = await t.priced(c, { serviceId: 'S01', date: '2026-06-17', useBirthday: true }, { discountPercent: 20, payAtShop: 800 });
  const cancel = t.ok(await c.post(`/api/bookings/${b.id}/cancel`), 200, 'ยกเลิก');
  t.eq('refunded.birthday', cancel.refunded.birthday, true);
  const again = await t.priced(c, { serviceId: 'S01', date: '2026-06-29', useBirthday: true }, {
    fullPrice: 1000, discountPercent: 20, discountSource: 'BIRTHDAY', discountAmount: 200, payAtShop: 800,
  });
  t.eq('birthday.applied', again.q.birthday.applied, true);
});

// ---------- BR-28 ----------
birthdayServiceRow('E129', 'S01', 1000, 200, 800);
row('E130', async (t) => {
  const c = await t.as('U02');
  const { q } = await t.priced(c, { serviceId: 'P01', shuttle: H04, useBirthday: true }, {
    fullPrice: 2900, discountPercent: 0, discountSource: 'NONE', discountAmount: 0, transportFee: 0, payAtShop: 2900,
  });
  t.eq('birthday.offered', q.birthday.offered, false);
  t.eq('birthday.applied', q.birthday.applied, false);
});
row('E131', async (t) => {
  const c = await t.as('U02');
  const k01 = t.ok(await t.guest.get('/api/services'), 200, 'services').services.find((s) => s.id === 'K01');
  t.eq('ราคา K01', k01?.price, 15000);
  const course = t.ok(await c.buyCourse({ useBirthday: true }), 201, 'ซื้อ K01').course;
  t.eq('pricePaid', course.pricePaid, 15000);
  const q = t.ok(await c.quote({ serviceId: 'K01', coursePurchaseId: course.id, useBirthday: true }), 200, 'quote K01');
  t.eq('birthday.offered', q.birthday.offered, false);
  t.eq('birthday.applied', q.birthday.applied, false);
});
birthdayServiceRow('E132', 'S02', 1400, 280, 1120);
birthdayServiceRow('E133', 'S03', 1200, 240, 960);
birthdayServiceRow('E134', 'S04', 2000, 400, 1600);
birthdayServiceRow('E135', 'S05', 800, 160, 640);
birthdayServiceRow('E136', 'S06', 1500, 300, 1200);
birthdayServiceRow('E137', 'S07', 1800, 360, 1440);

// ---------- BR-29 % มากสุด 1 อัน ----------
priceRow('E138', 'U08', { serviceId: 'S01', partySize: 3 }, {
  fullPrice: 3000, discountPercent: 5, discountSource: 'TIER', discountAmount: 150, payAtShop: 2850,
});
priceRow('E139', 'U02', { serviceId: 'S01', partySize: 4 }, {
  fullPrice: 4000, discountPercent: 10, discountAmount: 400, payAtShop: 3600,
});
priceRow('E140', 'U02', { serviceId: 'S01', partySize: 4, useBirthday: true }, {
  fullPrice: 4000, discountPercent: 20, discountSource: 'BIRTHDAY', discountAmount: 800, payAtShop: 3200,
});
priceRow('E141', 'U08', { serviceId: 'S01', partySize: 4 }, {
  fullPrice: 4000, discountPercent: 10, discountSource: 'GROUP', discountAmount: 400, payAtShop: 3600,
});

// ---------- FR-31 ไม่มีส่วนลดคู่ ----------
priceRow('E142', 'U02', { serviceId: 'S04', partySize: 2 }, {
  fullPrice: 4000, discountPercent: 10, discountSource: 'TIER', discountAmount: 400, payAtShop: 3600,
});
priceRow('E143', null, { serviceId: 'S04', partySize: 2 }, {
  fullPrice: 4000, discountPercent: 0, discountSource: 'NONE', discountAmount: 0, payAtShop: 4000,
});
priceRow('E144', 'U02', { serviceId: 'S01', partySize: 2, useBirthday: true }, {
  fullPrice: 2000, discountPercent: 20, discountAmount: 400, payAtShop: 1600,
}, async (t, c, { b }) => {
  const done = await t.complete(b.id);
  t.eq('pointsEarned', done.pointsEarned, 16);
  t.eq('member.lifetimeSpend', done.member?.lifetimeSpend, 31600);
  t.eq('lifetimeSpend', (await t.myMe(c)).lifetimeSpend, 31600);
});

// ---------- BR-30, FR-52 P01 ----------
function packageRow(id, user) {
  priceRow(id, user, { serviceId: 'P01', shuttle: H04 }, {
    fullPrice: 2900, discountPercent: 0, discountSource: 'NONE', discountAmount: 0, transportFee: 0, payAtShop: 2900,
  });
}
packageRow('E145', 'U03');
packageRow('E146', 'U05');
packageRow('E147', 'U10');
priceRow('E148', 'U03', { serviceId: 'P01', shuttle: H04 }, {
  fullPrice: 2900, serviceNet: 2900, transportFee: 0, payAtShop: 2900,
}, async (t, _c, { b }) => {
  t.eq('pointsEarned', (await t.complete(b.id)).pointsEarned, 29);
});
priceRow('E149', 'U03', { serviceId: 'P01', shuttle: H04, pointsToRedeem: 200, giftCardCode: 'GIFT-500' }, {
  fullPrice: 2900, pointsDiscount: 100, serviceNet: 2800, transportFee: 0, totalBeforeGiftCard: 2800, giftCardAmount: 500, payAtShop: 2300,
}, async (t, _c, { b }) => {
  t.eq('pointsEarned', (await t.complete(b.id)).pointsEarned, 23);
});

// ---------- BR-31, BR-33 ลำดับคิดราคา ----------
priceRow('E150', null, { serviceId: 'S01' }, { fullPrice: 1000, discountPercent: 0, discountAmount: 0, payAtShop: 1000 });
priceRow('E151', 'U08', { serviceId: 'S01', pointsToRedeem: 100 }, {
  fullPrice: 1000, discountPercent: 5, discountAmount: 50, pointsDiscount: 50, serviceNet: 900, payAtShop: 900,
});
priceRow('E152', 'U03', { serviceId: 'S04', pointsToRedeem: 200, shuttle: H04, giftCardCode: 'GIFT-500' }, {
  fullPrice: 2000, discountPercent: 0, discountAmount: 0, pointsDiscount: 100, serviceNet: 1900, transportFee: 300,
  totalBeforeGiftCard: 2200, giftCardAmount: 500, payAtShop: 1700,
});
function fiveStepRow(id, code, used, pay, cardAfter) {
  priceRow(id, 'U03', { serviceId: 'S04', pointsToRedeem: 200, shuttle: H04, giftCardCode: code }, {
    serviceNet: 1900, transportFee: 300, totalBeforeGiftCard: 2200, giftCardAmount: used, payAtShop: pay,
  }, async (t) => {
    t.eq('เหลือในบัตร', await t.cardBalance(code), cardAfter);
  });
}
fiveStepRow('E157', 'GIFT-2199', 2199, 1, 0);
fiveStepRow('E158', 'GIFT-2200', 2200, 0, 0);
fiveStepRow('E159', 'GIFT-2201', 2200, 0, 1);

// ---------- FR-49 บัตรหลายครั้ง ----------
row('E160', async (t) => {
  const c = await t.as('U04');
  t.eq('บัตรก่อน', await t.cardBalance('GIFT-ACTIVE'), 2000);
  const { b } = await t.priced(c, { serviceId: 'S05', giftCardCode: 'GIFT-ACTIVE' }, { fullPrice: 800, giftCardAmount: 800, payAtShop: 0 });
  t.eq('บัตรหลัง', await t.cardBalance('GIFT-ACTIVE'), 1200);
  t.eq('pointsEarned', (await t.complete(b.id)).pointsEarned, 0);
});
row('E161', async (t) => {
  const c = await t.as('U04');
  await t.priced(c, { serviceId: 'S05', giftCardCode: 'GIFT-ACTIVE' }, { giftCardAmount: 800, payAtShop: 0 });
  t.eq('เหลือหลังครั้งที่ 1', await t.cardBalance('GIFT-ACTIVE'), 1200);
  const second = await t.priced(c, { serviceId: 'S05', giftCardCode: 'GIFT-ACTIVE', date: '2026-06-18' }, { fullPrice: 800, giftCardAmount: 800, payAtShop: 0 });
  t.eq('ก่อนใช้ครั้งที่ 2', second.q.giftCard?.balanceBefore, 1200);
  t.eq('เหลือหลังครั้งที่ 2', await t.cardBalance('GIFT-ACTIVE'), 400);
});
row('E162', async (t) => {
  const c = await t.as('U04');
  const { b } = await t.priced(c, { serviceId: 'S01', giftCardCode: 'GIFT-BAL-1' }, { fullPrice: 1000, giftCardAmount: 1, payAtShop: 999 });
  t.eq('บัตรเหลือ', await t.cardBalance('GIFT-BAL-1'), 0);
  t.eq('pointsEarned', (await t.complete(b.id)).pointsEarned, 9);
});
row('E163', async (t) => {
  const c = await t.as('U04');
  t.err('quote บัตร ฿0', await c.quote({ serviceId: 'S01', giftCardCode: 'GIFT-BAL-0' }), 422, 'giftcard-empty');
  t.err('POST บัตร ฿0', await c.book({ serviceId: 'S01', giftCardCode: 'GIFT-BAL-0' }), 422, 'giftcard-empty');
  await t.priced(c, { serviceId: 'S01' }, { fullPrice: 1000, payAtShop: 1000 });
});
row('E164', async (t) => {
  const c = await t.as('U01');
  const course = await t.course(c);
  const { q, b } = await t.priced(c, { serviceId: 'K01', coursePurchaseId: course.id, shuttle: H04, giftCardCode: 'GIFT-500' }, {
    fullPrice: 0, serviceNet: 0, transportFee: 300, totalBeforeGiftCard: 300, giftCardAmount: 300, payAtShop: 0,
  });
  t.eq('pointsEarnedPreview', q.pointsEarnedPreview, 0);
  t.eq('บัตรเหลือ', await t.cardBalance('GIFT-500'), 200);
  t.eq('pointsEarned', (await t.complete(b.id)).pointsEarned, 0);
});

// ---------- BR-34–BR-38 รถ ----------
function shuttleRow(id, partySize, shuttle, expected) {
  priceRow(id, null, { serviceId: 'S01', partySize, shuttle }, expected);
}
const FREE_1 = { cars: 1, transportFee: 0, totalBeforeGiftCard: 1000, payAtShop: 1000 };
const PAID_1 = { cars: 1, transportFee: 300, totalBeforeGiftCard: 1300, payAtShop: 1300 };
shuttleRow('E165', 1, km('4.9'), FREE_1);
shuttleRow('E166', 1, hotel('H02'), FREE_1);
shuttleRow('E167', 1, hotel('H03'), PAID_1);
shuttleRow('E168', 1, hotel('H01'), FREE_1);
shuttleRow('E169', 1, km('14.9'), PAID_1);
shuttleRow('E170', 1, hotel('H05'), PAID_1);
row('E171', async (t) => {
  const body = { serviceId: 'S01', shuttle: hotel('H06') };
  t.err('quote H06', await t.guest.quote(body), 422, 'distance-too-far');
  t.err('POST H06', await t.guest.book(body), 422, 'distance-too-far');
});
shuttleRow('E172', 1, hotel('H04'), PAID_1);
shuttleRow('E173', 3, km('12'), { fullPrice: 3000, discountPercent: 0, cars: 1, transportFee: 300, totalBeforeGiftCard: 3300, payAtShop: 3300 });
row('E174', async (t) => {
  const expected = { fullPrice: 4000, discountPercent: 10, discountAmount: 400, serviceNet: 3600, cars: 1, transportFee: 300, payAtShop: 3900 };
  const body = { serviceId: 'S01', partySize: 4, shuttle: km('12') };
  await t.priced(await t.as('U06'), body, expected);
  await t.priced(t.guest, { ...body, date: '2026-06-18' }, expected);
});
shuttleRow('E175', 5, km('12'), { fullPrice: 5000, discountAmount: 500, serviceNet: 4500, cars: 2, transportFee: 600, payAtShop: 5100 });
shuttleRow('E176', 6, km('12'), { fullPrice: 6000, discountAmount: 600, serviceNet: 5400, cars: 2, transportFee: 600, payAtShop: 6000 });
shuttleRow('E177', 5, hotel('H02'), { serviceNet: 4500, cars: 2, transportFee: 0, payAtShop: 4500 });
function packageShuttleRow(id, shuttle) {
  priceRow(id, null, { serviceId: 'P01', shuttle }, { fullPrice: 2900, transportFee: 0, payAtShop: 2900 });
}
packageShuttleRow('E178', km('14.9'));
packageShuttleRow('E179', hotel('H05'));
row('E180', async (t) => {
  const body = { serviceId: 'P01', shuttle: hotel('H06') };
  t.err('quote H06', await t.guest.quote(body), 422, 'distance-too-far');
  t.err('POST H06', await t.guest.book(body), 422, 'distance-too-far');
});
function badDistanceRow(id, text) {
  row(id, async (t) => {
    const body = { serviceId: 'S01', shuttle: km(text) };
    t.err(`quote ${text}`, await t.guest.quote(body), 422, 'distance-invalid');
    t.err(`POST ${text}`, await t.guest.book(body), 422, 'distance-invalid');
  });
}
badDistanceRow('E181', '-0.1');
shuttleRow('E182', 1, km('0.0'), { transportFee: 0, totalBeforeGiftCard: 1000, payAtShop: 1000 });
badDistanceRow('E183', '5.05');

// ---------- BR-39, BR-40 คอร์ส ----------
row('E184', async (t) => {
  const c = await t.as('U10');
  const course = await t.course(c);
  t.eq('remaining', course.remaining, 0);
  const body = { serviceId: 'K01', coursePurchaseId: course.id };
  t.err('POST', await c.book(body), 409, 'course-used-up', 'คอร์สนี้ใช้ครบแล้ว');
  t.err('quote', await c.quote(body), 409, 'course-used-up', 'คอร์สนี้ใช้ครบแล้ว');
  t.err('availability', await c.slots({ service: 'K01', course: course.id }), 409, 'course-used-up', 'คอร์สนี้ใช้ครบแล้ว');
});
function courseBookRow(id, user, before, after, date = D, purchasedOn) {
  row(id, async (t) => {
    const c = await t.as(user);
    const course = await t.course(c);
    t.eq('ก่อน remaining', course.remaining, before);
    if (purchasedOn) t.eq('purchasedOn', course.purchasedOn, purchasedOn);
    const b = t.ok(await c.book({ serviceId: 'K01', coursePurchaseId: course.id, date }), 201, `จอง ${date}`).booking;
    t.eq('date', b.date, date);
    t.eq('หลัง remaining', (await t.course(c)).remaining, after);
  });
}
courseBookRow('E185', 'U11', 1, 0);
courseBookRow('E186', 'U08', 2, 1);
courseBookRow('E187', 'U08', 2, 1, '2026-06-19', '2025-12-22');
courseBookRow('E188', 'U08', 2, 1, '2026-06-20', '2025-12-22');
row('E189', async (t) => {
  const c = await t.as('U08');
  const course = await t.course(c);
  t.eq('purchasedOn', course.purchasedOn, '2025-12-22');
  const body = { serviceId: 'K01', coursePurchaseId: course.id, date: '2026-06-21' };
  t.err('POST', await c.book(body), 422, 'course-expired', 'หมดอายุสำหรับวันนี้');
  t.err('quote', await c.quote(body), 422, 'course-expired', 'หมดอายุสำหรับวันนี้');
  t.err('availability', await c.slots({ service: 'K01', date: '2026-06-21', course: course.id }), 422, 'course-expired', 'หมดอายุสำหรับวันนี้');
});
row('E190', async (t) => {
  const c = await t.as('U09');
  const course = await t.course(c);
  t.eq('remaining', course.remaining, 5);
  t.eq('purchasedOn', course.purchasedOn, '2025-12-16');
  t.eq('expiresOn', course.expiresOn, '2026-06-14');
  t.eq('expired', course.expired, true);
  const body = { serviceId: 'K01', coursePurchaseId: course.id, date: '2026-06-16' };
  t.err('POST', await c.book(body), 422, 'course-expired', 'หมดอายุสำหรับวันนี้');
  t.err('quote', await c.quote(body), 422, 'course-expired', 'หมดอายุสำหรับวันนี้');
});
row('E191', async (t) => {
  const c = await t.as('U01');
  const course = await t.course(c);
  const body = { serviceId: 'K01', coursePurchaseId: course.id, partySize: 2 };
  t.err('POST', await c.book(body), 422, 'course-one-person', 'จองด้วยคอร์สได้ครั้งละ 1 คน');
  t.err('quote', await c.quote(body), 422, 'course-one-person', 'จองด้วยคอร์สได้ครั้งละ 1 คน');
});
row('E192', async (t) => {
  const c = await t.as('U01');
  const course = await t.course(c);
  const a = t.ok(await c.slots({ service: 'K01', course: course.id }), 200, 'availability');
  t.sameSet('รายชื่อ', a.therapists.map((x) => x.id), ['T01', 'T05']);
  t.eq('รอบที่มีคนว่าง', a.slots.find((s) => s.time === T)?.availableTherapistIds, ['T01', 'T05']);
});
row('E193', async (t) => {
  const course = await t.course(await t.as('U01'));
  t.eq('remaining', course.remaining, 7);
  t.eq('totalSessions', course.totalSessions, 11);
  t.eq('usedSessions', course.usedSessions, 4);
  t.eq('reservedSessions', course.reservedSessions, 0);
  t.eq('expiresOn', course.expiresOn, '2026-09-13');
});
row('E194', async (t) => {
  const c = await t.as('U01');
  const course = await t.course(c);
  t.eq('เริ่ม', course.remaining, 7);
  const b = t.ok(await c.book({ serviceId: 'K01', coursePurchaseId: course.id }), 201, 'จอง').booking;
  t.eq('หลังจอง', (await t.course(c)).remaining, 6);
  t.ok(await c.post(`/api/bookings/${b.id}/cancel`), 200, 'ยกเลิก');
  t.eq('หลังยกเลิก', (await t.course(c)).remaining, 7);
});
row('E195', async (t) => {
  const c = await t.as('U01');
  const course = await t.course(c);
  const b = t.ok(await c.book({ serviceId: 'K01', coursePurchaseId: course.id }), 201, 'จอง').booking;
  const done = await t.complete(b.id);
  t.eq('pointsEarned', done.pointsEarned, 0);
  t.eq('course.usedSessions', done.course?.usedSessions, 5);
  t.eq('course.remaining', done.course?.remaining, 6);
  const after = await t.course(c);
  t.eq('wallet used', after.usedSessions, 5);
  t.eq('wallet remaining', after.remaining, 6);
  t.eq('lifetimeSpend', (await t.myMe(c)).lifetimeSpend, 12400);
});

// ---------- BR-41–BR-43 มูลค่าบัตร ----------
giftCardRow('E196', 499, false);
giftCardRow('E197', 500, true);
giftCardRow('E198', 501, true);
giftCardRow('E199', 9999, true);
giftCardRow('E200', 10000, true);
giftCardRow('E201', 10001, false);
giftCardRow('E202', 2149.99, false);
giftCardRow('E203', 2150, true);
giftCardRow('E204', 2150.5, false);

// ---------- BR-44 อายุบัตร ----------
async function checkCard(t, code, purchasedOn, expiresOn) {
  const card = t.ok(await t.guest.giftCard(code), 200, code).giftCard;
  t.eq(`${code} purchasedOn`, card.purchasedOn, purchasedOn);
  t.eq(`${code} expiresOn`, card.expiresOn, expiresOn);
  t.eq(`${code} balance`, card.balance, 1000);
}
function cardAgeOkRow(id, code, purchasedOn, expiresOn, date = D) {
  row(id, async (t) => {
    await checkCard(t, code, purchasedOn, expiresOn);
    const c = await t.as('U04');
    await t.priced(c, { serviceId: 'S01', giftCardCode: code, date }, { fullPrice: 1000, giftCardAmount: 1000, payAtShop: 0 });
  });
}
cardAgeOkRow('E205', 'GIFT-EXP364', '2025-06-16', '2026-06-16');
cardAgeOkRow('E206', 'GIFT-EXP365', '2025-06-15', '2026-06-15');
row('E207', async (t) => {
  await checkCard(t, 'GIFT-EXP366', '2025-06-14', '2026-06-14');
  const c = await t.as('U04');
  const body = { serviceId: 'S01', giftCardCode: 'GIFT-EXP366' };
  const q = await c.quote(body);
  t.err('quote', q, 422, 'giftcard-expired');
  t.includes('ข้อความ', q.data?.error?.message, 'หมดอายุ');
  t.err('POST', await c.book(body), 422, 'giftcard-expired');
});
cardAgeOkRow('E208', 'GIFT-EXP365', '2025-06-15', '2026-06-15', '2026-07-15');

// ---------- BR-45, BR-46 ----------
row('E215', async (t) => {
  const c = await t.as('U01');
  const course = t.ok(await c.buyCourse(), 201, 'ซื้อคอร์ส').course;
  t.eq('คอร์ส purchasedOn', course.purchasedOn, '2026-06-15');
  t.eq('คอร์ส expiresOn', course.expiresOn, '2026-12-12');
  const card = t.ok(await c.buyGiftCard(1000), 201, 'ซื้อบัตร').giftCard;
  t.eq('บัตร purchasedOn', card.purchasedOn, '2026-06-15');
  t.eq('บัตร expiresOn', card.expiresOn, '2027-06-15');
});
buyCourseRow('E216', 'U03', 9999);
buyCourseRow('E217', 'U05', 29999);
buyCourseRow('E218', 'U02', 30000);

// ---------- BR-47–BR-49 คะแนน ----------
async function filtered(t) {
  const data = t.ok(await t.guest.get('/api/therapists?minRating=4.5'), 200, 'therapists');
  return data.therapists.map((x) => x.id);
}
row('E219', async (t) => t.has('ตัวกรอง T03', await filtered(t), 'T03', false));
row('E220', async (t) => t.has('ตัวกรอง T02', await filtered(t), 'T02'));
row('E221', async (t) => t.has('ตัวกรอง T05', await filtered(t), 'T05'));
row('E222', async (t) => t.eq('ตัวกรอง', await filtered(t), ['T01', 'T05', 'T02']));
row('E226', async (t) => {
  const all = t.ok(await t.guest.get('/api/therapists'), 200, 'therapists').therapists;
  const t04 = all.find((x) => x.id === 'T04');
  t.eq('reviewCount', t04?.reviewCount, 0);
  t.eq('rating', t04?.rating, null);
  t.eq('passesFilter', t04?.passesFilter, false);
  t.has('ไม่ผ่านตัวกรอง', await filtered(t), 'T04', false);
  const page = await t.guest.get('/th/therapists');
  t.eq('หน้า therapists HTTP', page.status, 200);
  t.includes('หน้า therapists', page.text, 'ยังไม่มีรีวิว');
});
row('E228', async (t) => {
  const all = t.ok(await t.guest.get('/api/therapists'), 200, 'therapists').therapists;
  const t02 = all.find((x) => x.id === 'T02');
  t.sameSet('stars', t02?.stars ?? [], [5, 4]);
  t.eq('rating', t02?.rating, 4.5);
  t.eq('passesFilter', t02?.passesFilter, true);
});

// ---------- BR-50 แบบทดสอบ ----------
async function quizAnswers(t) {
  const data = t.ok(await t.guest.get('/api/quiz'), 200, 'quiz');
  return { questions: data.questions, answers: data.questions.map((q) => q.options[0].id) };
}
row('E229', async (t) => {
  const { answers } = await quizAnswers(t);
  t.err('ตอบ 3 ข้อ', await t.guest.post('/api/quiz', { answers: answers.slice(0, 3) }), 422, 'quiz-incomplete');
});
row('E230', async (t) => {
  const { answers } = await quizAnswers(t);
  const r = t.ok(await t.guest.post('/api/quiz', { answers }), 200, 'ตอบ 4 ข้อ');
  t.has('แนะนำใน S01–S07, P01', ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'P01'], r.serviceId);
  t.eq('service ตรงกับ serviceId', r.service?.id, r.serviceId);
  t.eq('มีเหตุผล', typeof r.reason?.th === 'string' && r.reason.th.length > 0, true);
});
row('E231', async (t) => {
  const { questions, answers } = await quizAnswers(t);
  t.eq('จำนวนข้อ', questions.length, 4);
  t.err('ตอบ 5 ข้อ', await t.guest.post('/api/quiz', { answers: [...answers, answers[0]] }), 422, 'quiz-too-many');
});

// ---------- FR-07–FR-09 ----------
function anyoneRow(id, service, expected, rating, date = D, time = T) {
  row(id, async (t) => {
    const a = t.ok(await t.guest.slots({ service, date }), 200, 'availability');
    const slot = a.slots.find((s) => s.time === time);
    t.eq('autoAssignIds', slot?.autoAssignIds, [expected]);
    t.eq('คะแนน', a.therapists.find((x) => x.id === expected)?.rating ?? null, rating);
    const b = t.ok(await t.guest.book({ serviceId: service, date, time, therapistId: 'ANY' }), 201, 'จอง').booking;
    t.eq('therapists', b.therapists.map((x) => x.id), [expected]);
  });
}
anyoneRow('E232', 'S01', 'T01', 5);
anyoneRow('E233', 'S01', 'T05', 4.6, '2026-06-22', '14:00');
anyoneRow('E234', 'S06', 'T03', 4.4);
anyoneRow('E235', 'S06', 'T04', null, '2026-06-24', '12:00');
row('E237', async (t) => {
  const list = t.ok(await t.guest.get('/api/therapists?service=S07'), 200, 'therapists').therapists;
  t.eq('รายชื่อ S07', list.map((x) => x.id), ['T04', 'T05']);
  t.eq('ไม่มีน้องบัว', list.some((x) => x.name?.th === 'น้องบัว'), false);
});

// ---------- FR-35 ระดับถัดไป ----------
nextTierRow('E238', 'U01', 'Gold', { name: 'Platinum', gap: 17600 });
nextTierRow('E239', 'U03', 'Silver', { name: 'Gold', gap: 1 });
nextTierRow('E240', 'U05', 'Gold', { name: 'Platinum', gap: 1 });
nextTierRow('E241', 'U08', 'Gold', { name: 'Platinum', gap: 20000 });
nextTierRow('E242', 'U04', 'Silver', { name: 'Gold', gap: 10000 });
nextTierRow('E243', 'U02', 'Platinum', null);

// ---------- FR-79, FR-80 ร้านกดเสร็จ ----------
row('E244', async (t) => {
  const c = await t.as('U03');
  const { b } = await t.priced(c, { serviceId: 'S04', pointsToRedeem: 200, shuttle: H04, giftCardCode: 'GIFT-500' }, { payAtShop: 1700 });
  const done = await t.complete(b.id);
  t.eq('pointsEarned', done.pointsEarned, 14);
  t.eq('member.pointsBalance', done.member?.pointsBalance, 64);
  t.eq('member.lifetimeSpend', done.member?.lifetimeSpend, 11399);
  t.eq('member.tier', done.member?.tier, 'Gold');
  const me = await t.myMe(c);
  t.eq('pointsBalance', me.pointsBalance, 64);
  t.eq('lifetimeSpend', me.lifetimeSpend, 11399);
  t.eq('tier', me.tier, 'Gold');
});
async function completeB05(t) {
  const c = await t.as('U09');
  const b05 = await t.myBooking(c, 'SJTEST05');
  t.eq('B05 ยอด', b05.lines.payAtShop, 950);
  const done = await t.complete(b05.id);
  t.eq('pointsEarned', done.pointsEarned, 9);
  return { c, b05, done };
}
row('E245', async (t) => {
  const { c, done } = await completeB05(t);
  t.eq('member.pointsBalance', done.member?.pointsBalance, 208);
  t.eq('member.lifetimeSpend', done.member?.lifetimeSpend, 10951);
  const me = await t.myMe(c);
  t.eq('pointsBalance', me.pointsBalance, 208);
  t.eq('lifetimeSpend', me.lifetimeSpend, 10951);
});
row('E246', async (t) => {
  const b06 = await t.seedBooking('2026-06-15', 'SJTEST06');
  t.eq('แขก', b06.userId, null);
  t.eq('ยอด', b06.lines.payAtShop, 800);
  const done = await t.complete(b06.id);
  t.eq('pointsEarned', done.pointsEarned, 0);
  t.eq('member', done.member, null);
  t.eq('status', done.booking.status, 'COMPLETED');
});
row('E247', async (t) => {
  const { c, b05 } = await completeB05(t);
  const owner = await t.owner();
  const again = await owner.post(`/api/admin/bookings/${b05.id}/complete`);
  t.err('กดครั้งที่ 2', again, 409, 'already-completed');
  t.eq('แต้มยังเป็น', (await t.myMe(c)).pointsBalance, 208);
});
row('E248', async (t) => {
  const c = await t.as('U03');
  const first = t.ok(await c.book({ serviceId: 'S05' }), 201, 'จอง S05').booking;
  await t.complete(first.id);
  t.eq('ยอดหลังกดเสร็จ', (await t.myMe(c)).lifetimeSpend, 10799);
  const { q } = await t.priced(c, { serviceId: 'S01', date: '2026-06-18' }, {
    fullPrice: 1000, discountPercent: 5, discountSource: 'TIER', discountAmount: 50, payAtShop: 950,
  });
  t.eq('tier', q.tier, 'Gold');
});
row('E249', async (t) => {
  const c = await t.as('U03');
  const { b: old } = await t.priced(c, { serviceId: 'S01', date: '2026-06-20' }, { fullPrice: 1000, discountPercent: 0, payAtShop: 1000 });
  const up = t.ok(await c.book({ serviceId: 'S05' }), 201, 'จอง S05').booking;
  t.eq('ระดับขึ้น', (await t.complete(up.id)).member?.tier, 'Gold');
  const same = t.ok(await c.get(`/api/bookings/${old.id}`), 200, 'อ่านนัดเดิม').booking;
  t.eq('ยอดนัดเดิม', same.lines.payAtShop, 1000);
  t.eq('% นัดเดิม', same.lines.discountPercent, 0);
});

// ---------- FR-43, FR-45, NFR-12, FR-48 ----------
row('E250', async (t) => {
  const w = t.ok(await (await t.as('U01')).wallet(), 200, 'wallet');
  t.eq('รอบเอว', w.waist.points.map((p) => p.cm), ['82.0', '81.0', '79.5', '78.0']);
  t.eq('reducedCm', w.waist.reducedCm, '4.0');
});
row('E251', async (t) => {
  const h = t.ok(await (await t.as('U01')).get('/api/me/history'), 200, 'history');
  t.eq('ลำดับ', h.items.map((i) => i.bookingCode), ['SJHIST04', 'SJHIST03', 'SJHIST02', 'SJHIST01']);
});
row('E252', async (t) => {
  const b07 = await t.seedBooking('2026-06-16', 'SJTEST07');
  const u02 = await t.as('U02');
  t.err('เปิด B07 ของ U01', await u02.get(`/api/bookings/${b07.id}`), 404, 'booking-not-found', 'ไม่พบการจอง');
  t.err('เปิดหลังร้าน', await u02.get('/api/admin/schedule'), 403, 'forbidden');
});
row('E253', async (t) => {
  const c = await t.as('U03');
  const r = t.ok(await c.buyGiftCard(2000, 'LOTUS', 'LINE'), 201, 'ซื้อบัตร');
  t.eq('initialValue', r.giftCard.initialValue, 2000);
  t.eq('design', r.giftCard.design, 'LOTUS');
  t.eq('channel', r.giftCard.channel, 'LINE');
  t.eq('expiresOn', r.giftCard.expiresOn, '2027-06-15');
  t.eq('paymentStatus', r.giftCard.paymentStatus, 'SIMULATED');
  t.includes('ข้อความจำลอง', r.simulatedMessage, '฿2,000');
  t.includes('ข้อความจำลอง', r.simulatedMessage, 'บัว');
  t.includes('ข้อความจำลอง', r.simulatedMessage, 'LINE');
  t.includes('ข้อความจำลอง', r.simulatedMessage, '15 มิ.ย. 2027');
  t.eq('lifetimeSpend', (await t.myMe(c)).lifetimeSpend, 9999);
});

// ---------- ตรวจรายการและรัน ----------
function checkIds() {
  const ids = rows.map((r) => r.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  const missing = EXPECTED_IDS.filter((id) => !ids.includes(id));
  const extra = ids.filter((id) => !EXPECTED_IDS.includes(id));
  if (EXPECTED_IDS.length !== TOTAL || dup.length || missing.length || extra.length || ids.length !== TOTAL) {
    console.error(`รายการแถวไม่ครบ: มี ${ids.length} ต้องเป็น ${TOTAL}`);
    console.error(`ซ้ำ: ${dup.join(', ') || '-'} · ขาด: ${missing.join(', ') || '-'} · เกิน: ${extra.join(', ') || '-'}`);
    process.exit(1);
  }
}

async function main() {
  checkIds();
  const selected = ONLY ? rows.filter((r) => ONLY.includes(r.id)) : rows;
  let pass = 0;
  let skipped = 0;
  const failedIds = [];
  const skips = [];
  for (const r of selected) {
    if (r.skip) {
      skipped += 1;
      skips.push(`SKIP ${r.id} · ${r.skip}`);
      continue;
    }
    const t = new RowContext(r.id);
    try {
      await resetTo(r.now);
      await r.fn(t);
    } catch (err) {
      const message = err instanceof RowAbort ? err.message : `ข้อผิดพลาดในสคริปต์หรือการเชื่อมต่อ: ${err?.stack ?? err}`;
      t.fail('หยุดกลางแถว', 'ทำจบแถว', message);
    }
    if (t.failures.length === 0) {
      pass += 1;
    } else {
      failedIds.push(r.id);
      console.log(`✗ ${r.id}`);
      for (const f of t.failures) console.log(`    ${f.label}: expected ${f.expected} · actual ${f.actual}`);
    }
  }
  for (const line of skips) console.log(line);
  // จบงานให้ข้อมูลกลับเป็นค่าเริ่มต้น
  await resetTo(NOW_DEFAULT);
  if (failedIds.length) console.log(`ไม่ผ่าน ${failedIds.length} ข้อ: ${failedIds.join(', ')}`);
  console.log(`ผ่าน ${pass} / ${selected.length} ข้อ · SKIP ${skipped}`);
  process.exit(failedIds.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

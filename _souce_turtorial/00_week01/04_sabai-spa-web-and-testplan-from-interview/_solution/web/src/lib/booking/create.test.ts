import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateBookingRequest, Service, TherapistId } from '@/types';

const state = vi.hoisted(() => ({
  queries: [] as { text: string; params: unknown[] }[],
  transactions: 0,
  commits: 0,
  busy: [] as string[],
  suiteBusy: false,
  /** ลำดับ error ที่ INSERT booking_items ครั้งถัดไปจะโยน */
  insertErrors: [] as unknown[],
  quote: null as unknown,
}));

vi.mock('@/lib/clock', () => ({
  getNow: vi.fn(async () => new Date('2026-06-15T10:00:00+07:00')),
}));

vi.mock('@/lib/catalog', () => {
  const service = (id: string, kind: string, durationMinutes: number, maxParty: number, therapistIds: string[]) => ({
    id,
    kind,
    durationMinutes,
    maxParty,
    therapistIds,
  });
  const services: Record<string, unknown> = {
    S01: service('S01', 'SERVICE', 60, 6, ['T01', 'T02', 'T03', 'T04', 'T05', 'T06']),
    S03: service('S03', 'SERVICE', 60, 4, ['T01', 'T02', 'T05', 'T06']),
    S06: service('S06', 'SERVICE', 60, 2, ['T03', 'T04']),
    K01: service('K01', 'COURSE', 60, 1, ['T01', 'T05']),
  };
  const rating: Record<string, number | null> = { T01: 5, T02: 4.5, T03: 4.4, T04: null, T05: 4.6, T06: 4 };
  return {
    getService: vi.fn(async (id: string) => services[id] ?? null),
    listTherapists: vi.fn(async ({ serviceId }: { serviceId: string }) =>
      (services[serviceId] as Service).therapistIds.map((id) => ({ id, rating: rating[id] })),
    ),
  };
});

vi.mock('@/lib/pricing/quote', () => ({
  loadAndQuote: vi.fn(async () => state.quote),
}));

vi.mock('@/lib/booking/read', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./read')>();
  return {
    ...actual,
    getBookingDetail: vi.fn(async (_db: unknown, id: string) => ({ id })),
  };
});

vi.mock('@/lib/db', () => {
  const client = {
    query: vi.fn(async (text: string, params: unknown[] = []) => {
      state.queries.push({ text, params });
      if (text.includes('SELECT DISTINCT therapist_id')) {
        return { rows: state.busy.map((therapist_id) => ({ therapist_id })) };
      }
      if (text.includes('FROM bookings') && text.includes('is_couple_suite')) {
        return { rows: state.suiteBusy ? [{}] : [] };
      }
      if (text.includes('INSERT INTO bookings')) return { rows: [{ id: 'new-booking' }] };
      if (text.includes('INSERT INTO booking_items') && state.insertErrors.length > 0) {
        throw state.insertErrors.shift();
      }
      return { rows: [], rowCount: 1 };
    }),
  };
  return {
    getPool: vi.fn(),
    query: vi.fn(),
    withTransaction: vi.fn(async (fn: (c: unknown) => Promise<unknown>) => {
      state.transactions += 1;
      const result = await fn(client);
      state.commits += 1;
      return result;
    }),
  };
});

import { createBooking } from './create';

const COURSE_ID = '00000000-0000-0000-0000-000000000301';
const USER = '00000000-0000-0000-0000-000000000101';

function loaded(overrides: Record<string, unknown> = {}) {
  return {
    lines: {
      fullPrice: 1000,
      discountPercent: 0,
      discountSource: 'NONE',
      discountAmount: 0,
      pointsRedeemed: 0,
      pointsDiscount: 0,
      serviceNet: 1000,
      cars: 0,
      transportFee: 0,
      totalBeforeGiftCard: 1000,
      giftCardAmount: 0,
      payAtShop: 1000,
    },
    internal: { serviceDurationMinutes: 60, giftCardId: null, hotelId: null, distanceKm: null },
    birthday: { offered: false, eligible: false, applied: false, reason: null },
    course: null,
    ...overrides,
  };
}

function request(overrides: Partial<CreateBookingRequest> = {}): CreateBookingRequest {
  return {
    serviceId: 'S01',
    partySize: 1,
    date: '2026-06-17',
    time: '14:00',
    guest: { name: 'คุณทดสอบ', phone: '0890000001' },
    ...overrides,
  };
}

function statements(fragment: string) {
  return state.queries.filter((q) => q.text.includes(fragment));
}

async function errorCode(run: Promise<unknown>): Promise<string | null> {
  return run.then(
    () => null,
    (err: { code?: string }) => err.code ?? 'unknown',
  );
}

function therapistsInserted(): TherapistId[] {
  return statements('INSERT INTO booking_items').map((q) => q.params[2] as TherapistId);
}

beforeEach(() => {
  state.queries = [];
  state.transactions = 0;
  state.commits = 0;
  state.busy = [];
  state.suiteBusy = false;
  state.insertErrors = [];
  state.quote = loaded();
});

describe('ลำดับตรวจ POST /api/bookings', () => {
  it.each<[string, Partial<CreateBookingRequest>, string | null, string]>([
    ['1 จำนวนคน ≥7', { partySize: 7, serviceId: 'XXX' as never }, null, 'party-too-large-call'],
    ['1 จำนวนคน <1', { partySize: 0 }, null, 'validation'],
    ['1 จำนวนคนไม่ใช่จำนวนเต็ม', { partySize: 1.5 }, null, 'validation'],
    ['2 ไม่พบบริการ', { serviceId: 'XXX' as never, date: '2026-06-15' }, null, 'service-not-found'],
    ['2 K01 ไม่มีคอร์ส', { serviceId: 'K01', date: '2026-06-15' }, null, 'course-required'],
    ['2 แขกใช้คอร์ส', { serviceId: 'K01', coursePurchaseId: COURSE_ID, date: '2026-06-15' }, null, 'course-login-required'],
    ['2 คอร์ส 2 คน', { serviceId: 'K01', coursePurchaseId: COURSE_ID, partySize: 2 }, USER, 'course-one-person'],
    ['3 วันนี้', { date: '2026-06-15', time: '09:30' }, null, 'same-day-call'],
    ['3 ก่อนหน้า', { date: '2026-06-14' }, null, 'same-day-call'],
    ['3 วันนี้ + 31', { date: '2026-07-16', time: '09:30' }, null, 'date-out-of-range'],
    ['3 วันผิดรูปแบบ', { date: '2026-02-30' }, null, 'validation'],
    ['4 ก่อน 10:00', { time: '09:30', partySize: 6 }, null, 'invalid-slot'],
    ['4 ไม่ลงท้าย :00 :30', { time: '10:15' }, null, 'invalid-slot'],
    ['4 จบเกิน 22:00', { time: '21:30' }, null, 'invalid-slot'],
    ['5 S03 5 คน', { serviceId: 'S03', partySize: 5, guest: undefined }, null, 'not-enough-therapists'],
    ['6 แขกไม่กรอก', { guest: undefined }, null, 'guest-info-required'],
    ['6 แขกชื่อว่าง', { guest: { name: '  ', phone: '0890000001' } }, null, 'guest-info-required'],
    ['6 เบอร์ผิด', { guest: { name: 'ก', phone: '12345678' } }, null, 'phone-invalid'],
    ['7 คอร์สกับบริการอื่น', { coursePurchaseId: COURSE_ID }, USER, 'course-not-found'],
    ['7 คอร์สรหัสเสีย', { serviceId: 'K01', coursePurchaseId: 'bad' }, USER, 'course-not-found'],
  ])('FR-02 ขั้น %s', async (_label, overrides, userId, code) => {
    expect(await errorCode(createBooking(request(overrides), { userId }))).toBe(code);
    expect(state.transactions).toBe(0);
  });

  it('BR-04 วันนี้ + 30 และ BR-03 พรุ่งนี้จองได้', async () => {
    expect(await createBooking(request({ date: '2026-07-15' }), { userId: null })).toEqual({ id: 'new-booking' });
    expect(await createBooking(request({ date: '2026-06-16' }), { userId: null })).toEqual({ id: 'new-booking' });
  });

  it('DESIGN 5.1 ยอดไม่ตรง 409 price-changed ก่อนจัดคน', async () => {
    state.busy = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06'];
    expect(await errorCode(createBooking(request({ expectedPayAtShop: 999 }), { userId: null }))).toBe('price-changed');
    expect(statements('INSERT INTO bookings')).toHaveLength(0);
  });

  it('DESIGN 5.1 ยอดตรงกันจองสำเร็จ', async () => {
    expect(await createBooking(request({ expectedPayAtShop: 1000 }), { userId: null })).toEqual({ id: 'new-booking' });
  });
});

describe('จัดคน', () => {
  it('FR-08 ใครก็ได้ได้คะแนนสูงสุด', async () => {
    await createBooking(request(), { userId: null });
    expect(therapistsInserted()).toEqual(['T01']);
  });

  it('FR-08 ANY เท่ากับไม่เลือก และ T01 ไม่ว่างได้ T05', async () => {
    state.busy = ['T01'];
    await createBooking(request({ therapistId: 'ANY' }), { userId: null });
    expect(therapistsInserted()).toEqual(['T05']);
  });

  it('FR-09 S06 ได้ T03 ก่อน T04 ที่ไม่มีรีวิว', async () => {
    await createBooking(request({ serviceId: 'S06' }), { userId: null });
    expect(therapistsInserted()).toEqual(['T03']);
  });

  it('BR-05 เลือกคนเองแล้วไม่ว่าง 409 slot-taken ทันที', async () => {
    state.busy = ['T01'];
    expect(await errorCode(createBooking(request({ therapistId: 'T01' }), { userId: null }))).toBe('slot-taken');
  });

  it('FR-07 เลือกคนที่ทำบริการไม่ได้', async () => {
    expect(await errorCode(createBooking(request({ serviceId: 'S06', therapistId: 'T01' }), { userId: null }))).toBe(
      'therapist-cannot-perform',
    );
  });

  it('BR-11 ใครก็ได้ไม่มีใครว่าง slot-taken', async () => {
    state.busy = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06'];
    expect(await errorCode(createBooking(request(), { userId: null }))).toBe('slot-taken');
  });

  it('BR-06 คู่ห้องไม่ว่าง slot-taken แม้คนพอ', async () => {
    state.suiteBusy = true;
    expect(await errorCode(createBooking(request({ partySize: 2 }), { userId: null }))).toBe('slot-taken');
  });

  it('FR-15 คู่ห้องว่างแต่คนไม่พอ not-enough-therapists', async () => {
    state.busy = ['T03'];
    expect(await errorCode(createBooking(request({ serviceId: 'S06', partySize: 2 }), { userId: null }))).toBe(
      'not-enough-therapists',
    );
  });

  it('BR-11 กลุ่มคนไม่พอ not-enough-therapists', async () => {
    state.busy = ['T01'];
    expect(await errorCode(createBooking(request({ partySize: 6 }), { userId: null }))).toBe('not-enough-therapists');
  });

  it('FR-17 คู่และกลุ่มไม่สนใจ therapistId ระบบจัดให้ · คู่ใช้ห้อง กลุ่มไม่ใช้', async () => {
    await createBooking(request({ partySize: 2, therapistId: 'T06' }), { userId: null });
    expect(therapistsInserted()).toEqual(['T01', 'T05']);
    const couple = statements('INSERT INTO bookings')[0].params;
    expect(couple[5]).toBe('COUPLE');
    expect(couple[9]).toBe(true);

    state.queries = [];
    await createBooking(request({ partySize: 3 }), { userId: null });
    expect(therapistsInserted()).toEqual(['T01', 'T05', 'T02']);
    const group = statements('INSERT INTO bookings')[0].params;
    expect(group[5]).toBe('GROUP');
    expect(group[9]).toBe(false);
  });
});

describe('ชนกัน', () => {
  const overlap = Object.assign(new Error('conflict'), { code: '23P01' });
  const deadlock = Object.assign(new Error('deadlock'), { code: '40P01' });

  it('D-29 ใครก็ได้ชนแล้วลองใหม่ใน transaction ใหม่', async () => {
    state.insertErrors = [overlap, deadlock];
    expect(await createBooking(request(), { userId: null })).toEqual({ id: 'new-booking' });
    expect(state.transactions).toBe(3);
    expect(state.commits).toBe(1);
  });

  it('D-29 ลองใหม่ไม่เกิน 3 ครั้ง แล้วตอบ slot-taken', async () => {
    state.insertErrors = [overlap, overlap, overlap, overlap, overlap];
    expect(await errorCode(createBooking(request(), { userId: null }))).toBe('slot-taken');
    expect(state.transactions).toBe(4);
  });

  it('D-29 เลือกคนเองชนแล้วตอบ slot-taken ทันที', async () => {
    state.insertErrors = [overlap];
    expect(await errorCode(createBooking(request({ therapistId: 'T01' }), { userId: null }))).toBe('slot-taken');
    expect(state.transactions).toBe(1);
  });

  it('D-29 error อื่นไม่ลองใหม่', async () => {
    state.insertErrors = [Object.assign(new Error('x'), { code: '23514' })];
    expect(await errorCode(createBooking(request(), { userId: null }))).toBe('23514');
    expect(state.transactions).toBe(1);
  });
});

describe('บันทึกและหักสิทธิ์', () => {
  it('FR-29 แต้ม บัตร เดือนเกิด หักครบ และบันทึกยอดลงการจอง', async () => {
    state.quote = loaded({
      lines: {
        fullPrice: 2000,
        discountPercent: 20,
        discountSource: 'BIRTHDAY',
        discountAmount: 400,
        pointsRedeemed: 200,
        pointsDiscount: 100,
        serviceNet: 1500,
        cars: 1,
        transportFee: 300,
        totalBeforeGiftCard: 1800,
        giftCardAmount: 500,
        payAtShop: 1300,
      },
      internal: { serviceDurationMinutes: 90, giftCardId: 'card', hotelId: 'H04', distanceKm: '12.0' },
      birthday: { offered: true, eligible: true, applied: true, reason: null },
    });
    await createBooking(request(), { userId: USER });

    const insert = statements('INSERT INTO bookings')[0].params;
    expect(String(insert[0])).toMatch(/^[A-Z2-9]{8}$/);
    expect(insert.slice(1, 4)).toEqual([USER, null, null]);
    expect(insert.slice(10, 26 - 1)).toEqual([2000, 20, 'BIRTHDAY', 400, 200, 100, 1500, 'H04', '12.0', 1, 300, 'card', 500, 1300, null]);

    expect(statements('UPDATE users SET points_balance')[0].params).toEqual([USER, 200]);
    expect(statements('INSERT INTO point_transactions')[0].params.slice(0, 3)).toEqual([USER, 'new-booking', -200]);
    expect(statements('UPDATE gift_cards')[0].params).toEqual(['card', 500]);
    expect(statements('INSERT INTO gift_card_transactions')[0].params.slice(0, 3)).toEqual(['card', 'new-booking', 500]);
    expect(statements('INSERT INTO birthday_redemptions')[0].params).toEqual([USER, 2026, 'new-booking']);
    expect(statements('course_purchases')).toHaveLength(0);
  });

  it('FR-38 จองด้วยคอร์สกันครั้ง', async () => {
    state.quote = loaded({ course: { id: COURSE_ID, remaining: 6, expiresOn: '2026-12-01' } });
    await createBooking(request({ serviceId: 'K01', coursePurchaseId: COURSE_ID }), { userId: USER });
    expect(statements('UPDATE course_purchases')[0].params).toEqual([COURSE_ID]);
    expect(statements('INSERT INTO bookings')[0].params[24]).toBe(COURSE_ID);
  });

  it('FR-10 แขกไม่หักแต้ม ไม่ใช้สิทธิ์เดือนเกิด และบันทึกชื่อกับเบอร์', async () => {
    await createBooking(request({ guest: { name: ' คุณแขก ', phone: '0890000001' } }), { userId: null });
    expect(statements('INSERT INTO bookings')[0].params.slice(1, 4)).toEqual([null, 'คุณแขก', '0890000001']);
    expect(statements('point_transactions')).toHaveLength(0);
    expect(statements('birthday_redemptions')).toHaveLength(0);
  });

  it('BR-02 end_at = start + duration และ created_at มาจากนาฬิกาของเว็บ', async () => {
    await createBooking(request(), { userId: null });
    const insert = statements('INSERT INTO bookings')[0].params;
    expect(insert[7]).toEqual(new Date('2026-06-17T14:00:00+07:00'));
    expect(insert[8]).toEqual(new Date('2026-06-17T15:00:00+07:00'));
    expect(insert[25]).toEqual(new Date('2026-06-15T10:00:00+07:00'));
  });

  it('BR-33 บัตรที่ไม่ได้ถูกหักจริงไม่ผูกกับการจอง', async () => {
    state.quote = loaded({ internal: { serviceDurationMinutes: 60, giftCardId: 'card', hotelId: null, distanceKm: null } });
    await createBooking(request(), { userId: null });
    expect(statements('INSERT INTO bookings')[0].params[21]).toBeNull();
    expect(statements('gift_cards')).toHaveLength(0);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  queries: [] as { text: string; params: unknown[] }[],
  refs: null as Record<string, unknown> | null,
  row: null as Record<string, unknown> | null,
  now: new Date('2026-06-15T10:00:00+07:00'),
  birthdayRows: 0,
}));

vi.mock('@/lib/clock', () => ({ getNow: vi.fn(async () => state.now) }));

vi.mock('@/lib/booking/read', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./read')>();
  return { ...actual, getBookingDetail: vi.fn(async (_db: unknown, id: string) => ({ id, status: 'CANCELLED' })) };
});

vi.mock('@/lib/db', () => {
  const client = {
    query: vi.fn(async (text: string, params: unknown[] = []) => {
      state.queries.push({ text, params });
      if (text.startsWith('SELECT id, user_id')) return { rows: state.refs ? [state.refs] : [] };
      if (text.startsWith('SELECT status')) return { rows: state.row ? [state.row] : [] };
      if (text.startsWith('UPDATE birthday_redemptions')) return { rows: [], rowCount: state.birthdayRows };
      return { rows: [], rowCount: 1 };
    }),
  };
  return { withTransaction: vi.fn(async (fn: (c: unknown) => Promise<unknown>) => fn(client)) };
});

import { cancelGuestBooking, cancelMemberBooking } from './cancel';

const ID = '00000000-0000-0000-0000-000000000215';
const USER = '00000000-0000-0000-0000-000000000112';
const CARD = '00000000-0000-0000-0000-000000000416';
const COURSE = '00000000-0000-0000-0000-000000000306';

function refs(overrides: Record<string, unknown> = {}) {
  return { id: ID, user_id: USER, course_purchase_id: null, gift_card_id: null, ...overrides };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    status: 'CONFIRMED',
    start_at: new Date('2026-06-25T14:00:00+07:00'),
    points_redeemed: 0,
    gift_card_amount: '0.00',
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

beforeEach(() => {
  state.queries = [];
  state.refs = refs();
  state.row = row();
  state.now = new Date('2026-06-15T10:00:00+07:00');
  state.birthdayRows = 0;
});

describe('ยกเลิก', () => {
  it('FR-22 คืนแต้ม บัตร เดือนเกิด ครบ (B15: 300 + 200 · บัตร ฿500 + ฿500)', async () => {
    state.refs = refs({ gift_card_id: CARD });
    state.row = row({ points_redeemed: 200, gift_card_amount: '500.00' });
    state.birthdayRows = 1;

    const res = await cancelMemberBooking(ID, USER);

    expect(res.refunded).toEqual({ sessions: 0, points: 200, giftCardAmount: 500, birthday: true });
    expect(statements("UPDATE bookings SET status = 'CANCELLED'")[0].params).toEqual([ID]);
    expect(statements('UPDATE booking_items SET slot_active = false')[0].params).toEqual([ID]);
    expect(statements('UPDATE users SET points_balance = points_balance + $2')[0].params).toEqual([USER, 200]);
    expect(statements('INSERT INTO point_transactions')[0].text).toContain("'REFUND'");
    expect(statements('INSERT INTO point_transactions')[0].params.slice(0, 3)).toEqual([USER, ID, 200]);
    expect(statements('UPDATE gift_cards SET balance = balance + $2')[0].params).toEqual([CARD, '500.00']);
    expect(statements('INSERT INTO gift_card_transactions')[0].text).toContain("'REFUND'");
    expect(statements('UPDATE birthday_redemptions')[0].params).toEqual([ID, state.now]);
  });

  it('FR-22 ไม่ต่ออายุบัตร (D-05)', async () => {
    state.refs = refs({ user_id: null, gift_card_id: CARD });
    state.row = row({ gift_card_amount: '300.00' });
    await cancelGuestBooking('SJTEST19', '0890000007');
    expect(state.queries.some((q) => q.text.includes('expires_on'))).toBe(false);
    expect(statements('UPDATE gift_cards')[0].text).not.toContain('expires');
  });

  it('FR-22 คอร์สคืนครั้งที่กันไว้', async () => {
    state.refs = refs({ course_purchase_id: COURSE });
    const res = await cancelMemberBooking(ID, USER);
    expect(res.refunded.sessions).toBe(1);
    expect(statements('reserved_sessions = reserved_sessions - 1')[0].params).toEqual([COURSE]);
  });

  it('DESIGN 4 ล็อก users → course_purchases → gift_cards แล้วจึงการจอง', async () => {
    state.refs = refs({ course_purchase_id: COURSE, gift_card_id: CARD });
    await cancelMemberBooking(ID, USER);
    const locks = state.queries.filter((q) => q.text.includes('FOR UPDATE')).map((q) => q.text.split(' FROM ')[1].split(' ')[0]);
    expect(locks).toEqual(['users', 'course_purchases', 'gift_cards', 'bookings']);
  });

  it.each([
    ['เหลือ 23:59', '2026-06-16T10:00:00+07:00', '2026-06-15T10:01:00+07:00', 'cancel-too-late'],
    ['เหลือ 24:00', '2026-06-16T10:00:00+07:00', '2026-06-15T10:00:00+07:00', null],
    ['เหลือ 24:01', '2026-06-16T10:00:00+07:00', '2026-06-15T09:59:00+07:00', null],
    ['เหลือ 3:00', '2026-06-15T13:00:00+07:00', '2026-06-15T10:00:00+07:00', 'cancel-too-late'],
  ])('BR-14 %s', async (_label, start, now, code) => {
    state.row = row({ start_at: new Date(start as string) });
    state.now = new Date(now as string);
    expect(await errorCode(cancelMemberBooking(ID, USER))).toBe(code);
    expect(statements("UPDATE bookings SET status = 'CANCELLED'")).toHaveLength(code ? 0 : 1);
  });

  it.each(['COMPLETED', 'CANCELLED'])('FR-80 สถานะ %s ยกเลิกซ้ำไม่ได้', async (status) => {
    state.row = row({ status });
    expect(await errorCode(cancelMemberBooking(ID, USER))).toBe('booking-not-cancellable');
    expect(statements('slot_active = false')).toHaveLength(0);
  });

  it('NFR-12 ไม่ใช่ของตนหรือรหัสเสียตอบไม่พบ', async () => {
    state.refs = null;
    expect(await errorCode(cancelMemberBooking(ID, USER))).toBe('booking-not-found');
    expect(await errorCode(cancelMemberBooking('nope', USER))).toBe('booking-not-found');
  });

  it('FR-26 แขกค้นด้วยรหัส เบอร์ และเฉพาะการจองของแขก', async () => {
    state.refs = refs({ user_id: null });
    await cancelGuestBooking(' sjtest10 ', '0890000003');
    const lookup = state.queries[0];
    expect(lookup.text).toContain('user_id IS NULL');
    expect(lookup.params).toEqual(['SJTEST10', '0890000003']);
  });

  it('FR-26 เบอร์ไม่ตรงหรือไม่กรอกตอบไม่พบ และนัดยังอยู่', async () => {
    state.refs = null;
    expect(await errorCode(cancelGuestBooking('SJTEST10', '0890000099'))).toBe('booking-not-found');
    expect(await errorCode(cancelGuestBooking(undefined, undefined))).toBe('booking-not-found');
    expect(await errorCode(cancelGuestBooking('', ''))).toBe('booking-not-found');
    expect(statements('UPDATE')).toHaveLength(0);
  });
});

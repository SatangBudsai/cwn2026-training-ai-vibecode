import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/booking/read', () => ({
  getBookingDetail: async (_db: unknown, id: string) => ({ id, status: 'COMPLETED' }),
}));

import type { Db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { completeBookingTx } from './complete';

const ID = '00000000-0000-0000-0000-000000000205';
const USER = '00000000-0000-0000-0000-000000000109';
const NOW = new Date('2026-06-15T03:00:00Z');

interface BookingRow {
  user_id: string | null;
  course_purchase_id: string | null;
  service_net: string;
  gift_card_amount: string;
}

interface World {
  status: string | null;
  booking: BookingRow;
  spend: number;
  points: number;
  used: number;
  reserved: number;
}

function fakeDb(world: World) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const db = {
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT user_id')) {
        return { rows: world.status ? [{ user_id: world.booking.user_id, course_purchase_id: world.booking.course_purchase_id }] : [] };
      }
      if (sql.startsWith('UPDATE bookings SET status')) {
        if (world.status !== 'CONFIRMED') return { rows: [] };
        world.status = 'COMPLETED';
        return { rows: [world.booking] };
      }
      if (sql.startsWith('SELECT status')) return { rows: world.status ? [{ status: world.status }] : [] };
      if (sql.startsWith('SELECT lifetime_spend')) {
        return { rows: [{ lifetime_spend: `${world.spend}.00`, points_balance: world.points }] };
      }
      if (sql.startsWith('UPDATE users')) {
        world.spend += params[1] as number;
        world.points += params[2] as number;
        return { rows: [{ lifetime_spend: `${world.spend}.00`, points_balance: world.points }] };
      }
      if (sql.startsWith('UPDATE course_purchases')) {
        world.reserved -= 1;
        world.used += 1;
        return { rows: [{ total_sessions: 11, used_sessions: world.used, reserved_sessions: world.reserved }] };
      }
      return { rows: [] };
    },
  } as unknown as Db;
  return { db, calls };
}

function memberWorld(over: Partial<World> = {}, booking: Partial<BookingRow> = {}): World {
  return {
    status: 'CONFIRMED',
    booking: { user_id: USER, course_purchase_id: null, service_net: '950.00', gift_card_amount: '0.00', ...booking },
    spend: 10001,
    points: 199,
    used: 4,
    reserved: 1,
    ...over,
  };
}

async function errorCode(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (err) {
    return err instanceof ApiError ? err.code : 'not-api-error';
  }
}

let world: World;
beforeEach(() => {
  world = memberWorld();
});

describe('completeBookingTx', () => {
  it('สมาชิกได้แต้มจากฐาน ยอดสะสมเพิ่ม และบันทึก EARN', async () => {
    const { db, calls } = fakeDb(world);
    const res = await completeBookingTx(db, ID, NOW);
    expect(res.pointsEarned).toBe(9);
    expect(res.member).toEqual({ lifetimeSpend: 10951, pointsBalance: 208, tier: 'Gold' });
    expect(res.course).toBeNull();
    const earn = calls.find((c) => c.sql.includes('point_transactions'))!;
    expect(earn.params).toEqual([USER, ID, 9, NOW]);
    expect(calls.find((c) => c.sql.includes('points_earned'))!.params).toEqual([ID, 9]);
    expect(calls.find((c) => c.sql.startsWith('UPDATE bookings SET status'))!.params).toEqual([ID, NOW]);
  });

  it('ฐานหักบัตรและไม่รวมค่ารถ ระดับขึ้นตามยอดใหม่', async () => {
    world = memberWorld({ spend: 9999, points: 50 }, { service_net: '1900.00', gift_card_amount: '500.00' });
    const { db } = fakeDb(world);
    const res = await completeBookingTx(db, ID, NOW);
    expect(res.pointsEarned).toBe(14);
    expect(res.member).toEqual({ lifetimeSpend: 11399, pointsBalance: 64, tier: 'Gold' });
  });

  it('ฐานต่ำกว่า 100 ได้ยอดสะสมแต่ไม่มีรายการ EARN', async () => {
    world = memberWorld({ spend: 100, points: 0 }, { service_net: '99.00' });
    const { db, calls } = fakeDb(world);
    const res = await completeBookingTx(db, ID, NOW);
    expect(res.pointsEarned).toBe(0);
    expect(res.member?.lifetimeSpend).toBe(199);
    expect(calls.some((c) => c.sql.includes('point_transactions'))).toBe(false);
    expect(calls.some((c) => c.sql.includes('points_earned'))).toBe(false);
  });

  it('จองด้วยคอร์ส: ตัดครั้ง 0 แต้ม ยอดไม่เพิ่ม แม้มีค่ารถและบัตร', async () => {
    world = memberWorld(
      { spend: 12400, points: 10, used: 4, reserved: 1 },
      { course_purchase_id: 'c1', service_net: '0.00', gift_card_amount: '300.00' },
    );
    const { db, calls } = fakeDb(world);
    const res = await completeBookingTx(db, ID, NOW);
    expect(res.pointsEarned).toBe(0);
    expect(res.course).toEqual({ remaining: 6, usedSessions: 5, reservedSessions: 0 });
    expect(res.member).toEqual({ lifetimeSpend: 12400, pointsBalance: 10, tier: 'Gold' });
    expect(calls.some((c) => c.sql.startsWith('UPDATE users'))).toBe(false);
    expect(calls.some((c) => c.sql.includes('point_transactions'))).toBe(false);
  });

  it('ล็อก users แล้ว course_purchases แล้วจึงแตะ bookings', async () => {
    world = memberWorld({}, { course_purchase_id: 'c1' });
    const { db, calls } = fakeDb(world);
    await completeBookingTx(db, ID, NOW);
    const order = calls.map((c) => c.sql);
    const users = order.findIndex((s) => s.includes('FROM users') && s.includes('FOR UPDATE'));
    const course = order.findIndex((s) => s.includes('FROM course_purchases') && s.includes('FOR UPDATE'));
    const booking = order.findIndex((s) => s.startsWith('UPDATE bookings SET status'));
    expect(users).toBeGreaterThanOrEqual(0);
    expect(course).toBeGreaterThan(users);
    expect(booking).toBeGreaterThan(course);
  });

  it('UPDATE เป็นด่านตัดสิน: ถูกยกเลิกระหว่างรอ lock ก็ไม่ให้แต้ม', async () => {
    const { db, calls } = fakeDb(world);
    const inner = db.query.bind(db) as (sql: string, params?: unknown[]) => Promise<unknown>;
    (db as unknown as { query: unknown }).query = async (sql: string, params?: unknown[]) => {
      if (sql.startsWith('UPDATE bookings SET status')) world.status = 'CANCELLED';
      return inner(sql, params);
    };
    expect(await errorCode(completeBookingTx(db, ID, NOW))).toBe('booking-not-cancellable');
    expect(calls.some((c) => c.sql.startsWith('UPDATE users') || c.sql.includes('point_transactions'))).toBe(false);
  });

  it('แขก: 0 แต้ม ไม่มียอด และไม่แตะตาราง users', async () => {
    world = memberWorld({}, { user_id: null, service_net: '800.00' });
    const { db, calls } = fakeDb(world);
    const res = await completeBookingTx(db, ID, NOW);
    expect(res).toMatchObject({ pointsEarned: 0, member: null, course: null });
    expect(calls.some((c) => c.sql.includes('users'))).toBe(false);
  });

  it('กดซ้ำตอบ already-completed และไม่ให้แต้มซ้ำ', async () => {
    const { db, calls } = fakeDb(world);
    await completeBookingTx(db, ID, NOW);
    const pointsAfterFirst = world.points;
    calls.length = 0;
    expect(await errorCode(completeBookingTx(db, ID, NOW))).toBe('already-completed');
    expect(world.points).toBe(pointsAfterFirst);
    expect(calls.some((c) => c.sql.startsWith('UPDATE users') || c.sql.includes('point_transactions'))).toBe(false);
  });

  it('นัดที่ยกเลิกแล้วตอบ booking-not-cancellable', async () => {
    const { db } = fakeDb(memberWorld({ status: 'CANCELLED' }));
    expect(await errorCode(completeBookingTx(db, ID, NOW))).toBe('booking-not-cancellable');
  });

  it('ไม่พบ และ id ไม่ใช่ UUID ตอบ booking-not-found', async () => {
    const missing = fakeDb(memberWorld({ status: null }));
    expect(await errorCode(completeBookingTx(missing.db, ID, NOW))).toBe('booking-not-found');
    const bad = fakeDb(world);
    expect(await errorCode(completeBookingTx(bad.db, 'abc', NOW))).toBe('booking-not-found');
    expect(bad.calls).toEqual([]);
  });
});

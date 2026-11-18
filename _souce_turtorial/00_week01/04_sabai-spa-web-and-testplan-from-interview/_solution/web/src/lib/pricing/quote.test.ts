// loadAndQuote กับฐานข้อมูลปลอม · ข้อมูลตาม seed ที่วันล็อก 15 มิ.ย. 2026 (ไม่ได้รัน SQL จริง)
import { describe, expect, test } from 'vitest';
import type { Db } from '@/lib/db';
import type { QuoteRequest, ServiceId } from '@/types';
import { loadAndQuote, type QuoteContext } from './quote';

const TODAY = '2026-06-15';
const NOW = new Date('2026-06-15T10:00:00+07:00');

const SERVICES: Record<string, [string, number, string, number]> = {
  S01: ['SERVICE', 60, '1000.00', 6],
  S04: ['SERVICE', 90, '2000.00', 3],
  S05: ['SERVICE', 60, '800.00', 5],
  S07: ['SERVICE', 60, '1800.00', 2],
  P01: ['PACKAGE', 120, '2900.00', 3],
  K01: ['COURSE', 60, '15000.00', 2],
};
const U = (n: number) => `00000000-0000-0000-0000-000000000${100 + n}`;
const C = (n: number) => `00000000-0000-0000-0000-000000000${300 + n}`;
const USERS: Record<string, [string | null, string, number]> = {
  [U(1)]: ['1985-03-01', '12400.00', 99],
  [U(2)]: ['1992-06-01', '30000.00', 0],
  [U(3)]: ['1994-02-01', '9999.00', 250],
  [U(4)]: ['1997-05-01', '0.00', 0],
  [U(5)]: ['2003-06-01', '29999.00', 100],
  [U(10)]: ['1986-09-01', '30001.00', 200],
  [U(11)]: ['1995-06-01', '500.00', 1700],
};
const COURSES: Record<string, [string, number, number, number, string, string]> = {
  [C(1)]: [U(1), 11, 4, 0, '2026-03-17', '2026-09-13'],
  [C(4)]: [U(10), 11, 11, 0, '2026-02-15', '2026-08-14'],
  // คอร์สเก่าที่ใช้ครบด้วย เพื่อตรวจลำดับ used-up ก่อน expired
  [C(7)]: [U(10), 11, 11, 0, '2025-01-01', '2025-06-30'],
  [C(8)]: [U(1), 11, 6, 0, '2025-12-16', '2026-06-14'],
};
const GIFTS: Record<string, [string, string, string, string]> = {
  'GIFT-500': ['g500', '500.00', '2026-06-05', '2027-06-05'],
  'GIFT-EXP365': ['g365', '1000.00', '2025-06-15', '2026-06-15'],
  'GIFT-EXP366': ['g366', '1000.00', '2025-06-14', '2026-06-14'],
  'GIFT-BAL-0': ['g0', '0.00', '2026-05-01', '2027-05-01'],
};
const HOTELS: Record<string, string> = { H01: '2.0', H02: '5.0', H04: '12.0', H06: '15.1' };
const BIRTHDAYS: Record<string, number[]> = { [U(5)]: [2026] };

function fakeDb() {
  const log: string[] = [];
  const db = {
    query: async (sql: string, params: unknown[] = []) => {
      log.push(sql);
      const key = String(params[0]);
      if (sql.includes('FROM services')) {
        const row = SERVICES[key];
        return {
          rows: row ? [{ id: key, kind: row[0], duration_minutes: row[1], price: row[2], therapist_count: row[3] }] : [],
        };
      }
      if (sql.includes('FROM users')) {
        const row = USERS[key];
        return { rows: row ? [{ id: key, birth_date: row[0], lifetime_spend: row[1], points_balance: row[2] }] : [] };
      }
      if (sql.includes('FROM course_purchases')) {
        const row = COURSES[key];
        if (!row || row[0] !== params[1]) return { rows: [] };
        return {
          rows: [
            {
              id: key,
              total_sessions: row[1],
              used_sessions: row[2],
              reserved_sessions: row[3],
              purchased_on: row[4],
              expires_on: row[5],
            },
          ],
        };
      }
      if (sql.includes('FROM gift_cards')) {
        const row = GIFTS[key];
        return {
          rows: row ? [{ id: row[0], code: key, balance: row[1], purchased_on: row[2], expires_on: row[3] }] : [],
        };
      }
      if (sql.includes('FROM hotels')) {
        return { rows: HOTELS[key] ? [{ id: key, distance_km: HOTELS[key] }] : [] };
      }
      if (sql.includes('FROM birthday_redemptions')) {
        return { rows: (BIRTHDAYS[key] ?? []).map((benefit_year) => ({ benefit_year })) };
      }
      throw new Error(`unexpected sql: ${sql}`);
    },
  };
  return { db: db as unknown as Db, log };
}

function req(serviceId: ServiceId, over: Partial<QuoteRequest> = {}): QuoteRequest {
  return { serviceId, partySize: 1, date: '2026-06-20', ...over };
}

function ctx(userId: string | null = null, over: Partial<QuoteContext> = {}): QuoteContext {
  return { userId, today: TODAY, now: NOW, forUpdate: false, ...over };
}

function call(request: QuoteRequest, context: QuoteContext = ctx()) {
  return loadAndQuote(fakeDb().db, request, context);
}

async function errorOf(request: QuoteRequest, context: QuoteContext = ctx()): Promise<string> {
  try {
    await call(request, context);
  } catch (err) {
    return (err as { code: string }).code;
  }
  return 'no-error';
}

describe('การล็อกแถว', () => {
  const full = req('K01', { coursePurchaseId: C(1), giftCardCode: 'GIFT-500', shuttle: { hotelId: 'H04' } });

  test('forUpdate ล็อกตามลำดับ users → course_purchases → gift_cards', async () => {
    const { db, log } = fakeDb();
    await loadAndQuote(db, full, ctx(U(1), { forUpdate: true }));
    const locked = log.filter((sql) => sql.includes('FOR UPDATE')).map((sql) => /FROM (\w+)/.exec(sql)?.[1]);
    expect(locked).toEqual(['users', 'course_purchases', 'gift_cards']);
  });

  test('ไม่ใช่ forUpdate ไม่ล็อกเลย', async () => {
    const { db, log } = fakeDb();
    await loadAndQuote(db, full, ctx(U(1)));
    expect(log.some((sql) => sql.includes('FOR UPDATE'))).toBe(false);
  });
});

describe('ลำดับตรวจและ error', () => {
  test.each<[string, QuoteRequest, QuoteContext, string]>([
    ['7 คน', req('S01', { partySize: 7 }), ctx(), 'party-too-large-call'],
    ['0 คน', req('S01', { partySize: 0 }), ctx(), 'validation'],
    ['จำนวนคนมีทศนิยม', req('S01', { partySize: 1.5 }), ctx(), 'validation'],
    ['ไม่มีบริการ', req('X99' as ServiceId), ctx(), 'service-not-found'],
    ['P01 4 คน', req('P01', { partySize: 4, shuttle: { hotelId: 'H01' } }), ctx(), 'not-enough-therapists'],
    ['S07 3 คน', req('S07', { partySize: 3 }), ctx(), 'not-enough-therapists'],
    ['จองวันนี้', req('S01', { date: TODAY }), ctx(), 'same-day-call'],
    ['วันนี้+31', req('S01', { date: '2026-07-16' }), ctx(), 'date-out-of-range'],
    ['วันที่ผิดรูป', req('S01', { date: '2026-13-01' }), ctx(), 'validation'],
    ['เวลาผิดรูป', req('S01', { time: '25:00' }), ctx(), 'validation'],
    ['K01 ไม่มีคอร์ส', req('K01'), ctx(U(1)), 'course-required'],
    ['แขกใช้คอร์ส', req('K01', { coursePurchaseId: C(1) }), ctx(), 'course-login-required'],
    ['คอร์ส 2 คน', req('K01', { coursePurchaseId: C(1), partySize: 2 }), ctx(U(1)), 'course-one-person'],
    ['คอร์สรหัสเสีย', req('K01', { coursePurchaseId: 'abc' }), ctx(U(1)), 'course-not-found'],
    ['คอร์สของคนอื่น', req('K01', { coursePurchaseId: C(1) }), ctx(U(2)), 'course-not-found'],
    ['คอร์สเหลือ 0', req('K01', { coursePurchaseId: C(4) }), ctx(U(10)), 'course-used-up'],
    ['ใช้ครบและหมดอายุ ตอบ used-up', req('K01', { coursePurchaseId: C(7) }), ctx(U(10)), 'course-used-up'],
    ['คอร์สหมดอายุ', req('K01', { coursePurchaseId: C(8) }), ctx(U(1)), 'course-expired'],
    ['P01 ไม่ส่ง shuttle', req('P01'), ctx(), 'distance-required'],
    ['shuttle ว่าง', req('S01', { shuttle: {} }), ctx(), 'distance-required'],
    ['ระยะว่าง', req('S01', { shuttle: { distanceKm: '  ' } }), ctx(), 'distance-required'],
    ['ไม่มีโรงแรม', req('S01', { shuttle: { hotelId: 'H09' as 'H01' } }), ctx(), 'hotel-not-found'],
    ['ระยะ 5.05', req('S01', { shuttle: { distanceKm: '5.05' } }), ctx(), 'distance-invalid'],
    ['H06 เกิน 15.0', req('S01', { shuttle: { hotelId: 'H06' } }), ctx(), 'distance-too-far'],
    ['บัตรไม่พบ', req('S01', { giftCardCode: 'NOPE' }), ctx(), 'giftcard-not-found'],
    ['บัตรวันที่ 366', req('S01', { giftCardCode: 'GIFT-EXP366' }), ctx(), 'giftcard-expired'],
    ['บัตรยอด 0', req('S01', { giftCardCode: 'GIFT-BAL-0' }), ctx(), 'giftcard-empty'],
    ['U11 แลก 17 ชุด', req('S05', { pointsToRedeem: 1700 }), ctx(U(11)), 'points-exceed-service'],
    ['U03 แลก 150', req('S01', { pointsToRedeem: 150 }), ctx(U(3)), 'points-not-multiple'],
    ['U01 แลก 100 มี 99', req('S01', { pointsToRedeem: 100 }), ctx(U(1)), 'points-not-enough'],
    ['แขกแลก', req('S01', { pointsToRedeem: 100 }), ctx(), 'points-login-required'],
    ['บัญชีไม่มีแล้ว', req('S01'), ctx(U(99)), 'unauthorized'],
  ])('%s', async (_name, request, context, code) => {
    expect(await errorOf(request, context)).toBe(code);
  });
});

describe('ราคาและข้อมูลประกอบ', () => {
  test('แขก: ไม่มีระดับ ไม่มีตัวเลือกเดือนเกิด แต้ม 0', async () => {
    const q = await call(req('S01', { useBirthday: true }));
    expect(q.tier).toBeNull();
    expect(q.birthday).toEqual({ offered: false, eligible: false, applied: false, reason: 'guest' });
    expect(q.points).toEqual({ balance: 0, maxSets: 0, maxRedeemable: 0 });
    expect(q.pointsEarnedPreview).toBe(0);
    expect(q.lines.payAtShop).toBe(1000);
  });

  test('เทียบ E118 U02 เลือกเดือนเกิดในเดือนเกิด', async () => {
    const q = await call(req('S01', { date: '2026-06-30', useBirthday: true }), ctx(U(2)));
    expect(q.lines.payAtShop).toBe(800);
    expect(q.lines.discountSource).toBe('BIRTHDAY');
    expect(q.birthday).toEqual({ offered: true, eligible: true, applied: true, reason: null });
    expect(q.tier).toBe('Platinum');
    expect(q.pointsEarnedPreview).toBe(8);
  });

  test('เทียบ E122 เข้าเงื่อนไขแต่ไม่กดเลือก', async () => {
    const q = await call(req('S01'), ctx(U(2)));
    expect(q.lines.payAtShop).toBe(900);
    expect(q.birthday).toEqual({ offered: true, eligible: true, applied: false, reason: null });
  });

  test('เทียบ E119 เลือกเดือนเกิดนอกเดือน ไม่ error ใช้ระดับแทน', async () => {
    const q = await call(req('S01', { date: '2026-07-01', useBirthday: true }), ctx(U(2)));
    expect(q.lines.payAtShop).toBe(900);
    expect(q.birthday.reason).toBe('not-birthday-month');
    expect(q.birthday.applied).toBe(false);
  });

  test('เทียบ E123 U05 ใช้สิทธิ์ปีนี้แล้ว ไม่ error ใช้ระดับแทน', async () => {
    const q = await call(req('S01', { useBirthday: true }), ctx(U(5)));
    expect(q.lines.payAtShop).toBe(950);
    expect(q.birthday.reason).toBe('already-used');
  });

  test('เทียบ E130 P01 ไม่มีตัวเลือกเดือนเกิด', async () => {
    const q = await call(req('P01', { useBirthday: true, shuttle: { hotelId: 'H04' } }), ctx(U(2)));
    expect(q.lines.payAtShop).toBe(2900);
    expect(q.lines.cars).toBe(1);
    expect(q.birthday).toEqual({ offered: false, eligible: false, applied: false, reason: 'service-not-eligible' });
  });

  test('ประเภทการจองตามจำนวนคน', async () => {
    expect((await call(req('S01'))).bookingType).toBe('SINGLE');
    const couple = await call(req('S01', { partySize: 2 }));
    expect(couple.bookingType).toBe('COUPLE');
    expect(couple.isCoupleSuite).toBe(true);
    const group = await call(req('S01', { partySize: 3 }));
    expect(group.bookingType).toBe('GROUP');
    expect(group.isCoupleSuite).toBe(false);
  });

  test('เทียบ E100 maxSets ของ U11 กับ S05 เป็น 16', async () => {
    const q = await call(req('S05'), ctx(U(11)));
    expect(q.points).toEqual({ balance: 1700, maxSets: 16, maxRedeemable: 1600 });
  });

  test('เทียบ E97 maxSets คิดจากยอดหลัง %', async () => {
    const q = await call(req('S01', { pointsToRedeem: 200 }), ctx(U(10)));
    expect(q.points.maxSets).toBe(2);
    expect(q.lines.payAtShop).toBe(800);
  });

  test('เทียบ E164 คอร์ส รถ บัตร แต้ม 0', async () => {
    const q = await call(
      req('K01', { coursePurchaseId: C(1), shuttle: { hotelId: 'H04' }, giftCardCode: 'GIFT-500' }),
      ctx(U(1)),
    );
    expect(q.lines.fullPrice).toBe(0);
    expect(q.lines.transportFee).toBe(300);
    expect(q.lines.payAtShop).toBe(0);
    expect(q.giftCard).toEqual({
      code: 'GIFT-500',
      balanceBefore: 500,
      amountUsed: 300,
      balanceAfter: 200,
      expiresOn: '2027-06-05',
    });
    expect(q.course).toEqual({ id: C(1), remaining: 7, expiresOn: '2026-09-13' });
    expect(q.pointsEarnedPreview).toBe(0);
    expect(q.internal).toEqual({
      serviceDurationMinutes: 60,
      giftCardId: 'g500',
      hotelId: 'H04',
      distanceKm: '12.0',
    });
  });

  test('เทียบ E208 บัตรวันที่ 365 นัดหลังวันหมดอายุ ใช้ได้เพราะดูวันจอง', async () => {
    const q = await call(req('S01', { date: '2026-07-15', giftCardCode: 'GIFT-EXP365' }), ctx(U(4)));
    expect(q.lines.giftCardAmount).toBe(1000);
    expect(q.lines.payAtShop).toBe(0);
  });

  test('ส่งทั้ง hotelId และระยะ ใช้ hotelId · ระยะพิมพ์เองเก็บแบบทศนิยม 1 ตำแหน่ง', async () => {
    const both = await call(req('S01', { shuttle: { hotelId: 'H01', distanceKm: '12.0' } }));
    expect(both.internal.hotelId).toBe('H01');
    expect(both.lines.transportFee).toBe(0);
    const typed = await call(req('S01', { shuttle: { distanceKm: '12' } }));
    expect(typed.internal).toMatchObject({ hotelId: null, distanceKm: '12.0' });
    const numeric = await call(req('S01', { shuttle: { distanceKm: 5.1 as unknown as string } }));
    expect(numeric.lines.transportFee).toBe(300);
  });

  test('ไม่ใช้รถ internal เป็น null', async () => {
    const q = await call(req('S01'));
    expect(q.internal).toEqual({ serviceDurationMinutes: 60, giftCardId: null, hotelId: null, distanceKm: null });
  });

  test('under24h ขอบ 24:00 พอดีเป็น false', async () => {
    const at = (date: string, time?: string) => call(req('S01', { date, time }));
    expect((await at('2026-06-16', '09:59')).under24h).toBe(true);
    expect((await at('2026-06-16', '10:00')).under24h).toBe(false);
    expect((await at('2026-06-16')).under24h).toBe(false);
  });
});

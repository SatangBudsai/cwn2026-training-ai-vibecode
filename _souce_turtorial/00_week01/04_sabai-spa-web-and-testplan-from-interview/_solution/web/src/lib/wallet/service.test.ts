import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (sql: string, params: unknown[]) => { rows: unknown[] } | undefined;

const state = vi.hoisted(() => ({
  handler: (() => undefined) as unknown as (sql: string, params: unknown[]) => { rows: unknown[] } | undefined,
  calls: [] as { sql: string; params: unknown[] }[],
}));

vi.mock('@/lib/clock', () => ({
  getToday: async () => '2026-06-15',
  getNow: async () => new Date('2026-06-15T03:00:00Z'),
}));
vi.mock('@/lib/db', () => {
  const run = async (sql: string, params: unknown[] = []) => {
    state.calls.push({ sql, params });
    return state.handler(sql, params) ?? { rows: [] };
  };
  return {
    query: run,
    withTransaction: async <T,>(fn: (client: { query: typeof run }) => Promise<T>) => fn({ query: run }),
  };
});

import { ApiError } from '@/lib/errors';
import { createGiftCard, getGiftCard, getWallet, purchaseCourse } from './service';

const USER = '00000000-0000-0000-0000-000000000103';

function setHandler(handler: Handler) {
  state.handler = handler;
}

async function errorCode(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (err) {
    return err instanceof ApiError ? err.code : 'not-api-error';
  }
}

const K01 = { price: '15000.00', name_th: 'คอร์ส', name_en: 'Course', name_zh: '疗程' };

function courseHandler(role = 'CUSTOMER'): Handler {
  return (sql, params) => {
    if (sql.includes('FROM users')) return { rows: [{ role }] };
    if (sql.includes('FROM services')) return { rows: [K01] };
    if (sql.includes('INSERT INTO course_purchases')) {
      return {
        rows: [{
          id: 'new',
          total_sessions: params[3],
          used_sessions: 0,
          reserved_sessions: 0,
          purchased_on: params[4],
          expires_on: params[5],
          price_paid: params[2],
        }],
      };
    }
    return undefined;
  };
}

function giftCardInsert(params: unknown[]) {
  return {
    code: params[0],
    design: params[2],
    initial_value: `${params[3]}.00`,
    balance: `${params[3]}.00`,
    purchased_on: params[4],
    expires_on: params[5],
    delivery_channel: params[6],
  };
}

beforeEach(() => {
  state.calls.length = 0;
  setHandler(() => undefined);
});

describe('purchaseCourse', () => {
  it('ได้ 11 ครั้ง ราคาเต็ม วันซื้อคือวันนี้ และหมดอายุ +180', async () => {
    setHandler(courseHandler());
    const { course } = await purchaseCourse(USER);
    expect(course).toMatchObject({
      serviceId: 'K01',
      totalSessions: 11,
      remaining: 11,
      pricePaid: 15000,
      purchasedOn: '2026-06-15',
      expiresOn: '2026-12-12',
      expired: false,
      usedUp: false,
    });
  });

  it('ไม่แตะยอดสะสมและแต้ม', async () => {
    setHandler(courseHandler());
    await purchaseCourse(USER);
    const writes = state.calls.filter((c) => /UPDATE|point_transactions/.test(c.sql));
    expect(writes).toEqual([]);
  });

  it('บัญชีร้านซื้อไม่ได้ และ session ค้างตอบ 401', async () => {
    setHandler(courseHandler('OWNER'));
    expect(await errorCode(purchaseCourse(USER))).toBe('forbidden');
    setHandler(() => undefined);
    expect(await errorCode(purchaseCourse(USER))).toBe('unauthorized');
  });
});

describe('createGiftCard', () => {
  const body = { amount: 2000, design: 'LOTUS', channel: 'LINE', recipient: 'fon', message: 'สุขสันต์' };

  function giftHandler(hasUser = true): Handler {
    return (sql, params) => {
      if (sql.includes('FROM users')) return { rows: hasUser ? [{ id: USER }] : [] };
      if (sql.includes('INSERT INTO gift_cards')) return { rows: [giftCardInsert(params)] };
      return undefined;
    };
  }

  it('แขกซื้อได้ buyer เป็น NULL และหมดอายุ +365', async () => {
    setHandler(giftHandler());
    const res = await createGiftCard(body, null, 'th');
    const insert = state.calls.find((c) => c.sql.includes('INSERT INTO gift_cards'))!;
    expect(insert.params[1]).toBeNull();
    expect(res.giftCard).toMatchObject({
      initialValue: 2000,
      balance: 2000,
      design: 'LOTUS',
      imagePath: '/brand/giftcard/gc-lotus.jpg',
      purchasedOn: '2026-06-15',
      expiresOn: '2027-06-15',
      usable: true,
      channel: 'LINE',
      paymentStatus: 'SIMULATED',
    });
    expect(res.giftCard.code).toMatch(/^GIFT-/);
    expect(res.simulatedMessage).toContain('15 มิ.ย. 2027');
    expect(res.simulatedMessage).toContain(res.giftCard.code);
  });

  it('สมาชิกบันทึก buyer และไม่แตะยอดสะสมกับแต้ม', async () => {
    setHandler(giftHandler());
    await createGiftCard(body, USER, 'en');
    const insert = state.calls.find((c) => c.sql.includes('INSERT INTO gift_cards'))!;
    expect(insert.params[1]).toBe(USER);
    expect(state.calls.filter((c) => /UPDATE|point_transactions/.test(c.sql))).toEqual([]);
  });

  it('session ค้างนับเป็นแขก', async () => {
    setHandler(giftHandler(false));
    await createGiftCard(body, USER, 'th');
    const insert = state.calls.find((c) => c.sql.includes('INSERT INTO gift_cards'))!;
    expect(insert.params[1]).toBeNull();
  });

  it('รหัสชนแล้วสุ่มใหม่', async () => {
    let attempts = 0;
    setHandler((sql, params) => {
      if (!sql.includes('INSERT INTO gift_cards')) return undefined;
      attempts += 1;
      return { rows: attempts < 3 ? [] : [giftCardInsert(params)] };
    });
    const res = await createGiftCard(body, null, 'th');
    const codes = state.calls.filter((c) => c.sql.includes('INSERT INTO gift_cards')).map((c) => c.params[0]);
    expect(codes).toHaveLength(3);
    expect(new Set(codes).size).toBe(3);
    expect(res.giftCard.code).toBe(codes[2]);
  });

  it('มูลค่าผิดไม่ถึงฐานข้อมูล', async () => {
    expect(await errorCode(createGiftCard({ ...body, amount: '2149.99' }, null, 'th'))).toBe('giftcard-amount-invalid');
    expect(state.calls).toEqual([]);
  });
});

describe('getGiftCard', () => {
  const row = {
    code: 'GIFT-EXP366',
    design: 'GOLD',
    initial_value: '1000.00',
    balance: '1000.00',
    purchased_on: '2025-06-14',
    expires_on: '2026-06-14',
    delivery_channel: 'LINE',
  };

  it('คืนสรุปและคิด expired จากวันนี้', async () => {
    setHandler(() => ({ rows: [row] }));
    const { giftCard } = await getGiftCard('GIFT-EXP366');
    expect(giftCard).toMatchObject({ expired: true, usable: false, balance: 1000 });
  });

  it('ไม่พบ และรหัสรูปแบบแปลกตอบ giftcard-not-found', async () => {
    expect(await errorCode(getGiftCard('NOPE'))).toBe('giftcard-not-found');
    state.calls.length = 0;
    expect(await errorCode(getGiftCard("x'; DROP--\0"))).toBe('giftcard-not-found');
    expect(state.calls).toEqual([]);
  });
});

describe('getWallet', () => {
  it('ถามทุกตารางด้วย user ของ session และคำนวณยอดลดลง', async () => {
    setHandler((sql) => {
      if (sql.includes('course_purchases')) {
        return {
          rows: [{
            id: 'c1', name_th: 'คอร์ส', name_en: 'Course', name_zh: '疗程', total_sessions: 11, used_sessions: 4,
            reserved_sessions: 0, purchased_on: '2026-03-17', expires_on: '2026-09-13', price_paid: '15000.00',
          }],
        };
      }
      if (sql.includes('waist_measurements')) {
        return {
          rows: [
            { measured_on: '2026-03-17', waist_cm: '82.0' },
            { measured_on: '2026-05-19', waist_cm: '78.0' },
          ],
        };
      }
      if (sql.includes('before_after_photos')) {
        return { rows: [{ kind: 'BEFORE', taken_on: '2026-03-17', file_path: 'public/placeholder/nida-before-body.jpg' }] };
      }
      return { rows: [] };
    });
    const wallet = await getWallet(USER);
    expect(wallet.courses[0]).toMatchObject({ remaining: 7, totalSessions: 11, expiresOn: '2026-09-13', expired: false });
    expect(wallet.waist).toEqual({
      points: [
        { date: '2026-03-17', cm: '82.0' },
        { date: '2026-05-19', cm: '78.0' },
      ],
      reducedCm: '4.0',
    });
    expect(wallet.photos[0]).toMatchObject({ url: '/placeholder/nida-before-body.jpg', placeholder: true });
    expect(wallet.giftCards).toEqual([]);
    expect(state.calls).toHaveLength(4);
    for (const call of state.calls) {
      expect(call.params).toEqual([USER]);
      expect(call.sql).toMatch(/user_id = \$1/);
    }
  });
});

// ยิง route จริงโดยแทนฐานข้อมูลและ cookie store ด้วยของปลอม · session.ts errors.ts และกฎระดับของ A2 เป็นของจริง
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { POST as register } from '@/app/api/auth/register/route';
import { GET as myBookings } from '@/app/api/me/bookings/route';
import { GET as history } from '@/app/api/me/history/route';
import { GET as me } from '@/app/api/me/route';
import { listBookingsForUser } from '@/lib/booking/read';
import { decodeSession, encodeSession, SESSION_COOKIE } from '@/lib/session';
import type { BookingDetail, BookingStatus, MeResponse } from '@/types';
import { hashPassword } from './password';

interface FakeUser {
  id: string;
  email: string;
  password_hash: string;
  role: 'CUSTOMER' | 'OWNER';
  full_name: string;
  phone: string;
  birth_date: string | null;
  lifetime_spend: string;
  points_balance: number;
}

const state = vi.hoisted(() => ({
  users: [] as unknown[],
  cookies: new Map<string, string>(),
  queryLog: [] as unknown[][],
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = state.cookies.get(name);
      return value === undefined ? undefined : { value };
    },
    set: (name: string, value: string) => void state.cookies.set(name, value),
    delete: (name: string) => void state.cookies.delete(name),
  }),
}));

vi.mock('@/lib/db', () => ({
  getPool: () => ({}),
  query: async (text: string, params: unknown[] = []) => {
    state.queryLog.push(params);
    const users = state.users as FakeUser[];
    if (text.includes('INSERT INTO users')) {
      if (users.some((u) => u.email === params[0])) return { rows: [] };
      const row: FakeUser = {
        id: '00000000-0000-0000-0000-000000000999',
        email: params[0] as string,
        password_hash: params[1] as string,
        role: 'CUSTOMER',
        full_name: params[2] as string,
        phone: params[3] as string,
        birth_date: params[4] as string,
        lifetime_spend: '0.00',
        points_balance: 0,
      };
      users.push(row);
      return { rows: [row] };
    }
    if (text.includes('WHERE email = $1')) return { rows: users.filter((u) => u.email === params[0]) };
    if (text.includes('WHERE id = $1')) return { rows: users.filter((u) => u.id === params[0]) };
    throw new Error(`unexpected SQL: ${text}`);
  },
}));

vi.mock('@/lib/clock', () => ({
  getToday: async () => '2026-06-15',
  getNow: async () => new Date('2026-06-15T03:00:00Z'),
}));

vi.mock('@/lib/booking/read', () => ({ listBookingsForUser: vi.fn() }));

const CTX = { params: Promise.resolve({}) };
const U01 = '00000000-0000-0000-0000-000000000101';

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/x', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers,
  });
}
const get = () => new NextRequest('http://localhost/api/x');

function addUser(overrides: Partial<FakeUser>): FakeUser {
  const user: FakeUser = {
    id: U01,
    email: 'nida@sabai.test',
    password_hash: '',
    role: 'CUSTOMER',
    full_name: 'คุณนิดา',
    phone: '0810000001',
    birth_date: '1985-03-01',
    lifetime_spend: '12400.00',
    points_balance: 99,
    ...overrides,
  };
  (state.users as FakeUser[]).push(user);
  return user;
}

function signIn(user: Pick<FakeUser, 'id' | 'role'>): void {
  state.cookies.set(SESSION_COOKIE, encodeSession({ userId: user.id, role: user.role }));
}

function booking(id: string, date: string, overrides: Partial<BookingDetail> = {}): BookingDetail {
  return {
    id,
    bookingCode: `CODE-${id}`,
    serviceId: 'K01',
    serviceName: { th: 'คอร์ส', en: 'Course', zh: '疗程' },
    date,
    time: '14:00',
    endTime: '15:00',
    therapists: [],
    coursePurchaseId: 'c01',
    pointsEarned: 0,
    lines: { payAtShop: 0 },
    ...overrides,
  } as BookingDetail;
}

const VALID_REGISTER = {
  email: 'New@Sabai.Test',
  password: 'Passw0rd!',
  fullName: 'คุณใหม่',
  phone: '0812345678',
  birthDate: '1990-01-31',
};

beforeEach(() => {
  state.users = [];
  state.cookies.clear();
  state.queryLog = [];
  vi.mocked(listBookingsForUser).mockReset();
});

describe('POST /api/auth/register', () => {
  it('สมัครสำเร็จ ได้ 201 พร้อม cookie เก็บอีเมลตัวเล็ก และเป็น CUSTOMER', async () => {
    const res = await register(post({ ...VALID_REGISTER, role: 'OWNER' }), CTX);
    expect(res.status).toBe(201);
    const { user } = (await res.json()) as { user: MeResponse };
    expect(user).toMatchObject({
      email: 'new@sabai.test',
      role: 'CUSTOMER',
      birthDate: '1990-01-31',
      lifetimeSpend: 0,
      pointsBalance: 0,
      tier: 'Silver',
      nextTier: { name: 'Gold', gap: 10000 },
    });
    expect(decodeSession(state.cookies.get(SESSION_COOKIE))).toEqual({ userId: user.id, role: 'CUSTOMER' });
  });

  it('ไม่ส่งรหัสที่อ่านได้เข้าฐานข้อมูล และไม่คืน hash ใน response', async () => {
    const spy = vi.spyOn(console, 'error');
    const res = await register(post(VALID_REGISTER), CTX);
    expect(JSON.stringify(state.queryLog)).not.toContain(VALID_REGISTER.password);
    expect((state.users as FakeUser[])[0].password_hash.startsWith('$argon2id$')).toBe(true);
    expect(await res.text()).not.toContain('argon2');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('อีเมลซ้ำแบบตัวใหญ่ตอบ 409 email-taken และไม่ตั้ง cookie', async () => {
    addUser({});
    const res = await register(post({ ...VALID_REGISTER, email: 'NIDA@sabai.test' }), CTX);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('email-taken');
    expect(state.cookies.has(SESSION_COOKIE)).toBe(false);
  });

  it('วันเกิดเป็นวันนี้ตอบ 422 ตามภาษาของ request', async () => {
    const res = await register(post({ ...VALID_REGISTER, birthDate: '2026-06-15' }, { 'x-locale': 'en' }), CTX);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: { code: 'birth-date-invalid', message: 'Please enter a valid date of birth' },
    });
  });

  it('JSON เสียตอบ 400 validation', async () => {
    const res = await register(post('{not json'), CTX);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('เข้าได้ด้วยอีเมลตัวใหญ่ และ session ใช้ role จากฐานข้อมูล', async () => {
    const owner = addUser({
      id: '00000000-0000-0000-0000-000000000107',
      email: 'owner@sabai.test',
      role: 'OWNER',
      password_hash: await hashPassword('Owner#2026'),
    });
    const res = await login(post({ email: 'OWNER@Sabai.Test', password: 'Owner#2026' }), CTX);
    expect(res.status).toBe(200);
    expect(decodeSession(state.cookies.get(SESSION_COOKIE))).toEqual({ userId: owner.id, role: 'OWNER' });
    expect(await res.text()).not.toContain('argon2');
  });

  it('รหัสผิด อีเมลไม่มี หรือช่องผิดชนิด ตอบ invalid-credentials เหมือนกันและไม่ตั้ง cookie', async () => {
    addUser({ password_hash: await hashPassword('Nida#2026') });
    for (const body of [
      { email: 'nida@sabai.test', password: 'wrong-password' },
      { email: 'nobody@sabai.test', password: 'Nida#2026' },
      { email: 'nida@sabai.test', password: 12345678 },
    ]) {
      const res = await login(post(body), CTX);
      expect(res.status).toBe(401);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid-credentials');
    }
    expect(state.cookies.has(SESSION_COOKIE)).toBe(false);
  });
});

describe('POST /api/auth/logout', () => {
  it('ล้าง cookie และตอบ ok แม้ไม่ได้เข้าสู่ระบบ', async () => {
    signIn({ id: U01, role: 'CUSTOMER' });
    const res = await logout(post({}), CTX);
    expect(await res.json()).toEqual({ ok: true });
    expect(state.cookies.has(SESSION_COOKIE)).toBe(false);
    expect((await logout(post({}), CTX)).status).toBe(200);
  });
});

describe('GET /api/me', () => {
  it('ไม่เข้าสู่ระบบตอบ 401', async () => {
    const res = await me(get(), CTX);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('unauthorized');
  });

  it('session ชี้ผู้ใช้ที่ไม่มีแล้ว ตอบ 401 และล้าง cookie', async () => {
    signIn({ id: '00000000-0000-0000-0000-000000000999', role: 'CUSTOMER' });
    const res = await me(get(), CTX);
    expect(res.status).toBe(401);
    expect(state.cookies.has(SESSION_COOKIE)).toBe(false);
  });

  it.each([
    ['12400.00', 'Gold', { name: 'Platinum', gap: 17600 }],
    ['9999.00', 'Silver', { name: 'Gold', gap: 1 }],
    ['29999.00', 'Gold', { name: 'Platinum', gap: 1 }],
    ['10000.00', 'Gold', { name: 'Platinum', gap: 20000 }],
    ['0.00', 'Silver', { name: 'Gold', gap: 10000 }],
    ['30000.00', 'Platinum', null],
  ])('ยอด %s ได้ระดับ %s และระดับถัดไปตามตาราง', async (spend, tier, next) => {
    signIn(addUser({ lifetime_spend: spend }));
    const body = (await (await me(get(), CTX)).json()) as MeResponse;
    expect(body.lifetimeSpend).toBe(Number(spend));
    expect(body.tier).toBe(tier);
    expect(body.nextTier).toEqual(next);
  });

  it('OWNER ไม่มีระดับและไม่มีระดับถัดไป', async () => {
    signIn(addUser({ role: 'OWNER', birth_date: null, lifetime_spend: '50000.00' }));
    const body = (await (await me(get(), CTX)).json()) as MeResponse;
    expect(body).toMatchObject({ role: 'OWNER', birthDate: null, tier: null, nextTier: null });
  });

  it('ไม่มี password_hash ใน response', async () => {
    signIn(addUser({ password_hash: 'secret-hash' }));
    expect(await (await me(get(), CTX)).text()).not.toContain('secret-hash');
  });
});

describe('GET /api/me/history', () => {
  it('ขอเฉพาะ COMPLETED ของตัวเอง และเรียงวันนัดล่าสุดก่อน', async () => {
    signIn(addUser({}));
    vi.mocked(listBookingsForUser).mockResolvedValue([
      booking('B01', '2026-03-24'),
      booking('B02', '2026-04-14'),
      booking('B03', '2026-05-05'),
      booking('B04', '2026-05-26'),
    ]);
    const res = await history(get(), CTX);
    expect(res.status).toBe(200);
    const { items } = (await res.json()) as { items: { bookingId: string }[] };
    expect(items.map((i) => i.bookingId)).toEqual(['B04', 'B03', 'B02', 'B01']);
    const [, userId, statuses] = vi.mocked(listBookingsForUser).mock.calls[0] as [unknown, string, BookingStatus[], Date];
    expect(userId).toBe(U01);
    expect(statuses).toEqual(['COMPLETED']);
  });

  it('วันเดียวกันเรียงเวลาล่าสุดก่อน และแปลงช่องตาม HistoryItem', async () => {
    signIn(addUser({}));
    vi.mocked(listBookingsForUser).mockResolvedValue([
      booking('A', '2026-05-05', { time: '10:00', coursePurchaseId: null, pointsEarned: 12, lines: { payAtShop: 1200 } as BookingDetail['lines'] }),
      booking('B', '2026-05-05', { time: '14:00' }),
    ]);
    const { items } = (await (await history(get(), CTX)).json()) as {
      items: { bookingId: string; usedCourse: boolean; payAtShop: number; pointsEarned: number }[];
    };
    expect(items.map((i) => i.bookingId)).toEqual(['B', 'A']);
    expect(items[0].usedCourse).toBe(true);
    expect(items[1]).toMatchObject({ usedCourse: false, payAtShop: 1200, pointsEarned: 12 });
  });

  it('ไม่เข้าสู่ระบบตอบ 401 และไม่อ่านการจอง', async () => {
    expect((await history(get(), CTX)).status).toBe(401);
    expect(listBookingsForUser).not.toHaveBeenCalled();
  });

  it('session ค้างตอบ 401 ล้าง cookie และไม่อ่านการจอง', async () => {
    signIn({ id: '00000000-0000-0000-0000-000000000999', role: 'CUSTOMER' });
    expect((await history(get(), CTX)).status).toBe(401);
    expect(state.cookies.has(SESSION_COOKIE)).toBe(false);
    expect(listBookingsForUser).not.toHaveBeenCalled();
  });
});

describe('GET /api/me/bookings', () => {
  it('ขอเฉพาะ CONFIRMED ของตัวเอง โดยใช้รหัสจาก session', async () => {
    signIn(addUser({}));
    vi.mocked(listBookingsForUser).mockResolvedValue([booking('B07', '2026-06-16')]);
    const res = await myBookings(new NextRequest(`http://localhost/api/x?userId=${'other'}`), CTX);
    const { bookings } = (await res.json()) as { bookings: { id: string }[] };
    expect(bookings.map((b) => b.id)).toEqual(['B07']);
    const [, userId, statuses] = vi.mocked(listBookingsForUser).mock.calls[0] as [unknown, string, BookingStatus[], Date];
    expect(userId).toBe(U01);
    expect(statuses).toEqual(['CONFIRMED']);
  });

  it('ไม่เข้าสู่ระบบตอบ 401', async () => {
    expect((await myBookings(get(), CTX)).status).toBe(401);
  });
});

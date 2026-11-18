import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST as lockPost } from '@/app/api/test/lock/route';
import { POST as resetPost } from '@/app/api/test/reset/route';
import { applyLock, parseIsoInstant, parseOptionalBody, resetTestData } from './index';
import type { Db } from '@/lib/db';

const ctx = { params: Promise.resolve({}) };

function post(url: string, body?: string): NextRequest {
  return new Request(`http://localhost${url}`, { method: 'POST', body }) as unknown as NextRequest;
}

function fakeDb(): { db: Db; calls: { text: string; values: unknown[] }[] } {
  const calls: { text: string; values: unknown[] }[] = [];
  const db = {
    query: async (text: string, values: unknown[]) => {
      calls.push({ text, values });
      return { rows: [], rowCount: 1 };
    },
  } as unknown as Db;
  return { db, calls };
}

afterEach(() => vi.unstubAllEnvs());

describe('parseIsoInstant', () => {
  it('รับ ISO พร้อมเขตเวลา และไม่บอกเขตถือเป็น Asia/Bangkok', () => {
    expect(parseIsoInstant('2026-06-15T10:00:00+07:00')?.toISOString()).toBe('2026-06-15T03:00:00.000Z');
    expect(parseIsoInstant('2026-06-15T03:00:00Z')?.toISOString()).toBe('2026-06-15T03:00:00.000Z');
    expect(parseIsoInstant('2026-06-15T10:00')?.toISOString()).toBe('2026-06-15T03:00:00.000Z');
    expect(parseIsoInstant('2026-06-15')?.toISOString()).toBe('2026-06-14T17:00:00.000Z');
  });

  it('ค่าที่ไม่ใช่ ISO หรือไม่มีจริงได้ null', () => {
    for (const value of ['hello', '', 'June 15 2026', '2026-02-31T10:00:00+07:00', '2026-06-15T25:00:00+07:00', 123, null]) {
      expect(parseIsoInstant(value)).toBeNull();
    }
  });
});

describe('parseOptionalBody', () => {
  it('body ว่างไม่ส่ง now · JSON เสียหรือไม่ใช่ object ตอบ validation', () => {
    expect(parseOptionalBody('')).toEqual({});
    expect(parseOptionalBody('{"now":"x"}')).toEqual({ now: 'x' });
    expect(() => parseOptionalBody('{bad')).toThrow();
    expect(() => parseOptionalBody('[1]')).toThrow();
  });
});

describe('applyLock', () => {
  it('อัปเดตเดือนเกิด ปีสิทธิ์ และเวลาล็อก ตามวันของ Asia/Bangkok', async () => {
    const { db, calls } = fakeDb();
    // 31 ธ.ค. 2026 20:00 UTC คือ 1 ม.ค. 2027 03:00 ที่กรุงเทพฯ
    const iso = await applyLock(db, new Date('2026-12-31T20:00:00Z'));
    expect(iso).toBe('2027-01-01T03:00:00+07:00');
    expect(calls[0].text).toContain('UPDATE users');
    expect(calls[0].values[0]).toBe(1);
    expect(calls[0].values[1]).toEqual([
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000105',
    ]);
    expect(calls[1].text).toContain('birthday_redemptions');
    expect(calls[1].values).toEqual([2027, '00000000-0000-0000-0000-000000000105']);
    expect(calls[2].text).toContain('locked_now');
    expect(calls[2].values).toEqual(['2027-01-01T03:00:00+07:00']);
    expect(calls).toHaveLength(3);
  });
});

describe('route ทดสอบ', () => {
  it('ปิดโหมดทดสอบแล้วตอบ 404 not-found ทั้ง reset และ lock', async () => {
    vi.stubEnv('ALLOW_TEST_RESET', '');
    for (const res of [
      await resetPost(post('/api/test/reset'), ctx),
      await lockPost(post('/api/test/lock', '{"now":"2026-06-15T10:00:00+07:00"}'), ctx),
    ]) {
      expect(res.status).toBe(404);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('not-found');
    }
  });

  it('now ที่ parse ไม่ได้ตอบ 400 validation ก่อนแตะฐานข้อมูล', async () => {
    vi.stubEnv('ALLOW_TEST_RESET', '1');
    for (const res of [
      await resetPost(post('/api/test/reset', '{"now":"not-a-date"}'), ctx),
      await lockPost(post('/api/test/lock', '{"now":"not-a-date"}'), ctx),
      await lockPost(post('/api/test/lock', '{}'), ctx),
      await lockPost(post('/api/test/lock'), ctx),
    ]) {
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('validation');
    }
  });

  it('reset ปฏิเสธ now ที่ผิดชนิด', async () => {
    await expect(resetTestData(null)).rejects.toMatchObject({ code: 'validation' });
    await expect(resetTestData(20260615)).rejects.toMatchObject({ code: 'validation' });
  });
});

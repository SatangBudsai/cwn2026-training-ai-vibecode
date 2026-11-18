// เครื่องมือทดสอบ · เปิดเมื่อ ALLOW_TEST_RESET=1 เท่านั้น (D-25) · seed มีชุดเดียวคือ sabai_seed
import { bangkokDate, bangkokIso, isValidDateString, monthOf, yearOf } from '@/lib/date';
import { query, withTransaction, type Db } from '@/lib/db';
import { isTestMode } from '@/lib/env';
import { ApiError } from '@/lib/errors';
import type { TestOkResponse } from '@/types';

const DEFAULT_NOW = '2026-06-15T10:00:00+07:00';
const U02 = '00000000-0000-0000-0000-000000000102';
const U05 = '00000000-0000-0000-0000-000000000105';

const ISO_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * ISO ที่ parse ได้เป็น instant · ไม่บอกเขตเวลาถือเป็น Asia/Bangkok (เซิร์ฟเวอร์เป็น UTC แต่ระบบไม่มีเขตอื่น)
 * ตรวจวันเองเพราะ new Date('2026-02-31T…') ของ V8 ไม่ error แต่เลื่อนไปเดือนถัดไป
 */
export function parseIsoInstant(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = ISO_PATTERN.exec(value);
  if (!match) return null;
  const [, date, time = '00:00:00', zone = '+07:00'] = match;
  if (!isValidDateString(date)) return null;
  const instant = new Date(`${date}T${time}${zone}`);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** อ่าน body ของ POST reset · body ว่างแปลว่าไม่ส่ง now */
export function parseOptionalBody(text: string): Record<string, unknown> {
  if (text.trim() === '') return {};
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError('validation');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ApiError('validation');
  return body as Record<string, unknown>;
}

function requireInstant(value: unknown): Date {
  const instant = parseIsoInstant(value);
  if (!instant) throw new ApiError('validation');
  return instant;
}

export function assertTestMode(): void {
  if (!isTestMode()) throw new ApiError('not-found');
}

/** ล้างทุกตารางกลับเป็น seed และล็อกวันนี้ */
export async function resetTestData(now: unknown): Promise<TestOkResponse> {
  const iso = bangkokIso(requireInstant(now === undefined ? DEFAULT_NOW : now));
  await query('SELECT sabai_seed($1::timestamptz)', [iso]);
  return { ok: true, now: iso };
}

/** D-24: ขยับเวลาล็อก เดือนเกิดของ U02, U05 และปีของ R01 · ไม่แตะคอร์สและบัตร · ล็อก users ก่อนตามลำดับกลาง */
export async function applyLock(db: Db, instant: Date): Promise<string> {
  const iso = bangkokIso(instant);
  const today = bangkokDate(instant);
  await db.query(
    `UPDATE users
        SET birth_date = make_date(EXTRACT(YEAR FROM birth_date)::int, $1::int, 1)
      WHERE id = ANY($2::uuid[])`,
    [monthOf(today), [U02, U05]],
  );
  await db.query(
    'UPDATE birthday_redemptions SET benefit_year = $1 WHERE user_id = $2 AND booking_id IS NULL',
    [yearOf(today), U05],
  );
  await db.query(`UPDATE app_settings SET value = $1 WHERE key = 'locked_now'`, [iso]);
  return iso;
}

export async function lockTestClock(now: unknown): Promise<TestOkResponse> {
  const instant = requireInstant(now);
  const iso = await withTransaction((client) => applyLock(client, instant));
  return { ok: true, now: iso };
}

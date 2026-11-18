// นาฬิกาของเว็บ · กฎและปฏิทินทุกตัวอ่านจากที่นี่เท่านั้น
// ห้ามใช้ Date.now(), new Date() เป็น "วันนี้" หรือ now() ของ PostgreSQL ในกฎร้าน
import { addDays, bangkokDate, bangkokIso } from '@/lib/date';
import { query, type Db } from '@/lib/db';
import { isTestMode } from '@/lib/env';
import type { ClockResponse } from '@/types';
import { lastBookableDate } from '@/lib/rules/booking-window';

/** "ตอนนี้" ของเว็บ: locked_now เมื่อ ALLOW_TEST_RESET=1 ไม่งั้นเวลาจริง */
export async function getNow(db?: Db): Promise<Date> {
  if (isTestMode()) {
    const sql = `SELECT value FROM app_settings WHERE key = 'locked_now'`;
    const res = db ? await db.query<{ value: string }>(sql) : await query<{ value: string }>(sql);
    const value = res.rows[0]?.value;
    if (value) return new Date(value);
  }
  return new Date();
}

/** วันนี้ของเว็บ 'YYYY-MM-DD' */
export async function getToday(db?: Db): Promise<string> {
  return bangkokDate(await getNow(db));
}

export async function getClock(): Promise<ClockResponse> {
  const now = await getNow();
  const today = bangkokDate(now);
  return {
    now: bangkokIso(now),
    today,
    minBookingDate: addDays(today, 1),
    maxBookingDate: lastBookableDate(today),
    locked: isTestMode(),
  };
}

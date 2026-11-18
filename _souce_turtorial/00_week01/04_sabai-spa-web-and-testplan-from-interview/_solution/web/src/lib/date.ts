// helper วันที่แบบ string ล้วน ใช้ได้ทั้งเซิร์ฟเวอร์ เบราว์เซอร์ และ unit test
// วันเป็น 'YYYY-MM-DD' เวลาเป็น 'HH:MM' ตาม Asia/Bangkok (UTC+7 ไม่มี DST)

const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function dateToUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isValidDateString(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const ms = dateToUtcMs(s);
  return new Date(ms).toISOString().slice(0, 10) === s;
}

export function isValidTimeString(s: unknown): s is string {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** วันที่ตาม Asia/Bangkok ของ instant นี้ */
export function bangkokDate(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** เวลา 'HH:MM' ตาม Asia/Bangkok ของ instant นี้ */
export function bangkokTime(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

/** instant จากวันและเวลาตาม Asia/Bangkok */
export function bangkokInstant(date: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  return new Date(dateToUtcMs(date) + (h * 60 + m) * 60000 - OFFSET_MS);
}

/** ISO แบบ 2026-06-15T10:00:00+07:00 */
export function bangkokIso(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 19) + '+07:00';
}

export function addDays(date: string, days: number): string {
  return new Date(dateToUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** จำนวนวันจาก from ถึง to (to − from) */
export function diffDays(from: string, to: string): number {
  return Math.round((dateToUtcMs(to) - dateToUtcMs(from)) / DAY_MS);
}

export function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

/** นาทีตั้งแต่ 00:00 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

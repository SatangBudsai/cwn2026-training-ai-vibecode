// Date helpers. All "local" dates are ISO yyyy-mm-dd strings in Asia/Bangkok.

export const TZ = "Asia/Bangkok";
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const TH_DAYS_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export const BOOKING_WINDOW_DAYS = 364; // C6 + calendar range seen in E3 (~1 year)

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function parseISO(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000);
}

export function isValidISO(d: string | undefined | null): d is string {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return toISO(parseISO(d)) === d;
}

/** Day 15 of next month — the default travel date of this assignment. */
export function defaultTravelDate(today = todayISO()): string {
  const d = parseISO(today);
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 15)));
}

export function maxTravelDate(today = todayISO()): string {
  return addDays(today, BOOKING_WINDOW_DAYS);
}

/** C6: no past dates; also stay inside the ~1 year window. */
export function isSelectableDate(iso: string, today = todayISO()): boolean {
  return iso >= today && iso <= maxTravelDate(today);
}

export function fmtShort(iso: string): string {
  const d = parseISO(iso);
  return `${TH_DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${TH_MONTHS[d.getUTCMonth()]}`;
}

export function fmtLong(iso: string): string {
  const d = parseISO(iso);
  return `วัน${TH_DAYS_FULL[d.getUTCDay()]}ที่ ${d.getUTCDate()} ${TH_MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

export function fmtDayMonth(iso: string): string {
  const d = parseISO(iso);
  return `${d.getUTCDate()} ${TH_MONTHS[d.getUTCMonth()]}`;
}

export function monthTitle(year: number, month0: number): string {
  return `${TH_MONTHS_FULL[month0]} ${year + 543}`;
}

export const WEEKDAY_HEADERS = TH_DAYS;

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} นาที`;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} นาที`;
}

export function fmtDateTimeTH(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d) + " น.";
}

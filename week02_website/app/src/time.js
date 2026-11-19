// Virtual clock + Asia/Bangkok business-day logic. All business time reads go through here.
export const TZ_MS = 7 * 3600e3;
export const DAY = 86400e3;
export const DEFAULT_NOW = Date.parse('2026-12-01T09:00:00+07:00');

const bugSet = new Set((process.env.BUG_MODE || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
export const bug = id => bugSet.has(String(id).toUpperCase());

export const clock = { now: DEFAULT_NOW };
export const nowMs = () => clock.now;
export const resetClock = () => { clock.now = DEFAULT_NOW; };

const p2 = n => String(n).padStart(2, '0');
export function iso(ms) {
  if (ms == null) return null;
  const d = new Date(ms + TZ_MS);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}+07:00`;
}
export function parseIso(s) {
  if (typeof s !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}
export const dayNum = ms => Math.floor((ms + TZ_MS) / DAY);
export const secsOfDay = ms => Math.floor((((ms + TZ_MS) % DAY) + DAY) % DAY / 1000);
export const dayStr = dn => new Date(dn * DAY).toISOString().slice(0, 10);
export const dowOf = dn => new Date(dn * DAY).getUTCDay();
export const msAt = (dn, h = 16, m = 30, s = 0) => dn * DAY - TZ_MS + (h * 3600 + m * 60 + s) * 1000;
export const dayFromStr = str => Math.floor(Date.UTC(+str.slice(0, 4), +str.slice(5, 7) - 1, +str.slice(8, 10)) / DAY);
export const beYear = ms => new Date(ms + TZ_MS).getUTCFullYear() + 543;
export const validDateStr = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dayStr(dayFromStr(s)) === s;

export const holidays = new Map(); // 'YYYY-MM-DD' -> name
export function isBiz(dn) {
  const dw = dowOf(dn);
  if (dw === 0 || dw === 6) return false;
  if (bug('B03')) return true;
  return !holidays.has(dayStr(dn));
}
export function nextBiz(dn) { let d = dn + 1; while (!isBiz(d)) d++; return d; }
export function addBiz(dn, n) { let d = dn; for (let i = 0; i < n; i++) d = nextBiz(d); return d; }
/** business days in (from, to] */
export function countBiz(from, to) { let c = 0; for (let d = from + 1; d <= to; d++) if (isBiz(d)) c++; return c; }
export function d0Of(paidMs) {
  const dn = dayNum(paidMs);
  return isBiz(dn) && secsOfDay(paidMs) < 16 * 3600 + 30 * 60 ? dn : nextBiz(dn);
}
export const dueFromPaid = (paidMs, sla) => msAt(addBiz(d0Of(paidMs), sla));

export function slaLevel(c, now = nowMs()) {
  if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(c.status)) return 'closed';
  if (c.status === 'NEED_FIX') return 'paused';
  if (now > c.dueAt) return 'overdue';
  return countBiz(dayNum(now), dayNum(c.dueAt)) <= 1 ? 'near' : 'normal';
}
export function validUntilOf(serviceId, issuedMs) {
  const dn = dayNum(issuedMs);
  if (serviceId === 'SV-01') return dayStr(dn + 89);
  const d = new Date(issuedMs + TZ_MS);
  const y = d.getUTCFullYear() + 1, mo = d.getUTCMonth(); let dd = d.getUTCDate();
  if (mo === 1 && dd === 29) dd = 28;
  return dayStr(Math.floor(Date.UTC(y, mo, dd) / DAY) - 1);
}

'use strict';
// นาฬิกาจำลอง (แช่แข็ง) เขตเวลา Asia/Bangkok (+07:00) และตัวช่วย bug()
const DEFAULT_NOW = '2026-12-01T09:00:00+07:00';
const OFFSET_MS = 7 * 3600 * 1000;
let current = Date.parse(DEFAULT_NOW);

const pad = (n, w = 2) => String(n).padStart(w, '0');

// Date | ms -> 'YYYY-MM-DDTHH:mm:ss+07:00'
function toISO(d) {
  const t = new Date((d instanceof Date ? d.getTime() : Number(d)) + OFFSET_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}+07:00`;
}
// ส่วนประกอบเวลาไทย {y,m,d,h,mi,s,dow(0=อาทิตย์)}
function parts(d) {
  const t = new Date((d instanceof Date ? d.getTime() : Number(d)) + OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds(), dow: t.getUTCDay() };
}
function dateStr(d) { const p = parts(d); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; }
// ISO ต้องมี offset (Z หรือ ±hh:mm) มิฉะนั้น null
function parseISO(s) {
  if (typeof s !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) return null;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}
// วินาทีแช่แข็ง: คืนค่าเดิมทุกครั้งจนกว่าจะ set
const clock = {
  DEFAULT_NOW,
  nowMs: () => current,
  now: () => new Date(current),
  nowISO: () => toISO(current),
  set(ms) { current = ms; },
  reset() { current = Date.parse(DEFAULT_NOW); },
  toISO, parts, dateStr, parseISO,
  addMs: (ms, delta) => ms + delta,
};

// BUG_MODE=B03,B07 อ่านทุกครั้งที่เรียก (เปลี่ยน env ระหว่างรันได้)
function bug(id) {
  const raw = process.env.BUG_MODE || '';
  return raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).includes(String(id).toUpperCase());
}

module.exports = { clock, bug, toISO, parseISO, parts, dateStr, DEFAULT_NOW };

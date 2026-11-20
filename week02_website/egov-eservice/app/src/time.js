'use strict';
/**
 * src/time.js — นาฬิกาจำลอง Asia/Bangkok (+07:00) · B01
 *
 * กฎ: ทุกกฎธุรกิจต้องอ่านเวลาจาก time.now() / time.nowIso() เท่านั้น ห้ามเรียก Date.now() ตรง ๆ
 *  - TEST_MODE=1 → นาฬิกา "แช่แข็ง" เริ่มที่ 2026-12-01T09:00:00+07:00 (A-01, A-37) เปลี่ยนได้ด้วย PUT /api/test/clock
 *  - ไม่ตั้ง TEST_MODE → ใช้เวลาจริงของเครื่อง (ตั้ง CLOCK_START=<ISO> เพื่อแช่แข็งที่ค่าหนึ่งได้)
 *
 * รูปแบบเวลาที่เก็บใน store: สตริง ISO แบบ 'YYYY-MM-DDTHH:mm:ss+07:00' เสมอ (เทียบด้วย < > ตรง ๆ ได้
 * เพราะ offset เดียวกันทั้งหมด) · วันที่ล้วน 'YYYY-MM-DD' (dateKey) ตามปฏิทินไทย
 */

const OFFSET_MS = 7 * 3600 * 1000;            // ไทยไม่มี DST
const DEFAULT_NOW = '2026-12-01T09:00:00+07:00';
const DAY_MS = 86400000;

const TEST_MODE = process.env.TEST_MODE === '1' || /^true$/i.test(process.env.TEST_MODE || '');

const ISO_WITH_OFFSET = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})$/;

/** แปลง ISO ที่มี offset (Z หรือ ±HH:MM) → epoch ms · ไม่ถูกต้อง/ไม่มี offset → NaN */
function parseIso(str) {
  if (typeof str !== 'string') return NaN;
  const m = ISO_WITH_OFFSET.exec(str.trim());
  if (!m) return NaN;
  const [, y, mo, d, hh, mi, ss = '00', , off] = m;
  // ตรวจช่วงค่า (กัน 2026-02-31 / 25:00 ที่ Date ยอมแปลงข้ามวัน)
  const Y = +y, M = +mo, D = +d, H = +hh, MI = +mi, S = +ss;
  if (M < 1 || M > 12 || D < 1 || H > 23 || MI > 59 || S > 59) return NaN;
  if (D > new Date(Date.UTC(Y, M, 0)).getUTCDate()) return NaN;
  if (off !== 'Z') {
    const oh = +off.slice(1, 3), om = +off.slice(4, 6);
    if (oh > 14 || om > 59) return NaN;
  }
  const ms = Date.parse(str.trim());
  return Number.isFinite(ms) ? ms : NaN;
}

function pad(n, w = 2) { return String(n).padStart(w, '0'); }

/** ส่วนประกอบเวลาไทยของ epoch ms → {y,m,d,hh,mm,ss,dow} (m = 1..12, dow 0=อาทิตย์) */
function parts(ms) {
  const t = new Date(toMs(ms) + OFFSET_MS);
  return {
    y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
    hh: t.getUTCHours(), mm: t.getUTCMinutes(), ss: t.getUTCSeconds(), dow: t.getUTCDay(),
  };
}

/** รับ ms / ISO / Date → ms */
function toMs(v) {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') return parseIso(v);
  return NaN;
}

/** epoch ms (หรือ ISO) → 'YYYY-MM-DDTHH:mm:ss+07:00' */
function toIso(v) {
  const ms = toMs(v);
  if (!Number.isFinite(ms)) return null;
  const p = parts(ms);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}:${pad(p.ss)}+07:00`;
}

/** เวลาไทย → ms : bkk(2026,12,1,16,30,0) */
function bkk(y, m, d, hh = 0, mi = 0, ss = 0) {
  return Date.UTC(y, m - 1, d, hh, mi, ss) - OFFSET_MS;
}

/** 'YYYY-MM-DD' ตามปฏิทินไทยของเวลานั้น */
function dateKey(v) {
  const p = parts(toMs(v));
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** 'YYYY-MM-DD' → ms ของ 00:00 เวลาไทย (ถ้า hh,mi,ss ให้มาใช้ค่านั้น) */
function fromDateKey(key, hh = 0, mi = 0, ss = 0) {
  const [y, m, d] = String(key).split('-').map(Number);
  return bkk(y, m, d, hh, mi, ss);
}

/** บวกวันปฏิทินให้ dateKey */
function addDays(key, n) {
  return dateKey(fromDateKey(key) + n * DAY_MS);
}

/** วันในสัปดาห์ของ dateKey (0=อา. … 6=ส.) */
function dow(key) { return parts(fromDateKey(key)).dow; }
function isWeekend(key) { const w = dow(key); return w === 0 || w === 6; }

/** ปี พ.ศ. ของเวลานั้น (ตามปฏิทินไทย) */
function beYear(v) { return parts(toMs(v)).y + 543; }

/* ---------- การแสดงผลภาษาไทย (A-04) ---------- */
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/** '4 ธ.ค. 2569 16:30' */
function fmtThaiDateTime(v) {
  const ms = toMs(v);
  if (!Number.isFinite(ms)) return '';
  const p = parts(ms);
  return `${p.d} ${TH_MONTHS[p.m - 1]} ${p.y + 543} ${pad(p.hh)}:${pad(p.mm)}`;
}

/** '2 ก.พ. 2570' · รับ 'YYYY-MM-DD' หรือ ISO/ms */
function fmtThaiDate(v) {
  let ms;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) ms = fromDateKey(v);
  else ms = toMs(v);
  if (!Number.isFinite(ms)) return '';
  const p = parts(ms);
  return `${p.d} ${TH_MONTHS[p.m - 1]} ${p.y + 543}`;
}

/* ---------- นาฬิกา ---------- */
let frozenMs = null;   // null = เดินตามเวลาจริง

function initClock() {
  if (TEST_MODE) frozenMs = parseIso(DEFAULT_NOW);
  else if (process.env.CLOCK_START && Number.isFinite(parseIso(process.env.CLOCK_START))) frozenMs = parseIso(process.env.CLOCK_START);
  else frozenMs = null;
}
initClock();

/** เวลาปัจจุบัน (epoch ms) ตามนาฬิกาของระบบ */
function now() { return frozenMs === null ? Date.now() : frozenMs; }   // eslint-disable-line no-restricted-properties
/** เวลาปัจจุบันเป็น ISO +07:00 */
function nowIso() { return toIso(now()); }

/** ตั้งนาฬิกา (แช่แข็ง) · คืนค่า ISO +07:00 ที่ตั้ง · ค่าไม่ถูกต้อง → null */
function setNow(iso) {
  const ms = parseIso(iso);
  if (!Number.isFinite(ms)) return null;
  frozenMs = Math.floor(ms / 1000) * 1000;   // ความละเอียดระดับวินาที
  return toIso(frozenMs);
}

/** กลับค่าเริ่มต้น (reset) */
function resetClock() {
  if (TEST_MODE) frozenMs = parseIso(DEFAULT_NOW);
  else initClock();
  return nowIso();
}

function isFrozen() { return frozenMs !== null; }

module.exports = {
  DEFAULT_NOW, DAY_MS, OFFSET_MS, TEST_MODE, TH_MONTHS, TH_DAYS,
  now, nowIso, setNow, resetClock, isFrozen,
  parseIso, toIso, toMs, parts, bkk, dateKey, fromDateKey, addDays, dow, isWeekend, beYear,
  fmtThaiDateTime, fmtThaiDate,
};

'use strict';
/**
 * src/sla.js — SLA วันทำการ + ระดับเตือน + แจ้งเตือนในกระดิ่ง · B04
 *
 * กฎที่ทำ (REQUIREMENTS BR-12 BR-13 BR-14 BR-15 · DECISIONS ข้อ 8 ข้อ 18 · A-02 A-17 A-30 A-31 A-42)
 *   วันทำการ   = จันทร์–ศุกร์ ที่ไม่อยู่ใน store.state.holidays (ตารางปัจจุบัน ณ เวลาที่คำนวณ)
 *   BR-12     D0 = วันที่ชำระ ถ้าเป็นวันทำการและเวลา < 16:30:00 ไม่เช่นนั้นวันทำการถัดไป
 *             dueAt = วันทำการที่ N หลัง D0 เวลา 16:30:00 · คำนวณครั้งเดียวตอนชำระ (ไม่คำนวณใหม่เมื่อแก้วันหยุด)
 *   BR-13     ส่งแก้: dueAt ใหม่ = dueAt เดิม + จำนวนวันทำการใน (วันที่ตีกลับ, วันที่ส่งแก้] (นับตามวันที่ ไม่ดูเวลา)
 *             ใช้ตารางวันหยุด ณ เวลาที่ส่งแก้
 *   BR-14     ระดับ: closed (COMPLETED/REJECTED/CANCELLED) · paused (NEED_FIX) ·
 *             overdue ถ้า now > dueAt (ละเอียดระดับวินาที: 16:30:00 ยังไม่เกิน · 16:30:01 เกิน) ·
 *             near ถ้าวันคงเหลือ ≤ 1 · normal ถ้า ≥ 2
 *             วันคงเหลือ = จำนวนวันทำการ d ที่ วันนี้ < d ≤ วันกำหนดเสร็จ
 *   BR-15     แจ้งเตือน (ประเมินทุก request ที่ไม่ใช่ /api/test/* ผ่าน tick) เฉพาะระดับปัจจุบัน near/overdue
 *             ผู้รับ: PENDING_APPROVAL → head ทุกคน · APPROVED → ผู้ออกเอกสาร (issuer) ·
 *                     มีผู้ถือ → ผู้ถือ · ไม่มีผู้ถือ → officer ทุกคนของแผนกที่เรื่องอยู่ ·
 *                     overdue → head ทุกคนเพิ่ม (ไม่ซ้ำ) · 1 รายการต่อ (ผู้ใช้, คำขอ, ระดับ)
 *             NEED_FIX และคำขอที่ปิดแล้วไม่ประเมิน
 *
 * BUG_MODE (BUGS.md)
 *   B03  ฟังก์ชันนับวันทำการ "สำหรับกำหนดเสร็จ" ไม่ดูตารางวันหยุด (ข้ามแค่เสาร์-อาทิตย์):
 *        กระทบ computeDueAt (ตอนชำระ) และการขยายจากหยุดนับ (countPausedDays / extendDueAt / applyResubmit)
 *        ไม่กระทบ "วันคงเหลือ" ของระดับเตือนและแจ้งเตือน เพื่อไม่ให้รั่วไป TC-NOTI-02 (ข้อ 1 ของ BUGS: เฉพาะจุด)
 *        seed เก็บ dueAt ตายตัว จึงไม่กระทบ (ข้อ 2 ของ BUGS)
 *   B04  ไม่หยุดนับระหว่าง NEED_FIX: ส่งแก้แล้ว dueAt ไม่ขยาย (pausedDays = 0)
 *        ระดับตอน NEED_FIX ยังเป็น paused และยังไม่ประเมินแจ้งเตือน (ไม่ให้รั่วไป TC-NOTI-01 / TC-DASH-01)
 *
 * ── API สำหรับบล็อกอื่น ──  const sla = require('./sla');
 *   sla.computeDueAt(paidAtIso, serviceIdOrDays)  → 'YYYY-MM-DDT16:30:00+07:00'   (B03 drafts.js เรียกตอนชำระสำเร็จ)
 *   sla.applyResubmit(caseObj, atIso?)            → { dueAt, pausedDays }         (B05 workflow.js เรียกตอนประชาชนส่งแก้)
 *        แก้ caseObj.dueAt + ใส่ resubmittedAt/pausedDays ในรายการตีกลับล่าสุด (caseObj.returns) · เรียกซ้ำไม่ขยายซ้ำ
 *   sla.levelOf(caseObj, nowIso?)                 → 'normal'|'near'|'overdue'|'paused'|'closed'|null
 *   sla.levelTh(level)                            → 'ปกติ' 'ใกล้ครบกำหนด' 'เกินกำหนด' 'หยุดนับ' 'ปิดแล้ว'
 *   sla.slaInfo(caseObj, nowIso?)                 → { dueAt, slaLevel, slaLevelTh, remainingDays }
 *   sla.isOverdue(caseObj, nowIso?)               → true ถ้าคงค้าง ไม่ NEED_FIX และ now > dueAt (KPI "เกินกำหนดคงค้าง")
 *   sla.isOnTime(caseObj)                         → closedAt ≤ dueAt (รวมวินาทีที่ 16:30:00) · KPI "ทันกำหนด"
 *   sla.isWorkingDay(dateKey) · sla.addWorkingDays(dateKey, n) · sla.countWorkingDays(afterKey, untilKey)
 *   sla.remainingDays(dueAtIso, nowIso?) · sla.countPausedDays(returnedAtIso, resubmittedAtIso)
 *   sla.extendDueAt(dueAtIso, returnedAtIso, resubmittedAtIso) → { dueAt, pausedDays } (ฟังก์ชันล้วน ไม่แก้ state)
 *   sla.recipientsFor(caseObj, level)             → [username]
 *   sla.evaluate(nowIso?)                         → จำนวนแจ้งเตือนที่เพิ่ม (tick เรียกให้ทุก request)
 * ── route ──
 *   GET /api/notifications (officer · head) → 200 {"items":[{id,caseNo,level,text,createdAt}]} ของผู้ใช้นั้น (ใหม่ก่อน)
 */

const store = require('./store');
const time = require('./time');

const CUTOFF = { hh: 16, mm: 30, ss: 0 };                 // ตัดรอบ 16:30:00 และเวลากำหนดเสร็จ
const CLOSED = new Set(['COMPLETED', 'REJECTED', 'CANCELLED']);
const NOTIFY_STATUSES = new Set(['SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED']);
const LEVEL_TH = store.LEVEL_TH || { normal: 'ปกติ', near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด', paused: 'หยุดนับ', closed: 'ปิดแล้ว' };
const MAX_SCAN_DAYS = 3660;                              // กันวนไม่รู้จบ (ตารางวันหยุดผิดปกติ)

/* ======================================================================
 * 1) วันทำการ
 * ==================================================================== */
function holidaySet() {
  return new Set(((store.state && store.state.holidays) || []).map((h) => h.date));
}

/**
 * ตัวตรวจวันทำการ
 *  forDueDate = true → ใช้กับการคำนวณกำหนดเสร็จ/หยุดนับ (จุดเปิดบั๊ก B03: ไม่ดูตารางวันหยุด)
 *  forDueDate = false → ใช้กับวันคงเหลือ/ระดับเตือน (ถูกต้องเสมอ)
 */
function workingDayFn(forDueDate) {
  const ignoreHolidays = forDueDate && store.bug('B03');   // BUG B03: ข้ามแค่เสาร์-อาทิตย์
  const hol = ignoreHolidays ? new Set() : holidaySet();
  return (key) => !time.isWeekend(key) && !hol.has(key);
}

/** dateKey 'YYYY-MM-DD' เป็นวันทำการตามตารางวันหยุดปัจจุบันหรือไม่ */
function isWorkingDay(key) { return workingDayFn(false)(key); }

function nextWorkingDay(key, isWd) {
  let k = key;
  for (let i = 0; i < MAX_SCAN_DAYS; i++) {
    k = time.addDays(k, 1);
    if (isWd(k)) return k;
  }
  throw new Error(`sla: หาวันทำการถัดจาก ${key} ไม่พบ`);
}

/** บวก n วันทำการ (นับวันถัดไปเป็นวันแรก) · n = 0 → วันเดิม */
function addWorkingDaysWith(key, n, isWd) {
  let k = key;
  for (let i = 0; i < n; i++) k = nextWorkingDay(k, isWd);
  return k;
}
function addWorkingDays(key, n) { return addWorkingDaysWith(key, n, workingDayFn(false)); }

/** จำนวนวันทำการ d ที่ afterKey < d ≤ untilKey (afterKey ≥ untilKey → 0) */
function countWorkingDaysWith(afterKey, untilKey, isWd) {
  if (!(afterKey < untilKey)) return 0;
  let n = 0;
  let k = afterKey;
  for (let i = 0; i < MAX_SCAN_DAYS && k < untilKey; i++) {
    k = time.addDays(k, 1);
    if (isWd(k)) n += 1;
  }
  return n;
}
function countWorkingDays(afterKey, untilKey) { return countWorkingDaysWith(afterKey, untilKey, workingDayFn(false)); }

const atCutoff = (key) => time.toIso(time.fromDateKey(key, CUTOFF.hh, CUTOFF.mm, CUTOFF.ss));

/* ======================================================================
 * 2) กำหนดเสร็จ (BR-12)
 * ==================================================================== */
function slaDaysOf(serviceIdOrDays) {
  if (typeof serviceIdOrDays === 'number') return serviceIdOrDays;
  if (/^\d+$/.test(String(serviceIdOrDays))) return Number(serviceIdOrDays);
  const sv = store.getService(serviceIdOrDays);
  if (!sv) throw new Error(`sla: ไม่รู้จักบริการ ${serviceIdOrDays}`);
  return Number(sv.sla);
}

/** วัน D0 (dateKey) ของเวลาชำระ */
function startDay(paidAtIso, isWd = workingDayFn(true)) {
  const ms = time.toMs(paidAtIso);
  if (!Number.isFinite(ms)) throw new Error(`sla: เวลาชำระไม่ถูกต้อง ${paidAtIso}`);
  const key = time.dateKey(ms);
  const beforeCutoff = ms < time.fromDateKey(key, CUTOFF.hh, CUTOFF.mm, CUTOFF.ss);
  return isWd(key) && beforeCutoff ? key : nextWorkingDay(key, isWd);
}

/**
 * กำหนดเสร็จตอนชำระสำเร็จ
 * @param {string} paidAtIso เวลาชำระ ISO (+07:00)
 * @param {string|number} serviceIdOrDays 'SV-01' (อ่าน SLA ปัจจุบันจากตารางบริการ) หรือจำนวนวันทำการ
 * @returns {string} 'YYYY-MM-DDT16:30:00+07:00'
 */
function computeDueAt(paidAtIso, serviceIdOrDays) {
  const n = slaDaysOf(serviceIdOrDays);
  const isWd = workingDayFn(true);
  return atCutoff(addWorkingDaysWith(startDay(paidAtIso, isWd), n, isWd));
}

/* ======================================================================
 * 3) หยุดนับระหว่าง NEED_FIX (BR-13)
 * ==================================================================== */
/** จำนวนวันทำการใน (วันที่ตีกลับ, วันที่ส่งแก้] · ใช้ตารางวันหยุด ณ ตอนนี้ (= ตอนส่งแก้) */
function countPausedDays(returnedAtIso, resubmittedAtIso) {
  const a = time.toMs(returnedAtIso);
  const b = time.toMs(resubmittedAtIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return countWorkingDaysWith(time.dateKey(a), time.dateKey(b), workingDayFn(true));
}

/** ฟังก์ชันล้วน: dueAt ใหม่หลังส่งแก้ (ไม่แก้ state) */
function extendDueAt(dueAtIso, returnedAtIso, resubmittedAtIso) {
  if (store.bug('B04')) return { dueAt: dueAtIso, pausedDays: 0 };   // BUG B04: ไม่หยุดนับ
  const pausedDays = countPausedDays(returnedAtIso, resubmittedAtIso);
  const dueMs = time.toMs(dueAtIso);
  if (!pausedDays || !Number.isFinite(dueMs)) return { dueAt: dueAtIso, pausedDays };
  const key = addWorkingDaysWith(time.dateKey(dueMs), pausedDays, workingDayFn(true));
  // คงเวลาเดิมของกำหนดเสร็จ (ปกติ 16:30:00)
  const p = time.parts(dueMs);
  return { dueAt: time.toIso(time.fromDateKey(key, p.hh, p.mm, p.ss)), pausedDays };
}

/**
 * รอบตีกลับล่าสุดที่ยังไม่ได้ขยายกำหนดเสร็จ · null = ไม่มี/คิดไปแล้ว
 * คิดไปแล้ว ⇔ มีธง slaApplied (ใส่โดย applyResubmit) หรือเป็นประวัติที่ส่งแก้ไปแล้วคนละเวลาและมี pausedDays (seed F02)
 */
function openReturn(c, at) {
  const list = Array.isArray(c.returns) ? c.returns : [];
  const last = list[list.length - 1];
  if (!last || last.slaApplied) return null;
  if (last.resubmittedAt && last.resubmittedAt !== at && typeof last.pausedDays === 'number') return null;
  return last;
}

/**
 * เรียกตอนประชาชนส่งแก้ (NEED_FIX → IN_REVIEW) · แก้ c.dueAt และรายการตีกลับล่าสุดใน c.returns
 * ({at, ..., resubmittedAt, pausedDays}) · เรียกก่อนหรือหลังเปลี่ยนสถานะก็ได้ · เรียกซ้ำไม่ขยายซ้ำ
 * @param {object} c คำขอใน store.state.cases
 * @param {string} [atIso] เวลาส่งแก้ (ค่าเริ่มต้น = นาฬิการะบบ)
 * @param {string} [returnedAtIso] เวลาตีกลับ (ค่าเริ่มต้น = c.returns ตัวล่าสุด .at หรือ c.returnedAt)
 * @returns {{dueAt:string, pausedDays:number}}
 */
function applyResubmit(c, atIso, returnedAtIso) {
  const at = atIso || time.nowIso();
  const hasList = Array.isArray(c.returns) && c.returns.length > 0;
  const ret = openReturn(c, at);
  let returnedAt = returnedAtIso || null;
  if (!returnedAt && ret) returnedAt = ret.at;
  if (!returnedAt && !hasList) returnedAt = c.returnedAt || c.lastReturnedAt || null;
  const noop = { dueAt: c.dueAt, pausedDays: 0 };
  if (hasList && c.returns[c.returns.length - 1].slaApplied) return noop;   // เรียกซ้ำ
  if (!returnedAt) return noop;                                        // ไม่มีรอบตีกลับที่ค้าง
  if (!hasList && c.slaPausedFor === returnedAt) return noop;          // เรียกซ้ำ (กรณีไม่มี c.returns)

  const out = extendDueAt(c.dueAt, returnedAt, at);
  c.dueAt = out.dueAt;
  if (ret) {
    if (!ret.resubmittedAt) ret.resubmittedAt = at;
    ret.pausedDays = out.pausedDays;
    ret.slaApplied = true;
  } else if (!hasList) {
    c.slaPausedFor = returnedAt;
  }
  return out;
}

/* ======================================================================
 * 4) ระดับเตือน (BR-14)
 * ==================================================================== */
/** วันคงเหลือ = จำนวนวันทำการหลังวันนี้ถึงวันกำหนดเสร็จ (รวมวันกำหนด) · ใช้ตารางวันหยุดจริงเสมอ */
function remainingDays(dueAtIso, nowIso) {
  const dueMs = time.toMs(dueAtIso);
  const nowMs = time.toMs(nowIso || time.now());
  if (!Number.isFinite(dueMs) || !Number.isFinite(nowMs)) return null;
  return countWorkingDays(time.dateKey(nowMs), time.dateKey(dueMs));
}

/** ระดับเตือนของคำขอ ณ เวลา now */
function levelOf(c, nowIso) {
  if (!c) return null;
  if (CLOSED.has(c.status)) return 'closed';
  if (c.status === 'NEED_FIX') return 'paused';
  if (c.status === 'DRAFT' || c.status === 'PENDING_PAYMENT') return null;
  const dueMs = time.toMs(c.dueAt);
  if (!Number.isFinite(dueMs)) return null;
  const nowMs = time.toMs(nowIso || time.now());
  if (nowMs > dueMs) return 'overdue';
  const left = countWorkingDays(time.dateKey(nowMs), time.dateKey(dueMs));
  return left <= 1 ? 'near' : 'normal';
}

function levelTh(level) { return LEVEL_TH[level] || ''; }

function slaInfo(c, nowIso) {
  const lv = levelOf(c, nowIso);
  const open = lv === 'normal' || lv === 'near' || lv === 'overdue';
  return {
    dueAt: c ? c.dueAt || null : null,
    slaLevel: lv,
    slaLevelTh: levelTh(lv),
    remainingDays: open && lv !== 'overdue' ? remainingDays(c.dueAt, nowIso) : null,
  };
}

/** คงค้าง (ไม่ใช่ NEED_FIX) และ now > dueAt · ใช้กับ KPI "เกินกำหนดคงค้าง" */
function isOverdue(c, nowIso) { return levelOf(c, nowIso) === 'overdue'; }

/** ทันกำหนด ⇔ closedAt ≤ dueAt (รวมวินาทีที่ 16:30:00) · ไม่มี closedAt → null */
function isOnTime(c) {
  if (!c || !c.closedAt) return null;
  const a = time.toMs(c.closedAt);
  const b = time.toMs(c.dueAt);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a <= b;
}

/* ======================================================================
 * 5) แจ้งเตือน (BR-15 · A-30 A-31)
 * ==================================================================== */
const activeUsers = () => ((store.state && store.state.users) || []).filter((u) => u.active !== false);
const headsList = () => activeUsers().filter((u) => u.role === 'head').map((u) => u.username);
const deptOfficers = (dept) => activeUsers().filter((u) => u.role === 'officer' && u.dept === dept).map((u) => u.username);

/** แผนกที่เรื่องอยู่ตอนนี้ (ค่าที่เก็บ หรืออนุมานจากบริการ/ขั้น) */
function deptOf(c) {
  if (c.dept) return c.dept;
  if (c.serviceId === 'SV-03' && Number(c.step) === 2) return 'works';
  return 'registry';
}

function userExists(username) {
  return !!username && activeUsers().some((u) => u.username === username);
}

/** ผู้รับแจ้งเตือนของคำขอที่ระดับนั้น */
function recipientsFor(c, level) {
  if (level !== 'near' && level !== 'overdue') return [];
  let base;
  if (c.status === 'PENDING_APPROVAL') base = headsList();
  else if (c.status === 'APPROVED') {
    const issuer = c.issuer || c.owner;
    base = userExists(issuer) ? [issuer] : deptOfficers(deptOf(c));
  } else if (c.owner) base = [c.owner];
  else base = deptOfficers(deptOf(c));
  const out = [...base];
  if (level === 'overdue') for (const h of headsList()) if (!out.includes(h)) out.push(h);
  return out;
}

/** ประเมินแจ้งเตือนทุกคำขอ ณ เวลา now · คืนจำนวนรายการที่เพิ่ม */
function evaluate(nowIso) {
  const st = store.state;
  if (!st || !Array.isArray(st.cases)) return 0;
  const nowStr = nowIso || time.nowIso();
  const cases = st.cases
    .filter((c) => NOTIFY_STATUSES.has(c.status))
    .sort((a, b) => (a.caseNo < b.caseNo ? -1 : a.caseNo > b.caseNo ? 1 : 0));
  let added = 0;
  for (const c of cases) {
    // ตาข่ายกันพลาด: คำขอใหม่ที่ไม่มี dueAt → คิดจากเวลาชำระ (ตารางวันหยุด ณ ตอนนี้ = ตอนชำระ)
    if (!c.dueAt && c.paidAt) {
      try { c.dueAt = computeDueAt(c.paidAt, c.serviceId); } catch (e) { continue; }
    }
    const level = levelOf(c, nowStr);
    if (level !== 'near' && level !== 'overdue') continue;
    for (const username of recipientsFor(c, level)) {
      if (store.addNotification({ username, caseNo: c.caseNo, level })) added += 1;
    }
  }
  return added;
}

/** server.js เรียกก่อนทุก request ยกเว้น /api/test/* (CONTRACT 0.7) */
function tick(nowIso) { return evaluate(nowIso); }

/* ======================================================================
 * 6) route
 * ==================================================================== */
function listNotifications(username) {
  return ((store.state && store.state.notifications) || [])
    .filter((n) => n.username === username)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id))
    .map((n) => ({ id: n.id, caseNo: n.caseNo, level: n.level, text: n.text, createdAt: n.createdAt }));
}

function register(app) {
  app.get('/api/notifications', { roles: ['officer', 'head'] }, (req) => ({ items: listNotifications(req.user.username) }));
}

module.exports = {
  register, tick, evaluate,
  // กำหนดเสร็จ / หยุดนับ
  computeDueAt, startDay, countPausedDays, extendDueAt, applyResubmit,
  // ระดับ
  levelOf, levelTh, slaInfo, remainingDays, isOverdue, isOnTime,
  // วันทำการ
  isWorkingDay, addWorkingDays, countWorkingDays,
  // แจ้งเตือน
  recipientsFor, listNotifications, deptOf,
  LEVEL_TH, CUTOFF,
};

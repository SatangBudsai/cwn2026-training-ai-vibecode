'use strict';
// B04: SLA วันทำการ · ระดับเตือน · แจ้งเตือน (กระดิ่ง) · ยกเลิกอัตโนมัติ 168 ชม. (FR-11 ส่วนอัตโนมัติ, FR-19, FR-20)
// รูปแบบ case ที่คาดจาก store.mem.cases (B05 เป็นเจ้าของ): {caseNo,status,serviceId,step,dueAtMs,owner,dept,returnedAtMs,issuer,timeline[]}
// รองรับชื่อสำรอง: dueAt (ISO) · holder · currentDept · returnedAt (ISO) · issuedBy
const CLOSED = ['COMPLETED', 'REJECTED', 'CANCELLED'];
const CUTOFF_MS = (16 * 3600 + 30 * 60) * 1000; // 16:30:00 ตามเวลาไทย
const FIX_WINDOW_MS = 168 * 3600 * 1000;
const DAY = 86400000;

exports.register = function register(router, ctx) {
  const { store, clock } = ctx;

  const toMs = (ms, iso) => {
    if (typeof ms === 'number' && Number.isFinite(ms)) return ms;
    return iso ? clock.parseISO(iso) : null;
  };
  const dueOf = (c) => toMs(c.dueAtMs, c.dueAt);
  const returnedOf = (c) => toMs(c.returnedAtMs, c.returnedAt);
  // ms ของ 00:00 เวลาไทย ของวันที่ ms อยู่
  const dayStart = (ms) => { const p = clock.parts(ms); return ms - (p.h * 3600 + p.mi * 60 + p.s) * 1000 - (ms % 1000 + 1000) % 1000; };

  function isWorkday(ms) {
    const p = clock.parts(ms);
    if (p.dow === 0 || p.dow === 6) return false;
    const d = clock.dateStr(ms);
    if (ctx.bug('B03')) return true; // B03: ไม่ข้ามวันหยุดในตาราง
    return !store.mem.holidays.some((h) => h.date === d);
  }
  // ย้าย ms ไปเที่ยงของวันถัดไป (กัน DST ไม่มีในไทย จึงบวก DAY ตรง ๆ ได้)
  function nextWorkday(ms) { let t = dayStart(ms); do { t += DAY; } while (!isWorkday(t)); return t; }

  // D0 ตาม BR-12: ชำระวันทำการก่อน 16:30:00 -> วันนั้น มิฉะนั้นวันทำการถัดไป
  function startDay(fromMs) {
    const t = dayStart(fromMs);
    const before = fromMs - t < CUTOFF_MS;
    return isWorkday(fromMs) && before ? t : nextWorkday(fromMs);
  }
  // ผลคือ ms ของ 16:30 วันทำการที่ N หลัง D0
  function dueAt(fromMs, workdays) {
    let t = startDay(fromMs);
    for (let i = 0; i < workdays; i++) t = nextWorkday(t);
    return t + CUTOFF_MS;
  }
  // BR-13: เลื่อนกำหนดเดิมไป n วันทำการ (16:30)
  function addWorkdays(dueMs, n) {
    let t = dayStart(dueMs);
    for (let i = 0; i < n; i++) t = nextWorkday(t);
    return t + CUTOFF_MS;
  }
  // จำนวนวันทำการใน (afterMs, upToMs] นับตามวันที่
  function workdaysBetween(afterMs, upToMs) {
    let t = dayStart(afterMs), end = dayStart(upToMs), n = 0;
    while (t < end) { t += DAY; if (isWorkday(t)) n++; }
    return n;
  }
  // BR-13: กำหนดใหม่หลังส่งแก้ = กำหนดเดิม + วันทำการใน (วันตีกลับ, วันส่งแก้]
  function extendDue(dueMs, returnedMs, resubmittedMs) {
    if (ctx.bug('B04')) return dueMs; // B04: ไม่หยุดนับ SLA
    return addWorkdays(dueMs, workdaysBetween(returnedMs, resubmittedMs));
  }

  function level(c, nowMs = clock.nowMs()) {
    if (CLOSED.includes(c.status)) return 'closed';
    if (c.status === 'NEED_FIX') return 'paused';
    const due = dueOf(c);
    if (due == null) return 'normal';
    if (nowMs > due) return 'overdue';
    const remaining = workdaysBetween(nowMs, due); // หลังวันนี้ถึงวันกำหนด (รวมวันกำหนด)
    return remaining >= 2 ? 'normal' : 'near';
  }

  // ---- ยกเลิกอัตโนมัติ (BR-20, A-46) ----
  function fixDeadlineMs(c) { const r = returnedOf(c); return r == null ? null : r + FIX_WINDOW_MS; }
  function cancelExpired() {
    const now = clock.nowMs();
    for (const c of store.mem.cases.values()) {
      if (c.status !== 'NEED_FIX') continue;
      const dl = fixDeadlineMs(c);
      if (dl == null || now < dl) continue; // 167:59 ยังส่งแก้ได้ · 168:00 ยกเลิก
      const from = c.status;
      c.status = 'CANCELLED';
      c.cancelledAtMs = dl;
      c.cancelledAt = clock.toISO(dl);
      c.autoCancelled = true;
      if (Array.isArray(c.timeline)) {
        c.timeline.push({ event: 'CANCELLED', status: 'CANCELLED', fromStatus: from, atMs: dl, at: clock.toISO(dl), time: clock.toISO(dl), timeMs: dl, text: 'ยกเลิกอัตโนมัติ เลยเวลาแก้ไข 168 ชม.' });
      }
    }
  }

  // ---- แจ้งเตือน (BR-15, A-30, A-31) ----
  const LEVEL_TEXT = { near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด' };
  const notify = {
    emit(n) {
      const rec = {
        id: store.nextId('noti'), username: n.username, caseNo: n.caseNo, level: n.level,
        text: `คำขอ ${n.caseNo} ${LEVEL_TEXT[n.level] || n.level}`, createdAt: clock.nowISO(),
      };
      store.mem.notifications.push(rec);
      return rec;
    },
    listFor(username) { return store.mem.notifications.filter((n) => n.username === username); },
    has(username, caseNo, lv) { return store.mem.notifications.some((n) => n.username === username && n.caseNo === caseNo && n.level === lv); },
  };

  const staff = () => store.users.list().filter((u) => u.role === 'officer' || u.role === 'head');
  function deptOf(c) {
    if (c.dept || c.currentDept) return c.dept || c.currentDept;
    return c.serviceId === 'SV-03' && Number(c.step) === 2 ? 'works' : 'registry';
  }
  function recipients(c, lv) {
    const out = new Set();
    const heads = () => staff().filter((u) => u.role === 'head').map((u) => u.username);
    const holder = c.owner || c.holder;
    if (c.status === 'PENDING_APPROVAL') heads().forEach((h) => out.add(h));
    else if (c.status === 'APPROVED') {
      const issuer = c.issuer || c.issuedBy || holder;
      if (issuer) out.add(issuer);
      else staff().filter((u) => u.role === 'officer' && u.dept === 'registry').forEach((u) => out.add(u.username));
    } else if (holder) out.add(holder);
    else staff().filter((u) => u.role === 'officer' && u.dept === deptOf(c)).forEach((u) => out.add(u.username));
    if (lv === 'overdue') heads().forEach((h) => out.add(h)); // Set กันซ้ำ
    return [...out];
  }

  function evaluate() {
    cancelExpired();
    const now = clock.nowMs();
    const cases = [...store.mem.cases.values()].sort((a, b) => String(a.caseNo).localeCompare(String(b.caseNo)));
    for (const c of cases) {
      const lv = level(c, now);
      if (lv !== 'near' && lv !== 'overdue') continue; // ประเมินเฉพาะระดับปัจจุบัน ไม่ย้อนแจ้งระดับที่ข้าม
      for (const u of recipients(c, lv)) {
        if (!notify.has(u, c.caseNo, lv)) notify.emit({ username: u, caseNo: c.caseNo, level: lv });
      }
    }
  }

  ctx.sla = { dueAt, level, isWorkday, evaluate, addWorkdays, workdaysBetween, extendDue, startDay, fixDeadlineMs, cancelExpired };
  ctx.notify = notify;
  ctx.onRequest(() => { evaluate(); });

  router.add('GET', '/api/notifications', (req, res) => {
    const u = ctx.requireRole(req, res, ['officer', 'head']);
    if (!u) return;
    const items = notify.listFor(u.username).slice().reverse()
      .map((n) => ({ id: n.id, caseNo: n.caseNo, level: n.level, text: n.text, createdAt: n.createdAt }));
    ctx.json(res, 200, { items });
  });
};

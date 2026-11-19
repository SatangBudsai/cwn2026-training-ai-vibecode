'use strict';
// stub ที่ใช้งานได้จริงขั้นต่ำ ให้บล็อกอื่นเขียนทับ (ดู INTERFACES.md ตาราง "ใครเขียนทับอะไร")
const crypto = require('node:crypto');

module.exports = function buildStubs(ctx) {
  const { store, clock } = ctx;
  const out = {};

  // ---- session / requireRole (B02 เขียนทับทั้งก้อน: ctx.session, ctx.requireRole) ----
  const sessions = new Map(); // sid -> user snapshot
  out.session = {
    // คืน {username,name,role,dept,registered,sid,pending?} หรือ null
    current(req) {
      const sid = ctx.cookies(req).sid;
      const s = sid && sessions.get(sid);
      if (!s) return null;
      const u = store.users.get(s.username);
      return u ? { ...u, sid } : null;
    },
    create(res, user) {
      const sid = crypto.randomBytes(24).toString('hex');
      sessions.set(sid, { username: user.username });
      res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
      return sid;
    },
    destroy(req, res) {
      const sid = ctx.cookies(req).sid;
      if (sid) sessions.delete(sid);
      res.setHeader('Set-Cookie', 'sid=; Path=/; HttpOnly; Max-Age=0');
    },
    clearAll() { sessions.clear(); },
  };
  // คืน user ถ้าผ่าน มิฉะนั้นตอบ 401 UNAUTHENTICATED / 403 FORBIDDEN แล้วคืน null
  out.requireRole = function requireRole(req, res, roles) {
    const u = req.user || ctx.session.current(req);
    if (!u) { ctx.err(res, 401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ'); return null; }
    const list = Array.isArray(roles) ? roles : roles ? [roles] : null;
    if (list && !list.includes(u.role)) { ctx.err(res, 403, 'FORBIDDEN', 'ไม่มีสิทธิ์ทำรายการนี้'); return null; }
    return u;
  };

  // ---- audit (B01 ทำจริงแล้ว ไม่ต้องเขียนทับ · B07 อ่าน store.mem.audit) ----
  out.audit = {
    // add({username, role, event, caseNo, fromStatus, toStatus, detail}) -> record
    add(e) {
      const rec = {
        id: store.nextId('audit'),
        time: clock.nowISO(), timeMs: clock.nowMs(),
        username: e.username || '', role: e.role || '', event: e.event || '',
        caseNo: e.caseNo || '', fromStatus: e.fromStatus || '', toStatus: e.toStatus || '',
        detail: e.detail == null ? '' : String(e.detail),
      };
      store.mem.audit.push(rec);
      return rec;
    },
    all() { return store.mem.audit; },
  };

  // ---- notify (B04 เขียนทับ) ----
  out.notify = {
    // emit({username, caseNo, level:'near'|'overdue'}) -> record
    emit(n) {
      const rec = {
        id: store.nextId('noti'), username: n.username, caseNo: n.caseNo, level: n.level,
        text: `คำขอ ${n.caseNo} ${n.level === 'overdue' ? 'เกินกำหนด' : 'ใกล้ครบกำหนด'}`,
        createdAt: clock.nowISO(),
      };
      store.mem.notifications.push(rec);
      return rec;
    },
    listFor(username) { return store.mem.notifications.filter((n) => n.username === username); },
  };

  // ---- sla (B04 เขียนทับ) stub แบบง่าย: บวกวันทำการ แล้วตั้ง 16:30 ----
  const DAY = 86400000;
  out.sla = {
    isWorkday(ms) {
      const p = clock.parts(ms);
      return p.dow !== 0 && p.dow !== 6 && !store.mem.holidays.some((h) => h.date === clock.dateStr(ms));
    },
    // dueAt(fromMs, workdays) -> ms
    dueAt(fromMs, workdays) {
      let ms = fromMs, n = 0;
      while (n < workdays) { ms += DAY; if (out.sla.isWorkday(ms)) n++; }
      const p = clock.parts(ms);
      return ms - (p.h * 3600 + p.mi * 60 + p.s) * 1000 + (16 * 3600 + 30 * 60) * 1000;
    },
    // level(caseObj{status,dueAtMs}, nowMs?) -> 'normal'|'near'|'overdue'|'paused'|'closed'
    level(c, nowMs = clock.nowMs()) {
      if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(c.status)) return 'closed';
      if (c.status === 'NEED_FIX') return 'paused';
      if (nowMs > c.dueAtMs) return 'overdue';
      return 'normal';
    },
    evaluate() { /* B04: ประเมินแจ้งเตือนทุกคำขอ HTTP */ },
  };

  // ---- vault (B06 เขียนทับ) ----
  const KEY = crypto.createHash('sha256').update('rerun-test-key-enc').digest();
  const IDX = crypto.createHash('sha256').update('rerun-test-key-idx').digest();
  out.vault = {
    encrypt(plain) {
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
      const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
      return 'v1:' + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
    },
    decrypt(token) {
      const b = Buffer.from(String(token).slice(3), 'base64');
      const d = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12));
      d.setAuthTag(b.subarray(12, 28));
      return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
    },
    // '3100600987659' -> 'X-XXXX-XXXXX-65-9'
    mask(idNo) { const s = String(idNo).replace(/\D/g, ''); return `X-XXXX-XXXXX-${s.slice(10, 12)}-${s.slice(12, 13)}`; },
    // '3100600987659' -> '3-1006-00987-65-9'
    format(idNo) { const s = String(idNo).replace(/\D/g, ''); return `${s[0]}-${s.slice(1, 5)}-${s.slice(5, 10)}-${s.slice(10, 12)}-${s[12]}`; },
    blindIndex(plain) { return crypto.createHmac('sha256', IDX).update(String(plain)).digest('hex'); },
  };

  // ---- test hooks ที่โมดูลอื่นต้องเติม ----
  // pay(ref, body) -> {status, body}   (B03 เขียนทับ)
  // tamper(docNo)  -> {status, body}   (B05 เขียนทับ)
  const nf = () => ({ status: 404, body: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูล' } });
  out.testHooks = { pay: nf, tamper: nf };

  // ---- hook สำหรับหน้า (B05 เขียนทับ) ----
  out.pageHooks = {
    // caseVisible(user, caseNo) -> boolean (citizen ต้องเป็นเจ้าของ) ; ค่าเริ่มต้น true
    caseVisible: () => true,
    // verifyStatus(code) -> 200 | 404 (ไม่พบ -> 404)
    verifyStatus: () => 200,
  };

  return out;
};

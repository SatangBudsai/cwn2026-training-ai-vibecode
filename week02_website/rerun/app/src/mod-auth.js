'use strict';
// B02: ยืนยันตัวตน ThaiD/OTP, ลงทะเบียน, SSO เจ้าหน้าที่, session, RBAC
const crypto = require('node:crypto');

const TEST_OTP = '123456';
const MAX_FAILS = 3;
const LOCK_MS = 15 * 60 * 1000;
const MSG = {
  invalidId: 'เลขบัตรประชาชนไม่ถูกต้อง',
  otp: 'รหัส OTP ไม่ถูกต้อง',
  locked: 'ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที',
  cred: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  mobile: 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0',
  consent: 'กรุณายินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA)',
  unauth: 'กรุณาเข้าสู่ระบบ',
  forbidden: 'ไม่มีสิทธิ์ทำรายการนี้',
};

// BR-01: 13 หลักพอดี + checksum
function validIdNo(v) {
  if (typeof v === 'number') v = String(v);
  if (typeof v !== 'string' || !/^\d{13}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(v[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(v[12]);
}

exports.register = function register(router, ctx) {
  const { clock, store } = ctx;
  const sessions = new Map(); // sid -> {username, role, dept}

  // ---- session (เขียนทับ stub) ----
  ctx.session = {
    current(req) {
      const sid = ctx.cookies(req).sid;
      const s = sid && sessions.get(sid);
      if (!s) return null;
      const u = store.users.get(s.username);
      if (!u) return null;
      // role/dept ใช้ค่า ณ ตอนล็อกอิน (admin แก้บทบาทมีผลกับล็อกอินครั้งถัดไป)
      return { ...u, role: s.role, dept: s.dept, sid };
    },
    create(res, user) {
      const sid = crypto.randomBytes(24).toString('hex');
      sessions.set(sid, { username: user.username, role: user.role, dept: user.dept || '' });
      res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
      return sid;
    },
    destroy(req, res) {
      const sid = ctx.cookies(req).sid;
      if (sid) sessions.delete(sid);
      res.setHeader('Set-Cookie', 'sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    },
    clearAll() { sessions.clear(); },
  };

  // ---- requireRole (เขียนทับ stub) ----
  ctx.requireRole = function requireRole(req, res, roles) {
    const u = req.user || ctx.session.current(req);
    if (!u) { ctx.err(res, 401, 'UNAUTHENTICATED', MSG.unauth); return null; }
    const list = Array.isArray(roles) ? roles : roles ? [roles] : null;
    if (list && !list.includes(u.role)) { ctx.err(res, 403, 'FORBIDDEN', MSG.forbidden); return null; }
    return u;
  };

  // ---- OTP state ต่อเลขบัตร (store.mem.otp ถูกล้างทุก reset) ----
  function rec(idNo) {
    const m = store.mem.otp;
    let r = m.get(idNo);
    if (!r) { r = { fails: 0, lockedUntil: 0 }; m.set(idNo, r); }
    // ปลดล็อกเมื่อถึงเวลา (>= ครบ 15:00 พอดี) แล้วเริ่มนับ 0
    if (r.lockedUntil && clock.nowMs() >= r.lockedUntil) { r.lockedUntil = 0; r.fails = 0; }
    return r;
  }
  const isLocked = (r) => r.lockedUntil > 0 && clock.nowMs() < r.lockedUntil;
  const lockedErr = (res, r) => ctx.err(res, 423, 'LOCKED', MSG.locked, { lockedUntil: clock.toISO(r.lockedUntil) });
  const idOf = (req) => { const v = req.body && req.body.idNo; return typeof v === 'number' ? String(v) : v; };

  router.add('POST', '/api/auth/thaid/start', (req, res) => {
    const idNo = idOf(req);
    if (!validIdNo(idNo)) return ctx.err(res, 400, 'INVALID_ID', MSG.invalidId);
    const r = rec(idNo);
    if (isLocked(r)) return lockedErr(res, r);
    ctx.json(res, 200, { status: 'OTP_SENT' });
  });

  router.add('POST', '/api/auth/thaid/verify', (req, res) => {
    const idNo = idOf(req);
    if (!validIdNo(idNo)) return ctx.err(res, 400, 'INVALID_ID', MSG.invalidId);
    const r = rec(idNo);
    if (isLocked(r)) return lockedErr(res, r); // แม้ OTP ถูกก็ยังล็อก
    const otp = req.body && req.body.otp;
    if (String(otp == null ? '' : otp) !== TEST_OTP) {
      r.fails += 1;
      if (r.fails >= MAX_FAILS) {
        r.lockedUntil = clock.nowMs() + LOCK_MS;
        return lockedErr(res, r);
      }
      return ctx.err(res, 401, 'OTP_INVALID', MSG.otp, { attemptsLeft: MAX_FAILS - r.fails });
    }
    r.fails = 0;
    let user = store.users.findByIdNo(idNo);
    if (!user) user = store.users.createCitizen({ name: 'ผู้ใช้ใหม่ ThaiD', idNo, registered: 0 });
    if (user.role !== 'citizen') return ctx.err(res, 400, 'INVALID_ID', MSG.invalidId);
    ctx.session.create(res, user);
    ctx.json(res, 200, { registered: !!user.registered, landing: ctx.landing(user) });
  });

  router.add('POST', '/api/auth/register', (req, res) => {
    const u = ctx.requireRole(req, res, ['citizen']);
    if (!u) return;
    const b = req.body || {};
    const mobile = typeof b.mobile === 'string' ? b.mobile : '';
    if (!/^0\d{9}$/.test(mobile)) return ctx.err(res, 400, 'INVALID_MOBILE', MSG.mobile);
    if (b.consent !== true) return ctx.err(res, 400, 'CONSENT_REQUIRED', MSG.consent);
    const email = typeof b.email === 'string' ? b.email.trim() : '';
    const nu = store.users.register(u.username, { mobile, email });
    ctx.json(res, 201, { registered: true, landing: ctx.landing(nu) });
  });

  router.add('POST', '/api/auth/staff/login', (req, res) => {
    const b = req.body || {};
    const username = typeof b.username === 'string' ? b.username : '';
    const password = typeof b.password === 'string' ? b.password : '';
    const u = username ? store.users.get(username) : null;
    if (!u || u.role === 'citizen' || !store.users.verifyPassword(username, password)) {
      return ctx.err(res, 401, 'INVALID_CREDENTIALS', MSG.cred);
    }
    ctx.session.create(res, u);
    ctx.audit.add({ username: u.username, role: u.role, event: 'STAFF_LOGIN' });
    ctx.json(res, 200, { role: u.role, dept: u.dept, landing: ctx.landing(u) });
  });

  router.add('POST', '/api/auth/logout', (req, res) => {
    ctx.session.destroy(req, res);
    res.statusCode = 204;
    res.end();
  });

  router.add('GET', '/api/me', (req, res) => {
    const u = ctx.requireRole(req, res);
    if (!u) return;
    const out = { username: u.username, name: u.name, role: u.role, dept: u.dept };
    if (u.role === 'citizen') out.registered = !!u.registered;
    ctx.json(res, 200, out);
  });
};

'use strict';
/**
 * src/auth.js — ยืนยันตัวตน · B02
 *   ThaiD จำลอง (เลขบัตร + checksum BR-01 · OTP 123456 · ผิด 3 ครั้งล็อก 15 นาที BR-02)
 *   ลงทะเบียนครั้งแรก (BR-03) · SSO เจ้าหน้าที่จำลอง (A-08) · logout · /api/me
 *   RBAC ของ route ใช้ opts {roles}/{auth} ของ server.js (401 UNAUTHENTICATED / 403 FORBIDDEN)
 *
 * CONTRACT 6.1
 *   POST /api/auth/thaid/start   {idNo}                 200 {status:'OTP_SENT'} · 400 INVALID_ID · 423 LOCKED {lockedUntil}
 *   POST /api/auth/thaid/verify  {idNo, otp}            200 {registered} + cookie · 400 INVALID_ID · 401 OTP_INVALID {attemptsLeft} · 423 LOCKED {lockedUntil}
 *   POST /api/auth/register      {mobile,email,consent} 201 · 400 INVALID_MOBILE / CONSENT_REQUIRED · 409 ALREADY_REGISTERED
 *   POST /api/auth/staff/login   {username,password}    200 {role,dept,landing} + Audit STAFF_LOGIN · 401 INVALID_CREDENTIALS
 *   POST /api/auth/logout                               204
 *   GET  /api/me                                        200 {username,name,role,dept} · 401
 *
 * สถานะ OTP เก็บใน store.mem.otp (Map idNo → {fails, lockedUntilMs}) · ไม่ persist · /api/test/reset ล้างให้
 * ทุกกฎเวลาอ่านจาก time.now() (นาฬิกาทดสอบ)
 */

const store = require('./store');
const time = require('./time');

const TEST_OTP = '123456';            // A-05
const MAX_FAILS = 3;                  // A-06
const LOCK_MS = 15 * 60 * 1000;       // 15 นาที นับจากครั้งที่ 3

/* ---------------- เลขบัตร (BR-01) ---------------- */
function normId(v) { return typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : ''); }

/** 13 หลักพอดี + checksum · ไม่ trim/ตัดขีด (A-45: ตรวจค่าตามที่กรอก) */
function isValidThaiId(id) {
  if (typeof id !== 'string' || !/^\d{13}$/.test(id)) return false;
  let s = 0;
  for (let i = 0; i < 12; i++) s += Number(id[i]) * (13 - i);
  return (11 - (s % 11)) % 10 === Number(id[12]);
}

function requireValidId(body) {
  const idNo = normId(body && body.idNo);
  if (!isValidThaiId(idNo)) store.fail('INVALID_ID');
  return idNo;
}

/* ---------------- ตัวนับ OTP / ล็อก (BR-02) ---------------- */
function otpState(idNo) {
  let st = store.mem.otp.get(idNo);
  if (!st) { st = { fails: 0, lockedUntilMs: 0 }; store.mem.otp.set(idNo, st); }
  // ปลดล็อกเมื่อถึงเวลา (≥ ครั้งที่ 3 + 15:00) → ตัวนับเริ่มใหม่ที่ 0
  if (st.lockedUntilMs && time.now() >= st.lockedUntilMs) { st.fails = 0; st.lockedUntilMs = 0; }
  return st;
}

function assertNotLocked(st) {
  if (st.lockedUntilMs && time.now() < st.lockedUntilMs) {
    store.fail('LOCKED', { lockedUntil: time.toIso(st.lockedUntilMs) });
  }
}

/** สถานะล็อกของเลขบัตร (ให้โมดูลอื่น/ดีบักใช้) */
function lockStatus(idNo) {
  const st = otpState(idNo);
  return { fails: st.fails, locked: !!st.lockedUntilMs, lockedUntil: st.lockedUntilMs ? time.toIso(st.lockedUntilMs) : null };
}

/* ---------------- ประชาชน ---------------- */
/** ThaiD จำลอง: เลขบัตรที่ checksum ถูกแต่ไม่อยู่ใน seed → สร้างประชาชนใหม่ (ยังไม่ลงทะเบียน) */
function findOrCreateCitizen(idNo) {
  let c = store.findCitizenByIdNo(idNo);
  if (c) return c;
  let n = store.state.citizens.length + 1;
  const id = () => `CZ-${String(n).padStart(4, '0')}`;
  while (store.findCitizen(id())) n += 1;
  c = {
    citizenId: id(), idNo, name: `ผู้ใช้ ThaiD ${idNo.slice(-4)}`, mobile: null, email: '',
    registered: false, consentAt: null,
  };
  store.state.citizens.push(c);
  return c;
}

function isConsent(v) {
  return v === true || v === 1 || (typeof v === 'string' && ['true', 'on', '1', 'yes'].includes(v.trim().toLowerCase()));
}

/* ---------------- handlers ---------------- */
function thaidStart(req) {
  const idNo = requireValidId(req.body);
  assertNotLocked(otpState(idNo));
  return { status: 'OTP_SENT' };
}

function thaidVerify(req, res) {
  const idNo = requireValidId(req.body);
  const st = otpState(idNo);
  assertNotLocked(st);                                     // ล็อกอยู่ → 423 แม้ OTP ถูก
  const otp = normId(req.body && req.body.otp).trim();
  if (otp !== TEST_OTP) {
    st.fails += 1;
    if (st.fails >= MAX_FAILS) {
      st.lockedUntilMs = time.now() + LOCK_MS;
      store.fail('LOCKED', { lockedUntil: time.toIso(st.lockedUntilMs) });
    }
    store.fail('OTP_INVALID', { attemptsLeft: MAX_FAILS - st.fails });
  }
  st.fails = 0; st.lockedUntilMs = 0;                      // OTP ถูก → รีเซ็ตตัวนับ
  const c = findOrCreateCitizen(idNo);
  req.app.login(req, res, { role: 'citizen', citizenId: c.citizenId, username: c.citizenId, registered: !!c.registered });
  const registered = !!c.registered;
  return { registered, landing: registered ? '/citizen' : '/register' };
}

function register(req, res) {
  const u = req.user;
  if (!u || u.role !== 'citizen' || !u.citizenId) store.fail('FORBIDDEN');
  const c = store.findCitizen(u.citizenId);
  if (!c) store.fail('UNAUTHENTICATED');
  if (c.registered) store.fail('ALREADY_REGISTERED', null, { status: 409, message: 'ลงทะเบียนแล้ว' });
  const b = req.body || {};
  const mobile = normId(b.mobile).trim();
  if (!/^0\d{9}$/.test(mobile)) store.fail('INVALID_MOBILE');
  if (!isConsent(b.consent)) store.fail('CONSENT_REQUIRED');
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  c.mobile = mobile;
  c.email = email;
  c.registered = true;
  c.consentAt = time.nowIso();
  if (req.session) req.session.registered = true;
  res.json(201, { registered: true, landing: '/citizen' });
}

function staffLogin(req, res) {
  const b = req.body || {};
  const username = typeof b.username === 'string' ? b.username.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const u = username ? store.findUser(username) : null;
  if (!u || u.active === false || u.role === 'citizen' || !store.checkPassword(u, password)) {
    store.fail('INVALID_CREDENTIALS');
  }
  const dept = u.dept || '';
  // บทบาท/แผนกเก็บไว้ใน session ตอนล็อกอิน → admin เปลี่ยนบทบาทแล้วมีผลกับล็อกอินครั้งถัดไป (CONTRACT 6.5)
  req.app.login(req, res, { role: u.role, username: u.username, name: u.name, dept, registered: true });
  store.addAudit({ username: u.username, role: u.role, event: 'STAFF_LOGIN' });   // A-36 เฉพาะสำเร็จ
  return { role: u.role, dept, landing: store.LANDING[u.role] || '/' };
}

function logout(req, res) {
  req.app.logout(req, res);
  res.noContent();
}

function me(req) {
  const u = req.user;
  const out = { username: u.username, name: u.name, role: u.role, dept: u.dept || '' };
  if (u.role === 'citizen') { out.registered = !!u.registered; }
  out.landing = req.app.landingOf(u);
  return out;
}

/* ---------------- ลงทะเบียน route ---------------- */
function registerRoutes(app) {
  const wrap = (fn) => (req, res) => { req.app = app; return fn(req, res); };
  app.post('/api/auth/thaid/start', wrap(thaidStart));
  app.post('/api/auth/thaid/verify', wrap(thaidVerify));
  app.post('/api/auth/register', { roles: ['citizen'], allowUnregistered: true }, wrap(register));
  app.post('/api/auth/staff/login', wrap(staffLogin));
  app.post('/api/auth/logout', { allowUnregistered: true }, wrap(logout));
  app.get('/api/me', { auth: true, allowUnregistered: true }, wrap(me));
}

/** ตัวช่วย RBAC ให้โมดูลอื่นใช้ใน handler (นอกเหนือจาก opts.roles ของ server) */
function requireRole(req, roles) {
  if (!req.user) store.fail('UNAUTHENTICATED');
  if (roles && roles.length && !roles.includes(req.user.role)) store.fail('FORBIDDEN');
  return req.user;
}

module.exports = {
  register: registerRoutes,
  isValidThaiId, lockStatus, requireRole,
  TEST_OTP, MAX_FAILS, LOCK_MS,
};

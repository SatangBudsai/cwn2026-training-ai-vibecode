'use strict';
/**
 * server.js — HTTP server ไม่มี framework · B01
 *
 * รัน: PORT=3100 TEST_MODE=1 BUG_MODE= DB_PATH=./data/app.db node server.js
 *
 * ── สัญญาสำหรับโมดูลของบล็อกอื่น (src/auth.js src/drafts.js src/sla.js src/workflow.js src/vault.js src/reports.js) ──
 * แต่ละโมดูล export อย่างใดอย่างหนึ่ง (ไม่มีไฟล์ = ข้าม):
 *   register(app)                  ← แนะนำ · หรือ routes(app) · หรือ routes = [{method, path, handler, roles}]
 *   tick(nowIso)                   ← (ไม่บังคับ) เรียกก่อนทุก request ยกเว้น /api/test/* (CONTRACT 0.7: แจ้งเตือน SLA + ยกเลิกอัตโนมัติ)
 *   currentUser(req)               ← (ไม่บังคับ เฉพาะ auth) คืน user จาก session แทนค่าเริ่มต้นของ server
 *
 * app.get/post/put/patch/delete/all(path, [opts], handler)
 *   path   '/api/cases/:caseNo'  → req.params.caseNo
 *   opts   { roles: ['officer','head'] }   → ไม่ล็อกอิน 401 UNAUTHENTICATED · บทบาทไม่ตรง 403 FORBIDDEN
 *          { auth: true }                  → ต้องล็อกอิน (บทบาทใดก็ได้)
 *          { allowUnregistered: true }     → ประชาชนที่ยังไม่ลงทะเบียนเรียกได้ (ค่าเริ่มต้น: ได้เฉพาะ route นี้ + logout + me)
 *   handler(req, res) — sync หรือ async
 *     req.params req.query req.body (JSON / urlencoded / ฟิลด์ multipart) req.files [{field, filename, contentType, data:Buffer, size}]
 *     req.rawBody (Buffer) req.cookies req.session req.user ({role, username, name, dept, citizenId, registered} หรือ null)
 *     return ค่า object → 200 JSON · throw store.fail('CODE') → status/JSON ตาม CONTRACT ตาราง 5
 *     res.json(status, obj) · res.send(status, body, headers) · res.redirect(location) · res.noContent()
 *   app.login(req, res, sessionData) → สร้าง session + Set-Cookie (HttpOnly) · sessionData ควรมี role username/citizenId registered
 *   app.logout(req, res)             → ลบ session + ล้าง cookie
 *   app.store app.time app.TEST_MODE app.bug(code)
 * route ที่ขึ้นต้น /api/test/ จะตอบ 404 อัตโนมัติเมื่อไม่ได้ตั้ง TEST_MODE=1
 * หลังทุก request เรียก store.save() ให้เอง
 *
 * ── หน้าเว็บ (public/) ── ดูตาราง PAGES ข้างล่าง: route → ไฟล์ html + บทบาทที่เข้าได้
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const time = require('./src/time');
const store = require('./src/store');

const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || '0.0.0.0';
const TEST_MODE = store.TEST_MODE;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 12 * 1024 * 1024;     // ≥ 6 MB ตาม CONTRACT 0.10 (5 MB + ส่วนหัว multipart ต้องไม่ถูกตัด)
const COOKIE_NAME = 'sid';
const MODULES = ['auth', 'vault', 'sla', 'drafts', 'workflow', 'reports'];

/* ======================================================================
 * 1) Router
 * ==================================================================== */
const routes = [];

function compile(pattern) {
  const keys = [];
  const src = pattern.replace(/\/+$/, '').split('/').map((seg) => {
    if (seg.startsWith(':')) { keys.push(seg.slice(1)); return '([^/]+)'; }
    if (seg === '*') { keys.push('wild'); return '(.*)'; }
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return { re: new RegExp(`^${src || ''}/?$`), keys };
}

function addRoute(method, pattern, opts, handler) {
  if (typeof opts === 'function') { handler = opts; opts = {}; }
  if (typeof handler !== 'function') throw new Error(`handler ของ ${method} ${pattern} ไม่ใช่ function`);
  const { re, keys } = compile(pattern);
  // route ที่ลงทะเบียนทีหลังด้วย path+method เดียวกัน แทนที่ของเดิม (ให้โมดูลเฉพาะทาง override ค่าเริ่มต้นของ server ได้)
  const idx = routes.findIndex((r) => r.method === method && r.pattern === pattern);
  const r = { method, pattern, re, keys, opts: opts || {}, handler };
  if (idx >= 0) routes[idx] = r; else routes.push(r);
}

function matchRoute(method, pathname) {
  let pathMatched = false;
  for (const r of routes) {
    const m = r.re.exec(pathname);
    if (!m) continue;
    pathMatched = true;
    if (r.method !== 'ALL' && r.method !== method && !(method === 'HEAD' && r.method === 'GET')) continue;
    const params = {};
    r.keys.forEach((k, i) => { try { params[k] = decodeURIComponent(m[i + 1]); } catch (e) { params[k] = m[i + 1]; } });
    return { route: r, params };
  }
  return { route: null, pathMatched };
}

/* ======================================================================
 * 2) Session
 * ==================================================================== */
function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (!k) return;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { out[k] = part.slice(i + 1).trim(); }
  });
  return out;
}

function setCookie(res, value, maxAge) {
  const parts = [`${COOKIE_NAME}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (process.env.COOKIE_SECURE === '1') parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [].concat(prev || [], parts.join('; ')));
}

/** สร้าง session ใหม่ (ล้างของเดิมของ request นี้ก่อน) */
function login(req, res, data) {
  if (req.cookies && req.cookies[COOKIE_NAME]) store.mem.sessions.delete(req.cookies[COOKIE_NAME]);
  const sid = crypto.randomBytes(24).toString('hex');
  const session = Object.assign({ createdAt: time.nowIso() }, data, { sid });
  store.mem.sessions.set(sid, session);
  setCookie(res, sid);
  req.session = session;
  req.user = resolveUser(req);
  return session;
}

function logout(req, res) {
  const sid = req.cookies && req.cookies[COOKIE_NAME];
  if (sid) store.mem.sessions.delete(sid);
  setCookie(res, '', 0);
  req.session = null; req.user = null;
}

/** user ปัจจุบันจาก session · ดึงข้อมูลล่าสุดจาก store (เช่น registered, ชื่อ) */
function defaultUser(session) {
  if (!session) return null;
  if (session.role === 'citizen' || session.citizenId) {
    const c = session.citizenId ? store.findCitizen(session.citizenId) : null;
    return {
      role: 'citizen', username: session.username || session.citizenId || '', citizenId: session.citizenId || null,
      name: c ? c.name : (session.name || ''), dept: '',
      registered: c ? !!c.registered : !!session.registered,
    };
  }
  const u = session.username ? store.findUser(session.username) : null;
  if (u && u.active === false) return null;
  return {
    role: session.role || (u && u.role) || null, username: session.username || '',
    name: (u && u.name) || session.name || '', dept: session.dept !== undefined ? session.dept : ((u && u.dept) || ''),
    registered: true,
  };
}

let authModule = null;
function resolveUser(req) {
  if (!req.session) return null;
  if (authModule && typeof authModule.currentUser === 'function') {
    try { return authModule.currentUser(req) || null; } catch (e) { console.error('[server] auth.currentUser error:', e); }
  }
  return defaultUser(req.session);
}

/* ======================================================================
 * 3) Body parsing
 * ==================================================================== */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0; let tooLarge = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { tooLarge = true; return; }   // อ่านทิ้งต่อจนจบ เพื่อให้ตอบ 413 ได้เรียบร้อย
      chunks.push(c);
    });
    req.on('end', () => (tooLarge ? reject(store.httpError('PAYLOAD_TOO_LARGE')) : resolve(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}

function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!m) throw store.httpError('BAD_REQUEST');
  const boundary = Buffer.from(`--${(m[1] || m[2]).trim()}`);
  const fields = {}; const files = [];
  let pos = buf.indexOf(boundary);
  if (pos < 0) return { fields, files };
  while (true) {
    pos += boundary.length;
    if (buf[pos] === 0x2d && buf[pos + 1] === 0x2d) break;           // "--" ปิดท้าย
    if (buf[pos] === 0x0d && buf[pos + 1] === 0x0a) pos += 2;
    const headEnd = buf.indexOf('\r\n\r\n', pos);
    if (headEnd < 0) break;
    const headers = {};
    buf.slice(pos, headEnd).toString('utf8').split('\r\n').forEach((line) => {
      const i = line.indexOf(':');
      if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    });
    const next = buf.indexOf(boundary, headEnd + 4);
    if (next < 0) break;
    let end = next;
    if (buf[end - 2] === 0x0d && buf[end - 1] === 0x0a) end -= 2;
    const data = buf.slice(headEnd + 4, end);
    const cd = headers['content-disposition'] || '';
    const name = (/\bname="([^"]*)"/i.exec(cd) || [])[1];
    const fnStar = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(cd);
    const fn = /\bfilename="([^"]*)"/i.exec(cd);
    if (fn || fnStar) {
      let filename = fn ? fn[1] : '';
      if (fnStar) { try { filename = decodeURIComponent(fnStar[1].replace(/^"|"$/g, '')); } catch (e) { /* keep */ } }
      files.push({ field: name, filename, contentType: headers['content-type'] || 'application/octet-stream', data, size: data.length });
    } else if (name !== undefined) {
      fields[name] = data.toString('utf8');
    }
    pos = next;
  }
  return { fields, files };
}

async function parseBody(req) {
  req.body = {}; req.files = []; req.rawBody = Buffer.alloc(0);
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const buf = await readBody(req);
  req.rawBody = buf;
  if (!buf.length) return;
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (ct.startsWith('multipart/form-data')) {
    const { fields, files } = parseMultipart(buf, req.headers['content-type']);
    req.body = fields; req.files = files;
  } else if (ct.includes('application/x-www-form-urlencoded')) {
    req.body = Object.fromEntries(new URLSearchParams(buf.toString('utf8')));
  } else if (ct.includes('json') || !ct) {
    try { req.body = JSON.parse(buf.toString('utf8')); } catch (e) {
      if (ct.includes('json')) throw store.httpError('BAD_REQUEST');
    }
    if (req.body === null || typeof req.body !== 'object') req.body = { value: req.body };
  }
}

/* ======================================================================
 * 4) Response helpers
 * ==================================================================== */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
};

function decorate(req, res) {
  res.json = (status, obj) => {
    if (res.writableEnded) return;
    if (obj === undefined && typeof status === 'object') { obj = status; status = 200; }
    const body = Buffer.from(JSON.stringify(obj === undefined ? {} : obj));
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  res.send = (status, body, headers = {}) => {
    if (res.writableEnded) return;
    const b = Buffer.isBuffer(body) ? body : Buffer.from(String(body === undefined ? '' : body));
    res.writeHead(status, Object.assign({ 'Content-Length': b.length }, headers));
    res.end(req.method === 'HEAD' ? undefined : b);
  };
  res.redirect = (location, status = 302) => {
    if (res.writableEnded) return;
    res.writeHead(status, { Location: location, 'Content-Length': 0, 'Cache-Control': 'no-store' });
    res.end();
  };
  res.noContent = () => { if (!res.writableEnded) { res.writeHead(204); res.end(); } };
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
}

function sendError(res, err) {
  if (err instanceof store.HttpError || (err && err.status && err.code)) {
    const body = typeof err.toJSON === 'function' ? err.toJSON() : { code: err.code, message: err.message };
    return res.json(err.status, body);
  }
  console.error('[server] error:', err && err.stack ? err.stack : err);
  const e = store.httpError('INTERNAL');
  return res.json(e.status, e.toJSON());
}

/* ======================================================================
 * 5) หน้าเว็บ (route → ไฟล์ใน public/)
 * ==================================================================== */
const ALL_STAFF = ['officer', 'head', 'executive', 'auditor', 'admin'];
const PAGES = [
  { path: '/login', file: 'login.html', public: true },
  { path: '/register', file: 'register.html', register: true },
  { path: '/citizen', file: 'citizen.html', roles: ['citizen'] },
  { path: '/citizen/new/:service', file: 'citizen-new.html', roles: ['citizen'] },
  { path: '/citizen/cases/:caseNo', file: 'citizen-case.html', roles: ['citizen'], caseCheck: 'owner' },
  { path: '/officer/queue', file: 'officer-queue.html', roles: ['officer', 'head'] },
  { path: '/officer/cases/:caseNo', file: 'officer-case.html', roles: ['officer', 'head'], caseCheck: 'exists' },
  { path: '/head/approvals', file: 'head-approvals.html', roles: ['head'] },
  { path: '/dashboard', file: 'dashboard.html', roles: ['executive'] },
  { path: '/audit', file: 'audit.html', roles: ['auditor'] },
  { path: '/admin/services', file: 'admin-services.html', roles: ['admin'] },
  { path: '/admin/holidays', file: 'admin-holidays.html', roles: ['admin'] },
  { path: '/admin/users', file: 'admin-users.html', roles: ['admin'] },
  { path: '/notifications', file: 'notifications.html', roles: ['officer', 'head'] },
  { path: '/verify/:code', file: 'verify.html', public: true, verify: true },
].map((p) => Object.assign(p, compile(p.path)));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf',
};

function landingOf(user) {
  if (!user) return '/login';
  if (user.role === 'citizen') return user.registered ? '/citizen' : '/register';
  return store.LANDING[user.role] || '/login';
}

const esc = (s) => String(s === undefined || s === null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** หน้า 403/404 ในตัว (ใช้เมื่อ public/403.html, 404.html ไม่มี) · มีส่วนหัวตาม CONTRACT 2.1 */
function builtinPage(user, title, testid, message) {
  const header = user ? `<header data-testid="app-header" class="app-header">
  <span data-testid="user-name">${esc(user.name)}</span>
  <span data-testid="user-role" data-role="${esc(user.role)}"${user.dept ? ` data-dept="${esc(user.dept)}"` : ''}>${esc(store.ROLE_TH[user.role] || user.role)}</span>
  <a href="${esc(landingOf(user))}">หน้าหลัก</a>
  <button type="button" data-testid="logout-btn" onclick="fetch('/api/auth/logout',{method:'POST'}).finally(function(){location.href='/login'})">ออกจากระบบ</button>
</header>` : '';
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · e-Service เทศบาลนครตัวอย่าง</title>
<link rel="stylesheet" href="/app.css"></head>
<body>${header}
<main id="main"><h1 data-testid="${esc(testid)}">${esc(message)}</h1>
<p><a href="${esc(landingOf(user))}">กลับหน้าหลัก</a></p></main>
</body></html>`;
}

function readPublic(file) {
  const p = path.join(PUBLIC_DIR, file);
  try { return fs.readFileSync(p); } catch (e) { return null; }
}

function sendHtml(res, status, html) {
  res.send(status, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
}

function sendForbidden(req, res) {
  const f = readPublic('403.html');
  sendHtml(res, 403, f || builtinPage(req.user, 'ไม่มีสิทธิ์', 'forbidden-msg', 'ไม่มีสิทธิ์เข้าถึงหน้านี้'));
}
function sendCaseNotFound(req, res) {
  const f = readPublic('404.html');
  sendHtml(res, 404, f || builtinPage(req.user, 'ไม่พบคำขอ', 'not-found-msg', 'ไม่พบคำขอ'));
}

/** คืน true ถ้าจัดการเป็นหน้าเว็บแล้ว */
function handlePage(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const user = req.user;
  if (pathname === '/' || pathname === '') { res.redirect(landingOf(user)); return true; }
  let page = null; let m = null;
  for (const p of PAGES) { m = p.re.exec(pathname); if (m) { page = p; break; } }
  if (!page) return false;
  const params = {};
  page.keys.forEach((k, i) => { try { params[k] = decodeURIComponent(m[i + 1]); } catch (e) { params[k] = m[i + 1]; } });

  let status = 200;
  if (page.verify) {
    if (!store.findDocByCode(params.code)) status = 404;           // รหัสไม่มี → HTTP 404 (หน้า "ไม่พบเอกสาร")
  } else if (page.register) {
    if (!user) { res.redirect('/login'); return true; }
    if (user.role !== 'citizen' || user.registered) { res.redirect(landingOf(user)); return true; }
  } else if (!page.public) {
    if (!user) { res.redirect('/login'); return true; }
    if (!page.roles.includes(user.role)) { sendForbidden(req, res); return true; }
    if (user.role === 'citizen' && !user.registered) { res.redirect('/register'); return true; }
    if (page.caseCheck) {
      const c = store.findCase(params.caseNo);
      if (!c || (page.caseCheck === 'owner' && c.citizenId !== user.citizenId)) { sendCaseNotFound(req, res); return true; }
    }
  }

  const html = readPublic(page.file);
  if (!html) {
    if (page.verify && status === 404) {
      sendHtml(res, 404, builtinPage(null, 'ไม่พบเอกสาร', 'verify-result', 'ไม่พบเอกสาร'));
      return true;
    }
    sendHtml(res, 404, builtinPage(user, 'ยังไม่มีหน้านี้', 'page-missing', `ยังไม่ได้สร้างหน้า ${page.file}`));
    return true;
  }
  sendHtml(res, status, html);
  return true;
}

/** ไฟล์ static ใน public/ (css js รูป) · ไม่ให้เข้าถึงนอกโฟลเดอร์ */
function handleStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { return false; }
  if (rel.includes('\0')) return false;
  const p = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!p.startsWith(PUBLIC_DIR + path.sep)) return false;
  let st;
  try { st = fs.statSync(p); } catch (e) { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(p).toLowerCase();
  if (ext === '.html') return false;                       // หน้า html ต้องผ่าน PAGES (มีการตรวจสิทธิ์)
  res.send(200, fs.readFileSync(p), { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  return true;
}

/* ======================================================================
 * 6) app API ที่ส่งให้โมดูล + route ของ server เอง
 * ==================================================================== */
const app = {
  get: (p, o, h) => addRoute('GET', p, o, h),
  post: (p, o, h) => addRoute('POST', p, o, h),
  put: (p, o, h) => addRoute('PUT', p, o, h),
  patch: (p, o, h) => addRoute('PATCH', p, o, h),
  delete: (p, o, h) => addRoute('DELETE', p, o, h),
  all: (p, o, h) => addRoute('ALL', p, o, h),
  route: (method, p, o, h) => addRoute(String(method).toUpperCase(), p, o, h),
  login, logout, landingOf, parseMultipart,
  store, time, TEST_MODE, bug: store.bug,
  routes,
};

// สุขภาพ: ตรงตัว ไม่มีฟิลด์อื่น (CONTRACT 6.6) · ไม่ขึ้นกับ TEST_MODE
app.get('/api/health', () => ({ status: 'ok' }));

// Test hook (CONTRACT 8) — /api/test/* ทั้งหมดตอบ 404 เมื่อไม่ได้ตั้ง TEST_MODE=1 (ตรวจใน handle())
app.post('/api/test/reset', (req, res) => {
  const now = store.reset();                 // seed ใหม่ + นาฬิกาเริ่มต้น + ล้าง session/OTP/ล็อก/ไฟล์ (onReset hooks ของโมดูล)
  setCookie(res, '', 0);
  req.session = null; req.user = null;
  return { ok: true, now };
});
app.get('/api/test/clock', () => ({ now: time.nowIso() }));
app.put('/api/test/clock', (req) => {
  const v = req.body && req.body.now;
  const iso = typeof v === 'string' ? time.setNow(v) : null;
  if (!iso) store.fail('INVALID_TIME');
  return { now: iso };
});

// ค่าเริ่มต้นสำหรับ /api/me และ logout (src/auth.js override ได้ด้วย path เดียวกัน)
app.get('/api/me', { auth: true, allowUnregistered: true }, (req) => {
  const u = req.user;
  return { username: u.username, name: u.name, role: u.role, dept: u.dept || '' };
});
app.post('/api/auth/logout', { allowUnregistered: true }, (req, res) => { logout(req, res); res.noContent(); });

/* ======================================================================
 * 7) โหลดโมดูลของบล็อกอื่น
 * ==================================================================== */
const loaded = [];
for (const name of MODULES) {
  const file = path.join(__dirname, 'src', `${name}.js`);
  if (!fs.existsSync(file)) continue;
  let mod;
  try { mod = require(file); } catch (e) {
    console.error(`[server] โหลด src/${name}.js ไม่สำเร็จ:`, e && e.stack ? e.stack : e);
    continue;
  }
  try {
    if (typeof mod.register === 'function') mod.register(app);
    else if (typeof mod.routes === 'function') mod.routes(app);
    else if (Array.isArray(mod.routes)) {
      for (const r of mod.routes) addRoute(String(r.method || 'GET').toUpperCase(), r.path, r.opts || { roles: r.roles, auth: r.auth }, r.handler);
    }
  } catch (e) {
    console.error(`[server] ลงทะเบียน route ของ src/${name}.js ไม่สำเร็จ:`, e && e.stack ? e.stack : e);
  }
  if (name === 'auth') authModule = mod;
  loaded.push({ name, mod });
}
const tickers = loaded.filter((l) => typeof l.mod.tick === 'function');

function runTicks() {
  const nowIso = time.nowIso();
  for (const t of tickers) {
    try { t.mod.tick(nowIso); } catch (e) { console.error(`[server] tick ของ ${t.name} error:`, e && e.stack ? e.stack : e); }
  }
}

/* ======================================================================
 * 8) ตัวจัดการ request
 * ==================================================================== */
function checkAccess(req, opts) {
  const needAuth = opts.auth || (Array.isArray(opts.roles) && opts.roles.length);
  const user = req.user;
  if (user && user.role === 'citizen' && !user.registered && !opts.allowUnregistered && needAuth) {
    store.fail('FORBIDDEN');                                    // cookie ของผู้ยังไม่ลงทะเบียนใช้ได้เฉพาะ /register
  }
  if (!needAuth) return;
  if (!user) store.fail('UNAUTHENTICATED');
  if (Array.isArray(opts.roles) && opts.roles.length && !opts.roles.includes(user.role)) store.fail('FORBIDDEN');
}

async function handle(req, res) {
  decorate(req, res);
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.replace(/\/{2,}/g, '/');
  req.path = pathname;
  req.query = Object.fromEntries(url.searchParams);
  req.searchParams = url.searchParams;
  req.cookies = parseCookies(req.headers.cookie);

  const isTest = pathname === '/api/test' || pathname.startsWith('/api/test/');
  if (isTest && !TEST_MODE) {
    req.resume();
    return res.json(404, { code: 'NOT_FOUND', message: 'Not Found' });
  }

  try {
    if (!isTest) runTicks();                                     // CONTRACT 0.7 (A-30, A-46)

    const sid = req.cookies[COOKIE_NAME];
    req.session = sid ? store.mem.sessions.get(sid) || null : null;
    req.user = resolveUser(req);
    if (req.session && !req.user) req.session = null;           // ผู้ใช้ถูกปิด/ลบ → ถือว่าไม่ได้ล็อกอิน

    if (pathname.startsWith('/api/') || pathname === '/api') {
      const { route, params, pathMatched } = matchRoute(req.method, pathname);
      if (!route) {
        req.resume();
        if (pathMatched) { const e = store.httpError('METHOD_NOT_ALLOWED'); return res.json(e.status, e.toJSON()); }
        return res.json(404, { code: 'NOT_FOUND', message: 'ไม่พบ' });
      }
      req.params = params;
      checkAccess(req, route.opts);
      await parseBody(req);
      const out = await route.handler(req, res);
      if (!res.writableEnded) {
        if (out === undefined) res.noContent();
        else res.json(200, out);
      }
      return;
    }

    req.resume();
    if (handlePage(req, res, pathname)) return;
    if (handleStatic(req, res, pathname)) return;
    if (pathname === '/favicon.ico') return res.send(204, '');
    return sendHtml(res, 404, builtinPage(req.user, 'ไม่พบหน้า', 'page-not-found', 'ไม่พบหน้าที่ต้องการ'));
  } catch (err) {
    if (!req.readableEnded) req.resume();
    sendError(res, err);
  } finally {
    try { store.save(); } catch (e) { console.error('[server] save error:', e); }
  }
}

/* ======================================================================
 * 9) เริ่มเซิร์ฟเวอร์
 * ==================================================================== */
store.init();

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => { try { sendError(res, e); } catch (x) { /* ignore */ } });
});
server.requestTimeout = 120000;
server.headersTimeout = 60000;
server.keepAliveTimeout = 5000;

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`[server] e-Service พร้อมที่ http://${HOST}:${PORT} · TEST_MODE=${TEST_MODE ? 1 : 0} · BUG_MODE=${[...store.BUGS].join(',') || '-'} · DB=${store.DB_PATH} (${store.dbKind}) · โมดูล: ${loaded.map((l) => l.name).join(', ') || '-'} · now=${time.nowIso()}`);
  });
  const shutdown = () => { try { store.flush(); } catch (e) { /* ignore */ } server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 2000).unref(); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = { server, app, handle };

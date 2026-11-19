'use strict';
// เซิร์ฟเวอร์หลัก: node:http ไม่มี dependency · env: PORT TEST_MODE BUG_MODE DB_PATH
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const store = require('./src/store');
const { clock, bug } = require('./src/time');
const buildStubs = require('./src/stubs');

const PORT = Number(process.env.PORT) || 3100;
const PUBLIC = path.join(__dirname, 'public');
const MAX_BODY = 12 * 1024 * 1024; // >= 6 MB ตาม CONTRACT ข้อ 10

// ---------- ตัวช่วย response ----------
function send(res, status, body, type = 'text/plain; charset=utf-8', headers = {}) {
  if (res.headersSent) return;
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ''), 'utf8');
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': buf.length, ...headers });
  res.end(buf);
}
const json = (res, status, obj, headers) => send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', headers);
const err = (res, status, code, message, extra = {}) => json(res, status, { code, message, ...extra });
const redirect = (res, loc) => { res.writeHead(302, { Location: loc }); res.end(); };

function cookies(req) {
  const out = {};
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return out;
}

// multipart/form-data -> {fields:{}, files:[{field, filename, contentType, buffer}]}
function parseMultipart(req) {
  const ct = String(req.headers['content-type'] || '');
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct);
  const out = { fields: {}, files: [] };
  if (!m || !req.raw) return out;
  const delim = Buffer.from('--' + (m[1] || m[2]));
  const raw = req.raw;
  let pos = raw.indexOf(delim);
  while (pos !== -1) {
    const next = raw.indexOf(delim, pos + delim.length);
    if (next === -1) break;
    let part = raw.subarray(pos + delim.length, next);
    if (part.subarray(0, 2).toString() === '--') break;
    if (part.subarray(0, 2).toString() === '\r\n') part = part.subarray(2);
    if (part.subarray(part.length - 2).toString() === '\r\n') part = part.subarray(0, part.length - 2);
    const he = part.indexOf('\r\n\r\n');
    if (he !== -1) {
      const head = part.subarray(0, he).toString('utf8');
      const body = part.subarray(he + 4);
      const name = /name="([^"]*)"/i.exec(head);
      const fn = /filename="([^"]*)"/i.exec(head);
      const ctype = /content-type:\s*([^\r\n]+)/i.exec(head);
      if (name) {
        if (fn) out.files.push({ field: name[1], filename: fn[1], contentType: ctype ? ctype[1].trim() : '', buffer: Buffer.from(body) });
        else out.fields[name[1]] = body.toString('utf8');
      }
    }
    pos = next;
  }
  return out;
}

// ---------- router ----------
const routes = [];
const router = {
  // add('GET', '/api/cases/:caseNo', async (req, res) => {...})  ; '*' ท้าย pattern = จับส่วนที่เหลือ (req.params['*'])
  add(method, pattern, handler) {
    const segs = pattern.split('/').filter(Boolean);
    routes.push({ method: method.toUpperCase(), segs, handler, pattern });
  },
  match(method, pathname) {
    const parts = pathname.split('/').filter(Boolean);
    let pathMatched = false;
    for (const r of routes) {
      const params = {};
      let ok = true;
      for (let i = 0; i < r.segs.length; i++) {
        const s = r.segs[i];
        if (s === '*') { params['*'] = parts.slice(i).map(decodeURIComponent).join('/'); break; }
        if (i >= parts.length) { ok = false; break; }
        if (s[0] === ':') params[s.slice(1)] = decodeURIComponent(parts[i]);
        else if (s !== parts[i]) { ok = false; break; }
        if (i === r.segs.length - 1 && parts.length > r.segs.length) ok = false;
      }
      if (ok && r.segs.length === 0 && parts.length > 0) ok = false;
      if (!ok) continue;
      pathMatched = true;
      if (r.method === method || r.method === '*') return { route: r, params };
    }
    return { route: null, pathMatched };
  },
};

// ---------- ctx ----------
const hooks = { reset: [], request: [] };
const ctx = {
  store, clock, bug, router,
  json, err, send, redirect, cookies, parseMultipart,
  onReset(fn) { hooks.reset.push(fn); },     // fn() เรียกหลัง store.reset() ในแต่ละ POST /api/test/reset
  onRequest(fn) { hooks.request.push(fn); }, // fn(req) เรียกทุกคำขอ ยกเว้น /api/test/* (SLA/ยกเลิกอัตโนมัติ)
  landing(user) {
    return { citizen: user.registered === false ? '/register' : '/citizen', officer: '/officer/queue', head: '/head/approvals', executive: '/dashboard', auditor: '/audit', admin: '/admin/services' }[user.role] || '/login';
  },
  MAX_BODY,
};
Object.assign(ctx, buildStubs(ctx));
store.bind(ctx);

// ---------- โหลดโมดูล src/mod-*.js ----------
const LOAD_ORDER = ['mod-vault', 'mod-sla', 'mod-auth', 'mod-drafts', 'mod-cases', 'mod-reports'];
const srcDir = path.join(__dirname, 'src');
const found = fs.readdirSync(srcDir).filter((f) => /^mod-.*\.js$/.test(f)).map((f) => f.replace(/\.js$/, ''));
const ordered = [...LOAD_ORDER.filter((n) => found.includes(n)), ...found.filter((n) => !LOAD_ORDER.includes(n)).sort()];
const loaded = [];
for (const name of ordered) {
  const mod = require('./src/' + name);
  if (mod && typeof mod.register === 'function') { mod.register(router, ctx); loaded.push(name); }
}

// ---------- API ในตัว ----------
router.add('GET', '/api/health', (req, res) => json(res, 200, { status: 'ok' }));

function resetAll() {
  clock.reset();
  store.reset();
  if (ctx.session && ctx.session.clearAll) ctx.session.clearAll();
  for (const fn of hooks.reset) fn();
}
const testOnly = (h) => (req, res) => {
  if (process.env.TEST_MODE !== '1') return err(res, 404, 'NOT_FOUND', 'Not Found');
  return h(req, res);
};
router.add('POST', '/api/test/reset', testOnly((req, res) => { resetAll(); json(res, 200, { ok: true, now: clock.nowISO() }); }));
router.add('GET', '/api/test/clock', testOnly((req, res) => json(res, 200, { now: clock.nowISO() })));
router.add('PUT', '/api/test/clock', testOnly((req, res) => {
  const ms = clock.parseISO(req.body && req.body.now);
  if (ms == null) return err(res, 400, 'INVALID_TIME', 'เวลาไม่ถูกต้อง ต้องเป็น ISO พร้อม offset');
  clock.set(ms);
  json(res, 200, { now: clock.nowISO() });
}));
router.add('POST', '/api/test/payments/:ref/pay', testOnly(async (req, res) => {
  const r = await ctx.testHooks.pay(req.params.ref, req.body || {});
  json(res, r.status, r.body);
}));
router.add('POST', '/api/test/documents/:docNo/tamper', testOnly(async (req, res) => {
  const r = await ctx.testHooks.tamper(req.params.docNo);
  json(res, r.status, r.body);
}));

// ---------- หน้า (HTML) ----------
const ALL = null;
const PAGES = [
  // [regex, ไฟล์, บทบาทที่เข้าได้ (null = ทุกคน/ไม่ต้องล็อกอิน), kind]
  [/^\/login$/, 'login.html', ALL, 'open'],
  [/^\/register$/, 'register.html', ['citizen'], 'register'],
  [/^\/citizen$/, 'citizen.html', ['citizen']],
  [/^\/citizen\/new\/[^/]+$/, 'wizard.html', ['citizen']],
  [/^\/citizen\/cases\/([^/]+)$/, 'case.html', ['citizen'], 'case'],
  [/^\/officer\/queue$/, 'queue.html', ['officer', 'head']],
  [/^\/officer\/cases\/([^/]+)$/, 'case.html', ['officer', 'head'], 'case'],
  [/^\/head\/approvals$/, 'approvals.html', ['head']],
  [/^\/dashboard$/, 'dashboard.html', ['executive']],
  [/^\/audit$/, 'audit.html', ['auditor']],
  [/^\/admin\/services$/, 'admin-services.html', ['admin']],
  [/^\/admin\/holidays$/, 'admin-holidays.html', ['admin']],
  [/^\/admin\/users$/, 'admin-users.html', ['admin']],
  [/^\/notifications$/, 'notifications.html', ['officer', 'head']],
  [/^\/verify\/([^/]+)$/, 'verify.html', ALL, 'verify'],
];
function pageFile(res, status, file, fallbackHtml) {
  const p = path.join(PUBLIC, file);
  if (fs.existsSync(p)) return send(res, status, fs.readFileSync(p), 'text/html; charset=utf-8');
  send(res, status, fallbackHtml, 'text/html; charset=utf-8');
}
const htmlWrap = (inner) => `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>e-Service</title></head><body>${inner}</body></html>`;
function forbiddenPage(res) { pageFile(res, 403, '403.html', htmlWrap('<p data-testid="forbidden-msg">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>')); }
function notFoundPage(res) { pageFile(res, 404, '404.html', htmlWrap('<p data-testid="not-found-msg">ไม่พบคำขอ</p>')); }

function servePage(req, res, pathname) {
  if (pathname === '/') {
    const u = ctx.session.current(req);
    return redirect(res, u ? ctx.landing(u) : '/login');
  }
  for (const [re, file, roles, kind] of PAGES) {
    const m = re.exec(pathname);
    if (!m) continue;
    const u = ctx.session.current(req);
    if (kind === 'verify') {
      const st = ctx.pageHooks.verifyStatus(decodeURIComponent(m[1]));
      return pageFile(res, st, file, htmlWrap('<div id="app" data-testid="verify-result"></div>'));
    }
    if (kind === 'open') return pageFile(res, 200, file, htmlWrap('<div id="app">login page not built</div>'));
    if (!u) return redirect(res, '/login');
    if (!roles.includes(u.role)) return forbiddenPage(res);
    if (kind === 'register' && u.registered) return redirect(res, '/citizen');
    if (kind === 'case' && !ctx.pageHooks.caseVisible(u, decodeURIComponent(m[1]))) return notFoundPage(res);
    return pageFile(res, 200, file, htmlWrap(`<div id="app">${file} not built</div>`));
  }
  return false;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
function serveStatic(res, pathname) {
  const rel = path.normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const p = path.join(PUBLIC, rel);
  if (!p.startsWith(PUBLIC + path.sep) || !fs.existsSync(p) || !fs.statSync(p).isFile()) return false;
  send(res, 200, fs.readFileSync(p), MIME[path.extname(p).toLowerCase()] || 'application/octet-stream');
  return true;
}

// ---------- dispatch ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > MAX_BODY) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const pathname = url.pathname;
  const isApi = pathname.startsWith('/api/');
  req.query = Object.fromEntries(url.searchParams);
  req.pathname = pathname;
  req.raw = Buffer.alloc(0);
  req.body = {};
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.raw = await readBody(req);
    if (/json/i.test(req.headers['content-type'] || '') && req.raw.length) {
      try { req.body = JSON.parse(req.raw.toString('utf8')); } catch { return err(res, 400, 'INVALID_JSON', 'JSON ไม่ถูกต้อง'); }
    }
  }
  if (isApi && !pathname.startsWith('/api/test/')) {
    for (const fn of hooks.request) { try { fn(req); } catch (e) { console.error('request hook:', e); } }
  }
  if (isApi) {
    const { route, params, pathMatched } = router.match(req.method, pathname);
    if (!route) {
      if (pathMatched) return err(res, 405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
      return err(res, 404, 'NOT_FOUND', 'Not Found');
    }
    req.params = params;
    req.user = ctx.session.current(req);
    return route.handler(req, res);
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (servePage(req, res, pathname) !== false) return;
    if (serveStatic(res, pathname)) return;
  }
  send(res, 404, 'Not Found');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    if (e && e.code && e.status && !res.headersSent) return err(res, e.status, e.code, e.message || '');
    console.error(e);
    if (!res.headersSent) err(res, e && e.status === 413 ? 413 : 500, e && e.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL', 'เกิดข้อผิดพลาดภายในระบบ');
  });
});

resetAll(); // seed ครั้งแรกหลังโหลดโมดูลครบ
server.listen(PORT, () => console.log(`listening :${PORT} TEST_MODE=${process.env.TEST_MODE || ''} modules=[${loaded.join(',')}]`));
module.exports = { server, ctx };


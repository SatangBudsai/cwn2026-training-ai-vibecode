import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as St from './src/store.js';
import { routes, sessionUser, verifyCode } from './src/routes.js';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dir, 'public');
const PORT = +(process.env.PORT || 3100);
const TEST_MODE = ['1', 'true'].includes(String(process.env.TEST_MODE || '').toLowerCase());
const MAX_BODY = 24 * 1024 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json' };

const parseCookies = h => Object.fromEntries((h || '').split(';').map(s => s.trim().split('=')).filter(a => a[0]).map(([k, ...v]) => [k, v.join('=')]));
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > MAX_BODY) { reject(Object.assign(new Error('big'), { http: 400, body: { code: 'FILE_TOO_LARGE', message: 'ไฟล์ใหญ่เกิน 5 MB' } })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function send(res, status, body, headers = {}) {
  const h = { 'Cache-Control': 'no-store', ...headers };
  if (body == null) { res.writeHead(status, h); return res.end(); }
  if (Buffer.isBuffer(body)) { res.writeHead(status, { 'Content-Length': body.length, ...h }); return res.end(body); }
  const s = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(s), ...h }); res.end(s);
}
const redirect = (res, to) => { res.writeHead(302, { Location: to, 'Cache-Control': 'no-store' }); res.end(); };

// ---------- pages ----------
const PLACEHOLDER = {
  'forbidden.html': '<h1 data-testid="forbidden-msg">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>',
  'notfound.html': '<h1 data-testid="not-found-msg">ไม่พบคำขอ</h1>',
};
function page(res, file, status = 200) {
  const p = path.join(PUBLIC, file);
  let body;
  try { body = fs.readFileSync(p); } catch { body = Buffer.from(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${file}</title></head><body>${PLACEHOLDER[file] || `<p>placeholder ${file}</p>`}</body></html>`); }
  send(res, status, body, { 'Content-Type': 'text/html; charset=utf-8' });
}
const landing = u => (u.role === 'citizen' && !u.registered ? '/register' : St.ROLE_LANDING[u.role]);
// returns true when handled
function handlePage(req, res, p, u) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const forbid = () => page(res, 'forbidden.html', 403);
  const guarded = (roles, file, status = 200) => {
    if (!u) return redirect(res, '/login');
    if (u.role === 'citizen' && !u.registered && roles.includes('citizen')) return redirect(res, '/register');
    if (!roles.includes(u.role)) return forbid();
    page(res, file, status);
  };
  let m;
  if (p === '/') return redirect(res, u ? landing(u) : '/login'), true;
  if (p === '/login') return page(res, 'login.html'), true;
  if (p === '/register') {
    if (!u) redirect(res, '/login'); else if (u.role !== 'citizen' || u.registered) redirect(res, landing(u)); else page(res, 'register.html');
    return true;
  }
  if (p === '/citizen') return guarded(['citizen'], 'citizen.html'), true;
  if ((m = /^\/citizen\/new\/([^/]+)$/.exec(p))) {
    if (!/^SV-0[123]$/.test(m[1]) && u && u.role === 'citizen') return page(res, 'notfound.html', 404), true;
    return guarded(['citizen'], 'wizard.html'), true;
  }
  if ((m = /^\/(citizen|officer)\/cases\/([^/]+)$/.exec(p))) {
    const roles = m[1] === 'citizen' ? ['citizen'] : ['officer', 'head'];
    if (!u) return redirect(res, '/login'), true;
    if (u.role === 'citizen' && !u.registered && m[1] === 'citizen') return redirect(res, '/register'), true;
    if (!roles.includes(u.role)) return forbid(), true;
    const c = St.S.cases.get(decodeURIComponent(m[2]));
    if (!c || (u.role === 'citizen' && c.owner !== u.username)) return page(res, 'notfound.html', 404), true;
    return page(res, 'case.html'), true;
  }
  if (p === '/officer/queue') return guarded(['officer', 'head'], 'queue.html'), true;
  if (p === '/head/approvals') return guarded(['head'], 'approvals.html'), true;
  if (p === '/dashboard') return guarded(['executive'], 'dashboard.html'), true;
  if (p === '/audit') return guarded(['auditor'], 'audit.html'), true;
  if (p === '/admin/services') return guarded(['admin'], 'admin-services.html'), true;
  if (p === '/admin/holidays') return guarded(['admin'], 'admin-holidays.html'), true;
  if (p === '/admin/users') return guarded(['admin'], 'admin-users.html'), true;
  if (p === '/notifications') return guarded(['officer', 'head'], 'notifications.html'), true;
  if ((m = /^\/verify\/([^/]+)$/.exec(p))) {
    const r = verifyCode(decodeURIComponent(m[1]));
    return page(res, 'verify.html', r.http === 404 ? 404 : 200), true;
  }
  return false;
}
function handleStatic(req, res, p) {
  if (!p.startsWith('/static/') || (req.method !== 'GET' && req.method !== 'HEAD')) return false;
  let rel; try { rel = decodeURIComponent(p.slice(8)); } catch { return send(res, 400, null), true; }
  const abs = path.normalize(path.join(PUBLIC, 'static', rel));
  if (!abs.startsWith(PUBLIC + path.sep) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' }), true;
  send(res, 200, fs.readFileSync(abs), { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname.replace(/\/{2,}/g, '/');
    const isTest = p.startsWith('/api/test/') || p === '/api/test';
    if (isTest && !TEST_MODE) return send(res, 404, { code: 'NOT_FOUND', message: 'Not Found' });
    if (!isTest) St.evaluate();
    const sid = parseCookies(req.headers.cookie).sid || null;
    const user = sessionUser(sid);

    if (/^\/api\/audit(\/|$)/.test(p) && ['PUT', 'PATCH', 'DELETE'].includes(req.method))
      return send(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' }, { Allow: 'GET' });

    if (!p.startsWith('/api/')) {
      if (handleStatic(req, res, p)) return;
      if (handlePage(req, res, p, user)) return;
      return page(res, 'notfound.html', 404);
    }

    const route = routes.map(r => ({ r, m: r.method === req.method && r.re.exec(p) })).find(x => x.m);
    if (!route) {
      const any = routes.some(r => r.re.test(p));
      return send(res, any ? 405 : 404, any ? { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } : { code: 'NOT_FOUND', message: 'Not Found' });
    }
    const params = {}; route.r.keys.forEach((k, i) => { params[k] = decodeURIComponent(route.m[i + 1]); });
    let rawBody = Buffer.alloc(0);
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) rawBody = await readBody(req);
    let body = {};
    if (/json/i.test(req.headers['content-type'] || '') && rawBody.length) { try { body = JSON.parse(rawBody.toString('utf8')) || {}; } catch { body = {}; } }
    if (typeof body !== 'object') body = {};
    const out = route.r.fn({ req, params, query: url.searchParams, body, raw: rawBody, user, sid });
    if (out.raw) return send(res, out.status, out.raw, out.headers);
    send(res, out.status, out.body, out.headers);
  } catch (e) {
    if (e.http) return send(res, e.http, e.body);
    console.error(e);
    send(res, 500, { code: 'INTERNAL', message: 'Internal Server Error' });
  }
});
server.requestTimeout = 0;
server.listen(PORT, () => console.log(`e-Service listening on :${PORT} TEST_MODE=${TEST_MODE ? 1 : 0} BUG_MODE=${process.env.BUG_MODE || ''}`));

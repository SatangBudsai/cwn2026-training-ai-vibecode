import crypto from 'node:crypto';
import * as T from './time.js';
import * as V from './vault.js';
import * as St from './store.js';
import { makePdf, makeXlsx, csvCell } from './exports.js';

const { fail, MSG } = St;
const S = () => St.S;
export const routes = [];
const add = (method, pattern, fn) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ method, re, keys, fn });
};
const json = (body, status = 200, headers = {}) => ({ status, body, headers });
const raw = (status, buf, headers) => ({ status, raw: buf, headers });

// ---------- guards ----------
const need = (ctx, ...roles) => {
  if (!ctx.user) fail('UNAUTHENTICATED');
  if (roles.length && !roles.includes(ctx.user.role)) fail('FORBIDDEN');
  if (ctx.user.role === 'citizen' && !ctx.user.registered && roles.includes('citizen')) fail('FORBIDDEN');
  return ctx.user;
};
const findCase = no => { const c = S().cases.get(no); if (!c) fail('NOT_FOUND'); return c; };
const ownCase = (u, no) => { const c = findCase(no); if (c.owner !== u.username) fail('NOT_FOUND'); return c; };
const staffCase = no => findCase(no);

// ---------- multipart ----------
export function parseMultipart(buf, ctype) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype || '');
  if (!m) return [];
  const delim = Buffer.from('--' + (m[1] || m[2]));
  const parts = []; let pos = buf.indexOf(delim);
  while (pos !== -1) {
    let start = pos + delim.length;
    if (buf.subarray(start, start + 2).toString() === '--') break;
    if (buf[start] === 13) start += 2;
    const hEnd = buf.indexOf('\r\n\r\n', start); if (hEnd === -1) break;
    const next = buf.indexOf(delim, hEnd + 4); if (next === -1) break;
    const head = buf.subarray(start, hEnd).toString('utf8');
    const data = buf.subarray(hEnd + 4, next - 2);
    const name = /name="([^"]*)"/i.exec(head)?.[1];
    const fm = /filename="([^"]*)"/i.exec(head);
    parts.push({ name, filename: fm ? fm[1] : null, data });
    pos = next;
  }
  return parts;
}
function filesFrom(ctx, defaultKey) {
  const parts = parseMultipart(ctx.raw, ctx.req.headers['content-type']);
  const docKey = parts.find(p => p.name === 'docKey' && p.filename == null)?.data.toString('utf8').trim() || defaultKey;
  return parts.filter(p => p.filename != null).map(p => ({ name: p.filename, docKey, buf: Buffer.from(p.data) }));
}

// ---------- sessions ----------
function newSession(ctx, user, extra = {}) {
  const sid = crypto.randomBytes(24).toString('hex');
  S().sessions.set(sid, { username: user.username, role: user.role, dept: user.dept || null, name: user.name, ...extra });
  return { 'Set-Cookie': `sid=${sid}; HttpOnly; Path=/; SameSite=Lax` };
}
export function sessionUser(sid) {
  const s = sid && S().sessions.get(sid); if (!s) return null;
  const row = V.getUser(s.username); if (!row) return null;
  return { username: s.username, role: s.role, dept: s.dept, name: s.name, registered: row.registered };
}

// ---------- ThaiD ----------
const validId = id => {
  if (typeof id !== 'string' || !/^\d{13}$/.test(id)) return false;
  let sum = 0; for (let i = 0; i < 12; i++) sum += +id[i] * (13 - i);
  return (11 - (sum % 11)) % 10 === +id[12];
};
function lockState(key) {
  const o = S().otp.get(key); if (!o) return null;
  if (o.lockedUntil && T.nowMs() >= o.lockedUntil) { S().otp.delete(key); return null; }
  return o.lockedUntil ? o : null;
}
const lockedFail = o => fail('LOCKED', { lockedUntil: T.iso(o.lockedUntil) });
add('POST', '/api/auth/thaid/start', ctx => {
  const id = ctx.body.idNo; if (!validId(id)) fail('INVALID_ID');
  const l = lockState(V.blind(id)); if (l) lockedFail(l);
  return json({ status: 'OTP_SENT' });
});
add('POST', '/api/auth/thaid/verify', ctx => {
  const id = ctx.body.idNo; if (!validId(id)) fail('INVALID_ID');
  const key = V.blind(id);
  const l = lockState(key); if (l) lockedFail(l);
  if (String(ctx.body.otp) !== '123456') {
    const o = S().otp.get(key) || { count: 0, lockedUntil: null }; o.count++; S().otp.set(key, o);
    if (o.count >= 3) { o.lockedUntil = T.nowMs() + 15 * 60e3; lockedFail(o); }
    fail('OTP_INVALID', { attemptsLeft: 3 - o.count });
  }
  S().otp.delete(key);
  let u = V.getUserByIdx(key);
  if (!u) u = V.makeCitizen({ idNo: id, name: `ผู้ใช้ ThaiD ${id.slice(9)}`, mobile: null, registered: false });
  return json({ registered: u.registered }, 200, newSession(ctx, u));
});
add('POST', '/api/auth/register', ctx => {
  const u = need(ctx); if (u.role !== 'citizen') fail('FORBIDDEN');
  if (u.registered) fail('INVALID_STATE');
  const { mobile, email, consent } = ctx.body;
  if (typeof mobile !== 'string' || !/^0\d{9}$/.test(mobile)) fail('INVALID_MOBILE');
  if (consent !== true) fail('CONSENT_REQUIRED');
  const row = V.getUser(u.username);
  row.mobile_enc = V.enc(mobile); row.email = typeof email === 'string' ? email : ''; row.registered = true; V.putUser(row);
  return json({ registered: true }, 201);
});
add('POST', '/api/auth/staff/login', ctx => {
  const { username, password } = ctx.body;
  const row = typeof username === 'string' ? V.getUser(username) : null;
  if (!row || row.role === 'citizen' || !row.pw || typeof password !== 'string' || V.pwHash(password) !== row.pw) fail('INVALID_CREDENTIALS');
  St.audit(row, 'STAFF_LOGIN', null, null, null, '');
  return json({ role: row.role, dept: row.dept || null, landing: St.ROLE_LANDING[row.role], username: row.username, name: row.name }, 200, newSession(ctx, row));
});
add('POST', '/api/auth/logout', ctx => {
  if (ctx.sid) S().sessions.delete(ctx.sid);
  return { status: 204, body: null, headers: { 'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0' } };
});
add('GET', '/api/me', ctx => {
  const u = need(ctx);
  const o = { username: u.username, name: u.name, role: u.role, dept: u.dept || null, registered: u.registered, landing: u.role === 'citizen' && !u.registered ? '/register' : St.ROLE_LANDING[u.role] };
  if (u.role === 'officer' || u.role === 'head') o.bellCount = St.notisOf(u.username).length;
  return json(o);
});

// ---------- fee / drafts ----------
add('GET', '/api/fee', ctx => {
  const q = ctx.query;
  return json({ fee: St.calcFee(q.get('serviceId'), q.get('qty') ?? undefined, q.get('areaSqm') ?? undefined) });
});
add('POST', '/api/drafts', ctx => {
  const u = need(ctx, 'citizen');
  const d = St.createDraft(u, ctx.body);
  return json({ draftId: d.id, fee: d.fee }, 201);
});
add('GET', '/api/drafts', ctx => {
  const u = need(ctx, 'citizen');
  return json({ items: [...S().drafts.values()].filter(d => d.owner === u.username && ['DRAFT', 'PENDING_PAYMENT'].includes(d.status)).map(d => ({ draftId: d.id, serviceId: d.sv, status: d.status, fee: d.fee })) });
});
add('GET', '/api/drafts/:id', ctx => json(St.draftView(St.ownDraft(need(ctx, 'citizen'), ctx.params.id))));
add('PUT', '/api/drafts/:id', ctx => {
  const d = St.ownDraft(need(ctx, 'citizen'), ctx.params.id);
  if (d.status !== 'DRAFT') fail('INVALID_STATE');
  const qty = d.sv === 'SV-01' ? (ctx.body.qty ?? d.qty) : null, area = d.sv === 'SV-03' ? (ctx.body.areaSqm ?? d.area) : null;
  d.fee = St.calcFee(d.sv, qty, area);
  if (d.sv === 'SV-01') d.qty = +qty; if (d.sv === 'SV-03') d.area = +area;
  return json(St.draftView(d));
});
add('DELETE', '/api/drafts/:id', ctx => { St.deleteDraft(St.ownDraft(need(ctx, 'citizen'), ctx.params.id)); return { status: 204, body: null }; });
add('POST', '/api/drafts/:id/files', ctx => {
  const d = St.ownDraft(need(ctx, 'citizen'), ctx.params.id);
  if (!['DRAFT', 'PENDING_PAYMENT'].includes(d.status)) fail('INVALID_STATE');
  const list = filesFrom(ctx, null);
  if (!list.length) fail('FILE_REQUIRED');
  const [f] = St.addDraftFiles(d, list.slice(0, 1).map(x => ({ ...x, docKey: x.docKey || 'extra' })));
  return json(St.fileView(f), 201);
});
add('DELETE', '/api/drafts/:id/files/:fileId', ctx => {
  const d = St.ownDraft(need(ctx, 'citizen'), ctx.params.id);
  if (!['DRAFT', 'PENDING_PAYMENT'].includes(d.status)) fail('INVALID_STATE');
  if (!d.files.includes(ctx.params.fileId)) fail('NOT_FOUND');
  d.files = d.files.filter(x => x !== ctx.params.fileId); S().files.delete(ctx.params.fileId);
  return { status: 204, body: null };
});
add('POST', '/api/drafts/:id/payment', ctx => {
  const d = St.ownDraft(need(ctx, 'citizen'), ctx.params.id);
  const p = St.createPayment(d);
  const v = St.payView(p);
  return json({ ref: p.ref, amount: p.amount, qrCreatedAt: v.qrCreatedAt, qrExpiresAt: v.qrExpiresAt }, 201);
});
add('GET', '/api/payments/:ref', ctx => {
  const u = need(ctx, 'citizen'); const p = S().payments.get(ctx.params.ref);
  if (!p || p.owner !== u.username) fail('NOT_FOUND');
  return json(St.payView(p));
});

// ---------- cases (citizen + staff view) ----------
add('GET', '/api/cases', ctx => {
  const u = need(ctx, 'citizen');
  const items = [...S().cases.values()].filter(c => c.owner === u.username).sort((a, b) => (a.no < b.no ? 1 : -1))
    .map(c => ({ caseNo: c.no, serviceId: c.sv, serviceName: St.SV_NAMES[c.sv], status: c.status, dueAt: T.iso(c.dueAt), slaLevel: St.level(c) }));
  return json({ items });
});
add('GET', '/api/cases/:no', ctx => {
  const u = need(ctx, 'citizen', 'officer', 'head');
  const c = u.role === 'citizen' && !T.bug('B06') ? ownCase(u, ctx.params.no) : (u.role === 'citizen' ? findCase(ctx.params.no) : staffCase(ctx.params.no));
  return json(St.caseView(c, u));
});
add('GET', '/api/cases/:no/files', ctx => {
  const u = need(ctx); const c = findCase(ctx.params.no);
  St.canSeeCaseFiles(c, u);
  return json({ items: c.files.map(id => St.fileView(S().files.get(id))) });
});
add('GET', '/api/files/:id', ctx => {
  const u = need(ctx); const f = S().files.get(ctx.params.id); if (!f) fail('NOT_FOUND');
  if (f.caseNo) St.canSeeCaseFiles(findCase(f.caseNo), u);
  else if (u.role !== 'citizen' || f.owner !== u.username) fail(u.role === 'citizen' ? 'NOT_FOUND' : 'FORBIDDEN');
  return raw(200, f.buf, { 'Content-Type': f.mime, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.name)}` });
});
add('POST', '/api/cases/:no/cancel', ctx => {
  const u = need(ctx, 'citizen'); return json(St.cancelCase(ownCase(u, ctx.params.no), u));
});
add('POST', '/api/cases/:no/resubmit', ctx => {
  const u = need(ctx, 'citizen'); const c = ownCase(u, ctx.params.no);
  const list = /multipart/i.test(ctx.req.headers['content-type'] || '') ? filesFrom(ctx, 'extra') : [];
  return json(St.resubmitCase(c, u, list));
});
add('GET', '/api/documents/:docNo/pdf', ctx => {
  const u = need(ctx, 'citizen', 'officer', 'head');
  const d = S().docs.get(ctx.params.docNo); if (!d) fail('NOT_FOUND');
  const c = findCase(d.caseNo);
  if (u.role === 'citizen' && c.owner !== u.username) fail('NOT_FOUND');
  const lines = [`DIGITAL DOCUMENT - ${d.sv}`, `docNo=${d.docNo} caseNo=${d.caseNo} verify=${d.code} validUntil=${d.validUntil}`,
    `issued ${d.issuedAt}`, `QR ${St.BASE_URL}/verify/${d.code}`, `sig ${d.sig.slice(0, 32)}`];
  return raw(200, makePdf(lines), { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${d.docNo}.pdf"` });
});

// ---------- officer / head ----------
add('GET', '/api/officer/queue', ctx => {
  const u = need(ctx, 'officer', 'head');
  const f = ctx.query.get('filter') || 'all';
  let list = [...S().cases.values()].filter(c => ['SUBMITTED', 'IN_REVIEW', 'APPROVED'].includes(c.status));
  if (u.role === 'officer') list = list.filter(c => c.dept === u.dept);
  if (f === 'unclaimed') list = list.filter(c => ['SUBMITTED', 'IN_REVIEW'].includes(c.status) && !c.holder);
  if (f === 'mine') list = list.filter(c => c.status === 'IN_REVIEW' && c.holder === u.username);
  list.sort(St.caseSort);
  const workload = u.role === 'officer' ? [...S().cases.values()].filter(c => c.status === 'IN_REVIEW' && c.holder === u.username).length : null;
  return json({ items: list.map(c => St.queueItem(c, u)), workload });
});
add('GET', '/api/head/approvals', ctx => {
  need(ctx, 'head');
  const list = [...S().cases.values()].filter(c => c.status === 'PENDING_APPROVAL').sort(St.caseSort);
  return json({ items: list.map(c => ({ caseNo: c.no, serviceId: c.sv, applicantName: c.name, dueAt: T.iso(c.dueAt), slaLevel: St.level(c) })) });
});
add('GET', '/api/notifications', ctx => {
  const u = need(ctx, 'officer', 'head');
  const items = St.notisOf(u.username).map(n => ({ id: n.id, caseNo: n.caseNo, level: n.level, text: n.text, createdAt: T.iso(n.createdAt) }));
  return json({ items, count: items.length });
});
add('POST', '/api/officer/cases/:no/claim', ctx => { const u = need(ctx, 'officer'); return json(St.claim(staffCase(ctx.params.no), u)); });
add('POST', '/api/officer/cases/:no/return', ctx => { const u = need(ctx, 'officer'); return json(St.returnCase(staffCase(ctx.params.no), u, ctx.body.reason)); });
add('POST', '/api/officer/cases/:no/forward', ctx => { const u = need(ctx, 'officer'); return json(St.forwardCase(staffCase(ctx.params.no), u, ctx.body.note)); });
add('POST', '/api/officer/cases/:no/issue', ctx => { const u = need(ctx, 'officer'); return json(St.issueDoc(staffCase(ctx.params.no), u)); });
add('POST', '/api/officer/cases/:no/unmask', ctx => { const u = need(ctx, 'officer', 'head'); return json(St.unmask(staffCase(ctx.params.no), u, ctx.body.reason)); });
add('POST', '/api/cases/:no/approve', ctx => { const u = need(ctx, 'officer', 'head'); return json(St.approveCase(staffCase(ctx.params.no), u)); });
add('POST', '/api/cases/:no/reject', ctx => { const u = need(ctx, 'officer', 'head'); return json(St.rejectCase(staffCase(ctx.params.no), u, ctx.body.reason)); });

// ---------- verify ----------
export function verifyCode(code) {
  const d = [...S().docs.values()].find(x => x.code === code);
  if (!d) return { http: 404, body: { result: 'NOT_FOUND' } };
  if (V.hmacSign(St.sigInput(d)) !== d.sig) return { http: 200, body: { result: 'TAMPERED' } };
  const today = T.dayStr(T.dayNum(T.nowMs()));
  return { http: 200, body: { result: today > d.validUntil ? 'EXPIRED' : 'VALID', docNo: d.docNo, applicantMasked: St.maskName(d.applicant), serviceId: d.sv, issuedAt: d.issuedAt, validUntil: d.validUntil, signer: d.signer } };
}
add('GET', '/api/verify/:code', ctx => { const r = verifyCode(ctx.params.code); return json(r.body, r.http); });

// ---------- dashboard / audit ----------
function dashParams(ctx) {
  const period = ctx.query.get('period') || T.iso(T.nowMs()).slice(0, 7), service = ctx.query.get('service') || 'ALL';
  if (!/^\d{4}(-(0[1-9]|1[0-2]))?$/.test(period)) fail('INVALID_PERIOD');
  if (!['ALL', 'SV-01', 'SV-02', 'SV-03'].includes(service)) fail('INVALID_SERVICE');
  return { period, service };
}
add('GET', '/api/dashboard', ctx => { need(ctx, 'executive'); const { period, service } = dashParams(ctx); return json(St.dashboard(period, service)); });
add('GET', '/api/dashboard/export', ctx => {
  const u = need(ctx, 'executive'); const { period, service } = dashParams(ctx);
  const format = ctx.query.get('format'); if (!['xlsx', 'pdf'].includes(format)) fail('BAD_REQUEST');
  const d = St.dashboard(period, service);
  const pct = d.ontimePct == null ? '–' : d.ontimePct.toFixed(1) + '%';
  St.audit(u, 'EXPORT', null, null, null, `${format} ${period} ${service}`);
  const fname = `dashboard-${period}-${service}.${format}`;
  if (format === 'xlsx') {
    const rows = [['ตัวชี้วัด', 'ค่า'], ['รับเรื่อง', String(d.received)], ['ปิดงาน', String(d.closed)], ['ทันกำหนด %', pct], ['งานคงค้าง', String(d.backlog)], ['เกินกำหนดคงค้าง', String(d.overdue)]];
    return raw(200, makeXlsx(rows), { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${fname}"` });
  }
  const lines = [`Dashboard report period=${period} service=${service}`, `kpi received=${d.received} closed=${d.closed} ontime=${d.ontimePct == null ? '-' : d.ontimePct.toFixed(1) + '%'} backlog=${d.backlog} overdue=${d.overdue}`];
  return raw(200, makePdf(lines), { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fname}"` });
});
function auditQuery(ctx) {
  const q = ctx.query, actor = q.get('actor') || '', ev = q.get('event') || '', from = q.get('from') || '', to = q.get('to') || '';
  for (const x of [from, to]) if (x && !T.validDateStr(x)) fail('INVALID_DATE');
  const lo = from ? T.msAt(T.dayFromStr(from), 0, 0, 0) : -Infinity, hi = to ? T.msAt(T.dayFromStr(to) + 1, 0, 0, 0) : Infinity;
  return S().audit.filter(a => (!actor || a.username === actor) && (!ev || a.event === ev) && a.at >= lo && a.at < hi).sort((a, b) => b.at - a.at || b.id - a.id);
}
add('GET', '/api/audit/events', ctx => { need(ctx, 'auditor'); return json({ items: St.EVENTS }); });
add('GET', '/api/audit/export.csv', ctx => {
  const u = need(ctx, 'auditor'); const list = auditQuery(ctx);
  const head = 'time,username,role,event,caseNo,fromStatus,toStatus,detail';
  const body = list.map(a => { const v = St.auditView(a); return [v.time, v.username, v.role, v.event, v.caseNo, v.fromStatus, v.toStatus, v.detail].map(csvCell).join(','); });
  St.audit(u, 'EXPORT', null, null, null, 'audit-csv');
  return raw(200, Buffer.from([head, ...body].join('\r\n') + '\r\n', 'utf8'), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="audit.csv"' });
});
add('GET', '/api/audit', ctx => { need(ctx, 'auditor'); const l = auditQuery(ctx); return json({ count: l.length, items: l.map(St.auditView) }); });

// ---------- admin ----------
const svcView = id => { const c = S().services[id]; return { id, name: St.SV_NAMES[id], fee: c.fee ?? c.feeBase, feePerSqm: c.feePerSqm ?? null, feeBase: c.feeBase ?? null, sla: c.sla }; };
add('GET', '/api/admin/services', ctx => { need(ctx, 'admin'); return json({ items: Object.keys(S().services).map(svcView) }); });
add('PUT', '/api/admin/services/:id', ctx => {
  const u = need(ctx, 'admin'); const id = ctx.params.id, c = S().services[id]; if (!c) fail('NOT_FOUND');
  const b = ctx.body, ok = (v, lo, hi) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
  const changes = [];
  const feeKeys = id === 'SV-03' ? ['feeBase', 'feePerSqm'] : ['fee'];
  const src = { ...b }; if (id === 'SV-03' && src.fee !== undefined && src.feeBase === undefined) src.feeBase = src.fee;
  for (const k of feeKeys) if (src[k] !== undefined) { if (!ok(src[k], 0, 100000)) fail('INVALID_FEE'); changes.push([k, src[k]]); }
  if (b.sla !== undefined) { if (!ok(b.sla, 1, 60)) fail('INVALID_SLA'); changes.push(['sla', b.sla]); }
  for (const [k, v] of changes) { if (c[k] !== v) { St.audit(u, 'ADMIN_CHANGE', null, null, null, `${id} ${k === 'feeBase' ? 'fee' : k} ${c[k]} → ${v}`); c[k] = v; } }
  return json(svcView(id));
});
add('GET', '/api/admin/holidays', ctx => { need(ctx, 'admin'); return json({ items: [...T.holidays].sort().map(([date, name]) => ({ date, name })) }); });
add('POST', '/api/admin/holidays', ctx => {
  const u = need(ctx, 'admin'); const { date, name } = ctx.body;
  if (!T.validDateStr(date)) fail('INVALID_DATE');
  if (T.holidays.has(date)) fail('DUPLICATE_HOLIDAY');
  T.holidays.set(date, typeof name === 'string' ? name : '');
  St.audit(u, 'ADMIN_CHANGE', null, null, null, `holiday add ${date}`);
  return json({ date, name: T.holidays.get(date) }, 201);
});
add('DELETE', '/api/admin/holidays/:date', ctx => {
  const u = need(ctx, 'admin'); const d = ctx.params.date;
  if (!T.holidays.has(d)) fail('NOT_FOUND');
  T.holidays.delete(d); St.audit(u, 'ADMIN_CHANGE', null, null, null, `holiday delete ${d}`);
  return json({ ok: true });
});
add('GET', '/api/admin/users', ctx => { need(ctx, 'admin'); return json({ items: V.allUsers().filter(x => x.role !== 'citizen').map(x => ({ username: x.username, name: x.name, role: x.role, dept: x.dept || '' })) }); });
add('PUT', '/api/admin/users/:username', ctx => {
  const u = need(ctx, 'admin'); const un = ctx.params.username;
  if (un === u.username) fail('SELF_ROLE_CHANGE');
  const row = V.getUser(un); if (!row || row.role === 'citizen') fail('NOT_FOUND');
  const { role, dept } = ctx.body;
  if (role !== undefined && !Object.keys(St.ROLE_LANDING).includes(role)) fail('INVALID_ROLE');
  if (dept !== undefined && !['', 'registry', 'works', null].includes(dept)) fail('BAD_REQUEST');
  if (role !== undefined && role !== row.role) { St.audit(u, 'ADMIN_CHANGE', null, null, null, `${un} role ${row.role} → ${role}`); row.role = role; }
  if (dept !== undefined && (dept || null) !== (row.dept || null)) { St.audit(u, 'ADMIN_CHANGE', null, null, null, `${un} dept ${row.dept || '-'} → ${dept || '-'}`); row.dept = dept || null; }
  V.putUser(row);
  return json({ username: un, name: row.name, role: row.role, dept: row.dept || '' });
});

// ---------- health / test hooks ----------
add('GET', '/api/health', () => json({ status: 'ok' }));
add('POST', '/api/test/reset', () => { St.seed(); return json({ ok: true, now: T.iso(T.nowMs()) }, 200, { 'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0' }); });
add('GET', '/api/test/clock', () => json({ now: T.iso(T.nowMs()) }));
add('PUT', '/api/test/clock', ctx => {
  const t = T.parseIso(ctx.body.now); if (t == null) fail('INVALID_TIME');
  T.clock.now = t; return json({ now: T.iso(t) });
});
add('POST', '/api/test/payments/:ref/pay', ctx => json(St.payCallback(ctx.params.ref, typeof ctx.body.amount === 'string' ? Number(ctx.body.amount) : ctx.body.amount)));
add('POST', '/api/test/documents/:docNo/tamper', ctx => {
  const d = S().docs.get(ctx.params.docNo); if (!d) fail('NOT_FOUND');
  d.applicant = d.applicant + ' (แก้ไข)'; return json({ ok: true });
});

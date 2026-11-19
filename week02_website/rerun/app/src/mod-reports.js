'use strict';
// B07: Dashboard (FR-22) · ส่งออก xlsx/pdf (FR-23) · Audit Trail อ่านอย่างเดียว + CSV (FR-24) · Admin บริการ/วันหยุด/ผู้ใช้ (FR-25..27)
// xlsx = zip แบบ store เขียนเอง (OOXML ขั้นต่ำ) · pdf = เขียนเอง (ใช้ simplePdf ของ mod-cases) · ไม่มีไลบรารีภายนอก
const zlib = require('node:zlib');

const SERVICES = ['SV-01', 'SV-02', 'SV-03'];
const ROLES = ['citizen', 'officer', 'head', 'executive', 'auditor', 'admin'];
const DEPTS = ['', 'registry', 'works'];
const BACKLOG = ['SUBMITTED', 'IN_REVIEW', 'NEED_FIX', 'PENDING_APPROVAL', 'APPROVED'];
const DASH = '–'; // en dash U+2013
const MSG = {
  fee: 'ค่าธรรมเนียมต้องเป็นจำนวนเต็ม 0–100,000 บาท',
  sla: 'SLA ต้องเป็นจำนวนเต็ม 1–60 วันทำการ',
  dup: 'มีวันหยุดนี้อยู่แล้ว',
  self: 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้',
  notFound: 'ไม่พบข้อมูล',
};
const E = (status, code, message) => ({ status, code, message });

// ---------- zip (store) + xlsx ----------
function zipStore(entries) {
  const parts = []; const central = []; let off = 0;
  for (const [name, data] of entries) {
    const nb = Buffer.from(name, 'utf8'); const db = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const crc = zlib.crc32(db);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc >>> 0, 14);
    lh.writeUInt32LE(db.length, 18); lh.writeUInt32LE(db.length, 22); lh.writeUInt16LE(nb.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, nb, db);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc >>> 0, 16);
    ch.writeUInt32LE(db.length, 20); ch.writeUInt32LE(db.length, 24); ch.writeUInt16LE(nb.length, 28);
    ch.writeUInt32LE(off, 42);
    central.push(ch, nb);
    off += 30 + nb.length + db.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}
const xe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function xlsx(rows) {
  const strs = []; const idx = new Map();
  const si = (s) => { if (!idx.has(s)) { idx.set(s, strs.length); strs.push(s); } return idx.get(s); };
  const sheetRows = rows.map((r, i) => `<row r="${i + 1}">` + r.map((v, j) => `<c r="${'AB'[j]}${i + 1}" t="s"><v>${si(v)}</v></c>`).join('') + '</row>').join('');
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zipStore([
    ['[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dashboard" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'],
    ['xl/sharedStrings.xml', X + `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strs.length}" uniqueCount="${strs.length}">` + strs.map((s) => `<si><t xml:space="preserve">${xe(s)}</t></si>`).join('') + '</sst>'],
    ['xl/worksheets/sheet1.xml', X + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`],
  ]);
}

exports.register = function register(router, ctx) {
  const { clock, store } = ctx;
  const mem = () => store.mem;
  const wrap = (fn) => async (req, res) => {
    try { return await fn(req, res); } catch (e) {
      if (e && e.status && e.code) return ctx.err(res, e.status, e.code, e.message);
      throw e;
    }
  };
  const isInt = (v) => (typeof v === 'number' && Number.isInteger(v)) || (typeof v === 'string' && /^-?\d+$/.test(v.trim()));
  const toInt = (v) => (typeof v === 'number' ? v : parseInt(v, 10));

  // ---------- Dashboard ----------
  function parseQuery(req) {
    const p = clock.parts(clock.nowMs());
    const period = req.query.period || `${p.y}-${String(p.m).padStart(2, '0')}`;
    const service = req.query.service || 'ALL';
    if (!/^\d{4}(-(0[1-9]|1[0-2]))?$/.test(period)) throw E(400, 'INVALID_PERIOD', 'ช่วงเวลาไม่ถูกต้อง');
    if (service !== 'ALL' && !SERVICES.includes(service)) throw E(400, 'INVALID_SERVICE', 'ไม่พบบริการ');
    return { period, service };
  }
  function inPeriod(t, period) {
    if (t == null) return false;
    const q = clock.parts(t);
    if (period.length === 4) return String(q.y) === period;
    return `${q.y}-${String(q.m).padStart(2, '0')}` === period;
  }
  function compute(period, service) {
    const now = clock.nowMs();
    const all = [...mem().cases.values()].filter((c) => service === 'ALL' || c.serviceId === service);
    const received = all.filter((c) => inPeriod(c.paidAtMs, period)).length;
    const closedList = all.filter((c) => (c.status === 'COMPLETED' || c.status === 'REJECTED') && inPeriod(c.closedAtMs, period));
    const closed = closedList.length;
    const onTime = closedList.filter((c) => c.closedAtMs <= c.dueAtMs).length;
    let ontimePct = null;
    if (ctx.bug('B10')) ontimePct = received ? Math.round((onTime / received) * 1000) / 10 : 0;
    else if (closed) ontimePct = Math.floor((onTime * 2000 + closed) / (2 * closed)) / 10; // ปัดครึ่งขึ้น 1 ตำแหน่ง ทศนิยมแม่นยำด้วยเลขจำนวนเต็ม
    const open = all.filter((c) => BACKLOG.includes(c.status));
    const overdue = open.filter((c) => c.status !== 'NEED_FIX' && now > c.dueAtMs).length;
    const workload = store.users.list().filter((u) => u.role === 'officer').map((u) => ({
      username: u.username,
      count: [...mem().cases.values()].filter((c) => c.status === 'IN_REVIEW' && c.owner === u.username).length,
    }));
    return { received, closed, onTime, ontimePct, backlog: open.length, overdue, workload };
  }
  const pctText = (v) => (v == null ? DASH : v.toFixed(1) + '%');

  router.add('GET', '/api/dashboard/export', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['executive']); if (!u) return;
    const { period, service } = parseQuery(req);
    const format = req.query.format;
    if (format !== 'xlsx' && format !== 'pdf') throw E(400, 'INVALID_FORMAT', 'รูปแบบไฟล์ไม่ถูกต้อง');
    const d = compute(period, service);
    ctx.audit.add({ username: u.username, role: u.role, event: 'EXPORT', detail: `${format} ${period} ${service}` });
    const fname = `dashboard-${period}-${service}.${format}`;
    if (format === 'xlsx') {
      const buf = xlsx([
        ['ตัวชี้วัด', 'ค่า'],
        ['รับเรื่อง', String(d.received)], ['ปิดงาน', String(d.closed)], ['ทันกำหนด %', pctText(d.ontimePct)],
        ['งานคงค้าง', String(d.backlog)], ['เกินกำหนดคงค้าง', String(d.overdue)],
      ]);
      return ctx.send(res, 200, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { 'Content-Disposition': `attachment; filename="${fname}"` });
    }
    const { simplePdf } = require('./mod-cases');
    const lines = [
      'e-Service Dashboard Report (simulated)',
      `period=${period} service=${service}`,
      '',
      `kpi received=${d.received} closed=${d.closed} ontime=${d.ontimePct == null ? '-' : d.ontimePct.toFixed(1) + '%'} backlog=${d.backlog} overdue=${d.overdue}`,
    ];
    const info = { Title: `รายงาน Dashboard ${period} ${service}`, Subject: `รับเรื่อง ${d.received} · ปิดงาน ${d.closed} · ทันกำหนด ${pctText(d.ontimePct)} · งานคงค้าง ${d.backlog} · เกินกำหนดคงค้าง ${d.overdue}` };
    ctx.send(res, 200, simplePdf(lines, info), 'application/pdf', { 'Content-Disposition': `attachment; filename="${fname}"` });
  }));
  router.add('GET', '/api/dashboard', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['executive']); if (!u) return;
    const { period, service } = parseQuery(req);
    const d = compute(period, service);
    ctx.json(res, 200, { period, service, received: d.received, closed: d.closed, onTime: d.onTime, ontimePct: d.ontimePct, backlog: d.backlog, overdue: d.overdue, workload: d.workload });
  }));

  // ---------- Audit (อ่านอย่างเดียว) ----------
  function auditRows(req) {
    const q = req.query;
    const okDate = (s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (!okDate(q.from) || !okDate(q.to)) throw E(400, 'INVALID_DATE', 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    const rows = ctx.audit.all().filter((a) => {
      if (q.actor && a.username !== q.actor) return false;
      if (q.event && a.event !== q.event) return false;
      const d = clock.dateStr(a.timeMs); // ตามเวลาไทย รวมวันเริ่มและวันจบ
      if (q.from && d < q.from) return false;
      if (q.to && d > q.to) return false;
      return true;
    });
    return rows.slice().sort((a, b) => (b.timeMs - a.timeMs) || (b.id - a.id));
  }
  router.add('GET', '/api/audit/export.csv', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['auditor']); if (!u) return;
    const rows = auditRows(req);
    const cell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const out = ['time,username,role,event,caseNo,fromStatus,toStatus,detail']
      .concat(rows.map((a) => [a.time, a.username, a.role, a.event, a.caseNo, a.fromStatus, a.toStatus, a.detail].map(cell).join(',')));
    ctx.audit.add({ username: u.username, role: u.role, event: 'EXPORT', detail: 'audit-csv' });
    ctx.send(res, 200, out.join('\r\n') + '\r\n', 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="audit.csv"' });
  }));
  router.add('GET', '/api/audit', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['auditor']); if (!u) return;
    const rows = auditRows(req);
    ctx.json(res, 200, { count: rows.length, items: rows.map((a) => ({ id: a.id, time: a.time, username: a.username, role: a.role, event: a.event, caseNo: a.caseNo, fromStatus: a.fromStatus, toStatus: a.toStatus, detail: a.detail })) });
  }));
  const noWrite = (req, res) => ctx.err(res, 405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
  router.add('*', '/api/audit', noWrite);
  router.add('*', '/api/audit/:id', noWrite);

  // ---------- Admin ----------
  const admin = (req, res) => ctx.requireRole(req, res, ['admin']);
  const svView = (s) => ({ id: s.id, fee: s.fee, feeBase: s.feeBase, feePerSqm: s.feePerSqm, sla: s.sla });
  const auditAdmin = (u, detail) => ctx.audit.add({ username: u.username, role: u.role, event: 'ADMIN_CHANGE', detail });

  router.add('GET', '/api/admin/services', wrap((req, res) => {
    if (!admin(req, res)) return;
    ctx.json(res, 200, { items: SERVICES.map((id) => svView(mem().services[id])) });
  }));
  router.add('PUT', '/api/admin/services/:id', wrap((req, res) => {
    const u = admin(req, res); if (!u) return;
    const sv = mem().services[req.params.id];
    if (!sv) throw E(404, 'NOT_FOUND', MSG.notFound);
    const b = req.body || {};
    const feeKeys = ['fee', 'feeBase', 'feePerSqm'].filter((k) => b[k] !== undefined);
    const changes = [];
    for (const k of feeKeys) {
      if (!isInt(b[k])) throw E(400, 'INVALID_FEE', MSG.fee);
      const n = toInt(b[k]);
      if (n < 0 || n > 100000) throw E(400, 'INVALID_FEE', MSG.fee);
      changes.push([k, n]);
    }
    if (b.sla !== undefined) {
      if (!isInt(b.sla)) throw E(400, 'INVALID_SLA', MSG.sla);
      const n = toInt(b.sla);
      if (n < 1 || n > 60) throw E(400, 'INVALID_SLA', MSG.sla);
      changes.push(['sla', n]);
    }
    if (!changes.length) throw E(400, 'INVALID_FEE', MSG.fee);
    for (const [k, n] of changes) {
      if (sv[k] === n) continue;
      auditAdmin(u, `${sv.id} ${k} ${sv[k]} → ${n}`);
      sv[k] = n;
    }
    ctx.json(res, 200, svView(sv));
  }));

  const validDate = (s) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };
  router.add('GET', '/api/admin/holidays', wrap((req, res) => {
    if (!admin(req, res)) return;
    ctx.json(res, 200, { items: mem().holidays.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map((h) => ({ date: h.date, name: h.name })) });
  }));
  router.add('POST', '/api/admin/holidays', wrap((req, res) => {
    const u = admin(req, res); if (!u) return;
    const b = req.body || {};
    if (!validDate(b.date)) throw E(400, 'INVALID_DATE', 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    if (mem().holidays.some((h) => h.date === b.date)) throw E(409, 'DUPLICATE_HOLIDAY', MSG.dup);
    const h = { date: b.date, name: typeof b.name === 'string' ? b.name.trim() : '' };
    mem().holidays.push(h);
    mem().holidays.sort((a, c) => (a.date < c.date ? -1 : 1));
    auditAdmin(u, `holiday add ${h.date}`);
    ctx.json(res, 201, { date: h.date, name: h.name });
  }));
  router.add('DELETE', '/api/admin/holidays/:date', wrap((req, res) => {
    const u = admin(req, res); if (!u) return;
    const i = mem().holidays.findIndex((h) => h.date === req.params.date);
    if (i < 0) throw E(404, 'NOT_FOUND', MSG.notFound);
    mem().holidays.splice(i, 1);
    auditAdmin(u, `holiday delete ${req.params.date}`);
    ctx.json(res, 200, { ok: true });
  }));

  router.add('GET', '/api/admin/users', wrap((req, res) => {
    if (!admin(req, res)) return;
    ctx.json(res, 200, { items: store.users.list().map((x) => ({ username: x.username, name: x.name, role: x.role, dept: x.dept })) });
  }));
  router.add('PUT', '/api/admin/users/:username', wrap((req, res) => {
    const u = admin(req, res); if (!u) return;
    const target = store.users.get(req.params.username);
    if (!target) throw E(404, 'NOT_FOUND', MSG.notFound);
    if (target.username === u.username) throw E(409, 'SELF_ROLE_CHANGE', MSG.self);
    const b = req.body || {};
    const role = b.role === undefined ? target.role : b.role;
    const dept = b.dept === undefined ? target.dept : (b.dept == null ? '' : b.dept);
    if (!ROLES.includes(role)) throw E(400, 'INVALID_ROLE', 'บทบาทไม่ถูกต้อง');
    if (!DEPTS.includes(dept)) throw E(400, 'INVALID_DEPT', 'แผนกไม่ถูกต้อง');
    if (role !== target.role) auditAdmin(u, `${target.username} role ${target.role} → ${role}`);
    if (dept !== target.dept) auditAdmin(u, `${target.username} dept ${target.dept || '-'} → ${dept || '-'}`);
    const nu = store.users.setRole(target.username, role, dept);
    ctx.json(res, 200, { username: nu.username, name: nu.name, role: nu.role, dept: nu.dept });
  }));
};

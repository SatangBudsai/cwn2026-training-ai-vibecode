'use strict';
/**
 * reports.js — B07: Dashboard + Audit + Admin
 *   GET  /api/dashboard · /api/dashboard/export (xlsx|pdf) · GET /api/audit · /api/audit/export.csv
 *   PUT/PATCH/DELETE/POST /api/audit[/:id] → 405 · /api/admin/{services,holidays,users}
 * BUG B10: ทันกำหนด % หารด้วย "รับเรื่อง" แทน "ปิดงาน" (BR-25)
 */
const zlib = require('zlib');
const store = require('./store');
const time = require('./time');
const sla = require('./sla');

const PENDING = ['SUBMITTED', 'IN_REVIEW', 'NEED_FIX', 'PENDING_APPROVAL', 'APPROVED'];
const ROLES = ['citizen', 'officer', 'head', 'executive', 'auditor', 'admin'];
const SERVICE_IDS = ['SV-01', 'SV-02', 'SV-03'];

/* ---------- Dashboard ---------- */
function periodOf(q) {
  const p = String(q || '').trim() || time.dateKey(time.nowIso()).slice(0, 7);
  if (/^\d{4}$/.test(p)) return { key: p, test: (iso) => time.dateKey(iso).slice(0, 4) === p };
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(p)) return { key: p, test: (iso) => time.dateKey(iso).slice(0, 7) === p };
  store.fail('BAD_REQUEST');
  return null;
}

/** ปัดครึ่งขึ้น 1 ตำแหน่ง ด้วยจำนวนเต็ม (ไม่พึ่ง float) */
function pct1(num, den) {
  return Math.floor((num * 2000 + den) / (2 * den)) / 10;
}

function computeKpi(periodQ, serviceQ) {
  const period = periodOf(periodQ);
  const service = SERVICE_IDS.includes(serviceQ) ? serviceQ : 'ALL';
  const now = time.nowIso();
  const cases = store.state.cases.filter((c) => c.caseNo && (service === 'ALL' || c.serviceId === service));
  const received = cases.filter((c) => c.paidAt && period.test(c.paidAt)).length;
  const closedCases = cases.filter((c) => (c.status === 'COMPLETED' || c.status === 'REJECTED') && c.closedAt && period.test(c.closedAt));
  const closed = closedCases.length;
  const onTime = closedCases.filter((c) => sla.isOnTime(c) === true).length;
  const open = store.state.cases.filter((c) => c.caseNo && (service === 'ALL' || c.serviceId === service) && PENDING.includes(c.status));
  const backlog = open.length;
  const overdue = open.filter((c) => c.status !== 'NEED_FIX' && sla.isOverdue(c, now)).length;
  let ontimePct;
  if (store.bug('B10')) ontimePct = received > 0 ? pct1(onTime, received) : null;   // BUG B10: หารด้วยรับเรื่อง
  else ontimePct = closed > 0 ? pct1(onTime, closed) : null;
  const workload = store.state.users.filter((u) => u.role === 'officer' && u.active !== false)
    .map((u) => ({ username: u.username, count: store.state.cases.filter((c) => c.status === 'IN_REVIEW' && c.owner === u.username).length }));
  return { period: period.key, service, received, closed, onTime, ontimePct, backlog, overdue, workload };
}
const pctText = (v) => (v === null || v === undefined ? '–' : `${v.toFixed(1)}%`);

/* ---------- xlsx (zip แบบ store ไม่บีบอัด) ---------- */
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function zip(files) {
  const parts = []; const central = []; let off = 0;
  for (const [name, content] of files) {
    const nb = Buffer.from(name); const data = Buffer.from(content, 'utf8'); const crc = zlib.crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8);
    h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, nb, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10); c.writeUInt16LE(0, 12); c.writeUInt16LE(0x21, 14); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28);
    c.writeUInt32LE(off, 42);
    central.push(c, nb);
    off += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(central);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
function makeXlsx(rows) {
  const cell = (ref, v) => `<c r="${ref}" t="inlineStr"><is><t>${xmlEsc(v)}</t></is></c>`;
  const sheetRows = rows.map((r, i) => `<row r="${i + 1}">${cell(`A${i + 1}`, r[0])}${cell(`B${i + 1}`, r[1])}</row>`).join('');
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zip([
    ['[Content_Types].xml', `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
    ['_rels/.rels', `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dashboard" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ['xl/worksheets/sheet1.xml', `${H}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`],
  ]);
}

/* ---------- Audit ---------- */
function filterAudit(q) {
  const actor = String(q.actor || '').trim(); const event = String(q.event || '').trim();
  const from = String(q.from || '').trim(); const to = String(q.to || '').trim();
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if ((from && !dateRe.test(from)) || (to && !dateRe.test(to))) store.fail('BAD_REQUEST');
  const items = store.state.audit.filter((a) => {
    if (actor && a.username !== actor) return false;
    if (event && a.event !== event) return false;
    const d = time.dateKey(a.time);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
  items.sort((a, b) => (time.toMs(b.time) - time.toMs(a.time)) || (b.id - a.id));
  return items.map((a) => ({ id: a.id, time: a.time, username: a.username, role: a.role, event: a.event, caseNo: a.caseNo, fromStatus: a.fromStatus, toStatus: a.toStatus, detail: a.detail }));
}
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/* ---------- Admin ---------- */
const isIntIn = (v, lo, hi) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi
  || (typeof v === 'string' && /^\d+$/.test(v.trim()) && Number(v) >= lo && Number(v) <= hi);
const svcView = (s) => ({ id: s.id, name: s.name, fee: s.fee, feeBase: s.feeBase === undefined ? null : s.feeBase, feePerSqm: s.feePerSqm === undefined ? null : s.feePerSqm, sla: s.sla });
const adminAudit = (u, detail) => store.addAudit({ username: u.username, role: u.role, event: 'ADMIN_CHANGE', detail });

function register(app) {
  const exec = { roles: ['executive'] };
  const aud = { roles: ['auditor'] };
  const adm = { roles: ['admin'] };

  app.get('/api/dashboard', exec, (req) => {
    const k = computeKpi(req.query.period, req.query.service);
    return { period: k.period, service: k.service, received: k.received, closed: k.closed, onTime: k.onTime, ontimePct: k.ontimePct, backlog: k.backlog, overdue: k.overdue, workload: k.workload };
  });

  app.get('/api/dashboard/export', exec, (req, res) => {
    const format = String(req.query.format || '').toLowerCase();
    if (format !== 'xlsx' && format !== 'pdf') store.fail('BAD_REQUEST');
    const k = computeKpi(req.query.period, req.query.service);
    // ไม่มีข้อมูลส่วนบุคคล: ใช้เฉพาะตัวเลขรวม
    store.addAudit({ username: req.user.username, role: req.user.role, event: 'EXPORT', detail: `dashboard-${format} ${k.period} ${k.service}` });
    const stamp = k.period;
    if (format === 'xlsx') {
      const rows = [['ตัวชี้วัด', 'ค่า'], ['รับเรื่อง', String(k.received)], ['ปิดงาน', String(k.closed)], ['ทันกำหนด %', pctText(k.ontimePct)], ['งานคงค้าง', String(k.backlog)], ['เกินกำหนดคงค้าง', String(k.overdue)]];
      return res.send(200, makeXlsx(rows), {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="dashboard-${stamp}.xlsx"`, 'Cache-Control': 'no-store',
      });
    }
    const ont = k.ontimePct === null ? '-' : `${k.ontimePct.toFixed(1)}%`;
    const pdf = store.makePdf([
      'e-Service Dashboard', `period=${k.period} service=${k.service}`,
      `kpi received=${k.received} closed=${k.closed} ontime=${ont} backlog=${k.backlog} overdue=${k.overdue}`,
    ], { extraText: `ตัวชี้วัด รับเรื่อง ${k.received} ปิดงาน ${k.closed} ทันกำหนด ${pctText(k.ontimePct)} งานคงค้าง ${k.backlog} เกินกำหนดคงค้าง ${k.overdue}` });
    return res.send(200, pdf, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="dashboard-${stamp}.pdf"`, 'Cache-Control': 'no-store' });
  });

  app.get('/api/audit', aud, (req) => { const items = filterAudit(req.query); return { count: items.length, items }; });

  app.get('/api/audit/export.csv', aud, (req, res) => {
    const items = filterAudit(req.query);
    store.addAudit({ username: req.user.username, role: req.user.role, event: 'EXPORT', detail: 'audit-csv' });
    const lines = ['time,username,role,event,caseNo,fromStatus,toStatus,detail'];
    for (const a of items) lines.push([a.time, a.username, a.role, a.event, a.caseNo, a.fromStatus, a.toStatus, a.detail].map(csvCell).join(','));
    res.send(200, Buffer.from(`${lines.join('\n')}\n`, 'utf8'), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="audit.csv"', 'Cache-Control': 'no-store' });
  });

  // Audit เพิ่มได้อย่างเดียว: แก้/ลบ → 405 ทุกบทบาท (แม้ :id ไม่มีจริง)
  for (const m of ['put', 'patch', 'delete', 'post']) {
    app[m]('/api/audit', () => store.fail('METHOD_NOT_ALLOWED'));
    app[m]('/api/audit/:id', () => store.fail('METHOD_NOT_ALLOWED'));
  }

  app.get('/api/admin/services', adm, () => ({ items: store.state.services.map(svcView) }));
  app.put('/api/admin/services/:id', adm, (req) => {
    const s = store.getService(req.params.id);
    if (!s) store.fail('NOT_FOUND');
    const b = req.body || {};
    const isSv3 = s.id === 'SV-03';
    const next = {};
    const feeIn = isSv3 ? (b.feeBase !== undefined ? b.feeBase : b.fee) : b.fee;
    if (feeIn !== undefined) { if (!isIntIn(feeIn, 0, 100000)) store.fail('INVALID_FEE'); next.fee = Number(feeIn); }
    if (isSv3 && b.feePerSqm !== undefined) { if (!isIntIn(b.feePerSqm, 0, 100000)) store.fail('INVALID_FEE'); next.feePerSqm = Number(b.feePerSqm); }
    if (b.sla !== undefined) { if (!isIntIn(b.sla, 1, 60)) store.fail('INVALID_SLA'); next.sla = Number(b.sla); }
    const changes = [];
    if (next.fee !== undefined && next.fee !== (isSv3 ? (s.feeBase !== undefined ? s.feeBase : s.fee) : s.fee)) {
      changes.push(`${s.id} ${isSv3 ? 'feeBase' : 'fee'} ${isSv3 && s.feeBase !== undefined ? s.feeBase : s.fee} → ${next.fee}`);
    }
    if (next.feePerSqm !== undefined && next.feePerSqm !== s.feePerSqm) changes.push(`${s.id} feePerSqm ${s.feePerSqm} → ${next.feePerSqm}`);
    if (next.sla !== undefined && next.sla !== s.sla) changes.push(`${s.id} sla ${s.sla} → ${next.sla}`);
    if (next.fee !== undefined) { s.fee = next.fee; if (isSv3) s.feeBase = next.fee; }   // drafts.js อ่าน feeBase ของ SV-03
    if (next.feePerSqm !== undefined) s.feePerSqm = next.feePerSqm;
    if (next.sla !== undefined) s.sla = next.sla;
    adminAudit(req.user, changes.length ? changes.join('; ') : `${s.id} no change`);
    return svcView(s);
  });

  app.get('/api/admin/holidays', adm, () => ({ items: store.state.holidays.slice().sort((a, b) => a.date.localeCompare(b.date)) }));
  app.post('/api/admin/holidays', adm, (req, res) => {
    const b = req.body || {};
    const date = String(b.date || '').trim(); const name = String(b.name || '').trim();
    const ms = /^\d{4}-\d{2}-\d{2}$/.test(date) ? time.toMs(time.fromDateKey(date)) : NaN;
    if (!Number.isFinite(ms) || time.dateKey(ms) !== date || !name) store.fail('BAD_REQUEST');
    if (store.isHoliday(date)) store.fail('DUPLICATE_HOLIDAY');
    store.state.holidays.push({ date, name });
    adminAudit(req.user, `holiday add ${date} ${name}`);
    return res.json(201, { date, name });
  });
  app.delete('/api/admin/holidays/:date', adm, (req) => {
    const i = store.state.holidays.findIndex((h) => h.date === req.params.date);
    if (i < 0) store.fail('NOT_FOUND');
    const [h] = store.state.holidays.splice(i, 1);
    adminAudit(req.user, `holiday delete ${h.date} ${h.name}`);
    return { ok: true, date: h.date };
  });

  const userView = (u) => ({ username: u.username, name: u.name, role: u.role, dept: u.dept || '' });
  app.get('/api/admin/users', adm, () => ({ items: store.state.users.filter((u) => u.role !== 'citizen').map(userView) }));
  app.put('/api/admin/users/:username', adm, (req) => {
    const u = store.findUser(req.params.username);
    if (!u) store.fail('NOT_FOUND');
    const b = req.body || {};
    if (u.username === req.user.username) store.fail('SELF_ROLE_CHANGE');
    const role = b.role === undefined ? u.role : String(b.role);
    const dept = b.dept === undefined ? (u.dept || '') : String(b.dept || '');
    if (!ROLES.includes(role) || !['', 'registry', 'works'].includes(dept)) store.fail('BAD_REQUEST');
    const changes = [];
    if (role !== u.role) changes.push(`${u.username} role ${u.role} → ${role}`);
    if (dept !== (u.dept || '')) changes.push(`${u.username} dept ${u.dept || '-'} → ${dept || '-'}`);
    u.role = role; u.dept = dept || null;
    adminAudit(req.user, changes.length ? changes.join('; ') : `${u.username} no change`);
    return userView(u);
  });
}

module.exports = { register, computeKpi, makeXlsx, pct1 };

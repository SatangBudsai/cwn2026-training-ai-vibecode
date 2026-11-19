'use strict';
// B05: คำขอ / workflow / คิว / เอกสารดิจิทัล / verify / ไฟล์แนบของเจ้าหน้าที่ / seed คำขอ 30 ใบ
// FR-09..FR-18, FR-29 · BR-13 BR-16..BR-23 BR-29 · อ้าง ctx.sla / ctx.vault / ctx.notify ตอนเรียกใช้เท่านั้น
const crypto = require('node:crypto');

const DOC_KEY = 'rerun-test-doc-signing-key'; // คีย์ทดสอบ (A-22)
const MAX_FILE = 5242880;
const MAX_FILES = 5;
const FIX_MS = 168 * 3600 * 1000;
const CLOSED = ['COMPLETED', 'REJECTED', 'CANCELLED'];
const BACKLOG = ['SUBMITTED', 'IN_REVIEW', 'NEED_FIX', 'PENDING_APPROVAL', 'APPROVED'];
const SV_NAME = { 'SV-01': 'ขอหนังสือรับรอง', 'SV-02': 'ขออนุญาตประกอบกิจการ', 'SV-03': 'ขออนุญาตก่อสร้าง/ต่อเติมอาคาร' };
const SV_DOCS = { 'SV-01': ['id-card'], 'SV-02': ['id-card', 'map'], 'SV-03': ['id-card', 'plan', 'deed'] };
const MSG = {
  notFound: 'ไม่พบคำขอ',
  state: 'สถานะคำขอไม่ถูกต้องสำหรับรายการนี้',
  forbidden: 'ไม่มีสิทธิ์ทำรายการนี้',
  cannotCancel: 'ยกเลิกไม่ได้ คำขอมีเจ้าหน้าที่รับเรื่องแล้ว',
  fixExpired: 'หมดเวลาแก้ไขแล้ว คำขอถูกยกเลิก',
  claimed: 'มีเจ้าหน้าที่รับเรื่องนี้แล้ว',
  workload: 'รับงานได้สูงสุด 10 เรื่อง',
  returnLimit: 'ตีกลับได้สูงสุด 2 ครั้ง',
  reason: 'กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร',
  big: 'ไฟล์ใหญ่เกิน 5 MB',
  type: 'รองรับเฉพาะไฟล์ PDF, JPG, PNG',
  count: 'แนบได้สูงสุด 5 ไฟล์ต่อคำขอ',
};
const pad = (n, w) => String(n).padStart(w, '0');
const E = (status, code, message, extra) => Object.assign({ status, code, message }, extra || {});
const ms = (iso) => Date.parse(iso);

function sniff(buf) {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return { mime: 'application/pdf' };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg' };
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: 'image/png' };
  return null;
}
const tinyPdf = (label) => Buffer.from(`%PDF-1.4\n% ${label}\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`);

// ---------- PDF เขียนเอง (ไม่ใช้ไลบรารี): ข้อความ ASCII ใน content stream + ข้อมูลไทยใน /Info (UTF-16BE) ----------
function pdfHex(str) {
  const b = Buffer.from(String(str), 'utf16le').swap16();
  return '<FEFF' + b.toString('hex').toUpperCase() + '>';
}
function simplePdf(lines, info) {
  const esc = (s) => String(s).replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1');
  let y = 790;
  let stream = 'BT\n/F1 12 Tf\n14 TL\n50 ' + y + ' Td\n';
  lines.forEach((ln, i) => { stream += (i ? 'T* ' : '') + '(' + esc(ln) + ') Tj\n'; });
  stream += 'ET\n';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + 'endstream',
  ];
  if (info) objs.push('<< ' + Object.keys(info).map((k) => '/' + k + ' ' + pdfHex(info[k])).join(' ') + ' >>');
  let out = '%PDF-1.4\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = Buffer.byteLength(out);
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  offs.forEach((o) => { out += pad(o, 10) + ' 00000 n \n'; });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R' + (info ? ' /Info 6 0 R' : '') + ' >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}
exports.simplePdf = simplePdf;

const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().slice(0, 10);
};
const hasThai = (s) => /[฀-๿]/.test(s);

exports.register = function register(router, ctx) {
  const { clock, store } = ctx;
  const mem = () => store.mem;
  const BE = (t) => clock.parts(t).y + 543;

  // ---------- ตัวช่วย ----------
  const wrap = (fn) => async (req, res) => {
    try { return await fn(req, res); } catch (e) {
      if (e && e.status && e.code) return ctx.err(res, e.status, e.code, e.message);
      throw e;
    }
  };
  const getCase = (no) => mem().cases.get(no);
  const nameOf = (username) => { const u = store.users.get(username); return u ? u.name : username || ''; };
  const applicantOf = (c) => c.applicantUsername || c.applicant || c.citizen;
  const visited = (c) => {
    if (Array.isArray(c.visited) && c.visited.length) return c.visited;
    const v = ['registry'];
    if (c.serviceId === 'SV-03' && (Number(c.step) >= 2 || c.dept === 'works')) v.push('works');
    return v;
  };
  const workloadOf = (username) => { let n = 0; for (const c of mem().cases.values()) if (c.status === 'IN_REVIEW' && c.owner === username) n++; return n; };
  const iso = (t) => (t == null ? null : clock.toISO(t));
  const slaLevel = (c) => ctx.sla.level(c);
  const fixDeadlineMs = (c) => (c.status === 'NEED_FIX' && c.returnedAtMs != null ? c.returnedAtMs + FIX_MS : null);
  const ownerOf = (c) => (c.status === 'APPROVED' || c.status === 'PENDING_APPROVAL' ? '' : c.owner || '');
  const idNoOf = (c) => { try { return store.users.pii(applicantOf(c)).idNo; } catch { return ''; } };
  const maskedId = (c) => ctx.vault.mask(idNoOf(c));
  function push(c, event, from, to, user, detail) {
    c.timeline.push({ event, fromStatus: from || '', toStatus: to || '', timeMs: clock.nowMs(), username: user ? user.username : '', detail: detail == null ? '' : String(detail) });
  }
  const audit = (u, event, c, from, to, detail) => ctx.audit.add({ username: u.username, role: u.role, event, caseNo: c ? c.caseNo : '', fromStatus: from || '', toStatus: to || '', detail: detail || '' });
  const reasonOk = (r) => typeof r === 'string' && r.trim().length >= 10;

  // เอกสารของคำขอ
  const docOf = (c) => (c.docNo ? mem().documents.get(c.docNo) : null);

  // สิทธิ์ของผู้ใช้ต่อคำขอ (ใช้ทั้ง view และปุ่ม)
  function actions(c, u) {
    const a = { canClaim: false, canReturn: false, canForward: false, canApprove: false, canReject: false, canIssue: false, canUnmask: false, canCancel: false, canResubmit: false, canDownloadDoc: false };
    const now = clock.nowMs();
    if (u.role === 'citizen') {
      a.canCancel = c.status === 'SUBMITTED' && !c.owner;
      const dl = fixDeadlineMs(c);
      a.canResubmit = c.status === 'NEED_FIX' && dl != null && now < dl;
      a.canDownloadDoc = c.status === 'COMPLETED' && !!c.docNo;
      return a;
    }
    a.canDownloadDoc = c.status === 'COMPLETED' && !!c.docNo;
    if (u.role === 'officer') {
      a.canUnmask = true;
      a.canClaim = c.dept === u.dept && (c.status === 'SUBMITTED' || c.status === 'IN_REVIEW') && !c.owner;
      const mine = c.status === 'IN_REVIEW' && c.owner === u.username;
      a.canReturn = mine && (c.returnCount || 0) < 2;
      a.canForward = mine && c.serviceId !== 'SV-01';
      if (c.serviceId === 'SV-01') { a.canApprove = mine; a.canReject = mine; }
      a.canIssue = c.status === 'APPROVED' && c.issuer === u.username;
    } else if (u.role === 'head') {
      a.canUnmask = true;
      if (c.serviceId !== 'SV-01' && c.status === 'PENDING_APPROVAL') { a.canApprove = true; a.canReject = true; }
    }
    return a;
  }

  function timelineView(c, u) {
    return (c.timeline || []).map((t) => {
      const tm = t.timeMs != null ? t.timeMs : t.atMs;
      const o = { event: t.event, status: t.toStatus || t.status || '', fromStatus: t.fromStatus || '', time: iso(tm), detail: t.detail != null ? t.detail : (t.text || '') };
      if (u.role !== 'citizen') o.username = t.username || '';
      return o;
    });
  }
  function fileList(c) {
    return (c.fileIds || []).map((id) => mem().files.get(id)).filter(Boolean).map((f) => ({ fileId: f.meta.fileId, name: f.meta.name, docKey: f.meta.docKey, size: f.meta.size }));
  }

  // รูปแบบ JSON ของคำขอ (CONTRACT 6.7) · เจ้าหน้าที่ห้ามมี idNo
  function caseJson(c, u) {
    const isCit = u.role === 'citizen';
    const o = {
      caseNo: c.caseNo, serviceId: c.serviceId, serviceName: SV_NAME[c.serviceId] || '', status: c.status,
      step: c.serviceId === 'SV-03' ? (c.step || null) : null,
      dept: c.dept || '', fee: c.fee, paidAt: iso(c.paidAtMs), dueAt: iso(c.dueAtMs), slaLevel: slaLevel(c),
      owner: ownerOf(c), returnCount: c.returnCount || 0, closedAt: iso(c.closedAtMs),
      applicantName: nameOf(applicantOf(c)),
      fixDeadline: iso(fixDeadlineMs(c)), docNo: c.docNo || null, verifyCode: c.verifyCode || null,
      receiptNo: c.receiptNo || null, qty: c.qty == null ? null : c.qty, areaSqm: c.areaSqm == null ? null : c.areaSqm,
      returnReason: c.status === 'NEED_FIX' ? (c.returnReason || '') : (c.returnReason || null),
      cancelledAt: iso(c.cancelledAtMs), timeline: timelineView(c, u), files: fileList(c), actions: actions(c, u),
    };
    if (isCit) { o.idNo = idNoOf(c); o.idFormatted = ctx.vault.format(o.idNo); }
    else o.idMasked = maskedId(c);
    const d = docOf(c);
    if (d) o.document = { docNo: d.docNo, verifyCode: d.verifyCode, issuedAt: d.issuedAt, validUntil: d.validUntil, signer: d.signer };
    return o;
  }
  function rowJson(c, u) {
    const o = {
      caseNo: c.caseNo, serviceId: c.serviceId, serviceName: SV_NAME[c.serviceId] || '', applicantName: nameOf(applicantOf(c)), idMasked: maskedId(c),
      status: c.status, step: c.serviceId === 'SV-03' ? (c.step || null) : null, dept: c.dept || '', owner: ownerOf(c),
      dueAt: iso(c.dueAtMs), slaLevel: slaLevel(c), canClaim: actions(c, u).canClaim,
    };
    if (ctx.bug('B09')) o.idNo = idNoOf(c); // B09: คิวส่งเลขเต็ม
    return o;
  }
  const byDue = (a, b) => (a.dueAtMs - b.dueAtMs) || (a.caseNo < b.caseNo ? -1 : a.caseNo > b.caseNo ? 1 : 0);

  // ---------- การมองเห็นคำขอ ----------
  function visibleCase(req, res, roles) {
    const u = ctx.requireRole(req, res, roles || ['citizen', 'officer', 'head']);
    if (!u) return null;
    const c = getCase(req.params.caseNo);
    if (!c) throw E(404, 'NOT_FOUND', MSG.notFound);
    if (u.role === 'citizen' && applicantOf(c) !== u.username && !ctx.bug('B06')) throw E(404, 'NOT_FOUND', MSG.notFound);
    return { u, c };
  }

  // ---------- GET /api/cases (ของฉัน) · GET /api/cases/:caseNo ----------
  router.add('GET', '/api/cases', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['citizen']); if (!u) return;
    const items = [...mem().cases.values()].filter((c) => applicantOf(c) === u.username)
      .sort((a, b) => (a.caseNo < b.caseNo ? 1 : -1))
      .map((c) => ({ caseNo: c.caseNo, serviceId: c.serviceId, serviceName: SV_NAME[c.serviceId] || '', status: c.status, step: c.serviceId === 'SV-03' ? (c.step || null) : null,
        fee: c.fee, paidAt: iso(c.paidAtMs), dueAt: iso(c.dueAtMs), slaLevel: slaLevel(c), closedAt: iso(c.closedAtMs) }));
    ctx.json(res, 200, { items });
  }));
  router.add('GET', '/api/cases/:caseNo', wrap((req, res) => {
    const r = visibleCase(req, res); if (!r) return;
    ctx.json(res, 200, caseJson(r.c, r.u));
  }));

  // ---------- ยกเลิก (FR-10) ----------
  router.add('POST', '/api/cases/:caseNo/cancel', wrap((req, res) => {
    const r = visibleCase(req, res, ['citizen']); if (!r) return;
    const { u, c } = r;
    if (c.status !== 'SUBMITTED' || c.owner) throw E(409, 'CANNOT_CANCEL', MSG.cannotCancel);
    const from = c.status;
    c.status = 'CANCELLED'; c.cancelledAtMs = clock.nowMs();
    push(c, 'CANCELLED', from, 'CANCELLED', u, '');
    ctx.json(res, 200, { status: 'CANCELLED' });
  }));

  // ---------- ส่งแก้ (FR-11) ----------
  router.add('POST', '/api/cases/:caseNo/resubmit', wrap(async (req, res) => {
    const r = visibleCase(req, res, ['citizen']); if (!r) return;
    const { u, c } = r;
    if (typeof ctx.sla.cancelExpired === 'function') ctx.sla.cancelExpired();
    const now = clock.nowMs();
    if (c.status === 'CANCELLED' && c.autoCancelled) throw E(409, 'FIX_WINDOW_EXPIRED', MSG.fixExpired);
    if (c.status !== 'NEED_FIX') throw E(409, 'INVALID_STATE', MSG.state);
    if (c.returnedAtMs == null || now >= c.returnedAtMs + FIX_MS) throw E(409, 'FIX_WINDOW_EXPIRED', MSG.fixExpired);
    let files = [];
    if (/multipart/i.test(req.headers['content-type'] || '')) {
      let mp;
      try { mp = await ctx.parseMultipart(req); } catch { throw E(400, 'INVALID_UPLOAD', 'รูปแบบการอัปโหลดไม่ถูกต้อง'); }
      files = mp.files || [];
    }
    if ((c.fileIds || []).length + files.length > MAX_FILES) throw E(400, 'FILE_COUNT', MSG.count);
    const kinds = files.map((f) => {
      if (f.buffer.length > MAX_FILE) throw E(400, 'FILE_TOO_LARGE', MSG.big);
      const k = sniff(f.buffer); if (!k) throw E(400, 'FILE_TYPE', MSG.type);
      return k;
    });
    files.forEach((f, i) => {
      const fileId = 'FL-' + crypto.randomBytes(5).toString('hex').toUpperCase();
      mem().files.set(fileId, { meta: { fileId, name: f.filename || 'file', docKey: 'extra', size: f.buffer.length, mime: kinds[i].mime, draftId: c.draftId || null, owner: u.username, caseNo: c.caseNo }, buffer: f.buffer });
      c.fileIds.push(fileId);
    });
    const retAt = c.returnedAtMs;
    c.dueAtMs = ctx.sla.extendDue(c.dueAtMs, retAt, now); // BR-13
    c.lastReturnedAtMs = retAt; c.returnedAtMs = null;
    c.status = 'IN_REVIEW'; // กลับผู้ถือเดิมขั้นเดิม ไม่ตรวจเพดาน 10 (A-29)
    push(c, 'RESUBMIT', 'NEED_FIX', 'IN_REVIEW', u, '');
    ctx.json(res, 200, { status: 'IN_REVIEW', dueAt: iso(c.dueAtMs) });
  }));

  // ---------- คิว (FR-12) ----------
  router.add('GET', '/api/officer/queue', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['officer', 'head']); if (!u) return;
    const filter = ['all', 'unclaimed', 'mine'].includes(req.query.filter) ? req.query.filter : 'all';
    let list = [...mem().cases.values()].filter((c) => ['SUBMITTED', 'IN_REVIEW', 'APPROVED'].includes(c.status) && (c.dept === 'registry' || c.dept === 'works'));
    if (u.role === 'officer') list = list.filter((c) => c.dept === u.dept);
    if (filter === 'unclaimed') list = list.filter((c) => (c.status === 'SUBMITTED' || c.status === 'IN_REVIEW') && !c.owner);
    else if (filter === 'mine') list = list.filter((c) => c.status === 'IN_REVIEW' && c.owner === u.username);
    list.sort(byDue);
    const out = { items: list.map((c) => rowJson(c, u)) };
    if (u.role === 'officer') out.workload = workloadOf(u.username);
    ctx.json(res, 200, out);
  }));
  router.add('GET', '/api/head/approvals', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['head']); if (!u) return;
    const list = [...mem().cases.values()].filter((c) => c.status === 'PENDING_APPROVAL').sort(byDue);
    ctx.json(res, 200, { items: list.map((c) => rowJson(c, u)) });
  }));

  // ---------- ตัวช่วยของ action ฝั่งเจ้าหน้าที่ ----------
  function officerCase(req, res, roles) {
    const u = ctx.requireRole(req, res, roles || ['officer']); if (!u) return null;
    const c = getCase(req.params.caseNo);
    if (!c) throw E(404, 'NOT_FOUND', MSG.notFound);
    return { u, c };
  }

  // ---------- รับเรื่อง (FR-13) ลำดับ: สิทธิ์ -> ALREADY_CLAIMED -> WORKLOAD_LIMIT ----------
  router.add('POST', '/api/officer/cases/:caseNo/claim', wrap((req, res) => {
    const r = officerCase(req, res); if (!r) return;
    const { u, c } = r;
    if (c.dept !== u.dept) throw E(403, 'FORBIDDEN', MSG.forbidden);
    const claimable = c.status === 'SUBMITTED' || c.status === 'IN_REVIEW';
    if (claimable && c.owner && !ctx.bug('B08')) throw E(409, 'ALREADY_CLAIMED', MSG.claimed);
    if (!claimable) throw E(409, 'INVALID_STATE', MSG.state);
    if (workloadOf(u.username) >= 10) throw E(409, 'WORKLOAD_LIMIT', MSG.workload);
    const from = c.status;
    c.owner = u.username; c.status = 'IN_REVIEW';
    if (c.dept === 'registry' && !c.issuer) c.issuer = u.username; // A-27
    push(c, 'CLAIM', from, 'IN_REVIEW', u, '');
    audit(u, 'CLAIM', c, from, 'IN_REVIEW', '');
    ctx.json(res, 200, { owner: c.owner });
  }));

  // ---------- ตีกลับ (FR-14) ----------
  router.add('POST', '/api/officer/cases/:caseNo/return', wrap((req, res) => {
    const r = officerCase(req, res); if (!r) return;
    const { u, c } = r;
    if (c.owner !== u.username) throw E(403, 'FORBIDDEN', MSG.forbidden);
    if (c.status !== 'IN_REVIEW') throw E(409, 'INVALID_STATE', MSG.state);
    if ((c.returnCount || 0) >= 2 && !ctx.bug('B12')) throw E(409, 'RETURN_LIMIT', MSG.returnLimit);
    const reason = (req.body || {}).reason;
    if (!reasonOk(reason)) throw E(400, 'REASON_TOO_SHORT', MSG.reason);
    const t = reason.trim();
    c.status = 'NEED_FIX'; c.returnCount = (c.returnCount || 0) + 1; c.returnedAtMs = clock.nowMs(); c.returnReason = t;
    push(c, 'RETURN', 'IN_REVIEW', 'NEED_FIX', u, t);
    audit(u, 'RETURN', c, 'IN_REVIEW', 'NEED_FIX', t);
    ctx.json(res, 200, { status: 'NEED_FIX', returnCount: c.returnCount });
  }));

  // ---------- ส่งต่ออัตโนมัติ (FR-15): ทะเบียน -> โยธา(SV-03) -> หัวหน้า ----------
  router.add('POST', '/api/officer/cases/:caseNo/forward', wrap((req, res) => {
    const r = officerCase(req, res); if (!r) return;
    const { u, c } = r;
    if (c.owner !== u.username) throw E(403, 'FORBIDDEN', MSG.forbidden);
    if (c.status !== 'IN_REVIEW' || c.serviceId === 'SV-01') throw E(409, 'INVALID_STATE', MSG.state);
    const note = typeof (req.body || {}).note === 'string' ? req.body.note.trim() : '';
    let body;
    const vis = visited(c);
    if (c.serviceId === 'SV-03' && c.dept === 'registry') {
      c.step = 2; c.dept = 'works'; c.owner = '';
      if (!vis.includes('works')) vis.push('works');
      body = { status: 'IN_REVIEW', step: 2 };
      push(c, 'FORWARD', 'IN_REVIEW', 'IN_REVIEW', u, note);
      audit(u, 'FORWARD', c, 'IN_REVIEW', 'IN_REVIEW', note);
    } else {
      if (c.serviceId === 'SV-03') c.step = 3;
      c.status = 'PENDING_APPROVAL'; c.dept = 'head'; c.owner = '';
      body = { status: 'PENDING_APPROVAL' };
      push(c, 'FORWARD', 'IN_REVIEW', 'PENDING_APPROVAL', u, note);
      audit(u, 'FORWARD', c, 'IN_REVIEW', 'PENDING_APPROVAL', note);
    }
    c.visited = vis;
    ctx.json(res, 200, body);
  }));

  // ---------- อนุมัติ / ไม่อนุมัติ ตามอำนาจ (FR-16) ----------
  // คืนว่าผู้ใช้มีอำนาจตัดสินคำขอนี้หรือไม่ (ไม่ดูสถานะ)
  function mayDecide(u, c) {
    if (c.serviceId === 'SV-01') return u.role === 'officer' && c.owner === u.username;
    return u.role === 'head';
  }
  function decideState(c) {
    return c.serviceId === 'SV-01' ? c.status === 'IN_REVIEW' : c.status === 'PENDING_APPROVAL';
  }
  router.add('POST', '/api/cases/:caseNo/approve', wrap((req, res) => {
    const r = officerCase(req, res, ['officer', 'head']); if (!r) return;
    const { u, c } = r;
    if (!mayDecide(u, c) && !ctx.bug('B07')) throw E(403, 'FORBIDDEN', MSG.forbidden);
    if (!decideState(c)) throw E(409, 'INVALID_STATE', MSG.state);
    const from = c.status;
    c.status = 'APPROVED'; c.approvedBy = u.username; c.approvedAtMs = clock.nowMs();
    if (c.serviceId === 'SV-01') c.issuer = c.owner || u.username; // A-27
    c.owner = ''; c.dept = 'registry';
    if (c.serviceId === 'SV-03') c.step = 3;
    push(c, 'APPROVE', from, 'APPROVED', u, '');
    audit(u, 'APPROVE', c, from, 'APPROVED', '');
    ctx.json(res, 200, { status: 'APPROVED' });
  }));
  router.add('POST', '/api/cases/:caseNo/reject', wrap((req, res) => {
    const r = officerCase(req, res, ['officer', 'head']); if (!r) return;
    const { u, c } = r;
    if (!mayDecide(u, c)) throw E(403, 'FORBIDDEN', MSG.forbidden);
    if (!decideState(c)) throw E(409, 'INVALID_STATE', MSG.state);
    const reason = (req.body || {}).reason;
    if (!reasonOk(reason)) throw E(400, 'REASON_TOO_SHORT', MSG.reason);
    const t = reason.trim();
    const from = c.status;
    c.status = 'REJECTED'; c.closedAtMs = clock.nowMs(); c.rejectReason = t; c.owner = '';
    push(c, 'REJECT', from, 'REJECTED', u, t);
    audit(u, 'REJECT', c, from, 'REJECTED', t);
    ctx.json(res, 200, { status: 'REJECTED', closedAt: iso(c.closedAtMs) });
  }));

  // ---------- ออกเอกสาร (FR-17) ----------
  const sigOf = (d) => crypto.createHmac('sha256', DOC_KEY).update([d.docNo, d.caseNo, d.applicant, d.serviceId, d.issuedAt, d.validUntil, d.signer].join('|')).digest('hex');
  function validUntilOf(serviceId, nowMs) {
    const date = clock.dateStr(nowMs);
    if (serviceId === 'SV-01') return addDays(date, 89);
    const [y, m, d] = date.split('-').map(Number);
    const ad = m === 2 && d === 29 ? 28 : d;
    return addDays(`${y + 1}-${pad(m, 2)}-${pad(ad, 2)}`, -1);
  }
  function nextDocNo(nowMs) {
    const prefix = `DOC-${BE(nowMs)}-`;
    let max = 0;
    for (const k of mem().documents.keys()) if (k.startsWith(prefix)) max = Math.max(max, parseInt(k.slice(prefix.length), 10) || 0);
    return prefix + pad(max + 1, 6);
  }
  function newVerifyCode() {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (;;) {
      const b = crypto.randomBytes(8);
      let s = '';
      for (let i = 0; i < 8; i++) s += A[b[i] % A.length];
      if (!findByCode(s)) return s;
    }
  }
  function findByCode(code) {
    const k = String(code || '').toUpperCase();
    for (const d of mem().documents.values()) if (d.verifyCode === k) return d;
    return null;
  }
  router.add('POST', '/api/officer/cases/:caseNo/issue', wrap((req, res) => {
    const r = officerCase(req, res); if (!r) return;
    const { u, c } = r;
    if (c.issuer !== u.username) throw E(403, 'FORBIDDEN', MSG.forbidden);
    if (c.status !== 'APPROVED') throw E(409, 'INVALID_STATE', MSG.state);
    const now = clock.nowMs();
    const d = {
      docNo: nextDocNo(now), caseNo: c.caseNo, verifyCode: newVerifyCode(), applicant: nameOf(applicantOf(c)), serviceId: c.serviceId,
      issuedAt: clock.toISO(now), issuedAtMs: now, validUntil: validUntilOf(c.serviceId, now), signer: nameOf(c.approvedBy || u.username),
    };
    d.signature = sigOf(d);
    mem().documents.set(d.docNo, d);
    c.docNo = d.docNo; c.verifyCode = d.verifyCode; c.status = 'COMPLETED'; c.closedAtMs = now;
    push(c, 'ISSUE', 'APPROVED', 'COMPLETED', u, d.docNo);
    audit(u, 'ISSUE', c, 'APPROVED', 'COMPLETED', d.docNo);
    ctx.json(res, 200, { docNo: d.docNo, verifyCode: d.verifyCode, status: 'COMPLETED' });
  }));

  // ---------- ดาวน์โหลด PDF เอกสาร ----------
  router.add('GET', '/api/documents/:docNo/pdf', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['citizen', 'officer', 'head']); if (!u) return;
    const d = mem().documents.get(req.params.docNo);
    const c = d ? getCase(d.caseNo) : null;
    if (!d || !c) throw E(404, 'NOT_FOUND', 'ไม่พบเอกสาร');
    if (u.role === 'citizen' && applicantOf(c) !== u.username) throw E(404, 'NOT_FOUND', 'ไม่พบเอกสาร');
    const lines = [
      'e-Service Municipality - Digital Document (simulated)',
      '',
      `docNo=${d.docNo} caseNo=${d.caseNo} verify=${d.verifyCode} validUntil=${d.validUntil}`,
      '',
      `service=${d.serviceId}`,
      `issued=${d.issuedAt}`,
      `verify-url=/verify/${d.verifyCode}`,
      `signature=${d.signature.slice(0, 32)}`,
    ];
    const info = { Title: `เอกสารดิจิทัล ${d.docNo}`, Subject: `เลขคำขอ ${d.caseNo} · ผู้ยื่น ${d.applicant} · บริการ ${d.serviceId} ${SV_NAME[d.serviceId] || ''} · ออก ${d.issuedAt} · ใช้ได้ถึง ${d.validUntil} · ผู้ลงนาม ${d.signer} · รหัสตรวจสอบ ${d.verifyCode}` };
    ctx.send(res, 200, simplePdf(lines, info), 'application/pdf', { 'Content-Disposition': `attachment; filename="${d.docNo}.pdf"` });
  }));

  // ---------- ตรวจเอกสารสาธารณะ (FR-18) ----------
  function maskName(full) {
    const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return (parts[0] || '') + ' ***';
    const last = parts[parts.length - 1];
    return parts.slice(0, -1).join(' ') + ' ' + Array.from(last)[0] + '***';
  }
  function verify(code) {
    const d = findByCode(code);
    if (!d) return { status: 404, body: { result: 'NOT_FOUND' } };
    let ok = false;
    try {
      const a = Buffer.from(sigOf(d), 'hex'); const b = Buffer.from(String(d.signature), 'hex');
      ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { ok = false; }
    if (!ok) return { status: 200, body: { result: 'TAMPERED' } };
    const expired = clock.dateStr(clock.nowMs()) > d.validUntil;
    return { status: 200, body: { result: expired ? 'EXPIRED' : 'VALID', docNo: d.docNo, applicantMasked: maskName(d.applicant), serviceId: d.serviceId, issuedAt: d.issuedAt, validUntil: d.validUntil, signer: d.signer } };
  }
  router.add('GET', '/api/verify/:code', (req, res) => {
    const r = verify(req.params.code);
    ctx.json(res, r.status, r.body);
  });
  ctx.pageHooks.verifyStatus = (code) => (findByCode(code) ? 200 : 404);
  ctx.pageHooks.caseVisible = (user, caseNo) => {
    const c = getCase(caseNo);
    if (!c) return false;
    if (user.role === 'citizen') return applicantOf(c) === user.username || ctx.bug('B06');
    return true;
  };
  ctx.testHooks.tamper = function tamper(docNo) {
    const d = mem().documents.get(docNo);
    if (!d) return { status: 404, body: { code: 'NOT_FOUND', message: 'ไม่พบเอกสาร' } };
    d.applicant = d.applicant + ' (แก้ไข)'; // แก้ข้อมูลที่เก็บ ไม่คำนวณลายเซ็นใหม่
    return { status: 200, body: { ok: true } };
  };

  // ---------- ไฟล์แนบ (FR-29, BR-29) ----------
  // คืน null ถ้าไม่มีสิทธิ์ (ผู้เรียกตอบ 403) · citizen ไม่ใช่เจ้าของ -> 404 (throw)
  function mayViewFiles(u, c) {
    if (u.role === 'head') return true;
    if (u.role === 'officer') return visited(c).includes(u.dept);
    return false;
  }
  router.add('GET', '/api/cases/:caseNo/files', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['citizen', 'officer', 'head']); if (!u) return;
    const c = getCase(req.params.caseNo);
    if (!c) throw E(404, 'NOT_FOUND', MSG.notFound);
    if (u.role === 'citizen') { if (applicantOf(c) !== u.username) throw E(404, 'NOT_FOUND', MSG.notFound); }
    else if (!mayViewFiles(u, c)) throw E(403, 'FORBIDDEN', MSG.forbidden);
    ctx.json(res, 200, { items: fileList(c) });
  }));
  router.add('GET', '/api/files/:fileId', wrap((req, res) => {
    const u = ctx.requireRole(req, res, ['citizen', 'officer', 'head']); if (!u) return;
    const f = mem().files.get(req.params.fileId);
    if (!f) throw E(404, 'NOT_FOUND', 'ไม่พบไฟล์');
    const c = f.meta.caseNo ? getCase(f.meta.caseNo) : null;
    if (u.role === 'citizen') {
      const own = c ? applicantOf(c) === u.username : f.meta.owner === u.username;
      if (!own) throw E(404, 'NOT_FOUND', 'ไม่พบไฟล์');
    } else if (!c || !mayViewFiles(u, c)) throw E(403, 'FORBIDDEN', MSG.forbidden);
    ctx.send(res, 200, f.buffer, f.meta.mime || 'application/octet-stream', { 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.meta.name || 'file')}` });
  }));

  // รับ onCaseCreated จาก B03: เติมฟิลด์ที่ B05/B06 ใช้ (citizen, visited)
  ctx.onCaseCreated = ctx.onCaseCreated || [];
  ctx.onCaseCreated.push((c) => {
    c.citizen = c.applicantUsername || c.applicant;
    if (!Array.isArray(c.visited)) c.visited = ['registry'];
    if (c.issuer === undefined) c.issuer = '';
    if (!Array.isArray(c.timeline)) c.timeline = [];
  });

  // ---------- seed คำขอ 30 ใบ (TEST-DATA 4.1) + เอกสาร 1 ใบ (ข้อ 5) ----------
  ctx.onReset(() => {
    const who = { '1': '1101700123456', '2': '3100600987659', '3': '1909900555015' }; // 1=สมชาย 2=สมหญิง 3=ปิติ
    const user = {};
    for (const k of Object.keys(who)) { const u = store.users.findByIdNo(who[k]); user[k] = u ? u.username : ''; }
    // [เลข, บริการ, qty/area, ค่าธรรมเนียม, ผู้ยื่น, สถานะ, ผู้ถือ, ชำระ, กำหนด, ปิด, ตัวเลือก]
    const rows = [
      [1, 'SV-01', 1, 20, '2', 'COMPLETED', '', '2026-10-14T10:00', '2026-10-19T16:30', '2026-10-16T14:00'],
      [2, 'SV-03', 120, 1200, '3', 'COMPLETED', '', '2026-11-02T09:00', '2026-11-23T16:30', '2026-11-20T11:00'],
      [3, 'SV-01', 2, 40, '3', 'COMPLETED', '', '2026-11-02T09:30', '2026-11-05T16:30', '2026-11-04T15:00'],
      [4, 'SV-02', 0, 500, '1', 'COMPLETED', '', '2026-11-02T14:00', '2026-11-16T16:30', '2026-11-13T15:00'],
      [5, 'SV-01', 1, 20, '1', 'COMPLETED', '', '2026-11-03T11:00', '2026-11-06T16:30', '2026-11-05T10:00', { doc: true }],
      [6, 'SV-02', 0, 500, '3', 'COMPLETED', '', '2026-11-03T15:00', '2026-11-17T16:30', '2026-11-19T10:00'],
      [7, 'SV-02', 0, 500, '2', 'COMPLETED', '', '2026-11-04T10:00', '2026-11-18T16:30', '2026-11-18T16:00'],
      [8, 'SV-01', 1, 20, '2', 'REJECTED', '', '2026-11-09T10:00', '2026-11-12T16:30', '2026-11-11T09:00'],
      [9, 'SV-01', 1, 20, '1', 'CANCELLED', '', '2026-11-09T14:30', '2026-11-12T16:30', null, { cancelled: '2026-11-09T15:00' }],
      [10, 'SV-03', 80, 1000, '2', 'IN_REVIEW', '', '2026-11-12T10:00', '2026-12-03T16:30', null, { step: 2, dept: 'works', issuer: 'off.reg1', visited: ['registry', 'works'] }],
      [11, 'SV-03', 150, 1500, '1', 'PENDING_APPROVAL', '', '2026-11-16T10:00', '2026-12-08T16:30', null, { step: 3, dept: 'head', issuer: 'off.reg1', visited: ['registry', 'works', 'head'], by: ['off.reg1', 'off.works1'] }],
      [12, 'SV-03', 101, 1010, '3', 'IN_REVIEW', 'off.reg2', '2026-11-18T10:00', '2026-12-11T16:30', null, { step: 1 }],
      [13, 'SV-02', 0, 500, '1', 'IN_REVIEW', 'off.reg2', '2026-11-20T10:00', '2026-12-04T16:30', null],
      [14, 'SV-02', 0, 500, '3', 'PENDING_APPROVAL', '', '2026-11-20T11:00', '2026-12-04T16:30', null, { dept: 'head', issuer: 'off.reg1', visited: ['registry', 'head'], by: ['off.reg1'] }],
      [15, 'SV-02', 0, 500, '2', 'IN_REVIEW', 'off.reg2', '2026-11-20T15:00', '2026-12-04T16:30', null],
      [16, 'SV-02', 0, 500, '3', 'IN_REVIEW', 'off.reg2', '2026-11-23T09:00', '2026-12-08T16:30', null],
      [17, 'SV-01', 1, 20, '1', 'NEED_FIX', 'off.reg1', '2026-11-23T10:00', '2026-11-27T16:30', null, {
        returns: [['2026-11-24T11:00', '2026-11-25T10:00', 'ภาพบัตรประชาชนไม่ชัด กรุณาถ่ายใหม่'], ['2026-11-27T14:00', null, 'ชื่อในเอกสารไม่ตรงกับบัตร กรุณาแก้ไข']] }],
      [18, 'SV-02', 0, 500, '1', 'IN_REVIEW', 'off.reg2', '2026-11-24T10:00', '2026-12-09T16:30', null],
      [19, 'SV-02', 0, 500, '2', 'APPROVED', '', '2026-11-24T14:00', '2026-12-09T16:30', null, { issuer: 'off.reg1', approvedBy: 'head1', approvedAt: '2026-11-30T15:00', visited: ['registry', 'head'] }],
      [20, 'SV-01', 1, 20, '1', 'IN_REVIEW', 'off.reg1', '2026-11-25T10:00', '2026-11-30T16:30', null],
      [21, 'SV-02', 0, 500, '2', 'IN_REVIEW', 'off.reg2', '2026-11-25T12:00', '2026-12-11T16:30', null],
      [22, 'SV-01', 2, 40, '2', 'IN_REVIEW', 'off.reg1', '2026-11-26T10:00', '2026-12-01T16:30', null],
      [23, 'SV-01', 1, 20, '2', 'IN_REVIEW', 'off.reg1', '2026-11-26T10:30', '2026-12-03T16:30', null, {
        returns: [['2026-11-27T10:00', '2026-11-30T10:00', 'ภาพเอกสารเบลอ อ่านเลขไม่ได้'], ['2026-11-30T14:00', '2026-12-01T08:30', 'ข้อมูลในแบบฟอร์มไม่ครบถ้วน']] }],
      [24, 'SV-01', 1, 20, '3', 'SUBMITTED', '', '2026-11-27T11:00', '2026-12-02T16:30', null],
      [25, 'SV-01', 3, 60, '2', 'IN_REVIEW', 'off.reg2', '2026-11-30T10:00', '2026-12-03T16:30', null],
      [26, 'SV-01', 5, 100, '1', 'IN_REVIEW', 'off.reg2', '2026-11-30T16:29', '2026-12-03T16:30', null],
      [27, 'SV-01', 1, 20, '3', 'IN_REVIEW', 'off.reg2', '2026-11-30T16:30', '2026-12-04T16:30', null],
      [28, 'SV-01', 1, 20, '2', 'SUBMITTED', '', '2026-12-01T08:10', '2026-12-04T16:30', null],
      [29, 'SV-01', 1, 20, '3', 'SUBMITTED', '', '2026-12-01T08:20', '2026-12-04T16:30', null],
      [30, 'SV-01', 1, 20, '1', 'SUBMITTED', '', '2026-12-01T08:30', '2026-12-04T16:30', null],
    ];
    const T = (s) => ms(s + (s.length === 16 ? ':00+07:00' : '+07:00'));
    for (const row of rows) {
      const [n, sv, q, fee, ap, status, owner, paid, due, closed, opt] = row;
      const o = opt || {};
      const caseNo = 'EG-2569-' + pad(n, 6);
      const paidMs = T(paid);
      const dept = o.dept || 'registry';
      const timeline = [{ event: 'SUBMITTED', fromStatus: '', toStatus: 'SUBMITTED', timeMs: paidMs, username: user[ap], detail: '' }];
      const issuer = o.issuer || (dept === 'registry' && owner ? owner : '');
      let returnedAtMs = null; let returnCount = 0; let returnReason = null;
      if (owner || o.by) timeline.push({ event: 'CLAIM', fromStatus: 'SUBMITTED', toStatus: 'IN_REVIEW', timeMs: paidMs + 1800000, username: owner || (o.by && o.by[0]) || '', detail: '' });
      if (o.by && o.by.length > 1) timeline.push({ event: 'FORWARD', fromStatus: 'IN_REVIEW', toStatus: 'IN_REVIEW', timeMs: paidMs + 86400000, username: o.by[0], detail: '' });
      if (o.by) timeline.push({ event: 'FORWARD', fromStatus: 'IN_REVIEW', toStatus: 'PENDING_APPROVAL', timeMs: paidMs + 2 * 86400000, username: o.by[o.by.length - 1], detail: '' });
      for (const [ret, fix, reason] of (o.returns || [])) {
        timeline.push({ event: 'RETURN', fromStatus: 'IN_REVIEW', toStatus: 'NEED_FIX', timeMs: T(ret), username: owner, detail: reason });
        returnCount++; returnReason = reason;
        if (fix) timeline.push({ event: 'RESUBMIT', fromStatus: 'NEED_FIX', toStatus: 'IN_REVIEW', timeMs: T(fix), username: user[ap], detail: '' });
        else returnedAtMs = T(ret);
      }
      if (o.approvedBy) timeline.push({ event: 'APPROVE', fromStatus: 'PENDING_APPROVAL', toStatus: 'APPROVED', timeMs: T(o.approvedAt), username: o.approvedBy, detail: '' });
      const closedMs = closed ? T(closed) : null;
      if (closedMs) timeline.push({ event: status === 'REJECTED' ? 'REJECT' : 'ISSUE', fromStatus: 'IN_REVIEW', toStatus: status, timeMs: closedMs, username: 'legacy', detail: '' });
      if (o.cancelled) timeline.push({ event: 'CANCELLED', fromStatus: 'SUBMITTED', toStatus: 'CANCELLED', timeMs: T(o.cancelled), username: user[ap], detail: '' });
      // ไฟล์แนบตามเอกสารบังคับ
      const fileIds = [];
      for (const k of SV_DOCS[sv]) {
        const fileId = `FL-S${pad(n, 3)}-${k.toUpperCase().replace('-', '')}`;
        const buf = tinyPdf(k + ' ' + caseNo);
        mem().files.set(fileId, { meta: { fileId, name: k + '.pdf', docKey: k, size: buf.length, mime: 'application/pdf', draftId: null, owner: user[ap], caseNo }, buffer: buf });
        fileIds.push(fileId);
      }
      mem().cases.set(caseNo, {
        caseNo, serviceId: sv, status, step: sv === 'SV-03' ? (o.step || 1) : null, dept: status === 'COMPLETED' || status === 'REJECTED' || status === 'CANCELLED' ? 'registry' : dept,
        fee, qty: sv === 'SV-03' ? null : (sv === 'SV-01' ? q : null), areaSqm: sv === 'SV-03' ? q : null,
        paidAtMs: paidMs, dueAtMs: T(due), owner: owner || '', returnCount, returnedAtMs, closedAtMs: closedMs, returnReason,
        applicant: user[ap], applicantUsername: user[ap], citizen: user[ap], draftId: null, paymentRef: null, receiptNo: 'RC-2569-' + pad(n, 6),
        fileIds, docNo: null, verifyCode: null, issuer, approvedBy: o.approvedBy || '', approvedAtMs: o.approvedAt ? T(o.approvedAt) : null,
        visited: o.visited || ['registry'], cancelledAtMs: o.cancelled ? T(o.cancelled) : null, timeline,
      });
      if (o.doc) {
        const c = mem().cases.get(caseNo);
        const d = { docNo: 'DOC-2569-000001', caseNo, verifyCode: 'K7M2Q9XA', applicant: nameOf(user[ap]), serviceId: sv, issuedAt: '2026-11-05T10:00:00+07:00', issuedAtMs: T('2026-11-05T10:00'), validUntil: '2027-02-02', signer: nameOf('off.reg1') };
        d.signature = sigOf(d);
        mem().documents.set(d.docNo, d);
        c.docNo = d.docNo; c.verifyCode = d.verifyCode; c.approvedBy = 'off.reg1'; c.issuer = 'off.reg1';
      }
    }
    store.setCounter('case', 30);
    store.setCounter('doc', 1);
  });
};

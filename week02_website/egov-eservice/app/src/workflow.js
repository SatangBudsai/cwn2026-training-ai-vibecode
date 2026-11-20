'use strict';
/**
 * src/workflow.js — B05: Workflow + เอกสารดิจิทัล
 *
 * กฎ: BR-17 รับเรื่องครั้งละ 1 คน · BR-18 งานในมือ ≤ 10 (ตรวจตอนรับเรื่องเท่านั้น) · BR-19 ตีกลับ ≤ 2 ครั้ง ·
 *     เหตุผล ≥ 10 ตัว (หลัง trim) · BR-20 แก้ไขภายใน 168 ชม. · BR-21 อำนาจ/เส้นทาง · BR-23 เอกสาร + /verify · A-27 ผู้ออกเอกสาร
 *
 * จุดเปิดบั๊ก (BUG_MODE)
 *   B07  officer อนุมัติ SV-02 ได้เอง (ข้ามการตรวจสิทธิ์ของ approve ที่ API)        → ดู canDecide()
 *   B08  claim ข้ามการตรวจว่ามีผู้ถือแล้ว (คนที่ 2 ได้ 200 และกลายเป็นผู้ถือแทน)       → ดู claimHandler()
 *   B12  ตีกลับครั้งที่ 3 ได้ (ข้ามเพดาน RETURN_LIMIT)                               → ดู returnHandler()
 *
 * Routes
 *   GET  /api/officer/queue?filter=all|unclaimed|mine      (override ของ vault: ตาม A-34 · BR-16)
 *   GET  /api/head/approvals                               head: PENDING_APPROVAL เรียงตาม BR-16
 *   POST /api/officer/cases/:caseNo/claim | return | forward | issue
 *   POST /api/cases/:caseNo/approve | reject | cancel | resubmit
 *   GET  /api/documents/:docNo/pdf · GET /api/verify/:code (สาธารณะ)
 *   POST /api/test/documents/:docNo/tamper                 (TEST_MODE เท่านั้น)
 * export: register(app), tick(nowIso)
 */

const store = require('./store');
const time = require('./time');

let slaMod; let draftsMod; let vaultMod;
const sla = () => slaMod || (slaMod = require('./sla'));
const drafts = () => draftsMod || (draftsMod = require('./drafts'));
const vault = () => vaultMod || (vaultMod = require('./vault'));

const MAX_WORKLOAD = 10;
const MAX_RETURNS = 2;
const MIN_REASON = 10;
const FIX_WINDOW_MS = 168 * 3600 * 1000;
const HEAD_NAME = 'หัวหน้าฝ่าย';

/* ---------------------------------------------------------------- helpers */
const nowIso = () => time.nowIso();
const reasonOf = (v) => (typeof v === 'string' ? v.trim() : '');
const lenOf = (s) => Array.from(s).length;

function getCase(caseNo) {
  const c = store.findCase(caseNo);
  if (!c) store.fail('NOT_FOUND');
  return c;
}
function workloadOf(username) {
  return store.state.cases.filter((c) => c.status === 'IN_REVIEW' && c.owner === username).length;
}
function userName(username) {
  const u = store.findUser(username);
  return (u && u.name) || username;
}
function audit(user, event, c, from, detail) {
  store.addAudit({ username: user.username, role: user.role, event, caseNo: c.caseNo, fromStatus: from, toStatus: c.status, detail: detail || '' });
}
function timeline(c, event, text, by, from, at) {
  store.addTimeline(c, { event, text, by, fromStatus: from, toStatus: c.status, at: at || nowIso() });
}
function sortQueue(list) {
  return list.sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)) || a.caseNo.localeCompare(b.caseNo));
}
function requireOfficer(user) {
  if (!user || user.role !== 'officer') store.fail('FORBIDDEN');
}
function requireOwner(c, user) {
  requireOfficer(user);
  if (c.owner !== user.username) store.fail('FORBIDDEN');
}

/* ---------------------------------------------------------------- queue */
function canClaim(c, user) {
  if (!user || user.role !== 'officer') return false;
  if (!['SUBMITTED', 'IN_REVIEW'].includes(c.status) || c.owner) return false;
  return !user.dept || c.dept === user.dept;
}

function queueHandler(req) {
  const u = req.user;
  const filter = String((req.query && req.query.filter) || 'all');
  let list = store.state.cases.filter((c) => ['SUBMITTED', 'IN_REVIEW', 'APPROVED'].includes(c.status));
  if (u.role === 'officer' && u.dept) list = list.filter((c) => c.dept === u.dept);
  if (filter === 'unclaimed') list = list.filter((c) => ['SUBMITTED', 'IN_REVIEW'].includes(c.status) && !c.owner);
  else if (filter === 'mine') list = list.filter((c) => c.status === 'IN_REVIEW' && c.owner === u.username);
  const items = sortQueue(list.map((c) => Object.assign(vault().queueItem(c), { canClaim: canClaim(c, u), canIssue: c.status === "APPROVED" && c.issuer === u.username })));
  const out = { items };
  if (u.role === 'officer') { out.workload = workloadOf(u.username); out.workloadCount = out.workload; }
  return out;
}

function approvalsHandler() {
  const items = store.state.cases.filter((c) => c.status === 'PENDING_APPROVAL').map((c) => vault().queueItem(c));
  return { items: sortQueue(items) };
}

/* ---------------------------------------------------------------- claim */
function claimHandler(req) {
  const u = req.user;
  const c = getCase(req.params.caseNo);
  requireOfficer(u);
  if (u.dept && c.dept !== u.dept) store.fail('FORBIDDEN');
  // ลำดับตรวจ: สิทธิ์ → ALREADY_CLAIMED → WORKLOAD_LIMIT
  if (!store.bug('B08') && c.owner) store.fail('ALREADY_CLAIMED');   // B08: ข้ามการตรวจผู้ถือ
  if (!['SUBMITTED', 'IN_REVIEW'].includes(c.status)) store.fail('INVALID_STATE');
  if (workloadOf(u.username) >= MAX_WORKLOAD) store.fail('WORKLOAD_LIMIT');
  const from = c.status;
  c.owner = u.username;
  c.status = 'IN_REVIEW';
  if (c.dept === 'registry' && !c.issuer) c.issuer = u.username;      // A-27: ผู้รับเรื่องขั้นแรก
  if (c.dept === 'works') c.worksOfficer = u.username;
  audit(u, 'CLAIM', c, from, '');
  timeline(c, 'CLAIM', `รับเรื่องโดย ${u.username}`, u.username, from);
  return { owner: c.owner };
}

/* ---------------------------------------------------------------- return / resubmit */
function returnHandler(req) {
  const u = req.user;
  const c = getCase(req.params.caseNo);
  requireOwner(c, u);
  if (c.status !== 'IN_REVIEW') store.fail('INVALID_STATE');
  if (!store.bug('B12') && (c.returnCount || 0) >= MAX_RETURNS) store.fail('RETURN_LIMIT');   // B12: ตีกลับครั้งที่ 3 ได้
  const reason = reasonOf(req.body && req.body.reason);
  if (lenOf(reason) < MIN_REASON) store.fail('REASON_TOO_SHORT');
  const at = nowIso();
  c.returnCount = (c.returnCount || 0) + 1;
  if (!Array.isArray(c.returns)) c.returns = [];
  c.returns.push({ no: c.returnCount, at, by: u.username, reason, resubmittedAt: null, pausedDays: null });
  c.fixDeadline = time.toIso(time.toMs(at) + FIX_WINDOW_MS);
  c.status = 'NEED_FIX';
  audit(u, 'RETURN', c, 'IN_REVIEW', reason);
  timeline(c, 'RETURN', `ตีกลับครั้งที่ ${c.returnCount}: ${reason}`, u.username, 'IN_REVIEW', at);
  return { status: c.status, returnCount: c.returnCount };
}

/** ยกเลิกอัตโนมัติ: NEED_FIX ที่ now ≥ fixDeadline (ตีกลับ + 168 ชม.) · เวลาลงไทม์ไลน์ = fixDeadline (A-46) */
function expireFixWindows(now) {
  const nowMs = time.toMs(now);
  let n = 0;
  for (const c of store.state.cases) {
    if (c.status !== 'NEED_FIX' || !c.fixDeadline) continue;
    if (nowMs < time.toMs(c.fixDeadline)) continue;
    c.status = 'CANCELLED';
    c.cancelledAt = c.fixDeadline;
    c.cancelReason = 'FIX_EXPIRED';
    c.owner = null;
    timeline(c, 'CANCEL', 'หมดเวลาแก้ไข 168 ชั่วโมง ระบบยกเลิกคำขอ', null, 'NEED_FIX', c.fixDeadline);
    n += 1;
  }
  return n;
}
function tick(now) { return expireFixWindows(now || nowIso()); }

function resubmitHandler(req) {
  const u = req.user;
  const c = getCase(req.params.caseNo);
  if (u.role !== 'citizen' || c.citizenId !== u.citizenId) store.fail('NOT_FOUND');
  expireFixWindows(nowIso());
  if (c.status === 'CANCELLED' && c.cancelReason === 'FIX_EXPIRED') store.fail('FIX_WINDOW_EXPIRED');
  if (c.status !== 'NEED_FIX') store.fail('INVALID_STATE');
  // ตรวจไฟล์ทั้งหมดก่อนบันทึก (ถ้าผิดไม่เก็บไฟล์ใดเลย)
  const files = Array.isArray(req.files) ? req.files.filter((f) => f && f.data && f.data.length >= 0 && (f.filename || f.field === 'file')) : [];
  let count = (c.files || []).length;
  const checked = files.map((f) => {
    const docKey = (req.body && req.body.docKey) || 'extra';
    const type = drafts().checkFile(f, docKey, count);
    count += 1;
    return { f, docKey, type };
  });
  for (const x of checked) {
    const rec = drafts().saveUpload(x.f, x.docKey, x.type, { caseNo: c.caseNo, citizenId: c.citizenId });
    c.files = (c.files || []).concat(rec.fileId);
  }
  const at = nowIso();
  sla().applyResubmit(c, at);             // ขยาย dueAt (จุดบั๊ก B04 อยู่ใน sla.js)
  c.status = 'IN_REVIEW';
  c.fixDeadline = null;                   // ผู้ถือเดิมในขั้นเดิม ไม่ตรวจเพดาน 10 งาน (A-29)
  timeline(c, 'RESUBMIT', 'ประชาชนส่งแก้ไขแล้ว', null, 'NEED_FIX', at);
  return { status: c.status, dueAt: c.dueAt };
}

function cancelHandler(req) {
  const u = req.user;
  const c = getCase(req.params.caseNo);
  if (u.role !== 'citizen' || c.citizenId !== u.citizenId) store.fail('NOT_FOUND');
  if (c.status !== 'SUBMITTED' || c.owner) store.fail('CANNOT_CANCEL');
  const at = nowIso();
  c.status = 'CANCELLED';
  c.cancelledAt = at;
  c.cancelReason = 'CITIZEN';
  timeline(c, 'CANCEL', 'ประชาชนยกเลิกคำขอ', null, 'SUBMITTED', at);
  return { status: c.status };
}

/* ---------------------------------------------------------------- forward */
function forwardHandler(req) {
  const u = req.user;
  const c = getCase(req.params.caseNo);
  requireOwner(c, u);
  if (c.status !== 'IN_REVIEW' || c.serviceId === 'SV-01') store.fail('INVALID_STATE');
  const note = reasonOf(req.body && req.body.note);
  const from = c.status;
  let text;
  if (c.serviceId === 'SV-03' && (c.step || 1) === 1) {
    c.step = 2; c.dept = 'works'; c.owner = null;
    if (!c.deptsVisited.includes('works')) c.deptsVisited.push('works');
    text = 'ผ่านขั้นทะเบียน ส่งต่อฝ่ายโยธา';
  } else {
    if (c.serviceId === 'SV-03') { c.worksOfficer = c.worksOfficer || u.username; c.step = 3; }
    c.status = 'PENDING_APPROVAL'; c.dept = null; c.owner = null;
    text = 'ส่งต่อหัวหน้าฝ่ายพิจารณาอนุมัติ';
  }
  audit(u, 'FORWARD', c, from, note);
  timeline(c, 'FORWARD', note ? `${text} (${note})` : text, u.username, from);
  const out = { status: c.status };
  if (c.serviceId === 'SV-03') out.step = c.step;
  return out;
}

/* ---------------------------------------------------------------- approve / reject */
/** สิทธิ์ตัดสิน: SV-01 = ผู้ถือเรื่อง (officer) · SV-02/03 = head (PENDING_APPROVAL) */
function canDecide(c, u, forApprove) {
  if (c.serviceId === 'SV-01') return u.role === 'officer' && c.owner === u.username;
  if (u.role === 'head') return true;
  // B07: API ไม่เช็กสิทธิ์ — officer อนุมัติ SV-02 ได้เอง (ปุ่มยังซ่อนอยู่ที่หน้าเว็บ)
  if (forApprove && store.bug('B07') && c.serviceId === 'SV-02' && u.role === 'officer') return true;
  return false;
}
function decisionState(c) {
  return c.serviceId === 'SV-01' ? 'IN_REVIEW' : 'PENDING_APPROVAL';
}

function approveHandler(req) {
  const u = req.user;
  const c = getCase(req.params.caseNo);
  if (!canDecide(c, u, true)) store.fail('FORBIDDEN');
  if (c.status !== decisionState(c)) store.fail('INVALID_STATE');
  const from = c.status;
  const at = nowIso();
  if (c.serviceId === 'SV-01' && !c.issuer) c.issuer = u.username;
  c.status = 'APPROVED';
  c.approvedBy = u.username;
  c.approvedAt = at;
  c.owner = null;                      // แถว APPROVED ไม่มีผู้ถือ (A-34)
  c.dept = 'registry';                 // รอออกเอกสารที่ทะเบียน (ผู้ออก = c.issuer)
  audit(u, 'APPROVE', c, from, '');
  timeline(c, 'APPROVE', `อนุมัติโดย ${u.username} · รอออกเอกสาร`, u.username, from, at);
  return { status: c.status };
}

function rejectHandler(req) {
  const u = req.user;
  const c = getCase(req.params.caseNo);
  if (!canDecide(c, u, false)) store.fail('FORBIDDEN');
  if (c.status !== decisionState(c)) store.fail('INVALID_STATE');
  const reason = reasonOf(req.body && req.body.reason);
  if (lenOf(reason) < MIN_REASON) store.fail('REASON_TOO_SHORT');
  const from = c.status;
  const at = nowIso();
  c.status = 'REJECTED';
  c.rejectReason = reason;
  c.closedAt = at;
  c.owner = null;
  c.dept = null;
  audit(u, 'REJECT', c, from, reason);
  timeline(c, 'REJECT', `ไม่อนุมัติ: ${reason}`, u.username, from, at);
  return { status: c.status, closedAt: c.closedAt };
}

/* ---------------------------------------------------------------- issue + document */
/** วันสุดท้ายที่ใช้ได้ (BR-23): SV-01 = ออก + 89 วัน · SV-02/03 = วันครบรอบปีถัดไป − 1 วัน (29 ก.พ. → ใช้ 28 ก.พ.) */
function validUntilOf(serviceId, issuedAt) {
  const key = time.dateKey(time.toMs(issuedAt));
  if (serviceId === 'SV-01') return time.addDays(key, 89);
  let [y, m, d] = key.split('-').map(Number);
  y += 1;
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > dim) d = dim;
  const anniv = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return time.addDays(anniv, -1);
}

function issueHandler(req) {
  const u = req.user;
  const c = getCase(req.params.caseNo);
  requireOfficer(u);
  if (c.issuer !== u.username) store.fail('FORBIDDEN');     // A-27: เฉพาะผู้ออกเอกสาร (หัวหน้า/คนอื่น → 403)
  if (c.status !== 'APPROVED' || c.docNo) store.fail('INVALID_STATE');
  const at = nowIso();
  const approver = c.serviceId === 'SV-01' ? userName(c.approvedBy || c.issuer) : HEAD_NAME;
  const doc = {
    docNo: store.nextDocNo(at), caseNo: c.caseNo, serviceId: c.serviceId, citizenId: c.citizenId,
    applicant: c.applicantName, issuedAt: at, validUntil: validUntilOf(c.serviceId, at),
    signer: approver, issuedBy: u.username, verifyCode: store.newVerifyCode(), signature: null, tampered: false,
  };
  doc.signature = store.signDocument(doc);                  // HMAC-SHA256 (store.signDocument)
  store.state.documents.push(doc);
  const from = c.status;
  c.docNo = doc.docNo;
  c.status = 'COMPLETED';
  c.closedAt = at;
  c.owner = null;
  c.dept = null;
  audit(u, 'ISSUE', c, from, doc.docNo);
  timeline(c, 'ISSUE', `ออกเอกสาร ${doc.docNo}`, u.username, from, at);
  return { docNo: doc.docNo, verifyCode: doc.verifyCode, status: c.status };
}

function docView(doc) {
  const sv = store.getService(doc.serviceId);
  return {
    result: null, docNo: doc.docNo, applicantMasked: store.maskName(doc.applicant), serviceId: doc.serviceId,
    serviceName: sv ? sv.name : null, issuedAt: doc.issuedAt, validUntil: doc.validUntil, signer: doc.signer,
  };
}

/** A-43: ลายเซ็นไม่ตรง → TAMPERED ก่อน · หมดอายุตั้งแต่ 00:00 ของวันถัดจาก validUntil */
function verifyResult(doc) {
  if (doc.tampered || !store.verifySignature(doc)) return 'TAMPERED';
  return time.dateKey(time.toMs(nowIso())) > doc.validUntil ? 'EXPIRED' : 'VALID';
}

function verifyHandler(req, res) {
  const doc = store.findDocByCode(String(req.params.code || '').toUpperCase());
  if (!doc) return res.json(404, { result: 'NOT_FOUND' });
  const result = verifyResult(doc);
  if (result === 'TAMPERED') return { result };
  return Object.assign(docView(doc), { result });
}

function pdfHandler(req, res) {
  const u = req.user;
  const doc = store.findDoc(req.params.docNo);
  if (!doc) store.fail('NOT_FOUND');
  if (u.role === 'citizen' && doc.citizenId !== u.citizenId) store.fail('NOT_FOUND');   // A-52
  if (!['citizen', 'officer', 'head'].includes(u.role)) store.fail('FORBIDDEN');
  const lines = [
    'E-SERVICE DIGITAL DOCUMENT',
    `docNo=${doc.docNo} caseNo=${doc.caseNo} verify=${doc.verifyCode} validUntil=${doc.validUntil}`,
    `service=${doc.serviceId} issuedAt=${doc.issuedAt}`,
    `signature=${doc.signature}`,
    `QR /verify/${doc.verifyCode}`,
  ];
  const sv = store.getService(doc.serviceId);
  const thai = `${doc.docNo} | ${doc.caseNo} | ${doc.applicant} | ${sv ? sv.name : doc.serviceId} | ${doc.issuedAt} | ${doc.validUntil} | ${doc.signer} | ${doc.verifyCode}`;
  const buf = store.makePdf(lines, { extraText: thai });
  res.send(200, buf, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${doc.docNo}.pdf"`,
    'Content-Length': buf.length,
    'Cache-Control': 'no-store',
  });
  return undefined;
}

function tamperHandler(req) {
  if (!store.TEST_MODE) store.fail('NOT_FOUND');
  const doc = store.findDoc(req.params.docNo);
  if (!doc) store.fail('NOT_FOUND');
  doc.applicant = `${doc.applicant}x`;      // แก้ข้อมูลโดยไม่คำนวณลายเซ็นใหม่
  doc.tampered = true;
  return { ok: true };
}

/* ---------------------------------------------------------------- register */
function register(app) {
  const OFF = { roles: ['officer'] };
  const STAFF = { roles: ['officer', 'head'] };
  app.get('/api/officer/queue', STAFF, queueHandler);
  app.get('/api/head/approvals', { roles: ['head'] }, approvalsHandler);
  app.post('/api/officer/cases/:caseNo/claim', OFF, claimHandler);
  app.post('/api/officer/cases/:caseNo/return', OFF, returnHandler);
  app.post('/api/officer/cases/:caseNo/forward', OFF, forwardHandler);
  app.post('/api/officer/cases/:caseNo/issue', OFF, issueHandler);
  app.post('/api/cases/:caseNo/approve', STAFF, approveHandler);
  app.post('/api/cases/:caseNo/reject', STAFF, rejectHandler);
  app.post('/api/cases/:caseNo/cancel', { roles: ['citizen'] }, cancelHandler);
  app.post('/api/cases/:caseNo/resubmit', { roles: ['citizen'] }, resubmitHandler);
  app.get('/api/documents/:docNo/pdf', { auth: true }, pdfHandler);
  app.get('/api/verify/:code', {}, verifyHandler);
  app.post('/api/test/documents/:docNo/tamper', {}, tamperHandler);
}

module.exports = {
  register, tick, expireFixWindows, validUntilOf, verifyResult, canClaim, workloadOf,
};

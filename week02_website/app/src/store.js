// In-memory domain state + business rules. Users live in SQLite (vault.js).
import * as T from './time.js';
import * as V from './vault.js';
import crypto from 'node:crypto';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';

export const MSG = {
  INVALID_ID: [400, 'เลขบัตรประชาชนไม่ถูกต้อง'], OTP_INVALID: [401, 'รหัส OTP ไม่ถูกต้อง'],
  LOCKED: [423, 'ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที'], INVALID_CREDENTIALS: [401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'],
  INVALID_MOBILE: [400, 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0'], CONSENT_REQUIRED: [400, 'กรุณายินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA)'],
  INVALID_QTY: [400, 'จำนวนฉบับต้อง 1–5 ฉบับ'], INVALID_AREA: [400, 'กรุณาระบุพื้นที่ 1–500 ตร.ม.'],
  AREA_TOO_LARGE: [400, 'พื้นที่เกิน 500 ตร.ม. กรุณายื่นที่สำนักงาน'], FILE_TOO_LARGE: [400, 'ไฟล์ใหญ่เกิน 5 MB'],
  FILE_TYPE: [400, 'รองรับเฉพาะไฟล์ PDF, JPG, PNG'], FILE_COUNT: [400, 'แนบได้สูงสุด 5 ไฟล์ต่อคำขอ'],
  PLAN_NOT_PDF: [400, 'แบบแปลนต้องเป็นไฟล์ PDF เท่านั้น'], MISSING_DOCS: [409, 'ยังขาดเอกสาร'],
  QR_EXPIRED: [410, 'QR หมดอายุ กรุณาสร้าง QR ใหม่'], AMOUNT_MISMATCH: [422, 'ยอดเงินไม่ตรงกับค่าธรรมเนียม'],
  NOT_FOUND: [404, 'ไม่พบคำขอ'], CANNOT_CANCEL: [409, 'ยกเลิกไม่ได้ คำขอมีเจ้าหน้าที่รับเรื่องแล้ว'],
  FIX_WINDOW_EXPIRED: [409, 'หมดเวลาแก้ไขแล้ว คำขอถูกยกเลิก'], ALREADY_CLAIMED: [409, 'มีเจ้าหน้าที่รับเรื่องนี้แล้ว'],
  WORKLOAD_LIMIT: [409, 'รับงานได้สูงสุด 10 เรื่อง'], RETURN_LIMIT: [409, 'ตีกลับได้สูงสุด 2 ครั้ง'],
  REASON_TOO_SHORT: [400, 'กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร'], REASON_REQUIRED: [400, 'กรุณากรอกเหตุผล'],
  INVALID_STATE: [409, 'สถานะคำขอไม่ถูกต้องสำหรับรายการนี้'], FORBIDDEN: [403, 'ไม่มีสิทธิ์ทำรายการนี้'],
  UNAUTHENTICATED: [401, 'กรุณาเข้าสู่ระบบ'], INVALID_FEE: [400, 'ค่าธรรมเนียมต้องเป็นจำนวนเต็ม 0–100,000 บาท'],
  INVALID_SLA: [400, 'SLA ต้องเป็นจำนวนเต็ม 1–60 วันทำการ'], DUPLICATE_HOLIDAY: [409, 'มีวันหยุดนี้อยู่แล้ว'],
  SELF_ROLE_CHANGE: [409, 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้'], METHOD_NOT_ALLOWED: [405, 'Method Not Allowed'],
  INVALID_TIME: [400, 'เวลาไม่ถูกต้อง'], INVALID_SERVICE: [400, 'ไม่พบบริการ'], INVALID_DOCKEY: [400, 'ประเภทเอกสารไม่ถูกต้อง'],
  FILE_REQUIRED: [400, 'กรุณาแนบไฟล์'], INVALID_DATE: [400, 'วันที่ไม่ถูกต้อง'], INVALID_PERIOD: [400, 'ช่วงเวลาไม่ถูกต้อง'],
  INVALID_ROLE: [400, 'บทบาทไม่ถูกต้อง'], BAD_REQUEST: [400, 'คำขอไม่ถูกต้อง'],
};
export function fail(code, extra = {}, message) {
  const [status, msg] = MSG[code] || [400, code];
  const e = new Error(code); e.http = status; e.body = { code, message: message || msg, ...extra }; throw e;
}

export const SV_NAMES = { 'SV-01': 'ขอหนังสือรับรอง', 'SV-02': 'ขออนุญาตประกอบกิจการ', 'SV-03': 'ขออนุญาตก่อสร้าง/ต่อเติมอาคาร' };
export const DOCS = {
  'SV-01': [['id-card', 'บัตรประชาชน', true]],
  'SV-02': [['id-card', 'บัตรประชาชน', true], ['map', 'แผนที่ตั้ง', true], ['site-photo', 'ภาพสถานที่', false]],
  'SV-03': [['id-card', 'บัตรประชาชน', true], ['plan', 'แบบแปลน', true], ['deed', 'โฉนด', true]],
};
export const ROLE_LANDING = { citizen: '/citizen', officer: '/officer/queue', head: '/head/approvals', executive: '/dashboard', auditor: '/audit', admin: '/admin/services' };
export const EVENTS = ['STAFF_LOGIN', 'CLAIM', 'RETURN', 'FORWARD', 'APPROVE', 'REJECT', 'ISSUE', 'UNMASK', 'EXPORT', 'ADMIN_CHANGE'];

export let S;
function blank() {
  return {
    services: { 'SV-01': { fee: 20, sla: 3 }, 'SV-02': { fee: 500, sla: 10 }, 'SV-03': { feeBase: 1000, feePerSqm: 10, sla: 15 } },
    cases: new Map(), drafts: new Map(), payments: new Map(), files: new Map(), docs: new Map(),
    notis: [], notiKeys: new Set(), audit: [], sessions: new Map(), otp: new Map(),
    seq: { draft: 2, pay: 1, file: 0, noti: 0, audit: 0, case: {}, doc: {} },
  };
}

// ---------- fees ----------
const isInt = v => (typeof v === 'number' && Number.isInteger(v)) || (typeof v === 'string' && /^-?\d+$/.test(v.trim()));
export function calcFee(sv, qty, area) {
  const cfg = S.services[sv]; if (!cfg) fail('INVALID_SERVICE');
  if (sv === 'SV-01') {
    if (!isInt(qty) || +qty < 1 || +qty > 5) fail('INVALID_QTY');
    return cfg.fee * +qty;
  }
  if (sv === 'SV-02') return cfg.fee;
  if (!isInt(area) || +area < 1) fail('INVALID_AREA');
  const a = +area;
  if (a > 500) fail('AREA_TOO_LARGE');
  const hit = T.bug('B01') ? a > 101 : a > 100;
  return cfg.feeBase + (hit ? cfg.feePerSqm * (a - 100) : 0);
}

// ---------- audit ----------
export function audit(u, event, caseNo, from, to, detail) {
  S.audit.push({ id: ++S.seq.audit, at: T.nowMs(), username: u.username, role: u.role, event, caseNo: caseNo || null, from: from || null, to: to || null, detail: detail || '' });
}
export const auditView = a => ({ id: a.id, time: T.iso(a.at), username: a.username, role: a.role, event: a.event, caseNo: a.caseNo, fromStatus: a.from, toStatus: a.to, detail: a.detail });

// ---------- files ----------
export function sniff(buf) {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  return null;
}
export const MAX_FILE = 5242880;
export function checkFile(buf, docKey) {
  const limit = MAX_FILE;
  if (T.bug('B02') ? buf.length >= limit : buf.length > limit) fail('FILE_TOO_LARGE');
  const mime = sniff(buf); if (!mime) fail('FILE_TYPE');
  if (docKey === 'plan' && mime !== 'application/pdf') fail('PLAN_NOT_PDF');
  return mime;
}
function newFile(owner, name, docKey, buf, mime, draftId, caseNo) {
  const id = 'FL-' + String(++S.seq.file).padStart(5, '0');
  const f = { id, name, docKey, size: buf.length, buf, mime, owner, draftId: draftId || null, caseNo: caseNo || null };
  S.files.set(id, f); return f;
}
export const fileView = f => ({ fileId: f.id, name: f.name, docKey: f.docKey, size: f.size });
const miniPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

// ---------- seed ----------
const staff = [
  ['off.reg1', 'เจ้าหน้าที่ทะเบียน 1', 'officer', 'registry'], ['off.reg2', 'เจ้าหน้าที่ทะเบียน 2', 'officer', 'registry'],
  ['off.works1', 'เจ้าหน้าที่โยธา 1', 'officer', 'works'], ['head1', 'หัวหน้าฝ่าย', 'head', null],
  ['exec1', 'ผู้บริหาร', 'executive', null], ['audit1', 'ผู้ตรวจสอบภายใน', 'auditor', null], ['admin1', 'ผู้ดูแลระบบ', 'admin', null],
];
const J = s => T.parseIso(s.replace(' ', 'T') + ':00+07:00');
export function seed() {
  S = blank(); T.resetClock(); V.resetUsers(); T.holidays.clear();
  for (const [d, n] of [['2026-12-07', 'ชดเชยวันหยุดทดสอบ (สมมติ)'], ['2026-12-10', 'วันรัฐธรรมนูญทดสอบ (สมมติ)'], ['2026-12-31', 'วันสิ้นปีทดสอบ (สมมติ)'], ['2027-01-01', 'วันขึ้นปีใหม่ทดสอบ (สมมติ)']]) T.holidays.set(d, n);
  for (const [username, name, role, dept] of staff) V.putUser({ username, name, role, dept, pw: V.pwHash('Test@1234'), registered: true });
  const cz = {
    chai: V.makeCitizen({ idNo: '1101700123456', name: 'สมชาย ใจดี', mobile: '0812345678', registered: true }),
    ying: V.makeCitizen({ idNo: '3100600987659', name: 'สมหญิง รักไทย', mobile: '0823456789', registered: true }),
    mana: V.makeCitizen({ idNo: '5500400111221', name: 'มานะ ตั้งใจ', mobile: null, registered: false }),
    pitee: V.makeCitizen({ idNo: '1909900555015', name: 'ปิติ มีสุข', mobile: '0834567890', registered: true }),
  };
  // [no, sv, qty|area, who, status, holder, dept, step, paid, due, closed, returnCount]
  const rows = [
    [1, 'SV-01', 1, 'ying', 'COMPLETED', null, null, null, '2026-10-14 10:00', '2026-10-19 16:30', '2026-10-16 14:00', 0],
    [2, 'SV-03', 120, 'pitee', 'COMPLETED', null, null, 3, '2026-11-02 09:00', '2026-11-23 16:30', '2026-11-20 11:00', 0],
    [3, 'SV-01', 2, 'pitee', 'COMPLETED', null, null, null, '2026-11-02 09:30', '2026-11-05 16:30', '2026-11-04 15:00', 0],
    [4, 'SV-02', 0, 'chai', 'COMPLETED', null, null, null, '2026-11-02 14:00', '2026-11-16 16:30', '2026-11-13 15:00', 0],
    [5, 'SV-01', 1, 'chai', 'COMPLETED', null, null, null, '2026-11-03 11:00', '2026-11-06 16:30', '2026-11-05 10:00', 0],
    [6, 'SV-02', 0, 'pitee', 'COMPLETED', null, null, null, '2026-11-03 15:00', '2026-11-17 16:30', '2026-11-19 10:00', 0],
    [7, 'SV-02', 0, 'ying', 'COMPLETED', null, null, null, '2026-11-04 10:00', '2026-11-18 16:30', '2026-11-18 16:00', 0],
    [8, 'SV-01', 1, 'ying', 'REJECTED', null, null, null, '2026-11-09 10:00', '2026-11-12 16:30', '2026-11-11 09:00', 0],
    [9, 'SV-01', 1, 'chai', 'CANCELLED', null, null, null, '2026-11-09 14:30', '2026-11-12 16:30', null, 0],
    [10, 'SV-03', 80, 'ying', 'IN_REVIEW', null, 'works', 2, '2026-11-12 10:00', '2026-12-03 16:30', null, 0],
    [11, 'SV-03', 150, 'chai', 'PENDING_APPROVAL', null, null, 3, '2026-11-16 10:00', '2026-12-08 16:30', null, 0],
    [12, 'SV-03', 101, 'pitee', 'IN_REVIEW', 'off.reg2', 'registry', 1, '2026-11-18 10:00', '2026-12-11 16:30', null, 0],
    [13, 'SV-02', 0, 'chai', 'IN_REVIEW', 'off.reg2', 'registry', null, '2026-11-20 10:00', '2026-12-04 16:30', null, 0],
    [14, 'SV-02', 0, 'pitee', 'PENDING_APPROVAL', null, null, null, '2026-11-20 11:00', '2026-12-04 16:30', null, 0],
    [15, 'SV-02', 0, 'ying', 'IN_REVIEW', 'off.reg2', 'registry', null, '2026-11-20 15:00', '2026-12-04 16:30', null, 0],
    [16, 'SV-02', 0, 'pitee', 'IN_REVIEW', 'off.reg2', 'registry', null, '2026-11-23 09:00', '2026-12-08 16:30', null, 0],
    [17, 'SV-01', 1, 'chai', 'NEED_FIX', 'off.reg1', 'registry', null, '2026-11-23 10:00', '2026-11-27 16:30', null, 2],
    [18, 'SV-02', 0, 'chai', 'IN_REVIEW', 'off.reg2', 'registry', null, '2026-11-24 10:00', '2026-12-09 16:30', null, 0],
    [19, 'SV-02', 0, 'ying', 'APPROVED', null, 'registry', null, '2026-11-24 14:00', '2026-12-09 16:30', null, 0],
    [20, 'SV-01', 1, 'chai', 'IN_REVIEW', 'off.reg1', 'registry', null, '2026-11-25 10:00', '2026-11-30 16:30', null, 0],
    [21, 'SV-02', 0, 'ying', 'IN_REVIEW', 'off.reg2', 'registry', null, '2026-11-25 12:00', '2026-12-11 16:30', null, 0],
    [22, 'SV-01', 2, 'ying', 'IN_REVIEW', 'off.reg1', 'registry', null, '2026-11-26 10:00', '2026-12-01 16:30', null, 0],
    [23, 'SV-01', 1, 'ying', 'IN_REVIEW', 'off.reg1', 'registry', null, '2026-11-26 10:30', '2026-12-03 16:30', null, 2],
    [24, 'SV-01', 1, 'pitee', 'SUBMITTED', null, 'registry', null, '2026-11-27 11:00', '2026-12-02 16:30', null, 0],
    [25, 'SV-01', 3, 'ying', 'IN_REVIEW', 'off.reg2', 'registry', null, '2026-11-30 10:00', '2026-12-03 16:30', null, 0],
    [26, 'SV-01', 5, 'chai', 'IN_REVIEW', 'off.reg2', 'registry', null, '2026-11-30 16:29', '2026-12-03 16:30', null, 0],
    [27, 'SV-01', 1, 'pitee', 'IN_REVIEW', 'off.reg2', 'registry', null, '2026-11-30 16:30', '2026-12-04 16:30', null, 0],
    [28, 'SV-01', 1, 'ying', 'SUBMITTED', null, 'registry', null, '2026-12-01 08:10', '2026-12-04 16:30', null, 0],
    [29, 'SV-01', 1, 'pitee', 'SUBMITTED', null, 'registry', null, '2026-12-01 08:20', '2026-12-04 16:30', null, 0],
    [30, 'SV-01', 1, 'chai', 'SUBMITTED', null, 'registry', null, '2026-12-01 08:30', '2026-12-04 16:30', null, 0],
  ];
  const nm = { 'off.reg1': 'เจ้าหน้าที่ทะเบียน 1', 'off.reg2': 'เจ้าหน้าที่ทะเบียน 2' };
  for (const [no, sv, q, who, status, holder, dept, step, paid, due, closed, rc] of rows) {
    const caseNo = `EG-2569-${String(no).padStart(6, '0')}`;
    const ps = J(paid);
    const c = {
      no: caseNo, sv, owner: cz[who].username, name: cz[who].name, qty: sv === 'SV-01' ? q : null, area: sv === 'SV-03' ? q : null,
      fee: sv === 'SV-01' ? 20 * q : sv === 'SV-02' ? 500 : 1000 + (q > 100 ? 10 * (q - 100) : 0),
      status, holder, dept, step: sv === 'SV-03' ? step : null, regOwner: null, issuer: null, returnCount: rc, returnedAt: null, fixReason: null,
      paidAt: ps, dueAt: J(due), closedAt: closed ? J(closed) : null, receiptNo: `RC-2569-${String(no).padStart(6, '0')}`,
      docNo: null, signer: null, passedWorks: sv === 'SV-03' && step >= 2, autoCancelled: false, files: [], timeline: [],
    };
    c.dept = dept; if (['IN_REVIEW', 'NEED_FIX'].includes(status) && holder && dept === 'registry') c.regOwner = holder;
    if (['PENDING_APPROVAL', 'APPROVED'].includes(status) || (sv === 'SV-03' && step >= 2)) c.regOwner = 'off.reg1';
    if (status === 'APPROVED') { c.issuer = 'off.reg1'; c.signer = 'หัวหน้าฝ่าย'; }
    if (status === 'COMPLETED' || status === 'REJECTED') c.dept = null;
    S.seq.case[2569] = Math.max(S.seq.case[2569] || 0, no);
    const keys = DOCS[sv].filter(d => d[2]).map(d => d[0]);
    for (const k of (sv === 'SV-02' ? ['id-card', 'map'] : keys)) c.files.push(newFile(c.owner, k + '.pdf', k, miniPdf, 'application/pdf', null, caseNo).id);
    tl(c, ps, 'SUBMITTED', 'ชำระเงินและส่งคำขอ');
    if (rc >= 1 && no === 17) {
      tl(c, J('2026-11-24 11:00'), 'RETURN', 'ตีกลับ: ภาพบัตรประชาชนไม่ชัด กรุณาถ่ายใหม่'); tl(c, J('2026-11-25 10:00'), 'RESUBMIT', 'ส่งแก้ไข');
      tl(c, J('2026-11-27 14:00'), 'RETURN', 'ตีกลับ: ชื่อในเอกสารไม่ตรงกับบัตร กรุณาแก้ไข');
      c.returnedAt = J('2026-11-27 14:00'); c.fixReason = 'ชื่อในเอกสารไม่ตรงกับบัตร กรุณาแก้ไข';
    }
    if (no === 23) {
      tl(c, J('2026-11-27 10:00'), 'RETURN', 'ตีกลับ: ภาพเอกสารเบลอ อ่านเลขไม่ได้'); tl(c, J('2026-11-30 10:00'), 'RESUBMIT', 'ส่งแก้ไข');
      tl(c, J('2026-11-30 14:00'), 'RETURN', 'ตีกลับ: ข้อมูลในแบบฟอร์มไม่ครบถ้วน'); tl(c, J('2026-12-01 08:30'), 'RESUBMIT', 'ส่งแก้ไข');
    }
    if (c.closedAt) tl(c, c.closedAt, status === 'REJECTED' ? 'REJECT' : 'ISSUE', status === 'REJECTED' ? 'ไม่อนุมัติ' : 'ออกเอกสาร');
    if (status === 'CANCELLED') tl(c, J('2026-11-09 15:00'), 'CANCEL', 'ประชาชนยกเลิกคำขอ');
    if (status === 'APPROVED') tl(c, J('2026-11-30 15:00'), 'APPROVE', 'หัวหน้าฝ่ายอนุมัติ');
    S.cases.set(caseNo, c);
  }
  const c5 = S.cases.get('EG-2569-000005');
  c5.docNo = 'DOC-2569-000001'; c5.signer = nm['off.reg1']; S.seq.doc[2569] = 1;
  const doc = { docNo: c5.docNo, caseNo: c5.no, applicant: 'สมชาย ใจดี', sv: 'SV-01', issuedAt: T.iso(J('2026-11-05 10:00')), validUntil: '2027-02-02', signer: c5.signer, code: 'K7M2Q9XA' };
  doc.sig = V.hmacSign(sigInput(doc)); S.docs.set(doc.docNo, doc);
  // drafts
  const d1 = { id: 'DR-0001', owner: cz.chai.username, sv: 'SV-01', qty: 2, area: null, status: 'DRAFT', fee: 40, files: [], payments: [] };
  const d2 = { id: 'DR-0002', owner: cz.chai.username, sv: 'SV-02', qty: null, area: null, status: 'PENDING_PAYMENT', fee: 500, files: [], payments: ['PP-0001'] };
  for (const k of ['id-card', 'map']) d2.files.push(newFile(d2.owner, k + '.pdf', k, miniPdf, 'application/pdf', d2.id).id);
  S.drafts.set(d1.id, d1); S.drafts.set(d2.id, d2);
  const qc = J('2026-12-01 08:55');
  S.payments.set('PP-0001', { ref: 'PP-0001', draftId: 'DR-0002', owner: cz.chai.username, amount: 500, createdAt: qc, status: 'PENDING', caseNo: null, receiptNo: null, paidAt: null });
}
function tl(c, at, event, text) { c.timeline.push({ at, event, text }); }
const sigInput = d => [d.docNo, d.caseNo, d.applicant, d.sv, d.issuedAt, d.validUntil, d.signer].join('|');

// ---------- views ----------
export const maskId = id => `X-XXXX-XXXXX-${id.slice(10, 12)}-${id.slice(12)}`;
export const fmtId = id => `${id[0]}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id[12]}`;
export function maskName(full) {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length < 2) return `${parts[0]} ***`;
  return `${parts[0]} ${[...parts[1]][0]}***`;
}
const closedStatuses = ['COMPLETED', 'REJECTED', 'CANCELLED'];
export const level = c => T.slaLevel(c);
export function fixDeadline(c) { return c.status === 'NEED_FIX' && c.returnedAt != null ? c.returnedAt + 168 * 3600e3 : null; }

export function actionsFor(c, u) {
  const a = [];
  if (u.role === 'citizen') {
    if (c.owner !== u.username) return a;
    if (c.status === 'SUBMITTED' && !c.holder) a.push('cancel');
    if (c.status === 'NEED_FIX' && T.nowMs() < fixDeadline(c)) a.push('resubmit');
    if (c.status === 'COMPLETED' && c.docNo) a.push('download');
    return a;
  }
  if (u.role === 'officer') {
    const mine = c.holder === u.username && c.dept === u.dept;
    if (c.dept === u.dept && ['SUBMITTED', 'IN_REVIEW'].includes(c.status) && !c.holder) a.push('claim');
    if (mine && c.status === 'IN_REVIEW') {
      if (c.returnCount < 2) a.push('return');
      if (c.sv !== 'SV-01') a.push('forward');
      if (c.sv === 'SV-01') a.push('approve', 'reject');
    }
    if (c.status === 'APPROVED' && c.issuer === u.username) a.push('issue');
  } else if (u.role === 'head') {
    if (c.status === 'PENDING_APPROVAL') a.push('approve', 'reject');
  }
  if (u.role === 'officer' || u.role === 'head') a.push('unmask');
  return a;
}

export function caseView(c, u) {
  const owner = u.role === 'citizen';
  const v = {
    caseNo: c.no, serviceId: c.sv, serviceName: SV_NAMES[c.sv], status: c.status, step: c.step, fee: c.fee, qty: c.qty, areaSqm: c.area,
    paidAt: T.iso(c.paidAt), dueAt: T.iso(c.dueAt), slaLevel: level(c), owner: c.holder, returnCount: c.returnCount,
    closedAt: ['COMPLETED', 'REJECTED'].includes(c.status) ? T.iso(c.closedAt) : null, applicantName: c.name,
    fixDeadline: T.iso(fixDeadline(c)), fixReason: c.status === 'NEED_FIX' ? c.fixReason : null, receiptNo: c.receiptNo,
    docNo: c.docNo, verifyCode: null, issuedAt: null, validUntil: null, signer: c.signer,
    timeline: c.timeline.slice().sort((a, b) => a.at - b.at).map(t => ({ at: T.iso(t.at), event: t.event, text: t.text })),
    files: c.files.map(id => fileView(S.files.get(id))), actions: actionsFor(c, u),
  };
  if (c.docNo) { const d = S.docs.get(c.docNo); if (d) { v.verifyCode = d.code; v.issuedAt = d.issuedAt; v.validUntil = d.validUntil; v.signer = d.signer; } }
  const cu = V.getUser(c.owner); const idNo = V.idNoOf(cu);
  if (owner) { v.idNo = idNo; v.idNoFormatted = fmtId(idNo); } else v.idMasked = maskId(idNo);
  return v;
}
export function queueItem(c, u) {
  const idNo = V.idNoOf(V.getUser(c.owner));
  const r = { caseNo: c.no, serviceId: c.sv, applicantName: c.name, idMasked: maskId(idNo), status: c.status, step: c.step, owner: c.holder, dueAt: T.iso(c.dueAt), slaLevel: level(c), actions: actionsFor(c, u) };
  if (T.bug('B09')) r.idNo = idNo;
  return r;
}
export const caseSort = (a, b) => a.dueAt - b.dueAt || (a.no < b.no ? -1 : 1);

export function draftView(d) {
  const files = d.files.map(id => fileView(S.files.get(id)));
  const have = new Set(files.map(f => f.docKey));
  const missing = (DOCS[d.sv] || []).filter(x => x[2] && !have.has(x[0])).map(x => x[1]);
  const last = d.payments.length ? payView(S.payments.get(d.payments[d.payments.length - 1])) : null;
  return { draftId: d.id, serviceId: d.sv, status: d.status, fee: d.fee, qty: d.qty, areaSqm: d.area, files, missing, latestPayment: last && { ...last, paidAt: S.payments.get(last.ref).paidAt ? T.iso(S.payments.get(last.ref).paidAt) : null } };
}
export function payView(p) {
  const status = p.status === 'PAID' ? 'PAID' : (T.nowMs() - p.createdAt >= 15 * 60e3 ? 'EXPIRED' : 'PENDING');
  return { ref: p.ref, amount: p.amount, status, qrCreatedAt: T.iso(p.createdAt), qrExpiresAt: T.iso(p.createdAt + 15 * 60e3), caseNo: p.caseNo, receiptNo: p.receiptNo };
}

// ---------- drafts / payments ----------
export function createDraft(u, b) {
  const sv = b.serviceId; if (!SV_NAMES[sv]) fail('INVALID_SERVICE');
  const fee = calcFee(sv, b.qty, b.areaSqm);
  const d = { id: 'DR-' + String(++S.seq.draft).padStart(4, '0'), owner: u.username, sv, qty: sv === 'SV-01' ? +b.qty : null, area: sv === 'SV-03' ? +b.areaSqm : null, status: 'DRAFT', fee, files: [], payments: [] };
  S.drafts.set(d.id, d); return d;
}
export function ownDraft(u, id) {
  const d = S.drafts.get(id);
  if (!d || d.owner !== u.username) fail('NOT_FOUND');
  return d;
}
export function addDraftFiles(d, list /* [{name,docKey,buf}] */) {
  const allowed = new Set([...(DOCS[d.sv] || []).map(x => x[0]), 'extra']);
  const planned = [];
  let ids = d.files.slice();
  for (const f of list) {
    if (!allowed.has(f.docKey)) fail('INVALID_DOCKEY');
    const mime = checkFile(f.buf, f.docKey);
    if (f.docKey !== 'extra') ids = ids.filter(id => S.files.get(id).docKey !== f.docKey);
    if (ids.length >= 5) fail('FILE_COUNT');
    ids.push('tmp'); planned.push({ ...f, mime });
  }
  const out = [];
  for (const f of planned) {
    if (f.docKey !== 'extra') {
      d.files = d.files.filter(id => { const x = S.files.get(id); if (x.docKey === f.docKey) { S.files.delete(id); return false; } return true; });
    }
    const nf = newFile(d.owner, f.name, f.docKey, f.buf, f.mime, d.id); d.files.push(nf.id); out.push(nf);
  }
  return out;
}
export function createPayment(d) {
  if (!['DRAFT', 'PENDING_PAYMENT'].includes(d.status)) fail('INVALID_STATE');
  const view = draftView(d);
  if (view.missing.length) fail('MISSING_DOCS', { missing: view.missing }, 'ยังขาดเอกสาร: ' + view.missing.join(', '));
  if (d.status === 'DRAFT') { d.fee = calcFee(d.sv, d.qty, d.area); d.status = 'PENDING_PAYMENT'; }
  const p = { ref: 'PP-' + String(++S.seq.pay).padStart(4, '0'), draftId: d.id, owner: d.owner, amount: d.fee, createdAt: T.nowMs(), status: 'PENDING', caseNo: null, receiptNo: null, paidAt: null };
  S.payments.set(p.ref, p); d.payments.push(p.ref); return p;
}
export function deleteDraft(d) {
  if (!['DRAFT', 'PENDING_PAYMENT'].includes(d.status)) fail('INVALID_STATE');
  for (const r of d.payments) S.payments.delete(r);
  for (const id of d.files) S.files.delete(id);
  S.drafts.delete(d.id);
}
export function payCallback(ref, amount) {
  const p = S.payments.get(ref); if (!p) fail('NOT_FOUND');
  if (p.status === 'PAID') return { status: 'PAID', caseNo: p.caseNo, receiptNo: p.receiptNo, duplicate: true };
  const now = T.nowMs(), age = now - p.createdAt;
  if (T.bug('B05') ? age > 15 * 60e3 : age >= 15 * 60e3) fail('QR_EXPIRED');
  if (!Number.isInteger(amount) || amount !== p.amount) fail('AMOUNT_MISMATCH');
  const d = S.drafts.get(p.draftId);
  if (!d || d.status === 'SUBMITTED') fail('INVALID_STATE');
  const yr = T.beYear(now);
  const n = (S.seq.case[yr] || 0) + 1; S.seq.case[yr] = n;
  const caseNo = `EG-${yr}-${String(n).padStart(6, '0')}`, receiptNo = `RC-${yr}-${String(n).padStart(6, '0')}`;
  const cu = V.getUser(d.owner);
  const c = {
    no: caseNo, sv: d.sv, owner: d.owner, name: cu.name, qty: d.qty, area: d.area, fee: p.amount, status: 'SUBMITTED', holder: null, dept: 'registry',
    step: d.sv === 'SV-03' ? 1 : null, regOwner: null, issuer: null, returnCount: 0, returnedAt: null, fixReason: null, paidAt: now,
    dueAt: T.dueFromPaid(now, S.services[d.sv].sla), closedAt: null, receiptNo, docNo: null, signer: null, passedWorks: false,
    autoCancelled: false, files: d.files.slice(), timeline: [],
  };
  for (const id of c.files) S.files.get(id).caseNo = caseNo;
  tl(c, now, 'SUBMITTED', 'ชำระเงินและส่งคำขอ');
  S.cases.set(caseNo, c);
  p.status = 'PAID'; p.caseNo = caseNo; p.receiptNo = receiptNo; p.paidAt = now; d.status = 'SUBMITTED';
  return { status: 'PAID', caseNo, receiptNo, duplicate: false };
}

// ---------- staff actions ----------
const okReason = r => typeof r === 'string' && r.trim().length >= 10;
const tr = (c, t) => `${t}`;
function guardHolder(c, u) {
  if (u.role !== 'officer' || c.dept !== u.dept) fail('FORBIDDEN');
  if (c.holder !== u.username) {
    if (!c.holder && ['SUBMITTED', 'IN_REVIEW'].includes(c.status)) fail('INVALID_STATE');
    fail('FORBIDDEN');
  }
}
export function claim(c, u) {
  if (u.role !== 'officer') fail('FORBIDDEN');
  if (c.dept && c.dept !== u.dept) fail('FORBIDDEN');
  if (!c.dept) fail('INVALID_STATE');
  if (c.holder && !T.bug('B08')) fail('ALREADY_CLAIMED');
  if (!['SUBMITTED', 'IN_REVIEW'].includes(c.status)) fail('INVALID_STATE');
  const load = [...S.cases.values()].filter(x => x.status === 'IN_REVIEW' && x.holder === u.username).length;
  if (load >= 10) fail('WORKLOAD_LIMIT');
  const from = c.status;
  c.holder = u.username; c.status = 'IN_REVIEW';
  if (c.dept === 'registry' && !c.regOwner) c.regOwner = u.username;
  tl(c, T.nowMs(), 'CLAIM', `${u.name} รับเรื่อง`);
  audit(u, 'CLAIM', c.no, from, 'IN_REVIEW', '');
  return { owner: u.username };
}
export function returnCase(c, u, reason) {
  guardHolder(c, u);
  if (!okReason(reason)) fail('REASON_TOO_SHORT');
  if (c.status !== 'IN_REVIEW') fail('INVALID_STATE');
  if (c.returnCount >= 2 && !T.bug('B12')) fail('RETURN_LIMIT');
  c.status = 'NEED_FIX'; c.returnCount++; c.returnedAt = T.nowMs(); c.fixReason = reason.trim();
  tl(c, c.returnedAt, 'RETURN', `ตีกลับ: ${c.fixReason}`);
  audit(u, 'RETURN', c.no, 'IN_REVIEW', 'NEED_FIX', c.fixReason);
  return { status: 'NEED_FIX', returnCount: c.returnCount };
}
export function forwardCase(c, u, note) {
  guardHolder(c, u);
  if (c.status !== 'IN_REVIEW' || c.sv === 'SV-01') fail('INVALID_STATE');
  const n = typeof note === 'string' ? note.trim() : '';
  c.holder = null;
  let out;
  if (c.sv === 'SV-03' && c.step === 1) { c.step = 2; c.dept = 'works'; c.passedWorks = true; out = { status: 'IN_REVIEW', step: 2 }; }
  else { c.status = 'PENDING_APPROVAL'; c.dept = null; if (c.sv === 'SV-03') c.step = 3; out = { status: 'PENDING_APPROVAL' }; if (c.step) out.step = 3; }
  tl(c, T.nowMs(), 'FORWARD', 'ส่งต่อ' + (n ? `: ${n}` : ''));
  audit(u, 'FORWARD', c.no, 'IN_REVIEW', c.status, n);
  return out;
}
function decideGuard(c, u) {
  if (c.sv === 'SV-01') { if (!T.bug('B07') || u.role !== 'officer') guardHolder(c, u); if (c.status !== 'IN_REVIEW') fail('INVALID_STATE'); }
  else {
    if (T.bug('B07') && u.role === 'officer' && c.sv === 'SV-02') { if (c.status !== 'PENDING_APPROVAL') fail('INVALID_STATE'); return; }
    if (u.role !== 'head') fail('FORBIDDEN');
    if (c.status !== 'PENDING_APPROVAL') fail('INVALID_STATE');
  }
}
export function approveCase(c, u) {
  decideGuard(c, u);
  const from = c.status;
  c.status = 'APPROVED'; c.signer = u.name; c.issuer = c.sv === 'SV-01' ? u.username : (c.regOwner || u.username);
  c.holder = null; c.dept = 'registry';
  tl(c, T.nowMs(), 'APPROVE', `${u.name} อนุมัติ`);
  audit(u, 'APPROVE', c.no, from, 'APPROVED', '');
  return { status: 'APPROVED' };
}
export function rejectCase(c, u, reason) {
  if (c.sv === 'SV-01') guardHolder(c, u); else if (u.role !== 'head') fail('FORBIDDEN');
  if (!okReason(reason)) fail('REASON_TOO_SHORT');
  decideGuard(c, u);
  const from = c.status;
  c.status = 'REJECTED'; c.closedAt = T.nowMs(); c.holder = null; c.dept = null; c.fixReason = null;
  tl(c, c.closedAt, 'REJECT', `ไม่อนุมัติ: ${reason.trim()}`);
  audit(u, 'REJECT', c.no, from, 'REJECTED', reason.trim());
  return { status: 'REJECTED', closedAt: T.iso(c.closedAt) };
}
export function issueDoc(c, u) {
  if (u.role !== 'officer' || ![c.issuer, c.holder, c.regOwner].includes(u.username)) fail('FORBIDDEN');
  if (c.status !== 'APPROVED') fail('INVALID_STATE');
  const now = T.nowMs(), yr = T.beYear(now);
  const n = (S.seq.doc[yr] || 0) + 1; S.seq.doc[yr] = n;
  const docNo = `DOC-${yr}-${String(n).padStart(6, '0')}`;
  let code; do { code = Array.from(crypto.randomBytes(8), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join(''); } while ([...S.docs.values()].some(d => d.code === code));
  const doc = { docNo, caseNo: c.no, applicant: c.name, sv: c.sv, issuedAt: T.iso(now), validUntil: T.validUntilOf(c.sv, now), signer: c.signer, code };
  doc.sig = V.hmacSign(sigInput(doc)); S.docs.set(docNo, doc);
  c.docNo = docNo; c.status = 'COMPLETED'; c.closedAt = now; c.dept = null;
  tl(c, now, 'ISSUE', `ออกเอกสาร ${docNo}`);
  audit(u, 'ISSUE', c.no, 'APPROVED', 'COMPLETED', docNo);
  return { docNo, verifyCode: code, status: 'COMPLETED' };
}
export function unmask(c, u, reason) {
  if (!['officer', 'head'].includes(u.role)) fail('FORBIDDEN');
  if (typeof reason !== 'string' || !reason.trim()) fail('REASON_REQUIRED');
  if (!T.bug('B11')) audit(u, 'UNMASK', c.no, null, null, reason.trim());
  return { idNo: V.idNoOf(V.getUser(c.owner)) };
}
export function cancelCase(c, u) {
  if (c.status !== 'SUBMITTED' || c.holder) fail('CANNOT_CANCEL');
  c.status = 'CANCELLED'; tl(c, T.nowMs(), 'CANCEL', 'ประชาชนยกเลิกคำขอ');
  return { status: 'CANCELLED' };
}
export function resubmitCase(c, u, list) {
  if (c.status === 'CANCELLED' && c.autoCancelled) fail('FIX_WINDOW_EXPIRED');
  if (c.status !== 'NEED_FIX') fail('INVALID_STATE');
  const now = T.nowMs();
  if (now >= fixDeadline(c)) { c.status = 'CANCELLED'; c.autoCancelled = true; fail('FIX_WINDOW_EXPIRED'); }
  const allowed = new Set([...(DOCS[c.sv] || []).map(x => x[0]), 'extra']);
  let count = c.files.length; const mimes = [];
  for (const f of list) {
    if (!allowed.has(f.docKey)) fail('INVALID_DOCKEY');
    mimes.push(checkFile(f.buf, f.docKey));
    let replaced = f.docKey !== 'extra' && c.files.some(id => S.files.get(id).docKey === f.docKey);
    if (!replaced) count++;
    if (count > 5) fail('FILE_COUNT');
  }
  list.forEach((f, i) => {
    if (f.docKey !== 'extra') c.files = c.files.filter(id => { const x = S.files.get(id); if (x.docKey === f.docKey) { S.files.delete(id); return false; } return true; });
    c.files.push(newFile(c.owner, f.name, f.docKey, f.buf, mimes[i], null, c.no).id);
  });
  const rd = T.dayNum(c.returnedAt), sd = T.dayNum(now);
  const k = T.bug('B04') ? 0 : T.countBiz(rd, sd);
  c.dueAt = T.msAt(T.addBiz(T.dayNum(c.dueAt), k));
  c.status = 'IN_REVIEW'; c.returnedAt = null;
  tl(c, now, 'RESUBMIT', 'ส่งแก้ไข');
  return { status: 'IN_REVIEW', dueAt: T.iso(c.dueAt) };
}

// ---------- file access (BR-29) ----------
export function canSeeCaseFiles(c, u) {
  if (u.role === 'citizen') { if (c.owner !== u.username) fail('NOT_FOUND'); return; }
  if (u.role === 'head') return;
  if (u.role === 'officer') {
    if (u.dept === 'registry') return;
    if (u.dept === 'works' && c.sv === 'SV-03' && (c.passedWorks || c.step >= 2)) return;
  }
  fail('FORBIDDEN');
}

// ---------- periodic evaluation (every non-/api/test request) ----------
export function evaluate() {
  const now = T.nowMs();
  const users = V.allUsers();
  for (const c of S.cases.values()) {
    if (c.status === 'NEED_FIX' && c.returnedAt != null && now >= c.returnedAt + 168 * 3600e3) {
      c.status = 'CANCELLED'; c.autoCancelled = true; c.holder = null;
      tl(c, c.returnedAt + 168 * 3600e3, 'AUTO_CANCEL', 'เลยเวลาแก้ไข 168 ชั่วโมง ระบบยกเลิกคำขอ');
      continue;
    }
    if (!['SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED'].includes(c.status)) continue;
    const lv = level(c); if (lv !== 'near' && lv !== 'overdue') continue;
    const rec = new Set();
    if (c.status === 'PENDING_APPROVAL') users.filter(x => x.role === 'head').forEach(x => rec.add(x.username));
    else if (c.status === 'APPROVED') { if (c.issuer) rec.add(c.issuer); }
    else if (c.holder) rec.add(c.holder);
    else users.filter(x => x.role === 'officer' && x.dept === c.dept).forEach(x => rec.add(x.username));
    if (lv === 'overdue') users.filter(x => x.role === 'head').forEach(x => rec.add(x.username));
    for (const un of rec) {
      const key = `${un}|${c.no}|${lv}`;
      if (S.notiKeys.has(key)) continue;
      S.notiKeys.add(key);
      S.notis.push({ id: ++S.seq.noti, user: un, caseNo: c.no, level: lv, text: `คำขอ ${c.no} ${lv === 'near' ? 'ใกล้ครบกำหนด' : 'เกินกำหนด'}`, createdAt: now });
    }
  }
}
export const notisOf = un => S.notis.filter(n => n.user === un);

// ---------- dashboard ----------
export function dashboard(period, service) {
  const inP = ms => ms != null && T.iso(ms).startsWith(period);
  const cs = [...S.cases.values()].filter(c => service === 'ALL' || c.sv === service);
  const received = cs.filter(c => inP(c.paidAt)).length;
  const closedL = cs.filter(c => ['COMPLETED', 'REJECTED'].includes(c.status) && inP(c.closedAt));
  const closed = closedL.length, onTime = closedL.filter(c => c.closedAt <= c.dueAt).length;
  const num = T.bug('B10') ? received : closed;
  const pct = closed === 0 && !T.bug('B10') ? null : (num === 0 ? 0 : Math.floor((onTime / num) * 1000 + 0.5 + 1e-9) / 10);
  const open = ['SUBMITTED', 'IN_REVIEW', 'NEED_FIX', 'PENDING_APPROVAL', 'APPROVED'];
  const backlogL = cs.filter(c => open.includes(c.status));
  const overdue = backlogL.filter(c => c.status !== 'NEED_FIX' && T.nowMs() > c.dueAt).length;
  const workload = V.allUsers().filter(u => u.role === 'officer').map(u => ({ username: u.username, count: [...S.cases.values()].filter(c => c.status === 'IN_REVIEW' && c.holder === u.username).length }));
  return { received, closed, onTime, ontimePct: pct, backlog: backlogL.length, overdue, workload };
}

export { sigInput, tl };
seed();

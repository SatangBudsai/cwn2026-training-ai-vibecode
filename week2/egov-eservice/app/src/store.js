'use strict';
/**
 * src/store.js — ข้อมูลทั้งระบบ + seed ตาม TEST-DATA.md + บันทึกลง SQLite ที่ DB_PATH · B01
 *
 * ใช้งาน (ทุกบล็อก):
 *   const store = require('./store');
 *   store.state.cases            // อ่าน/แก้ตรง ๆ ได้ (อย่าเก็บ reference ของ array ข้าม request: reset แทนที่ทั้งหมด)
 *   store.findCase('EG-2569-000025')
 *   store.fail('ALREADY_CLAIMED')            // throw HttpError 409 พร้อมข้อความไทยตาม CONTRACT ตาราง 5
 *   store.addAudit({ username, role, event, caseNo, fromStatus, toStatus, detail })
 *   store.bug('B06')                          // true ถ้า BUG_MODE มี B06
 * server.js เรียก store.save() หลังทุก request ให้เอง (ไม่ต้องเรียกเอง)
 *
 * รูปแบบเวลาใน state: ISO 'YYYY-MM-DDTHH:mm:ss+07:00' เสมอ (ดู time.js) · วันที่ล้วน 'YYYY-MM-DD'
 * ข้อมูลส่วนบุคคล (idNo, mobile และสตริงใด ๆ ที่หน้าตาเหมือนเลขบัตร/เบอร์) ถูกเข้ารหัส AES-256-GCM ก่อนลงไฟล์ (NFR-04)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const time = require('./time');

/* ======================================================================
 * 1) ค่าคงที่และการตั้งค่า
 * ==================================================================== */
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db'));
const TEST_MODE = time.TEST_MODE;
const BUGS = new Set(String(process.env.BUG_MODE || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
function bug(code) { return BUGS.has(String(code).toUpperCase()); }

const PII_KEY = process.env.PII_KEY && /^[0-9a-f]{64}$/i.test(process.env.PII_KEY)
  ? Buffer.from(process.env.PII_KEY, 'hex')
  : crypto.createHash('sha256').update('egov-eservice-test-pii-key').digest();
const DOC_SIGN_KEY = process.env.DOC_SIGN_KEY || 'egov-eservice-test-signing-key';

const STATUS_TH = {
  DRAFT: 'ร่าง', PENDING_PAYMENT: 'รอชำระเงิน', SUBMITTED: 'ส่งคำขอแล้ว', IN_REVIEW: 'กำลังตรวจสอบ',
  NEED_FIX: 'รอแก้ไขเอกสาร', PENDING_APPROVAL: 'รออนุมัติ', APPROVED: 'อนุมัติ', COMPLETED: 'เสร็จสิ้น',
  REJECTED: 'ไม่อนุมัติ', CANCELLED: 'ยกเลิก',
};
const LEVEL_TH = { normal: 'ปกติ', near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด', paused: 'หยุดนับ', closed: 'ปิดแล้ว' };
const ROLE_TH = { citizen: 'ประชาชน', officer: 'เจ้าหน้าที่', head: 'หัวหน้าฝ่าย', executive: 'ผู้บริหาร', auditor: 'ผู้ตรวจสอบภายใน', admin: 'ผู้ดูแลระบบ' };
const LANDING = { officer: '/officer/queue', head: '/head/approvals', executive: '/dashboard', auditor: '/audit', admin: '/admin/services', citizen: '/citizen' };
const OPEN_STATUSES = ['SUBMITTED', 'IN_REVIEW', 'NEED_FIX', 'PENDING_APPROVAL', 'APPROVED'];
const CLOSED_STATUSES = ['COMPLETED', 'REJECTED', 'CANCELLED'];
const AUDIT_EVENTS = ['STAFF_LOGIN', 'CLAIM', 'RETURN', 'FORWARD', 'APPROVE', 'REJECT', 'ISSUE', 'UNMASK', 'EXPORT', 'ADMIN_CHANGE'];

/** เอกสารของแต่ละบริการ (ลำดับ = ลำดับใน missing-docs · CONTRACT 4.3) */
const SERVICE_DOCS = {
  'SV-01': [{ key: 'id-card', name: 'บัตรประชาชน', required: true }],
  'SV-02': [
    { key: 'id-card', name: 'บัตรประชาชน', required: true },
    { key: 'map', name: 'แผนที่ตั้ง', required: true },
    { key: 'site-photo', name: 'ภาพสถานที่', required: false },
  ],
  'SV-03': [
    { key: 'id-card', name: 'บัตรประชาชน', required: true },
    { key: 'plan', name: 'แบบแปลน', required: true, pdfOnly: true },
    { key: 'deed', name: 'โฉนด', required: true },
  ],
};
const DOC_KEYS = ['id-card', 'map', 'site-photo', 'plan', 'deed', 'extra'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;  // 5,242,880 (BR-07)
const MAX_FILES = 5;

/* ======================================================================
 * 2) ข้อผิดพลาดตาม CONTRACT ตาราง 5 · รูปแบบ {"code","message"}
 * ==================================================================== */
const ERRORS = {
  INVALID_ID: [400, 'เลขบัตรประชาชนไม่ถูกต้อง'],
  OTP_INVALID: [401, 'รหัส OTP ไม่ถูกต้อง'],
  LOCKED: [423, 'ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที'],
  INVALID_CREDENTIALS: [401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'],
  INVALID_MOBILE: [400, 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0'],
  CONSENT_REQUIRED: [400, 'กรุณายินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA)'],
  INVALID_QTY: [400, 'จำนวนฉบับต้อง 1–5 ฉบับ'],
  INVALID_AREA: [400, 'กรุณาระบุพื้นที่ 1–500 ตร.ม.'],
  AREA_TOO_LARGE: [400, 'พื้นที่เกิน 500 ตร.ม. กรุณายื่นที่สำนักงาน'],
  FILE_TOO_LARGE: [400, 'ไฟล์ใหญ่เกิน 5 MB'],
  FILE_TYPE: [400, 'รองรับเฉพาะไฟล์ PDF, JPG, PNG'],
  FILE_COUNT: [400, 'แนบได้สูงสุด 5 ไฟล์ต่อคำขอ'],
  PLAN_NOT_PDF: [400, 'แบบแปลนต้องเป็นไฟล์ PDF เท่านั้น'],
  MISSING_DOCS: [409, 'ยังขาดเอกสาร'],               // ข้อความจริง = 'ยังขาดเอกสาร: ' + missing.join(', ')
  QR_EXPIRED: [410, 'QR หมดอายุ กรุณาสร้าง QR ใหม่'],
  AMOUNT_MISMATCH: [422, 'ยอดเงินไม่ตรงกับค่าธรรมเนียม'],
  NOT_FOUND: [404, 'ไม่พบคำขอ'],
  CANNOT_CANCEL: [409, 'ยกเลิกไม่ได้ คำขอมีเจ้าหน้าที่รับเรื่องแล้ว'],
  FIX_WINDOW_EXPIRED: [409, 'หมดเวลาแก้ไขแล้ว คำขอถูกยกเลิก'],
  ALREADY_CLAIMED: [409, 'มีเจ้าหน้าที่รับเรื่องนี้แล้ว'],
  WORKLOAD_LIMIT: [409, 'รับงานได้สูงสุด 10 เรื่อง'],
  RETURN_LIMIT: [409, 'ตีกลับได้สูงสุด 2 ครั้ง'],
  REASON_TOO_SHORT: [400, 'กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร'],
  REASON_REQUIRED: [400, 'กรุณากรอกเหตุผล'],
  INVALID_STATE: [409, 'สถานะคำขอไม่ถูกต้องสำหรับรายการนี้'],
  FORBIDDEN: [403, 'ไม่มีสิทธิ์ทำรายการนี้'],
  UNAUTHENTICATED: [401, 'กรุณาเข้าสู่ระบบ'],
  INVALID_FEE: [400, 'ค่าธรรมเนียมต้องเป็นจำนวนเต็ม 0–100,000 บาท'],
  INVALID_SLA: [400, 'SLA ต้องเป็นจำนวนเต็ม 1–60 วันทำการ'],
  DUPLICATE_HOLIDAY: [409, 'มีวันหยุดนี้อยู่แล้ว'],
  SELF_ROLE_CHANGE: [409, 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้'],
  METHOD_NOT_ALLOWED: [405, 'Method Not Allowed'],
  INVALID_TIME: [400, 'รูปแบบเวลาไม่ถูกต้อง (ต้องเป็น ISO 8601 พร้อม offset)'],
  BAD_REQUEST: [400, 'คำขอไม่ถูกต้อง'],
  PAYLOAD_TOO_LARGE: [413, 'ข้อมูลที่ส่งมีขนาดใหญ่เกินไป'],
  INTERNAL: [500, 'เกิดข้อผิดพลาดภายในระบบ'],
};

class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message || code);
    this.status = status; this.code = code; this.extra = extra || null;
  }
  toJSON() { return Object.assign({ code: this.code, message: this.message }, this.extra || {}); }
}
/** สร้าง HttpError จากรหัสใน ERRORS · extra = ฟิลด์เพิ่ม เช่น {attemptsLeft:2} · status/message override ได้ */
function httpError(code, extra, opts = {}) {
  const [st, msg] = ERRORS[code] || [400, code];
  return new HttpError(opts.status || st, code, opts.message || msg, extra);
}
/** throw ทันที: store.fail('FORBIDDEN') */
function fail(code, extra, opts) { throw httpError(code, extra, opts); }

/* ======================================================================
 * 3) ยูทิลิตีข้อมูลบุคคล / เงิน / PDF / ลายเซ็น
 * ==================================================================== */
/** checksum เลขบัตร 13 หลัก (BR-01) */
function isValidThaiId(id) {
  if (typeof id !== 'string' || !/^\d{13}$/.test(id)) return false;
  let s = 0;
  for (let i = 0; i < 12; i++) s += Number(id[i]) * (13 - i);
  return (11 - (s % 11)) % 10 === Number(id[12]);
}
/** '1101700123456' → '1-1017-00123-45-6' */
function formatId(id) { return id ? `${id[0]}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id[12]}` : ''; }
/** '3100600987659' → 'X-XXXX-XXXXX-65-9' (BR-24) */
function maskId(id) { return id ? `X-XXXX-XXXXX-${id.slice(10, 12)}-${id[12]}` : ''; }
/** 'สมชาย ใจดี' → 'สมชาย ใ***' · ไม่มีนามสกุล → 'มานะ ***' (A-54 A-58) */
function maskName(name) {
  const s = String(name || '').trim();
  const i = s.indexOf(' ');
  if (i < 0) return `${s} ***`;
  const first = s.slice(0, i);
  const last = s.slice(i + 1).trim();
  return `${first} ${Array.from(last)[0] || ''}***`;
}
/** 1010 → '฿1,010' (A-04) */
function fmtBaht(n) { return `฿${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`; }

/** เวลาที่ใช้แสดงในเอกสาร/ลายเซ็น: ฟิลด์ต่อกันคั่นด้วย '|' (CONTRACT ข้อ 3 · A-22) */
function signDocument(doc) {
  const payload = [doc.docNo, doc.caseNo, doc.applicant, doc.serviceId, doc.issuedAt, doc.validUntil, doc.signer].join('|');
  return crypto.createHmac('sha256', DOC_SIGN_KEY).update(payload, 'utf8').digest('hex');
}
function verifySignature(doc) {
  const a = Buffer.from(signDocument(doc), 'hex');
  const b = Buffer.from(String(doc.signature || ''), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * สร้าง PDF จริงขนาดเล็ก (ข้อความ ASCII · Helvetica) · lines = array ของสตริง ASCII
 * ใช้กับไฟล์ seed, เอกสารดิจิทัล (บรรทัด docNo=…), Dashboard PDF (บรรทัด kpi …)
 * opts.extraText: สตริงต่อท้ายใน content stream เป็น comment (เช่น ข้อความ UTF-8 ที่ไม่ต้อง render)
 */
function makePdf(lines, opts = {}) {
  const esc = (s) => String(s).replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1');
  let content = 'BT /F1 12 Tf 50 790 Td 16 TL\n';
  for (const l of lines) content += `(${esc(l)}) Tj T*\n`;
  content += 'ET\n';
  // บรรทัด ASCII ที่เครื่องอ่านได้ให้หาเจอด้วยการค้นข้อความดิบในไฟล์ด้วย (นอก stream ที่บีบอัดไม่ได้ใช้ → ไม่บีบอัดอยู่แล้ว)
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    null,
  ];
  const streamBody = Buffer.from(content + (opts.extraText ? `% ${String(opts.extraText).replace(/[\r\n]+/g, ' ')}\n` : ''), 'utf8');
  const chunks = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  const offsets = [];
  let pos = chunks[0].length;
  objs.forEach((o, i) => {
    let buf;
    if (o === null) {
      buf = Buffer.concat([
        Buffer.from(`${i + 1} 0 obj\n<< /Length ${streamBody.length} >>\nstream\n`, 'latin1'),
        streamBody,
        Buffer.from('\nendstream\nendobj\n', 'latin1'),
      ]);
    } else {
      buf = Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1');
    }
    offsets.push(pos); chunks.push(buf); pos += buf.length;
  });
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  // บรรทัด ASCII ซ้ำนอก stream ให้ค้นหาแบบข้อความได้ง่าย (เป็น comment PDF)
  const plain = lines.map((l) => `% ${esc(l)}\n`).join('');
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n${plain}%%EOF\n`, 'latin1'));
  return Buffer.concat(chunks);
}

/** ชนิดไฟล์จาก magic bytes (BR-06) → 'pdf' | 'jpg' | 'png' | null */
function sniffType(buf) {
  if (!buf || buf.length < 3) return null;
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  return null;
}
const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' };

function hashPassword(pw) { return crypto.createHash('sha256').update(`egov-staff:${pw}`, 'utf8').digest('hex'); }
function checkPassword(user, pw) {
  if (!user || typeof pw !== 'string') return false;
  const a = Buffer.from(user.passwordHash, 'hex');
  const b = Buffer.from(hashPassword(pw), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ======================================================================
 * 4) Seed ตาม TEST-DATA.md
 * ==================================================================== */
const T = (s) => `${s.replace(' ', 'T')}:00+07:00`;   // '2026-11-30 16:30' → ISO +07:00

const SEED_CITIZENS = [
  { citizenId: 'CZ-0001', key: 'SOMCHAI', idNo: '1101700123456', name: 'สมชาย ใจดี', mobile: '0812345678', registered: true },
  { citizenId: 'CZ-0002', key: 'SOMYING', idNo: '3100600987659', name: 'สมหญิง รักไทย', mobile: '0823456789', registered: true },
  { citizenId: 'CZ-0003', key: 'MANA', idNo: '5500400111221', name: 'มานะ ตั้งใจ', mobile: null, registered: false },
  { citizenId: 'CZ-0004', key: 'PITI', idNo: '1909900555015', name: 'ปิติ มีสุข', mobile: '0834567890', registered: true },
];

const SEED_USERS = [
  ['off.reg1', 'เจ้าหน้าที่ทะเบียน 1', 'officer', 'registry'],
  ['off.reg2', 'เจ้าหน้าที่ทะเบียน 2', 'officer', 'registry'],
  ['off.works1', 'เจ้าหน้าที่โยธา 1', 'officer', 'works'],
  ['head1', 'หัวหน้าฝ่าย', 'head', null],
  ['exec1', 'ผู้บริหาร', 'executive', null],
  ['audit1', 'ผู้ตรวจสอบภายใน', 'auditor', null],
  ['admin1', 'ผู้ดูแลระบบ', 'admin', null],
];

/**
 * ตาราง 4.1 · [ลำดับ, ป้าย, บริการ, qty|area, ค่าธรรมเนียม, ผู้ยื่น, สถานะ, ผู้ถือ, ขั้น(SV-03), ชำระเมื่อ, กำหนดเสร็จ, ปิด/ยกเลิกเมื่อ]
 */
const SEED_CASES = [
  [1, 'H01', 'SV-01', 1, 20, 'SOMYING', 'COMPLETED', null, null, '2026-10-14 10:00', '2026-10-19 16:30', '2026-10-16 14:00'],
  [2, 'H05', 'SV-03', 120, 1200, 'PITI', 'COMPLETED', null, 3, '2026-11-02 09:00', '2026-11-23 16:30', '2026-11-20 11:00'],
  [3, 'H02', 'SV-01', 2, 40, 'PITI', 'COMPLETED', null, null, '2026-11-02 09:30', '2026-11-05 16:30', '2026-11-04 15:00'],
  [4, 'H06', 'SV-02', null, 500, 'SOMCHAI', 'COMPLETED', null, null, '2026-11-02 14:00', '2026-11-16 16:30', '2026-11-13 15:00'],
  [5, 'H03', 'SV-01', 1, 20, 'SOMCHAI', 'COMPLETED', null, null, '2026-11-03 11:00', '2026-11-06 16:30', '2026-11-05 10:00'],
  [6, 'H08', 'SV-02', null, 500, 'PITI', 'COMPLETED', null, null, '2026-11-03 15:00', '2026-11-17 16:30', '2026-11-19 10:00'],
  [7, 'H07', 'SV-02', null, 500, 'SOMYING', 'COMPLETED', null, null, '2026-11-04 10:00', '2026-11-18 16:30', '2026-11-18 16:00'],
  [8, 'H04', 'SV-01', 1, 20, 'SOMYING', 'REJECTED', null, null, '2026-11-09 10:00', '2026-11-12 16:30', '2026-11-11 09:00'],
  [9, 'X01', 'SV-01', 1, 20, 'SOMCHAI', 'CANCELLED', null, null, '2026-11-09 14:30', '2026-11-12 16:30', '2026-11-09 15:00'],
  [10, 'W01', 'SV-03', 80, 1000, 'SOMYING', 'IN_REVIEW', null, 2, '2026-11-12 10:00', '2026-12-03 16:30', null],
  [11, 'P02', 'SV-03', 150, 1500, 'SOMCHAI', 'PENDING_APPROVAL', null, 3, '2026-11-16 10:00', '2026-12-08 16:30', null],
  [12, 'R09', 'SV-03', 101, 1010, 'PITI', 'IN_REVIEW', 'off.reg2', 1, '2026-11-18 10:00', '2026-12-11 16:30', null],
  [13, 'R01', 'SV-02', null, 500, 'SOMCHAI', 'IN_REVIEW', 'off.reg2', null, '2026-11-20 10:00', '2026-12-04 16:30', null],
  [14, 'P01', 'SV-02', null, 500, 'PITI', 'PENDING_APPROVAL', null, null, '2026-11-20 11:00', '2026-12-04 16:30', null],
  [15, 'R02', 'SV-02', null, 500, 'SOMYING', 'IN_REVIEW', 'off.reg2', null, '2026-11-20 15:00', '2026-12-04 16:30', null],
  [16, 'R03', 'SV-02', null, 500, 'PITI', 'IN_REVIEW', 'off.reg2', null, '2026-11-23 09:00', '2026-12-08 16:30', null],
  [17, 'F01', 'SV-01', 1, 20, 'SOMCHAI', 'NEED_FIX', 'off.reg1', null, '2026-11-23 10:00', '2026-11-27 16:30', null],
  [18, 'R04', 'SV-02', null, 500, 'SOMCHAI', 'IN_REVIEW', 'off.reg2', null, '2026-11-24 10:00', '2026-12-09 16:30', null],
  [19, 'A01', 'SV-02', null, 500, 'SOMYING', 'APPROVED', null, null, '2026-11-24 14:00', '2026-12-09 16:30', null],
  [20, 'O01', 'SV-01', 1, 20, 'SOMCHAI', 'IN_REVIEW', 'off.reg1', null, '2026-11-25 10:00', '2026-11-30 16:30', null],
  [21, 'R08', 'SV-02', null, 500, 'SOMYING', 'IN_REVIEW', 'off.reg2', null, '2026-11-25 12:00', '2026-12-11 16:30', null],
  [22, 'N02', 'SV-01', 2, 40, 'SOMYING', 'IN_REVIEW', 'off.reg1', null, '2026-11-26 10:00', '2026-12-01 16:30', null],
  [23, 'F02', 'SV-01', 1, 20, 'SOMYING', 'IN_REVIEW', 'off.reg1', null, '2026-11-26 10:30', '2026-12-03 16:30', null],
  [24, 'N01', 'SV-01', 1, 20, 'PITI', 'SUBMITTED', null, null, '2026-11-27 11:00', '2026-12-02 16:30', null],
  [25, 'R05', 'SV-01', 3, 60, 'SOMYING', 'IN_REVIEW', 'off.reg2', null, '2026-11-30 10:00', '2026-12-03 16:30', null],
  [26, 'R07', 'SV-01', 5, 100, 'SOMCHAI', 'IN_REVIEW', 'off.reg2', null, '2026-11-30 16:29', '2026-12-03 16:30', null],
  [27, 'R06', 'SV-01', 1, 20, 'PITI', 'IN_REVIEW', 'off.reg2', null, '2026-11-30 16:30', '2026-12-04 16:30', null],
  [28, 'S01', 'SV-01', 1, 20, 'SOMYING', 'SUBMITTED', null, null, '2026-12-01 08:10', '2026-12-04 16:30', null],
  [29, 'S02', 'SV-01', 1, 20, 'PITI', 'SUBMITTED', null, null, '2026-12-01 08:20', '2026-12-04 16:30', null],
  [30, 'S03', 'SV-01', 1, 20, 'SOMCHAI', 'SUBMITTED', null, null, '2026-12-01 08:30', '2026-12-04 16:30', null],
];

/** ข้อมูลพิเศษของบางใบ (TEST-DATA 4.3 / 4.4) */
const SEED_EXTRA = {
  2: { issuer: 'off.reg1', worksOfficer: 'off.works1', approvedBy: 'head1' },
  5: { issuer: 'off.reg1', approvedBy: 'off.reg1', docNo: 'DOC-2569-000001' },
  8: { issuer: 'off.reg1', rejectReason: 'เอกสารประกอบไม่ถูกต้องตามระเบียบ' },
  10: { issuer: 'off.reg1', forwardedAt: { works: '2026-11-13 10:00' } },
  11: { issuer: 'off.reg1', worksOfficer: 'off.works1', forwardedAt: { works: '2026-11-17 10:00', head: '2026-11-18 10:00' } },
  14: { issuer: 'off.reg1', forwardedAt: { head: '2026-11-23 10:00' } },
  17: {
    fixDeadline: '2026-12-04 14:00',
    returns: [
      { at: '2026-11-24 11:00', resubmittedAt: '2026-11-25 10:00', pausedDays: 1, reason: 'ภาพบัตรประชาชนไม่ชัด กรุณาถ่ายใหม่' },
      { at: '2026-11-27 14:00', resubmittedAt: null, pausedDays: null, reason: 'ชื่อในเอกสารไม่ตรงกับบัตร กรุณาแก้ไข' },
    ],
  },
  19: { issuer: 'off.reg1', approvedBy: 'head1', approvedAt: '2026-11-30 15:00', forwardedAt: { head: '2026-11-25 10:00' } },
  23: {
    returns: [
      { at: '2026-11-27 10:00', resubmittedAt: '2026-11-30 10:00', pausedDays: 1, reason: 'ภาพเอกสารเบลอ อ่านเลขไม่ได้' },
      { at: '2026-11-30 14:00', resubmittedAt: '2026-12-01 08:30', pausedDays: 1, reason: 'ข้อมูลในแบบฟอร์มไม่ครบถ้วน' },
    ],
  },
};

const SERVICE_FILES = { 'SV-01': ['id-card'], 'SV-02': ['id-card', 'map'], 'SV-03': ['id-card', 'plan', 'deed'] };
const pad6 = (n) => String(n).padStart(6, '0');
const pad4 = (n) => String(n).padStart(4, '0');
const addMin = (iso, min) => time.toIso(time.parseIso(iso) + min * 60000);

function buildSeed() {
  const s = {
    services: [
      { id: 'SV-01', name: 'ขอหนังสือรับรอง', fee: 20, feePerSqm: null, sla: 3, docs: SERVICE_DOCS['SV-01'] },
      { id: 'SV-02', name: 'ขออนุญาตประกอบกิจการ', fee: 500, feePerSqm: null, sla: 10, docs: SERVICE_DOCS['SV-02'] },
      { id: 'SV-03', name: 'ขออนุญาตก่อสร้าง/ต่อเติมอาคาร', fee: 1000, feeBase: 1000, feePerSqm: 10, sla: 15, docs: SERVICE_DOCS['SV-03'] },
    ],
    holidays: [
      { date: '2026-12-07', name: 'ชดเชยวันหยุดทดสอบ (สมมติ)' },
      { date: '2026-12-10', name: 'วันรัฐธรรมนูญทดสอบ (สมมติ)' },
      { date: '2026-12-31', name: 'วันสิ้นปีทดสอบ (สมมติ)' },
      { date: '2027-01-01', name: 'วันขึ้นปีใหม่ทดสอบ (สมมติ)' },
    ],
    users: SEED_USERS.map(([username, name, role, dept]) => ({ username, name, role, dept, passwordHash: hashPassword('Test@1234'), active: true })),
    citizens: SEED_CITIZENS.map((c) => ({
      citizenId: c.citizenId, idNo: c.idNo, name: c.name, mobile: c.mobile, email: '',
      registered: c.registered, consentAt: c.registered ? '2026-10-01T09:00:00+07:00' : null,
    })),
    cases: [],
    drafts: [],
    payments: [],
    files: [],          // {fileId,name,docKey,size,mime,type,draftId,caseNo,citizenId,uploadedAt,seed}
    documents: [],
    notifications: [],  // {id,username,caseNo,level,text,createdAt}
    audit: [],          // {id,time,username,role,event,caseNo,fromStatus,toStatus,detail}
    counters: {
      case: { 2569: 30 }, receipt: { 2569: 30 }, doc: { 2569: 1 },
      draft: 2, pay: 1, file: 0, noti: 0, audit: 0,
    },
  };
  const cz = Object.fromEntries(SEED_CITIZENS.map((c) => [c.key, c]));
  const newFile = (name, docKey, owner) => {
    s.counters.file += 1;
    const fileId = `FL-${pad6(s.counters.file)}`;
    const size = seedFileContent({ fileId, name }).length;
    const f = Object.assign({ fileId, name, docKey, size, mime: 'application/pdf', type: 'pdf', seed: true }, owner);
    s.files.push(f);
    return fileId;
  };

  for (const row of SEED_CASES) {
    const [n, tag, serviceId, input, fee, who, status, owner, step, paid, due, closed] = row;
    const ex = SEED_EXTRA[n] || {};
    const caseNo = `EG-2569-${pad6(n)}`;
    const c = cz[who];
    const paidAt = T(paid);
    const isSv3 = serviceId === 'SV-03';
    const svName = s.services.find((x) => x.id === serviceId).name;
    const rec = {
      caseNo, tag, serviceId, serviceName: svName, citizenId: c.citizenId, applicantName: c.name,
      qty: serviceId === 'SV-01' ? input : null,
      areaSqm: isSv3 ? input : null,
      fee, status,
      step: isSv3 ? step : null,
      // แผนกของขั้นปัจจุบัน: registry | works | null (ขั้นหัวหน้า/ปิดแล้ว)
      dept: null,
      owner: owner || null,
      // ผู้ออกเอกสาร (A-27): เจ้าหน้าที่ทะเบียนที่รับเรื่องขั้นแรก
      issuer: ex.issuer || owner || null,
      worksOfficer: ex.worksOfficer || null,
      deptsVisited: ['registry'],
      paidAt, receiptNo: `RC-2569-${pad6(n)}`, receiptAmount: fee, payRef: null, draftId: null,
      dueAt: T(due),
      closedAt: null, cancelledAt: null,
      returnCount: (ex.returns || []).length,
      returns: (ex.returns || []).map((r, i) => ({
        no: i + 1, at: T(r.at), by: 'off.reg1', reason: r.reason,
        resubmittedAt: r.resubmittedAt ? T(r.resubmittedAt) : null, pausedDays: r.pausedDays,
      })),
      fixDeadline: ex.fixDeadline ? T(ex.fixDeadline) : null,
      approvedBy: ex.approvedBy || null, approvedAt: ex.approvedAt ? T(ex.approvedAt) : null,
      rejectReason: ex.rejectReason || null,
      docNo: ex.docNo || null,
      files: [],
      timeline: [],
      createdAt: paidAt,
    };
    // แผนกปัจจุบัน
    if (['SUBMITTED', 'IN_REVIEW', 'NEED_FIX', 'APPROVED'].includes(status)) rec.dept = isSv3 && step === 2 ? 'works' : 'registry';
    if (isSv3 && (step >= 2 || status === 'COMPLETED')) rec.deptsVisited.push('works');
    if (status === 'COMPLETED' || status === 'REJECTED') rec.closedAt = T(closed);
    if (status === 'CANCELLED') rec.cancelledAt = T(closed);

    // ไฟล์แนบตามเอกสารบังคับ
    for (const key of SERVICE_FILES[serviceId]) rec.files.push(newFile(`${key}.pdf`, key, { caseNo, citizenId: c.citizenId, uploadedAt: addMin(paidAt, -5) }));

    // ไทม์ไลน์ (ไม่ใช่ Audit · A-35 seed ไม่มี Audit)
    const tl = rec.timeline;
    const add = (at, event, text, by, extra) => tl.push(Object.assign({ at, event, text, by: by || null }, extra || {}));
    add(paidAt, 'SUBMITTED', `ชำระเงินสำเร็จ ใบเสร็จ ${rec.receiptNo} · ส่งคำขอแล้ว`, null, { toStatus: 'SUBMITTED' });
    const regHolder = rec.issuer || owner;
    if (status !== 'SUBMITTED' && status !== 'CANCELLED' && regHolder) {
      add(addMin(paidAt, 30), 'CLAIM', `รับเรื่องโดย ${regHolder}`, regHolder, { fromStatus: 'SUBMITTED', toStatus: 'IN_REVIEW' });
    }
    for (const r of rec.returns) {
      add(r.at, 'RETURN', `ตีกลับครั้งที่ ${r.no}: ${r.reason}`, r.by, { fromStatus: 'IN_REVIEW', toStatus: 'NEED_FIX' });
      if (r.resubmittedAt) add(r.resubmittedAt, 'RESUBMIT', 'ประชาชนส่งแก้ไขแล้ว', null, { fromStatus: 'NEED_FIX', toStatus: 'IN_REVIEW' });
    }
    if (ex.forwardedAt && ex.forwardedAt.works) {
      add(T(ex.forwardedAt.works), 'FORWARD', 'ผ่านขั้นทะเบียน ส่งต่อฝ่ายโยธา', rec.issuer, { fromStatus: 'IN_REVIEW', toStatus: 'IN_REVIEW' });
      if (rec.worksOfficer) add(addMin(T(ex.forwardedAt.works), 60), 'CLAIM', `รับเรื่องโดย ${rec.worksOfficer}`, rec.worksOfficer, { fromStatus: 'IN_REVIEW', toStatus: 'IN_REVIEW' });
    }
    if (ex.forwardedAt && ex.forwardedAt.head) {
      add(T(ex.forwardedAt.head), 'FORWARD', 'ส่งต่อหัวหน้าฝ่ายพิจารณาอนุมัติ', rec.worksOfficer || rec.issuer, { fromStatus: 'IN_REVIEW', toStatus: 'PENDING_APPROVAL' });
    }
    if (status === 'APPROVED') add(rec.approvedAt, 'APPROVE', 'อนุมัติโดย head1 · รอออกเอกสาร', 'head1', { fromStatus: 'PENDING_APPROVAL', toStatus: 'APPROVED' });
    if (status === 'COMPLETED') add(rec.closedAt, 'ISSUE', rec.docNo ? `ออกเอกสาร ${rec.docNo}` : 'ออกเอกสารแล้ว (ระบบเดิม)', rec.issuer, { fromStatus: 'APPROVED', toStatus: 'COMPLETED' });
    if (status === 'REJECTED') add(rec.closedAt, 'REJECT', `ไม่อนุมัติ: ${rec.rejectReason}`, rec.issuer, { fromStatus: 'IN_REVIEW', toStatus: 'REJECTED' });
    if (status === 'CANCELLED') add(rec.cancelledAt, 'CANCEL', 'ประชาชนยกเลิกคำขอ', null, { fromStatus: 'SUBMITTED', toStatus: 'CANCELLED' });
    tl.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    s.cases.push(rec);
  }

  // ร่างและรอชำระของสมชาย (4.2)
  const somchai = cz.SOMCHAI.citizenId;
  s.drafts.push({
    draftId: 'DR-0001', serviceId: 'SV-01', citizenId: somchai, qty: 2, areaSqm: null, fee: 40,
    status: 'DRAFT', files: [], lockedAmount: null, payRefs: [], createdAt: '2026-11-30T15:00:00+07:00', updatedAt: '2026-11-30T15:00:00+07:00',
  });
  const dr2 = {
    draftId: 'DR-0002', serviceId: 'SV-02', citizenId: somchai, qty: null, areaSqm: null, fee: 500,
    status: 'PENDING_PAYMENT', files: [], lockedAmount: 500, payRefs: ['PP-0001'], createdAt: '2026-12-01T08:40:00+07:00', updatedAt: '2026-12-01T08:55:00+07:00',
  };
  for (const key of ['id-card', 'map']) dr2.files.push(newFile(`${key}.pdf`, key, { draftId: 'DR-0002', citizenId: somchai, uploadedAt: '2026-12-01T08:45:00+07:00' }));
  s.drafts.push(dr2);
  s.payments.push({
    ref: 'PP-0001', draftId: 'DR-0002', citizenId: somchai, amount: 500,
    qrCreatedAt: '2026-12-01T08:55:00+07:00', qrExpiresAt: '2026-12-01T09:10:00+07:00',
    status: 'PENDING', paidAt: null, caseNo: null, receiptNo: null,
  });

  // เอกสารที่ออกแล้ว (ข้อ 5)
  const doc = {
    docNo: 'DOC-2569-000001', caseNo: 'EG-2569-000005', serviceId: 'SV-01', citizenId: somchai,
    applicant: 'สมชาย ใจดี', issuedAt: '2026-11-05T10:00:00+07:00', validUntil: '2027-02-02',
    signer: 'เจ้าหน้าที่ทะเบียน 1', issuedBy: 'off.reg1', verifyCode: 'K7M2Q9XA', signature: null, tampered: false,
  };
  doc.signature = signDocument(doc);
  s.documents.push(doc);
  return s;
}

/** เนื้อไฟล์ seed: PDF จริงขนาดเล็ก (deterministic) */
function seedFileContent(f) {
  return makePdf([`Sample attachment ${f.name}`, `fileId=${f.fileId}`, 'Test data only - not a real document']);
}

/* ======================================================================
 * 5) สถานะในหน่วยความจำ + ตัวช่วยค้นหา/นับเลข
 * ==================================================================== */
const state = {};                         // ข้อมูลหลัก (persist ลง DB) — reset แทนค่าภายในโดยไม่เปลี่ยน object
const mem = { sessions: new Map(), otp: new Map(), blobs: new Map(), locks: new Set() };   // ไม่ persist · reset ล้าง

const findCase = (caseNo) => state.cases.find((c) => c.caseNo === caseNo) || null;
const findDraft = (id) => state.drafts.find((d) => d.draftId === id) || null;
const findPayment = (ref) => state.payments.find((p) => p.ref === ref) || null;
const findFile = (id) => state.files.find((f) => f.fileId === id) || null;
const findDoc = (docNo) => state.documents.find((d) => d.docNo === docNo) || null;
const findDocByCode = (code) => state.documents.find((d) => d.verifyCode === code) || null;
const findUser = (username) => state.users.find((u) => u.username === username) || null;
const findCitizen = (citizenId) => state.citizens.find((c) => c.citizenId === citizenId) || null;
const findCitizenByIdNo = (idNo) => state.citizens.find((c) => c.idNo === idNo) || null;
const getService = (id) => state.services.find((s) => s.id === id) || null;
const isHoliday = (dateKey) => state.holidays.some((h) => h.date === dateKey);

/** เลขคำขอถัดไปตามปี พ.ศ. ของเวลาชำระ (BR-09) · เรียกแบบ synchronous เท่านั้น (กันเลขซ้ำ) */
function nextCaseNo(atIso) {
  const be = time.beYear(atIso || time.now());
  state.counters.case[be] = (state.counters.case[be] || 0) + 1;
  return `EG-${be}-${pad6(state.counters.case[be])}`;
}
function nextReceiptNo(atIso) {
  const be = time.beYear(atIso || time.now());
  state.counters.receipt[be] = (state.counters.receipt[be] || 0) + 1;
  return `RC-${be}-${pad6(state.counters.receipt[be])}`;
}
function nextDocNo(atIso) {
  const be = time.beYear(atIso || time.now());
  state.counters.doc[be] = (state.counters.doc[be] || 0) + 1;
  return `DOC-${be}-${pad6(state.counters.doc[be])}`;
}
function nextDraftId() { state.counters.draft += 1; return `DR-${pad4(state.counters.draft)}`; }
function nextPayRef() { state.counters.pay += 1; return `PP-${pad4(state.counters.pay)}`; }
function nextFileId() { state.counters.file += 1; return `FL-${pad6(state.counters.file)}`; }
/** รหัสตรวจสอบเอกสาร 8 ตัว [A-Z0-9] ไม่ซ้ำ */
function newVerifyCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    let s = '';
    const b = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) s += A[b[i] % A.length];
    if (!findDocByCode(s)) return s;
  }
}

/** บันทึก Audit (เพิ่มอย่างเดียว · BR-27) · time = นาฬิการะบบ */
function addAudit({ username, role, event, caseNo = null, fromStatus = null, toStatus = null, detail = '' }) {
  state.counters.audit += 1;
  const row = {
    id: state.counters.audit, time: time.nowIso(), username: username || null, role: role || null,
    event, caseNo: caseNo || null, fromStatus: fromStatus || null, toStatus: toStatus || null, detail: detail == null ? '' : String(detail),
  };
  state.audit.push(row);
  return row;
}

/** เพิ่มแจ้งเตือน (1 ครั้งต่อระดับต่อคำขอต่อคน · BR-15) · คืน row หรือ null ถ้ามีอยู่แล้ว */
function addNotification({ username, caseNo, level, text }) {
  if (state.notifications.some((n) => n.username === username && n.caseNo === caseNo && n.level === level)) return null;
  state.counters.noti += 1;
  const row = {
    id: state.counters.noti, username, caseNo, level,
    text: text || `คำขอ ${caseNo} ${level === 'overdue' ? 'เกินกำหนด' : 'ใกล้ครบกำหนด'}`,
    createdAt: time.nowIso(),
  };
  state.notifications.push(row);
  return row;
}

/** เพิ่มเหตุการณ์ในไทม์ไลน์ของคำขอ */
function addTimeline(c, { event, text, by = null, fromStatus = null, toStatus = null, at = null }) {
  const item = { at: at || time.nowIso(), event, text, by, fromStatus, toStatus };
  c.timeline.push(item);
  return item;
}

/** เก็บเนื้อไฟล์อัปโหลด (ลง DB ทันที) */
function putBlob(fileId, buf) {
  mem.blobs.set(fileId, buf);
  if (db && dbKind === 'sqlite') {
    try { db.prepare('INSERT OR REPLACE INTO blobs (id, data) VALUES (?, ?)').run(fileId, buf); } catch (e) { console.error('[store] putBlob', e.message); }
  }
}
/** เนื้อไฟล์ของ file record → Buffer | null */
function fileContent(f) {
  if (!f) return null;
  if (f.seed) return seedFileContent(f);
  if (mem.blobs.has(f.fileId)) return mem.blobs.get(f.fileId);
  if (db && dbKind === 'sqlite') {
    const r = db.prepare('SELECT data FROM blobs WHERE id = ?').get(f.fileId);
    if (r) { const b = Buffer.from(r.data); mem.blobs.set(f.fileId, b); return b; }
  }
  return null;
}

/* ======================================================================
 * 6) เข้ารหัส PII ก่อนลงไฟล์ (AES-256-GCM · NFR-04)
 * ==================================================================== */
const PII_KEYS = new Set(['idNo', 'mobile', 'phone', 'idFull']);
const PII_PATTERN = /\d{13}|(?<!\d)0\d{9}(?!\d)|\d-\d{4}-\d{5}-\d{2}-\d/;
const ENC_PREFIX = 'enc:v1:';

function encryptStr(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', PII_KEY, iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ENC_PREFIX + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}
function decryptStr(s) {
  const raw = Buffer.from(s.slice(ENC_PREFIX.length), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', PII_KEY, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
}
function sealDeep(v, key) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'string') return (PII_KEYS.has(key) || PII_PATTERN.test(v)) ? encryptStr(v) : v;
  if (typeof v === 'number' && PII_KEYS.has(key)) return encryptStr(String(v));
  if (Array.isArray(v)) return v.map((x) => sealDeep(x, key));
  if (typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = sealDeep(v[k], k); return o; }
  return v;
}
function openDeep(v) {
  if (typeof v === 'string') return v.startsWith(ENC_PREFIX) ? decryptStr(v) : v;
  if (Array.isArray(v)) return v.map(openDeep);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = openDeep(v[k]); return o; }
  return v;
}

/* ======================================================================
 * 7) Persistence: SQLite (node:sqlite) ที่ DB_PATH · ถ้าไม่มี node:sqlite ใช้ไฟล์ JSON ที่ DB_PATH แทน
 * ==================================================================== */
let db = null;
let dbKind = null;
let saveTimer = null;

function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(DB_PATH);
    db.exec(`PRAGMA journal_mode = DELETE; PRAGMA secure_delete = ON; PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS records (coll TEXT NOT NULL, id INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (coll, id));
      CREATE TABLE IF NOT EXISTS blobs (id TEXT PRIMARY KEY, data BLOB NOT NULL);`);
    dbKind = 'sqlite';
  } catch (e) {
    console.warn(`[store] node:sqlite ใช้ไม่ได้ (${e.message}) → ใช้ไฟล์ JSON ที่ ${DB_PATH}`);
    db = null; dbKind = 'json';
  }
}

/** เขียน state ทั้งหมดลง DB ทันที (synchronous) */
function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!dbKind) return;
  const sealed = {};
  for (const k of Object.keys(state)) sealed[k] = sealDeep(state[k], k);
  const clock = time.isFrozen() ? time.nowIso() : '';
  try {
    if (dbKind === 'sqlite') {
      db.exec('BEGIN');
      try {
        db.exec('DELETE FROM records');
        const ins = db.prepare('INSERT INTO records (coll, id, data) VALUES (?, ?, ?)');
        for (const [coll, v] of Object.entries(sealed)) {
          if (Array.isArray(v)) v.forEach((row, i) => ins.run(coll, i, JSON.stringify(row)));
          else ins.run(`${coll}:obj`, 0, JSON.stringify(v));
        }
        const m = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        m.run('schema', '1'); m.run('clock', clock); m.run('savedAt', new Date().toISOString());
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    } else {
      const tmp = `${DB_PATH}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ schema: 1, clock, state: sealed }));
      fs.renameSync(tmp, DB_PATH);
    }
  } catch (e) {
    console.error('[store] บันทึกลง DB ไม่สำเร็จ:', e.message);
  }
}
/** นัดบันทึก (รวมหลาย request เป็นครั้งเดียว) */
function save() {
  if (saveTimer || !dbKind) return;
  saveTimer = setTimeout(flush, 25);
  if (saveTimer.unref) saveTimer.unref();
}

/** โหลดจาก DB → true ถ้าสำเร็จ */
function load() {
  try {
    let sealed = null; let clock = '';
    if (dbKind === 'sqlite') {
      const schema = db.prepare("SELECT value FROM meta WHERE key = 'schema'").get();
      if (!schema) return false;
      clock = (db.prepare("SELECT value FROM meta WHERE key = 'clock'").get() || {}).value || '';
      sealed = {};
      for (const r of db.prepare('SELECT coll, id, data FROM records ORDER BY coll, id').all()) {
        if (r.coll.endsWith(':obj')) sealed[r.coll.slice(0, -4)] = JSON.parse(r.data);
        else (sealed[r.coll] = sealed[r.coll] || []).push(JSON.parse(r.data));
      }
    } else {
      if (!fs.existsSync(DB_PATH)) return false;
      const j = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      sealed = j.state; clock = j.clock || '';
    }
    if (!sealed || !sealed.cases || !sealed.counters) return false;
    const fresh = buildSeed();
    for (const k of Object.keys(state)) delete state[k];
    for (const k of Object.keys(fresh)) state[k] = Array.isArray(fresh[k]) ? [] : fresh[k];
    for (const [k, v] of Object.entries(sealed)) state[k] = openDeep(v);
    if (clock) time.setNow(clock);
    return true;
  } catch (e) {
    console.error('[store] โหลด DB ไม่สำเร็จ → seed ใหม่:', e.message);
    return false;
  }
}

/* ======================================================================
 * 8) reset / init
 * ==================================================================== */
const resetHooks = [];
/** ให้โมดูลอื่นลงทะเบียนล้างค่าในหน่วยความจำของตัวเองเมื่อ reset */
function onReset(fn) { resetHooks.push(fn); }

/** ล้างทุกอย่าง + seed ใหม่ + นาฬิกากลับค่าเริ่มต้น + ล้าง session ทุกคน (CONTRACT 0.9) */
function reset() {
  const fresh = buildSeed();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh);
  mem.sessions.clear(); mem.otp.clear(); mem.blobs.clear(); mem.locks.clear();
  if (dbKind === 'sqlite') { try { db.exec('DELETE FROM blobs'); } catch (e) { /* ignore */ } }
  const nowIso = time.resetClock();
  for (const fn of resetHooks) { try { fn(); } catch (e) { console.error('[store] onReset hook error:', e); } }
  flush();
  return nowIso;
}

let initialized = false;
/** เรียกครั้งเดียวตอนเริ่มเซิร์ฟเวอร์ · TEST_MODE=1 → seed ใหม่เสมอ · ไม่ตั้ง → โหลดจาก DB ถ้ามี */
function init() {
  if (initialized) return;
  initialized = true;
  openDb();
  if (TEST_MODE || process.env.RESEED === '1' || !load()) reset();
}

module.exports = {
  // config
  DB_PATH, TEST_MODE, BUGS, bug,
  // constants
  STATUS_TH, LEVEL_TH, ROLE_TH, LANDING, OPEN_STATUSES, CLOSED_STATUSES, AUDIT_EVENTS,
  SERVICE_DOCS, DOC_KEYS, MAX_FILE_BYTES, MAX_FILES, MIME, ERRORS,
  // errors
  HttpError, httpError, fail,
  // data
  state, mem, init, reset, onReset, save, flush, get dbKind() { return dbKind; },
  findCase, findDraft, findPayment, findFile, findDoc, findDocByCode, findUser, findCitizen, findCitizenByIdNo,
  getService, isHoliday,
  nextCaseNo, nextReceiptNo, nextDocNo, nextDraftId, nextPayRef, nextFileId, newVerifyCode,
  addAudit, addNotification, addTimeline, putBlob, fileContent,
  // utils
  isValidThaiId, formatId, maskId, maskName, fmtBaht, signDocument, verifySignature, makePdf, sniffType,
  hashPassword, checkPassword, encryptStr, decryptStr,
  // for tests/inspection
  buildSeed,
};

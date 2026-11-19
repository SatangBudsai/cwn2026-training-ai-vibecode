'use strict';
/**
 * src/drafts.js: drafts, fees, file attachments and payment (PromptPay QR simulator) · B03
 *
 * Rules (REQUIREMENTS / CONTRACT 6.2 / TEST-DATA)
 *   BR-04  SV-01 fee per copy (seed ฿20) × qty, qty is an integer 1–5. Otherwise 400 INVALID_QTY.
 *   BR-05  SV-03 area is an integer in sq.m. 1–100 → base fee (฿1,000) · 101–500 → base + ฿10 × (area − 100)
 *          · < 1 or not an integer → 400 INVALID_AREA · > 500 → 400 AREA_TOO_LARGE · SV-02 fixed fee (฿500)
 *   BR-06  file type is checked from magic bytes only (%PDF · FF D8 FF · 89 50 4E 47), not the extension or Content-Type
 *   BR-07  each file ≤ 5,242,880 bytes (this value is allowed) · at most 5 files per request (rejected files are not stored or counted, A-49)
 *   BR-08  required documents must be complete before payment · SV-03 plan must be PDF only (400 PLAN_NOT_PDF)
 *   BR-09  case number EG-<BE year of payment time>-<6 digits> is issued only on successful payment (counter in store, synchronous, never duplicated)
 *   BR-10  a QR is valid if (payment time − creation time) < 15:00 minutes → at exactly 15:00 it returns 410 QR_EXPIRED
 *   BR-11  amount must equal the fee exactly (422 AMOUNT_MISMATCH) · amount is locked when the draft enters PENDING_PAYMENT
 *          · a new QR for the same draft uses the locked amount · a repeated callback on the same ref is idempotent (duplicate:true, same numbers)
 *   BR-12  dueAt is computed once at payment time (sla.computeDueAt if available, otherwise this module's own function)
 *   A-47   draft ids DR-0001 / payment refs PP-0001 keep counting up and do not restart each year
 *   A-62   a draft can be deleted only while DRAFT / PENDING_PAYMENT and unpaid → the payment ref for that draft becomes 404
 *
 * BUG_MODE (BUGS.md)
 *   B01  SV-03 uses `> 101` instead of `≥ 101` → area 101 = ฿1,000 (102 is still ฿1,020)
 *   B02  file size uses `<` instead of `≤` → a file of exactly 5,242,880 bytes is rejected with FILE_TOO_LARGE
 *   B05  QR expiry uses `≤` instead of `<` → a QR aged exactly 15:00 can still be paid
 *
 * API (CONTRACT 6.2 + extra endpoints for the UI)
 *   POST   /api/drafts                       {serviceId, qty?, areaSqm?} → 201 {draftId, fee, ...}
 *   GET    /api/drafts                       → {items:[draft]} only DRAFT / PENDING_PAYMENT
 *   GET    /api/drafts/:id                   → draft (files, missing, payment) · someone else's / missing → 404
 *   PUT|PATCH /api/drafts/:id                {qty?, areaSqm?} → draft (change values; PENDING_PAYMENT whose values change → back to DRAFT)
 *   DELETE /api/drafts/:id                   → 204 · paid → 409 INVALID_STATE
 *   POST   /api/drafts/:id/files             multipart file + docKey → 201 {fileId, name, docKey, size, ...}
 *   DELETE /api/drafts/:id/files/:fileId     → 204
 *   POST   /api/drafts/:id/payment           → 201 {ref, amount, qrCreatedAt, qrExpiresAt, ...} · 409 MISSING_DOCS
 *   GET    /api/payments/:ref                → {ref, amount, status PENDING|PAID|EXPIRED, qrCreatedAt, qrExpiresAt, caseNo, receiptNo, paidAt}
 *   GET    /api/payments/:ref/qr.svg         simulated QR image (for qr-image)
 *   POST   /api/test/payments/:ref/pay       {amount} → 200 {status:'PAID', caseNo, receiptNo, duplicate} · 410 · 422 · 404
 *   GET    /api/fee?serviceId=&qty=&areaSqm= → {fee} or 400 per CONTRACT table 5 (UI computes fee-total from here)
 *   GET    /api/services                     → {items:[{id,name,fee,feeBase,feePerSqm,sla,docs}]}
 *   Registered only if no earlier module registered them (workflow.js/reports.js load later and can override):
 *   GET    /api/cases                        → {items:[...]} the citizen's own cases that have numbers
 *   GET    /api/cases/:caseNo/files · GET /api/files/:fileId   (A-59 · TC-RBAC-05)
 */

const crypto = require('crypto');
const store = require('./store');
const time = require('./time');

const QR_TTL_MS = 15 * 60 * 1000;                       // BR-10
const MAX_FILE_BYTES = store.MAX_FILE_BYTES || 5242880; // BR-07
const MAX_FILES = store.MAX_FILES || 5;
const SV3_BASE_AREA = 100;
const SV3_MAX_AREA = 500;
const QTY_MIN = 1;
const QTY_MAX = 5;
const EDITABLE = ['DRAFT', 'PENDING_PAYMENT'];
const DRAFT_STATUS_TH = { DRAFT: 'ร่าง', PENDING_PAYMENT: 'รอชำระเงิน', SUBMITTED: 'ส่งคำขอแล้ว' };
const PAY_STATUS_TH = { PENDING: 'รอชำระ', PAID: 'ชำระแล้ว', EXPIRED: 'QR หมดอายุ' };

/* ======================================================================
 * 1) Fees (BR-04 BR-05)
 * ==================================================================== */

/** strict integer conversion: number or a whole-number string only · anything else → NaN */
function toInt(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : NaN;
  if (typeof v === 'string' && /^\s*[+-]?\d+\s*$/.test(v)) return parseInt(v, 10);
  return NaN;
}

/** current fee settings (admin can change them) */
function feeConfig(serviceId) {
  const s = store.getService(serviceId);
  if (!s) return null;
  const base = s.feeBase !== undefined && s.feeBase !== null ? Number(s.feeBase) : Number(s.fee);
  return { fee: Number(s.fee), base, perSqm: Number(s.feePerSqm !== undefined && s.feePerSqm !== null ? s.feePerSqm : 10), sla: Number(s.sla) };
}

/**
 * Compute the fee from the input · returns {fee, qty, areaSqm} · invalid input → throw HttpError per CONTRACT table 5
 * input = {qty} for SV-01 · {areaSqm} for SV-03 · SV-02 needs no input
 */
function calcFee(serviceId, input = {}) {
  const cfg = feeConfig(serviceId);
  if (!cfg) store.fail('BAD_REQUEST', null, { message: 'ไม่พบบริการนี้' });
  if (serviceId === 'SV-01') {
    const qty = toInt(input.qty);
    if (!Number.isInteger(qty) || qty < QTY_MIN || qty > QTY_MAX) store.fail('INVALID_QTY');
    return { fee: cfg.fee * qty, qty, areaSqm: null };
  }
  if (serviceId === 'SV-03') {
    const raw = input.areaSqm !== undefined ? input.areaSqm : input.area;
    const area = toInt(raw);
    if (!Number.isInteger(area) || area < 1) store.fail('INVALID_AREA');
    if (area > SV3_MAX_AREA) store.fail('AREA_TOO_LARGE');
    // correct: area ≥ 101 adds the extra charge · B01: uses > 101 (area 101 stays at the base fee)
    const extra = store.bug('B01') ? area > SV3_BASE_AREA + 1 : area >= SV3_BASE_AREA + 1;
    const fee = extra ? cfg.base + cfg.perSqm * (area - SV3_BASE_AREA) : cfg.base;
    return { fee, qty: null, areaSqm: area };
  }
  return { fee: cfg.fee, qty: null, areaSqm: null };   // SV-02 fixed fee
}

/* ======================================================================
 * 2) Working days + dueAt (BR-12) — used when the payment creates a case
 * ==================================================================== */
function isBizDay(key) {
  if (time.isWeekend(key)) return false;
  if (store.bug('B03')) return true;                    // B03 (SLA bug): ignore the holiday table
  return !store.isHoliday(key);
}
function nextBizDay(key) {
  let d = key;
  do { d = time.addDays(d, 1); } while (!isBizDay(d));
  return d;
}
/** D0 = payment day if it is a working day and before 16:30:00, otherwise the next working day · dueAt = Nth working day after D0 at 16:30 */
function computeDueAtLocal(paidAtIso, slaDays) {
  const ms = time.toMs(paidAtIso);
  const key = time.dateKey(ms);
  const p = time.parts(ms);
  const beforeCutoff = p.hh * 3600 + p.mm * 60 + p.ss < 16 * 3600 + 30 * 60;
  let d = isBizDay(key) && beforeCutoff ? key : nextBizDay(key);
  for (let i = 0; i < slaDays; i++) d = nextBizDay(d);
  return time.toIso(time.fromDateKey(d, 16, 30, 0));
}
let slaMod;
function slaModule() {
  if (slaMod === undefined) { try { slaMod = require('./sla'); } catch (e) { slaMod = null; } }
  return slaMod;
}
/** Use sla.computeDueAt(paidAtIso, slaDays, serviceId) if present and returning a valid value, otherwise this module's function */
function computeDueAt(paidAtIso, slaDays, serviceId) {
  const sla = slaModule();
  if (sla && typeof sla.computeDueAt === 'function') {
    try {
      const v = sla.computeDueAt(paidAtIso, slaDays, serviceId);
      const iso = typeof v === 'string' ? time.toIso(v) : (typeof v === 'number' ? time.toIso(v) : null);
      if (iso && /T16:30:00\+07:00$/.test(iso)) return iso;
    } catch (e) { /* fallback */ }
  }
  return computeDueAtLocal(paidAtIso, slaDays);
}
/** SLA level for the citizen's case list (prefer functions in sla.js) */
function slaLevelOf(c, nowIso) {
  const sla = slaModule();
  if (sla) {
    for (const fn of ['slaLevel', 'levelOf', 'computeLevel', 'caseLevel']) {
      if (typeof sla[fn] === 'function') {
        try { const v = sla[fn](c, nowIso); const lv = v && typeof v === 'object' ? v.level : v; if (store.LEVEL_TH[lv]) return lv; } catch (e) { /* next */ }
      }
    }
  }
  if (store.CLOSED_STATUSES.includes(c.status)) return 'closed';
  if (c.status === 'NEED_FIX') return 'paused';
  if (!c.dueAt) return 'normal';
  const now = time.toMs(nowIso);
  if (now > time.toMs(c.dueAt)) return 'overdue';
  // days left = working days after today up to the due date (inclusive)
  const today = time.dateKey(now); const dueKey = time.dateKey(c.dueAt);
  let left = 0;
  for (let d = time.addDays(today, 1); d <= dueKey && left < 3; d = time.addDays(d, 1)) if (isBizDay(d)) left += 1;
  return left <= 1 ? 'near' : 'normal';
}

/* ======================================================================
 * 3) Required documents + file checks (BR-06 BR-07 BR-08)
 * ==================================================================== */
function serviceDocs(serviceId) { return store.SERVICE_DOCS[serviceId] || []; }
function allowedDocKeys(serviceId) { return serviceDocs(serviceId).map((d) => d.key).concat('extra'); }

/** names of missing required documents, in CONTRACT table 4.3 order */
function missingDocs(serviceId, fileIds) {
  const files = (fileIds || []).map(store.findFile).filter(Boolean);
  return serviceDocs(serviceId)
    .filter((d) => d.required && !files.some((f) => f.docKey === d.key && (!d.pdfOnly || f.type === 'pdf')))
    .map((d) => d.name);
}

/**
 * Check one file before storing it (other blocks can reuse this, e.g. the resubmit upload)
 * order: size → type (magic bytes) → plan PDF only → count · currentCount = files already attached
 * returns the type 'pdf'|'jpg'|'png'
 */
function checkFile(file, docKey, currentCount) {
  const data = file && file.data ? file.data : Buffer.alloc(0);
  const size = data.length;
  // correct: size ≤ 5,242,880 passes · B02: uses < (exactly 5,242,880 is rejected)
  const sizeOk = store.bug('B02') ? size < MAX_FILE_BYTES : size <= MAX_FILE_BYTES;
  if (!sizeOk) store.fail('FILE_TOO_LARGE');
  const type = store.sniffType(data);
  if (!type) store.fail('FILE_TYPE');
  if (docKey === 'plan' && type !== 'pdf') store.fail('PLAN_NOT_PDF');
  if ((currentCount || 0) + 1 > MAX_FILES) store.fail('FILE_COUNT');
  return type;
}

/** clean up a file name (strip path, control characters, limit length) */
function cleanName(name, type) {
  let s = String(name || '').replace(/[\u0000-\u001f\u007f]/g, '');
  s = s.split(/[\\/]/).pop().trim();
  if (!s) s = `file.${type || 'bin'}`;
  if (s.length > 200) s = s.slice(s.length - 200);
  return s;
}

/** store a file that passed the checks · owner = {draftId, caseNo, citizenId} → file record */
function saveUpload(file, docKey, type, owner) {
  const fileId = store.nextFileId();
  const rec = {
    fileId, name: cleanName(file.filename, type), docKey, size: file.data.length,
    mime: store.MIME[type], type,
    draftId: owner.draftId || null, caseNo: owner.caseNo || null, citizenId: owner.citizenId || null,
    uploadedAt: time.nowIso(), seed: false,
  };
  store.putBlob(fileId, file.data);
  store.state.files.push(rec);
  return rec;
}

function dropFile(fileId) {
  const i = store.state.files.findIndex((f) => f.fileId === fileId);
  if (i >= 0) store.state.files.splice(i, 1);
  store.mem.blobs.delete(fileId);
}

function fileView(f) {
  return { fileId: f.fileId, name: f.name, docKey: f.docKey, size: f.size, mime: f.mime, uploadedAt: f.uploadedAt || null };
}

/* ======================================================================
 * 4) Payment (BR-09 BR-10 BR-11)
 * ==================================================================== */
/** is the QR still payable (time rule only) · correct: age < 15:00 · B05: age ≤ 15:00 */
function qrUsable(p, nowMs) {
  if (p.superseded) return false;
  const age = nowMs - time.toMs(p.qrCreatedAt);
  return store.bug('B05') ? age <= QR_TTL_MS : age < QR_TTL_MS;
}
function paymentStatus(p, nowMs = time.now()) {
  if (p.status === 'PAID') return 'PAID';
  return qrUsable(p, nowMs) ? 'PENDING' : 'EXPIRED';
}
function paymentView(p) {
  const status = paymentStatus(p);
  return {
    ref: p.ref, draftId: p.draftId, amount: p.amount, status, statusText: PAY_STATUS_TH[status],
    qrCreatedAt: p.qrCreatedAt, qrExpiresAt: p.qrExpiresAt,
    paidAt: p.paidAt || null, caseNo: p.caseNo || null, receiptNo: p.receiptNo || null,
    qrPayload: qrPayload(p), qrImageUrl: `/api/payments/${encodeURIComponent(p.ref)}/qr.svg`,
  };
}
function qrPayload(p) {
  return `PROMPTPAY-SIMULATED|biller=EGOV-TEST-MUNICIPALITY|ref=${p.ref}|amount=${Number(p.amount).toFixed(2)}|expires=${p.qrExpiresAt}`;
}

/** simulated QR image (SVG 29×29 modules: 3 finder patterns + data from a hash of the payload) */
function qrSvg(payload) {
  const N = 29; const cell = 8; const q = 4;
  const bits = [];
  let h = crypto.createHash('sha256').update(payload).digest();
  while (bits.length < N * N) {
    for (const b of h) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    h = crypto.createHash('sha256').update(h).digest();
  }
  const finder = (x, y) => {
    for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
      const dx = x - fx; const dy = y - fy;
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
        if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return 0;
        if (dx === 0 || dy === 0 || dx === 6 || dy === 6) return 1;
        return dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4 ? 1 : 0;
      }
    }
    return -1;
  };
  let rects = '';
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const f = finder(x, y);
      const on = f === -1 ? bits[y * N + x] : f;
      if (on) rects += `<rect x="${(x + q) * cell}" y="${(y + q) * cell}" width="${cell}" height="${cell}"/>`;
    }
  }
  const size = (N + 2 * q) * cell;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR พร้อมเพย์จำลอง">`
    + `<rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}

/** create a case from a successful payment (synchronous: the counter never duplicates even if paid at the same time) */
function createCaseFromPayment(p, d) {
  const paidAt = time.nowIso();
  const svc = store.getService(d.serviceId);
  const caseNo = store.nextCaseNo(paidAt);
  const receiptNo = store.nextReceiptNo(paidAt);
  const slaDays = Number(svc && svc.sla) || 0;
  const dueAt = computeDueAt(paidAt, slaDays, d.serviceId);
  const citizen = store.findCitizen(d.citizenId);
  const isSv3 = d.serviceId === 'SV-03';
  const c = {
    caseNo, tag: null, serviceId: d.serviceId, serviceName: svc ? svc.name : d.serviceId,
    citizenId: d.citizenId, applicantName: citizen ? citizen.name : '',
    qty: d.qty === undefined ? null : d.qty, areaSqm: d.areaSqm === undefined ? null : d.areaSqm,
    fee: p.amount, status: 'SUBMITTED',
    step: isSv3 ? 1 : null, dept: 'registry', owner: null, issuer: null, worksOfficer: null,
    deptsVisited: ['registry'],
    paidAt, receiptNo, receiptAmount: p.amount, payRef: p.ref, draftId: d.draftId,
    dueAt, slaDays,
    closedAt: null, cancelledAt: null,
    returnCount: 0, returns: [], fixDeadline: null,
    approvedBy: null, approvedAt: null, rejectReason: null, docNo: null,
    files: (d.files || []).slice(),
    timeline: [],
    createdAt: paidAt,
  };
  store.addTimeline(c, { event: 'SUBMITTED', text: `ชำระเงินสำเร็จ ใบเสร็จ ${receiptNo} · ส่งคำขอแล้ว`, toStatus: 'SUBMITTED', at: paidAt });
  store.state.cases.push(c);
  for (const id of c.files) { const f = store.findFile(id); if (f) f.caseNo = caseNo; }

  p.status = 'PAID'; p.paidAt = paidAt; p.caseNo = caseNo; p.receiptNo = receiptNo;
  d.status = 'SUBMITTED'; d.caseNo = caseNo; d.updatedAt = paidAt;
  // other QRs of the same draft can no longer be used
  for (const ref of d.payRefs || []) {
    const o = store.findPayment(ref);
    if (o && o !== p && o.status !== 'PAID') o.superseded = true;
  }
  return c;
}

/* ======================================================================
 * 5) Draft views + access checks
 * ==================================================================== */
function ownDraft(req) {
  const d = store.findDraft(req.params.id);
  if (!d || d.citizenId !== req.user.citizenId) store.fail('NOT_FOUND', null, { message: 'ไม่พบร่างคำขอ' });
  return d;
}

/** amount shown: PENDING_PAYMENT = locked amount · DRAFT = computed from current settings (no lock yet, BR-11) */
function draftFee(d) {
  if (d.status !== 'DRAFT') return d.lockedAmount !== null && d.lockedAmount !== undefined ? d.lockedAmount : d.fee;
  try { return calcFee(d.serviceId, d).fee; } catch (e) { return d.fee; }
}

function latestPayment(d) {
  const refs = d.payRefs || [];
  for (let i = refs.length - 1; i >= 0; i--) { const p = store.findPayment(refs[i]); if (p) return p; }
  return null;
}

function draftView(d) {
  const svc = store.getService(d.serviceId);
  const files = (d.files || []).map(store.findFile).filter(Boolean);
  const pay = latestPayment(d);
  return {
    draftId: d.draftId, serviceId: d.serviceId, serviceName: svc ? svc.name : d.serviceId,
    status: d.status, statusText: DRAFT_STATUS_TH[d.status] || d.status,
    qty: d.qty === undefined ? null : d.qty, areaSqm: d.areaSqm === undefined ? null : d.areaSqm,
    fee: draftFee(d), lockedAmount: d.lockedAmount === undefined ? null : d.lockedAmount,
    files: files.map(fileView),
    missing: missingDocs(d.serviceId, d.files),
    maxFiles: MAX_FILES, maxFileBytes: MAX_FILE_BYTES,
    payment: pay ? paymentView(pay) : null,
    caseNo: d.caseNo || null,
    createdAt: d.createdAt, updatedAt: d.updatedAt,
  };
}

function requireEditable(d) {
  if (!EDITABLE.includes(d.status)) store.fail('INVALID_STATE');
}

/* ======================================================================
 * 6) Case files (A-59 · TC-RBAC-05)
 * ==================================================================== */
/** can this user see the case's files? · citizen who is not the owner / case missing → 404 · officer outside scope / other roles → 403 */
function assertCaseFileAccess(user, c) {
  if (user.role === 'citizen') {
    if (!c || c.citizenId !== user.citizenId) store.fail('NOT_FOUND');
    return;
  }
  if (user.role === 'head') { if (!c) store.fail('NOT_FOUND'); return; }
  if (user.role === 'officer') {
    if (!c) store.fail('NOT_FOUND');
    const visited = c.deptsVisited || [];
    if (user.dept === 'registry' && (visited.includes('registry') || c.dept === 'registry')) return;
    if (user.dept === 'works' && c.serviceId === 'SV-03'
      && (visited.includes('works') || c.dept === 'works' || (Number(c.step) || 0) >= 2)) return;
    store.fail('FORBIDDEN');
  }
  store.fail('FORBIDDEN');
}

function caseFiles(c) {
  const ids = new Set(c.files || []);
  for (const f of store.state.files) if (f.caseNo === c.caseNo) ids.add(f.fileId);
  return [...ids].map(store.findFile).filter(Boolean).sort((a, b) => (a.fileId < b.fileId ? -1 : 1));
}

function asciiName(name) { return String(name).replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_'); }

/* ======================================================================
 * 7) Routes
 * ==================================================================== */
function register(app) {
  const CIT = { roles: ['citizen'] };
  const has = (method, p) => (app.routes || []).some((r) => r.method === method && r.pattern === p);

  // --- service info + fee preview (UI uses these for fee-total / fee-error) ---
  if (!has('GET', '/api/services')) {
    app.get('/api/services', () => ({
      items: store.state.services.map((s) => ({
        id: s.id, name: s.name, fee: s.fee, feeBase: s.feeBase !== undefined ? s.feeBase : null,
        feePerSqm: s.feePerSqm !== undefined ? s.feePerSqm : null, sla: s.sla,
        docs: serviceDocs(s.id).map((d) => ({ key: d.key, name: d.name, required: !!d.required, pdfOnly: !!d.pdfOnly })),
      })),
    }));
  }
  app.get('/api/fee', (req) => {
    const q = req.query || {};
    const r = calcFee(q.serviceId, { qty: q.qty, areaSqm: q.areaSqm !== undefined ? q.areaSqm : q.area });
    return { serviceId: q.serviceId, fee: r.fee, feeText: store.fmtBaht(r.fee) };
  });

  // --- drafts ---
  app.post('/api/drafts', CIT, (req, res) => {
    const b = req.body || {};
    const serviceId = String(b.serviceId || '');
    if (!store.getService(serviceId)) store.fail('BAD_REQUEST', null, { message: 'ไม่พบบริการนี้' });
    const r = calcFee(serviceId, b);
    const now = time.nowIso();
    const d = {
      draftId: store.nextDraftId(), serviceId, citizenId: req.user.citizenId,
      qty: r.qty, areaSqm: r.areaSqm, fee: r.fee,
      status: 'DRAFT', files: [], lockedAmount: null, payRefs: [], caseNo: null,
      createdAt: now, updatedAt: now,
    };
    store.state.drafts.push(d);
    res.json(201, draftView(d));
  });

  app.get('/api/drafts', CIT, (req) => ({
    items: store.state.drafts
      .filter((d) => d.citizenId === req.user.citizenId && EDITABLE.includes(d.status))
      .sort((a, b) => (a.draftId < b.draftId ? 1 : -1))
      .map(draftView),
  }));

  app.get('/api/drafts/:id', CIT, (req) => draftView(ownDraft(req)));

  const updateDraft = (req) => {
    const d = ownDraft(req);
    requireEditable(d);
    const b = req.body || {};
    const input = {
      qty: b.qty !== undefined ? b.qty : d.qty,
      areaSqm: b.areaSqm !== undefined ? b.areaSqm : (b.area !== undefined ? b.area : d.areaSqm),
    };
    const r = calcFee(d.serviceId, input);
    const changed = r.qty !== (d.qty === undefined ? null : d.qty) || r.areaSqm !== (d.areaSqm === undefined ? null : d.areaSqm);
    if (changed && d.status === 'PENDING_PAYMENT') {
      // values changed after a QR was created → back to DRAFT, unlock the amount, old QRs can no longer be used
      d.status = 'DRAFT'; d.lockedAmount = null;
      for (const ref of d.payRefs || []) { const p = store.findPayment(ref); if (p && p.status !== 'PAID') p.superseded = true; }
    }
    d.qty = r.qty; d.areaSqm = r.areaSqm;
    if (d.status === 'DRAFT') d.fee = r.fee;
    d.updatedAt = time.nowIso();
    return draftView(d);
  };
  app.put('/api/drafts/:id', CIT, updateDraft);
  app.patch('/api/drafts/:id', CIT, updateDraft);

  app.delete('/api/drafts/:id', CIT, (req, res) => {
    const d = ownDraft(req);
    const paid = (d.payRefs || []).some((ref) => { const p = store.findPayment(ref); return p && p.status === 'PAID'; });
    if (!EDITABLE.includes(d.status) || paid || d.caseNo) store.fail('INVALID_STATE');
    // delete the payment refs (→ 404) and the files that belong to this draft
    const refs = new Set(d.payRefs || []);
    store.state.payments = store.state.payments.filter((p) => !(refs.has(p.ref) || p.draftId === d.draftId));
    for (const id of d.files || []) dropFile(id);
    store.state.drafts = store.state.drafts.filter((x) => x !== d);
    res.noContent();
  });

  // --- attach files ---
  app.post('/api/drafts/:id/files', CIT, (req, res) => {
    const d = ownDraft(req);
    requireEditable(d);
    const uploads = (req.files || []).filter((f) => f.field === 'file' || f.field === 'files' || f.field === 'files[]');
    const list = uploads.length ? uploads : (req.files || []);
    if (!list.length) store.fail('BAD_REQUEST', null, { message: 'กรุณาเลือกไฟล์' });
    const docKey = String((req.body && req.body.docKey) || 'extra').trim();
    if (!allowedDocKeys(d.serviceId).includes(docKey)) store.fail('BAD_REQUEST', null, { message: 'ประเภทเอกสารไม่ถูกต้องสำหรับบริการนี้' });
    // check every file before storing (all-or-nothing · rejected files are not stored or counted)
    const types = list.map((f, i) => checkFile(f, docKey, d.files.length + i));
    const saved = list.map((f, i) => saveUpload(f, docKey, types[i], { draftId: d.draftId, citizenId: d.citizenId }));
    for (const f of saved) d.files.push(f.fileId);
    d.updatedAt = time.nowIso();
    const out = Object.assign(fileView(saved[0]), { missing: missingDocs(d.serviceId, d.files), count: d.files.length });
    if (saved.length > 1) out.items = saved.map(fileView);
    res.json(201, out);
  });

  app.delete('/api/drafts/:id/files/:fileId', CIT, (req, res) => {
    const d = ownDraft(req);
    requireEditable(d);
    const i = (d.files || []).indexOf(req.params.fileId);
    if (i < 0) store.fail('NOT_FOUND', null, { message: 'ไม่พบไฟล์' });
    d.files.splice(i, 1);
    dropFile(req.params.fileId);
    d.updatedAt = time.nowIso();
    res.noContent();
  });

  // --- create QR (enter PENDING_PAYMENT + lock the amount) ---
  app.post('/api/drafts/:id/payment', CIT, (req, res) => {
    const d = ownDraft(req);
    requireEditable(d);
    const missing = missingDocs(d.serviceId, d.files);
    if (missing.length) store.fail('MISSING_DOCS', { missing }, { message: `ยังขาดเอกสาร: ${missing.join(', ')}` });
    if (d.status === 'DRAFT' || d.lockedAmount === null || d.lockedAmount === undefined) {
      const r = calcFee(d.serviceId, d);              // amount at the moment it enters PENDING_PAYMENT (BR-11)
      d.fee = r.fee; d.lockedAmount = r.fee; d.status = 'PENDING_PAYMENT';
    }
    // the new QR replaces the old ones (old refs can no longer be paid)
    for (const ref of d.payRefs || []) { const o = store.findPayment(ref); if (o && o.status !== 'PAID') o.superseded = true; }
    const nowMs = time.now();
    const p = {
      ref: store.nextPayRef(), draftId: d.draftId, citizenId: d.citizenId, amount: d.lockedAmount,
      qrCreatedAt: time.toIso(nowMs), qrExpiresAt: time.toIso(nowMs + QR_TTL_MS),
      status: 'PENDING', paidAt: null, caseNo: null, receiptNo: null,
    };
    store.state.payments.push(p);
    d.payRefs = (d.payRefs || []).concat(p.ref);
    d.updatedAt = p.qrCreatedAt;
    res.json(201, paymentView(p));
  });

  // --- payment status / QR image (owning citizen only · others → 404) ---
  const ownPayment = (req) => {
    const p = store.findPayment(req.params.ref);
    if (!p || p.citizenId !== req.user.citizenId) store.fail('NOT_FOUND', null, { message: 'ไม่พบรายการชำระเงิน' });
    return p;
  };
  app.get('/api/payments/:ref', CIT, (req) => paymentView(ownPayment(req)));
  app.get('/api/payments/:ref/qr.svg', CIT, (req, res) => {
    const p = ownPayment(req);
    res.send(200, qrSvg(qrPayload(p)), { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' });
  });

  // --- bank callback (test hook · server returns 404 when TEST_MODE≠1) ---
  app.post('/api/test/payments/:ref/pay', (req) => {
    const p = store.findPayment(req.params.ref);
    if (!p) store.fail('NOT_FOUND', null, { message: 'ไม่พบรายการชำระเงิน' });
    if (p.status === 'PAID') {
      return { status: 'PAID', caseNo: p.caseNo, receiptNo: p.receiptNo, duplicate: true, amount: p.amount, paidAt: p.paidAt };
    }
    const d = store.findDraft(p.draftId);
    if (!d) store.fail('NOT_FOUND', null, { message: 'ไม่พบรายการชำระเงิน' });
    if (!qrUsable(p, time.now())) store.fail('QR_EXPIRED');
    const b = req.body || {};
    const amount = typeof b.amount === 'string' && b.amount.trim() !== '' ? Number(b.amount) : b.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount !== Number(p.amount)) store.fail('AMOUNT_MISMATCH');
    if (d.status !== 'PENDING_PAYMENT' || d.caseNo) store.fail('INVALID_STATE');
    const c = createCaseFromPayment(p, d);
    return { status: 'PAID', caseNo: c.caseNo, receiptNo: c.receiptNo, duplicate: false, amount: p.amount, paidAt: c.paidAt, dueAt: c.dueAt };
  });

  // --- the citizen's own case list (fallback · workflow.js/reports.js can override) ---
  if (!has('GET', '/api/cases')) {
    app.get('/api/cases', CIT, (req) => {
      const now = time.nowIso();
      return {
        items: store.state.cases
          .filter((c) => c.citizenId === req.user.citizenId)
          .sort((a, b) => (a.caseNo < b.caseNo ? 1 : -1))
          .map((c) => ({
            caseNo: c.caseNo, serviceId: c.serviceId, serviceName: c.serviceName, status: c.status,
            statusText: store.STATUS_TH[c.status], step: c.step === undefined ? null : c.step,
            fee: c.fee, paidAt: c.paidAt, dueAt: c.dueAt, slaLevel: slaLevelOf(c, now), closedAt: c.closedAt || null,
          })),
      };
    });
  }

  // --- case attachments (A-59) ---
  if (!has('GET', '/api/cases/:caseNo/files')) {
    app.get('/api/cases/:caseNo/files', { auth: true }, (req) => {
      const c = store.findCase(req.params.caseNo);
      assertCaseFileAccess(req.user, c);
      return { items: caseFiles(c).map(fileView) };
    });
  }
  if (!has('GET', '/api/files/:fileId')) {
    app.get('/api/files/:fileId', { auth: true }, (req, res) => {
      const f = store.findFile(req.params.fileId);
      if (!f) store.fail('NOT_FOUND', null, { message: 'ไม่พบไฟล์' });
      const u = req.user;
      if (f.caseNo) {
        assertCaseFileAccess(u, store.findCase(f.caseNo));
      } else if (!(u.role === 'citizen' && f.citizenId === u.citizenId)) {
        // draft files that are not yet a case: only the owner can see them (others → 404, do not reveal existence)
        store.fail('NOT_FOUND', null, { message: 'ไม่พบไฟล์' });
      }
      const buf = store.fileContent(f);
      if (!buf) store.fail('NOT_FOUND', null, { message: 'ไม่พบไฟล์' });
      const type = store.sniffType(buf) || f.type;
      const name = f.name || `${f.fileId}.${type || 'bin'}`;
      const disp = req.query && req.query.inline === '1' ? 'inline' : 'attachment';
      res.send(200, buf, {
        'Content-Type': store.MIME[type] || f.mime || 'application/octet-stream',
        'Content-Disposition': `${disp}; filename="${asciiName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'private, no-store',
      });
    });
  }
}

module.exports = {
  register,
  // for other blocks (workflow resubmit / reports / tests)
  calcFee, feeConfig, checkFile, saveUpload, missingDocs, computeDueAt, computeDueAtLocal,
  paymentStatus, qrUsable, draftView, paymentView, assertCaseFileAccess, caseFiles,
  QR_TTL_MS, MAX_FILE_BYTES, MAX_FILES,
};

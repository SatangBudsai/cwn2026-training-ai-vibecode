'use strict';
// B03: แคตตาล็อก/ค่าธรรมเนียม · ร่าง · แนบไฟล์ · ตรวจเอกสารบังคับ · ชำระ PromptPay QR จำลอง · ออกเลขคำขอ+ใบเสร็จ · ลบร่าง
// (FR-04..FR-08, ส่วนลบร่างของ FR-10) · อ้าง ctx.sla / ctx.audit / ctx.vault ตอนเรียกใช้เท่านั้น
const crypto = require('node:crypto');

const MAX_FILE = 5242880;
const MAX_FILES = 5;
const QR_MS = 15 * 60 * 1000;
const DOC_NAME = { 'id-card': 'บัตรประชาชน', map: 'แผนที่ตั้ง', 'site-photo': 'ภาพสถานที่', plan: 'แบบแปลน', deed: 'โฉนด' };
const SERVICES = {
  'SV-01': { name: 'ขอหนังสือรับรอง', docs: ['id-card'], optional: [] },
  'SV-02': { name: 'ขออนุญาตประกอบกิจการ', docs: ['id-card', 'map'], optional: ['site-photo'] },
  'SV-03': { name: 'ขออนุญาตก่อสร้าง/ต่อเติมอาคาร', docs: ['id-card', 'plan', 'deed'], optional: [] },
};
const MSG = {
  qty: 'จำนวนฉบับต้อง 1–5 ฉบับ',
  area: 'กรุณาระบุพื้นที่ 1–500 ตร.ม.',
  areaBig: 'พื้นที่เกิน 500 ตร.ม. กรุณายื่นที่สำนักงาน',
  big: 'ไฟล์ใหญ่เกิน 5 MB',
  type: 'รองรับเฉพาะไฟล์ PDF, JPG, PNG',
  count: 'แนบได้สูงสุด 5 ไฟล์ต่อคำขอ',
  plan: 'แบบแปลนต้องเป็นไฟล์ PDF เท่านั้น',
  qrExpired: 'QR หมดอายุ กรุณาสร้าง QR ใหม่',
  amount: 'ยอดเงินไม่ตรงกับค่าธรรมเนียม',
  notFound: 'ไม่พบข้อมูล',
  state: 'สถานะคำขอไม่ถูกต้องสำหรับรายการนี้',
};
const pad = (n, w) => String(n).padStart(w, '0');

function sniff(buf) {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return { ext: 'pdf', mime: 'application/pdf' };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  return null;
}
const tinyPdf = (label) => Buffer.from(`%PDF-1.4\n% ${label}\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const E = (status, code, message, extra) => Object.assign({ status, code, message }, extra || {});

exports.register = function register(router, ctx) {
  const { clock, store } = ctx;
  const mem = () => store.mem;

  // ---------- ค่าธรรมเนียม (BR-04, BR-05) ----------
  // คืน {fee} หรือ throw E(400,...)
  function computeFee(serviceId, body) {
    const sv = mem().services[serviceId];
    if (!SERVICES[serviceId] || !sv) throw E(400, 'INVALID_SERVICE', 'ไม่พบบริการ');
    if (serviceId === 'SV-01') {
      const q = body.qty === undefined || body.qty === null || body.qty === '' ? 1 : Number(body.qty);
      if (typeof body.qty === 'boolean' || !Number.isInteger(q) || q < 1 || q > 5) throw E(400, 'INVALID_QTY', MSG.qty);
      return { fee: sv.fee * q, qty: q };
    }
    if (serviceId === 'SV-02') return { fee: sv.fee };
    const a = body.areaSqm === undefined || body.areaSqm === null || body.areaSqm === '' || typeof body.areaSqm === 'boolean' ? NaN : Number(body.areaSqm);
    if (!Number.isInteger(a) || a < 1) throw E(400, 'INVALID_AREA', MSG.area);
    if (a > 500) throw E(400, 'AREA_TOO_LARGE', MSG.areaBig);
    const over = ctx.bug('B01') ? a > 101 : a > 100; // B01: พื้นที่ 101 คิดผิด
    return { fee: sv.feeBase + (over ? sv.feePerSqm * (a - 100) : 0), areaSqm: a };
  }

  // ---------- ตัวช่วย ----------
  const filesOf = (d) => d.fileIds.map((id) => mem().files.get(id)).filter(Boolean).map((f) => f.meta);
  const fileView = (m) => ({ fileId: m.fileId, name: m.name, docKey: m.docKey, size: m.size });
  function missingKeys(d) {
    const have = new Set(filesOf(d).map((m) => m.docKey));
    return SERVICES[d.serviceId].docs.filter((k) => !have.has(k));
  }
  const feeOf = (d) => (d.feeLocked != null ? d.feeLocked : computeFee(d.serviceId, d).fee);
  function payStatus(p) {
    if (p.status === 'PAID') return 'PAID';
    return clock.nowMs() - p.qrCreatedMs >= QR_MS ? 'EXPIRED' : 'PENDING';
  }
  const payView = (p) => ({
    ref: p.ref, amount: p.amount, status: payStatus(p),
    qrCreatedAt: clock.toISO(p.qrCreatedMs), qrExpiresAt: clock.toISO(p.qrCreatedMs + QR_MS),
    caseNo: p.caseNo || null, receiptNo: p.receiptNo || null, paidAt: p.paidMs ? clock.toISO(p.paidMs) : null,
  });
  function latestPayment(d) {
    let last = null;
    for (const p of mem().payments.values()) if (p.draftId === d.draftId) last = p;
    return last;
  }
  function view(d) {
    const missing = missingKeys(d);
    const p = latestPayment(d);
    return {
      draftId: d.draftId, serviceId: d.serviceId, status: d.status, fee: feeOf(d),
      qty: d.qty == null ? null : d.qty, areaSqm: d.areaSqm == null ? null : d.areaSqm,
      files: filesOf(d).map(fileView), missing: missing.map((k) => DOC_NAME[k]),
      payment: p ? payView(p) : null, caseNo: d.caseNo || null,
    };
  }
  // ร่างของผู้ใช้ปัจจุบัน หรือ throw 404
  function ownDraft(req, u) {
    const d = mem().drafts.get(req.params.id);
    if (!d || d.owner !== u.username) throw E(404, 'NOT_FOUND', MSG.notFound);
    return d;
  }
  const isOpen = (d) => d.status === 'DRAFT' || d.status === 'PENDING_PAYMENT';
  function newDraft(owner, serviceId, input) {
    const c = computeFee(serviceId, input);
    const d = {
      draftId: 'DR-' + pad(store.nextId('draft'), 4), owner, serviceId,
      qty: c.qty == null ? null : c.qty, areaSqm: c.areaSqm == null ? null : c.areaSqm,
      status: 'DRAFT', feeLocked: null, fileIds: [], caseNo: null, createdMs: clock.nowMs(),
    };
    mem().drafts.set(d.draftId, d);
    return d;
  }
  function addFile(d, docKey, name, buffer, mime) {
    const fileId = 'FL-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const meta = { fileId, name, docKey, size: buffer.length, mime, draftId: d.draftId, owner: d.owner, caseNo: null };
    mem().files.set(fileId, { meta, buffer });
    d.fileIds.push(fileId);
    return meta;
  }
  function dropFile(d, fileId) {
    mem().files.delete(fileId);
    d.fileIds = d.fileIds.filter((x) => x !== fileId);
  }
  function newPayment(d) {
    const p = {
      ref: 'PP-' + pad(store.nextId('pay'), 4), draftId: d.draftId, owner: d.owner,
      amount: d.feeLocked, qrCreatedMs: clock.nowMs(), status: 'PENDING', caseNo: null, receiptNo: null, paidMs: null,
    };
    mem().payments.set(p.ref, p);
    return p;
  }

  // ---------- API ----------
  const citizen = (req, res) => ctx.requireRole(req, res, ['citizen']);
  const wrap = (fn) => async (req, res) => {
    try { return await fn(req, res); } catch (e) {
      if (e && e.status && e.code) return ctx.err(res, e.status, e.code, e.message, e.missing ? { missing: e.missing } : undefined);
      throw e;
    }
  };

  router.add('GET', '/api/services', (req, res) => {
    const items = Object.keys(SERVICES).map((id) => {
      const sv = mem().services[id];
      return { id, name: SERVICES[id].name, fee: sv.fee, feeBase: sv.feeBase, feePerSqm: sv.feePerSqm, sla: sv.sla,
        docs: SERVICES[id].docs.map((k) => ({ docKey: k, name: DOC_NAME[k], required: true, pdfOnly: k === 'plan' }))
          .concat(SERVICES[id].optional.map((k) => ({ docKey: k, name: DOC_NAME[k], required: false, pdfOnly: false }))) };
    });
    ctx.json(res, 200, { items });
  });

  // คำนวณค่าธรรมเนียมโดยไม่บันทึก (ใช้กับ fee-total/fee-error ในหน้า)
  router.add('POST', '/api/fee/calc', wrap((req, res) => {
    if (!citizen(req, res)) return;
    const b = req.body || {};
    ctx.json(res, 200, { fee: computeFee(b.serviceId, b).fee });
  }));

  router.add('POST', '/api/drafts', wrap((req, res) => {
    const u = citizen(req, res); if (!u) return;
    const b = req.body || {};
    const d = newDraft(u.username, b.serviceId, b);
    ctx.json(res, 201, { draftId: d.draftId, fee: feeOf(d) });
  }));

  router.add('GET', '/api/drafts', wrap((req, res) => {
    const u = citizen(req, res); if (!u) return;
    const items = [...mem().drafts.values()].filter((d) => d.owner === u.username && isOpen(d)).map(view);
    ctx.json(res, 200, { items });
  }));

  router.add('GET', '/api/drafts/:id', wrap((req, res) => {
    const u = citizen(req, res); if (!u) return;
    ctx.json(res, 200, view(ownDraft(req, u)));
  }));

  // แก้ร่าง (จำนวนฉบับ/พื้นที่) เมื่อกลับมาทำต่อ
  const update = wrap((req, res) => {
    const u = citizen(req, res); if (!u) return;
    const d = ownDraft(req, u);
    if (d.status !== 'DRAFT') throw E(409, 'INVALID_STATE', MSG.state);
    const b = req.body || {};
    const c = computeFee(d.serviceId, { qty: b.qty !== undefined ? b.qty : d.qty, areaSqm: b.areaSqm !== undefined ? b.areaSqm : d.areaSqm });
    d.qty = c.qty == null ? null : c.qty;
    d.areaSqm = c.areaSqm == null ? null : c.areaSqm;
    ctx.json(res, 200, view(d));
  });
  router.add('PUT', '/api/drafts/:id', update);
  router.add('PATCH', '/api/drafts/:id', update);

  router.add('DELETE', '/api/drafts/:id', wrap((req, res) => {
    const u = citizen(req, res); if (!u) return;
    const d = ownDraft(req, u);
    if (!isOpen(d)) throw E(409, 'INVALID_STATE', MSG.state);
    for (const id of [...d.fileIds]) mem().files.delete(id);
    for (const [ref, p] of [...mem().payments]) if (p.draftId === d.draftId) mem().payments.delete(ref);
    mem().drafts.delete(d.draftId);
    res.statusCode = 204; res.end();
  }));

  router.add('POST', '/api/drafts/:id/files', wrap(async (req, res) => {
    const u = citizen(req, res); if (!u) return;
    const d = ownDraft(req, u);
    if (d.status !== 'DRAFT') throw E(409, 'INVALID_STATE', MSG.state);
    let mp;
    try { mp = await ctx.parseMultipart(req); } catch { throw E(400, 'INVALID_UPLOAD', 'รูปแบบการอัปโหลดไม่ถูกต้อง'); }
    const f = (mp.files || []).find((x) => x.field === 'file') || (mp.files || [])[0];
    if (!f) throw E(400, 'FILE_REQUIRED', 'กรุณาเลือกไฟล์');
    const docKey = String((mp.fields && mp.fields.docKey) || 'extra');
    if (docKey !== 'extra' && !SERVICES[d.serviceId].docs.concat(SERVICES[d.serviceId].optional).includes(docKey)) {
      throw E(400, 'INVALID_DOC_KEY', 'ประเภทเอกสารไม่ถูกต้อง');
    }
    const buf = f.buffer;
    if (ctx.bug('B02') ? buf.length >= MAX_FILE : buf.length > MAX_FILE) throw E(400, 'FILE_TOO_LARGE', MSG.big);
    const kind = sniff(buf);
    if (!kind) throw E(400, 'FILE_TYPE', MSG.type);
    if (docKey === 'plan' && kind.ext !== 'pdf') throw E(400, 'PLAN_NOT_PDF', MSG.plan);
    const replaced = docKey === 'extra' ? [] : filesOf(d).filter((m) => m.docKey === docKey);
    if (d.fileIds.length - replaced.length + 1 > MAX_FILES) throw E(400, 'FILE_COUNT', MSG.count);
    for (const m of replaced) dropFile(d, m.fileId);
    const meta = addFile(d, docKey, f.filename || ('file.' + kind.ext), buf, kind.mime);
    ctx.json(res, 201, fileView(meta));
  }));

  router.add('DELETE', '/api/drafts/:id/files/:fileId', wrap((req, res) => {
    const u = citizen(req, res); if (!u) return;
    const d = ownDraft(req, u);
    if (d.status !== 'DRAFT') throw E(409, 'INVALID_STATE', MSG.state);
    if (!d.fileIds.includes(req.params.fileId)) throw E(404, 'NOT_FOUND', MSG.notFound);
    dropFile(d, req.params.fileId);
    res.statusCode = 204; res.end();
  }));

  router.add('POST', '/api/drafts/:id/payment', wrap((req, res) => {
    const u = citizen(req, res); if (!u) return;
    const d = ownDraft(req, u);
    if (!isOpen(d)) throw E(409, 'INVALID_STATE', MSG.state);
    const miss = missingKeys(d);
    if (miss.length) {
      const names = miss.map((k) => DOC_NAME[k]);
      throw E(409, 'MISSING_DOCS', 'ยังขาดเอกสาร: ' + names.join(', '), { missing: names });
    }
    if (d.feeLocked == null) { d.feeLocked = computeFee(d.serviceId, d).fee; d.status = 'PENDING_PAYMENT'; } // BR-11 ล็อกยอด
    const p = newPayment(d);
    ctx.json(res, 201, { ref: p.ref, amount: p.amount, qrCreatedAt: clock.toISO(p.qrCreatedMs), qrExpiresAt: clock.toISO(p.qrCreatedMs + QR_MS) });
  }));

  router.add('GET', '/api/payments/:ref', wrap((req, res) => {
    const u = citizen(req, res); if (!u) return;
    const p = mem().payments.get(req.params.ref);
    if (!p || p.owner !== u.username) throw E(404, 'NOT_FOUND', MSG.notFound);
    ctx.json(res, 200, payView(p));
  }));

  // ---------- ชำระสำเร็จ: ออกเลขคำขอ + ใบเสร็จ + สร้างคำขอ (BR-09, BR-11, BR-12) ----------
  function settle(p, d) {
    const now = clock.nowMs();
    const yearBE = clock.parts(now).y + 543;
    const prefix = `EG-${yearBE}-`;
    let max = 0;
    for (const k of mem().cases.keys()) if (k.startsWith(prefix)) max = Math.max(max, parseInt(k.slice(prefix.length), 10) || 0);
    const seq = pad(max + 1, 6);
    const caseNo = prefix + seq;
    const receiptNo = `RC-${yearBE}-${seq}`;
    const sv = mem().services[d.serviceId];
    const dueAtMs = ctx.sla.dueAt(now, sv.sla); // ctx.sla จัดการ D0 / วันหยุด (คำนวณครั้งเดียว)
    const files = filesOf(d);
    mem().cases.set(caseNo, {
      caseNo, serviceId: d.serviceId, status: 'SUBMITTED', step: d.serviceId === 'SV-03' ? 1 : null,
      dept: 'registry', fee: p.amount, qty: d.qty, areaSqm: d.areaSqm,
      paidAtMs: now, dueAtMs, owner: '', returnCount: 0, returnedAtMs: null, closedAtMs: null,
      applicant: d.owner, applicantUsername: d.owner, draftId: d.draftId, paymentRef: p.ref, receiptNo,
      fileIds: files.map((m) => m.fileId), docNo: null, verifyCode: null,
      timeline: [{ event: 'SUBMITTED', toStatus: 'SUBMITTED', timeMs: now, username: d.owner, detail: '' }],
    });
    for (const m of files) m.caseNo = caseNo;
    p.status = 'PAID'; p.paidMs = now; p.caseNo = caseNo; p.receiptNo = receiptNo;
    d.status = 'SUBMITTED'; d.caseNo = caseNo;
    for (const fn of (ctx.onCaseCreated || [])) { try { fn(mem().cases.get(caseNo)); } catch { /* ไม่ให้กระทบการชำระ */ } }
    return { caseNo, receiptNo };
  }

  // ctx.testHooks.pay(ref, body) -> {status, body} (CONTRACT 8)
  ctx.testHooks.pay = function pay(ref, body) {
    const p = mem().payments.get(ref);
    if (!p) return { status: 404, body: { code: 'NOT_FOUND', message: MSG.notFound } };
    if (p.status === 'PAID') return { status: 200, body: { status: 'PAID', caseNo: p.caseNo, receiptNo: p.receiptNo, duplicate: true } };
    const age = clock.nowMs() - p.qrCreatedMs;
    if (ctx.bug('B05') ? age > QR_MS : age >= QR_MS) return { status: 410, body: { code: 'QR_EXPIRED', message: MSG.qrExpired } };
    const amt = body && body.amount;
    if (typeof amt === 'boolean' || amt === null || amt === undefined || amt === '' || Number(amt) !== p.amount) {
      return { status: 422, body: { code: 'AMOUNT_MISMATCH', message: MSG.amount } };
    }
    const d = mem().drafts.get(p.draftId);
    if (!d) return { status: 404, body: { code: 'NOT_FOUND', message: MSG.notFound } };
    if (d.status === 'SUBMITTED') return { status: 409, body: { code: 'INVALID_STATE', message: MSG.state } };
    const r = settle(p, d);
    return { status: 200, body: { status: 'PAID', caseNo: r.caseNo, receiptNo: r.receiptNo, duplicate: false } };
  };

  // ---------- seed (TEST-DATA 4.2) ----------
  ctx.onReset(() => {
    const u = store.users.findByIdNo('1101700123456');
    if (!u) return;
    const d1 = { draftId: 'DR-0001', owner: u.username, serviceId: 'SV-01', qty: 2, areaSqm: null, status: 'DRAFT', feeLocked: null, fileIds: [], caseNo: null, createdMs: clock.nowMs() };
    const d2 = { draftId: 'DR-0002', owner: u.username, serviceId: 'SV-02', qty: null, areaSqm: null, status: 'PENDING_PAYMENT', feeLocked: 500, fileIds: [], caseNo: null, createdMs: clock.nowMs() };
    mem().drafts.set(d1.draftId, d1);
    mem().drafts.set(d2.draftId, d2);
    addFile(d2, 'id-card', 'id-card.pdf', tinyPdf('id-card'), 'application/pdf');
    addFile(d2, 'map', 'map.pdf', tinyPdf('map'), 'application/pdf');
    const created = Date.parse('2026-12-01T08:55:00+07:00');
    mem().payments.set('PP-0001', { ref: 'PP-0001', draftId: 'DR-0002', owner: u.username, amount: 500, qrCreatedMs: created, status: 'PENDING', caseNo: null, receiptNo: null, paidMs: null });
    store.setCounter('draft', 2);
    store.setCounter('pay', 1);
  });
};

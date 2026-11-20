'use strict';
/**
 * src/vault.js — PDPA: ปิดบังข้อมูลส่วนบุคคล + แสดงเลขเต็ม (unmask) + ด่านกรอง response ของเจ้าหน้าที่ · B06
 *
 * ── สิ่งที่โมดูลนี้ทำ ──
 * 1) At rest (NFR-04): store.js เข้ารหัส idNo/mobile (และสตริงที่หน้าตาเหมือนเลขบัตร/เบอร์) ด้วย AES-256-GCM
 *    ก่อนลง SQLite ที่ DB_PATH อยู่แล้ว (store.encryptStr / decryptStr · prefix 'enc:v1:') · โมดูลนี้ re-export ให้ใช้
 *    และมี selfCheck() ไว้ตรวจว่าไฟล์ DB ไม่มีค่าดิบ
 * 2) POST /api/officer/cases/:caseNo/unmask (officer · head) — เหตุผลบังคับ (trim ว่าง → 400 REASON_REQUIRED ไม่บันทึก)
 *    สำเร็จ → 200 {"idNo"} + Audit UNMASK (detail = เหตุผล) · route นี้ถูก "ตรึง" เป็นของ vault เสมอ
 * 3) ด่านกรอง (guard) ครอบ handler ของทุก route /api/* (รวมของโมดูลที่โหลดทีหลัง — ครอบซ้ำใน tick ก่อนทุก request):
 *    ผู้ใช้บทบาทเจ้าหน้าที่ (officer head executive auditor admin) จะไม่ได้รับ key idNo/mobile/phone ใด ๆ
 *    และสตริงเลข 13 หลัก / d-dddd-ddddd-dd-d / เบอร์ 0xxxxxxxxx ถูกแทนด้วยค่าปิดบัง (BR-24 · TC-PDPA-02)
 *    key idNo ที่ถูกตัดจะถูกแทนด้วย idMasked (ถ้ายังไม่มี) · ยกเว้น route unmask เท่านั้น
 * 4) route สำรอง GET /api/cases/:caseNo และ GET /api/officer/queue (ถ้า workflow.js ลงทะเบียน path เดียวกันทีหลัง ของเขาชนะ
 *    แต่ยังผ่านด่านกรองข้อ 3 เสมอ)
 *
 * ── จุดเปิดบั๊ก (BUG_MODE) ──
 *   B06  IDOR: ประชาชนเปิดคำขอของคนอื่นได้ ทั้ง API GET /api/cases/:caseNo (ใครเป็นผู้ทำ handler ก็ตาม: ด่านกรองสวมสิทธิ์เจ้าของให้)
 *        และหน้า /citizen/cases/:caseNo (ดักก่อน server.js ตรวจเจ้าของ → ตอบ 200 citizen-case.html)
 *   B09  GET /api/officer/queue ใส่ "idNo" เลขเต็มกลับเข้าไปในทุกแถว (หน้าจอยังใช้ idMasked จึงยังปิดบัง)
 *   B11  unmask สำเร็จแต่ไม่บันทึก Audit UNMASK
 *
 * ── ตัวช่วยสำหรับโมดูลอื่น ──
 *   const vault = require('./vault');
 *   vault.maskId('3100600987659') → 'X-XXXX-XXXXX-65-9' · vault.formatId(...) · vault.maskName('สมชาย ใจดี') → 'สมชาย ใ***'
 *   vault.maskMobile('0812345678') → 'XXX-XXX-5678'
 *   vault.idNoOfCase(c) → เลขเต็ม (ใช้ภายใน server เท่านั้น ห้ามส่งให้เจ้าหน้าที่)
 *   vault.caseView(c, user)  → JSON ตาม CONTRACT 6.7 (เจ้าของได้ idNo · เจ้าหน้าที่ได้ idMasked)
 *   vault.queueItem(c)       → แถวคิวตาม CONTRACT 6.3 (มี idMasked ไม่มี idNo)
 *   vault.sanitizeForStaff(obj) → สำเนาที่ตัด PII แล้ว
 *   vault.isStaff(user)
 */

const fs = require('fs');
const path = require('path');
const store = require('./store');
const time = require('./time');

const STAFF_ROLES = ['officer', 'head', 'executive', 'auditor', 'admin'];
const UNMASK_PATH = '/api/officer/cases/:caseNo/unmask';
const QUEUE_PATH = '/api/officer/queue';
const CASE_PATH = '/api/cases/:caseNo';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const WRAPPED = Symbol('vault.wrapped');

/* ======================================================================
 * 1) ปิดบัง / จัดรูปแบบ
 * ==================================================================== */
const digitsOnly = (s) => String(s == null ? '' : s).replace(/\D/g, '');
/** 13 หลัก (หรือมีขีด) → 'X-XXXX-XXXXX-65-9' (เห็น 3 หลักท้าย · BR-24) */
function maskId(id) {
  const d = digitsOnly(id);
  return d.length === 13 ? store.maskId(d) : (d ? 'X-XXXX-XXXXX-XX-X' : '');
}
function formatId(id) { const d = digitsOnly(id); return d.length === 13 ? store.formatId(d) : ''; }
/** '0812345678' → 'XXX-XXX-5678' */
function maskMobile(m) { const d = digitsOnly(m); return d ? `XXX-XXX-${d.slice(-4)}` : ''; }
const maskName = store.maskName;

const isStaff = (user) => !!(user && STAFF_ROLES.includes(user.role));

function citizenOfCase(c) { return c ? store.findCitizen(c.citizenId) : null; }
function idNoOfCase(c) { const cz = citizenOfCase(c); return cz && cz.idNo ? String(cz.idNo) : ''; }

/* ======================================================================
 * 2) ด่านกรอง PII สำหรับ response ของเจ้าหน้าที่
 * ==================================================================== */
const ID_KEYS = new Set(['idNo', 'idFull', 'idNoFull', 'idFormatted', 'nationalId', 'citizenIdNo', 'applicantIdNo', 'idCard', 'pid']);
const PHONE_KEYS = new Set(['mobile', 'phone', 'tel', 'mobileNo', 'phoneNo', 'applicantMobile']);
const RE_ID13 = /(?<!\d)\d{13}(?!\d)/g;
const RE_IDFMT = /(?<!\d)\d-\d{4}-\d{5}-\d{2}-\d(?!\d)/g;
const RE_MOBILE = /(?<!\d)0\d{9}(?!\d)/g;

function scrubString(s) {
  if (!/\d{9}|\d-\d{4}-/.test(s)) return s;                    // เร็ว: ไม่มีเลขยาวเลย
  return s.replace(RE_IDFMT, (m) => maskId(m)).replace(RE_ID13, (m) => maskId(m)).replace(RE_MOBILE, (m) => maskMobile(m));
}

/** สำเนาที่ไม่มี key เลขบัตร/เบอร์ และสตริงที่เป็นเลขบัตร/เบอร์ถูกปิดบัง (ไม่แก้ object ต้นฉบับ) */
function sanitizeForStaff(v, depth = 0) {
  if (depth > 40 || v === null || v === undefined) return v;
  if (typeof v === 'string') return scrubString(v);
  if (typeof v !== 'object') return v;
  if (Buffer.isBuffer(v) || v instanceof Date) return v;
  if (Array.isArray(v)) return v.map((x) => sanitizeForStaff(x, depth + 1));
  if (typeof v.toJSON === 'function') return sanitizeForStaff(v.toJSON(), depth + 1);
  const out = {};
  for (const k of Object.keys(v)) {
    if (ID_KEYS.has(k)) {
      if (!('idMasked' in v) && !('idMasked' in out) && v[k]) out.idMasked = maskId(v[k]);
      continue;
    }
    if (PHONE_KEYS.has(k)) continue;
    out[k] = sanitizeForStaff(v[k], depth + 1);
  }
  return out;
}

/* ======================================================================
 * 3) มุมมองคำขอ / แถวคิว
 * ==================================================================== */
let slaMod;
function sla() {
  if (slaMod === undefined) { try { slaMod = require('./sla'); } catch (e) { slaMod = null; } }
  return slaMod;
}
const LEVELS = ['normal', 'near', 'overdue', 'paused', 'closed'];
const nowIso = () => time.nowIso();

function isWorkday(dateKey) {
  const dow = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6 && !store.isHoliday(dateKey);
}
function addDaysKey(dateKey, n) { return new Date(Date.parse(`${dateKey}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10); }

/** ระดับ SLA: ใช้ของ src/sla.js ถ้ามี · ไม่มีก็คำนวณอย่างง่าย (สำรอง) */
function slaLevelOf(c) {
  const m = sla();
  if (m) {
    for (const fn of ['slaLevel', 'levelOf', 'caseLevel', 'computeLevel', 'getLevel', 'level']) {
      if (typeof m[fn] !== 'function') continue;
      try {
        const r = m[fn](c, nowIso());
        const lv = r && typeof r === 'object' ? r.level || r.slaLevel : r;
        if (LEVELS.includes(lv)) return lv;
      } catch (e) { /* ใช้สำรอง */ }
    }
  }
  if (store.CLOSED_STATUSES.includes(c.status)) return 'closed';
  if (c.status === 'NEED_FIX') return 'paused';
  if (!c.dueAt) return 'normal';
  const now = nowIso();
  if (now > c.dueAt) return 'overdue';
  // วันทำการที่เหลือหลังวันนี้ถึงวันกำหนด (ไม่นับวันนี้) ≤ 1 → ใกล้ครบกำหนด
  let left = 0;
  for (let k = addDaysKey(now.slice(0, 10), 1); k <= c.dueAt.slice(0, 10) && left < 10; k = addDaysKey(k, 1)) if (isWorkday(k)) left += 1;
  return left <= 1 ? 'near' : 'normal';
}

function docOf(c) { return c.docNo ? store.findDoc(c.docNo) : null; }

/** JSON คำขอตาม CONTRACT 6.7 · เจ้าของ (citizen) ได้ idNo · คนอื่นได้ idMasked */
function caseView(c, user) {
  const owner = !!(user && user.role === 'citizen' && user.citizenId === c.citizenId);
  const idNo = idNoOfCase(c);
  const d = docOf(c);
  const v = {
    caseNo: c.caseNo, serviceId: c.serviceId, serviceName: c.serviceName || null, status: c.status,
    statusText: store.STATUS_TH[c.status] || c.status,
    step: c.serviceId === 'SV-03' ? (c.step || null) : null,
    qty: c.qty == null ? null : c.qty, areaSqm: c.areaSqm == null ? null : c.areaSqm,
    fee: c.fee, paidAt: c.paidAt || null, receiptNo: c.receiptNo || null,
    dueAt: c.dueAt || null, slaLevel: slaLevelOf(c),
    owner: c.owner || null, returnCount: c.returnCount || 0, closedAt: c.closedAt || null, cancelledAt: c.cancelledAt || null,
    applicantName: c.applicantName,
    fixDeadline: c.status === 'NEED_FIX' ? (c.fixDeadline || null) : null,
    returnReason: c.status === 'NEED_FIX' && c.returns && c.returns.length ? c.returns[c.returns.length - 1].reason : null,
    rejectReason: c.rejectReason || null,
    docNo: c.docNo || null, verifyCode: d ? d.verifyCode : null,
    files: (c.files || []).map((id) => store.findFile(id)).filter(Boolean)
      .map((f) => ({ fileId: f.fileId, name: f.name, docKey: f.docKey, size: f.size })),
    timeline: (c.timeline || []).map((t) => ({ at: t.at, event: t.event, text: t.text, by: t.by || null, fromStatus: t.fromStatus || null, toStatus: t.toStatus || null })),
  };
  if (owner) { v.idNo = idNo; v.idFormatted = formatId(idNo); } else v.idMasked = maskId(idNo);
  return owner ? v : sanitizeForStaff(v);
}

/** แถวคิวเจ้าหน้าที่ (CONTRACT 6.3) — ไม่มี idNo */
function queueItem(c) {
  return {
    caseNo: c.caseNo, serviceId: c.serviceId, serviceName: c.serviceName || null, applicantName: c.applicantName,
    idMasked: maskId(idNoOfCase(c)), status: c.status, step: c.serviceId === 'SV-03' ? (c.step || null) : null,
    owner: c.owner || null, dueAt: c.dueAt || null, slaLevel: slaLevelOf(c), dept: c.dept || null,
  };
}

/* ======================================================================
 * 4) Unmask
 * ==================================================================== */
function unmask(user, caseNo, reasonRaw) {
  if (!user || !['officer', 'head'].includes(user.role)) store.fail('FORBIDDEN');
  const c = store.findCase(caseNo);
  if (!c) store.fail('NOT_FOUND');
  const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';
  if (!reason) store.fail('REASON_REQUIRED');                    // ไม่แสดง ไม่บันทึก
  const idNo = idNoOfCase(c);
  if (!store.bug('B11')) {                                       // B11: ข้ามการบันทึก Audit
    store.addAudit({ username: user.username, role: user.role, event: 'UNMASK', caseNo: c.caseNo, detail: reason });
  }
  return { idNo, idFormatted: formatId(idNo) };
}

function unmaskHandler(req) {
  const body = req.body || {};
  return unmask(req.user, req.params.caseNo, body.reason);
}
unmaskHandler.vaultOwned = true;

/* ======================================================================
 * 5) route สำรอง (โมดูลที่ลงทะเบียนทีหลังด้วย path เดียวกันแทนที่ได้)
 * ==================================================================== */
function defaultCaseHandler(req) {
  const c = store.findCase(req.params.caseNo);
  const u = req.user;
  if (!c) store.fail('NOT_FOUND');
  if (u.role === 'citizen' && c.citizenId !== u.citizenId) store.fail('NOT_FOUND');   // ตอบเหมือนไม่มีเลข (B06 อยู่ที่ด่านกรอง)
  return caseView(c, u);
}

const SEVERITY = { overdue: 0, near: 1, normal: 2, paused: 3, closed: 4 };
function defaultQueueHandler(req) {
  const u = req.user;
  const filter = String((req.query && req.query.filter) || 'all');
  let list = store.state.cases.filter((c) => ['SUBMITTED', 'IN_REVIEW', 'NEED_FIX', 'PENDING_APPROVAL', 'APPROVED'].includes(c.status));
  if (u.role === 'officer' && u.dept) list = list.filter((c) => c.dept === u.dept || c.owner === u.username);
  if (filter === 'unclaimed') list = list.filter((c) => ['SUBMITTED', 'IN_REVIEW'].includes(c.status) && !c.owner);
  else if (filter === 'mine') list = list.filter((c) => c.status === 'IN_REVIEW' && c.owner === u.username);
  const items = list.map(queueItem).sort((a, b) => (SEVERITY[a.slaLevel] - SEVERITY[b.slaLevel])
    || String(a.dueAt).localeCompare(String(b.dueAt)) || a.caseNo.localeCompare(b.caseNo));
  const out = { items };
  if (u.role === 'officer') out.workload = store.state.cases.filter((c) => c.owner === u.username && c.status === 'IN_REVIEW').length;
  return out;
}

/* ======================================================================
 * 6) ครอบ handler ทุก route (ด่านกรอง + จุดบั๊ก B06 B09)
 * ==================================================================== */
function wrapRoute(r) {
  const inner = r.handler;
  const isUnmask = r.pattern === UNMASK_PATH;
  const isQueue = r.method === 'GET' && r.pattern === QUEUE_PATH;
  const isCase = r.method === 'GET' && r.pattern === CASE_PATH;

  const wrapped = async function vaultGuard(req, res) {
    const user = req.user;

    // B06 (IDOR): สวมสิทธิ์เจ้าของคำขอให้ประชาชนที่ไม่ใช่เจ้าของ
    if (isCase && user && user.role === 'citizen' && store.bug('B06')) {
      const c = store.findCase(req.params && req.params.caseNo);
      if (c && c.citizenId !== user.citizenId) {
        req.user = Object.assign({}, user, { citizenId: c.citizenId });
        if (req.session) req.session = Object.assign({}, req.session, { citizenId: c.citizenId });
      }
    }

    if (!isStaff(user) || isUnmask) return inner(req, res);

    const transform = (obj) => {
      let out = sanitizeForStaff(obj);
      if (isQueue && store.bug('B09') && out && Array.isArray(out.items)) {          // B09: ส่งเลขบัตรเต็มใน API คิว
        out = Object.assign({}, out, {
          items: out.items.map((it) => {
            const c = it && store.findCase(it.caseNo);
            return c ? Object.assign({}, it, { idNo: idNoOfCase(c) }) : it;
          }),
        });
      }
      return out;
    };
    const origJson = res.json;
    if (typeof origJson === 'function') {
      res.json = (status, obj) => {
        if (obj === undefined && typeof status === 'object') return origJson(200, transform(status));
        return origJson(status, transform(obj));
      };
    }
    const out = await inner(req, res);
    return out === undefined || res.writableEnded ? out : transform(out);
  };
  wrapped[WRAPPED] = true;
  wrapped.inner = inner;
  r.handler = wrapped;
}

let appRef = null;
function guardRoutes() {
  if (!appRef || !Array.isArray(appRef.routes)) return;
  // ตรึง route unmask เป็นของ vault (โมดูลอื่นลงทะเบียนทับ → คืนกลับ)
  const um = appRef.routes.find((r) => r.method === 'POST' && r.pattern === UNMASK_PATH);
  const umHandler = um && (um.handler[WRAPPED] ? um.handler.inner : um.handler);
  if (!um || !umHandler || !umHandler.vaultOwned) {
    appRef.post(UNMASK_PATH, { roles: ['officer', 'head'] }, unmaskHandler);
  }
  for (const r of appRef.routes) {
    if (!r.pattern || !r.pattern.startsWith('/api/') || r.pattern.startsWith('/api/test/')) continue;
    if (!r.handler[WRAPPED]) wrapRoute(r);
  }
}

/* ======================================================================
 * 7) B06 ที่หน้าเว็บ: ดัก GET /citizen/cases/:caseNo ก่อน server.js ตรวจเจ้าของ (เฉพาะเมื่อเปิดบั๊ก)
 * ==================================================================== */
function idorPage(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const m = /^\/citizen\/cases\/([^/?#]+)\/?(?:\?.*)?$/.exec(req.url || '');
  if (!m) return false;
  const sid = (/(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie || '') || [])[1];
  const session = sid ? store.mem.sessions.get(decodeURIComponent(sid)) : null;
  if (!session || !session.citizenId) return false;
  const cz = store.findCitizen(session.citizenId);
  if (!cz || !cz.registered) return false;
  let caseNo; try { caseNo = decodeURIComponent(m[1]); } catch (e) { return false; }
  const c = store.findCase(caseNo);
  if (!c || c.citizenId === session.citizenId) return false;      // ของตัวเอง/ไม่มี → ให้ server จัดการตามปกติ
  let html; try { html = fs.readFileSync(path.join(PUBLIC_DIR, 'citizen-case.html')); } catch (e) { return false; }
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin',
  });
  res.end(req.method === 'HEAD' ? undefined : html);
  return true;
}

function installIdorPageHook() {
  const http = require('http');
  const orig = http.createServer;
  if (orig.vaultHooked) return;
  const hooked = function createServer(...args) {
    http.createServer = orig;                                     // ครอบครั้งเดียว (server หลัก)
    const i = args.findIndex((a) => typeof a === 'function');
    if (i >= 0) {
      const listener = args[i];
      args[i] = function vaultListener(req, res) {
        try { if (store.bug('B06') && idorPage(req, res)) return undefined; } catch (e) { /* ปล่อยให้ server ทำต่อ */ }
        return listener.call(this, req, res);
      };
    }
    return orig.apply(this, args);
  };
  hooked.vaultHooked = true;
  http.createServer = hooked;
}

/* ======================================================================
 * 8) ตรวจ at rest (ใช้ใน test/inspection: node -e "require('./src/vault').selfCheck()")
 * ==================================================================== */
function selfCheck(dbPath = store.DB_PATH) {
  let raw;
  try { raw = fs.readFileSync(dbPath); } catch (e) { return { ok: false, error: e.message }; }
  const needles = [];
  for (const cz of store.state.cases ? store.state.citizens : []) {
    if (cz.idNo) needles.push(cz.idNo, formatId(cz.idNo));
    if (cz.mobile) needles.push(cz.mobile);
  }
  const found = needles.filter((n) => raw.includes(Buffer.from(n)));
  return { ok: found.length === 0, algorithm: 'AES-256-GCM', checked: needles.length, found };
}

/* ======================================================================
 * 9) ลงทะเบียน
 * ==================================================================== */
function register(app) {
  appRef = app;
  app.get(CASE_PATH, { roles: ['citizen', 'officer', 'head'] }, defaultCaseHandler);
  app.get(QUEUE_PATH, { roles: ['officer', 'head'] }, defaultQueueHandler);
  app.post(UNMASK_PATH, { roles: ['officer', 'head'] }, unmaskHandler);
  if (store.bug('B06')) installIdorPageHook();
  guardRoutes();
}

/** เรียกก่อนทุก request (ยกเว้น /api/test/*) → ครอบ route ที่โมดูลอื่นเพิ่ม/แทนที่ทีหลัง */
function tick() { guardRoutes(); }

module.exports = {
  register, tick,
  maskId, formatId, maskMobile, maskName, isStaff, idNoOfCase, citizenOfCase,
  caseView, queueItem, slaLevelOf, sanitizeForStaff, scrubString, unmask, selfCheck,
  encrypt: store.encryptStr, decrypt: store.decryptStr,
};

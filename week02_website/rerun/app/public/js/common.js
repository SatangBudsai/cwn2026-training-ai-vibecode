/* ตัวช่วยกลาง: DOM, API, รูปแบบวันที่/เงิน, header/footer, ข้อความสถานะ */
(function () {
  'use strict';
  const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const SYSTEM_NAME = 'e-Service กลาง · เทศบาลนครตัวอย่าง';

  const STATUS_TH = {
    DRAFT: 'ร่าง', PENDING_PAYMENT: 'รอชำระเงิน', SUBMITTED: 'ส่งคำขอแล้ว', IN_REVIEW: 'กำลังตรวจสอบ',
    NEED_FIX: 'รอแก้ไขเอกสาร', PENDING_APPROVAL: 'รออนุมัติ', APPROVED: 'อนุมัติ', COMPLETED: 'เสร็จสิ้น',
    REJECTED: 'ไม่อนุมัติ', CANCELLED: 'ยกเลิก'
  };
  const STATUS_CLS = {
    DRAFT: 'b-neu', PENDING_PAYMENT: 'b-warn', SUBMITTED: 'b-info', IN_REVIEW: 'b-info', NEED_FIX: 'b-warn',
    PENDING_APPROVAL: 'b-info', APPROVED: 'b-ok', COMPLETED: 'b-ok', REJECTED: 'b-bad', CANCELLED: 'b-neu'
  };
  const LEVEL_TH = { normal: 'ปกติ', near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด', paused: 'หยุดนับ', closed: 'ปิดแล้ว' };
  const LEVEL_CLS = { normal: 'b-ok', near: 'b-warn', overdue: 'b-bad', paused: 'b-neu', closed: 'b-neu' };
  const LEVEL_MARK = { normal: '', near: '', overdue: '', paused: '', closed: '' };
  const ROLE_TH = { citizen: 'ประชาชน', officer: 'เจ้าหน้าที่', head: 'หัวหน้าฝ่าย', executive: 'ผู้บริหาร', auditor: 'ผู้ตรวจสอบภายใน', admin: 'ผู้ดูแลระบบ' };
  const LANDING = { citizen: '/citizen', officer: '/officer/queue', head: '/head/approvals', executive: '/dashboard', auditor: '/audit', admin: '/admin/services' };
  const SERVICES = {
    'SV-01': { name: 'ขอหนังสือรับรอง', docs: [{ key: 'id-card', label: 'บัตรประชาชน', req: true }] },
    'SV-02': { name: 'ขออนุญาตประกอบกิจการ', docs: [{ key: 'id-card', label: 'บัตรประชาชน', req: true }, { key: 'map', label: 'แผนที่ตั้ง', req: true }, { key: 'site-photo', label: 'ภาพสถานที่', req: false }] },
    'SV-03': { name: 'ขออนุญาตก่อสร้าง/ต่อเติมอาคาร', docs: [{ key: 'id-card', label: 'บัตรประชาชน', req: true }, { key: 'plan', label: 'แบบแปลน (PDF เท่านั้น)', short: 'แบบแปลน', req: true }, { key: 'deed', label: 'โฉนด', req: true }] }
  };
  const ERRORS = {
    INVALID_ID: 'เลขบัตรประชาชนไม่ถูกต้อง', OTP_INVALID: 'รหัส OTP ไม่ถูกต้อง',
    LOCKED: 'ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที', INVALID_CREDENTIALS: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    INVALID_MOBILE: 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0',
    CONSENT_REQUIRED: 'กรุณายินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA)',
    INVALID_QTY: 'จำนวนฉบับต้อง 1–5 ฉบับ', INVALID_AREA: 'กรุณาระบุพื้นที่ 1–500 ตร.ม.',
    AREA_TOO_LARGE: 'พื้นที่เกิน 500 ตร.ม. กรุณายื่นที่สำนักงาน', FILE_TOO_LARGE: 'ไฟล์ใหญ่เกิน 5 MB',
    FILE_TYPE: 'รองรับเฉพาะไฟล์ PDF, JPG, PNG', FILE_COUNT: 'แนบได้สูงสุด 5 ไฟล์ต่อคำขอ',
    PLAN_NOT_PDF: 'แบบแปลนต้องเป็นไฟล์ PDF เท่านั้น', QR_EXPIRED: 'QR หมดอายุ กรุณาสร้าง QR ใหม่',
    AMOUNT_MISMATCH: 'ยอดเงินไม่ตรงกับค่าธรรมเนียม', NOT_FOUND: 'ไม่พบคำขอ',
    CANNOT_CANCEL: 'ยกเลิกไม่ได้ คำขอมีเจ้าหน้าที่รับเรื่องแล้ว', FIX_WINDOW_EXPIRED: 'หมดเวลาแก้ไขแล้ว คำขอถูกยกเลิก',
    ALREADY_CLAIMED: 'มีเจ้าหน้าที่รับเรื่องนี้แล้ว', WORKLOAD_LIMIT: 'รับงานได้สูงสุด 10 เรื่อง',
    RETURN_LIMIT: 'ตีกลับได้สูงสุด 2 ครั้ง', REASON_TOO_SHORT: 'กรุณากรอกเหตุผลอย่างน้อย 10 ตัวอักษร',
    REASON_REQUIRED: 'กรุณากรอกเหตุผล', INVALID_STATE: 'สถานะคำขอไม่ถูกต้องสำหรับรายการนี้',
    FORBIDDEN: 'ไม่มีสิทธิ์ทำรายการนี้', UNAUTHENTICATED: 'กรุณาเข้าสู่ระบบ',
    INVALID_FEE: 'ค่าธรรมเนียมต้องเป็นจำนวนเต็ม 0–100,000 บาท', INVALID_SLA: 'SLA ต้องเป็นจำนวนเต็ม 1–60 วันทำการ',
    DUPLICATE_HOLIDAY: 'มีวันหยุดนี้อยู่แล้ว', SELF_ROLE_CHANGE: 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้',
    METHOD_NOT_ALLOWED: 'Method Not Allowed'
  };

  /* ---------- DOM ---------- */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(x => append(el, x)); return; }
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  const $ = (s, r) => (r || document).querySelector(s);
  const tid = (id, r) => (r || document).querySelector('[data-testid="' + id + '"]');

  /* ---------- รูปแบบ ---------- */
  function parts(iso) {
    const d = new Date(iso);
    if (!iso || isNaN(d)) return null;
    const t = new Date(d.getTime() + 7 * 3600000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), hh: t.getUTCHours(), mm: t.getUTCMinutes() };
  }
  const p2 = n => String(n).padStart(2, '0');
  function fmtDateTime(iso) {
    const p = parts(iso);
    return p ? p.d + ' ' + TH_MON[p.m] + ' ' + (p.y + 543) + ' ' + p2(p.hh) + ':' + p2(p.mm) : '–';
  }
  function fmtDateOnly(ymd) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
    return m ? (+m[3]) + ' ' + TH_MON[+m[2] - 1] + ' ' + (+m[1] + 543) : '–';
  }
  const fmtMoney = n => '฿' + Number(n).toLocaleString('en-US');
  function fmtIdNo(s) {
    const d = String(s || '').replace(/\D/g, '');
    return d.length === 13 ? [d[0], d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d[12]].join('-') : String(s || '');
  }
  const serviceLabel = id => id + ' ' + ((SERVICES[id] || {}).name || '');
  const errText = d => (d && (ERRORS[d.code] || d.message)) || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
  function timeEl(id, iso, text) { return h('time', { 'data-testid': id, 'data-iso': iso || '', datetime: iso || '', text: text != null ? text : fmtDateTime(iso) }); }
  function statusBadge(status, id) { return h('span', { 'data-testid': id || 'case-status', 'data-status': status, class: 'badge ' + (STATUS_CLS[status] || 'b-neu'), text: STATUS_TH[status] || status || '–' }); }
  function levelBadge(level, id) { return h('span', { 'data-testid': id || 'sla-level', 'data-level': level, class: 'badge ' + (LEVEL_CLS[level] || 'b-neu'), text: (LEVEL_MARK[level] || '') + (LEVEL_TH[level] || level || '–') }); }

  /* ---------- API ---------- */
  async function api(method, path, body) {
    const opt = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (body instanceof FormData) opt.body = body;
    else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    let res;
    try { res = await fetch(path, opt); }
    catch (e) { return { ok: false, status: 0, data: { code: 'NETWORK', message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' } }; }
    let data = null;
    if ((res.headers.get('content-type') || '').indexOf('json') >= 0) { try { data = await res.json(); } catch (e) { data = null; } }
    return { ok: res.ok, status: res.status, data };
  }

  /* ---------- ข้อความ action-error / action-success ---------- */
  function msgBox() {
    let b = document.getElementById('msgs');
    if (!b) { b = h('div', { id: 'msgs' }); const m = document.getElementById('main'); m.insertBefore(b, m.firstChild); }
    return b;
  }
  function clearMsgs() { clear(msgBox()); }
  function showError(t) {
    const b = clear(msgBox());
    b.append(h('div', { role: 'alert', 'data-testid': 'action-error', class: 'alert', text: t }));
    window.scrollTo({ top: 0 });
  }
  function showSuccess(t) {
    const b = clear(msgBox());
    b.append(h('div', { role: 'status', 'data-testid': 'action-success', class: 'toast', text: t || 'บันทึกสำเร็จ' }));
  }

  /* ---------- Layout ---------- */
  const NAV = {
    citizen: [['nav-my-cases', '/citizen', 'คำขอของฉัน']],
    officer: [['nav-queue', '/officer/queue', 'คิวงาน'], ['nav-bell', '/notifications', 'แจ้งเตือน']],
    head: [['nav-queue', '/officer/queue', 'คิวงาน'], ['nav-approvals', '/head/approvals', 'รออนุมัติ'], ['nav-bell', '/notifications', 'แจ้งเตือน']],
    executive: [['nav-dashboard', '/dashboard', 'Dashboard']],
    auditor: [['nav-audit', '/audit', 'Audit Trail']],
    admin: [['nav-admin-services', '/admin/services', 'บริการ'], ['nav-admin-holidays', '/admin/holidays', 'วันหยุด'], ['nav-admin-users', '/admin/users', 'ผู้ใช้']]
  };

  function buildHeader(user) {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const nav = h('nav', { class: 'nav', 'aria-label': 'เมนูหลัก' });
    const userbox = h('div', { class: 'userbox' });
    if (user) {
      (NAV[user.role] || []).forEach(n => {
        const a = h('a', { 'data-testid': n[0], href: n[1] }, n[2]);
        if (n[0] === 'nav-bell') a.append(h('span', { 'data-testid': 'bell-count', class: 'bell-count', 'aria-label': 'จำนวนแจ้งเตือน' }, '0'));
        if (path === n[1]) a.setAttribute('aria-current', 'page');
        nav.append(a);
      });
      userbox.append(
        h('span', { 'data-testid': 'user-name', class: 'user-name' }, user.name || user.username),
        h('span', { 'data-testid': 'user-role', class: 'chip', 'data-role': user.role, 'data-dept': user.role === 'officer' ? (user.dept || '') : null }, ROLE_TH[user.role] || user.role),
        h('button', { type: 'button', 'data-testid': 'logout-btn', class: 'sec small', onclick: async () => { await api('POST', '/api/auth/logout'); location.href = '/login'; } }, 'ออกจากระบบ')
      );
    } else {
      nav.append(h('a', { href: '/login' }, 'เข้าสู่ระบบ'));
    }
    return h('header', { 'data-testid': 'app-header', class: 'app-header' },
      h('div', { class: 'hdr-in' },
        h('div', { class: 'brand' },
          h('span', { class: 'brand-eyebrow' }, 'บริการประชาชนออนไลน์'),
          h('a', { class: 'brand-name', href: '/' }, SYSTEM_NAME)),
        nav, userbox));
  }
  function buildFooter() {
    return h('footer', { class: 'site-footer' }, h('div', { class: 'in' },
      h('strong', {}, SYSTEM_NAME), h('br'),
      'ระบบจำลองเพื่อการเรียนรู้ ไม่ใช่หน่วยงานจริง · ThaiD / PromptPay / ลายเซ็นดิจิทัล เป็นตัวจำลอง', h('br'),
      'ข้อมูลส่วนบุคคลได้รับการคุ้มครองตาม PDPA'));
  }
  function renderChrome(user) {
    const hs = document.getElementById('site-header'), fs = document.getElementById('site-footer');
    if (hs) clear(hs).append(buildHeader(user));
    if (fs) clear(fs).append(buildFooter());
    if (user && (user.role === 'officer' || user.role === 'head')) refreshBell();
  }
  async function refreshBell() {
    const r = await api('GET', '/api/notifications');
    const el = tid('bell-count');
    if (el && r.ok && r.data && Array.isArray(r.data.items)) el.textContent = String(r.data.items.length);
  }
  function setBell(n) { const el = tid('bell-count'); if (el) el.textContent = String(n); }

  function showForbidden() {
    const m = document.getElementById('main');
    clear(m).append(h('div', { class: 'card accent' }, h('h1', { 'data-testid': 'forbidden-msg' }, 'ไม่มีสิทธิ์เข้าถึงหน้านี้'),
      h('p', {}, h('a', { href: '/' }, 'กลับหน้าหลัก'))));
    document.title = 'ไม่มีสิทธิ์เข้าถึงหน้านี้ · ' + SYSTEM_NAME;
  }
  function showNotFound(text, testid) {
    const m = document.getElementById('main');
    clear(m).append(h('div', { class: 'card accent' }, h('h1', { 'data-testid': testid || 'not-found-msg' }, text || 'ไม่พบคำขอ'),
      h('p', {}, h('a', { href: '/' }, 'กลับหน้าหลัก'))));
    document.title = (text || 'ไม่พบคำขอ') + ' · ' + SYSTEM_NAME;
  }

  /* boot: ตรวจ session + สิทธิ์ แล้ววาด header/footer; คืน user หรือ null */
  async function boot(opts) {
    opts = opts || {};
    const r = await api('GET', '/api/me');
    const user = r.ok ? r.data : null;
    if (!user && opts.auth !== false) { location.replace('/login'); return null; }
    renderChrome(user);
    if (user && opts.roles && opts.roles.indexOf(user.role) < 0) { showForbidden(); return null; }
    return user;
  }

  /* เตรียม main: ช่องข้อความ + พื้นที่เนื้อหา คืน element เนื้อหา */
  function page(title, eyebrow) {
    const m = clear(document.getElementById('main'));
    const c = h('div', { id: 'content' });
    m.append(h('div', { id: 'msgs' }), c);
    document.title = title + ' · ' + SYSTEM_NAME;
    if (eyebrow) c.append(h('p', { class: 'eyebrow' }, eyebrow));
    c.append(h('h1', { id: 'page-title' }, title));
    return c;
  }

  /* QR จำลอง (SVG) จากข้อความ */
  function fakeQr(text, label) {
    const N = 21, NS = 'http://www.w3.org/2000/svg';
    let s = 7; for (const ch of String(text)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + (N + 2) + ' ' + (N + 2)); svg.setAttribute('class', 'qr');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label || 'QR จำลอง');
    const bg = document.createElementNS(NS, 'rect'); bg.setAttribute('width', N + 2); bg.setAttribute('height', N + 2); bg.setAttribute('fill', '#fff'); svg.append(bg);
    const inFinder = (x, y) => (x < 7 && y < 7) || (x > N - 8 && y < 7) || (x < 7 && y > N - 8);
    const cell = (x, y) => { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x + 1); r.setAttribute('y', y + 1); r.setAttribute('width', 1); r.setAttribute('height', 1); r.setAttribute('fill', '#0B2559'); svg.append(r); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) {
        const fx = x < 7 ? x : x - (N - 7), fy = y < 7 ? y : y - (N - 7);
        const edge = fx === 0 || fx === 6 || fy === 0 || fy === 6, core = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
        if (edge || core) cell(x, y);
      } else if (rnd() > 0.52) cell(x, y);
    }
    return svg;
  }

  window.App = {
    page, h, clear, $, tid, api, boot, renderChrome, setBell, refreshBell, showForbidden, showNotFound, showError, showSuccess, clearMsgs,
    fmtDateTime, fmtDateOnly, fmtMoney, fmtIdNo, serviceLabel, errText, timeEl, statusBadge, levelBadge, fakeQr,
    STATUS_TH, LEVEL_TH, ROLE_TH, LANDING, SERVICES, ERRORS, SYSTEM_NAME
  };
})();

// Shared helpers for e-Service pages (ES module, no build step)
export const SERVICES = {
  'SV-01': 'ขอหนังสือรับรอง',
  'SV-02': 'ขออนุญาตประกอบกิจการ',
  'SV-03': 'ขออนุญาตก่อสร้าง/ต่อเติมอาคาร',
};
export const STATUS_TH = {
  DRAFT: 'ร่าง', PENDING_PAYMENT: 'รอชำระเงิน', SUBMITTED: 'ส่งคำขอแล้ว', IN_REVIEW: 'กำลังตรวจสอบ',
  NEED_FIX: 'รอแก้ไขเอกสาร', PENDING_APPROVAL: 'รออนุมัติ', APPROVED: 'อนุมัติ', COMPLETED: 'เสร็จสิ้น',
  REJECTED: 'ไม่อนุมัติ', CANCELLED: 'ยกเลิก',
};
export const SLA_TH = { normal: 'ปกติ', near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด', paused: 'หยุดนับ', closed: 'ปิดแล้ว' };
export const ROLE_TH = {
  citizen: 'ประชาชน', officer: 'เจ้าหน้าที่', head: 'หัวหน้าฝ่าย', executive: 'ผู้บริหาร',
  auditor: 'ผู้ตรวจสอบภายใน', admin: 'ผู้ดูแลระบบ',
};
export const serviceLabel = (id) => `${id} ${SERVICES[id] || ''}`.trim();

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// element builder: attrs 'on*' = listeners, true = boolean attr, null/false = skipped
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  const add = (c) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

export async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
  if (opts.json !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.json); }
  if (opts.form) init.body = opts.form;
  let res;
  try { res = await fetch(path, init); } catch (e) {
    const err = new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); err.status = 0; err.code = 'NETWORK'; err.data = {}; throw err;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.message) || 'เกิดข้อผิดพลาด');
    err.status = res.status; err.code = data && data.code; err.data = data || {};
    if (res.status === 401 && !opts.noRedirect) location.href = '/login';
    throw err;
  }
  return data;
}

// ---- dates / money ----
const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmtr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function fmtDate(iso, { time = true } = {}) {
  if (!iso) return '–';
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso);
  if (m) return `${+m[3]} ${MON[+m[2] - 1]} ${+m[1] + 543}`;
  const d = new Date(iso);
  if (isNaN(d)) return '–';
  const p = {};
  for (const x of fmtr.formatToParts(d)) p[x.type] = x.value;
  let s = `${+p.day} ${MON[+p.month - 1]} ${+p.year + 543}`;
  if (time) s += ` ${p.hour}:${p.minute}`;
  return s;
}
export function dateEl(tag, iso, attrs = {}, opts) {
  return h(tag, { ...attrs, 'data-iso': iso || null }, fmtDate(iso, opts));
}
export const money = (n) => (n === null || n === undefined || n === '' || isNaN(Number(n))) ? '–' : '฿' + Number(n).toLocaleString('en-US');
export function fmtIdNo(s) {
  const d = String(s || '').replace(/\D/g, '');
  if (d.length !== 13) return s || '';
  return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`;
}

// ---- messages ----
function msgBox() {
  let b = $('#msgs');
  if (!b) {
    b = h('div', { id: 'msgs' });
    const main = $('main') || document.body;
    main.insertBefore(b, main.firstChild);
  }
  return b;
}
let toastTimer;
export function toast(msg) {
  const b = msgBox();
  $$('.toast', b).forEach((e) => e.remove());
  b.append(h('div', { class: 'toast', 'data-testid': 'action-success', role: 'status' }, msg));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $$('.toast', b).forEach((e) => e.remove()), 8000);
}
export function showError(msg) {
  const b = msgBox();
  $$('.alert', b).forEach((e) => e.remove());
  b.append(h('div', { class: 'alert', 'data-testid': 'action-error', role: 'alert' }, msg));
}
export function clearError() { $$('.alert', msgBox()).forEach((e) => e.remove()); }
// per-field message slot: setSlot(el, 'thaid-error', 'text') ; empty text clears
export function setSlot(slot, testid, text) {
  const el = typeof slot === 'string' ? $(slot) : slot;
  el.replaceChildren(text ? h('p', { class: 'field-error', 'data-testid': testid, role: 'alert' }, text) : '');
}

// ---- QR-like SVG (deterministic, decorative simulation) ----
export function qrSvg(text) {
  let seed = 2166136261;
  for (const c of String(text)) { seed ^= c.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0; }
  const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const N = 25;
  const cells = [];
  const inFinder = (x, y) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.5) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  const finder = (ox, oy) => `<rect x="${ox}" y="${oy}" width="7" height="7"/><rect x="${ox + 1}" y="${oy + 1}" width="5" height="5" fill="#fff"/><rect x="${ox + 2}" y="${oy + 2}" width="3" height="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${N + 2} ${N + 2}" role="img" aria-label="QR จำลอง ${String(text).replace(/[<>&"]/g, '')}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${N + 2}" height="${N + 2}" fill="#fff"/><g fill="#1F3A6E">${cells.join('')}${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</g></svg>`;
}
export function qrEl(text, attrs = {}) {
  const d = h('div', { class: 'qr', ...attrs });
  d.innerHTML = qrSvg(text);
  return d;
}

// ---- header / boot ----
function navFor(role) {
  const L = (id, href, label) => ({ id, href, label });
  switch (role) {
    case 'citizen': return [L('nav-my-cases', '/citizen', 'คำขอของฉัน')];
    case 'officer': return [L('nav-queue', '/officer/queue', 'คิวงาน'), L('nav-bell', '/notifications', 'แจ้งเตือน')];
    case 'head': return [L('nav-queue', '/officer/queue', 'คิวงาน'), L('nav-approvals', '/head/approvals', 'รออนุมัติ'), L('nav-bell', '/notifications', 'แจ้งเตือน')];
    case 'executive': return [L('nav-dashboard', '/dashboard', 'Dashboard')];
    case 'auditor': return [L('nav-audit', '/audit', 'Audit Trail')];
    case 'admin': return [L('nav-admin-services', '/admin/services', 'ค่าธรรมเนียม/SLA'), L('nav-admin-holidays', '/admin/holidays', 'วันหยุด'), L('nav-admin-users', '/admin/users', 'ผู้ใช้/บทบาท')];
    default: return [];
  }
}
export function renderHeader(me, { bare = false } = {}) {
  let host = $('#hdr');
  if (!host) { host = h('div', { id: 'hdr' }); document.body.insertBefore(host, document.body.firstChild); }
  const items = bare ? [] : navFor(me.role).map((n) => h('a', { href: n.href, 'data-testid': n.id }, n.label,
    n.id === 'nav-bell' ? h('span', { class: 'bell-count', 'data-testid': 'bell-count', 'aria-label': 'จำนวนแจ้งเตือน' }, String(me.bellCount ?? 0)) : null));
  const logo = h('img', { src: '/static/emblem.svg', alt: '', width: '40', height: '40' });
  host.replaceChildren(h('div', { class: 'announce' }, 'ยื่นคำขอ ชำระเงิน และรับเอกสารดิจิทัลได้ครบในที่เดียว'), h('header', { class: 'app-header', 'data-testid': 'app-header' },
    h('div', { class: 'inner' },
      h('span', { class: 'brand' }, logo, h('span', null, 'e-Service กลาง', h('small', null, 'เทศบาลนครตัวอย่าง'))),
      h('nav', { 'aria-label': 'เมนูหลัก' }, items),
      h('div', { class: 'userbox' },
        h('span', { 'data-testid': 'user-name' }, me.name || me.username),
        h('span', { class: 'role-chip', 'data-testid': 'user-role', 'data-role': me.role, 'data-dept': me.dept || null }, ROLE_TH[me.role] || me.role),
        h('button', {
          type: 'button', class: 'btn secondary', 'data-testid': 'logout-btn',
          onclick: async () => { try { await api('/api/auth/logout', { method: 'POST', noRedirect: true }); } catch (e) { /* ignore */ } location.href = '/login'; },
        }, 'ออกจากระบบ')))));
}
export function forbiddenView() {
  const main = $('main');
  main.replaceChildren(h('h1', null, 'ไม่มีสิทธิ์เข้าถึง'), h('p', { 'data-testid': 'forbidden-msg', role: 'alert' }, 'ไม่มีสิทธิ์เข้าถึงหน้านี้'),
    h('p', null, h('a', { href: '/' }, 'กลับหน้าหลัก')));
}
// returns me, or null when page should stop (forbidden)
export async function boot({ roles = null, bare = false, optional = false } = {}) {
  let me;
  try { me = await api('/api/me', { noRedirect: true }); } catch (e) {
    if (e.status === 401) {
      if (optional) return null;
      location.href = '/login';
      return new Promise(() => {});
    }
    throw e;
  }
  renderHeader(me, { bare });
  if (roles && !roles.includes(me.role)) { forbiddenView(); return null; }
  return me;
}
export const lastSeg = () => decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop());

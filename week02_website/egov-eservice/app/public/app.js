/* ตัวช่วยร่วมของทุกหน้า (header, api, รูปแบบวันที่/เงิน) */
(function () {
  var MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var STATUS = { DRAFT: 'ร่าง', PENDING_PAYMENT: 'รอชำระเงิน', SUBMITTED: 'ส่งคำขอแล้ว', IN_REVIEW: 'กำลังตรวจสอบ', NEED_FIX: 'รอแก้ไขเอกสาร', PENDING_APPROVAL: 'รออนุมัติ', APPROVED: 'อนุมัติ', COMPLETED: 'เสร็จสิ้น', REJECTED: 'ไม่อนุมัติ', CANCELLED: 'ยกเลิก' };
  var LEVEL = { normal: 'ปกติ', near: 'ใกล้ครบกำหนด', overdue: 'เกินกำหนด', paused: 'หยุดนับ', closed: 'ปิดแล้ว' };
  var SERVICE = { 'SV-01': 'ขอหนังสือรับรอง', 'SV-02': 'ขออนุญาตประกอบกิจการ', 'SV-03': 'ขออนุญาตก่อสร้าง/ต่อเติมอาคาร' };
  var ROLE = { citizen: 'ประชาชน', officer: 'เจ้าหน้าที่', head: 'หัวหน้าฝ่าย', executive: 'ผู้บริหาร', auditor: 'ผู้ตรวจสอบภายใน', admin: 'ผู้ดูแลระบบ' };
  var NAV = {
    citizen: [['nav-my-cases', '/citizen', 'คำขอของฉัน']],
    officer: [['nav-queue', '/officer/queue', 'คิวงาน'], ['nav-bell', '/notifications', 'แจ้งเตือน']],
    head: [['nav-queue', '/officer/queue', 'คิวงาน'], ['nav-approvals', '/head/approvals', 'รออนุมัติ'], ['nav-bell', '/notifications', 'แจ้งเตือน']],
    executive: [['nav-dashboard', '/dashboard', 'Dashboard']],
    auditor: [['nav-audit', '/audit', 'Audit Trail']],
    admin: [['nav-admin-services', '/admin/services', 'ค่าธรรมเนียม/SLA'], ['nav-admin-holidays', '/admin/holidays', 'วันหยุด'], ['nav-admin-users', '/admin/users', 'ผู้ใช้']]
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bkk(iso) { return new Date(new Date(iso).getTime() + 7 * 3600e3); }
  function dt(iso) {
    if (!iso) return '–';
    var d = bkk(iso);
    return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + (d.getUTCFullYear() + 543) + ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes());
  }
  function dOnly(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
    if (!m) return '–';
    return Number(m[3]) + ' ' + MON[Number(m[2]) - 1] + ' ' + (Number(m[1]) + 543);
  }
  function money(n) { return '฿' + Number(n).toLocaleString('en-US'); }
  function api(method, url, body) {
    var o = { method: method, credentials: 'same-origin', headers: {} };
    if (body instanceof FormData) o.body = body;
    else if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(url, o).then(function (r) {
      if (r.status === 204) return { ok: true, status: 204, data: {} };
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d || {} }; });
    });
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function tid(id, r) { return (r || document).querySelector('[data-testid="' + id + '"]'); }
  function setIso(el, iso) { el.textContent = dt(iso); if (iso) el.setAttribute('data-iso', iso); }

  var msgEl = {};
  function clearMsg() { ['action-error', 'action-success'].forEach(function (k) { if (msgEl[k] && msgEl[k].parentNode) msgEl[k].parentNode.removeChild(msgEl[k]); msgEl[k] = null; }); }
  function show(kind, text) {
    clearMsg();
    var el = document.createElement('div');
    el.setAttribute('data-testid', kind);
    if (kind === 'action-error') { el.setAttribute('role', 'alert'); el.className = 'error'; } else { el.setAttribute('role', 'status'); el.className = 'success'; }
    el.textContent = text;
    msgEl[kind] = el;
    var main = document.getElementById('main') || document.body;
    main.insertBefore(el, main.firstChild);
    if (kind === 'action-success') setTimeout(function () { if (msgEl[kind] === el && el.parentNode) el.parentNode.removeChild(el); }, 8000);
  }
  function failMsg(r) { return (r && r.data && r.data.message) || 'เกิดข้อผิดพลาด'; }

  function boot(cb) {
    api('GET', '/api/me').then(function (r) {
      if (r.status === 401) { location.href = '/login'; return; }
      var me = r.data;
      var h = document.createElement('header');
      h.className = 'app-header';
      h.setAttribute('data-testid', 'app-header');
      var nav = (NAV[me.role] || []).map(function (n) {
        return '<a data-testid="' + n[0] + '" href="' + n[1] + '">' + n[2] + (n[0] === 'nav-bell' ? ' <span data-testid="bell-count">0</span>' : '') + '</a>';
      }).join('');
      h.innerHTML = '<span class="brand">e-Service เทศบาลนครตัวอย่าง</span><nav aria-label="เมนูหลัก">' + nav + '</nav>' +
        '<span data-testid="user-name">' + esc(me.name) + '</span> ' +
        '<span data-testid="user-role" data-role="' + esc(me.role) + '"' + (me.dept ? ' data-dept="' + esc(me.dept) + '"' : '') + '>' + (ROLE[me.role] || me.role) + '</span> ' +
        '<button type="button" class="secondary" data-testid="logout-btn">ออกจากระบบ</button>';
      document.body.insertBefore(h, document.body.firstChild);
      tid('logout-btn', h).addEventListener('click', function () { api('POST', '/api/auth/logout').then(function () { location.href = '/login'; }); });
      if (me.role === 'officer' || me.role === 'head') {
        api('GET', '/api/notifications').then(function (n) { tid('bell-count').textContent = (n.data.items || []).length; });
      }
      cb(me);
    });
  }
  window.EG = { esc: esc, dt: dt, dOnly: dOnly, money: money, api: api, $: $, tid: tid, setIso: setIso, show: show, clearMsg: clearMsg, failMsg: failMsg, boot: boot, STATUS: STATUS, LEVEL: LEVEL, SERVICE: SERVICE, ROLE: ROLE };
})();

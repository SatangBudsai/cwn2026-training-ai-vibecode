(async function () {
  const { h, api, page, errText, showError, timeEl } = App;
  const user = await App.boot({ roles: ['auditor'] });
  if (!user) return;
  const c = page('Audit Trail', 'ผู้ตรวจสอบภายใน · อ่านอย่างเดียว');
  const EVENTS = ['STAFF_LOGIN', 'CLAIM', 'RETURN', 'FORWARD', 'APPROVE', 'REJECT', 'ISSUE', 'UNMASK', 'EXPORT', 'ADMIN_CHANGE'];

  const actor = h('input', { type: 'text', id: 'fActor', 'data-testid': 'audit-filter-actor', autocapitalize: 'none' });
  const ev = h('select', { id: 'fEvent', 'data-testid': 'audit-filter-event' }, h('option', { value: '' }, 'ทั้งหมด'), EVENTS.map(e => h('option', { value: e }, e)));
  const from = h('input', { type: 'date', id: 'fFrom', 'data-testid': 'audit-filter-from' });
  const to = h('input', { type: 'date', id: 'fTo', 'data-testid': 'audit-filter-to' });
  const apply = h('button', { type: 'submit', 'data-testid': 'audit-apply-btn' }, 'ค้นหา');
  const csv = h('a', { class: 'btn sec', 'data-testid': 'audit-export-csv-btn', href: '#', download: '' }, 'ส่งออก CSV');
  const form = h('form', { class: 'card', role: 'search', 'aria-label': 'ตัวกรอง Audit', novalidate: true },
    h('div', { class: 'grid' },
      h('div', {}, h('label', { for: 'fActor', style: 'margin-top:0' }, 'ผู้ทำ (username)'), actor),
      h('div', {}, h('label', { for: 'fEvent', style: 'margin-top:0' }, 'เหตุการณ์'), ev),
      h('div', {}, h('label', { for: 'fFrom', style: 'margin-top:0' }, 'ตั้งแต่วันที่'), from),
      h('div', {}, h('label', { for: 'fTo', style: 'margin-top:0' }, 'ถึงวันที่'), to)),
    h('div', { class: 'row', style: 'margin-top:12px' }, apply, csv));
  c.append(form);

  const count = h('strong', { 'data-testid': 'audit-count' }, '0');
  const body = h('tbody');
  const cols = ['เวลา', 'ผู้ทำ', 'บทบาท', 'เหตุการณ์', 'เลขคำขอ', 'สถานะ ก่อน → หลัง', 'รายละเอียด'];
  c.append(h('p', { 'aria-live': 'polite' }, 'พบ ', count, ' รายการ'),
    h('div', { class: 'card' }, h('table', { class: 'rt' }, h('caption', { class: 'sr-only' }, 'รายการ Audit เรียงใหม่ไปเก่า'),
      h('thead', {}, h('tr', {}, cols.map(t => h('th', { scope: 'col' }, t)))), body)));

  const qs = () => 'actor=' + encodeURIComponent(actor.value.trim()) + '&event=' + encodeURIComponent(ev.value) +
    '&from=' + encodeURIComponent(from.value) + '&to=' + encodeURIComponent(to.value);
  async function load() {
    App.clearMsgs(); csv.href = '/api/audit/export.csv?' + qs();
    const r = await api('GET', '/api/audit?' + qs());
    if (!r.ok || !r.data) { showError(errText(r.data)); return; }
    const items = r.data.items || [];
    count.textContent = String(r.data.count != null ? r.data.count : items.length);
    body.replaceChildren();
    items.forEach(x => body.append(h('tr', { 'data-testid': 'audit-row', 'data-id': x.id, 'data-event': x.event, 'data-actor': x.username, 'data-case-no': x.caseNo || '' },
      h('td', { 'data-label': 'เวลา' }, timeEl('audit-time', x.time)),
      h('td', { 'data-label': 'ผู้ทำ', 'data-testid': 'audit-actor' }, x.username),
      h('td', { 'data-label': 'บทบาท', 'data-testid': 'audit-role' }, x.role),
      h('td', { 'data-label': 'เหตุการณ์', 'data-testid': 'audit-event' }, x.event),
      h('td', { 'data-label': 'เลขคำขอ', 'data-testid': 'audit-case-no' }, x.caseNo || '–'),
      h('td', { 'data-label': 'สถานะ', 'data-testid': 'audit-transition' }, (x.fromStatus || x.toStatus) ? (x.fromStatus || '–') + ' → ' + (x.toStatus || '–') : '–'),
      h('td', { 'data-label': 'รายละเอียด', 'data-testid': 'audit-detail' }, x.detail || ''))));
  }
  form.addEventListener('submit', e => { e.preventDefault(); load(); });
  await load();
})();

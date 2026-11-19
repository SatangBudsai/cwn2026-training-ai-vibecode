(async function () {
  const { h, api, page, errText, showError, showSuccess, clearMsgs, fmtDateOnly } = App;
  const user = await App.boot({ roles: ['admin'] });
  if (!user) return;
  const c = page('จัดการวันหยุด', 'ผู้ดูแลระบบ');
  const date = h('input', { type: 'date', id: 'hDate', 'data-testid': 'holiday-date-input' });
  const name = h('input', { type: 'text', id: 'hName', 'data-testid': 'holiday-name-input' });
  const add = h('button', { type: 'submit', 'data-testid': 'holiday-add-btn' }, 'เพิ่มวันหยุด');
  const form = h('form', { class: 'card accent', novalidate: true },
    h('div', { class: 'grid' }, h('div', {}, h('label', { for: 'hDate', style: 'margin-top:0' }, 'วันที่ (ค.ศ. YYYY-MM-DD)'), date),
      h('div', {}, h('label', { for: 'hName', style: 'margin-top:0' }, 'ชื่อวันหยุด'), name)),
    h('p', {}, add));
  const list = h('tbody');
  c.append(form, h('div', { class: 'card' }, h('table', { class: 'rt' }, h('caption', { class: 'sr-only' }, 'รายการวันหยุด'),
    h('thead', {}, h('tr', {}, ['วันที่', 'ชื่อวันหยุด', 'การทำงาน'].map(t => h('th', { scope: 'col' }, t)))), list)));

  async function load() {
    const r = await api('GET', '/api/admin/holidays');
    if (!r.ok) { showError(errText(r.data)); return; }
    const items = (Array.isArray(r.data) ? r.data : (r.data && r.data.items) || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    list.replaceChildren();
    items.forEach(x => list.append(h('tr', { 'data-testid': 'holiday-row', 'data-date': x.date },
      h('td', { 'data-label': 'วันที่' }, x.date + ' (' + fmtDateOnly(x.date) + ')'),
      h('td', { 'data-label': 'ชื่อ' }, x.name || ''),
      h('td', { 'data-label': 'การทำงาน' }, h('button', { type: 'button', class: 'danger small', 'data-testid': 'holiday-delete-btn', 'aria-label': 'ลบวันหยุด ' + x.date, onclick: () => del(x.date) }, 'ลบ')))));
  }
  async function del(d) {
    clearMsgs();
    const r = await api('DELETE', '/api/admin/holidays/' + encodeURIComponent(d));
    if (r.ok) { await load(); showSuccess('ลบวันหยุดแล้ว'); } else showError(errText(r.data));
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); clearMsgs();
    add.disabled = true;
    const r = await api('POST', '/api/admin/holidays', { date: date.value.trim(), name: name.value.trim() });
    add.disabled = false;
    if (r.ok) { await load(); showSuccess('เพิ่มวันหยุดแล้ว'); } else showError(errText(r.data));
  });
  await load();
})();

import { api, $, h, boot, showError, clearError, toast } from '/static/app.js';

const me = await boot({ roles: ['admin'] });
if (me) {
  async function load() {
    try {
      const r = await api('/api/admin/holidays');
      const items = Array.isArray(r) ? r : (r.items || []);
      $('#rows').replaceChildren(...items.map((x) => h('tr', { 'data-testid': 'holiday-row', 'data-date': x.date },
        h('td', null, x.date), h('td', null, x.name || ''),
        h('td', null, h('button', {
          type: 'button', class: 'btn danger', 'data-testid': 'holiday-delete-btn', 'aria-label': `ลบวันหยุด ${x.date}`,
          onclick: async () => {
            clearError();
            try { await api(`/api/admin/holidays/${encodeURIComponent(x.date)}`, { method: 'DELETE' }); toast('ลบแล้ว'); } catch (e) { showError(e.message); }
            load();
          },
        }, 'ลบ')))));
    } catch (e) { showError(e.message); }
  }
  $('#add').onclick = async () => {
    clearError();
    try {
      await api('/api/admin/holidays', { method: 'POST', json: { date: $('#date').value.trim(), name: $('#name').value.trim() } });
      toast('เพิ่มวันหยุดแล้ว');
      $('#date').value = ''; $('#name').value = '';
    } catch (e) { showError(e.message); }
    load();
  };
  load();
}

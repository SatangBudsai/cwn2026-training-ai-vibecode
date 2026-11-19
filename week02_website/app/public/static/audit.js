import { api, $, h, boot, showError, dateEl } from '/static/app.js';

const me = await boot({ roles: ['auditor'] });
if (me) {
  try {
    const ev = await api('/api/audit/events');
    for (const code of ev.items || []) $('#event').append(h('option', { value: code }, code));
  } catch (e) { showError(e.message); }

  const qs = () => `actor=${encodeURIComponent($('#actor').value.trim())}&event=${encodeURIComponent($('#event').value)}&from=${$('#from').value}&to=${$('#to').value}`;
  async function load() {
    $('#csv').href = `/api/audit/export.csv?${qs()}`;
    try {
      const r = await api(`/api/audit?${qs()}`);
      $('[data-testid=audit-count]').textContent = String(r.count ?? (r.items || []).length);
      $('#rows').replaceChildren(...(r.items || []).map((a) => h('tr', { 'data-testid': 'audit-row', 'data-id': a.id, 'data-event': a.event, 'data-actor': a.username, 'data-case-no': a.caseNo || '' },
        dateEl('td', a.time, { 'data-testid': 'audit-time' }),
        h('td', { 'data-testid': 'audit-actor' }, a.username),
        h('td', { 'data-testid': 'audit-role' }, a.role),
        h('td', { 'data-testid': 'audit-event' }, a.event),
        h('td', { 'data-testid': 'audit-case-no' }, a.caseNo || '–'),
        h('td', { 'data-testid': 'audit-transition' }, a.fromStatus || a.toStatus ? `${a.fromStatus || '–'} → ${a.toStatus || '–'}` : '–'),
        h('td', { 'data-testid': 'audit-detail' }, a.detail || ''))));
    } catch (e) { showError(e.message); }
  }
  $('#apply').onclick = load;
  load();
}

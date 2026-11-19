import { api, $, h, boot, showError } from '/static/app.js';

const me = await boot({ roles: ['executive'] });
if (me) {
  const period = $('#period'), service = $('#service');
  // default period = month of the (possibly test) clock
  try {
    const c = await api('/api/test/clock', { noRedirect: true });
    const m = /^(\d{4})-(\d\d)/.exec(c.now || '');
    if (m && [...period.options].some((o) => o.value === `${m[1]}-${m[2]}`)) period.value = `${m[1]}-${m[2]}`;
  } catch (e) { /* not in test mode: keep first option */ }
  const set = (tid, v) => { $(`[data-testid=${tid}]`).textContent = v; };
  async function load() {
    const q = `period=${encodeURIComponent(period.value)}&service=${encodeURIComponent(service.value)}`;
    $('#xlsx').href = `/api/dashboard/export?format=xlsx&${q}`;
    $('#pdf').href = `/api/dashboard/export?format=pdf&${q}`;
    try {
      const d = await api(`/api/dashboard?${q}`);
      set('kpi-received', String(d.received)); set('kpi-closed', String(d.closed));
      set('kpi-ontime-pct', d.ontimePct === null || d.ontimePct === undefined ? '–' : `${Number(d.ontimePct).toFixed(1)}%`);
      set('kpi-backlog', String(d.backlog)); set('kpi-overdue', String(d.overdue));
      $('#wl').replaceChildren(...(d.workload || []).map((w) => h('tr', { 'data-testid': 'workload-row', 'data-username': w.username },
        h('td', null, w.username), h('td', { 'data-testid': 'workload-value' }, String(w.count)))));
    } catch (e) { showError(e.message); }
  }
  period.addEventListener('change', load);
  service.addEventListener('change', load);
  load();
}

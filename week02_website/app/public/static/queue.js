import { api, $, h, boot, showError, clearError, toast, serviceLabel, STATUS_TH, SLA_TH, dateEl } from '/static/app.js';

const me = await boot({ roles: ['officer', 'head'] });
if (me) {
  const sel = $('#filter');
  async function load() {
    try {
      const r = await api(`/api/officer/queue?filter=${encodeURIComponent(sel.value)}`);
      const items = r.items || [];
      if (me.role === 'officer' && r.workload !== undefined && r.workload !== null) { $('#wl').hidden = false; $('[data-testid=workload-count]').textContent = String(r.workload); }
      $('#rows').replaceChildren(...items.map((q) => h('tr', { 'data-testid': 'queue-row', 'data-case-no': q.caseNo, 'data-owner': q.owner || '', 'data-status': q.status, 'data-sla-level': q.slaLevel },
        h('td', { 'data-testid': 'row-case-no' }, h('a', { href: `/officer/cases/${q.caseNo}` }, q.caseNo)),
        h('td', { 'data-testid': 'row-service' }, serviceLabel(q.serviceId) + (q.step ? ` (ขั้น ${q.step}/3)` : '')),
        h('td', { 'data-testid': 'row-applicant' }, q.applicantName),
        h('td', { 'data-testid': 'row-id-masked' }, q.idMasked),
        h('td', { 'data-testid': 'row-status' }, h('span', { class: 'chip', 'data-status': q.status }, STATUS_TH[q.status] || q.status)),
        dateEl('td', q.dueAt, { 'data-testid': 'row-due' }),
        h('td', { 'data-testid': 'row-sla-level' }, h('span', { class: 'chip', 'data-level': q.slaLevel }, SLA_TH[q.slaLevel] || q.slaLevel)),
        h('td', { 'data-testid': 'row-owner' }, q.owner || ''),
        h('td', null, (q.actions || []).includes('claim') ? h('button', {
          type: 'button', class: 'btn', 'data-testid': 'claim-btn', 'aria-label': `รับเรื่อง ${q.caseNo}`,
          onclick: async () => {
            clearError();
            try { await api(`/api/officer/cases/${q.caseNo}/claim`, { method: 'POST' }); toast('รับเรื่องแล้ว'); } catch (e) { showError(e.message); }
            load();
          },
        }, 'รับเรื่อง') : null))));
      $('#empty-slot').replaceChildren(items.length ? '' : h('p', { 'data-testid': 'queue-empty', class: 'note' }, 'ไม่มีงานในคิว'));
    } catch (e) { showError(e.message); }
  }
  sel.addEventListener('change', load);
  load();
}

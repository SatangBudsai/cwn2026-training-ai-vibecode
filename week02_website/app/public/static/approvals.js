import { api, $, h, boot, showError, serviceLabel, dateEl } from '/static/app.js';

const me = await boot({ roles: ['head'] });
if (me) {
  try {
    const r = await api('/api/head/approvals');
    const items = r.items || [];
    $('#rows').replaceChildren(...items.map((q) => h('tr', { 'data-testid': 'approval-row', 'data-case-no': q.caseNo },
      h('td', { 'data-testid': 'row-case-no' }, q.caseNo),
      h('td', { 'data-testid': 'row-service' }, serviceLabel(q.serviceId)),
      h('td', { 'data-testid': 'row-applicant' }, q.applicantName),
      dateEl('td', q.dueAt, { 'data-testid': 'row-due' }),
      h('td', null, h('a', { class: 'btn secondary', href: `/officer/cases/${q.caseNo}`, 'data-testid': 'approval-open' }, 'เปิดคำขอ')))));
    $('#empty').hidden = items.length > 0;
  } catch (e) { showError(e.message); }
}

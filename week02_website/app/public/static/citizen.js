import { api, $, h, boot, showError, serviceLabel, STATUS_TH, dateEl } from '/static/app.js';

const me = await boot({ roles: ['citizen'] });
if (me) {
  $('[data-testid=citizen-welcome]').textContent = `สวัสดี ${me.name}`;
  try {
    const [cases, drafts] = await Promise.all([api('/api/cases'), api('/api/drafts')]);
    const cs = (cases.items || []).slice().sort((a, b) => (a.caseNo < b.caseNo ? 1 : a.caseNo > b.caseNo ? -1 : 0));
    $('#cases').replaceChildren(...cs.map((c) => h('tr', { 'data-testid': 'my-case-row', 'data-case-no': c.caseNo, 'data-status': c.status },
      h('td', { 'data-testid': 'row-case-no' }, h('a', { href: `/citizen/cases/${c.caseNo}` }, c.caseNo)),
      h('td', { 'data-testid': 'row-service' }, serviceLabel(c.serviceId)),
      h('td', null, h('span', { class: 'chip', 'data-status': c.status, 'data-testid': 'row-status' }, STATUS_TH[c.status] || c.status)),
      dateEl('td', c.dueAt, { 'data-testid': 'row-due' }))));
    $('#cases-empty').hidden = cs.length > 0;
    const ds = (drafts.items || []).filter((d) => d.status === 'DRAFT' || d.status === 'PENDING_PAYMENT');
    $('#drafts').replaceChildren(...ds.map((d) => h('tr', { 'data-testid': 'my-draft-row', 'data-draft-id': d.draftId, 'data-status': d.status },
      h('td', { 'data-testid': 'row-draft-id' }, d.draftId),
      h('td', { 'data-testid': 'row-service' }, serviceLabel(d.serviceId)),
      h('td', null, h('span', { class: 'chip', 'data-status': d.status, 'data-testid': 'row-status' }, STATUS_TH[d.status] || d.status)),
      h('td', null, h('a', { class: 'btn secondary', href: `/citizen/new/${d.serviceId}?draft=${encodeURIComponent(d.draftId)}`, 'data-testid': 'open-draft-btn' }, 'เปิดร่าง')))));
    $('#drafts-empty').hidden = ds.length > 0;
  } catch (e) { showError(e.message); }
}

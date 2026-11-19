(async function () {
  const { h, api, page, serviceLabel, statusBadge, timeEl, fmtDateTime, fmtMoney, SERVICES } = App;
  const user = await App.boot({ roles: ['citizen'] });
  if (!user) return;
  const c = page('คำขอและร่างของฉัน', 'ประชาชน');
  c.append(h('p', { 'data-testid': 'citizen-welcome', class: 'muted', style: 'font-size:1.1rem;color:#1b2333' }, 'สวัสดี ' + (user.name || '')));

  const start = h('div', { class: 'grid' });
  Object.keys(SERVICES).forEach(id => {
    start.append(h('div', { class: 'card accent' },
      h('p', { class: 'eyebrow' }, id),
      h('h2', {}, SERVICES[id].name),
      h('a', { class: 'btn', 'data-testid': 'start-service-' + id, href: '/citizen/new/' + id, 'aria-label': 'เริ่มบริการ ' + SERVICES[id].name }, 'เริ่มบริการ')));
  });
  c.append(h('section', { 'aria-labelledby': 'h-start' }, h('h2', { id: 'h-start' }, 'เริ่มบริการ'), start));

  const casesBody = h('tbody'), draftsBody = h('tbody');
  const casesEmpty = h('p', { class: 'muted', hidden: true }, 'ยังไม่มีคำขอ');
  const draftsEmpty = h('p', { class: 'muted', hidden: true }, 'ยังไม่มีร่าง');
  const th = list => h('thead', {}, h('tr', {}, list.map(t => h('th', { scope: 'col' }, t))));
  c.append(h('section', { 'aria-labelledby': 'h-cases', class: 'card' }, h('h2', { id: 'h-cases' }, 'คำขอของฉัน'),
    h('table', { class: 'rt' }, h('caption', { class: 'sr-only' }, 'รายการคำขอของฉัน'), th(['เลขคำขอ', 'บริการ', 'สถานะ', 'กำหนดเสร็จ']), casesBody), casesEmpty));
  c.append(h('section', { 'aria-labelledby': 'h-drafts', class: 'card' }, h('h2', { id: 'h-drafts' }, 'ร่างและรอชำระเงิน'),
    h('table', { class: 'rt' }, h('caption', { class: 'sr-only' }, 'รายการร่างและรอชำระเงิน'), th(['รหัสร่าง', 'บริการ', 'สถานะ', 'ค่าธรรมเนียม', 'การทำงาน']), draftsBody), draftsEmpty));

  const [rc, rd] = await Promise.all([api('GET', '/api/cases'), api('GET', '/api/drafts')]);
  const cases = ((rc.data && rc.data.items) || []).slice().sort((a, b) => (a.caseNo < b.caseNo ? 1 : a.caseNo > b.caseNo ? -1 : 0));
  cases.forEach(x => {
    casesBody.append(h('tr', { 'data-testid': 'my-case-row', 'data-case-no': x.caseNo, 'data-status': x.status },
      h('td', { 'data-label': 'เลขคำขอ' }, h('a', { 'data-testid': 'row-case-no', href: '/citizen/cases/' + encodeURIComponent(x.caseNo) }, x.caseNo)),
      h('td', { 'data-label': 'บริการ', 'data-testid': 'row-service' }, serviceLabel(x.serviceId)),
      h('td', { 'data-label': 'สถานะ' }, statusBadge(x.status, 'row-status')),
      h('td', { 'data-label': 'กำหนดเสร็จ' }, timeEl('row-due', x.dueAt))));
  });
  casesEmpty.hidden = cases.length > 0;
  const drafts = ((rd.data && rd.data.items) || []).filter(d => d.status === 'DRAFT' || d.status === 'PENDING_PAYMENT');
  drafts.forEach(d => {
    draftsBody.append(h('tr', { 'data-testid': 'my-draft-row', 'data-draft-id': d.draftId, 'data-status': d.status },
      h('td', { 'data-label': 'รหัสร่าง', 'data-testid': 'row-draft-id' }, d.draftId),
      h('td', { 'data-label': 'บริการ', 'data-testid': 'row-service' }, serviceLabel(d.serviceId)),
      h('td', { 'data-label': 'สถานะ' }, statusBadge(d.status, 'row-status')),
      h('td', { 'data-label': 'ค่าธรรมเนียม' }, d.fee != null ? fmtMoney(d.fee) : '–'),
      h('td', { 'data-label': 'การทำงาน' }, h('a', { class: 'btn small sec', 'data-testid': 'open-draft-btn', href: '/citizen/new/' + d.serviceId + '?draft=' + encodeURIComponent(d.draftId), 'aria-label': 'เปิดร่าง ' + d.draftId }, 'เปิดร่าง'))));
  });
  draftsEmpty.hidden = drafts.length > 0;
})();

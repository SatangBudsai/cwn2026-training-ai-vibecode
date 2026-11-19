(async function () {
  const { h, api, page, errText, serviceLabel, timeEl, showError } = App;
  const user = await App.boot({ roles: ['head'] });
  if (!user) return;
  const c = page('รายการรออนุมัติ', 'หัวหน้าฝ่าย');
  const body = h('tbody');
  const empty = h('p', { class: 'info', hidden: true }, 'ไม่มีรายการรออนุมัติ');
  c.append(h('div', { class: 'card' },
    h('table', { class: 'rt' }, h('caption', { class: 'sr-only' }, 'รายการรออนุมัติ'),
      h('thead', {}, h('tr', {}, ['เลขคำขอ', 'บริการ', 'ผู้ยื่น', 'กำหนดเสร็จ', 'การทำงาน'].map(t => h('th', { scope: 'col' }, t)))), body), empty));
  const r = await api('GET', '/api/head/approvals');
  if (!r.ok) { showError(errText(r.data)); return; }
  const items = ((r.data && r.data.items) || [])
    .sort((a, b) => (new Date(a.dueAt) - new Date(b.dueAt)) || (a.caseNo < b.caseNo ? -1 : a.caseNo > b.caseNo ? 1 : 0));
  items.forEach(x => body.append(h('tr', { 'data-testid': 'approval-row', 'data-case-no': x.caseNo },
    h('td', { 'data-label': 'เลขคำขอ', 'data-testid': 'row-case-no' }, x.caseNo),
    h('td', { 'data-label': 'บริการ', 'data-testid': 'row-service' }, serviceLabel(x.serviceId)),
    h('td', { 'data-label': 'ผู้ยื่น', 'data-testid': 'row-applicant' }, x.applicantName || ''),
    h('td', { 'data-label': 'กำหนดเสร็จ' }, timeEl('row-due', x.dueAt)),
    h('td', { 'data-label': 'การทำงาน' }, h('a', { class: 'btn small', 'data-testid': 'approval-open', href: '/officer/cases/' + encodeURIComponent(x.caseNo), 'aria-label': 'เปิดคำขอ ' + x.caseNo }, 'เปิดคำขอ')))));
  empty.hidden = items.length > 0;
})();

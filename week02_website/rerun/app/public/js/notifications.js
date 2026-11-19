(async function () {
  const { h, api, page, errText, showError, fmtDateTime } = App;
  const user = await App.boot({ roles: ['officer', 'head'] });
  if (!user) return;
  const c = page('แจ้งเตือน', 'ระบบแจ้งเตือนภายใน');
  const list = h('ul', { class: 'plain', 'aria-label': 'รายการแจ้งเตือน' });
  const empty = h('p', { 'data-testid': 'noti-empty', class: 'info', hidden: true }, 'ไม่มีแจ้งเตือน');
  c.append(h('div', { class: 'card' }, list, empty));
  const r = await api('GET', '/api/notifications');
  if (!r.ok) { showError(errText(r.data)); return; }
  const items = (r.data && r.data.items) || [];
  items.forEach(n => {
    const text = 'คำขอ ' + n.caseNo + (n.level === 'overdue' ? ' เกินกำหนด' : ' ใกล้ครบกำหนด');
    list.append(h('li', { 'data-testid': 'noti-item', 'data-case-no': n.caseNo, 'data-level': n.level, 'data-id': n.id },
      h('a', { href: '/officer/cases/' + encodeURIComponent(n.caseNo), title: n.createdAt ? fmtDateTime(n.createdAt) : null }, text)));
  });
  empty.hidden = items.length > 0;
  App.setBell(items.length);
})();

import { api, $, h, boot, showError, dateEl } from '/static/app.js';

const me = await boot({ roles: ['officer', 'head'] });
if (me) {
  try {
    const r = await api('/api/notifications');
    const items = r.items || [];
    $('#list').replaceChildren(...items.map((n) => h('li', { 'data-testid': 'noti-item', 'data-case-no': n.caseNo, 'data-level': n.level },
      h('a', { href: `/officer/cases/${n.caseNo}` }, n.text || `คำขอ ${n.caseNo} ${n.level === 'overdue' ? 'เกินกำหนด' : 'ใกล้ครบกำหนด'}`))));
    $('#empty-slot').replaceChildren(items.length ? '' : h('p', { 'data-testid': 'noti-empty', class: 'note' }, 'ไม่มีแจ้งเตือน'));
  } catch (e) { showError(e.message); }
}

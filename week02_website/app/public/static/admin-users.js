import { api, $, h, boot, showError, clearError, toast, ROLE_TH } from '/static/app.js';

const me = await boot({ roles: ['admin'] });
if (me) {
  try {
    const r = await api('/api/admin/users');
    $('#rows').replaceChildren(...(r.items || []).map((u) => {
      const rid = 'role-' + u.username, did = 'dept-' + u.username;
      const role = h('select', { id: rid, 'data-testid': 'user-role-select' }, Object.keys(ROLE_TH).map((k) => h('option', { value: k, selected: k === u.role }, `${ROLE_TH[k]} (${k})`)));
      const dept = h('select', { id: did, 'data-testid': 'user-dept-select' },
        [['', '(ไม่มี)'], ['registry', 'ฝ่ายทะเบียน'], ['works', 'ฝ่ายโยธา']].map(([v, l]) => h('option', { value: v, selected: v === (u.dept || '') }, l)));
      return h('tr', { 'data-testid': 'user-row', 'data-username': u.username },
        h('th', { scope: 'row' }, u.username), h('td', null, u.name || ''),
        h('td', null, h('label', { for: rid, class: 'lbl', style: 'position:absolute;left:-999px' }, `บทบาทของ ${u.username}`), role),
        h('td', null, h('label', { for: did, class: 'lbl', style: 'position:absolute;left:-999px' }, `ฝ่ายของ ${u.username}`), dept),
        h('td', null, h('button', {
          type: 'button', class: 'btn', 'data-testid': 'user-save-btn',
          onclick: async () => {
            clearError();
            try { await api(`/api/admin/users/${encodeURIComponent(u.username)}`, { method: 'PUT', json: { role: role.value, dept: dept.value } }); toast('บันทึกแล้ว'); } catch (e) { showError(e.message); }
          },
        }, 'บันทึก')));
    }));
  } catch (e) { showError(e.message); }
}

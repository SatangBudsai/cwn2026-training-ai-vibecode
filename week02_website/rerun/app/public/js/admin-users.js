(async function () {
  const { h, api, page, errText, showError, showSuccess, clearMsgs, ROLE_TH } = App;
  const user = await App.boot({ roles: ['admin'] });
  if (!user) return;
  const c = page('จัดการผู้ใช้และบทบาท', 'ผู้ดูแลระบบ');
  const r = await api('GET', '/api/admin/users');
  if (!r.ok) { showError(errText(r.data)); return; }
  const items = Array.isArray(r.data) ? r.data : (r.data && r.data.items) || [];
  const DEPT = { '': '(ไม่มีแผนก)', registry: 'ฝ่ายทะเบียน (registry)', works: 'ฝ่ายโยธา (works)' };
  const body = h('tbody');
  items.forEach((u, i) => {
    const role = h('select', { id: 'role-' + i, 'data-testid': 'user-role-select' }, Object.keys(ROLE_TH).map(k => h('option', { value: k }, ROLE_TH[k] + ' (' + k + ')')));
    role.value = u.role;
    const dept = h('select', { id: 'dept-' + i, 'data-testid': 'user-dept-select' }, Object.keys(DEPT).map(k => h('option', { value: k }, DEPT[k])));
    dept.value = u.dept || '';
    const save = h('button', { type: 'button', class: 'small', 'data-testid': 'user-save-btn', 'aria-label': 'บันทึก ' + u.username }, 'บันทึก');
    save.addEventListener('click', async () => {
      clearMsgs(); save.disabled = true;
      const res = await api('PUT', '/api/admin/users/' + encodeURIComponent(u.username), { role: role.value, dept: dept.value });
      save.disabled = false;
      if (res.ok) showSuccess('บันทึก ' + u.username + ' แล้ว (มีผลกับการเข้าสู่ระบบครั้งถัดไป)'); else showError(errText(res.data));
    });
    body.append(h('tr', { 'data-testid': 'user-row', 'data-username': u.username },
      h('td', { 'data-label': 'ผู้ใช้' }, h('strong', {}, u.username), u.name ? h('div', { class: 'muted' }, u.name) : null),
      h('td', { 'data-label': 'บทบาท' }, h('label', { for: 'role-' + i, class: 'sr-only' }, 'บทบาทของ ' + u.username), role),
      h('td', { 'data-label': 'แผนก' }, h('label', { for: 'dept-' + i, class: 'sr-only' }, 'แผนกของ ' + u.username), dept),
      h('td', { 'data-label': 'การทำงาน' }, save)));
  });
  c.append(h('div', { class: 'card' }, h('table', { class: 'rt' }, h('caption', { class: 'sr-only' }, 'รายชื่อผู้ใช้'),
    h('thead', {}, h('tr', {}, ['ผู้ใช้', 'บทบาท', 'แผนก', 'การทำงาน'].map(t => h('th', { scope: 'col' }, t)))), body)));
})();

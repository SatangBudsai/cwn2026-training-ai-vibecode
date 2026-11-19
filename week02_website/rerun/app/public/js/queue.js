(async function () {
  const { h, api, page, errText, serviceLabel, statusBadge, levelBadge, timeEl, showError, showSuccess, clearMsgs } = App;
  const user = await App.boot({ roles: ['officer', 'head'] });
  if (!user) return;
  const c = page('คิวงาน', user.role === 'head' ? 'หัวหน้าฝ่าย (อ่านอย่างเดียว)' : 'เจ้าหน้าที่');

  const sel = h('select', { id: 'qfilter', 'data-testid': 'queue-filter' },
    h('option', { value: 'all' }, 'ทั้งหมด'), h('option', { value: 'unclaimed' }, 'ยังไม่มีผู้รับ'), h('option', { value: 'mine' }, 'ของฉัน'));
  sel.value = 'all';
  const wl = h('strong', { 'data-testid': 'workload-count' }, '0');
  const bar = h('div', { class: 'row', style: 'margin-bottom:12px' }, h('div', {}, h('label', { for: 'qfilter', style: 'margin-top:0' }, 'แสดง'), sel));
  if (user.role === 'officer') bar.append(h('p', { style: 'margin:0' }, 'งานในมือของฉัน: ', wl, ' เรื่อง'));
  c.append(bar);

  const body = h('tbody');
  const cols = ['เลขคำขอ', 'บริการ', 'ผู้ยื่น', 'เลขบัตร', 'สถานะ', 'กำหนดเสร็จ', 'ระดับเตือน', 'ผู้ถือเรื่อง', 'การทำงาน'];
  const empty = h('p', { 'data-testid': 'queue-empty', class: 'info', hidden: true }, 'ไม่มีงานในคิว');
  c.append(h('div', { class: 'card' },
    h('table', { 'data-testid': 'queue-table', class: 'rt' }, h('caption', { class: 'sr-only' }, 'คิวงาน'),
      h('thead', {}, h('tr', {}, cols.map(t => h('th', { scope: 'col' }, t)))), body), empty));

  const cmp = (a, b) => (new Date(a.dueAt) - new Date(b.dueAt)) || (a.caseNo < b.caseNo ? -1 : a.caseNo > b.caseNo ? 1 : 0);

  async function load() {
    const r = await api('GET', '/api/officer/queue?filter=' + encodeURIComponent(sel.value));
    if (!r.ok) { showError(errText(r.data)); return; }
    const items = ((r.data && r.data.items) || []).slice().sort(cmp);
    body.replaceChildren();
    items.forEach(x => {
      const claimable = user.role === 'officer' && !x.owner && (x.status === 'SUBMITTED' || x.status === 'IN_REVIEW');
      body.append(h('tr', { 'data-testid': 'queue-row', 'data-case-no': x.caseNo, 'data-owner': x.owner || '', 'data-status': x.status, 'data-sla-level': x.slaLevel },
        h('td', { 'data-label': 'เลขคำขอ' }, h('a', { 'data-testid': 'row-case-no', href: '/officer/cases/' + encodeURIComponent(x.caseNo) }, x.caseNo)),
        h('td', { 'data-label': 'บริการ', 'data-testid': 'row-service' }, serviceLabel(x.serviceId)),
        h('td', { 'data-label': 'ผู้ยื่น', 'data-testid': 'row-applicant' }, x.applicantName || ''),
        h('td', { 'data-label': 'เลขบัตร', 'data-testid': 'row-id-masked' }, x.idMasked || ''),
        h('td', { 'data-label': 'สถานะ' }, statusBadge(x.status, 'row-status')),
        h('td', { 'data-label': 'กำหนดเสร็จ' }, timeEl('row-due', x.dueAt)),
        h('td', { 'data-label': 'ระดับเตือน' }, levelBadge(x.slaLevel, 'row-sla-level')),
        h('td', { 'data-label': 'ผู้ถือเรื่อง', 'data-testid': 'row-owner' }, x.owner || ''),
        h('td', { 'data-label': 'การทำงาน' }, claimable ? h('button', { type: 'button', class: 'small', 'data-testid': 'claim-btn', 'aria-label': 'รับเรื่อง ' + x.caseNo, onclick: () => claim(x.caseNo) }, 'รับเรื่อง') : null)));
    });
    empty.hidden = items.length > 0;
    if (user.role === 'officer') {
      if (sel.value === 'mine') wl.textContent = String(items.length);
      else { const m = await api('GET', '/api/officer/queue?filter=mine'); if (m.ok && m.data) wl.textContent = String((m.data.items || []).length); }
    }
  }
  async function claim(no) {
    clearMsgs();
    const r = await api('POST', '/api/officer/cases/' + encodeURIComponent(no) + '/claim');
    if (!r.ok) showError(errText(r.data));
    await load();
    if (r.ok) showSuccess('รับเรื่องแล้ว');
  }
  sel.addEventListener('change', () => { clearMsgs(); load(); });
  await load();
})();

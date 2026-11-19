(async function () {
  const { h, api, page, errText, showError } = App;
  const user = await App.boot({ roles: ['executive'] });
  if (!user) return;
  const c = page('Dashboard ภาพรวมการให้บริการ', 'ผู้บริหาร');

  const periods = [['2026-12', 'ธันวาคม 2569'], ['2026-11', 'พฤศจิกายน 2569'], ['2026-10', 'ตุลาคม 2569'], ['2026', 'ทั้งปี 2569']];
  const period = h('select', { id: 'period', 'data-testid': 'period-select' }, periods.map(p => h('option', { value: p[0] }, p[1])));
  const service = h('select', { id: 'service', 'data-testid': 'service-select' },
    h('option', { value: 'ALL' }, 'ทุกบริการ'), h('option', { value: 'SV-01' }, 'SV-01 ขอหนังสือรับรอง'),
    h('option', { value: 'SV-02' }, 'SV-02 ขออนุญาตประกอบกิจการ'), h('option', { value: 'SV-03' }, 'SV-03 ขออนุญาตก่อสร้าง/ต่อเติมอาคาร'));
  const xlsx = h('a', { class: 'btn sec', 'data-testid': 'export-xlsx-btn', href: '#' }, 'ส่งออก Excel');
  const pdf = h('a', { class: 'btn sec', 'data-testid': 'export-pdf-btn', href: '#' }, 'ส่งออก PDF');
  c.append(h('div', { class: 'card' }, h('div', { class: 'row', style: 'align-items:flex-end' },
    h('div', {}, h('label', { for: 'period', style: 'margin-top:0' }, 'ช่วงเวลา'), period),
    h('div', {}, h('label', { for: 'service', style: 'margin-top:0' }, 'บริการ'), service),
    xlsx, pdf)));

  const kv = {};
  const kpis = h('div', { class: 'grid', 'aria-live': 'polite' });
  [['received', 'รับเรื่อง'], ['closed', 'ปิดงาน'], ['ontime-pct', 'ทันกำหนด %'], ['backlog', 'งานคงค้าง'], ['overdue', 'เกินกำหนดคงค้าง']].forEach(k => {
    kv[k[0]] = h('div', { class: 'v', 'data-testid': 'kpi-' + k[0] }, '–');
    kpis.append(h('div', { class: 'kpi' }, kv[k[0]], h('div', { class: 'l' }, k[1])));
  });
  c.append(kpis);
  const wbody = h('tbody');
  c.append(h('section', { class: 'card', style: 'margin-top:16px', 'aria-labelledby': 'h-wl' }, h('h2', { id: 'h-wl' }, 'งานในมือรายเจ้าหน้าที่'),
    h('table', {}, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'เจ้าหน้าที่'), h('th', { scope: 'col' }, 'งานในมือ (เรื่อง)'))), wbody)));

  const NAMES = { 'off.reg1': 'เจ้าหน้าที่ทะเบียน 1', 'off.reg2': 'เจ้าหน้าที่ทะเบียน 2', 'off.works1': 'เจ้าหน้าที่โยธา 1' };

  function exportLinks() {
    const q = '&period=' + encodeURIComponent(period.value) + '&service=' + encodeURIComponent(service.value);
    xlsx.href = '/api/dashboard/export?format=xlsx' + q; pdf.href = '/api/dashboard/export?format=pdf' + q;
    xlsx.setAttribute('download', ''); pdf.setAttribute('download', '');
  }
  async function load() {
    App.clearMsgs(); exportLinks();
    const r = await api('GET', '/api/dashboard?period=' + encodeURIComponent(period.value) + '&service=' + encodeURIComponent(service.value));
    if (!r.ok || !r.data) { showError(errText(r.data)); return; }
    const d = r.data;
    kv.received.textContent = d.received; kv.closed.textContent = d.closed;
    kv['ontime-pct'].textContent = d.ontimePct == null || d.closed === 0 ? '–' : Number(d.ontimePct).toFixed(1) + '%';
    kv.backlog.textContent = d.backlog; kv.overdue.textContent = d.overdue;
    const map = {}; (d.workload || []).forEach(w => { map[w.username] = w.count; });
    Object.keys(NAMES).forEach(u => { if (!(u in map)) map[u] = 0; });
    wbody.replaceChildren();
    Object.keys(map).forEach(u => wbody.append(h('tr', { 'data-testid': 'workload-row', 'data-username': u },
      h('td', {}, NAMES[u] || u), h('td', { 'data-testid': 'workload-value' }, String(map[u])))));
  }
  period.addEventListener('change', load); service.addEventListener('change', load);

  /* ค่าเริ่มต้น = เดือนของนาฬิการะบบ (ใช้นาฬิกาทดสอบถ้ามี ไม่เช่นนั้นนาฬิกาเครื่อง ตามเขตเวลาไทย) */
  let now = null;
  const ck = await api('GET', '/api/test/clock');
  if (ck.ok && ck.data && ck.data.now) now = new Date(ck.data.now);
  if (!now || isNaN(now)) now = new Date();
  const t = new Date(now.getTime() + 7 * 3600000);
  const ym = t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0');
  period.value = periods.some(p => p[0] === ym) ? ym : '2026-12';
  await load();
})();

/* testid ไดนามิก: kpi-received kpi-closed kpi-ontime-pct kpi-backlog kpi-overdue */

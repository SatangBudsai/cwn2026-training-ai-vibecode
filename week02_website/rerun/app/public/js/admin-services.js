(async function () {
  const { h, api, page, errText, showError, showSuccess, clearMsgs, SERVICES } = App;
  const user = await App.boot({ roles: ['admin'] });
  if (!user) return;
  const c = page('จัดการบริการ ค่าธรรมเนียม และ SLA', 'ผู้ดูแลระบบ');
  const r = await api('GET', '/api/admin/services');
  if (!r.ok) { showError(errText(r.data)); return; }
  const items = (r.data && r.data.items) || [];
  const num = (id, tidv, label, val) => {
    const inp = h('input', { type: 'text', inputmode: 'numeric', id, 'data-testid': tidv, value: val == null ? '' : String(val) });
    return h('div', {}, h('label', { for: id }, label), inp);
  };
  ['SV-01', 'SV-02', 'SV-03'].forEach(id => {
    const s = items.find(x => x.id === id) || {};
    const fields = [];
    if (id === 'SV-01') fields.push(num('fee-' + id, 'svc-fee-' + id, 'ค่าธรรมเนียม ต่อฉบับ (บาท)', s.fee));
    if (id === 'SV-02') fields.push(num('fee-' + id, 'svc-fee-' + id, 'ค่าธรรมเนียมคงที่ (บาท)', s.fee));
    if (id === 'SV-03') {
      fields.push(num('fee-' + id, 'svc-fee-' + id, 'ค่าธรรมเนียมฐาน พื้นที่ 1–100 ตร.ม. (บาท)', s.feeBase != null ? s.feeBase : s.fee));
      fields.push(num('sqm-' + id, 'svc-fee-per-sqm-' + id, 'ค่าธรรมเนียมต่อ ตร.ม. ส่วนเกิน 100 (บาท)', s.feePerSqm));
    }
    fields.push(num('sla-' + id, 'svc-sla-' + id, 'SLA (วันทำการ)', s.sla));
    const btn = h('button', { type: 'button', 'data-testid': 'svc-save-' + id, 'aria-label': 'บันทึก ' + id }, 'บันทึก');
    const row = h('section', { class: 'card accent', 'data-testid': 'service-row', 'data-service-id': id, 'aria-label': id },
      h('p', { class: 'eyebrow' }, id), h('h2', {}, SERVICES[id].name), h('div', { class: 'grid' }, fields), h('p', {}, btn));
    btn.addEventListener('click', async () => {
      clearMsgs();
      const v = k => row.querySelector('[data-testid="' + k + '"]').value.trim();
      const toNum = t => (/^-?\d+$/.test(t) ? Number(t) : NaN);
      const body = id === 'SV-03' ? { feeBase: toNum(v('svc-fee-SV-03')), feePerSqm: toNum(v('svc-fee-per-sqm-SV-03')), sla: toNum(v('svc-sla-SV-03')) }
        : { fee: toNum(v('svc-fee-' + id)), sla: toNum(v('svc-sla-' + id)) };
      const bad = Object.keys(body).filter(k => Number.isNaN(body[k]));
      if (bad.length) { showError(bad.indexOf('sla') >= 0 ? App.ERRORS.INVALID_SLA : App.ERRORS.INVALID_FEE); return; }
      btn.disabled = true;
      const res = await api('PUT', '/api/admin/services/' + id, body);
      btn.disabled = false;
      if (res.ok) showSuccess('บันทึก ' + id + ' แล้ว'); else showError(errText(res.data));
    });
    c.append(row);
  });
})();

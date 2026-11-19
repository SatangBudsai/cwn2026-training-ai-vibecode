import { api, $, h, boot, showError, clearError, toast, serviceLabel } from '/static/app.js';

const ERR = { INVALID_FEE: 'ค่าธรรมเนียมต้องเป็นจำนวนเต็ม 0–100,000 บาท', INVALID_SLA: 'SLA ต้องเป็นจำนวนเต็ม 1–60 วันทำการ' };
const me = await boot({ roles: ['admin'] });
if (me) {
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' ? null : Number(v); };
  const inp = (id, tid, val, label) => h('div', { class: 'field', style: 'margin-bottom:.5rem' },
    h('label', { for: id }, label), h('input', { type: 'number', step: 'any', id, 'data-testid': tid, value: val ?? '' }));
  try {
    const r = await api('/api/admin/services');
    $('#rows').replaceChildren(...(r.items || []).map((s) => {
      const k = s.id;
      const fees = k === 'SV-03'
        ? [inp('fee-' + k, `svc-fee-${k}`, s.feeBase ?? s.fee, 'ฐาน ฿ (พื้นที่ 1–100 ตร.ม.)'), inp('sqm-' + k, `svc-fee-per-sqm-${k}`, s.feePerSqm, '฿ ต่อ ตร.ม. ส่วนที่เกิน 100')]
        : [inp('fee-' + k, `svc-fee-${k}`, s.fee, k === 'SV-01' ? '฿ ต่อฉบับ' : '฿ คงที่')];
      return h('tr', { 'data-testid': 'service-row', 'data-service-id': k },
        h('th', { scope: 'row' }, serviceLabel(k)),
        h('td', null, fees),
        h('td', null, inp('sla-' + k, `svc-sla-${k}`, s.sla, 'SLA (วันทำการ)')),
        h('td', null, h('button', {
          type: 'button', class: 'btn', 'data-testid': `svc-save-${k}`,
          onclick: async () => {
            clearError();
            const body = k === 'SV-03' ? { feeBase: num('fee-' + k), feePerSqm: num('sqm-' + k), sla: num('sla-' + k) } : { fee: num('fee-' + k), sla: num('sla-' + k) };
            try { await api(`/api/admin/services/${k}`, { method: 'PUT', json: body }); toast('บันทึกแล้ว'); } catch (e) { showError(ERR[e.code] || e.message); }
          },
        }, 'บันทึก')));
    }));
  } catch (e) { showError(e.message); }
}

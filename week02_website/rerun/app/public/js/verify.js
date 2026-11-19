(async function () {
  const { h, api, page, serviceLabel, timeEl, fmtDateOnly } = App;
  const user = await App.boot({ auth: false });
  const code = decodeURIComponent(location.pathname.split('/')[2] || '');
  const c = page('ตรวจสอบเอกสารดิจิทัล', 'ตรวจสอบได้โดยไม่ต้องเข้าสู่ระบบ');
  const r = await api('GET', '/api/verify/' + encodeURIComponent(code));
  const d = (r.data && r.data.result) ? r.data : { result: 'NOT_FOUND' };
  const TXT = { VALID: 'เอกสารถูกต้อง', EXPIRED: 'เอกสารหมดอายุ', TAMPERED: 'ลายเซ็นไม่ถูกต้อง', NOT_FOUND: 'ไม่พบเอกสาร' };
  const CLS = { VALID: 'b-ok', EXPIRED: 'b-warn', TAMPERED: 'b-bad', NOT_FOUND: 'b-bad' };
  const MARK = { VALID: '✓ ', EXPIRED: '! ', TAMPERED: '✗ ', NOT_FOUND: '✗ ' };
  const res = d.result in TXT ? d.result : 'NOT_FOUND';
  c.append(h('div', { class: 'card accent', role: 'status' },
    h('p', { style: 'font-size:1.5rem;margin:0' }, h('span', { 'data-testid': 'verify-result', 'data-result': res, class: 'badge ' + CLS[res], style: 'font-size:1.3rem;padding:4px 16px' }, TXT[res]))));
  if (res === 'VALID' || res === 'EXPIRED') {
    const kv = h('dl', { class: 'kv' },
      h('dt', {}, 'เลขเอกสาร'), h('dd', { 'data-testid': 'verify-doc-no' }, d.docNo || '–'),
      h('dt', {}, 'ผู้ยื่นคำขอ'), h('dd', { 'data-testid': 'verify-applicant' }, d.applicantMasked || '–'),
      h('dt', {}, 'บริการ'), h('dd', { 'data-testid': 'verify-service' }, serviceLabel(d.serviceId)),
      h('dt', {}, 'วันที่ออกเอกสาร'), h('dd', {}, timeEl('verify-issued', d.issuedAt)),
      h('dt', {}, 'ผู้ลงนาม'), h('dd', { 'data-testid': 'verify-signer' }, d.signer || '–'),
      h('dt', {}, 'ใช้ได้ถึง'), h('dd', {}, h('time', { 'data-testid': 'verify-expires', 'data-iso': String(d.validUntil || '').slice(0, 10), datetime: String(d.validUntil || '').slice(0, 10) }, fmtDateOnly(d.validUntil))));
    c.append(h('div', { class: 'card' }, kv));
  }
  c.append(h('p', { class: 'muted' }, 'ผลการตรวจสอบนี้เป็นการจำลองเพื่อการเรียนรู้ ลายเซ็นดิจิทัลเป็นตัวจำลอง'));
})();

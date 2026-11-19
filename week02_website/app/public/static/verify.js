import { api, $, h, dateEl, fmtDate, serviceLabel } from '/static/app.js';

const TXT = { VALID: 'เอกสารถูกต้อง', EXPIRED: 'เอกสารหมดอายุ', TAMPERED: 'ลายเซ็นไม่ถูกต้อง', NOT_FOUND: 'ไม่พบเอกสาร' };
const code = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop());
let d;
try { d = await api(`/api/verify/${encodeURIComponent(code)}`, { noRedirect: true }); } catch (e) {
  d = e.data && e.data.result ? e.data : { result: 'NOT_FOUND' };
}
const res = d.result in TXT ? d.result : 'NOT_FOUND';
const kids = [h('p', { class: 'chip', style: 'font-size:1.2rem', 'data-testid': 'verify-result', 'data-result': res, 'data-status': res === 'VALID' ? 'APPROVED' : 'REJECTED', role: 'status' }, TXT[res])];
if (res === 'VALID' || res === 'EXPIRED') {
  // last valid day: date-only, Bangkok calendar
  let vu = d.validUntil || '';
  if (vu.includes('T')) {
    const t = new Date(vu);
    vu = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
  }
  kids.push(h('dl', { class: 'kv' },
    h('dt', null, 'เลขเอกสาร'), h('dd', { 'data-testid': 'verify-doc-no' }, d.docNo),
    h('dt', null, 'ผู้ยื่น'), h('dd', { 'data-testid': 'verify-applicant' }, d.applicantMasked),
    h('dt', null, 'บริการ'), h('dd', { 'data-testid': 'verify-service' }, serviceLabel(d.serviceId)),
    h('dt', null, 'วันที่ออก'), dateEl('dd', d.issuedAt, { 'data-testid': 'verify-issued' }),
    h('dt', null, 'ผู้ลงนาม'), h('dd', { 'data-testid': 'verify-signer' }, d.signer),
    h('dt', null, 'ใช้ได้ถึง'), h('dd', { 'data-testid': 'verify-expires', 'data-iso': vu }, fmtDate(vu))));
}
$('#box').replaceChildren(...kids);

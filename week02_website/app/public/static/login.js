import { api, $, h, setSlot, dateEl } from '/static/app.js';

const tabC = $('#tab-c'), tabS = $('#tab-s');
function selectTab(c) {
  tabC.setAttribute('aria-selected', c); tabS.setAttribute('aria-selected', !c);
  $('#panel-c').hidden = !c; $('#panel-s').hidden = c;
}
tabC.onclick = () => selectTab(true);
tabS.onclick = () => selectTab(false);
for (const t of [tabC, tabS]) t.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const c = t !== tabC; selectTab(c); (c ? tabC : tabS).focus(); }
});

function showIdStep() {
  $('#otp-box').hidden = true; $('#otp-box').removeAttribute('data-testid');
  $('#id-step').hidden = false;
}
function showOtpStep() {
  const d = idDigits();
  $('#otp-id-mask').textContent = d.length === 13 ? `X-XXXX-XXXXX-${d.slice(10, 12)}-${d.slice(12)}` : '';
  $('#id-step').hidden = true;
  $('#otp-box').setAttribute('data-testid', 'otp-step'); $('#otp-box').hidden = false;
  $('#otp').value = ''; setSlot('#otp-slot', 'otp-error', ''); $('#otp').focus();
}
function showLock(until) {
  showIdStep();
  $('#lock-slot').replaceChildren(h('div', { class: 'alert' },
    h('p', { 'data-testid': 'lock-message', role: 'alert', style: 'margin:0' }, 'ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที'),
    until ? h('p', { style: 'margin:.25rem 0 0' }, 'ปลดล็อกเวลา ', dateEl('span', until, { 'data-testid': 'lock-until' })) : null));
}

// เลขบัตร: รับเฉพาะตัวเลข และจัดรูปแบบ X-XXXX-XXXXX-XX-X ระหว่างพิมพ์ (ส่งเซิร์ฟเวอร์เป็นตัวเลขล้วน)
const idDigits = () => $('#idNo').value.replace(/\D/g, '');
function formatId(d) {
  const parts = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)].filter(Boolean);
  return parts.join('-') + d.slice(13);
}
$('#idNo').addEventListener('input', () => {
  const el = $('#idNo'); const raw = el.value;
  const hadInvalid = /[^\d-]/.test(raw);
  const f = formatId(idDigits());
  if (f !== raw) el.value = f;
  el.toggleAttribute('data-had-invalid', hadInvalid);
});
async function start() {
  setSlot('#thaid-slot', 'thaid-error', ''); $('#lock-slot').replaceChildren();
  const idNo = $('#idNo').hasAttribute('data-had-invalid') ? 'INVALID' : idDigits();
  try {
    await api('/api/auth/thaid/start', { method: 'POST', json: { idNo }, noRedirect: true });
    showOtpStep();
  } catch (e) {
    if (e.code === 'LOCKED') showLock(e.data.lockedUntil);
    else setSlot('#thaid-slot', 'thaid-error', e.code === 'INVALID_ID' ? 'เลขบัตรประชาชนไม่ถูกต้อง' : e.message);
  }
}
async function verify() {
  setSlot('#otp-slot', 'otp-error', '');
  try {
    const r = await api('/api/auth/thaid/verify', { method: 'POST', json: { idNo: idDigits(), otp: $('#otp').value.trim() }, noRedirect: true });
    location.href = r.registered === false ? '/register' : '/citizen';
  } catch (e) {
    if (e.code === 'LOCKED') return showLock(e.data.lockedUntil);
    if (e.code === 'OTP_INVALID') {
      const n = e.data.attemptsLeft;
      $('#otp-slot').replaceChildren(
        h('p', { class: 'field-error', 'data-testid': 'otp-error', role: 'alert', style: 'margin:.25rem 0' }, 'รหัส OTP ไม่ถูกต้อง'),
        n !== undefined ? h('p', { class: 'field-error', 'data-testid': 'otp-attempts-left', style: 'margin:.25rem 0' }, `เหลือ ${n} ครั้ง`) : null);
    } else setSlot('#otp-slot', 'otp-error', e.message);
  }
}
async function staff() {
  setSlot('#staff-slot', 'staff-error', '');
  try {
    const r = await api('/api/auth/staff/login', { method: 'POST', json: { username: $('#su').value.trim(), password: $('#sp').value }, noRedirect: true });
    location.href = r.landing || '/';
  } catch (e) {
    setSlot('#staff-slot', 'staff-error', e.code === 'INVALID_CREDENTIALS' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : e.message);
  }
}
$('#thaid-btn').onclick = start;
$('#otp-back').onclick = () => { showIdStep(); $('#lock-slot').replaceChildren(); $('#idNo').focus(); };
$('#otp').addEventListener('input', () => { const el = $('#otp'); const v = el.value.replace(/\D/g, '').slice(0, 6); if (v !== el.value) el.value = v; });
$('#otp-btn').onclick = verify;
$('#staff-btn').onclick = staff;
$('#idNo').addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
$('#otp').addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });
$('#sp').addEventListener('keydown', (e) => { if (e.key === 'Enter') staff(); });

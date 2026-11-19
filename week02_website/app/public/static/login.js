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

function showLock(until) {
  $('#otp-box').hidden = true; $('#otp-box').removeAttribute('data-testid');
  $('#lock-slot').replaceChildren(h('div', { class: 'alert' },
    h('p', { 'data-testid': 'lock-message', role: 'alert', style: 'margin:0' }, 'ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที'),
    until ? h('p', { style: 'margin:.25rem 0 0' }, 'ปลดล็อกเวลา ', dateEl('span', until, { 'data-testid': 'lock-until' })) : null));
}

async function start() {
  setSlot('#thaid-slot', 'thaid-error', ''); $('#lock-slot').replaceChildren();
  const idNo = $('#idNo').value.trim();
  try {
    await api('/api/auth/thaid/start', { method: 'POST', json: { idNo }, noRedirect: true });
    $('#otp-box').setAttribute('data-testid', 'otp-step'); $('#otp-box').hidden = false; $('#otp').focus();
  } catch (e) {
    if (e.code === 'LOCKED') showLock(e.data.lockedUntil);
    else setSlot('#thaid-slot', 'thaid-error', e.code === 'INVALID_ID' ? 'เลขบัตรประชาชนไม่ถูกต้อง' : e.message);
  }
}
async function verify() {
  setSlot('#otp-slot', 'otp-error', '');
  try {
    const r = await api('/api/auth/thaid/verify', { method: 'POST', json: { idNo: $('#idNo').value.trim(), otp: $('#otp').value.trim() }, noRedirect: true });
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
$('#otp-btn').onclick = verify;
$('#staff-btn').onclick = staff;
$('#idNo').addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
$('#otp').addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });
$('#sp').addEventListener('keydown', (e) => { if (e.key === 'Enter') staff(); });

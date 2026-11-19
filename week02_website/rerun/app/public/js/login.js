(async function () {
  const { h, api, page, errText, fmtDateTime, tid } = App;
  App.renderChrome(null);
  const c = page('เข้าสู่ระบบ', 'e-Service กลาง · เทศบาลนครตัวอย่าง');
  c.querySelector('#page-title').after(h('p', { class: 'muted' }, 'เลือกประเภทผู้ใช้งาน แล้วเข้าสู่ระบบ (ระบบจำลอง)'));

  const tabCit = h('button', { type: 'button', role: 'tab', id: 'tab-citizen', 'aria-controls': 'panel-citizen', 'aria-selected': 'true', 'data-testid': 'login-tab-citizen' }, 'ประชาชน');
  const tabStaff = h('button', { type: 'button', role: 'tab', id: 'tab-staff', 'aria-controls': 'panel-staff', 'aria-selected': 'false', tabindex: '-1', 'data-testid': 'login-tab-staff' }, 'เจ้าหน้าที่');
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'ประเภทผู้ใช้งาน' }, tabCit, tabStaff);

  /* ----- ประชาชน ----- */
  const idInput = h('input', { type: 'text', id: 'idNo', 'data-testid': 'thaid-id-input', inputmode: 'numeric', autocomplete: 'off', 'aria-describedby': 'thaid-err' });
  const idErr = h('p', { id: 'thaid-err', class: 'field-error', 'data-testid': 'thaid-error', role: 'alert', hidden: true });
  /* thaid-error ไม่อยู่ใน DOM เมื่อไม่มีข้อผิดพลาด */
  Object.defineProperty(idErr, 'hidden', { configurable: true, get() { return !idErr.isConnected; },
    set(v) { if (v) idErr.remove(); else if (!idErr.isConnected) idInput.after(idErr); } });
  const idBtn =h('button', { type: 'submit', 'data-testid': 'thaid-submit' }, 'เข้าสู่ระบบด้วย ThaiD (จำลอง)');
  const idForm = h('form', { novalidate: true }, h('label', { for: 'idNo' }, 'เลขบัตรประชาชน 13 หลัก'), idInput, idErr, h('p', {}, idBtn));

  idErr.remove();
  const otpInput =h('input', { type: 'text', id: 'otp', 'data-testid': 'otp-input', inputmode: 'numeric', autocomplete: 'one-time-code', 'aria-describedby': 'otp-err' });
  const otpErr = h('p', { id: 'otp-err', class: 'field-error', 'data-testid': 'otp-error', role: 'alert', hidden: true });
  const otpLeft = h('p', { class: 'field-error', 'data-testid': 'otp-attempts-left', hidden: true });
  const otpBtn = h('button', { type: 'submit', 'data-testid': 'otp-submit' }, 'ยืนยัน OTP');
  const otpForm = h('form', { novalidate: true }, h('label', { for: 'otp' }, 'รหัส OTP (โหมดทดสอบ 123456)'), otpInput, otpErr, otpLeft, h('p', {}, otpBtn));
  const otpStep = h('div', { 'data-testid': 'otp-step', class: 'card' }, h('h2', {}, 'ยืนยันตัวตนด้วย OTP'), otpForm);
  /* CONTRACT: otp-step ไม่อยู่ใน DOM จนกว่าจะแสดงจริง */
  Object.defineProperty(otpStep, 'hidden', { configurable: true, get() { return !otpStep.isConnected; },
    set(v) { if (v) otpStep.remove(); else if (!otpStep.isConnected) idForm.after(otpStep); } });

  const lockMsg = h('p', { class: 'alert', 'data-testid': 'lock-message', role: 'alert', hidden: true }, 'ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที');
  const lockUntil = h('p', { 'data-testid': 'lock-until', 'data-iso': '', hidden: true });
  const panelCit = h('div', { role: 'tabpanel', id: 'panel-citizen', 'aria-labelledby': 'tab-citizen' }, idForm, lockMsg, lockUntil);

  /* ----- เจ้าหน้าที่ ----- */
  const user = h('input', { type: 'text', id: 'staffUser', 'data-testid': 'staff-username', autocomplete: 'username', autocapitalize: 'none' });
  const pass = h('input', { type: 'password', id: 'staffPass', 'data-testid': 'staff-password', autocomplete: 'current-password' });
  const staffErr = h('p', { class: 'field-error', 'data-testid': 'staff-error', role: 'alert', hidden: true });
  const staffBtn = h('button', { type: 'submit', 'data-testid': 'staff-submit' }, 'เข้าสู่ระบบเจ้าหน้าที่ (SSO ภาครัฐ จำลอง)');
  const staffForm = h('form', { novalidate: true }, h('label', { for: 'staffUser' }, 'ชื่อผู้ใช้'), user, h('label', { for: 'staffPass' }, 'รหัสผ่าน'), pass, staffErr, h('p', {}, staffBtn));
  const panelStaff = h('div', { role: 'tabpanel', id: 'panel-staff', 'aria-labelledby': 'tab-staff', hidden: true }, staffForm);

  c.append(h('div', { class: 'card accent narrow' }, tabs, panelCit, panelStaff));
  c.append(h('p', { class: 'muted narrow' }, 'หากไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อสำนักงานเทศบาล'));

  function select(which) {
    const cit = which === 'citizen';
    tabCit.setAttribute('aria-selected', cit); tabStaff.setAttribute('aria-selected', !cit);
    tabCit.tabIndex = cit ? 0 : -1; tabStaff.tabIndex = cit ? -1 : 0;
    panelCit.hidden = !cit; panelStaff.hidden = cit;
  }
  tabCit.addEventListener('click', () => select('citizen'));
  tabStaff.addEventListener('click', () => select('staff'));
  tabs.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const t = e.target === tabCit ? 'staff' : 'citizen'; select(t); (t === 'citizen' ? tabCit : tabStaff).focus(); }
  });

  const setErr = (el, t) => { el.textContent = t || ''; el.hidden = !t; };
  function showLock(until) {
    lockMsg.hidden = false; lockUntil.hidden = false;
    lockUntil.setAttribute('data-iso', until || '');
    lockUntil.textContent = until ? 'ปลดล็อกได้เมื่อ ' + fmtDateTime(until) : '';
    setErr(otpErr, ''); otpLeft.hidden = true;
  }
  function hideLock() { lockMsg.hidden = true; lockUntil.hidden = true; }

  idForm.addEventListener('submit', async e => {
    e.preventDefault();
    setErr(idErr, ''); hideLock();
    idBtn.disabled = true;
    const r = await api('POST', '/api/auth/thaid/start', { idNo: idInput.value.trim() });
    idBtn.disabled = false;
    if (r.ok) { otpStep.hidden = false; otpInput.focus(); return; }
    otpStep.hidden = true;
    if (r.data && r.data.code === 'LOCKED') showLock(r.data.lockedUntil);
    else setErr(idErr, errText(r.data));
  });

  otpForm.addEventListener('submit', async e => {
    e.preventDefault();
    setErr(otpErr, ''); otpLeft.hidden = true; hideLock();
    otpBtn.disabled = true;
    const r = await api('POST', '/api/auth/thaid/verify', { idNo: idInput.value.trim(), otp: otpInput.value.trim() });
    otpBtn.disabled = false;
    if (r.ok) { location.href = r.data && r.data.registered === false ? '/register' : '/citizen'; return; }
    const d = r.data || {};
    if (d.code === 'LOCKED') { showLock(d.lockedUntil); return; }
    if (d.code === 'OTP_INVALID') {
      setErr(otpErr, 'รหัส OTP ไม่ถูกต้อง');
      if (d.attemptsLeft != null) { otpLeft.textContent = 'เหลือ ' + d.attemptsLeft + ' ครั้ง'; otpLeft.hidden = false; }
      otpInput.select(); return;
    }
    setErr(otpErr, errText(d));
  });

  staffForm.addEventListener('submit', async e => {
    e.preventDefault();
    setErr(staffErr, ''); staffBtn.disabled = true;
    const r = await api('POST', '/api/auth/staff/login', { username: user.value.trim(), password: pass.value });
    staffBtn.disabled = false;
    if (r.ok) { location.href = (r.data && r.data.landing) || '/'; return; }
    setErr(staffErr, r.data && r.data.code === 'INVALID_CREDENTIALS' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : errText(r.data));
  });
})();

(async function () {
  const { h, api, page, errText } = App;
  const user = await App.boot({ roles: ['citizen'] });
  if (!user) return;
  const c = page('ลงทะเบียนใช้งานครั้งแรก', 'ประชาชน');
  const name = h('input', { type: 'text', id: 'regName', 'data-testid': 'reg-name', readonly: true, value: user.name || '', 'aria-describedby': 'regNameHint' });
  const mobile = h('input', { type: 'tel', id: 'regMobile', 'data-testid': 'reg-mobile', inputmode: 'numeric', autocomplete: 'tel', 'aria-describedby': 'errMobile' });
  const email = h('input', { type: 'text', id: 'regEmail', 'data-testid': 'reg-email', inputmode: 'email', autocomplete: 'email' });
  const consent = h('input', { type: 'checkbox', id: 'regConsent', 'data-testid': 'reg-consent', 'aria-describedby': 'errConsent' });
  const errMobile = h('p', { id: 'errMobile', class: 'field-error', 'data-testid': 'reg-error-mobile', role: 'alert', hidden: true });
  const errConsent = h('p', { id: 'errConsent', class: 'field-error', 'data-testid': 'reg-error-consent', role: 'alert', hidden: true });
  const btn = h('button', { type: 'submit', 'data-testid': 'reg-submit' }, 'ลงทะเบียน');
  const form = h('form', { novalidate: true },
    h('label', { for: 'regName' }, 'ชื่อ-สกุล (จาก ThaiD แก้ไขไม่ได้)'), name,
    h('label', { for: 'regMobile' }, 'เบอร์มือถือ ', h('span', { class: 'req', 'aria-hidden': 'true' }, '*')), mobile,
    h('p', { class: 'hint' }, 'ตัวเลข 10 หลัก ขึ้นต้นด้วย 0'), errMobile,
    h('label', { for: 'regEmail' }, 'อีเมล (ไม่บังคับ)'), email,
    h('label', { for: 'regConsent', class: 'check' }, consent, 'ข้าพเจ้ายินยอมให้เทศบาลประมวลผลข้อมูลส่วนบุคคลตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) '),
    errConsent, h('p', {}, btn));
  c.append(h('div', { class: 'card accent narrow' }, form));
  const set = (el, t) => { el.textContent = t || ''; el.hidden = !t; };
  form.addEventListener('submit', async e => {
    e.preventDefault(); set(errMobile, ''); set(errConsent, ''); App.clearMsgs();
    btn.disabled = true;
    const r = await api('POST', '/api/auth/register', { mobile: mobile.value.trim(), email: email.value.trim(), consent: consent.checked });
    btn.disabled = false;
    if (r.ok) { location.href = '/citizen'; return; }
    const code = r.data && r.data.code;
    if (code === 'INVALID_MOBILE') set(errMobile, errText(r.data));
    else if (code === 'CONSENT_REQUIRED') set(errConsent, errText(r.data));
    else App.showError(errText(r.data));
  });
})();

import { api, $, boot, setSlot, showError, clearError } from '/static/app.js';

const me = await boot({ bare: true });
if (me) {
  if (me.registered) location.href = '/citizen';
  $('#name').value = me.name || '';
  $('#submit').onclick = async () => {
    clearError(); setSlot('#mobile-slot', 'reg-error-mobile', ''); setSlot('#consent-slot', 'reg-error-consent', '');
    try {
      await api('/api/auth/register', { method: 'POST', json: { mobile: $('#mobile').value.trim(), email: $('#email').value.trim(), consent: $('#consent').checked } });
      location.href = '/citizen';
    } catch (e) {
      if (e.code === 'INVALID_MOBILE') setSlot('#mobile-slot', 'reg-error-mobile', 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0');
      else if (e.code === 'CONSENT_REQUIRED') setSlot('#consent-slot', 'reg-error-consent', 'กรุณายินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA)');
      else showError(e.message);
    }
  };
}

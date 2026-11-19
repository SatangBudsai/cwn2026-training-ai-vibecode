const { test, expect } = require('@playwright/test');
const C = require('../lib/common');

const INVALID_ID_MSG = 'เลขบัตรประชาชนไม่ถูกต้อง';

test('TC-AUTH-01 เลขบัตร 13 หลัก + checksum @P1', async ({ page, request }) => {
  await C.reset(request);
  const bad = ['110170012345', '11017001234567', '1101700123457', '11017001234ab'];
  const good = ['1101700123456', '3100600987659', '1909900555015', '5500400111221'];

  for (const v of bad) {
    await page.goto('/login');
    await page.getByTestId('login-tab-citizen').click();
    await page.getByTestId('thaid-id-input').fill(v);
    await page.getByTestId('thaid-submit').click();
    await expect(page.getByTestId('thaid-error'), `ui ${v}`).toHaveText(INVALID_ID_MSG);
    await expect(page.getByTestId('otp-step')).toHaveCount(0);
    const res = await request.post('/api/auth/thaid/start', { data: { idNo: v } });
    expect(res.status(), `api ${v}`).toBe(400);
    expect((await res.json()).code).toBe('INVALID_ID');
  }

  for (const v of good) {
    await page.goto('/login');
    await page.getByTestId('login-tab-citizen').click();
    await page.getByTestId('thaid-id-input').fill(v);
    await page.getByTestId('thaid-submit').click();
    await expect(page.getByTestId('otp-step'), `ui ${v}`).toBeVisible();
    await expect(page.getByTestId('thaid-error')).toHaveCount(0);
    const res = await request.post('/api/auth/thaid/start', { data: { idNo: v } });
    expect(res.status(), `api ${v}`).toBe(200);
    expect((await res.json()).status).toBe('OTP_SENT');
  }

  // log in again after reset
  await C.reset(request);
  const api = await C.apiCitizen(C.ID.somchai);
  expect((await api.get('/api/me')).status()).toBe(200);
});

test('TC-AUTH-02 OTP ผิด 3 ครั้งล็อก 15 นาที @P1', async ({ page, request }) => {
  await C.reset(request);
  const api = await C.newApi();

  // steps 1-3 via UI (Piti)
  await page.goto('/login');
  await page.getByTestId('login-tab-citizen').click();
  await page.getByTestId('thaid-id-input').fill(C.ID.piti);
  await page.getByTestId('thaid-submit').click();
  await expect(page.getByTestId('otp-step')).toBeVisible();

  await page.getByTestId('otp-input').fill('000000');
  await page.getByTestId('otp-submit').click();
  await expect(page.getByTestId('otp-error')).toHaveText('รหัส OTP ไม่ถูกต้อง');
  await expect(page.getByTestId('otp-attempts-left')).toHaveText('เหลือ 2 ครั้ง');

  await page.getByTestId('otp-input').fill('000000');
  await page.getByTestId('otp-submit').click();
  await expect(page.getByTestId('otp-attempts-left')).toHaveText('เหลือ 1 ครั้ง');

  await page.getByTestId('otp-input').fill('000000');
  await page.getByTestId('otp-submit').click();
  await expect(page.getByTestId('lock-message')).toHaveText('ผิดเกินกำหนด เลขบัตรนี้ถูกล็อก 15 นาที');
  await expect(page.getByTestId('lock-until')).toHaveAttribute('data-iso', '2026-12-01T09:15:00+07:00');

  // step 4: correct OTP still locked
  let r = await C.tryCitizenLogin(api, C.ID.piti, C.OTP);
  expect(r.status).toBe(423);
  expect(r.body.code).toBe('LOCKED');

  // step 5: somchai unaffected
  const somchai = await C.apiCitizen(C.ID.somchai);
  expect((await somchai.get('/api/me')).status()).toBe(200);

  // step 6: 14:59 later still locked
  await C.setClock(api, '2026-12-01T09:14:59+07:00');
  r = await C.tryCitizenLogin(api, C.ID.piti, C.OTP);
  expect(r.status).toBe(423);

  // step 7: exactly 15:00 unlocked, counter restarts
  await C.setClock(api, '2026-12-01T09:15:00+07:00');
  r = await C.tryCitizenLogin(api, C.ID.piti, '000000');
  expect(r.status).toBe(401);
  expect(r.body.code).toBe('OTP_INVALID');
  expect(r.body.attemptsLeft).toBe(2);

  // step 8: correct OTP logs in
  r = await C.tryCitizenLogin(api, C.ID.piti, C.OTP);
  expect(r.status).toBe(200);

  // step 9: RESET, 2 wrong -> correct -> logout -> 2 wrong : not locked
  await C.reset(request);
  const a2 = await C.newApi();
  r = await C.tryCitizenLogin(a2, C.ID.piti, '000000');
  expect(r.status).toBe(401);
  r = await C.tryCitizenLogin(a2, C.ID.piti, '000000');
  expect(r.status).toBe(401);
  expect(r.body.attemptsLeft).toBe(1);
  r = await C.tryCitizenLogin(a2, C.ID.piti, C.OTP);
  expect(r.status).toBe(200);
  expect((await a2.post('/api/auth/logout')).status()).toBe(204);
  r = await C.tryCitizenLogin(a2, C.ID.piti, '000000');
  expect(r.status).toBe(401);
  expect(r.body.attemptsLeft).toBe(2);
  r = await C.tryCitizenLogin(a2, C.ID.piti, '000000');
  expect(r.status).toBe(401);
  expect(r.body.attemptsLeft).toBe(1);

  // log in again after reset
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.piti);
  await expect(page.getByTestId('citizen-welcome')).toContainText(C.NAME.piti);
});

test('TC-AUTH-03 ลงทะเบียนครั้งแรก @P1', async ({ page, request }) => {
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.mana);
  await page.goto('/register');
  await expect(page).toHaveURL(/\/register/);

  // 1 reg-name readonly
  const name = page.getByTestId('reg-name');
  await expect(name).toHaveValue(C.NAME.mana);
  expect(await name.evaluate((el) => el.readOnly)).toBe(true);
  await name.focus();
  await page.keyboard.type('xyz');
  await expect(name).toHaveValue(C.NAME.mana);

  const MOBILE_MSG = 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0';
  const consent = page.getByTestId('reg-consent');
  await consent.check();
  for (const m of ['081234567', '08123456789', '1812345678', '08123abcde']) {
    await page.getByTestId('reg-mobile').fill(m);
    await page.getByTestId('reg-submit').click();
    await expect(page.getByTestId('reg-error-mobile'), m).toHaveText(MOBILE_MSG);
    await expect(page).toHaveURL(/\/register/);
  }

  // 5 consent missing
  await page.getByTestId('reg-mobile').fill('0845678901');
  await consent.uncheck();
  await page.getByTestId('reg-submit').click();
  await expect(page.getByTestId('reg-error-consent')).toHaveText('กรุณายินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA)');
  await expect(page).toHaveURL(/\/register/);

  // 6 success
  await consent.check();
  await page.getByTestId('reg-email').fill('');
  await page.getByTestId('reg-submit').click();
  await expect(page).toHaveURL(/\/citizen/);
  await expect(page.getByTestId('citizen-welcome')).toHaveText('สวัสดี มานะ ตั้งใจ');

  // 7 logout and login again -> straight to /citizen
  await C.uiLogout(page);
  await C.uiLoginCitizen(page, C.ID.mana);
  await expect(page).toHaveURL(/\/citizen/);
  await expect(page).not.toHaveURL(/\/register/);

  // 8 RESET then API
  await C.reset(request);
  const api = await C.newApi();
  expect((await api.post('/api/auth/thaid/start', { data: { idNo: C.ID.mana } })).status()).toBe(200);
  const v = await api.post('/api/auth/thaid/verify', { data: { idNo: C.ID.mana, otp: C.OTP } });
  expect(v.status()).toBe(200);
  expect((await v.json()).registered).toBe(false);
  let r = await api.post('/api/auth/register', { data: { mobile: '081234567', email: '', consent: true } });
  expect(r.status()).toBe(400);
  expect((await r.json()).code).toBe('INVALID_MOBILE');
  r = await api.post('/api/auth/register', { data: { mobile: '0845678901', email: '', consent: false } });
  expect(r.status()).toBe(400);
  expect((await r.json()).code).toBe('CONSENT_REQUIRED');

  // log in again after reset
  await C.reset(request);
  await C.uiLoginCitizen(page, C.ID.mana);
  await expect(page).toHaveURL(/\/register/);
});

test('TC-AUTH-04 เจ้าหน้าที่ SSO จำลองและหน้าตั้งต้น @P2', async ({ page, request }) => {
  await C.reset(request);
  const rows = [
    ['off.reg1', '/officer/queue', 'เจ้าหน้าที่ทะเบียน 1', 'เจ้าหน้าที่', 'officer', 'registry'],
    ['off.reg2', '/officer/queue', 'เจ้าหน้าที่ทะเบียน 2', 'เจ้าหน้าที่', 'officer', 'registry'],
    ['off.works1', '/officer/queue', 'เจ้าหน้าที่โยธา 1', 'เจ้าหน้าที่', 'officer', 'works'],
    ['head1', '/head/approvals', 'หัวหน้าฝ่าย', 'หัวหน้าฝ่าย', 'head', null],
    ['exec1', '/dashboard', 'ผู้บริหาร', 'ผู้บริหาร', 'executive', null],
    ['audit1', '/audit', 'ผู้ตรวจสอบภายใน', 'ผู้ตรวจสอบภายใน', 'auditor', null],
    ['admin1', '/admin/services', 'ผู้ดูแลระบบ', 'ผู้ดูแลระบบ', 'admin', null],
  ];

  await page.goto('/login');
  await expect(page.getByTestId('login-tab-staff')).toBeVisible();
  await page.getByTestId('login-tab-staff').click();
  await expect(page.getByTestId('staff-submit')).toHaveText('เข้าสู่ระบบเจ้าหน้าที่ (SSO ภาครัฐ จำลอง)');

  for (const [u, path, name, roleText, role, dept] of rows) {
    await C.uiLoginStaff(page, u);
    await expect(page, u).toHaveURL(new RegExp(path.replace('/', '\\/') + '$'));
    await expect(page.getByTestId('user-name'), u).toHaveText(name);
    const ur = page.getByTestId('user-role');
    await expect(ur).toHaveText(roleText);
    await expect(ur).toHaveAttribute('data-role', role);
    if (dept) await expect(ur).toHaveAttribute('data-dept', dept);
    await C.uiLogout(page);
  }

  // invalid credentials (UI + API)
  const bads = [['off.reg1', 'wrong'], ['nobody', 'Test@1234'], [C.ID.somchai, 'Test@1234']];
  for (const [u, p] of bads) {
    await page.goto('/login');
    await page.getByTestId('login-tab-staff').click();
    await page.getByTestId('staff-username').fill(u);
    await page.getByTestId('staff-password').fill(p);
    await page.getByTestId('staff-submit').click();
    await expect(page.getByTestId('staff-error'), u).toHaveText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    const res = await request.post('/api/auth/staff/login', { data: { username: u, password: p } });
    expect(res.status()).toBe(401);
    expect((await res.json()).code).toBe('INVALID_CREDENTIALS');
  }

  // after logout, protected page redirects to /login
  await page.goto('/officer/queue');
  await expect(page).toHaveURL(/\/login/);

  // log in again after reset
  await C.reset(request);
  await C.uiLoginStaff(page, 'off.reg1');
  await expect(page).toHaveURL(/\/officer\/queue/);
});

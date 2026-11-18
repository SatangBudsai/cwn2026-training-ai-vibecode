// TEST-PLAN.md §5 ข้อ 23–28 (โมดูลสมาชิก)
const { test, expect } = require('@playwright/test');
const { holdOn } = require('./helpers');

const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345', name: 'สมใจ ใจดี' };

const uniqueEmail = () =>
  `a02-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;

/** กรอกฟอร์มสมัครสมาชิก (ไม่กดส่ง) */
async function fillRegister(page, { name, email, password, confirm, pet = 'cat', terms = true }) {
  await page.goto('/register');
  if (name !== undefined) await page.getByTestId('reg-name').fill(name);
  if (email !== undefined) await page.getByTestId('reg-email').fill(email);
  if (password !== undefined) await page.getByTestId('reg-password').fill(password);
  if (confirm !== undefined) await page.getByTestId('reg-confirm').fill(confirm);
  if (pet) await page.getByTestId(`reg-pet-${pet}`).check();
  if (terms) await page.getByTestId('reg-terms').check();
}

/** เข้าสู่ระบบผ่านหน้า /login */
async function login(page, email, password) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

test('TC-AUTH-01 สมัครสำเร็จ: ไปหน้าบัญชี เห็น "ยินดีต้อนรับ…"', { tag: '@P1' }, async ({ page }) => {
  const name = 'น้องเหมียว ทดสอบ';
  const email = uniqueEmail();
  await fillRegister(page, { name, email, password: 'Paw12345', confirm: 'Paw12345' });
  await page.getByTestId('reg-submit').click();

  await expect(page).toHaveURL(/\/account/);
  const banner = page.getByTestId('welcome-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(`ยินดีต้อนรับ ${name}`);
  await expect(page.getByTestId('profile-card')).toContainText(email);
  await expect(page.getByTestId('user-menu')).toContainText(name);

  await holdOn(page, banner);
});

test('TC-AUTH-02 ส่งฟอร์มเปล่า: error ทุกช่อง', { tag: '@P2' }, async ({ page }) => {
  await page.goto('/register');
  await page.getByTestId('reg-submit').click();

  await expect(page).toHaveURL(/\/register/);
  await expect(page.getByTestId('error-name')).toHaveText('กรุณากรอกชื่อ');
  await expect(page.getByTestId('error-email')).toHaveText('อีเมลไม่ถูกต้อง');
  await expect(page.getByTestId('error-password')).toHaveText('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข');
  await expect(page.getByTestId('error-confirm')).toBeVisible(); // ช่องยืนยันรหัสผ่านก็ต้องมี error
  await expect(page.getByTestId('error-terms')).toHaveText('กรุณายอมรับเงื่อนไข');
  for (const id of ['reg-name', 'reg-email', 'reg-password', 'reg-confirm']) {
    await expect(page.getByTestId(id)).toHaveAttribute('aria-invalid', 'true');
  }

  await holdOn(page, page.getByTestId('reg-submit'));
});

test('TC-AUTH-03 รหัสผ่านอ่อน / ไม่ตรงกัน: error รหัสผ่านและยืนยันรหัส', { tag: '@P2' }, async ({ page }) => {
  const email = uniqueEmail();
  await fillRegister(page, { name: 'ทดสอบ รหัสอ่อน', email, password: 'abcdefgh', confirm: 'abcdefgx' });
  await expect(page.getByTestId('password-strength')).toHaveText('อ่อน');
  await page.getByTestId('reg-submit').click();

  await expect(page).toHaveURL(/\/register/);
  await expect(page.getByTestId('error-password')).toHaveText('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข');
  await expect(page.getByTestId('error-confirm')).toHaveText('รหัสผ่านไม่ตรงกัน');
  await expect(page.getByTestId('reg-password')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('reg-confirm')).toHaveAttribute('aria-invalid', 'true');
  // ช่องอื่นถูกต้อง ไม่ควรมี error
  await expect(page.getByTestId('error-name')).toHaveCount(0);
  await expect(page.getByTestId('error-email')).toHaveCount(0);

  await holdOn(page, page.getByTestId('error-confirm'));
});

test('TC-AUTH-04 อีเมลซ้ำ: "อีเมลนี้ถูกใช้แล้ว"', { tag: '@P2' }, async ({ page }) => {
  await fillRegister(page, { name: 'ทดสอบ อีเมลซ้ำ', email: DEMO.email, password: 'Paw12345', confirm: 'Paw12345' });
  await page.getByTestId('reg-submit').click();

  await expect(page.getByText('อีเมลนี้ถูกใช้แล้ว')).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
  await expect(page.getByTestId('login-link')).toBeVisible(); // ยังไม่ได้เข้าสู่ระบบ

  await holdOn(page, page.getByText('อีเมลนี้ถูกใช้แล้ว'));
});

test('TC-AUTH-05 รหัสผ่านผิด: "อีเมลหรือรหัสผ่านไม่ถูกต้อง"', { tag: '@P1' }, async ({ page }) => {
  await login(page, DEMO.email, 'Wrong999');

  const err = page.getByTestId('login-error');
  await expect(err).toHaveText('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('login-link')).toBeVisible();
  await expect(page.getByTestId('user-menu')).toHaveCount(0);

  await holdOn(page, err);
});

test('TC-AUTH-06 เข้า / ออกจากระบบ: ชื่อขึ้นที่เมนู ออกแล้วกลับเป็นปุ่มเข้าสู่ระบบ', { tag: '@P1' }, async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);

  const userMenu = page.getByTestId('user-menu');
  await expect(userMenu).toBeVisible();
  await expect(userMenu).toContainText(DEMO.name);
  await expect(page.getByTestId('login-link')).toHaveCount(0);
  await holdOn(page, userMenu);

  await page.getByTestId('logout-button').click();
  const loginLink = page.getByTestId('login-link');
  await expect(loginLink).toBeVisible();
  await expect(loginLink).toHaveText('เข้าสู่ระบบ');
  await expect(page.getByTestId('user-menu')).toHaveCount(0);
  await expect(page.getByTestId('logout-button')).toHaveCount(0);

  await holdOn(page, loginLink);
});

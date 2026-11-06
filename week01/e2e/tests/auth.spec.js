const { test, expect } = require('@playwright/test');

const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345' };
const uniq = () => `auth${Date.now()}${Math.floor(Math.random() * 1e4)}@example.test`;

async function fillRegister(page, { name = 'สมชาย ทดสอบ', email, password = 'Paw12345', confirm = password, terms = true }) {
  await page.getByTestId('reg-name').fill(name);
  await page.getByTestId('reg-email').fill(email);
  await page.getByTestId('reg-password').fill(password);
  await page.getByTestId('reg-confirm').fill(confirm);
  if (terms) await page.getByTestId('reg-terms').check();
}

test.describe('Auth', () => {
  test('TC-AUTH-01 สมัครสำเร็จ @P1', async ({ page }) => {
    await page.goto('/register');
    await fillRegister(page, { name: 'สมชาย ทดสอบ', email: uniq() });
    await page.waitForTimeout(800);
    await page.getByTestId('reg-submit').click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(/ยินดีต้อนรับ/)).toBeVisible();
    await expect(page.getByText(/ยินดีต้อนรับ สมชาย ทดสอบ/)).toBeVisible();
    await page.waitForTimeout(1500);
  });

  test('TC-AUTH-02 ส่งฟอร์มเปล่า error ทุกช่อง @P2', async ({ page }) => {
    await page.goto('/register');
    await page.getByTestId('reg-submit').click();
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(/\/register/);
    // every field shows an error: name, email, password, confirm, terms
    await expect(page.getByTestId('error-name')).toBeVisible();
    await expect(page.getByTestId('error-email')).toBeVisible();
    await expect(page.getByTestId('error-password')).toBeVisible();
    await expect(page.getByTestId('error-confirm')).toBeVisible();
    await expect(page.getByTestId('error-terms')).toBeVisible();
    await page.waitForTimeout(1500);
  });

  test('TC-AUTH-03 รหัสผ่านอ่อน / ไม่ตรงกัน @P2', async ({ page }) => {
    await page.goto('/register');
    await fillRegister(page, { email: uniq(), password: 'abc', confirm: 'xyz' });
    await page.getByTestId('reg-submit').click();
    await expect(page.getByTestId('error-password')).toBeVisible();
    await expect(page.getByTestId('error-confirm')).toBeVisible();
    await expect(page.getByTestId('error-confirm')).toHaveText('รหัสผ่านไม่ตรงกัน');
    await expect(page).toHaveURL(/\/register/);
    await page.waitForTimeout(1500);
  });

  test('TC-AUTH-04 อีเมลซ้ำ @P2', async ({ page }) => {
    await page.goto('/register');
    await fillRegister(page, { email: DEMO.email });
    await page.getByTestId('reg-submit').click();
    await expect(page.getByTestId('error-email')).toHaveText('อีเมลนี้ถูกใช้แล้ว');
    await expect(page).toHaveURL(/\/register/);
    await page.waitForTimeout(1500);
  });

  test('TC-AUTH-05 รหัสผ่านผิด @P1', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(DEMO.email);
    await page.getByTestId('login-password').fill('WrongPass999');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    await expect(page).toHaveURL(/\/login/);
    await page.waitForTimeout(1500);
  });

  test('TC-AUTH-06 เข้า / ออกจากระบบ @P1', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: 'เข้าสู่ระบบ' }).first()).toBeVisible();
    await page.getByTestId('login-email').fill(DEMO.email);
    await page.getByTestId('login-password').fill(DEMO.password);
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await expect(page.getByTestId('user-menu')).toContainText('สมใจ ใจดี');
    await page.waitForTimeout(1500);
    await page.getByTestId('logout-button').click();
    await expect(page.getByTestId('user-menu')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'เข้าสู่ระบบ' }).first()).toBeVisible();
    await page.waitForTimeout(1500);
  });
});

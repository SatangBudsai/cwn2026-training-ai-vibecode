import { expect, test } from '@playwright/test';
import { loginViaUi, registerMember } from './helpers';

test('login สำเร็จ → ไปหน้าซื้อแพ็กเกจ', async ({ page, request }) => {
  const email = await registerMember(request);
  await loginViaUi(page, email);
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('button', { name: 'ชำระเงิน' }).first()).toBeVisible();
});

test('รหัสผ่านผิด → แสดงข้อความ ไม่บอกว่าอีเมลมีอยู่ไหม', async ({ page, request }) => {
  const email = await registerMember(request);
  await loginViaUi(page, email, 'wrong-password-xx');
  await expect(page.getByTestId('form-error')).toHaveText('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
});

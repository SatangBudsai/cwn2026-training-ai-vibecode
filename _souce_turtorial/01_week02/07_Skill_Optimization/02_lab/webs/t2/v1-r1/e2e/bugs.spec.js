const { test, expect } = require('@playwright/test');
const shot = async (page, tc) => { if (process.env.EVIDENCE) await page.screenshot({ path: require('path').join(__dirname, '..', 'evidence', tc + '.png'), fullPage: true }); };
test.beforeEach(async ({ request }) => { await request.post('/api/test/reset'); });


test.describe('bugs', () => {
  test('TC-CAT-03 เรียงราคาน้อยไปมาก', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId('sort-select').selectOption('price-asc');
    await expect(page).toHaveURL(/sort=price-asc/);
    await shot(page, 'TC-CAT-03');
    await expect(page.getByTestId('product-price').first()).toContainText('฿35');
    const prices = (await page.getByTestId('product-price').allInnerTexts()).map((t) => Number(t.replace(/[^\d]/g, '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
  test('TC-AUTH-03 รหัสอ่อน / ไม่ตรงกัน', async ({ page }) => {
    await page.goto('/register');
    await page.getByTestId('reg-name').fill('x');
    await page.getByTestId('reg-email').fill('a@b.co');
    await page.getByTestId('reg-password').fill('abc');
    await page.getByTestId('reg-confirm').fill('abcd');
    await page.getByTestId('reg-terms').check();
    await page.getByTestId('reg-submit').click();
    await shot(page, 'TC-AUTH-03');
    await expect(page.getByTestId('error-password')).toHaveText('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข');
    await expect(page.getByTestId('error-confirm')).toHaveText('รหัสผ่านไม่ตรงกัน');
    await expect(page).toHaveURL(/\/register/);
  });
});

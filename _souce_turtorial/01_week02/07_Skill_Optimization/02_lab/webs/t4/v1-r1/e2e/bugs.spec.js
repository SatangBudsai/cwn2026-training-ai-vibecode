const { test, expect } = require('@playwright/test');

const shot = async (page, tc) => { if (process.env.EVIDENCE) await page.screenshot({ path: require('path').join(__dirname, '..', 'evidence', tc + '.png'), fullPage: true }); };

test.beforeEach(async ({ request }) => { await request.post('/api/test/reset'); });

const ready = (page) => expect(page.locator('html')).toHaveAttribute('data-ready', 'true');

async function addOnProduct(page, slug, { size, times = 1 } = {}) {
  await page.goto('/products/' + slug);
  await ready(page);
  if (size) await page.locator(`[data-testid="size-option"][data-size="${size}"]`).click();
  for (let i = 1; i < times; i++) await page.getByTestId('qty-plus').click();
  await page.getByTestId('add-to-cart').click();
}
async function applyCoupon(page, code) {
  await page.getByTestId('coupon-input').fill(code);
  await page.getByTestId('coupon-apply').click();
}

test.describe('bugs', () => {
  test('TC-PRD-03 จำนวนเกินสต็อก', async ({ page }) => {
    await page.goto('/products/hairball-control-dry');
    await ready(page);
    for (let i = 0; i < 5; i++) await page.getByTestId('qty-plus').click();
    await shot(page, 'TC-PRD-03');
    await expect(page.getByTestId('qty-input')).toHaveValue('3');
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-count')).toHaveText('3');
  });

  test('TC-CPN-01 PAW10', async ({ page }) => {
    await addOnProduct(page, 'adult-chicken-dry', { size: '3 kg' });
    await page.goto('/cart');
    await expect(page.getByTestId('summary-subtotal')).toHaveText('฿799');
    await applyCoupon(page, 'PAW10');
    await expect(page.getByTestId('summary-discount')).toHaveText('-฿79');
    await expect(page.getByTestId('summary-shipping')).toHaveText('฿50');
    await shot(page, 'TC-CPN-01');
    await expect(page.getByTestId('summary-total')).toHaveText('฿770');
  });

  test('TC-AUTH-03 รหัสผ่านอ่อน / ไม่ตรงกัน', async ({ page }) => {
    await page.goto('/register');
    await ready(page);
    await page.getByTestId('reg-name').fill('ทดสอบ');
    await page.getByTestId('reg-email').fill(`u${Date.now()}@t.test`);
    await page.getByTestId('reg-password').fill('abc');
    await page.getByTestId('reg-confirm').fill('xyz');
    await page.getByTestId('reg-terms').check();
    await page.getByTestId('reg-submit').click();
    await shot(page, 'TC-AUTH-03');
    await expect(page.getByTestId('error-password')).toHaveText('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข');
    await expect(page.getByTestId('error-confirm')).toHaveText('รหัสผ่านไม่ตรงกัน');
    await expect(page).toHaveURL(/\/register/);
  });
});

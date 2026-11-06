const { test, expect } = require('@playwright/test');

// LAB 9: test case ที่ผู้ทดสอบคิดเอง (ไม่อยู่ในแผน 40 ข้อ)
test.describe('คิดเอง', () => {
  test('TC-MY-01 ค้นหา "เป็ด" ต้องเจอ 2 รายการ @P3', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('search-input').fill('เป็ด');
    await page.getByTestId('search-submit').click();

    await expect(page.getByTestId('result-count')).toContainText('พบ 2 รายการ');
    await expect(page.getByTestId('product-card')).toHaveCount(2);
    await expect(page.getByTestId('product-name').filter({ hasText: 'เป็ดอบแห้ง' })).toBeVisible();
    await page.waitForTimeout(1500);
  });

  test('TC-MY-02 ซื้อครบ ฿999 เลือกส่งด่วน ค่าส่งต้องเป็น ฿120 @P2', async ({ page }) => {
    // ต้อง login ก่อนถึงจะเข้าหน้า checkout ได้
    await page.goto('/login');
    await page.locator('#login-email').fill('demo@pawpantry.test');
    await page.locator('#login-password').fill('Paw12345');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('user-menu')).toBeVisible();

    // ไม้ตกแมว ฿129 + ชามกินช้า ฿290 x 3 = ฿999 พอดี (ค่าขอบของส่งฟรี)
    await page.goto('/products?q=' + encodeURIComponent('ไม้ตกแมว'));
    await page.getByTestId('quick-add').first().click();
    await page.goto('/products/dog-slow-bowl');
    await page.getByTestId('qty-plus').click();
    await page.getByTestId('qty-plus').click();
    await page.getByTestId('add-to-cart').click();

    await page.goto('/checkout');
    await expect(page.getByTestId('summary-subtotal')).toContainText('999');
    await expect(page.getByTestId('summary-shipping')).toContainText('ฟรี'); // ส่งธรรมดาฟรีที่ ฿999

    await page.getByTestId('shipping-express').check();
    await expect(page.getByTestId('summary-shipping')).toContainText('120');
    await expect(page.getByTestId('summary-total')).toContainText('1,119');
    await page.waitForTimeout(1500);
  });
});

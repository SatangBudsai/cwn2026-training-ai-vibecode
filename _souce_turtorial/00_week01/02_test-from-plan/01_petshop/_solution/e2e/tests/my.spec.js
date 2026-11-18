// @ts-check
const { test, expect } = require('@playwright/test');
const { addToCart, openCart } = require('./helpers');

// อ่านช่องสรุปยอดในตะกร้า / หน้าชำระเงิน
function summary(page) {
  return {
    subtotal: page.getByTestId('summary-subtotal'),
    discount: page.getByTestId('summary-discount'),
    shipping: page.getByTestId('summary-shipping'),
    total: page.getByTestId('summary-total'),
  };
}
// test case ที่ผู้ใช้คิดเพิ่ม (TC-MY-xx) — reset ข้อมูลทำครั้งเดียวใน global-setup.js
// สินค้าที่ใช้: cat-feather-wand (฿129), dog-slow-bowl (฿290) — ไม่กดยืนยันสั่งซื้อ จึงไม่กระทบสต็อก

const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345' };

test.describe('test case เพิ่มเติม', () => {
  test('TC-MY-01 ค้นหา "เป็ด": พบ 2 รายการ', { tag: '@P2' }, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'ค้นหาสินค้า' }).fill('เป็ด');
    await page.getByRole('button', { name: 'ค้นหา', exact: true }).click();
    await expect(page).toHaveURL(/\/products\?.*q=/);

    await expect(page.getByTestId('result-count')).toHaveText('พบ 2 รายการ');
    const cards = page.getByTestId('product-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.filter({ hasText: 'เป็ด' })).toHaveCount(2);
  });

  test('TC-MY-02 ซื้อครบ ฿999 + ส่งด่วน: ค่าส่ง ฿120 (ส่งด่วนไม่ฟรี)', { tag: '@P1' }, async ({ page }) => {
    // login
    await page.goto('/login');
    await page.getByTestId('login-email').fill(DEMO.email);
    await page.getByTestId('login-password').fill(DEMO.password);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await expect(page.getByRole('link', { name: 'เข้าสู่ระบบ', exact: true })).toHaveCount(0);

    // ยอดพอดี ฿999 = ฿129 + ฿290×3
    await addToCart(page, 'cat-feather-wand');
    await addToCart(page, 'dog-slow-bowl', { qty: 3 });
    await openCart(page);
    await expect(summary(page).subtotal).toHaveText('฿999');

    await page.getByTestId('checkout-button').click();
    await expect(page).toHaveURL(/\/checkout$/);
    const s = summary(page);
    await expect(s.subtotal).toHaveText('฿999');

    // ส่งธรรมดา: ครบ ฿999 → ฟรี
    await expect(page.getByTestId('shipping-standard')).toBeChecked();
    await expect(s.shipping).toHaveText('ฟรี');
    await expect(s.total).toHaveText('฿999');

    // เปลี่ยนเป็นส่งด่วน: ต้องเสีย ฿120 แม้ยอดครบ ฿999
    await page.getByTestId('shipping-express').check();
    await expect(page.getByTestId('shipping-express')).toBeChecked();
    await expect(s.shipping).toHaveText('฿120');
    await expect(s.total).toHaveText('฿1,119');
    await expect(page.getByTestId('place-order')).toContainText('฿1,119');
  });
});

// TEST-PLAN.md §5 ข้อ 9–12 (โมดูลหน้าสินค้า)
const { test, expect } = require('@playwright/test');
const { holdOn } = require('./helpers');

test('TC-PRD-01 เลือกขนาด: 3 kg ฿790 → 8 kg ฿1,890', { tag: '@P1' }, async ({ page }) => {
  await page.goto('/products/adult-lamb-dry'); // สุนัขโต สูตรแกะ (3 kg / 8 kg)
  const sizes = page.getByRole('group', { name: 'เลือกขนาด' });
  const size3 = sizes.getByRole('button', { name: /^3 kg/ });
  const size8 = sizes.getByRole('button', { name: /^8 kg/ });
  const price = page.getByTestId('product-price');

  await size3.click();
  await expect(size3).toHaveAttribute('aria-pressed', 'true');
  await expect(price).toHaveText('฿790');

  await size8.click();
  await expect(size8).toHaveAttribute('aria-pressed', 'true');
  await expect(size3).toHaveAttribute('aria-pressed', 'false');
  await expect(price).toHaveText('฿1,890');

  await holdOn(page, price);
});

test('TC-PRD-02 สินค้าหมด: ปุ่ม "สินค้าหมด" กดไม่ได้', { tag: '@P1' }, async ({ page }) => {
  await page.goto('/products/freeze-dried-chicken-cat'); // ไก่ฟรีซดราย (สต็อก 0)
  await expect(page.getByTestId('product-title')).toContainText('ไก่ฟรีซดราย');

  const btn = page.getByTestId('add-to-cart');
  await expect(btn).toHaveText(/สินค้าหมด/);
  await expect(btn).toBeDisabled();

  // กดแล้วตะกร้าต้องไม่เพิ่ม
  const cartCount = page.getByTestId('cart-count');
  const before = await cartCount.innerText();
  await btn.click({ force: true });
  await expect(cartCount).toHaveText(before);

  await holdOn(page, btn);
});

test('TC-PRD-03 จำนวนเกินสต็อก: สต็อก 3 กด + 5 ครั้ง หยุดที่ 3', { tag: '@P2' }, async ({ page }) => {
  await page.goto('/products/hairball-control-dry'); // สูตรลดก้อนขน (สต็อก 3)
  await expect(page.getByTestId('product-title')).toHaveText('สูตรลดก้อนขน');
  await expect(page.getByTestId('stock-info')).toContainText('3');

  const qty = page.getByTestId('qty-input');
  const plus = page.getByTestId('qty-plus');
  await expect(qty).toHaveValue('1');
  for (let i = 0; i < 5; i++) {
    if (await plus.isEnabled()) await plus.click();
  }
  await expect(qty).toHaveValue('3');

  await holdOn(page, qty);
});

test('TC-PRD-04 สินค้าที่ไม่มีอยู่: หน้า 404 พร้อมลิงก์กลับหน้าแรก', { tag: '@P3' }, async ({ page }) => {
  const res = await page.goto('/products/no-such-product-a05');
  expect(res.status()).toBe(404);

  const nf = page.getByTestId('not-found');
  await expect(nf).toBeVisible();
  await expect(nf).toContainText('404');

  const home = page.getByTestId('not-found-home');
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute('href', '/');
  await holdOn(page, nf);

  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('not-found')).toHaveCount(0);

  await holdOn(page);
});

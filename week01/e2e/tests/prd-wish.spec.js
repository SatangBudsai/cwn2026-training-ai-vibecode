const { test, expect } = require('@playwright/test');

const wishCount = (page) => page.getByTestId('wishlist-count');
const cartCount = (page) => page.getByTestId('cart-count');

async function addToWishlist(page, slug) {
  await page.goto('/products/' + slug);
  await page.getByTestId('wishlist-toggle').click();
  await expect(page.getByTestId('wishlist-toggle')).toHaveAttribute('aria-pressed', 'true');
}

test('TC-PRD-01 เลือกขนาด @P1', async ({ page }) => {
  await page.goto('/products/adult-lamb-dry');
  const sizes = page.getByTestId('size-option');
  await expect(sizes.filter({ hasText: '3 kg' })).toContainText('฿790');
  await expect(sizes.filter({ hasText: '8 kg' })).toContainText('฿1,890');
  await sizes.filter({ hasText: '3 kg' }).click();
  await expect(sizes.filter({ hasText: '3 kg' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('฿790').first()).toBeVisible();
  await page.waitForTimeout(1000);
  await sizes.filter({ hasText: '8 kg' }).click();
  await expect(sizes.filter({ hasText: '8 kg' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.price, [class*=price]').filter({ hasText: '฿1,890' }).first()).toBeVisible();
  await page.waitForTimeout(1500);
});

test('TC-PRD-02 สินค้าหมด @P1', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('link', { name: 'ไก่ฟรีซดราย สำหรับแมว' }).first().click();
  const btn = page.getByRole('button', { name: 'สินค้าหมด' });
  await expect(btn).toBeVisible();
  await expect(btn).toBeDisabled();
  await btn.click({ force: true }).catch(() => {});
  await expect(cartCount(page)).toHaveText('0');
  await page.waitForTimeout(1500);
});

test('TC-PRD-03 จำนวนเกินสต็อก @P2', async ({ page }) => {
  await page.goto('/products/hairball-control-dry');
  const plus = page.getByTestId('qty-plus');
  for (let i = 0; i < 5; i++) {
    await plus.click();
    await page.waitForTimeout(200);
  }
  await expect(page.getByTestId('qty-input')).toHaveValue('3');
  await page.waitForTimeout(1500);
});

test('TC-PRD-04 สินค้าที่ไม่มีอยู่ @P3', async ({ page }) => {
  await page.goto('/products/no-such-product');
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  const back = page.getByRole('link', { name: /กลับหน้าแรก/ });
  await expect(back).toBeVisible();
  await page.waitForTimeout(1000);
  await back.click();
  await expect(page).toHaveURL(/localhost:3000\/?$/);
  await page.waitForTimeout(1500);
});

test('TC-WISH-01 กดหัวใจ 2 ชิ้น @P2', async ({ page }) => {
  await addToWishlist(page, 'hairball-control-dry');
  await addToWishlist(page, 'adult-chicken-dry');
  await expect(wishCount(page)).toHaveText('2');
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(wishCount(page)).toHaveText('2');
  await page.goto('/wishlist');
  await expect(page.getByTestId('wishlist-remove')).toHaveCount(2);
  await page.waitForTimeout(1500);
});

test('TC-WISH-02 ลบออก @P2', async ({ page }) => {
  await addToWishlist(page, 'hairball-control-dry');
  await addToWishlist(page, 'adult-chicken-dry');
  await expect(wishCount(page)).toHaveText('2');
  await page.goto('/wishlist');
  await expect(wishCount(page)).toHaveText('2');
  await page.waitForTimeout(1000);
  await page.getByTestId('wishlist-remove').first().click();
  await expect(wishCount(page)).toHaveText('1');
  await expect(page.getByTestId('wishlist-remove')).toHaveCount(1);
  await page.waitForTimeout(1500);
});

test('TC-WISH-03 ย้ายไปตะกร้า @P2', async ({ page }) => {
  await addToWishlist(page, 'adult-chicken-dry');
  await page.goto('/wishlist');
  await expect(page.getByRole('link', { name: 'แมวโต สูตรไก่' }).first()).toBeVisible();
  await expect(cartCount(page)).toHaveText('0');
  await page.waitForTimeout(1000);
  await page.getByTestId('move-to-cart').click();
  await expect(page.getByRole('link', { name: 'แมวโต สูตรไก่' })).toHaveCount(0);
  await expect(wishCount(page)).toHaveText('0');
  await expect(cartCount(page)).toHaveText('1');
  await page.waitForTimeout(1500);
});

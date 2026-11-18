const { expect } = require('@playwright/test');

/** ค้างหน้าผลลัพธ์ไว้ให้คนดู GIF ทัน */
const HOLD_MS = Number(process.env.HOLD_MS ?? 3000);

/** ล้างข้อมูลก่อนทดสอบ (TEST-PLAN §7) */
async function resetData(request) {
  const res = await request.post('/api/test/reset');
  expect(res.ok()).toBeTruthy();
}

/** เปิดหน้าสินค้า เลือกขนาด (ถ้าระบุ) ตั้งจำนวน แล้วกด "เพิ่มลงตะกร้า" */
async function addToCart(page, slug, { size, qty = 1 } = {}) {
  await page.goto(`/products/${slug}`);
  if (size) {
    const sizeBtn = page
      .getByRole('group', { name: 'เลือกขนาด' })
      .getByRole('button', { name: new RegExp(`^${size}`) });
    await sizeBtn.click();
    await expect(sizeBtn).toHaveAttribute('aria-pressed', 'true');
  }
  for (let i = 1; i < qty; i++) await page.getByTestId('qty-plus').click();
  const before = Number(await page.getByTestId('cart-count').innerText());
  await page.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).click();
  await expect(page.getByTestId('cart-count')).toHaveText(String(before + qty));
}

/** กดไอคอนตะกร้าที่หัวเว็บ */
async function openCart(page) {
  await page.getByTestId('cart-link').click();
  await expect(page).toHaveURL(/\/cart$/);
}

/** เลื่อนส่วนที่ต้องการให้อยู่ในจอ แล้วค้างไว้ */
async function holdOn(page, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(HOLD_MS);
}

module.exports = { resetData, addToCart, openCart, holdOn };

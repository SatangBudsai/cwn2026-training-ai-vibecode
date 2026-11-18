// TEST-PLAN.md §5 ข้อ 29–32 (โมดูลสั่งซื้อ)
const { test, expect } = require('@playwright/test');
const { addToCart, openCart, holdOn } = require('./helpers');

const PASSWORD = 'Paw12345';

/** สร้างอีเมลไม่ซ้ำ เพื่อให้แต่ละเทสต์ใช้บัญชีของตัวเอง (รันขนานกับเทสต์อื่นได้) */
function uniqueEmail() {
  return `a03-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
}

/** สมัครสมาชิกผ่าน API ด้วย request context ที่ให้มา (page.request = เข้าสู่ระบบในเบราว์เซอร์ด้วย) */
async function registerUser(request, email) {
  const res = await request.post('/api/auth/register', {
    data: { name: 'ทดสอบ สั่งซื้อ', email, password: PASSWORD, confirm: PASSWORD, pet: 'cat', terms: true },
  });
  expect(res.status()).toBe(201);
}

/** กรอกที่อยู่จัดส่งที่ถูกต้อง */
async function fillValidAddress(page) {
  await page.getByTestId('ship-phone').fill('0812345678');
  await page.getByTestId('ship-postcode').fill('10110');
  await page.getByTestId('ship-address').fill('99/9 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย');
}

async function getStock(request, slug) {
  const res = await request.get(`/api/products/${slug}`);
  expect(res.ok()).toBeTruthy();
  const product = await res.json();
  expect(typeof product.stock).toBe('number');
  return product.stock;
}

test('TC-CHK-01 ยังไม่เข้าสู่ระบบ: ถูกพาไป login แล้วกลับมา checkout', { tag: '@P1' }, async ({ page, request }) => {
  const email = uniqueEmail();
  await registerUser(request, email); // สมัครด้วย context แยก — เบราว์เซอร์ยังไม่ได้เข้าสู่ระบบ

  await addToCart(page, 'tuna-pouch');
  await openCart(page);
  await expect(page.getByTestId('login-link')).toBeVisible();
  await page.getByTestId('checkout-button').click();

  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)checkout$/);
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { level: 1, name: 'ชำระเงิน' })).toBeVisible();
  await expect(page.getByTestId('place-order')).toBeVisible();

  await holdOn(page, page.getByTestId('place-order'));
});

test('TC-CHK-02 ฟอร์มที่อยู่ผิด: error เบอร์โทร, ที่อยู่, รหัสไปรษณีย์', { tag: '@P1' }, async ({ page }) => {
  await page.goto('/');
  await registerUser(page.request, uniqueEmail()); // เข้าสู่ระบบในเบราว์เซอร์
  await addToCart(page, 'tuna-pouch');
  await openCart(page);
  await page.getByTestId('checkout-button').click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByTestId('ship-phone').fill('123');
  await page.getByTestId('ship-postcode').fill('12');
  await page.getByTestId('ship-address').fill('ab');
  await page.getByTestId('place-order').click();

  await expect(page.getByTestId('error-ship-phone')).toBeVisible();
  await expect(page.getByTestId('error-ship-phone')).toContainText('เบอร์โทร');
  await expect(page.getByTestId('error-ship-address')).toBeVisible();
  await expect(page.getByTestId('error-ship-address')).toContainText('ที่อยู่');
  await expect(page.getByTestId('error-ship-postcode')).toBeVisible();
  await expect(page.getByTestId('error-ship-postcode')).toContainText('รหัสไปรษณีย์');
  await expect(page.getByTestId('ship-phone')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('ship-address')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('ship-postcode')).toHaveAttribute('aria-invalid', 'true');

  // ยังไม่สั่งซื้อ: อยู่หน้า checkout ต่อ และตะกร้ายังมีของ
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await holdOn(page, page.getByTestId('error-ship-phone'));
});

test('TC-CHK-03 ซื้อของจนจบ (E2E): ได้เลข PP-xxxxxx อยู่ในประวัติ ตะกร้าว่าง', { tag: '@P1' }, async ({ page }) => {
  await page.goto('/');
  await registerUser(page.request, uniqueEmail());
  await addToCart(page, 'tuna-pouch');
  await openCart(page);
  await page.getByTestId('checkout-button').click();
  await expect(page).toHaveURL(/\/checkout$/);

  await fillValidAddress(page);
  await page.getByTestId('shipping-standard').check();
  await page.getByTestId('pay-cod').check();
  await page.getByTestId('place-order').click();

  await expect(page.getByTestId('order-success')).toBeVisible();
  const orderId = (await page.getByTestId('order-id').innerText()).trim();
  expect(orderId).toMatch(/^PP-\d{6}$/);
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));

  // ตะกร้าว่าง
  await expect(page.getByTestId('cart-count')).toHaveText('0');
  await openCart(page);
  await expect(page.getByTestId('cart-item')).toHaveCount(0);
  await expect(page.getByText('ตะกร้าของคุณยังว่างอยู่')).toBeVisible();

  // อยู่ในประวัติการสั่งซื้อ
  await page.goto('/account');
  const row = page.getByTestId('order-history').getByTestId('order-row').filter({ hasText: orderId });
  await expect(row).toHaveCount(1);

  await holdOn(page, row);
});

test('TC-CHK-04 สต็อกลดลง: สต็อกหลังซื้อ = ก่อนซื้อ − 2', { tag: '@P2' }, async ({ page, request }) => {
  const slug = 'beef-stew-can'; // สต็อกเยอะ และไม่มีเทสต์อื่นสั่งซื้อ
  const before = await getStock(request, slug);
  expect(before).toBeGreaterThanOrEqual(2);

  await page.goto('/');
  await registerUser(page.request, uniqueEmail());
  await addToCart(page, slug, { size: '400 g', qty: 2 });
  await openCart(page);
  await page.getByTestId('checkout-button').click();
  await expect(page).toHaveURL(/\/checkout$/);
  await fillValidAddress(page);
  await page.getByTestId('place-order').click();
  await expect(page.getByTestId('order-success')).toBeVisible();
  await expect(page.getByTestId('order-item')).toContainText('× 2');

  const after = await getStock(request, slug);
  expect(after).toBe(before - 2);

  await page.goto(`/api/products/${slug}`);
  await holdOn(page, page.locator('body'));
});

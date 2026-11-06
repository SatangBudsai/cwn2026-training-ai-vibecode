const { test, expect } = require('@playwright/test');

const EMAIL = 'demo@pawpantry.test';
const PASSWORD = 'Paw12345';
const pause = (page, ms = 1200) => page.waitForTimeout(ms);

async function login(page) {
  await page.locator('#login-email').fill(EMAIL);
  await page.locator('form input[type=password]').fill(PASSWORD);
  await pause(page, 800);
  await page.locator('form button:has-text("เข้าสู่ระบบ")').click();
}

async function loginFirst(page) {
  await page.goto('/login');
  await login(page);
  await expect(page).not.toHaveURL(/\/login/);
}

async function addToCart(page, slug, qty = 1) {
  await page.goto('/products/' + slug);
  await page.locator('#qty-input').fill(String(qty));
  await page.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).click();
  await pause(page, 800);
}

async function stockOf(page, slug) {
  await page.goto('/products/' + slug);
  const loc = page.getByText(/(มีสินค้า|เหลือ)\s*\d+\s*ชิ้น/).first();
  await expect(loc).toBeVisible();
  const m = (await loc.innerText()).match(/(\d+)/);
  return parseInt(m[1], 10);
}

async function fillAddress(page, { name = 'ทดสอบ ระบบ', phone = '0812345678', zip = '10900', addr = '99/9 ถนนพหลโยธิน จตุจักร' } = {}) {
  await page.locator('#ship-name').fill(name);
  await page.locator('#ship-phone').fill(phone);
  await page.locator('#ship-postcode').fill(zip);
  await page.locator('#ship-address').fill(addr);
}

test.describe('Checkout', () => {
  test('TC-CHK-01 ยังไม่เข้าสู่ระบบ @P1', async ({ page }) => {
    await addToCart(page, 'dog-squeaky-ball');
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('ยินดีต้อนรับกลับมา')).toBeVisible();
    await pause(page);
    await login(page);
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator('#ship-name')).toBeVisible();
    await expect(page.getByText('ที่อยู่จัดส่ง')).toBeVisible();
    await pause(page, 1500);
  });

  test('TC-CHK-02 ฟอร์มที่อยู่ผิด @P1', async ({ page }) => {
    await loginFirst(page);
    await addToCart(page, 'dog-squeaky-ball');
    await page.goto('/checkout');
    const submit = page.getByRole('button', { name: /ยืนยันสั่งซื้อ/ });

    // ปล่อยว่างทั้งหมด
    await submit.click();
    await expect(page.getByText(/เบอร์โทร.*10 หลัก/)).toBeVisible();
    await expect(page.getByText(/รหัสไปรษณีย์.*5 หลัก/)).toBeVisible();
    await expect(page.getByText(/กรุณากรอกที่อยู่/)).toBeVisible();
    await pause(page);

    // ค่าผิด: เบอร์ 9 หลัก, รหัสไปรษณีย์ 4 หลัก, ที่อยู่สั้น
    await fillAddress(page, { phone: '081234567', zip: '1090', addr: 'สั้นไป' });
    await submit.click();
    await expect(page.getByText(/เบอร์โทร.*10 หลัก/)).toBeVisible();
    await expect(page.getByText(/รหัสไปรษณีย์.*5 หลัก/)).toBeVisible();
    await expect(page.getByText(/กรุณากรอกที่อยู่/)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    await pause(page);

    // เบอร์ไม่ขึ้นต้นด้วย 0 และมีตัวอักษร
    await fillAddress(page, { phone: '1812345678', zip: '10A00', addr: 'สั้นไป' });
    await submit.click();
    await expect(page.getByText(/เบอร์โทร.*10 หลัก/)).toBeVisible();
    await expect(page.getByText(/รหัสไปรษณีย์.*5 หลัก/)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    await pause(page, 1500);
  });

  test('TC-CHK-03 ซื้อของจนจบ E2E @P1', async ({ page }) => {
    await loginFirst(page);
    await addToCart(page, 'dog-squeaky-ball');
    await page.goto('/checkout');
    await fillAddress(page);
    await pause(page, 800);
    await page.getByRole('button', { name: /ยืนยันสั่งซื้อ/ }).click();

    await expect(page).toHaveURL(/\/orders\/PP-\d+/);
    const body = await page.locator('main').innerText();
    const orderNo = body.match(/PP-\d{6}/)[0];
    await expect(page.getByRole('heading', { name: 'สั่งซื้อสำเร็จ' })).toBeVisible();
    await pause(page, 1500);

    // อยู่ในประวัติการสั่งซื้อ
    await page.goto('/account');
    await expect(page.getByText(orderNo).first()).toBeVisible();
    await pause(page);

    // ตะกร้าว่าง
    await page.goto('/cart');
    await expect(page.getByText('ตะกร้าของคุณยังว่างอยู่')).toBeVisible();
    await expect(page.getByTestId('cart-count')).toHaveText('0');
    await pause(page, 1500);
  });

  test('TC-CHK-04 สต็อกลดลง @P2', async ({ page }) => {
    const slug = 'dog-slow-bowl'; // ชามกินช้า
    await loginFirst(page);
    const before = await stockOf(page, slug);
    expect(before).toBeGreaterThanOrEqual(2);
    await pause(page);

    await addToCart(page, slug, 2);
    await page.goto('/checkout');
    await fillAddress(page);
    await page.getByRole('button', { name: /ยืนยันสั่งซื้อ/ }).click();
    await expect(page).toHaveURL(/\/orders\/PP-\d+/);
    await pause(page, 1200);

    const after = await stockOf(page, slug);
    await pause(page, 1500);
    expect(after).toBe(before - 2);
  });
});

const { test, expect } = require('@playwright/test');

const PAUSE = 1500;

async function addToCart(page, slug, { size, qty = 1 } = {}) {
  await page.goto('/products/' + slug);
  if (size) await page.getByRole('button', { name: size }).click();
  for (let i = 1; i < qty; i++) await page.getByRole('button', { name: 'เพิ่มจำนวน', exact: true }).click();
  await page.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).first().click();
  await expect(page.locator('header a[href="/cart"]')).toContainText(/[1-9]/);
}

async function openCart(page) {
  await page.goto('/cart');
  await expect(page.getByText('สรุปคำสั่งซื้อ')).toBeVisible();
}

const main = (page) => page.locator('main');

async function applyCoupon(page, code) {
  await page.getByPlaceholder('เช่น PAW10').fill(code);
  await page.getByRole('button', { name: 'ใช้โค้ด' }).click();
}

test.describe('Cart', () => {
  test('TC-CART-01 ใส่ 2 ชิ้น @P1', async ({ page }) => {
    await addToCart(page, 'kitten-salmon-dry', { size: /400 g/, qty: 2 });
    await openCart(page);
    await expect(main(page)).toContainText('ลูกแมว สูตรแซลมอน');
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿378/);
    await expect(main(page)).toContainText(/ค่าจัดส่ง\s*฿50/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿428/);
    await page.waitForTimeout(PAUSE);
  });

  test('TC-CART-02 เพิ่ม / ลด / ลบ @P1', async ({ page }) => {
    await addToCart(page, 'kitten-salmon-dry', { size: /400 g/ });
    await openCart(page);
    const name = 'ลูกแมว สูตรแซลมอน';
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿189/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿239/);

    await page.getByRole('button', { name: 'เพิ่มจำนวน ' + name }).click();
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿378/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿428/);
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: 'เพิ่มจำนวน ' + name }).click();
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿567/);
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: 'ลดจำนวน ' + name }).click();
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿378/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿428/);
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: 'ลบ ' + name + ' ออกจากตะกร้า' }).click();
    await expect(page.getByText('ตะกร้าของคุณยังว่างอยู่')).toBeVisible();
    await page.waitForTimeout(PAUSE);
  });

  test('TC-CART-03 ส่งฟรีเมื่อครบ ฿999 @P2', async ({ page }) => {
    await addToCart(page, 'adult-lamb-dry', { size: /3 kg/ });
    await openCart(page);
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿790/);
    await expect(main(page)).toContainText(/ค่าจัดส่ง\s*฿50/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿840/);
    await page.waitForTimeout(1200);

    await addToCart(page, 'adult-lamb-dry', { size: /8 kg/ });
    await openCart(page);
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿2,680/);
    await expect(main(page)).toContainText(/ค่าจัดส่ง\s*ฟรี/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿2,680/);
    await page.waitForTimeout(PAUSE);
  });

  test('TC-CART-04 รีโหลด + สินค้าแนะนำ @P2', async ({ page }) => {
    await addToCart(page, 'kitten-salmon-dry', { size: /400 g/, qty: 2 });
    await openCart(page);
    await page.reload();
    await expect(main(page)).toContainText('ลูกแมว สูตรแซลมอน');
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿378/);
    await expect(page.getByText('ซื้อคู่กันคุ้มกว่า')).toBeVisible();
    await expect(page.getByText('มักซื้อคู่กับสินค้าในตะกร้า')).toBeVisible();
    await expect(page.getByRole('link', { name: 'มูสไก่ลูกแมว' })).toBeVisible();
    await page.waitForTimeout(PAUSE);
  });
});

test.describe('Coupon', () => {
  test('TC-CPN-01 PAW10 @P1', async ({ page }) => {
    await addToCart(page, 'adult-chicken-dry', { size: /3 kg/ });
    await openCart(page);
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿799/);
    await applyCoupon(page, 'PAW10');
    await expect(main(page)).toContainText('ใช้คูปอง PAW10 แล้ว');
    await expect(main(page)).toContainText(/ส่วนลด\s*PAW10\s*-฿79/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿770/);
    await page.waitForTimeout(PAUSE);
  });

  test('TC-CPN-02 คูปองผิด / หมดอายุ @P2', async ({ page }) => {
    await addToCart(page, 'adult-chicken-dry', { size: /3 kg/ });
    await openCart(page);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿849/);

    await applyCoupon(page, 'SUMMER20');
    await expect(main(page)).toContainText('คูปองนี้หมดอายุแล้ว');
    await expect(main(page)).toContainText(/ส่วนลด\s*฿0/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿849/);
    await page.waitForTimeout(1000);

    await applyCoupon(page, 'XXXXXX');
    await expect(main(page)).toContainText('ไม่พบคูปองนี้');
    await expect(main(page)).toContainText(/ส่วนลด\s*฿0/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿849/);
    await page.waitForTimeout(PAUSE);
  });

  test('TC-CPN-03 NEWCAT50 @P2', async ({ page }) => {
    // ไม่มีอาหารแมว (อาหารสุนัข ฿790) -> ใช้ไม่ได้
    await addToCart(page, 'adult-lamb-dry', { size: /3 kg/ });
    await openCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await expect(main(page)).toContainText('ต้องซื้ออาหารแมวขั้นต่ำ ฿500');
    await expect(main(page)).toContainText(/ส่วนลด\s*฿0/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿840/);
    await page.waitForTimeout(1200);

    // อาหารแมว ฿590 อย่างเดียว -> ลด ฿50
    await page.goto('/cart');
    await page.getByRole('button', { name: /^ลบ .* ออกจากตะกร้า$/ }).click();
    await expect(page.getByText('ตะกร้าของคุณยังว่างอยู่')).toBeVisible();
    await addToCart(page, 'kitten-salmon-dry', { size: /1.5 kg/ });
    await openCart(page);
    await expect(main(page)).toContainText(/ยอดรวมสินค้า\s*฿590/);
    await applyCoupon(page, 'NEWCAT50');
    await expect(main(page)).toContainText('ใช้คูปอง NEWCAT50 แล้ว');
    await expect(main(page)).toContainText(/ส่วนลด\s*NEWCAT50\s*-฿50/);
    await expect(main(page)).toContainText(/ยอดชำระทั้งหมด\s*฿590/);
    await page.waitForTimeout(PAUSE);
  });
});

const { test, expect } = require('@playwright/test');

test.describe('มือถือ', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('TC-MOB-01 เมนูแฮมเบอร์เกอร์ ไปหน้าสินค้าหมา @P3', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // เมนูหลักต้องซ่อนบนมือถือ
    await expect(page.locator('header .desktop-nav')).toBeHidden();
    const burger = page.getByRole('button', { name: 'เปิดเมนู' });
    await expect(burger).toBeVisible();
    await burger.click();
    await page.waitForTimeout(1000);
    const dogLink = page.locator('#mobile-menu').getByRole('link', { name: /อาหารสุนัข/ });
    await expect(dogLink).toBeVisible();
    await dogLink.click();
    await expect(page).toHaveURL(/pet=dog/);
    await page.waitForTimeout(1000);
    await expect(page.getByText(/14\s*รายการ/).first()).toBeVisible();
    const hrefs = await page.locator('main a[href^="/products/"]').evaluateAll(
      (as) => [...new Set(as.map((a) => a.getAttribute('href')))]
    );
    expect(hrefs).toHaveLength(14); // การ์ดละ 2 ลิงก์ (รูป+ชื่อ) นับแบบไม่ซ้ำ
    await page.waitForTimeout(1000);
  });
});

test.describe('API', () => {
  test('TC-API-01 รายการสินค้าหมา 200 และ 14 รายการ @P2', async ({ request }) => {
    const res = await request.get('/api/products?pet=dog');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(14);
    for (const it of body.items) expect(it.pet).toBe('dog');
  });

  test('TC-API-02 สั่งซื้อโดยไม่ login @P1', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: { items: [{ slug: 'kitten-salmon-dry', size: 0, qty: 1 }] },
    });
    expect(res.status()).toBe(401);
  });

  test('TC-API-03 สินค้าที่ไม่มีอยู่ @P3', async ({ request }) => {
    const res = await request.get('/api/products/does-not-exist-xyz');
    expect(res.status()).toBe(404);
  });
});

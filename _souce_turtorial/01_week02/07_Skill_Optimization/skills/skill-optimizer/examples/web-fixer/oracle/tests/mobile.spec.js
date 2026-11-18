// TEST-PLAN.md §5 ข้อ 37 (โมดูลมือถือ)
const { test, expect } = require('@playwright/test');
const { holdOn } = require('./helpers');

// จำลองจอมือถือ (ไม่แก้ playwright.config.js — ขนาดวิดีโอยังเป็นตามที่ตั้งไว้)
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('TC-MOB-01 เมนูแฮมเบอร์เกอร์: เปิดเมนูแล้วไปหน้าสินค้าหมาได้ (14 รายการ)', { tag: '@P3' }, async ({ page }) => {
  await page.goto('/');

  // บนมือถือ เมนูหลักแบบเดสก์ท็อปถูกซ่อน และเห็นปุ่มแฮมเบอร์เกอร์แทน
  const toggle = page.getByTestId('menu-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'เมนูหลัก' }).getByTestId('nav-dog')).toBeHidden();

  // เปิดเมนู
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const menu = page.getByTestId('mobile-menu');
  await expect(menu).toBeVisible();
  const dogLink = menu.getByTestId('nav-dog');
  await expect(dogLink).toBeVisible();
  await expect(dogLink).toContainText('อาหารสุนัข');

  // กดไปหน้าสินค้าหมา
  await dogLink.click();
  await expect(page).toHaveURL(/\/products\?pet=dog/);
  await expect(page.getByTestId('result-count')).toContainText('14 รายการ');
  await expect(page.getByTestId('product-card')).toHaveCount(14);

  await holdOn(page, page.getByTestId('result-count'));
});

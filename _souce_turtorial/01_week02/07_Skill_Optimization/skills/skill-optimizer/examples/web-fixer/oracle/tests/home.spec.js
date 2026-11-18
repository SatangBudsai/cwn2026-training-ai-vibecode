// TEST-PLAN.md §5 ข้อ 1–2 (โมดูลหน้าแรก)
const { test, expect } = require('@playwright/test');
const { holdOn } = require('./helpers');

test('TC-HOME-01 หน้าแรกแสดงครบ: เห็น Hero, หมวดแมว/หมา, สินค้ายอดนิยม 8 รายการ, โค้ด PAW10', { tag: '@P2' }, async ({ page }) => {
  await page.goto('/');

  // Hero
  const hero = page.getByTestId('hero');
  await expect(hero).toBeVisible();
  await expect(hero.locator('h1')).toBeVisible();
  await expect(page.getByTestId('hero-cta-cat')).toBeVisible();
  await expect(page.getByTestId('hero-cta-dog')).toBeVisible();

  // หมวดแมว / หมา
  await expect(page.getByTestId('category-cat')).toBeVisible();
  await expect(page.getByTestId('category-cat')).toContainText('สำหรับน้องแมว');
  await expect(page.getByTestId('category-dog')).toBeVisible();
  await expect(page.getByTestId('category-dog')).toContainText('สำหรับน้องหมา');

  // สินค้ายอดนิยม 8 รายการ
  const popular = page.getByTestId('popular-products');
  await expect(popular).toBeVisible();
  await expect(popular.getByRole('heading', { name: 'สินค้ายอดนิยม' })).toBeVisible();
  await expect(popular.getByTestId('product-card')).toHaveCount(8);

  // โค้ด PAW10
  await expect(hero).toContainText('PAW10');
  const promo = page.getByTestId('promo-banner');
  await expect(promo).toContainText('PAW10');

  await holdOn(page, promo);
});

test('TC-HOME-02 ปุ่ม "ช้อปอาหารแมว": ไปหน้าสินค้าแมว พบ 14 รายการ', { tag: '@P2' }, async ({ page }) => {
  await page.goto('/');
  const cta = page.getByTestId('hero-cta-cat');
  await expect(cta).toHaveText(/ช้อปอาหารแมว/);
  await cta.click();

  await expect(page).toHaveURL(/\/products\?pet=cat$/);
  await expect(page.getByTestId('filter-pet-cat')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('result-count')).toHaveText('พบ 14 รายการ');
  const cards = page.getByTestId('product-card');
  await expect(cards).toHaveCount(14);
  // ทุกรายการเป็นสินค้าแมว
  await expect(page.locator('[data-testid="product-card"]:not(.pet-cat)')).toHaveCount(0);

  await holdOn(page, page.getByTestId('result-count'));
});

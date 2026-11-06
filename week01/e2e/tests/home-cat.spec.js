const { test, expect } = require('@playwright/test');

const cards = (page) => page.getByTestId('product-card');
const search = async (page, q) => {
  await page.getByPlaceholder('ค้นหาสินค้า…').fill(q);
  await page.getByRole('button', { name: 'ค้นหา', exact: true }).click();
};

test.describe('หน้าแรก + ค้นหา/กรอง', () => {
  test('TC-HOME-01 หน้าแรกแสดงครบ @P2', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('อาหารดี ๆ');
    await expect(page.getByRole('link', { name: /ช้อปอาหารแมว/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /ช้อปอาหารหมา/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'สำหรับน้องแมว' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'สำหรับน้องหมา' })).toBeVisible();
    const popular = page.locator('section', { has: page.getByRole('heading', { name: 'สินค้ายอดนิยม' }) });
    await expect(popular.getByTestId('product-card')).toHaveCount(8);
    await popular.scrollIntoViewIfNeeded();
    await expect(page.getByText('PAW10').first()).toBeVisible();
    await page.waitForTimeout(1500);
  });

  test('TC-HOME-02 ปุ่ม "ช้อปอาหารแมว" @P2', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /ช้อปอาหารแมว/ }).click();
    await expect(page).toHaveURL(/pet=cat/);
    await expect(page.getByText('พบ 14 รายการ')).toBeVisible();
    await expect(cards(page)).toHaveCount(14);
    await page.waitForTimeout(1500);
  });

  test('TC-CAT-01 ค้นหา "แซลมอน" @P1', async ({ page }) => {
    await page.goto('/products');
    await search(page, 'แซลมอน');
    await expect(page.getByText('พบ 5 รายการ')).toBeVisible();
    await expect(cards(page)).toHaveCount(5);
    // แต่ละรายการต้องทำจากแซลมอน: ชื่อมีแซลมอน หรือหน้าสินค้าระบุโปรตีนหลัก = แซลมอน
    const slugs = await cards(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-slug')));
    const names = await cards(page).allInnerTexts();
    for (let i = 0; i < slugs.length; i++) {
      if (/แซลมอน|Salmon/i.test(names[i])) continue;
      await page.goto('/products/' + slugs[i]);
      await expect(page.getByText('โปรตีนหลัก')).toBeVisible();
      await expect(page.locator('main')).toContainText(/โปรตีนหลัก\s*แซลมอน/);
    }
    await page.waitForTimeout(1500);
  });

  test('TC-CAT-02 กรองแมว + อาหารเปียก @P1', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId('filter-pet-cat').click();
    await page.locator('#filter-type').selectOption('wet');
    await expect(page.getByText('พบ 2 รายการ')).toBeVisible();
    await expect(cards(page)).toHaveCount(2);
    await expect(page).toHaveURL(/pet=cat/);
    await expect(page).toHaveURL(/type=wet/);
    // URL จำค่าตัวกรอง: โหลดซ้ำแล้วยังเหลือ 2 รายการ และตัวกรองยังถูกเลือก
    await page.reload();
    await expect(cards(page)).toHaveCount(2);
    await expect(page.locator('#filter-type')).toHaveValue('wet');
    await page.waitForTimeout(1500);
  });

  test('TC-CAT-03 เรียงราคาน้อย → มาก @P2', async ({ page }) => {
    await page.goto('/products');
    await page.locator('#sort-select').selectOption('price-asc');
    await expect(cards(page).first()).toContainText('฿35');
    const prices = await cards(page).evaluateAll((els) =>
      els.map((e) => Number((e.innerText.match(/฿\s*([\d,]+)/) || [])[1].replace(/,/g, ''))));
    expect(prices.length).toBe(28);
    expect(prices[0]).toBe(35);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    await page.waitForTimeout(1500);
  });

  test('TC-CAT-04 กรองเกรนฟรี @P3', async ({ page }) => {
    await page.goto('/products');
    await page.locator('#filter-grainfree').check();
    await expect(page.getByText('พบ 9 รายการ')).toBeVisible();
    await expect(cards(page)).toHaveCount(9);
    await page.waitForTimeout(1500);
  });

  test('TC-CAT-05 ค้นหาไม่เจอ @P3', async ({ page }) => {
    await page.goto('/products');
    await search(page, 'zzzz');
    await expect(page.getByText(/ไม่พบสินค้า/)).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'ล้างตัวกรองทั้งหมด' }).click();
    await expect(page.getByText('พบ 28 รายการ')).toBeVisible();
    await expect(cards(page)).toHaveCount(28);
    await page.waitForTimeout(1500);
  });

  test('TC-CAT-06 เมนู "ของเล่น" @P2', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'ของเล่น' }).first().click();
    await expect(page.getByText('พบ 4 รายการ')).toBeVisible();
    await expect(cards(page)).toHaveCount(4);
    const txt = await cards(page).allInnerTexts();
    expect(txt.filter((t) => t.includes('🐱')).length).toBe(2);
    expect(txt.filter((t) => t.includes('🐶')).length).toBe(2);
    await page.waitForTimeout(1500);
  });
});

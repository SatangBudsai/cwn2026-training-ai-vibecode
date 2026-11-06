const { test, expect } = require('@playwright/test');

async function runFinder(page, { pet, life, noChicken, grainfree, type }) {
  await page.goto('/finder');
  await page.getByTestId(`finder-pet-${pet}`).click();
  await page.getByTestId('finder-next').click();
  await page.getByTestId(`finder-life-${life}`).click();
  await page.getByTestId('finder-next').click();
  if (noChicken) await page.getByTestId('finder-no-chicken').check();
  if (grainfree) await page.getByTestId('finder-grainfree').check();
  if (type) await page.getByTestId('finder-type').selectOption(type);
  await page.waitForTimeout(800);
  await page.getByTestId('finder-submit').click();
  await expect(page.getByTestId('finder-results')).toBeVisible();
}

test.describe('Recommendation', () => {
  test('TC-REC-01 Finder ลูกแมว แพ้ไก่ @P1', async ({ page }) => {
    await runFinder(page, { pet: 'cat', life: 'baby', noChicken: true });
    const results = page.getByTestId('finder-result');
    await expect(results.first()).toBeVisible();
    // อันดับ 1 = ลูกแมวแซลมอน
    await expect(results.first()).toContainText('ลูกแมว สูตรแซลมอน');
    // ทุกรายการต้องไม่มีไก่
    const n = await results.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const txt = await results.nth(i).innerText();
      expect(txt.replace(/ไม่มีไก่/g, ''), `result #${i + 1}`).not.toContain('ไก่');
      expect(txt, `result #${i + 1}`).toContain('ไม่มีไก่');
    }
    await page.waitForTimeout(1500);
  });

  test('TC-REC-02 Finder หมาสูงวัย เกรนฟรี ขนม @P2', async ({ page }) => {
    await runFinder(page, { pet: 'dog', life: 'senior', grainfree: true, type: 'treat' });
    await expect(page.getByTestId('finder-result').first()).toContainText('หนังปลาแซลมอนกรอบ');
    await page.waitForTimeout(1500);
  });

  test('TC-REC-03 แนะนำตามที่เคยดู @P2', async ({ page }) => {
    for (const slug of ['kitten-salmon-dry', 'adult-chicken-dry', 'lickable-salmon-treat']) {
      await page.goto('/products/' + slug);
      await expect(page.locator('h1')).toBeVisible();
      await page.waitForTimeout(700);
    }
    await page.goto('/');
    const section = page.getByTestId('recommended-for-you');
    await expect(section).toBeVisible();
    await expect(section).toContainText('แนะนำสำหรับคุณ');
    await section.scrollIntoViewIfNeeded();
    const cards = section.getByTestId('product-card');
    const n = await cards.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await expect(cards.nth(i).locator('.tag-cat'), `card #${i + 1} must be cat food`).toBeVisible();
      await expect(cards.nth(i).locator('.tag-dog')).toHaveCount(0);
    }
    await page.waitForTimeout(1500);
  });

  test('TC-REC-04 ซื้อคู่กันบ่อย @P2', async ({ page }) => {
    await page.goto('/products/kitten-salmon-dry');
    await expect(page.getByText('ซื้อคู่กันคุ้มกว่า')).toBeVisible();
    await page.getByRole('button', { name: 'เพิ่มทั้งชุดลงตะกร้า' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'เพิ่มทั้งชุดลงตะกร้า' }).click();
    await page.waitForTimeout(800);
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toHaveCount(3);
    await expect(page.getByRole('link', { name: /ตะกร้า/ }).first()).toContainText('3');
    await page.waitForTimeout(1500);
  });
});
